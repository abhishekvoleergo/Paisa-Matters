USE [paisamattersdb];
GO

/* Soft-delete state for existing and newly-created trips. */
IF COL_LENGTH(N'dbo.Trips', N'IsActive') IS NULL
BEGIN
    ALTER TABLE dbo.Trips
        ADD IsActive BIT NOT NULL
            CONSTRAINT DF_Trips_IsActive DEFAULT (1) WITH VALUES;
END;
GO

/* Keep the existing GET route result shape, while hiding inactive trips. */
CREATE OR ALTER PROCEDURE dbo.usp_GetTripsByUser
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT t.TripId, t.TripName, t.Destination, t.StartDate, t.EndDate,
           t.CurrencyCode, t.CreatedBy, t.CreatedAt, t.UpdatedAt,
           tm.MemberRole, tm.MemberStatus, tm.JoinedAt
    FROM dbo.TripMembers AS tm
    INNER JOIN dbo.Trips AS t ON t.TripId=tm.TripId
    WHERE tm.UserId=@UserId
      AND tm.MemberStatus=N'Active'
      AND t.IsActive=1
    ORDER BY t.CreatedAt DESC;
END;
GO

/* Preserve trip and membership history; DELETE marks the trip inactive. */
CREATE OR ALTER PROCEDURE dbo.usp_DeleteTrip
    @TripId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    BEGIN TRANSACTION;

    UPDATE dbo.Trips WITH (UPDLOCK, HOLDLOCK)
       SET IsActive=0, UpdatedAt=SYSUTCDATETIME()
     WHERE TripId=@TripId AND CreatedBy=@UserId AND IsActive=1;

    IF @@ROWCOUNT<>1
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 50100, 'Trip not found or you are not authorized to delete it.', 1;
    END;

    COMMIT TRANSACTION;
    SELECT @TripId AS TripId, CAST(1 AS BIT) AS IsDeleted,
           N'Trip archived successfully.' AS Message;
END;
GO

/* Inactive trips cannot issue fresh invitations. */
CREATE OR ALTER PROCEDURE dbo.usp_CreateTripInvite
    @TripId UNIQUEIDENTIFIER,
    @CreatedBy UNIQUEIDENTIFIER,
    @TokenHash VARBINARY(32),
    @ExpiresAt DATETIME2(7)=NULL,
    @MaxUses INT=NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;
    IF @TokenHash IS NULL OR DATALENGTH(@TokenHash)<>32
        THROW 50020, 'A valid SHA-256 token hash is required.', 1;
    IF @MaxUses IS NOT NULL AND @MaxUses<=0
        THROW 50021, 'MaxUses must be greater than zero.', 1;
    IF @ExpiresAt IS NOT NULL AND @ExpiresAt<=SYSUTCDATETIME()
        THROW 50022, 'Expiry must be in the future.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WHERE TripId=@TripId AND CreatedBy=@CreatedBy AND IsActive=1)
        THROW 50023, 'Only the owner of an active trip can create invitations.', 1;

    DECLARE @NewInvite TABLE (InviteId UNIQUEIDENTIFIER);
    INSERT dbo.TripInvites(TripId,TokenHash,CreatedBy,ExpiresAt,MaxUses)
        OUTPUT inserted.InviteId INTO @NewInvite(InviteId)
        VALUES(@TripId,@TokenHash,@CreatedBy,@ExpiresAt,@MaxUses);
    SELECT i.InviteId, i.TripId, i.CreatedAt, i.ExpiresAt, i.MaxUses, i.UseCount
    FROM dbo.TripInvites i JOIN @NewInvite n ON n.InviteId=i.InviteId;
END;
GO

