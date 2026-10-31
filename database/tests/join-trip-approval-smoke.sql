USE [paisamattersdb];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;

DECLARE @OwnerId UNIQUEIDENTIFIER;
DECLARE @ApplicantOneId UNIQUEIDENTIFIER;
DECLARE @ApplicantTwoId UNIQUEIDENTIFIER;
DECLARE @TripId UNIQUEIDENTIFIER;
DECLARE @InviteId UNIQUEIDENTIFIER;
DECLARE @TokenHash VARBINARY(32);
DECLARE @ExpiredInviteId UNIQUEIDENTIFIER;
DECLARE @ExpiredTokenHash VARBINARY(32);
DECLARE @FutureExpiry DATETIME2(7);
DECLARE @TripName NVARCHAR(150);
DECLARE @RequestOne UNIQUEIDENTIFIER;
DECLARE @RequestTwo UNIQUEIDENTIFIER;
DECLARE @ReturnedRequest UNIQUEIDENTIFIER;
DECLARE @ReturnedStatus NVARCHAR(40);
DECLARE @DetailsCount INT;
DECLARE @MembersDenied BIT;
DECLARE @UnauthorizedOwnerDenied BIT;
DECLARE @ApprovedCount INT;
DECLARE @UseCount INT;
DECLARE @ClearCount INT;

DECLARE @JoinResult TABLE (RequestId UNIQUEIDENTIFIER NULL, TripId UNIQUEIDENTIFIER, Status NVARCHAR(40));
DECLARE @ActionResult TABLE (RequestId UNIQUEIDENTIFIER, TripId UNIQUEIDENTIFIER, Status NVARCHAR(40), RequestedAt DATETIME2(7), RespondedAt DATETIME2(7) NULL, ClearedAt DATETIME2(7) NULL);
DECLARE @TripDetails TABLE (TripId UNIQUEIDENTIFIER, TripName NVARCHAR(150), Destination NVARCHAR(200), StartDate DATE NULL, EndDate DATE NULL, CurrencyCode CHAR(3), CreatedBy UNIQUEIDENTIFIER, CreatedAt DATETIME2(0), UpdatedAt DATETIME2(0) NULL, OwnerName NVARCHAR(150), CurrentUserRole NVARCHAR(20), MemberCount INT);
DECLARE @MyRequests TABLE (RequestId UNIQUEIDENTIFIER, TripId UNIQUEIDENTIFIER, TripName NVARCHAR(150), Destination NVARCHAR(200), Status NVARCHAR(40), RequestedAt DATETIME2(7), RespondedAt DATETIME2(7) NULL);
DECLARE @OwnerRequests TABLE (RequestId UNIQUEIDENTIFIER, TripId UNIQUEIDENTIFIER, TripName NVARCHAR(150), Destination NVARCHAR(200), ApplicantUserId UNIQUEIDENTIFIER, ApplicantName NVARCHAR(150), ApplicantEmail NVARCHAR(256), Status NVARCHAR(40), RequestedAt DATETIME2(7), RespondedAt DATETIME2(7) NULL, ClearedAt DATETIME2(7) NULL);
DECLARE @TripMembers TABLE (UserId UNIQUEIDENTIFIER, FullName NVARCHAR(150), Role NVARCHAR(20), Status NVARCHAR(40), JoinedAt DATETIME2(3) NULL);

SELECT TOP (1) @OwnerId=UserId
FROM dbo.Users
WHERE IsActive=1
ORDER BY UserId;

SELECT TOP (1) @ApplicantOneId=UserId
FROM dbo.Users
WHERE IsActive=1 AND UserId<>@OwnerId
ORDER BY UserId;

SELECT TOP (1) @ApplicantTwoId=UserId
FROM dbo.Users
WHERE IsActive=1 AND UserId<>@OwnerId AND UserId<>@ApplicantOneId
ORDER BY UserId;

IF @OwnerId IS NULL OR @ApplicantOneId IS NULL OR @ApplicantTwoId IS NULL
    THROW 52000, 'Approval smoke test requires three active users.', 1;

