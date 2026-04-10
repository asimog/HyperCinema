-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Job" (
    "jobId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "requestKind" TEXT,
    "pricingMode" TEXT DEFAULT 'legacy',
    "visibility" TEXT DEFAULT 'public',
    "experience" TEXT,
    "moderationStatus" TEXT DEFAULT 'visible',
    "creatorId" TEXT,
    "creatorEmail" TEXT,
    "subjectAddress" TEXT,
    "subjectChain" TEXT,
    "subjectName" TEXT,
    "subjectSymbol" TEXT,
    "subjectImage" TEXT,
    "subjectDescription" TEXT,
    "sourceMediaUrl" TEXT,
    "sourceEmbedUrl" TEXT,
    "sourceMediaProvider" TEXT,
    "sourceTranscript" TEXT,
    "stylePreset" TEXT,
    "requestedPrompt" TEXT,
    "audioEnabled" BOOLEAN,
    "packageType" TEXT NOT NULL,
    "rangeDays" INTEGER NOT NULL,
    "priceSol" DOUBLE PRECISION NOT NULL,
    "priceUsdc" DOUBLE PRECISION,
    "videoSeconds" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "progress" TEXT NOT NULL,
    "txSignature" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "paymentMethod" TEXT,
    "paymentCurrency" TEXT,
    "paymentNetwork" TEXT DEFAULT 'solana',
    "x402Transaction" TEXT,
    "discountCode" TEXT,
    "paymentWaived" BOOLEAN NOT NULL DEFAULT false,
    "paymentAddress" TEXT NOT NULL,
    "paymentIndex" INTEGER,
    "paymentRouting" TEXT NOT NULL,
    "requiredLamports" BIGINT NOT NULL,
    "receivedLamports" BIGINT NOT NULL DEFAULT 0,
    "paymentSignatures" JSONB,
    "lastPaymentAt" TIMESTAMP(3),
    "sweepStatus" TEXT NOT NULL DEFAULT 'pending',
    "sweepSignature" TEXT,
    "sweptLamports" BIGINT NOT NULL DEFAULT 0,
    "lastSweepAt" TIMESTAMP(3),
    "sweepError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("jobId")
);

-- CreateTable
CREATE TABLE "Report" (
    "jobId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "rangeDays" INTEGER NOT NULL,
    "subjectKind" TEXT,
    "pricingMode" TEXT,
    "visibility" TEXT,
    "experience" TEXT,
    "moderationStatus" TEXT,
    "creatorId" TEXT,
    "creatorEmail" TEXT,
    "subjectAddress" TEXT,
    "subjectChain" TEXT,
    "subjectName" TEXT,
    "subjectSymbol" TEXT,
    "subjectImage" TEXT,
    "subjectDescription" TEXT,
    "sourceMediaUrl" TEXT,
    "sourceEmbedUrl" TEXT,
    "sourceMediaProvider" TEXT,
    "sourceTranscript" TEXT,
    "sourceReference" JSONB,
    "stylePreset" TEXT,
    "styleLabel" TEXT,
    "durationSeconds" INTEGER,
    "audioEnabled" BOOLEAN,
    "storyCards" JSONB,
    "continuationPrompt" TEXT,
    "tokenLinks" JSONB,
    "marketSnapshot" JSONB,
    "pumpTokensTraded" INTEGER NOT NULL DEFAULT 0,
    "buyCount" INTEGER NOT NULL DEFAULT 0,
    "sellCount" INTEGER NOT NULL DEFAULT 0,
    "solSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "solReceived" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedPnlSol" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestTrade" TEXT NOT NULL DEFAULT '',
    "worstTrade" TEXT NOT NULL DEFAULT '',
    "styleClassification" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "timeline" JSONB,
    "downloadUrl" TEXT,
    "walletPersonality" TEXT,
    "walletSecondaryPersonality" TEXT,
    "walletModifiers" JSONB,
    "behaviorPatterns" JSONB,
    "memorableMoments" JSONB,
    "funObservations" JSONB,
    "narrativeSummary" TEXT,
    "storyBeats" JSONB,
    "keyEvents" JSONB,
    "walletProfile" JSONB,
    "analysisV2" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("jobId")
);