/* Read trip details for an active trip member. */
CREATE OR ALTER PROCEDURE dbo.usp_GetTripById
    @TripId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SELECT t.TripId, t.TripName, t.Destination, t.StartDate, t.EndDate,
           t.CurrencyCode, t.CreatedBy, t.CreatedAt, t.UpdatedAt,
           owner.FullName AS OwnerName, caller.MemberRole AS CurrentUserRole,
           (SELECT COUNT(*) FROM dbo.TripMembers m WHERE m.TripId=t.TripId AND m.MemberStatus=N'Active') AS MemberCount
    FROM dbo.Trips t
    JOIN dbo.TripMembers caller ON caller.TripId=t.TripId AND caller.UserId=@UserId AND caller.MemberStatus=N'Active'
    JOIN dbo.Users owner ON owner.UserId=t.CreatedBy
    WHERE t.TripId=@TripId AND t.IsActive=1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_UpdateTrip
    @TripId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER,
    @TripName NVARCHAR(150),
    @Destination NVARCHAR(200),
    @StartDate DATE=NULL,
    @EndDate DATE=NULL
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    IF @EndDate IS NOT NULL AND @StartDate IS NOT NULL AND @EndDate < @StartDate
        THROW 51001, 'End date cannot be before start date.', 1;
    UPDATE dbo.Trips SET TripName=@TripName, Destination=@Destination, StartDate=@StartDate,
        EndDate=@EndDate, UpdatedAt=SYSUTCDATETIME()
    WHERE TripId=@TripId AND CreatedBy=@UserId AND IsActive=1;
    IF @@ROWCOUNT=0 THROW 51002, 'Trip was not found or caller is not the trip owner.', 1;
    EXEC dbo.usp_GetTripById @TripId=@TripId, @UserId=@UserId;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetTripMembers
    @TripId UNIQUEIDENTIFIER,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    IF NOT EXISTS (SELECT 1 FROM dbo.TripMembers m JOIN dbo.Trips t ON t.TripId=m.TripId WHERE m.TripId=@TripId AND m.UserId=@UserId AND m.MemberStatus=N'Active' AND t.IsActive=1)
        THROW 51003, 'Trip was not found or caller is not an active member.', 1;
    SELECT m.UserId, u.FullName, m.MemberRole AS Role, m.MemberStatus AS Status, m.JoinedAt
    FROM dbo.TripMembers m
    JOIN dbo.Users u ON u.UserId=m.UserId
    JOIN dbo.Trips t ON t.TripId=m.TripId AND t.IsActive=1
    WHERE m.TripId=@TripId AND m.MemberStatus=N'Active'
    ORDER BY CASE WHEN m.MemberRole=N'Owner' THEN 0 ELSE 1 END, m.JoinedAt;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetTripInviteByTokenHash
    @TokenHash VARBINARY(32)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.TripId, t.TripName, t.Destination, i.ExpiresAt, i.MaxUses, i.UseCount,
           CAST(CASE WHEN t.IsActive=0 THEN 0
                     WHEN i.ExpiresAt IS NOT NULL AND i.ExpiresAt<=SYSUTCDATETIME() THEN 0
                     WHEN i.MaxUses IS NOT NULL AND i.UseCount>=i.MaxUses THEN 0 ELSE 1 END AS BIT) AS IsValid,
           CASE WHEN t.IsActive=0 THEN N'Invalid'
                WHEN i.ExpiresAt IS NOT NULL AND i.ExpiresAt<=SYSUTCDATETIME() THEN N'Expired'
                WHEN i.MaxUses IS NOT NULL AND i.UseCount>=i.MaxUses THEN N'Exhausted' ELSE N'Valid' END AS Status
    FROM dbo.TripInvites i JOIN dbo.Trips t ON t.TripId=i.TripId
    WHERE i.TokenHash=@TokenHash;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_JoinTripByInvite
    @TokenHash VARBINARY(32),
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON; SET XACT_ABORT ON;
    BEGIN TRANSACTION;
    DECLARE @InviteId UNIQUEIDENTIFIER, @TripId UNIQUEIDENTIFIER, @ExpiresAt DATETIME2(7), @MaxUses INT, @UseCount INT;
    SELECT @InviteId=InviteId, @TripId=TripId, @ExpiresAt=ExpiresAt, @MaxUses=MaxUses, @UseCount=UseCount
    FROM dbo.TripInvites WITH (UPDLOCK,HOLDLOCK) WHERE TokenHash=@TokenHash;
    IF @InviteId IS NULL BEGIN ROLLBACK; THROW 51004, 'Invite is invalid.', 1; END;
    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WITH (UPDLOCK,HOLDLOCK) WHERE TripId=@TripId AND IsActive=1) BEGIN ROLLBACK; THROW 51007, 'Trip is no longer available.', 1; END;
    IF @ExpiresAt IS NOT NULL AND @ExpiresAt<=SYSUTCDATETIME() BEGIN ROLLBACK; THROW 51005, 'Invite has expired.', 1; END;
    IF @MaxUses IS NOT NULL AND @UseCount>=@MaxUses BEGIN ROLLBACK; THROW 51006, 'Invite has reached its use limit.', 1; END;
    IF EXISTS (SELECT 1 FROM dbo.TripMembers WHERE TripId=@TripId AND UserId=@UserId AND MemberStatus=N'Active')
    BEGIN COMMIT; SELECT @TripId AS TripId, N'AlreadyMember' AS Status; RETURN; END;
    IF EXISTS (SELECT 1 FROM dbo.TripMembers WHERE TripId=@TripId AND UserId=@UserId)
        UPDATE dbo.TripMembers SET MemberStatus=N'Active', MemberRole=N'Member', JoinedAt=SYSUTCDATETIME() WHERE TripId=@TripId AND UserId=@UserId;
    ELSE
        INSERT dbo.TripMembers(TripMemberId,TripId,UserId,MemberRole,MemberStatus,JoinedAt)
        VALUES(NEWID(),@TripId,@UserId,N'Member',N'Active',SYSUTCDATETIME());
    UPDATE dbo.TripInvites SET UseCount=UseCount+1 WHERE InviteId=@InviteId;
    COMMIT;
    SELECT @TripId AS TripId, N'Joined' AS Status;
END;
GO
