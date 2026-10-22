-- ====================================================================================================
-- PAISAMATTERS DATABASE CONTRACT REFERENCE: EXPENSES & SETTLEMENTS
-- ====================================================================================================
-- Database:       paisamattersdb (Microsoft SQL Server)
-- Generated Date: 2026-10-16
-- Scope:          Tables, Table-Valued Parameter Type, and Stored Procedures for Expense & Settlement Domain
-- Verification:   Extracted directly from live SQL Server instance (LAPTOP-OOOEH7ER / localhost)
-- Notice:         This is a reference/contract document. Do not execute directly as a migration script.
-- ====================================================================================================

USE [paisamattersdb];
GO

-- ====================================================================================================
-- SECTION 1: USER-DEFINED TABLE TYPES (TVP)
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- Type: dbo.TripExpenseShareInput
-- Purpose: Passes per-user share distribution into dbo.usp_CreateTripExpense.
-- Behaviors:
--   - For SplitType = 'Equal':
--       Individual ShareAmount values MUST be NULL. The procedure calculates individual shares in SQL.
--   - For SplitType IN ('Custom', 'Consumption'):
--       Individual ShareAmount values MUST be provided (> 0.00), and SUM(ShareAmount) must exactly equal @Amount.
-- ----------------------------------------------------------------------------------------------------
IF TYPE_ID('dbo.TripExpenseShareInput') IS NULL
BEGIN
    CREATE TYPE [dbo].[TripExpenseShareInput] AS TABLE
    (
        [UserId]      UNIQUEIDENTIFIER NOT NULL,
        [ShareAmount] DECIMAL(19, 2)   NULL
    );
END;
GO


-- ====================================================================================================
-- SECTION 2: VERIFIED TABLE DEFINITIONS, CONSTRAINTS & INDEXES
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- Table: dbo.TripExpenses
-- Purpose: Primary record for group expenses incurred within a trip. Supports soft-delete.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE [dbo].[TripExpenses]
(
    [ExpenseId]    UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_TripExpenses_ExpenseId] DEFAULT (NEWSEQUENTIALID()),
    [TripId]       UNIQUEIDENTIFIER NOT NULL,
    [Description]  NVARCHAR(200)    NOT NULL,
    [Amount]       DECIMAL(19, 2)   NOT NULL,
    [Category]     NVARCHAR(50)     NOT NULL,
    [PaidByUserId] UNIQUEIDENTIFIER NOT NULL,
    [SplitType]    NVARCHAR(20)     NOT NULL,
    [ExpenseDate]  DATETIME2(0)     NOT NULL CONSTRAINT [DF_TripExpenses_ExpenseDate] DEFAULT (SYSUTCDATETIME()),
    [Notes]        NVARCHAR(500)    NULL,
    [CreatedBy]    UNIQUEIDENTIFIER NOT NULL,
    [CreatedAt]    DATETIME2(7)     NOT NULL CONSTRAINT [DF_TripExpenses_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt]    DATETIME2(7)     NULL,
    [IsDeleted]    BIT              NOT NULL CONSTRAINT [DF_TripExpenses_IsDeleted] DEFAULT ((0)),
    [DeletedAt]    DATETIME2(7)     NULL,

    -- Primary Key
    CONSTRAINT [PK_TripExpenses] PRIMARY KEY CLUSTERED ([ExpenseId] ASC),

    -- Foreign Keys
    CONSTRAINT [FK_TripExpenses_Trips] FOREIGN KEY ([TripId])
        REFERENCES [dbo].[Trips] ([TripId]),
    CONSTRAINT [FK_TripExpenses_PaidByUser] FOREIGN KEY ([PaidByUserId])
        REFERENCES [dbo].[Users] ([UserId]),
    CONSTRAINT [FK_TripExpenses_CreatedBy] FOREIGN KEY ([CreatedBy])
        REFERENCES [dbo].[Users] ([UserId]),

    -- Check Constraints
    CONSTRAINT [CK_TripExpenses_Amount] CHECK ([Amount] > (0)),
    CONSTRAINT [CK_TripExpenses_Description] CHECK (LEN(LTRIM(RTRIM([Description]))) > (0)),
    CONSTRAINT [CK_TripExpenses_SplitType] CHECK ([SplitType] IN ('Consumption', 'Custom', 'Equal'))
);
GO

-- Non-clustered Index: Filtered / Covering index for trip expenses querying
CREATE NONCLUSTERED INDEX [IX_TripExpenses_TripId_ExpenseDate]
    ON [dbo].[TripExpenses] ([TripId] ASC, [ExpenseDate] DESC)
    INCLUDE ([Amount], [PaidByUserId], [SplitType], [IsDeleted]);
GO


