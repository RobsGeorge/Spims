-- CreateTable
CREATE TABLE "WeekProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeekProgress_studentId_idx" ON "WeekProgress"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekProgress_studentId_weekId_key" ON "WeekProgress"("studentId", "weekId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicantId_programId_key" ON "Application"("applicantId", "programId");

-- AddForeignKey
ALTER TABLE "WeekProgress" ADD CONSTRAINT "WeekProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekProgress" ADD CONSTRAINT "WeekProgress_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE CASCADE ON UPDATE CASCADE;
