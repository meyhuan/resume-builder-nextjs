CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');
CREATE TABLE "Article" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'career-guide',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");
CREATE INDEX "Article_status_createdAt_idx" ON "Article"("status", "createdAt");
-- Table Editor writes bypass Prisma's @updatedAt. Keep sitemap dates accurate.
CREATE FUNCTION update_article_timestamp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER article_updated_at BEFORE UPDATE ON "Article"
  FOR EACH ROW EXECUTE FUNCTION update_article_timestamp();
-- Access is via the server's database role, never the public Supabase client.
ALTER TABLE "Article" ENABLE ROW LEVEL SECURITY;