-- ----------------------------------------------------------------------------------------------------
-- Table: dbo.TripExpenseSplits
-- Purpose: Normalized breakdown of how an expense is allocated across individual participants.
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE [dbo].[TripExpenseSplits]
(
    [ExpenseSplitId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_TripExpenseSplits_ExpenseSplitId] DEFAULT (NEWSEQUENTIALID()),
    [ExpenseId]      UNIQUEIDENTIFIER NOT NULL,
    [UserId]         UNIQUEIDENTIFIER NOT NULL,
    [ShareAmount]    DECIMAL(19, 2)   NOT NULL,
    [CreatedAt]      DATETIME2(7)     NOT NULL CONSTRAINT [DF_TripExpenseSplits_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt]      DATETIME2(7)     NULL,

    -- Primary Key
    CONSTRAINT [PK_TripExpenseSplits] PRIMARY KEY CLUSTERED ([ExpenseSplitId] ASC),

    -- Foreign Keys
    CONSTRAINT [FK_TripExpenseSplits_Expense] FOREIGN KEY ([ExpenseId])
        REFERENCES [dbo].[TripExpenses] ([ExpenseId]),
    CONSTRAINT [FK_TripExpenseSplits_User] FOREIGN KEY ([UserId])
        REFERENCES [dbo].[Users] ([UserId]),

    -- Unique Constraint: A user can only have one split share per expense
    CONSTRAINT [UQ_TripExpenseSplits_Expense_User] UNIQUE NONCLUSTERED ([ExpenseId] ASC, [UserId] ASC),

    -- Check Constraints
    CONSTRAINT [CK_TripExpenseSplits_ShareAmount] CHECK ([ShareAmount] > (0))
);
GO

-- Non-clustered Index: Reverse lookup by UserId
CREATE NONCLUSTERED INDEX [IX_TripExpenseSplits_UserId]
    ON [dbo].[TripExpenseSplits] ([UserId] ASC, [ExpenseId] ASC)
    INCLUDE ([ShareAmount]);
GO


-- ----------------------------------------------------------------------------------------------------
-- Table: dbo.TripSettlements
-- Purpose: Records debt settlement transfers between members (Pending, Completed, Cancelled).
-- ----------------------------------------------------------------------------------------------------
CREATE TABLE [dbo].[TripSettlements]
(
    [SettlementId]     UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_TripSettlements_SettlementId] DEFAULT (NEWSEQUENTIALID()),
    [TripId]           UNIQUEIDENTIFIER NOT NULL,
    [PaidByUserId]     UNIQUEIDENTIFIER NOT NULL,
    [ReceivedByUserId] UNIQUEIDENTIFIER NOT NULL,
    [Amount]           DECIMAL(19, 2)   NOT NULL,
    [SettlementDate]   DATETIME2(7)     NOT NULL CONSTRAINT [DF_TripSettlements_SettlementDate] DEFAULT (SYSUTCDATETIME()),
    [Status]           NVARCHAR(20)     NOT NULL CONSTRAINT [DF_TripSettlements_Status] DEFAULT ('Pending'),
    [Notes]            NVARCHAR(500)    NULL,
    [CreatedBy]        UNIQUEIDENTIFIER NOT NULL,
    [CreatedAt]        DATETIME2(7)     NOT NULL CONSTRAINT [DF_TripSettlements_CreatedAt] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAt]        DATETIME2(7)     NULL,

    -- Primary Key
    CONSTRAINT [PK_TripSettlements] PRIMARY KEY CLUSTERED ([SettlementId] ASC),

    -- Foreign Keys
    CONSTRAINT [FK_TripSettlements_Trips] FOREIGN KEY ([TripId])
        REFERENCES [dbo].[Trips] ([TripId]),
    CONSTRAINT [FK_TripSettlements_PaidByUser] FOREIGN KEY ([PaidByUserId])
        REFERENCES [dbo].[Users] ([UserId]),
    CONSTRAINT [FK_TripSettlements_ReceivedByUser] FOREIGN KEY ([ReceivedByUserId])
        REFERENCES [dbo].[Users] ([UserId]),
    CONSTRAINT [FK_TripSettlements_CreatedBy] FOREIGN KEY ([CreatedBy])
        REFERENCES [dbo].[Users] ([UserId]),

    -- Check Constraints
    CONSTRAINT [CK_TripSettlements_Amount] CHECK ([Amount] > (0)),
    CONSTRAINT [CK_TripSettlements_DifferentUsers] CHECK ([PaidByUserId] <> [ReceivedByUserId]),
    CONSTRAINT [CK_TripSettlements_Status] CHECK ([Status] IN ('Cancelled', 'Completed', 'Pending'))
);
GO

-- Non-clustered Index: Filter by Trip and Status
CREATE NONCLUSTERED INDEX [IX_TripSettlements_TripId_Status]
    ON [dbo].[TripSettlements] ([TripId] ASC, [Status] ASC);
GO


-- ====================================================================================================
-- SECTION 3: STORED PROCEDURE CONTRACTS & DEFINITIONS
-- ====================================================================================================

