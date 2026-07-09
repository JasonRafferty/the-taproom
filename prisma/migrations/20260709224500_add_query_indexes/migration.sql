-- Common board, home, and modal query paths.
CREATE INDEX "Card_boardType_archived_createdAt_idx" ON "Card"("boardType", "archived", "createdAt");
CREATE INDEX "Card_assigneeId_archived_idx" ON "Card"("assigneeId", "archived");
CREATE INDEX "Card_dueDate_idx" ON "Card"("dueDate");
CREATE INDEX "Card_updatedAt_idx" ON "Card"("updatedAt");
CREATE INDEX "Comment_cardId_createdAt_idx" ON "Comment"("cardId", "createdAt");
CREATE INDEX "Link_createdAt_idx" ON "Link"("createdAt");
CREATE INDEX "Decision_status_createdAt_idx" ON "Decision"("status", "createdAt");