BEGIN TRY
    SET @TripName=N'Join approval smoke ' + LEFT(REPLACE(CONVERT(NVARCHAR(36), NEWID()), N'-', N''), 12);
    EXEC dbo.usp_CreateTrip
        @TripName=@TripName,
        @Destination=N'Automated smoke test',
        @CreatedBy=@OwnerId,
        @StartDate=NULL,
        @EndDate=NULL,
        @TripId=@TripId OUTPUT;

    SET @TokenHash=HASHBYTES('SHA2_256', CONVERT(VARBINARY(16), NEWID()));
    EXEC dbo.usp_CreateTripInvite
        @TripId=@TripId,
        @CreatedBy=@OwnerId,
        @TokenHash=@TokenHash,
        @ExpiresAt=NULL,
        @MaxUses=2;

    DELETE FROM @TripDetails;
    INSERT INTO @TripDetails EXEC dbo.usp_GetTripById @TripId=@TripId, @UserId=@OwnerId;
    IF NOT EXISTS (SELECT 1 FROM @TripDetails WHERE TripId=@TripId)
        THROW 52001, 'Existing owner trip details flow failed.', 1;

    DELETE FROM @JoinResult;
    INSERT INTO @JoinResult EXEC dbo.usp_CreateTripJoinRequestByInvite @TokenHash=@TokenHash, @UserId=@ApplicantOneId;
    SELECT TOP (1) @RequestOne=RequestId, @ReturnedStatus=Status FROM @JoinResult;
    IF @ReturnedStatus<>N'Pending' OR @RequestOne IS NULL
        THROW 52002, 'A valid invite did not create a pending request.', 1;
    IF EXISTS (SELECT 1 FROM dbo.TripMembers WHERE TripId=@TripId AND UserId=@ApplicantOneId AND MemberStatus=N'Active')
        THROW 52003, 'A pending applicant was granted active membership.', 1;

    DELETE FROM @JoinResult;
    INSERT INTO @JoinResult EXEC dbo.usp_CreateTripJoinRequestByInvite @TokenHash=@TokenHash, @UserId=@ApplicantOneId;
    SELECT TOP (1) @ReturnedRequest=RequestId, @ReturnedStatus=Status FROM @JoinResult;
    IF @ReturnedStatus<>N'Pending' OR @ReturnedRequest<>@RequestOne
        THROW 52004, 'A duplicate request created a second membership/request.', 1;

    SET @DetailsCount=0;
    DELETE FROM @TripDetails;
    INSERT INTO @TripDetails EXEC dbo.usp_GetTripById @TripId=@TripId, @UserId=@ApplicantOneId;
    SELECT @DetailsCount=COUNT(*) FROM @TripDetails;
    IF @DetailsCount<>0
        THROW 52005, 'A pending applicant could read trip details.', 1;

    SET @MembersDenied=0;
    BEGIN TRY
        EXEC dbo.usp_GetTripMembers @TripId=@TripId, @UserId=@ApplicantOneId;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER()=51003 SET @MembersDenied=1;
        ELSE THROW;
    END CATCH;
    IF @MembersDenied=0
        THROW 52006, 'A pending applicant could read member-only data.', 1;

    DELETE FROM @OwnerRequests;
    INSERT INTO @OwnerRequests EXEC dbo.usp_GetOwnerTripJoinRequests @UserId=@OwnerId, @IncludeCleared=0;
    IF NOT EXISTS (SELECT 1 FROM @OwnerRequests WHERE RequestId=@RequestOne AND ApplicantUserId=@ApplicantOneId AND ApplicantName IS NOT NULL AND Status=N'Pending' AND RequestedAt IS NOT NULL)
        THROW 52007, 'The trip owner could not see the pending approval request.', 1;

    SET @UnauthorizedOwnerDenied=0;
    BEGIN TRY
        EXEC dbo.usp_ApproveTripJoinRequest @RequestId=@RequestOne, @UserId=@ApplicantOneId;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER()=51101 SET @UnauthorizedOwnerDenied=1;
        ELSE THROW;
    END CATCH;
    IF @UnauthorizedOwnerDenied=0
        THROW 52008, 'A non-owner was able to approve the request.', 1;
    IF NOT EXISTS (SELECT 1 FROM dbo.TripMembers WHERE TripMemberId=@RequestOne AND MemberStatus=N'Pending')
        THROW 52009, 'A denied owner action changed the pending request.', 1;

    DELETE FROM @ActionResult;
    INSERT INTO @ActionResult EXEC dbo.usp_ApproveTripJoinRequest @RequestId=@RequestOne, @UserId=@OwnerId;
    IF NOT EXISTS (SELECT 1 FROM @ActionResult WHERE Status=N'Approved')
        THROW 52010, 'The actual owner could not approve the request.', 1;

    DELETE FROM @ActionResult;
    INSERT INTO @ActionResult EXEC dbo.usp_ApproveTripJoinRequest @RequestId=@RequestOne, @UserId=@OwnerId;
    SELECT @ApprovedCount=COUNT(*) FROM dbo.TripMembers WHERE TripId=@TripId AND UserId=@ApplicantOneId AND MemberStatus=N'Active';
    SELECT @UseCount=UseCount FROM dbo.TripInvites WHERE InviteId=(SELECT JoinInviteId FROM dbo.TripMembers WHERE TripMemberId=@RequestOne);
    IF @ApprovedCount<>1 OR @UseCount<>1
        THROW 52011, 'Approval retry created a duplicate membership or consumed the invite twice.', 1;

    DELETE FROM @TripMembers;
    INSERT INTO @TripMembers EXEC dbo.usp_GetTripMembers @TripId=@TripId, @UserId=@ApplicantOneId;
    IF NOT EXISTS (SELECT 1 FROM @TripMembers WHERE UserId=@ApplicantOneId AND Status=N'Active')
        THROW 52012, 'An approved member could not use the existing member-details flow.', 1;

    DELETE FROM @JoinResult;
    INSERT INTO @JoinResult EXEC dbo.usp_CreateTripJoinRequestByInvite @TokenHash=@TokenHash, @UserId=@ApplicantTwoId;
    SELECT TOP (1) @RequestTwo=RequestId, @ReturnedStatus=Status FROM @JoinResult;
    IF @ReturnedStatus<>N'Pending' OR @RequestTwo IS NULL
        THROW 52013, 'The second invite request was not pending.', 1;

    DELETE FROM @ActionResult;
    INSERT INTO @ActionResult EXEC dbo.usp_RejectTripJoinRequest @RequestId=@RequestTwo, @UserId=@OwnerId;
    IF NOT EXISTS (SELECT 1 FROM @ActionResult WHERE Status=N'Rejected')
        THROW 52014, 'The owner could not reject the request.', 1;
    IF EXISTS (SELECT 1 FROM dbo.TripMembers WHERE TripMemberId=@RequestTwo AND MemberStatus=N'Active')
        THROW 52015, 'A rejected applicant was granted trip access.', 1;
    DELETE FROM @TripDetails;
    INSERT INTO @TripDetails EXEC dbo.usp_GetTripById @TripId=@TripId, @UserId=@ApplicantTwoId;
    IF EXISTS (SELECT 1 FROM @TripDetails WHERE TripId=@TripId)
        THROW 52021, 'A rejected applicant could read trip details.', 1;
    SET @MembersDenied=0;
    BEGIN TRY
        EXEC dbo.usp_GetTripMembers @TripId=@TripId, @UserId=@ApplicantTwoId;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER()=51003 SET @MembersDenied=1;
        ELSE THROW;
    END CATCH;
    IF @MembersDenied=0
        THROW 52022, 'A rejected applicant could read member-only data.', 1;

    DELETE FROM @MyRequests;
    INSERT INTO @MyRequests EXEC dbo.usp_GetMyTripJoinRequests @UserId=@ApplicantTwoId;
    IF NOT EXISTS (SELECT 1 FROM @MyRequests WHERE RequestId=@RequestTwo AND Status=N'Rejected')
        THROW 52016, 'The requester could not see the rejected state.', 1;

    DELETE FROM @JoinResult;
    INSERT INTO @JoinResult EXEC dbo.usp_CreateTripJoinRequestByInvite @TokenHash=@TokenHash, @UserId=@ApplicantTwoId;
    SELECT TOP (1) @ReturnedRequest=RequestId, @ReturnedStatus=Status FROM @JoinResult;
    IF @ReturnedStatus<>N'Pending' OR @ReturnedRequest<>@RequestTwo
        THROW 52017, 'A new invitation request after rejection duplicated the membership row.', 1;

    DELETE FROM @ActionResult;
    INSERT INTO @ActionResult EXEC dbo.usp_CancelTripJoinRequest @RequestId=@RequestTwo, @UserId=@ApplicantTwoId;
    IF NOT EXISTS (SELECT 1 FROM @ActionResult WHERE Status=N'Cancelled')
        THROW 52018, 'A requester could not cancel their pending request.', 1;

    SET @ExpiredTokenHash=HASHBYTES('SHA2_256', CONVERT(VARBINARY(16), NEWID()));
    SET @FutureExpiry=DATEADD(second, 2, SYSUTCDATETIME());
    EXEC dbo.usp_CreateTripInvite
        @TripId=@TripId,
        @CreatedBy=@OwnerId,
        @TokenHash=@ExpiredTokenHash,
        @ExpiresAt=@FutureExpiry,
        @MaxUses=NULL;
    SELECT @ExpiredInviteId=InviteId FROM dbo.TripInvites WHERE TokenHash=@ExpiredTokenHash;
    DELETE FROM @JoinResult;
    INSERT INTO @JoinResult EXEC dbo.usp_CreateTripJoinRequestByInvite @TokenHash=@ExpiredTokenHash, @UserId=@ApplicantTwoId;
    SELECT TOP (1) @ReturnedRequest=RequestId, @ReturnedStatus=Status FROM @JoinResult;
    IF @ReturnedStatus<>N'Pending' OR @ReturnedRequest<>@RequestTwo
        THROW 52023, 'A second invitation did not create a new pending request state.', 1;
    WAITFOR DELAY '00:00:03';
    DELETE FROM @MyRequests;
    INSERT INTO @MyRequests EXEC dbo.usp_GetMyTripJoinRequests @UserId=@ApplicantTwoId;
    IF NOT EXISTS (SELECT 1 FROM @MyRequests WHERE RequestId=@RequestTwo AND Status=N'Expired')
        THROW 52024, 'An expired invite did not show an expired request status.', 1;
    DELETE FROM @ActionResult;
    INSERT INTO @ActionResult EXEC dbo.usp_ApproveTripJoinRequest @RequestId=@RequestTwo, @UserId=@OwnerId;
    IF NOT EXISTS (SELECT 1 FROM @ActionResult WHERE Status=N'Expired')
        THROW 52025, 'An expired request was not blocked from approval.', 1;

    DELETE FROM @ActionResult;
    INSERT INTO @ActionResult EXEC dbo.usp_ClearTripJoinRequest @RequestId=@RequestOne, @UserId=@OwnerId;
    IF NOT EXISTS (SELECT 1 FROM @ActionResult WHERE ClearedAt IS NOT NULL)
        THROW 52019, 'The owner could not clear an individual notification.', 1;

    EXEC dbo.usp_ClearAllTripJoinRequests @UserId=@OwnerId;
    IF EXISTS (SELECT 1 FROM dbo.TripMembers WHERE TripId=@TripId AND JoinRequestedAt IS NOT NULL AND JoinNotificationClearedAt IS NULL)
        THROW 52020, 'Clear all left owner notifications uncleared.', 1;

    DELETE FROM dbo.TripMembers WHERE TripId=@TripId;
    DELETE FROM dbo.TripInvites WHERE TripId=@TripId;
    DELETE FROM dbo.Trips WHERE TripId=@TripId;
    PRINT 'PASS: trip and invite flows, duplicate request, owner authorization, approval, rejection, pending/rejected access denial, cancellation, expiry, requester status, clear, and clear all.';
END TRY
BEGIN CATCH
    IF @TripId IS NOT NULL
    BEGIN
        DELETE FROM dbo.TripMembers WHERE TripId=@TripId;
        DELETE FROM dbo.TripInvites WHERE TripId=@TripId;
        DELETE FROM dbo.Trips WHERE TripId=@TripId;
    END;
    THROW;
END CATCH;
GO