-- ----------------------------------------------------------------------------------------------------
-- 1. dbo.usp_CreateTripExpense
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Creates a new expense or updates an existing expense.
--   When @ExpenseId is NULL: Inserts new record into dbo.TripExpenses with a generated NEWID().
--   When @ExpenseId is NOT NULL: Updates existing record in dbo.TripExpenses.
--   In both modes: Replaces all records in dbo.TripExpenseSplits for the expense.
--
-- Parameters:
--   @ExpenseId    UNIQUEIDENTIFIER = NULL (Pass NULL to create, non-NULL to update)
--   @TripId       UNIQUEIDENTIFIER        (Target trip)
--   @Description  NVARCHAR(200)           (Expense title / description)
--   @Amount       DECIMAL(19,2)           (Total expense amount > 0)
--   @Category     NVARCHAR(50)            (Food, Travel, Stay, Fuel, etc.)
--   @PaidByUserId UNIQUEIDENTIFIER        (User who paid; must be active member of trip)
--   @SplitType    NVARCHAR(20)            ('Equal', 'Custom', or 'Consumption')
--   @ExpenseDate  DATETIME2(0) = NULL     (Date of expense; defaults to SYSUTCDATETIME() if NULL)
--   @Notes        NVARCHAR(500) = NULL    (Optional remarks)
--   @CreatedBy    UNIQUEIDENTIFIER        (Acting user; must be active member of trip)
--   @Shares       dbo.TripExpenseShareInput READONLY (List of participants and their shares)
--
-- Validation Rules & Error Codes:
--   50001: Expense amount must be greater than zero.
--   50002: Expense description is required.
--   50003: Invalid split type (must be 'Equal', 'Custom', 'Consumption').
--   50004: Select at least one expense participant.
--   50005: Share amounts cannot be negative.
--   50006: Custom and Consumption shares must be greater than zero.
--   50007: For Equal split, send NULL share amounts (calculated server-side with integer paise distribution).
--   50008: Trip not found.
--   50009: Payer is not an active member of this trip.
--   50010: Creator is not an active member of this trip.
--   50011: Every participant must be an active member of the trip.
--   50012: Expense not found or already deleted (on update).
--   50013: Participant shares must equal the total expense amount (for Custom/Consumption).
--
-- Result Set (1 row):
--   ExpenseId   UNIQUEIDENTIFIER  Id of created or updated expense
--   TripId      UNIQUEIDENTIFIER  Trip identifier
--   SplitType   NVARCHAR(20)      Split type applied
--   Amount      DECIMAL(19,2)     Total expense amount
--   Result      VARCHAR(7)        'Created' or 'Updated'
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_CreateTripExpense
(
    @ExpenseId UNIQUEIDENTIFIER = NULL,
    @TripId UNIQUEIDENTIFIER,
    @Description NVARCHAR(200),
    @Amount DECIMAL(19,2),
    @Category NVARCHAR(50),
    @PaidByUserId UNIQUEIDENTIFIER,
    @SplitType NVARCHAR(20),
    @ExpenseDate DATETIME2(0) = NULL,
    @Notes NVARCHAR(500) = NULL,
    @CreatedBy UNIQUEIDENTIFIER,
    @Shares dbo.TripExpenseShareInput READONLY
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @Now DATETIME2(0) = SYSUTCDATETIME();
    DECLARE @SavedExpenseId UNIQUEIDENTIFIER = @ExpenseId;
    DECLARE @IsUpdate BIT = CASE WHEN @ExpenseId IS NULL THEN 0 ELSE 1 END;

    BEGIN TRY
        IF @Amount <= 0
            THROW 50001, 'Expense amount must be greater than zero.', 1;

        IF NULLIF(LTRIM(RTRIM(@Description)), '') IS NULL
            THROW 50002, 'Expense description is required.', 1;

        IF @SplitType NOT IN ('Equal', 'Custom', 'Consumption')
            THROW 50003, 'Invalid split type.', 1;

        IF NOT EXISTS (SELECT 1 FROM @Shares)
            THROW 50004, 'Select at least one expense participant.', 1;

        IF EXISTS (SELECT 1 FROM @Shares WHERE ShareAmount < 0)
            THROW 50005, 'Share amounts cannot be negative.', 1;

        IF @SplitType IN ('Custom', 'Consumption')
           AND EXISTS
               (SELECT 1 FROM @Shares
                WHERE ShareAmount IS NULL OR ShareAmount <= 0)
            THROW 50006, 'Custom and Consumption shares must be greater than zero.', 1;

        IF @SplitType = 'Equal'
           AND EXISTS (SELECT 1 FROM @Shares WHERE ShareAmount IS NOT NULL)
            THROW 50007, 'For Equal split, send NULL share amounts.', 1;

        BEGIN TRANSACTION;

        IF NOT EXISTS
        (
            SELECT 1
            FROM dbo.Trips
            WHERE TripId = @TripId
        )
            THROW 50008, 'Trip not found.', 1;

        IF NOT EXISTS
        (
            SELECT 1
            FROM dbo.TripMembers
            WHERE TripId = @TripId
              AND UserId = @PaidByUserId
              AND MemberStatus = 'Active'
        )
            THROW 50009, 'Payer is not an active member of this trip.', 1;

        IF NOT EXISTS
        (
            SELECT 1
            FROM dbo.TripMembers
            WHERE TripId = @TripId
              AND UserId = @CreatedBy
              AND MemberStatus = 'Active'
        )
            THROW 50010, 'Creator is not an active member of this trip.', 1;

        IF EXISTS
        (
            SELECT 1
            FROM @Shares s
            WHERE NOT EXISTS
            (
                SELECT 1
                FROM dbo.TripMembers tm
                WHERE tm.TripId = @TripId
                  AND tm.UserId = s.UserId
                  AND tm.MemberStatus = 'Active'
            )
        )
            THROW 50011, 'Every participant must be an active member of the trip.', 1;

        IF @IsUpdate = 1
        BEGIN
            IF NOT EXISTS
            (
                SELECT 1
                FROM dbo.TripExpenses WITH (UPDLOCK, HOLDLOCK)
                WHERE ExpenseId = @ExpenseId
                  AND TripId = @TripId
                  AND IsDeleted = 0
            )
                THROW 50012, 'Expense not found or already deleted.', 1;

            UPDATE dbo.TripExpenses
            SET Description = @Description,
                Amount = @Amount,
                Category = @Category,
                PaidByUserId = @PaidByUserId,
                SplitType = @SplitType,
                ExpenseDate = COALESCE(@ExpenseDate, ExpenseDate),
                Notes = @Notes,
                UpdatedAt = @Now
            WHERE ExpenseId = @ExpenseId
              AND TripId = @TripId;
        END
        ELSE
        BEGIN
            SET @SavedExpenseId = NEWID();

            INSERT INTO dbo.TripExpenses
            (
                ExpenseId, TripId, Description, Amount, Category,
                PaidByUserId, SplitType, ExpenseDate, Notes,
                CreatedBy, CreatedAt
            )
            VALUES
            (
                @SavedExpenseId, @TripId, @Description, @Amount,
                @Category, @PaidByUserId, @SplitType,
                COALESCE(@ExpenseDate, @Now), @Notes,
                @CreatedBy, @Now
            );
        END;

        DECLARE @CalculatedShares TABLE
        (
            UserId UNIQUEIDENTIFIER PRIMARY KEY,
            ShareAmount DECIMAL(19,2) NOT NULL
        );

        IF @SplitType = 'Equal'
        BEGIN
            DECLARE @ParticipantCount INT =
                (SELECT COUNT(*) FROM @Shares);

            DECLARE @TotalPaise BIGINT =
                CONVERT(BIGINT, @Amount * 100);

            DECLARE @BasePaise BIGINT =
                @TotalPaise / @ParticipantCount;

            DECLARE @Remainder BIGINT =
                @TotalPaise % @ParticipantCount;

            INSERT INTO @CalculatedShares (UserId, ShareAmount)
            SELECT
                UserId,
                CONVERT(DECIMAL(19,2),
                    (
                        @BasePaise +
                        CASE
                            WHEN ROW_NUMBER() OVER (ORDER BY UserId)
                                 <= @Remainder THEN 1
                            ELSE 0
                        END
                    ) / 100.0)
            FROM @Shares;
        END
        ELSE
        BEGIN
            INSERT INTO @CalculatedShares (UserId, ShareAmount)
            SELECT UserId, ShareAmount
            FROM @Shares;

            IF (SELECT SUM(ShareAmount) FROM @CalculatedShares) <> @Amount
                THROW 50013, 'Participant shares must equal the total expense amount.', 1;
        END;

        DELETE FROM dbo.TripExpenseSplits
        WHERE ExpenseId = @SavedExpenseId;

        INSERT INTO dbo.TripExpenseSplits
        (
            ExpenseSplitId, ExpenseId, UserId,
            ShareAmount, CreatedAt
        )
        SELECT
            NEWID(), @SavedExpenseId, UserId,
            ShareAmount, @Now
        FROM @CalculatedShares;

        COMMIT TRANSACTION;

        SELECT
            @SavedExpenseId AS ExpenseId,
            @TripId AS TripId,
            @SplitType AS SplitType,
            @Amount AS Amount,
            CASE WHEN @IsUpdate = 1 THEN 'Updated' ELSE 'Created' END AS Result;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 2. dbo.usp_GetTripExpenses
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Returns non-deleted expenses for a trip ordered by ExpenseDate DESC, CreatedAt DESC.
--
-- Parameters:
--   @TripId UNIQUEIDENTIFIER (Target trip)
--
-- Result Set (0..N rows):
--   ExpenseId        UNIQUEIDENTIFIER
--   TripId           UNIQUEIDENTIFIER
--   Description      NVARCHAR(200)
--   Amount           DECIMAL(19,2)
--   Category         NVARCHAR(50)
--   PaidByUserId     UNIQUEIDENTIFIER
--   PaidByName       NVARCHAR(150)
--   SplitType        NVARCHAR(20)
--   ExpenseDate      DATETIME2(0)
--   Notes            NVARCHAR(500)
--   CreatedBy        UNIQUEIDENTIFIER
--   CreatedAt        DATETIME2(7)
--   UpdatedAt        DATETIME2(7)
--   ParticipantCount INT
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_GetTripExpenses
    @TripId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        e.ExpenseId,
        e.TripId,
        e.Description,
        e.Amount,
        e.Category,
        e.PaidByUserId,
        payer.FullName AS PaidByName,
        e.SplitType,
        e.ExpenseDate,
        e.Notes,
        e.CreatedBy,
        e.CreatedAt,
        e.UpdatedAt,
        COALESCE(s.ParticipantCount, 0) AS ParticipantCount
    FROM dbo.TripExpenses e
    INNER JOIN dbo.Users payer
        ON payer.UserId = e.PaidByUserId
    OUTER APPLY
    (
        SELECT COUNT(*) AS ParticipantCount
        FROM dbo.TripExpenseSplits es
        WHERE es.ExpenseId = e.ExpenseId
    ) s
    WHERE e.TripId = @TripId
      AND e.IsDeleted = 0
    ORDER BY e.ExpenseDate DESC, e.CreatedAt DESC;
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 3. dbo.usp_GetTripExpenseById
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Returns a single non-deleted expense and its participant splits (2 result sets).
--
-- Parameters:
--   @TripId    UNIQUEIDENTIFIER
--   @ExpenseId UNIQUEIDENTIFIER
--
-- Result Set 1 (Header - 0 or 1 row):
--   ExpenseId    UNIQUEIDENTIFIER
--   TripId       UNIQUEIDENTIFIER
--   Description  NVARCHAR(200)
--   Amount       DECIMAL(19,2)
--   Category     NVARCHAR(50)
--   PaidByUserId UNIQUEIDENTIFIER
--   PaidByName   NVARCHAR(150)
--   SplitType    NVARCHAR(20)
--   ExpenseDate  DATETIME2(0)
--   Notes        NVARCHAR(500)
--   CreatedBy    UNIQUEIDENTIFIER
--   CreatedAt    DATETIME2(7)
--   UpdatedAt    DATETIME2(7)
--
-- Result Set 2 (Splits - 0..N rows):
--   ExpenseSplitId UNIQUEIDENTIFIER
--   ExpenseId      UNIQUEIDENTIFIER
--   UserId         UNIQUEIDENTIFIER
--   FullName       NVARCHAR(150)
--   Email          NVARCHAR(256)
--   ShareAmount    DECIMAL(19,2)
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_GetTripExpenseById
    @TripId UNIQUEIDENTIFIER,
    @ExpenseId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    -- Result Set 1: Expense Details
    SELECT
        e.ExpenseId,
        e.TripId,
        e.Description,
        e.Amount,
        e.Category,
        e.PaidByUserId,
        payer.FullName AS PaidByName,
        e.SplitType,
        e.ExpenseDate,
        e.Notes,
        e.CreatedBy,
        e.CreatedAt,
        e.UpdatedAt
    FROM dbo.TripExpenses e
    INNER JOIN dbo.Users payer
        ON payer.UserId = e.PaidByUserId
    WHERE e.TripId = @TripId
      AND e.ExpenseId = @ExpenseId
      AND e.IsDeleted = 0;

    -- Result Set 2: Split Breakdown
    SELECT
        es.ExpenseSplitId,
        es.ExpenseId,
        es.UserId,
        u.FullName,
        u.Email,
        es.ShareAmount
    FROM dbo.TripExpenseSplits es
    INNER JOIN dbo.Users u
        ON u.UserId = es.UserId
    INNER JOIN dbo.TripExpenses e
        ON e.ExpenseId = es.ExpenseId
    WHERE e.TripId = @TripId
      AND e.ExpenseId = @ExpenseId
      AND e.IsDeleted = 0
    ORDER BY u.FullName;
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 4. dbo.usp_DeleteTripExpense
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Soft deletes an expense by setting IsDeleted = 1 and DeletedAt = SYSUTCDATETIME().
--
-- Parameters:
--   @TripId    UNIQUEIDENTIFIER
--   @ExpenseId UNIQUEIDENTIFIER
--
-- Validation Rules & Error Codes:
--   50020: Expense not found or already deleted.
--
-- Result Set (1 row):
--   ExpenseId UNIQUEIDENTIFIER
--   Result    VARCHAR(7) ('Deleted')
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_DeleteTripExpense
(
    @TripId UNIQUEIDENTIFIER,
    @ExpenseId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.TripExpenses
        SET
            IsDeleted = 1,
            DeletedAt = SYSUTCDATETIME(),
            UpdatedAt = SYSUTCDATETIME()
        WHERE TripId = @TripId
          AND ExpenseId = @ExpenseId
          AND IsDeleted = 0;

        IF @@ROWCOUNT = 0
        BEGIN
            THROW 50020,
                'Expense not found or already deleted.',
                1;
        END;

        COMMIT TRANSACTION;

        SELECT
            @ExpenseId AS ExpenseId,
            'Deleted' AS Result;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        THROW;
    END CATCH;
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 5. dbo.usp_GetTripExpenseBalances
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Calculates running balances for all active trip members based on:
--     + TotalPaid (amount paid for expenses)
--     - TotalShares (share allocated to user)
--     + TotalSettlementSent (completed settlements sent)
--     - TotalSettlementReceived (completed settlements received)
--   NetBalance = TotalPaid - TotalShares + TotalSettlementSent - TotalSettlementReceived
--   Positive balance (> 0) means the member is owed money.
--   Negative balance (< 0) means the member owes money.
--
-- Parameters:
--   @TripId UNIQUEIDENTIFIER
--
-- Result Set (0..N rows):
--   UserId                  UNIQUEIDENTIFIER
--   FullName                NVARCHAR(150)
--   TotalPaid               DECIMAL(19,2)
--   TotalShares             DECIMAL(19,2)
--   TotalSettlementSent     DECIMAL(19,2)
--   TotalSettlementReceived DECIMAL(19,2)
--   NetBalance              DECIMAL(19,2)
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_GetTripExpenseBalances
    @TripId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH ActiveMembers AS
    (
        SELECT tm.UserId, u.FullName
        FROM dbo.TripMembers tm
        INNER JOIN dbo.Users u ON u.UserId = tm.UserId
        WHERE tm.TripId = @TripId
          AND tm.MemberStatus = 'Active'
    ),
    Paid AS
    (
        SELECT e.PaidByUserId AS UserId,
               SUM(e.Amount) AS TotalPaid
        FROM dbo.TripExpenses e
        WHERE e.TripId = @TripId
          AND e.IsDeleted = 0
        GROUP BY e.PaidByUserId
    ),
    Shares AS
    (
        SELECT es.UserId,
               SUM(es.ShareAmount) AS TotalShares
        FROM dbo.TripExpenseSplits es
        INNER JOIN dbo.TripExpenses e
            ON e.ExpenseId = es.ExpenseId
        WHERE e.TripId = @TripId
          AND e.IsDeleted = 0
        GROUP BY es.UserId
    ),
    Sent AS
    (
        SELECT PaidByUserId AS UserId,
               SUM(Amount) AS TotalSent
        FROM dbo.TripSettlements
        WHERE TripId = @TripId AND Status = 'Completed'
        GROUP BY PaidByUserId
    ),
    Received AS
    (
        SELECT ReceivedByUserId AS UserId,
               SUM(Amount) AS TotalReceived
        FROM dbo.TripSettlements
        WHERE TripId = @TripId AND Status = 'Completed'
        GROUP BY ReceivedByUserId
    )
    SELECT
        m.UserId,
        m.FullName,
        COALESCE(p.TotalPaid, 0) AS TotalPaid,
        COALESCE(s.TotalShares, 0) AS TotalShares,
        COALESCE(sent.TotalSent, 0) AS TotalSettlementSent,
        COALESCE(received.TotalReceived, 0) AS TotalSettlementReceived,
        COALESCE(p.TotalPaid, 0)
        - COALESCE(s.TotalShares, 0)
        + COALESCE(sent.TotalSent, 0)
        - COALESCE(received.TotalReceived, 0) AS NetBalance
    FROM ActiveMembers m
    LEFT JOIN Paid p ON p.UserId = m.UserId
    LEFT JOIN Shares s ON s.UserId = m.UserId
    LEFT JOIN Sent sent ON sent.UserId = m.UserId
    LEFT JOIN Received received ON received.UserId = m.UserId
    ORDER BY NetBalance DESC, m.FullName;
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 6. dbo.usp_GetSuggestedSettlements
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Computes simplified debt reconciliation transactions using a greedy balance-clearing loop.
--
-- Parameters:
--   @TripId UNIQUEIDENTIFIER
--
-- Result Set (0..N rows):
--   FromUserId UNIQUEIDENTIFIER (Debtor)
--   FromName   NVARCHAR(150)
--   ToUserId   UNIQUEIDENTIFIER (Creditor)
--   ToName     NVARCHAR(150)
--   Amount     DECIMAL(19,2)    (Settlement amount to transfer)
--
-- IMPORTANT CONTRACT NOTE / RUNTIME BUG IN LIVE PROCEDURE:
--   The live stored procedure has a column mismatch when populating its internal @Balances table:
--   Line 17:
--     INSERT INTO @Balances (UserId, FullName, Balance)
--     EXEC dbo.usp_GetTripExpenseBalances @TripId = @TripId;
--   `usp_GetTripExpenseBalances` returns 7 columns:
--     (UserId, FullName, TotalPaid, TotalShares, TotalSettlementSent, TotalSettlementReceived, NetBalance)
--   While @Balances expects only 3 columns:
--     (UserId, FullName, Balance)
--   This triggers SQL Server Error 213: "Column name or number of supplied values does not match table definition".
--   See SECTION 4 for full documentation and remediation.
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_GetSuggestedSettlements
    @TripId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Balances TABLE
    (
        UserId UNIQUEIDENTIFIER PRIMARY KEY,
        FullName NVARCHAR(150),
        Balance DECIMAL(19,2)
    );

    INSERT INTO @Balances (UserId, FullName, Balance)
    EXEC dbo.usp_GetTripExpenseBalances @TripId = @TripId;

    DECLARE @Suggested TABLE
    (
        FromUserId UNIQUEIDENTIFIER,
        FromName NVARCHAR(150),
        ToUserId UNIQUEIDENTIFIER,
        ToName NVARCHAR(150),
        Amount DECIMAL(19,2)
    );

    DECLARE @FromId UNIQUEIDENTIFIER,
            @FromName NVARCHAR(150),
            @FromBalance DECIMAL(19,2),
            @ToId UNIQUEIDENTIFIER,
            @ToName NVARCHAR(150),
            @ToBalance DECIMAL(19,2),
            @Transfer DECIMAL(19,2);

    WHILE EXISTS (SELECT 1 FROM @Balances WHERE Balance < -0.005)
    BEGIN
        SELECT TOP (1)
            @FromId = UserId,
            @FromName = FullName,
            @FromBalance = Balance
        FROM @Balances
        WHERE Balance < -0.005
        ORDER BY Balance ASC, UserId;

        SELECT TOP (1)
            @ToId = UserId,
            @ToName = FullName,
            @ToBalance = Balance
        FROM @Balances
        WHERE Balance > 0.005
        ORDER BY Balance DESC, UserId;

        IF @ToId IS NULL BREAK;

        SET @Transfer =
            CASE
                WHEN ABS(@FromBalance) < @ToBalance
                    THEN ABS(@FromBalance)
                ELSE @ToBalance
            END;

        INSERT INTO @Suggested
        VALUES (@FromId, @FromName, @ToId, @ToName, @Transfer);

        UPDATE @Balances
        SET Balance = Balance + @Transfer
        WHERE UserId = @FromId;

        UPDATE @Balances
        SET Balance = Balance - @Transfer
        WHERE UserId = @ToId;

        SET @FromId = NULL;
        SET @ToId = NULL;
    END;

    SELECT FromUserId, FromName, ToUserId, ToName, Amount
    FROM @Suggested
    ORDER BY FromName, ToName;
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 7. dbo.usp_CreateTripSettlement
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Creates a new payment record in 'Pending' status.
--
-- Parameters:
--   @TripId           UNIQUEIDENTIFIER        (Target trip)
--   @PaidByUserId     UNIQUEIDENTIFIER        (Payer / Debtor)
--   @ReceivedByUserId UNIQUEIDENTIFIER        (Payee / Creditor)
--   @Amount           DECIMAL(19,2)           (Settlement amount > 0)
--   @CreatedBy        UNIQUEIDENTIFIER        (Acting user recording payment)
--   @Notes            NVARCHAR(500) = NULL    (Optional note / UPI reference)
--   @SettlementId     UNIQUEIDENTIFIER = NULL (Optional specific ID, otherwise generated via NEWID())
--
-- Validation Rules & Error Codes:
--   50030: Settlement amount must be greater than zero.
--   50031: Sender and receiver must be different users.
--   50032: Sender is not an active member of this trip.
--   50033: Receiver is not an active member of this trip.
--   50034: Creator is not an active member of this trip.
--
-- Result Set (1 row):
--   SettlementId UNIQUEIDENTIFIER
--   Status       VARCHAR(7) ('Pending')
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_CreateTripSettlement
    @TripId UNIQUEIDENTIFIER,
    @PaidByUserId UNIQUEIDENTIFIER,
    @ReceivedByUserId UNIQUEIDENTIFIER,
    @Amount DECIMAL(19,2),
    @CreatedBy UNIQUEIDENTIFIER,
    @Notes NVARCHAR(500) = NULL,
    @SettlementId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @SettlementId = COALESCE(@SettlementId, NEWID());

    IF @Amount <= 0
        THROW 50030, 'Settlement amount must be greater than zero.', 1;

    IF @PaidByUserId = @ReceivedByUserId
        THROW 50031, 'Sender and receiver must be different users.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS
        (
            SELECT 1 FROM dbo.TripMembers
            WHERE TripId = @TripId
              AND UserId = @PaidByUserId
              AND MemberStatus = 'Active'
        )
            THROW 50032, 'Sender is not an active member of this trip.', 1;

        IF NOT EXISTS
        (
            SELECT 1 FROM dbo.TripMembers
            WHERE TripId = @TripId
              AND UserId = @ReceivedByUserId
              AND MemberStatus = 'Active'
        )
            THROW 50033, 'Receiver is not an active member of this trip.', 1;

        IF NOT EXISTS
        (
            SELECT 1 FROM dbo.TripMembers
            WHERE TripId = @TripId
              AND UserId = @CreatedBy
              AND MemberStatus = 'Active'
        )
            THROW 50034, 'Creator is not an active member of this trip.', 1;

        INSERT INTO dbo.TripSettlements
        (
            SettlementId, TripId, PaidByUserId,
            ReceivedByUserId, Amount, SettlementDate,
            Status, Notes, CreatedBy, CreatedAt
        )
        VALUES
        (
            @SettlementId, @TripId, @PaidByUserId,
            @ReceivedByUserId, @Amount, SYSUTCDATETIME(),
            'Pending', @Notes, @CreatedBy, SYSUTCDATETIME()
        );

        COMMIT TRANSACTION;

        SELECT @SettlementId AS SettlementId, 'Pending' AS Status;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 8. dbo.usp_GetTripSettlements
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Returns all settlement records for a trip ordered by SettlementDate DESC, CreatedAt DESC.
--
-- Parameters:
--   @TripId UNIQUEIDENTIFIER
--
-- Result Set (0..N rows):
--   SettlementId     UNIQUEIDENTIFIER
--   TripId           UNIQUEIDENTIFIER
--   PaidByUserId     UNIQUEIDENTIFIER
--   PaidByName       NVARCHAR(150)
--   ReceivedByUserId UNIQUEIDENTIFIER
--   ReceivedByName   NVARCHAR(150)
--   Amount           DECIMAL(19,2)
--   SettlementDate   DATETIME2(7)
--   Status           NVARCHAR(20)  ('Pending', 'Completed', 'Cancelled')
--   Notes            NVARCHAR(500)
--   CreatedBy        UNIQUEIDENTIFIER
--   CreatedAt        DATETIME2(7)
--   UpdatedAt        DATETIME2(7)
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_GetTripSettlements
    @TripId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        s.SettlementId,
        s.TripId,
        s.PaidByUserId,
        sender.FullName AS PaidByName,
        s.ReceivedByUserId,
        receiver.FullName AS ReceivedByName,
        s.Amount,
        s.SettlementDate,
        s.Status,
        s.Notes,
        s.CreatedBy,
        s.CreatedAt,
        s.UpdatedAt
    FROM dbo.TripSettlements s
    INNER JOIN dbo.Users sender
        ON sender.UserId = s.PaidByUserId
    INNER JOIN dbo.Users receiver
        ON receiver.UserId = s.ReceivedByUserId
    WHERE s.TripId = @TripId
    ORDER BY s.SettlementDate DESC, s.CreatedAt DESC;
END;
GO


-- ----------------------------------------------------------------------------------------------------
-- 9. dbo.usp_UpdateTripSettlementStatus
-- ----------------------------------------------------------------------------------------------------
-- Description:
--   Updates the status of a Pending settlement to either 'Completed' or 'Cancelled'.
--   Only transitions from 'Pending' are allowed. Once Completed or Cancelled, it cannot be changed.
--
-- Parameters:
--   @TripId       UNIQUEIDENTIFIER
--   @SettlementId UNIQUEIDENTIFIER
--   @Status       NVARCHAR(20) ('Completed' or 'Cancelled')
--
-- Validation Rules & Error Codes:
--   50040: Status must be Completed or Cancelled.
--   50041: Settlement not found or is no longer pending.
--
-- Result Set (1 row):
--   SettlementId UNIQUEIDENTIFIER
--   Status       NVARCHAR(20)
-- ----------------------------------------------------------------------------------------------------
CREATE OR ALTER PROCEDURE dbo.usp_UpdateTripSettlementStatus
    @TripId UNIQUEIDENTIFIER,
    @SettlementId UNIQUEIDENTIFIER,
    @Status NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Status NOT IN ('Completed', 'Cancelled')
        THROW 50040, 'Status must be Completed or Cancelled.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.TripSettlements WITH (UPDLOCK, HOLDLOCK)
        SET Status = @Status,
            UpdatedAt = SYSUTCDATETIME()
        WHERE SettlementId = @SettlementId
          AND TripId = @TripId
          AND Status = 'Pending';

        IF @@ROWCOUNT = 0
            THROW 50041, 'Settlement not found or is no longer pending.', 1;

        COMMIT TRANSACTION;

        SELECT @SettlementId AS SettlementId, @Status AS Status;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO


-- ====================================================================================================
-- SECTION 4: KNOWN CONTRACT MISMATCHES & RECOMMENDED FIX
-- ====================================================================================================
/*
MISMATCH IDENTIFIED:
  Target: dbo.usp_GetSuggestedSettlements (Line 17 in live definition)
  Code:
    DECLARE @Balances TABLE
    (
        UserId UNIQUEIDENTIFIER PRIMARY KEY,
        FullName NVARCHAR(150),
        Balance DECIMAL(19,2)
    );

    INSERT INTO @Balances (UserId, FullName, Balance)
    EXEC dbo.usp_GetTripExpenseBalances @TripId = @TripId;

  Root Cause:
    dbo.usp_GetTripExpenseBalances returns a 7-column result set:
      1. UserId (UNIQUEIDENTIFIER)
      2. FullName (NVARCHAR(150))
      3. TotalPaid (DECIMAL(19,2))
      4. TotalShares (DECIMAL(19,2))
      5. TotalSettlementSent (DECIMAL(19,2))
      6. TotalSettlementReceived (DECIMAL(19,2))
      7. NetBalance (DECIMAL(19,2))
    The INSERT INTO statement specifies only 3 target columns (UserId, FullName, Balance).
    In T-SQL, `INSERT INTO @Table EXEC proc` does not match columns by name; it matches strictly
    by ordinal position. This triggers:
      Msg 213: "Column name or number of supplied values does not match table definition."

REMEDIATION (When executing database updates):
  The staging table in dbo.usp_GetSuggestedSettlements must capture all 7 columns, or calculate
  NetBalance from the CTE directly. Example fix:

    DECLARE @BalancesRaw TABLE
    (
        UserId UNIQUEIDENTIFIER,
        FullName NVARCHAR(150),
        TotalPaid DECIMAL(19,2),
        TotalShares DECIMAL(19,2),
        TotalSettlementSent DECIMAL(19,2),
        TotalSettlementReceived DECIMAL(19,2),
        NetBalance DECIMAL(19,2)
    );

    INSERT INTO @BalancesRaw
    EXEC dbo.usp_GetTripExpenseBalances @TripId = @TripId;

    DECLARE @Balances TABLE
    (
        UserId UNIQUEIDENTIFIER PRIMARY KEY,
        FullName NVARCHAR(150),
        Balance DECIMAL(19,2)
    );

    INSERT INTO @Balances (UserId, FullName, Balance)
    SELECT UserId, FullName, NetBalance
    FROM @BalancesRaw;
*/

