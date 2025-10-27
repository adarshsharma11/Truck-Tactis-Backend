-- CreateEnum
CREATE TYPE "ContactRole" AS ENUM ('DRIVER', 'FOREMAN', 'MECHANIC', 'MANAGER', 'OTHER');

-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "description" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "role" "ContactRole" NOT NULL DEFAULT 'DRIVER',
ALTER COLUMN "licenseNo" DROP NOT NULL;
