-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "trackAsMachine" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trackQuantity" BOOLEAN NOT NULL DEFAULT false;
