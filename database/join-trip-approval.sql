USE [paisamattersdb];
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

/*
    Add request metadata to the existing TripMembers row. The unique
    (TripId, UserId) key is the single-request/single-membership guard.
    Pending and rejected rows are not active memberships; existing trip and
    expense procedures continue to expose only MemberStatus='Active'.
*/
IF COL_LENGTH(N'dbo.TripMembers', N'JoinRequestedAt') IS NULL
    ALTER TABLE dbo.TripMembers ADD JoinRequestedAt DATETIME2(7) NULL;
GO

IF COL_LENGTH(N'dbo.TripMembers', N'JoinInviteId') IS NULL
    ALTER TABLE dbo.TripMembers ADD JoinInviteId UNIQUEIDENTIFIER NULL;
GO

IF COL_LENGTH(N'dbo.TripMembers', N'JoinRequestRespondedAt') IS NULL
    ALTER TABLE dbo.TripMembers ADD JoinRequestRespondedAt DATETIME2(7) NULL;
GO

IF COL_LENGTH(N'dbo.TripMembers', N'JoinNotificationClearedAt') IS NULL
    ALTER TABLE dbo.TripMembers ADD JoinNotificationClearedAt DATETIME2(7) NULL;
GO

IF EXISTS
(
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id=OBJECT_ID(N'dbo.TripMembers')
      AND name=N'CK_TripMembers_MemberStatus'
      AND
      (
          definition NOT LIKE N'%Pending%'
          OR definition NOT LIKE N'%Rejected%'
          OR definition NOT LIKE N'%Cancelled%'
          OR definition NOT LIKE N'%Expired%'
      )
)
    ALTER TABLE dbo.TripMembers DROP CONSTRAINT CK_TripMembers_MemberStatus;
GO

IF NOT EXISTS
(
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id=OBJECT_ID(N'dbo.TripMembers')
      AND name=N'CK_TripMembers_MemberStatus'
)
    ALTER TABLE dbo.TripMembers WITH CHECK
        ADD CONSTRAINT CK_TripMembers_MemberStatus
        CHECK (MemberStatus IN (N'Active', N'Removed', N'Pending', N'Rejected', N'Cancelled', N'Expired'));
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name=N'FK_TripMembers_JoinInvite')
    ALTER TABLE dbo.TripMembers
        ADD CONSTRAINT FK_TripMembers_JoinInvite
        FOREIGN KEY (JoinInviteId) REFERENCES dbo.TripInvites(InviteId);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.TripMembers') AND name=N'IX_TripMembers_JoinRequestOwnerInbox')
    CREATE INDEX IX_TripMembers_JoinRequestOwnerInbox
        ON dbo.TripMembers(TripId, MemberStatus, JoinRequestedAt DESC)
        INCLUDE(UserId, JoinInviteId, JoinRequestRespondedAt, JoinNotificationClearedAt)
        WHERE JoinRequestedAt IS NOT NULL;
GO

