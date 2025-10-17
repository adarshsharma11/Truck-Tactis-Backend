import { db } from '../src/utils/db.server';
import { hashPassword } from '../src/utils/bcryptHandler';
import { v4 as uuidv4 } from 'uuid';

async function getUser() {
  const password = 'admin';
  const hashedPassword = await hashPassword(password);
  return {
    id: uuidv4(),
    fullName: 'John Doe',
    username: 'admin',
    password: hashedPassword,
    email: 'email@company.com',
    updatedAt: new Date(),
    createdAt: new Date(),
  };
}

async function seed() {
  try {
    console.log('Deleting old records...');
    await db.job.deleteMany();
    await db.truck.deleteMany();
    await db.driver.deleteMany();
    await db.location.deleteMany();
    await db.user.deleteMany();
    console.log('Old records deleted.');

    // Seed User
    const user = await getUser();
    await db.user.create({ data: user });
    console.log(`✅ Seeded User: ${user.username}`);

    // Seed Drivers
    const driver1 = await db.driver.create({
      data: { name: 'John Doe', licenseNo: 'ABC12345', phone: '1234567890' },
    });

    const driver2 = await db.driver.create({
      data: { name: 'Jane Smith', licenseNo: 'XYZ67890', phone: '9876543210' },
    });

    console.log('✅ Seeded Drivers');

    // Seed Trucks
    await db.truck.createMany({
      data: [
        {
          truckName: 'Truck 1',
          capacityCuFt: 1000,
          maxWeightLbs: 2000,
          lengthFt: 20,
          widthFt: 8,
          heightFt: 10,
          truckType: 'MEDIUM',
          driverId: driver1.id,
        },
        {
          truckName: 'Truck 2',
          capacityCuFt: 2000,
          maxWeightLbs: 4000,
          lengthFt: 30,
          widthFt: 8,
          heightFt: 12,
          truckType: 'LARGE',
          driverId: driver2.id,
        },
      ],
    });

    console.log('✅ Seeded Trucks');

    // Seed Locations
    await db.location.createMany({
      data: [
        {
          placeId: 'loc1',
          name: 'Warehouse A',
          address: '123 Main St',
          latitude: 40.7128,
          longitude: -74.006,
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001',
          createdById: user.id,
        },
        {
          placeId: 'loc2',
          name: 'Warehouse B',
          address: '456 Market St',
          latitude: 34.0522,
          longitude: -118.2437,
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA',
          postalCode: '90001',
          createdById: user.id,
        },
      ],
    });

    console.log('✅ Seeded Locations');

    // Seed Jobs
    const trucks = await db.truck.findMany();
    const drivers = await db.driver.findMany();
    const locations = await db.location.findMany();

    await db.job.createMany({
      data: [
        {
          title: 'Pickup Job 1',
          actionType: 'PICKUP',
          locationId: locations[0].id,
          priority: 1,
          earliestTime: new Date(),
          latestTime: new Date(Date.now() + 3600 * 1000), // 1 hour later
          serviceMinutes: 30,
          assignedTruckId: trucks[0].id,
          assignedDriverId: drivers[0].id,
        },
        {
          title: 'Dropoff Job 1',
          actionType: 'DROPOFF',
          locationId: locations[1].id,
          priority: 2,
          earliestTime: new Date(),
          latestTime: new Date(Date.now() + 7200 * 1000), // 2 hours later
          serviceMinutes: 45,
          assignedTruckId: trucks[1].id,
          assignedDriverId: drivers[1].id,
        },
      ],
    });

    console.log('✅ Seeded Jobs');
    console.log('🎉 Database seeding complete!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await db.$disconnect();
  }
}

seed();
