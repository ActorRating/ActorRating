-- OAuth (Google) users have no local password; credentials users keep a bcrypt hash.
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;