-- CreateTable
CREATE TABLE "Video" (
    "jobId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "renderStatus" TEXT NOT NULL DEFAULT 'queued',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("jobId")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origin" TEXT NOT NULL DEFAULT 'admin',
    "label" TEXT,
    "issuedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "usedByJobId" TEXT,
    "usedByAction" TEXT,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "JobDispatchOutbox" (
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL,
    "lockUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "dispatchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobDispatchOutbox_pkey" PRIMARY KEY ("jobId")
);

-- CreateTable
CREATE TABLE "VideoRender" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "renderStatus" TEXT NOT NULL DEFAULT 'queued',
    "videoUrl" TEXT,
    "thumbnailUrl" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRender_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PumpMetadataCache" (
    "mint" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PumpMetadataCache_pkey" PRIMARY KEY ("mint")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCode" (
    "code" TEXT NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountSol" DOUBLE PRECISION,
    "discountUsdc" DOUBLE PRECISION,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "PromoCodeUse" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "jobId" TEXT,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedBy" TEXT,

    CONSTRAINT "PromoCodeUse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoltbookPublication" (
    "jobId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moltbookUrl" TEXT,
    "moltbookId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'published',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoltbookPublication_pkey" PRIMARY KEY ("jobId")
);

-- CreateTable
CREATE TABLE "MoltbookAgentState" (
    "id" TEXT NOT NULL DEFAULT 'mythxmythx',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoltbookAgentState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InferenceConfig" (
    "id" TEXT NOT NULL DEFAULT 'inference_config',
    "textProvider" TEXT,
    "textModel" TEXT,
    "textApiKey" TEXT,
    "textBaseUrl" TEXT,
    "videoProvider" TEXT,
    "videoModel" TEXT,
    "videoApiKey" TEXT,
    "videoBaseUrl" TEXT,
    "openrouterApiKey" TEXT,
    "openrouterModel" TEXT,
    "openrouterBaseUrl" TEXT,
    "xaiApiKey" TEXT,
    "xaiModel" TEXT,
    "xaiBaseUrl" TEXT,
    "falApiKey" TEXT,
    "falBaseUrl" TEXT,
    "huggingfaceApiKey" TEXT,
    "huggingfaceBaseUrl" TEXT,
    "ollamaBaseUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InferenceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCounter" (
    "id" TEXT NOT NULL DEFAULT 'payment_counter',
    "nextIndex" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_wallet_idx" ON "Job"("wallet");

-- CreateIndex
CREATE INDEX "Job_creatorId_idx" ON "Job"("creatorId");

-- CreateIndex
CREATE INDEX "Job_paymentAddress_idx" ON "Job"("paymentAddress");

-- CreateIndex
CREATE INDEX "Job_paymentRouting_sweepStatus_idx" ON "Job"("paymentRouting", "sweepStatus");

-- CreateIndex
CREATE INDEX "Job_status_createdAt_idx" ON "Job"("status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "JobDispatchOutbox_status_nextAttemptAt_idx" ON "JobDispatchOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRender_jobId_key" ON "VideoRender"("jobId");

-- CreateIndex
CREATE INDEX "VideoRender_status_idx" ON "VideoRender"("status");

-- CreateIndex
CREATE INDEX "RateLimit_windowEnd_idx" ON "RateLimit"("windowEnd");

-- CreateIndex
CREATE INDEX "PromoCode_isActive_idx" ON "PromoCode"("isActive");

-- CreateIndex
CREATE INDEX "PromoCodeUse_code_usedAt_idx" ON "PromoCodeUse"("code", "usedAt" DESC);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRender" ADD CONSTRAINT "VideoRender_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("jobId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeUse" ADD CONSTRAINT "PromoCodeUse_code_fkey" FOREIGN KEY ("code") REFERENCES "PromoCode"("code") ON DELETE CASCADE ON UPDATE CASCADE;

