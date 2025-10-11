/*
  Warnings:

  - You are about to drop the `Author` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Book` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Book` DROP FOREIGN KEY `Book_authorId_fkey`;

-- DropTable
DROP TABLE `Author`;

-- DropTable
DROP TABLE `Book`;

-- CreateTable
CREATE TABLE `Truck` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `truckName` VARCHAR(191) NOT NULL,
    `capacityCuFt` DOUBLE NOT NULL,
    `maxWeightLbs` DOUBLE NOT NULL,
    `lengthFt` DOUBLE NOT NULL,
    `widthFt` DOUBLE NOT NULL,
    `heightFt` DOUBLE NOT NULL,
    `truckType` ENUM('SMALL', 'MEDIUM', 'LARGE', 'HEAVY_DUTY') NOT NULL,
    `color` VARCHAR(191) NULL,
    `yearOfManufacture` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `currentStatus` ENUM('AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'UNAVAILABLE') NOT NULL DEFAULT 'AVAILABLE',
    `restrictedLoadTypes` JSON NULL,
    `gpsEnabled` BOOLEAN NOT NULL DEFAULT true,
    `lastKnownLat` DOUBLE NULL,
    `lastKnownLng` DOUBLE NULL,
    `driverId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Truck_truckName_key`(`truckName`),
    UNIQUE INDEX `Truck_driverId_key`(`driverId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Driver` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `licenseNo` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Driver_licenseNo_key`(`licenseNo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `placeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NOT NULL,
    `longitude` DOUBLE NOT NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `isSaved` BOOLEAN NOT NULL DEFAULT false,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Location_placeId_key`(`placeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `actionType` ENUM('PICKUP', 'DROPOFF') NOT NULL,
    `locationId` INTEGER NULL,
    `priority` INTEGER NOT NULL DEFAULT 1,
    `earliestTime` DATETIME(3) NULL,
    `latestTime` DATETIME(3) NULL,
    `serviceMinutes` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `largeTruckOnly` BOOLEAN NOT NULL DEFAULT false,
    `curfewFlag` BOOLEAN NOT NULL DEFAULT false,
    `assignedTruckId` INTEGER NULL,
    `assignedDriverId` INTEGER NULL,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `isFiction` BOOLEAN NOT NULL DEFAULT false,
    `datePublished` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Truck` ADD CONSTRAINT `Truck_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_locationId_fkey` FOREIGN KEY (`locationId`) REFERENCES `Location`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_assignedTruckId_fkey` FOREIGN KEY (`assignedTruckId`) REFERENCES `Truck`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_assignedDriverId_fkey` FOREIGN KEY (`assignedDriverId`) REFERENCES `Driver`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
