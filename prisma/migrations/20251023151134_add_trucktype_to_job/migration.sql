-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "truckType" "TruckType" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "truckType" "TruckType" NOT NULL DEFAULT 'MEDIUM';
