import { db } from "../utils/db.server";
import haversine from "haversine-distance";
import axios from "axios";

// 🔑 Optional: store Google Maps key in .env
const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_KEY || "";

// Estimate total volume or weight for a job’s items
async function getJobLoad(jobId: number) {
  const items = await db.item.findMany({
    where: { jobs: { some: { id: jobId } } },
  });

  const totalWeight = items.reduce((sum, i) => sum + (i.weightLbs ?? 0), 0);
  const totalVolume =
    items.reduce(
      (sum, i) =>
        sum +
        ((i.lengthIn ?? 0) * (i.widthIn ?? 0) * (i.heightIn ?? 0)) / 1728, // inches³ → ft³
      0
    );

  return { totalWeight, totalVolume };
}

// 🚛 Get all active trucks + driver info
async function getAvailableTrucks() {
  return db.truck.findMany({
    where: {
      isActive: true,
      currentStatus: "AVAILABLE",
    },
    include: {
      driver: true,
    },
  });
}

// 📍 Optional: get driving distance via Google Directions
async function getRouteDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  if (!GOOGLE_API_KEY) {
    // fallback: haversine distance
    return haversine({ lat: lat1, lon: lng1 }, { lat: lat2, lon: lng2 }) / 1000; // km
  }

  try {
    const res = await axios.get(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${lat1},${lng1}&destination=${lat2},${lng2}&key=${GOOGLE_API_KEY}`
    );
    const route = res.data.routes?.[0];
    const distance = route?.legs?.[0]?.distance?.value ?? 0;
    return distance / 1000; // km
  } catch {
    return haversine({ lat: lat1, lon: lng1 }, { lat: lat2, lon: lng2 }) / 1000;
  }
}

// 🧠 Compute truck suitability score
async function scoreTruckForJob(truck: any, job: any) {
  const { totalWeight, totalVolume } = await getJobLoad(job.id);
  const loc = job.location;

  // capacity match (0-1)
  const weightScore = Math.min(1, truck.maxWeightLbs / (totalWeight || 1));
  const volumeScore = Math.min(1, truck.capacityCuFt / (totalVolume || 1));
  const capacityScore = (weightScore + volumeScore) / 2;

  // large truck rule
  const sizePenalty = job.largeTruckOnly && truck.truckType === "SMALL" ? 0.5 : 1;

  // proximity (inverse score)
  let distanceKm = 50; // default
  if (loc?.latitude && loc?.longitude && truck.lastKnownLat && truck.lastKnownLng) {
    distanceKm = await getRouteDistance(
      truck.lastKnownLat,
      truck.lastKnownLng,
      loc.latitude,
      loc.longitude
    );
  }
  const distanceScore = Math.max(0, 1 - distanceKm / 100); // 0-1, penalize >100km

  // weighted total
  const totalScore = 0.4 * capacityScore + 0.4 * distanceScore + 0.2 * sizePenalty;

  return totalScore;
}

// 🔁 Main optimization function
export async function optimizeJobs() {
  const jobs = await db.job.findMany({
    where: { assignedTruckId: null, isCompleted: false },
    include: { location: true },
  });

  const trucks = await getAvailableTrucks();
  const assignments: any[] = [];

  for (const job of jobs) {
    let bestTruck = null;
    let bestScore = 0;

    for (const truck of trucks) {
      const score = await scoreTruckForJob(truck, job);
      if (score > bestScore) {
        bestScore = score;
        bestTruck = truck;
      }
    }

    if (bestTruck) {
      await db.job.update({
        where: { id: job.id },
        data: {
          assignedTruckId: bestTruck.id,
          assignedDriverId: bestTruck.driver?.id ?? null,
        },
      });

      assignments.push({
        jobId: job.id,
        jobTitle: job.title,
        assignedTruck: bestTruck.truckName,
        driver: bestTruck.driver?.name ?? "Unassigned",
        score: bestScore.toFixed(2),
      });
    }
  }

  return {
    success: true,
    totalJobs: jobs.length,
    assigned: assignments.length,
    assignments,
  };
}