CREATE OR ALTER PROCEDURE dbo.usp_CreateTripJoinRequestByInvite
    @TokenHash VARBINARY(32),
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @InviteId UNIQUEIDENTIFIER, @TripId UNIQUEIDENTIFIER;
    SELECT @InviteId=InviteId, @TripId=TripId
    FROM dbo.TripInvites
    WHERE TokenHash=@TokenHash;
    IF @InviteId IS NULL THROW 51004, 'Invite is invalid.', 1;

    BEGIN TRANSACTION;
    DECLARE @IsActive BIT, @ExpiresAt DATETIME2(7), @MaxUses INT, @UseCount INT;
    SELECT @IsActive=IsActive
    FROM dbo.Trips WITH (UPDLOCK, HOLDLOCK)
    WHERE TripId=@TripId;
    IF @IsActive IS NULL OR @IsActive=0
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51007, 'Trip is no longer available.', 1;
    END;

    SELECT @ExpiresAt=ExpiresAt, @MaxUses=MaxUses, @UseCount=UseCount
    FROM dbo.TripInvites WITH (UPDLOCK, HOLDLOCK)
    WHERE InviteId=@InviteId AND TokenHash=@TokenHash;
    IF @ExpiresAt IS NOT NULL AND @ExpiresAt<=SYSUTCDATETIME()
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51005, 'Invite has expired.', 1;
    END;
    IF @MaxUses IS NOT NULL AND @UseCount>=@MaxUses
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51006, 'Invite has reached its use limit.', 1;
    END;

    DECLARE @TripMemberId UNIQUEIDENTIFIER, @MemberStatus NVARCHAR(40), @ExistingInviteId UNIQUEIDENTIFIER;
    SELECT @TripMemberId=TripMemberId, @MemberStatus=MemberStatus, @ExistingInviteId=JoinInviteId
    FROM dbo.TripMembers WITH (UPDLOCK, HOLDLOCK)
    WHERE TripId=@TripId AND UserId=@UserId;

    IF @MemberStatus=N'Active'
    BEGIN
        COMMIT TRANSACTION;
        SELECT CAST(NULL AS UNIQUEIDENTIFIER) AS RequestId, @TripId AS TripId, N'AlreadyMember' AS Status;
        RETURN;
    END;

    IF @MemberStatus=N'Pending' AND @TripMemberId IS NOT NULL
    BEGIN
        DECLARE @ExistingExpiresAt DATETIME2(7), @ExistingMaxUses INT, @ExistingUseCount INT;
        SELECT @ExistingExpiresAt=ExpiresAt, @ExistingMaxUses=MaxUses, @ExistingUseCount=UseCount
        FROM dbo.TripInvites WITH (UPDLOCK, HOLDLOCK)
        WHERE InviteId=@ExistingInviteId;

        IF @ExistingInviteId IS NOT NULL
           AND (@ExistingExpiresAt IS NULL OR @ExistingExpiresAt>SYSUTCDATETIME())
           AND (@ExistingMaxUses IS NULL OR @ExistingUseCount<@ExistingMaxUses)
        BEGIN
            COMMIT TRANSACTION;
            SELECT @TripMemberId AS RequestId, @TripId AS TripId, N'Pending' AS Status;
            RETURN;
        END;

        UPDATE dbo.TripMembers
           SET MemberStatus=N'Expired', JoinRequestRespondedAt=SYSUTCDATETIME()
         WHERE TripMemberId=@TripMemberId;
    END;

    DECLARE @RequestedAt DATETIME2(7)=SYSUTCDATETIME();
    IF @TripMemberId IS NULL
    BEGIN
        SET @TripMemberId=NEWID();
        INSERT dbo.TripMembers
            (TripMemberId, TripId, UserId, MemberRole, MemberStatus, JoinedAt,
             JoinRequestedAt, JoinInviteId, JoinRequestRespondedAt, JoinNotificationClearedAt)
        VALUES
            (@TripMemberId, @TripId, @UserId, N'Member', N'Pending', @RequestedAt,
             @RequestedAt, @InviteId, NULL, NULL);
    END
    ELSE
    BEGIN
        UPDATE dbo.TripMembers
           SET MemberRole=N'Member', MemberStatus=N'Pending', JoinedAt=@RequestedAt,
               JoinRequestedAt=@RequestedAt, JoinInviteId=@InviteId,
               JoinRequestRespondedAt=NULL, JoinNotificationClearedAt=NULL
         WHERE TripMemberId=@TripMemberId;
    END;

    COMMIT TRANSACTION;
    SELECT @TripMemberId AS RequestId, @TripId AS TripId, N'Pending' AS Status;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetMyTripJoinRequests
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT tm.TripMemberId AS RequestId, tm.TripId, t.TripName, t.Destination,
           CASE WHEN tm.MemberStatus=N'Pending'
                     AND (t.IsActive=0
                          OR (i.ExpiresAt IS NOT NULL AND i.ExpiresAt<=SYSUTCDATETIME())
                          OR (i.MaxUses IS NOT NULL AND i.UseCount>=i.MaxUses))
                THEN N'Expired'
                WHEN tm.MemberStatus=N'Active' THEN N'Approved'
                ELSE tm.MemberStatus END AS Status,
           tm.JoinRequestedAt AS RequestedAt, tm.JoinRequestRespondedAt AS RespondedAt
    FROM dbo.TripMembers tm
    JOIN dbo.Trips t ON t.TripId=tm.TripId
    LEFT JOIN dbo.TripInvites i ON i.InviteId=tm.JoinInviteId
    WHERE tm.UserId=@UserId AND tm.JoinRequestedAt IS NOT NULL
    ORDER BY tm.JoinRequestedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetOwnerTripJoinRequests
    @UserId UNIQUEIDENTIFIER,
    @IncludeCleared BIT=0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT tm.TripMemberId AS RequestId, tm.TripId, t.TripName, t.Destination,
           tm.UserId AS ApplicantUserId, applicant.FullName AS ApplicantName, applicant.Email AS ApplicantEmail,
           CASE WHEN tm.MemberStatus=N'Pending'
                     AND (t.IsActive=0
                          OR (i.ExpiresAt IS NOT NULL AND i.ExpiresAt<=SYSUTCDATETIME())
                          OR (i.MaxUses IS NOT NULL AND i.UseCount>=i.MaxUses))
                THEN N'Expired'
                WHEN tm.MemberStatus=N'Active' THEN N'Approved'
                ELSE tm.MemberStatus END AS Status,
           tm.JoinRequestedAt AS RequestedAt, tm.JoinRequestRespondedAt AS RespondedAt,
           tm.JoinNotificationClearedAt AS ClearedAt
    FROM dbo.TripMembers tm
    JOIN dbo.Trips t ON t.TripId=tm.TripId AND t.CreatedBy=@UserId
    JOIN dbo.Users applicant ON applicant.UserId=tm.UserId
    LEFT JOIN dbo.TripInvites i ON i.InviteId=tm.JoinInviteId
    WHERE tm.JoinRequestedAt IS NOT NULL
      AND (@IncludeCleared=1 OR tm.JoinNotificationClearedAt IS NULL)
    ORDER BY CASE WHEN tm.MemberStatus=N'Pending' THEN 0 ELSE 1 END, tm.JoinRequestedAt DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ApproveTripJoinRequest
    @RequestId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @TripId UNIQUEIDENTIFIER;
    SELECT @TripId=TripId FROM dbo.TripMembers WHERE TripMemberId=@RequestId;
    IF @TripId IS NULL THROW 51100, 'Join request was not found.', 1;

    BEGIN TRANSACTION;
    DECLARE @OwnerId UNIQUEIDENTIFIER, @IsActive BIT;
    SELECT @OwnerId=CreatedBy, @IsActive=IsActive
    FROM dbo.Trips WITH (UPDLOCK, HOLDLOCK)
    WHERE TripId=@TripId;
    IF @OwnerId IS NULL OR @OwnerId<>@UserId
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51101, 'Join request was not found.', 1;
    END;

    DECLARE @ApplicantUserId UNIQUEIDENTIFIER, @InviteId UNIQUEIDENTIFIER, @Status NVARCHAR(40), @RequestedAt DATETIME2(7), @RespondedAt DATETIME2(7), @ClearedAt DATETIME2(7);
    SELECT @ApplicantUserId=UserId, @InviteId=JoinInviteId, @Status=MemberStatus,
           @RequestedAt=JoinRequestedAt, @RespondedAt=JoinRequestRespondedAt,
           @ClearedAt=JoinNotificationClearedAt
    FROM dbo.TripMembers WITH (UPDLOCK, HOLDLOCK)
    WHERE TripMemberId=@RequestId AND TripId=@TripId AND JoinRequestedAt IS NOT NULL;
    IF @ApplicantUserId IS NULL
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51100, 'Join request was not found.', 1;
    END;
    IF @Status=N'Active'
    BEGIN
        COMMIT TRANSACTION;
        SELECT @RequestId AS RequestId, @TripId AS TripId, N'Approved' AS Status, @RequestedAt AS RequestedAt, @RespondedAt AS RespondedAt, @ClearedAt AS ClearedAt;
        RETURN;
    END;
    IF @Status<>N'Pending'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51102, 'Join request is no longer pending.', 1;
    END;

    DECLARE @ExpiresAt DATETIME2(7), @MaxUses INT, @UseCount INT;
    SELECT @ExpiresAt=ExpiresAt, @MaxUses=MaxUses, @UseCount=UseCount
    FROM dbo.TripInvites WITH (UPDLOCK, HOLDLOCK)
    WHERE InviteId=@InviteId;
    IF @IsActive IS NULL OR @IsActive=0 OR @InviteId IS NULL OR @UseCount IS NULL
       OR (@ExpiresAt IS NOT NULL AND @ExpiresAt<=SYSUTCDATETIME())
       OR (@MaxUses IS NOT NULL AND @UseCount>=@MaxUses)
    BEGIN
        SET @Status=N'Expired'; SET @RespondedAt=SYSUTCDATETIME();
        UPDATE dbo.TripMembers
           SET MemberStatus=@Status, JoinRequestRespondedAt=@RespondedAt
         WHERE TripMemberId=@RequestId;
        COMMIT TRANSACTION;
        SELECT @RequestId AS RequestId, @TripId AS TripId, @Status AS Status, @RequestedAt AS RequestedAt, @RespondedAt AS RespondedAt, @ClearedAt AS ClearedAt;
        RETURN;
    END;

    SET @Status=N'Active'; SET @RespondedAt=SYSUTCDATETIME();
    UPDATE dbo.TripMembers
       SET MemberRole=N'Member', MemberStatus=@Status, JoinedAt=@RespondedAt,
           JoinRequestRespondedAt=@RespondedAt
     WHERE TripMemberId=@RequestId;
    UPDATE dbo.TripInvites SET UseCount=UseCount+1 WHERE InviteId=@InviteId;

    COMMIT TRANSACTION;
    SELECT @RequestId AS RequestId, @TripId AS TripId, N'Approved' AS Status, @RequestedAt AS RequestedAt, @RespondedAt AS RespondedAt, @ClearedAt AS ClearedAt;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_RejectTripJoinRequest
    @RequestId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @TripId UNIQUEIDENTIFIER;
    SELECT @TripId=TripId FROM dbo.TripMembers WHERE TripMemberId=@RequestId;
    IF @TripId IS NULL THROW 51100, 'Join request was not found.', 1;

    BEGIN TRANSACTION;
    DECLARE @OwnerId UNIQUEIDENTIFIER;
    SELECT @OwnerId=CreatedBy FROM dbo.Trips WITH (UPDLOCK, HOLDLOCK) WHERE TripId=@TripId;
    IF @OwnerId IS NULL OR @OwnerId<>@UserId
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51101, 'Join request was not found.', 1;
    END;

    DECLARE @Status NVARCHAR(40), @RequestedAt DATETIME2(7), @RespondedAt DATETIME2(7), @ClearedAt DATETIME2(7);
    SELECT @Status=MemberStatus, @RequestedAt=JoinRequestedAt,
           @RespondedAt=JoinRequestRespondedAt, @ClearedAt=JoinNotificationClearedAt
    FROM dbo.TripMembers WITH (UPDLOCK, HOLDLOCK)
    WHERE TripMemberId=@RequestId AND TripId=@TripId AND JoinRequestedAt IS NOT NULL;
    IF @Status=N'Rejected'
    BEGIN
        COMMIT TRANSACTION;
        SELECT @RequestId AS RequestId, @TripId AS TripId, N'Rejected' AS Status, @RequestedAt AS RequestedAt, @RespondedAt AS RespondedAt, @ClearedAt AS ClearedAt;
        RETURN;
    END;
    IF @Status<>N'Pending'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51102, 'Join request is no longer pending.', 1;
    END;

    SET @Status=N'Rejected'; SET @RespondedAt=SYSUTCDATETIME();
    UPDATE dbo.TripMembers SET MemberStatus=@Status, JoinRequestRespondedAt=@RespondedAt WHERE TripMemberId=@RequestId;
    COMMIT TRANSACTION;
    SELECT @RequestId AS RequestId, @TripId AS TripId, @Status AS Status, @RequestedAt AS RequestedAt, @RespondedAt AS RespondedAt, @ClearedAt AS ClearedAt;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_CancelTripJoinRequest
    @RequestId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @TripId UNIQUEIDENTIFIER;
    SELECT @TripId=TripId FROM dbo.TripMembers WHERE TripMemberId=@RequestId;
    IF @TripId IS NULL THROW 51100, 'Join request was not found.', 1;

    BEGIN TRANSACTION;
    DECLARE @LockedTripId UNIQUEIDENTIFIER;
    SELECT @LockedTripId=TripId FROM dbo.Trips WITH (UPDLOCK, HOLDLOCK) WHERE TripId=@TripId;
    DECLARE @ApplicantUserId UNIQUEIDENTIFIER, @Status NVARCHAR(40), @RequestedAt DATETIME2(7), @RespondedAt DATETIME2(7), @ClearedAt DATETIME2(7);
    SELECT @ApplicantUserId=UserId, @Status=MemberStatus, @RequestedAt=JoinRequestedAt,
           @RespondedAt=JoinRequestRespondedAt, @ClearedAt=JoinNotificationClearedAt
    FROM dbo.TripMembers WITH (UPDLOCK, HOLDLOCK)
    WHERE TripMemberId=@RequestId AND TripId=@TripId AND JoinRequestedAt IS NOT NULL;
    IF @ApplicantUserId IS NULL OR @ApplicantUserId<>@UserId
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51101, 'Join request was not found.', 1;
    END;
    IF @Status=N'Cancelled'
    BEGIN
        COMMIT TRANSACTION;
        SELECT @RequestId AS RequestId, @TripId AS TripId, N'Cancelled' AS Status, @RequestedAt AS RequestedAt, @RespondedAt AS RespondedAt, @ClearedAt AS ClearedAt;
        RETURN;
    END;
    IF @Status<>N'Pending'
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51102, 'Only a pending request can be cancelled.', 1;
    END;

    SET @Status=N'Cancelled'; SET @RespondedAt=SYSUTCDATETIME();
    UPDATE dbo.TripMembers SET MemberStatus=@Status, JoinRequestRespondedAt=@RespondedAt WHERE TripMemberId=@RequestId;
    COMMIT TRANSACTION;
    SELECT @RequestId AS RequestId, @TripId AS TripId, @Status AS Status, @RequestedAt AS RequestedAt, @RespondedAt AS RespondedAt, @ClearedAt AS ClearedAt;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ClearTripJoinRequest
    @RequestId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    DECLARE @TripId UNIQUEIDENTIFIER;
    SELECT @TripId=TripId FROM dbo.TripMembers WHERE TripMemberId=@RequestId AND JoinRequestedAt IS NOT NULL;
    IF @TripId IS NULL THROW 51100, 'Join request was not found.', 1;

    BEGIN TRANSACTION;
    DECLARE @OwnerId UNIQUEIDENTIFIER;
    SELECT @OwnerId=CreatedBy FROM dbo.Trips WITH (UPDLOCK, HOLDLOCK) WHERE TripId=@TripId;
    IF @OwnerId IS NULL OR @OwnerId<>@UserId
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51101, 'Join request was not found.', 1;
    END;

    UPDATE dbo.TripMembers
       SET JoinNotificationClearedAt=COALESCE(JoinNotificationClearedAt, SYSUTCDATETIME())
     WHERE TripMemberId=@RequestId AND TripId=@TripId AND JoinRequestedAt IS NOT NULL;
    COMMIT TRANSACTION;
    SELECT TripMemberId AS RequestId, TripId,
           CASE WHEN MemberStatus=N'Active' THEN N'Approved' ELSE MemberStatus END AS Status,
           JoinRequestedAt AS RequestedAt, JoinRequestRespondedAt AS RespondedAt,
           JoinNotificationClearedAt AS ClearedAt
    FROM dbo.TripMembers WHERE TripMemberId=@RequestId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_ClearAllTripJoinRequests
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OwnedTrips TABLE (TripId UNIQUEIDENTIFIER PRIMARY KEY);
    INSERT @OwnedTrips(TripId) SELECT TripId FROM dbo.Trips WHERE CreatedBy=@UserId;
    UPDATE tm SET JoinNotificationClearedAt=SYSUTCDATETIME()
    FROM dbo.TripMembers tm
    WHERE tm.JoinRequestedAt IS NOT NULL
      AND tm.JoinNotificationClearedAt IS NULL
      AND EXISTS (SELECT 1 FROM @OwnedTrips t WHERE t.TripId=tm.TripId);
    SELECT @@ROWCOUNT AS ClearedCount;
END;
GO

/* Keep the legacy procedure safe for older callers: invite acceptance now requests approval. */
CREATE OR ALTER PROCEDURE dbo.usp_JoinTripByInvite
    @TokenHash VARBINARY(32),
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    EXEC dbo.usp_CreateTripJoinRequestByInvite @TokenHash=@TokenHash, @UserId=@UserId;
END;
GO
