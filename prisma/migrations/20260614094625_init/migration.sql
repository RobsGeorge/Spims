-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('SUPER_ADMIN', 'ADMINISTRATIVE_ADMIN', 'ACADEMIC_ADMIN', 'FINANCIAL_ADMIN', 'INSTRUCTOR', 'TA', 'STUDENT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TranslationSource" AS ENUM ('AI', 'HUMAN');

-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('DIPLOMA', 'CERTIFICATE', 'DEGREE');

-- CreateEnum
CREATE TYPE "RequirementType" AS ENUM ('REQUIRED', 'ELECTIVE');

-- CreateEnum
CREATE TYPE "OfferingMode" AS ENUM ('COHORT', 'SELF_PACED');

-- CreateEnum
CREATE TYPE "OfferingStaffRole" AS ENUM ('INSTRUCTOR', 'TA');

-- CreateEnum
CREATE TYPE "OfferingStatus" AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ContentItemType" AS ENUM ('VIDEO', 'READING', 'TEXT', 'ASSIGNMENT', 'QUIZ', 'EXAM', 'DISCUSSION');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('FILE', 'TEXT', 'BOTH');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ_SINGLE', 'MCQ_MULTI', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'MATCHING', 'FILL_BLANK', 'NUMERIC', 'ORDERING', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "AssessmentMode" AS ENUM ('QUIZ', 'EXAM');

-- CreateEnum
CREATE TYPE "ScoringRule" AS ENUM ('HIGHEST', 'LATEST', 'AVERAGE');

-- CreateEnum
CREATE TYPE "ResultsVisibility" AS ENUM ('IMMEDIATE', 'AFTER_CLOSE', 'ON_RELEASE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "ComponentKind" AS ENUM ('ASSIGNMENT', 'QUIZ', 'EXAM', 'ATTENDANCE', 'DISCUSSION', 'OTHER');

-- CreateEnum
CREATE TYPE "GradeType" AS ENUM ('STANDARD', 'WITHDRAWAL', 'PASS_FAIL', 'AUDIT', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ENROLLED', 'WAITLISTED', 'DROPPED', 'WITHDRAWN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "GradeStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'LOCKED');

-- CreateEnum
CREATE TYPE "StudentProgramStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "AttendanceSource" AS ENUM ('ZOOM_IMPORT', 'MANUAL');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLISTED');

-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'SELECT', 'MULTISELECT', 'FILE', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EGP', 'USD');

-- CreateEnum
CREATE TYPE "WalletKind" AS ENUM ('MONEY', 'POINTS');

-- CreateEnum
CREATE TYPE "LedgerDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerReason" AS ENUM ('TOPUP', 'REFUND', 'PAYMENT', 'DONATION', 'ADMIN_GRANT', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAYPAL', 'PAYMOB', 'CASHIER', 'WALLET_MONEY', 'WALLET_POINTS', 'MANUAL_CASH', 'MANUAL_TRANSFER', 'MANUAL_CHEQUE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PENDING_VERIFICATION', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PARTIAL', 'PAID', 'VOID', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('TRANSCRIPT', 'PROGRAM_CERTIFICATE', 'STANDALONE_CERTIFICATE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "ThreadVisibility" AS ENUM ('OPEN', 'PRIVATE_TO_INSTRUCTOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "preferredLocale" TEXT NOT NULL DEFAULT 'en',
    "themePreference" "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
    "countryCode" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "isReviewer" BOOLEAN NOT NULL DEFAULT false,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRtl" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" "TranslationSource" NOT NULL DEFAULT 'HUMAN',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradingScheme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradingScheme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeBand" (
    "id" TEXT NOT NULL,
    "schemeId" TEXT NOT NULL,
    "letter" TEXT NOT NULL,
    "minPercent" DOUBLE PRECISION NOT NULL,
    "maxPercent" DOUBLE PRECISION NOT NULL,
    "gpaPoints" DOUBLE PRECISION NOT NULL,
    "isPassing" BOOLEAN NOT NULL,

    CONSTRAINT "GradeBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplateComponent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "kind" "ComponentKind" NOT NULL,

    CONSTRAINT "AssessmentTemplateComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProgramType" NOT NULL,
    "passingThreshold" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "maxCreditsPerSemester" INTEGER NOT NULL,
    "maxCoursesPerSemester" INTEGER NOT NULL,
    "maxSemestersToGraduate" INTEGER NOT NULL,
    "electiveCreditsRequired" INTEGER NOT NULL DEFAULT 0,
    "signatoryName" TEXT,
    "signatoryTitle" TEXT,
    "gradingSchemeId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "creditHours" INTEGER NOT NULL,
    "defaultPriceUsd" INTEGER NOT NULL DEFAULT 0,
    "defaultPriceEgp" INTEGER NOT NULL DEFAULT 0,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isStandalone" BOOLEAN NOT NULL DEFAULT false,
    "passingThreshold" DOUBLE PRECISION,
    "assessmentTemplateId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePrerequisite" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,

    CONSTRAINT "CoursePrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramCourse" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "requirement" "RequirementType" NOT NULL,
    "yearLevel" INTEGER,

    CONSTRAINT "ProgramCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Semester" (
    "id" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "registrationStart" TIMESTAMP(3) NOT NULL,
    "registrationEnd" TIMESTAMP(3) NOT NULL,
    "addDropEndWeek" INTEGER NOT NULL,
    "lastWithdrawalWeek" INTEGER NOT NULL,
    "withdrawalRefundPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "OfferingStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Semester_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseOffering" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "semesterId" TEXT,
    "mode" "OfferingMode" NOT NULL DEFAULT 'COHORT',
    "priceUsdOverride" INTEGER,
    "priceEgpOverride" INTEGER,
    "seatCapacity" INTEGER,
    "attendanceThresholdPercent" DOUBLE PRECISION NOT NULL DEFAULT 60,
    "status" "OfferingStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "CourseOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferingStaff" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OfferingStaffRole" NOT NULL,

    CONSTRAINT "OfferingStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Week" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "unlockDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentItem" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "type" "ContentItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "vimeoId" TEXT,
    "fileUrl" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "contentItemId" TEXT NOT NULL,
    "componentId" TEXT,
    "instructions" TEXT NOT NULL,
    "submissionType" "SubmissionType" NOT NULL DEFAULT 'BOTH',
    "allowedFileTypes" TEXT[],
    "maxPoints" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "dueDate" TIMESTAMP(3),
    "latePenaltyOverride" DOUBLE PRECISION,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "textBody" TEXT,
    "fileUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "rawScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionRecurrence" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "startTime" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SessionRecurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "zoomMeetingId" TEXT,
    "zoomJoinUrl" TEXT,
    "zoomStartUrl" TEXT,
    "recordingUrl" TEXT,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "minutesAttended" INTEGER NOT NULL DEFAULT 0,
    "source" "AttendanceSource" NOT NULL DEFAULT 'ZOOM_IMPORT',
    "overriddenById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBank" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "QuestionBank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "points" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "config" JSONB,
    "aiKeyPoints" TEXT,
    "aiGuidance" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "matchKey" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "contentItemId" TEXT,
    "componentId" TEXT,
    "mode" "AssessmentMode" NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "timeLimitMinutes" INTEGER,
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 1,
    "scoringRule" "ScoringRule" NOT NULL DEFAULT 'HIGHEST',
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
    "drawFromBankId" TEXT,
    "questionsToDraw" INTEGER,
    "resultsVisibility" "ResultsVisibility" NOT NULL DEFAULT 'ON_RELEASE',
    "revealAnswers" BOOLEAN NOT NULL DEFAULT false,
    "enforceFullScreen" BOOLEAN NOT NULL DEFAULT false,
    "oneAtATime" BOOLEAN NOT NULL DEFAULT false,
    "noBacktrack" BOOLEAN NOT NULL DEFAULT false,
    "logFocusLoss" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentQuestion" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "pointsOverride" DOUBLE PRECISION,

    CONSTRAINT "AssessmentQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "attemptNo" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DOUBLE PRECISION,
    "focusLossCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "response" JSONB,
    "autoScore" DOUBLE PRECISION,
    "aiSuggestedScore" DOUBLE PRECISION,
    "aiRationale" TEXT,
    "finalScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradebookComponent" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightPercent" DOUBLE PRECISION NOT NULL,
    "kind" "ComponentKind" NOT NULL,

    CONSTRAINT "GradebookComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "studentProgramId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ENROLLED',
    "isAudit" BOOLEAN NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "droppedAt" TIMESTAMP(3),
    "gradeType" "GradeType" NOT NULL DEFAULT 'IN_PROGRESS',
    "finalPercent" DOUBLE PRECISION,
    "finalLetter" TEXT,
    "finalGpaPoints" DOUBLE PRECISION,
    "gradeStatus" "GradeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "gradeLockedById" TEXT,
    "gradeLockedAt" TIMESTAMP(3),
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProgram" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "status" "StudentProgramStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cachedGpa" DOUBLE PRECISION,

    CONSTRAINT "StudentProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "enrollmentId" TEXT,
    "letterGrade" TEXT NOT NULL,
    "percent" DOUBLE PRECISION NOT NULL,
    "gpaPoints" DOUBLE PRECISION NOT NULL,
    "creditHours" INTEGER NOT NULL,
    "term" TEXT NOT NULL,
    "isPassing" BOOLEAN NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AcademicRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramRequirementFulfillment" (
    "id" TEXT NOT NULL,
    "studentProgramId" TEXT NOT NULL,
    "programCourseId" TEXT NOT NULL,
    "academicRecordId" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramRequirementFulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseInterestFlag" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseInterestFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "programId" TEXT,
    "offeringId" TEXT,
    "serial" TEXT NOT NULL,
    "qrToken" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "signatoryName" TEXT,
    "signatoryTitle" TEXT,
    "fileUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationForm" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ApplicationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFormField" (
    "id" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "options" TEXT[],
    "allowedFileTypes" TEXT[],
    "adminNote" TEXT,

    CONSTRAINT "ApplicationFormField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewerId" TEXT,
    "decisionNote" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationFieldValue" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT,
    "fileUrl" TEXT,

    CONSTRAINT "ApplicationFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "offeringId" TEXT,
    "amountMinor" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "currency" "Currency" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "gatewayRef" TEXT,
    "proofUrl" TEXT,
    "recordedById" TEXT,
    "verifiedById" TEXT,
    "receiptSerial" TEXT,
    "receiptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "egpMoneyMinor" INTEGER NOT NULL DEFAULT 0,
    "usdMoneyMinor" INTEGER NOT NULL DEFAULT 0,
    "egpPointsMinor" INTEGER NOT NULL DEFAULT 0,
    "usdPointsMinor" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WalletAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "kind" "WalletKind" NOT NULL,
    "direction" "LedgerDirection" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "reason" "LedgerReason" NOT NULL,
    "relatedPaymentId" TEXT,
    "relatedInvoiceId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "kind" "WalletKind" NOT NULL DEFAULT 'MONEY',
    "designation" TEXT,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "enrollmentId" TEXT,
    "studentId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "asPoints" BOOLEAN NOT NULL DEFAULT false,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "metadata" JSONB,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionBoard" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "allowStudentThreads" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DiscussionBoard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionThread" (
    "id" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "visibility" "ThreadVisibility" NOT NULL DEFAULT 'OPEN',
    "isGraded" BOOLEAN NOT NULL DEFAULT false,
    "participationMinWords" INTEGER,
    "participationMinPosts" INTEGER,
    "participationMinReplies" INTEGER,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscussionThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentPostId" TEXT,
    "body" TEXT NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionGrade" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "autoScore" DOUBLE PRECISION,
    "finalScore" DOUBLE PRECISION,
    "overridden" BOOLEAN NOT NULL DEFAULT false,
    "feedback" TEXT,
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "DiscussionGrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "siteName" TEXT NOT NULL DEFAULT 'Spims',
    "logoLightUrl" TEXT,
    "logoDarkUrl" TEXT,
    "faviconUrl" TEXT,
    "tokens" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Translation_entityType_entityId_idx" ON "Translation"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Translation_entityType_entityId_field_locale_key" ON "Translation"("entityType", "entityId", "field", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "Program_code_key" ON "Program"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Course_code_key" ON "Course"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePrerequisite_courseId_prerequisiteId_key" ON "CoursePrerequisite"("courseId", "prerequisiteId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramCourse_programId_courseId_key" ON "ProgramCourse"("programId", "courseId");

-- CreateIndex
CREATE INDEX "CourseOffering_courseId_idx" ON "CourseOffering"("courseId");

-- CreateIndex
CREATE INDEX "CourseOffering_semesterId_idx" ON "CourseOffering"("semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferingStaff_offeringId_userId_role_key" ON "OfferingStaff"("offeringId", "userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Week_offeringId_number_key" ON "Week"("offeringId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_contentItemId_key" ON "Assignment"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_studentId_key" ON "AssignmentSubmission"("assignmentId", "studentId");

-- CreateIndex
CREATE INDEX "LiveSession_offeringId_scheduledStart_idx" ON "LiveSession"("offeringId", "scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_liveSessionId_studentId_key" ON "AttendanceRecord"("liveSessionId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_contentItemId_key" ON "Assessment"("contentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentQuestion_assessmentId_questionId_key" ON "AssessmentQuestion"("assessmentId", "questionId");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_status_idx" ON "AssessmentAttempt"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_assessmentId_studentId_attemptNo_key" ON "AssessmentAttempt"("assessmentId", "studentId", "attemptNo");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswer_attemptId_questionId_key" ON "AttemptAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_studentId_offeringId_key" ON "Enrollment"("studentId", "offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProgram_studentId_programId_key" ON "StudentProgram"("studentId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicRecord_enrollmentId_key" ON "AcademicRecord"("enrollmentId");

-- CreateIndex
CREATE INDEX "AcademicRecord_studentId_courseId_idx" ON "AcademicRecord"("studentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramRequirementFulfillment_studentProgramId_programCours_key" ON "ProgramRequirementFulfillment"("studentProgramId", "programCourseId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseInterestFlag_studentId_courseId_key" ON "CourseInterestFlag"("studentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_serial_key" ON "Credential"("serial");

-- CreateIndex
CREATE UNIQUE INDEX "Credential_qrToken_key" ON "Credential"("qrToken");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationFieldValue_applicationId_fieldId_key" ON "ApplicationFieldValue"("applicationId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptSerial_key" ON "Payment"("receiptSerial");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAccount_userId_key" ON "WalletAccount"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_currency_kind_idx" ON "WalletTransaction"("walletId", "currency", "kind");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionBoard_offeringId_key" ON "DiscussionBoard"("offeringId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscussionGrade_threadId_studentId_key" ON "DiscussionGrade"("threadId", "studentId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpToken" ADD CONSTRAINT "OtpToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeBand" ADD CONSTRAINT "GradeBand_schemeId_fkey" FOREIGN KEY ("schemeId") REFERENCES "GradingScheme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentTemplateComponent" ADD CONSTRAINT "AssessmentTemplateComponent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AssessmentTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_gradingSchemeId_fkey" FOREIGN KEY ("gradingSchemeId") REFERENCES "GradingScheme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_assessmentTemplateId_fkey" FOREIGN KEY ("assessmentTemplateId") REFERENCES "AssessmentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePrerequisite" ADD CONSTRAINT "CoursePrerequisite_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramCourse" ADD CONSTRAINT "ProgramCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseOffering" ADD CONSTRAINT "CourseOffering_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingStaff" ADD CONSTRAINT "OfferingStaff_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferingStaff" ADD CONSTRAINT "OfferingStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Week" ADD CONSTRAINT "Week_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentItem" ADD CONSTRAINT "ContentItem_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "GradebookComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionRecurrence" ADD CONSTRAINT "SessionRecurrence_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBank" ADD CONSTRAINT "QuestionBank_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "QuestionBank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_contentItemId_fkey" FOREIGN KEY ("contentItemId") REFERENCES "ContentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "GradebookComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentQuestion" ADD CONSTRAINT "AssessmentQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "AssessmentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradebookComponent" ADD CONSTRAINT "GradebookComponent_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentProgramId_fkey" FOREIGN KEY ("studentProgramId") REFERENCES "StudentProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgram" ADD CONSTRAINT "StudentProgram_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProgram" ADD CONSTRAINT "StudentProgram_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicRecord" ADD CONSTRAINT "AcademicRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicRecord" ADD CONSTRAINT "AcademicRecord_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicRecord" ADD CONSTRAINT "AcademicRecord_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRequirementFulfillment" ADD CONSTRAINT "ProgramRequirementFulfillment_studentProgramId_fkey" FOREIGN KEY ("studentProgramId") REFERENCES "StudentProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRequirementFulfillment" ADD CONSTRAINT "ProgramRequirementFulfillment_programCourseId_fkey" FOREIGN KEY ("programCourseId") REFERENCES "ProgramCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRequirementFulfillment" ADD CONSTRAINT "ProgramRequirementFulfillment_academicRecordId_fkey" FOREIGN KEY ("academicRecordId") REFERENCES "AcademicRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseInterestFlag" ADD CONSTRAINT "CourseInterestFlag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseInterestFlag" ADD CONSTRAINT "CourseInterestFlag_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationForm" ADD CONSTRAINT "ApplicationForm_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFormField" ADD CONSTRAINT "ApplicationFormField_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ApplicationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_formId_fkey" FOREIGN KEY ("formId") REFERENCES "ApplicationForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFieldValue" ADD CONSTRAINT "ApplicationFieldValue_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationFieldValue" ADD CONSTRAINT "ApplicationFieldValue_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "ApplicationFormField"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletAccount" ADD CONSTRAINT "WalletAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "WalletAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionBoard" ADD CONSTRAINT "DiscussionBoard_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionThread" ADD CONSTRAINT "DiscussionThread_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "DiscussionBoard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DiscussionThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionPost" ADD CONSTRAINT "DiscussionPost_parentPostId_fkey" FOREIGN KEY ("parentPostId") REFERENCES "DiscussionPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionGrade" ADD CONSTRAINT "DiscussionGrade_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DiscussionThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionGrade" ADD CONSTRAINT "DiscussionGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
