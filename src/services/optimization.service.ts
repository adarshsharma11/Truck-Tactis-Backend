import { db } from "../utils/db.server";
import haversine from "haversine-distance";
import axios, { AxiosResponse } from "axios";

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_KEY || "";
const GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json";

// ---- Types -----------------------------------------------------------------
interface LatLng {
  lat: number;
  lng: number;
}

interface RoutePoint extends LatLng {
  jobId?: number;
  title?: string;
}

interface RouteResult {
  distanceKm: number;
  durationMin: number | null;
  polyline: string | null;
  decoded?: LatLng[] | null;
}

// ---- Helpers ---------------------------------------------------------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeNumber(v: any, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Simple polyline decoder (google encoded polyline algorithm)
// Returns array of {lat,lng}
function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  const coords: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

// Call Google Directions with simple retry/backoff. If no key, throws to allow fallback.
async function callGoogleDirections(
  origin: string,
  destination: string,
  waypoints?: string
): Promise<AxiosResponse<any>> {
  if (!GOOGLE_API_KEY) throw new Error("No Google API key configured");

  const params: Record<string, any> = { origin, destination, key: GOOGLE_API_KEY };
  if (waypoints) params.waypoints = waypoints;

  const maxRetries = 3;
  let attempt = 0;
  let lastErr: any = null;

  while (attempt < maxRetries) {
    try {
      return await axios.get(GOOGLE_DIRECTIONS_URL, { params, timeout: 10_000 });
    } catch (err) {
      lastErr = err;
      attempt += 1;
      // exponential backoff with jitter
      const backoff = Math.pow(2, attempt) * 250 + Math.floor(Math.random() * 250);
      await sleep(backoff);
    }
  }
  throw lastErr ?? new Error("Failed to call Google Directions");
}

// Get route distance/duration/polyline between an ordered list of points
async function getRoutePath(points: LatLng[], opts?: { decodePolyline?: boolean }): Promise<RouteResult | null> {
  if (!points || points.length < 2) return null;

  const origin = `${points[0].lat},${points[0].lng}`;
  const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
  const waypointsArr = points.slice(1, -1).map((p) => `${p.lat},${p.lng}`);
  const waypoints = waypointsArr.length ? waypointsArr.join("|") : undefined;

  // Try Google Directions if key present, otherwise fallback to haversine
  if (GOOGLE_API_KEY) {
    try {
      const res = await callGoogleDirections(origin, destination, waypoints);
      const route = res.data?.routes?.[0];
      if (!route) throw new Error("No route returned by Google");

      const distanceMeters = (route.legs || []).reduce((s: number, l: any) => s + safeNumber(l.distance?.value, 0), 0);
      const durationSeconds = (route.legs || []).reduce((s: number, l: any) => s + safeNumber(l.duration?.value, 0), 0);

      const polyline: string | null = route.overview_polyline?.points ?? null;

      const result: RouteResult = {
        distanceKm: distanceMeters / 1000,
        durationMin: durationSeconds ? Math.round((durationSeconds / 60) * 100) / 100 : null,
        polyline,
        decoded: null,
      };

      if (opts?.decodePolyline && polyline) {
        result.decoded = decodePolyline(polyline);
      }

      return result;
    } catch (err) {
      // Log and fallback to haversine below
      // eslint-disable-next-line no-console
      console.warn("Google Directions failed, falling back to haversine:", (err as Error).message || err);
    }
  }

  // Fallback: compute straight-line distances between consecutive points
  const totalKm = points.slice(1).reduce((sum, p, i) => {
    const prev = points[i];
    return sum + haversine({ lat: prev.lat, lon: prev.lng }, { lat: p.lat, lon: p.lng }) / 1000;
  }, 0);

  return { distanceKm: totalKm, durationMin: null, polyline: null, decoded: null };
}

// ---- Domain helpers -------------------------------------------------------
async function getJobLoad(jobId: number) {
  const items = await db.item.findMany({ where: { jobs: { some: { id: jobId } } } });
  const totalWeight = items.reduce((sum: number, i: any) => sum + (i.weightLbs ?? 0), 0);
  const totalVolume = items.reduce((sum: number, i: any) => sum + (((i.lengthIn ?? 0) * (i.widthIn ?? 0) * (i.heightIn ?? 0)) / 1728), 0);
  return { totalWeight, totalVolume };
}

async function getAvailableTrucks() {
  return db.truck.findMany({
    where: { isActive: true, currentStatus: "AVAILABLE" },
    include: { driver: true },
  });
}

async function getRouteDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  if (!GOOGLE_API_KEY) return haversine({ lat: lat1, lon: lng1 }, { lat: lat2, lon: lng2 }) / 1000;

  try {
    const res = await callGoogleDirections(`${lat1},${lng1}`, `${lat2},${lng2}`);
    const route = res.data?.routes?.[0];
    const meters = route?.legs?.[0]?.distance?.value ?? 0;
    return meters / 1000;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("getRouteDistance: google call failed, fallback to haversine", (err as Error).message || err);
    return haversine({ lat: lat1, lon: lng1 }, { lat: lat2, lon: lng2 }) / 1000;
  }
}

// Compute truck suitability score
async function scoreTruckForJob(truck: any, job: any) {
  const { totalWeight, totalVolume } = await getJobLoad(job.id);
  const loc = job.location;

  const weightScore = Math.min(1, safeNumber(truck.maxWeightLbs, 0) / Math.max(1, totalWeight));
  const volumeScore = Math.min(1, safeNumber(truck.capacityCuFt, 0) / Math.max(1, totalVolume));
  const capacityScore = (weightScore + volumeScore) / 2;

  const sizePenalty = job.largeTruckOnly && truck.truckType === "SMALL" ? 0.5 : 1;

  let distanceKm = 50; // default guess
  if (loc?.latitude && loc?.longitude && truck.lastKnownLat && truck.lastKnownLng) {
    distanceKm = await getRouteDistance(truck.lastKnownLat, truck.lastKnownLng, loc.latitude, loc.longitude);
  }

  const distanceScore = Math.max(0, 1 - distanceKm / 100);
  const totalScore = 0.4 * capacityScore + 0.4 * distanceScore + 0.2 * sizePenalty;
  return totalScore;
}

// ---- Public API -----------------------------------------------------------
/**
 * Assign best available trucks to unassigned jobs.
 * Returns a summary object.
 */
export async function optimizeJobs() {
 
  const jobs = await db.job.findMany({ where: { assignedTruckId: null, isCompleted: false }, 
  include: { location: true }, orderBy: {  priority: 'desc'} });
    
  const trucks = await getAvailableTrucks();
  const assignments: any[] = [];

  for (const job of jobs) {
    let bestTruck: any = null;
    let bestScore = 0;

    for (const truck of trucks) {
        const jobsToday = await db.job.count({
          where: {
            assignedTruckId: truck.id,
            isCompleted: false,
          }
        });
      if (jobsToday >= 3) continue;
      try {
        const jobTruckType = (job as any).truckType;
        if(truck.truckType == jobTruckType || truck.truckType == "MEDIUM"){
          const score = await scoreTruckForJob(truck, job);
          if (score > bestScore) {
            bestScore = score;
            bestTruck = truck;
          }
        }
      } catch (err) {
        // continue if one truck scoring fails
        // eslint-disable-next-line no-console
        console.warn(`scoreTruckForJob failed for truck ${truck?.id} / job ${job.id}:`, (err as Error).message || err);
      }
    }

    if (bestTruck) {
      if (!bestTruck.driver) {
       const driver = await db.driver.findFirst({
          where: {
            status: 'AVAILABLE',
            OR: [
              { truckType: bestTruck.truckType },
              { truckType: 'MEDIUM' } 
            ],
          },
        });

        if (driver) {
          await db.driver.update({
            where: { id: driver.id },
            data: { truckId: bestTruck.id, status: 'ASSIGNED' },
          });

          await db.truck.update({
            where: { id: bestTruck.id },
            data: { driverId: driver.id ,currentStatus:'IN_TRANSIT'},
          });

          // attach driver info to truck for assignment
          bestTruck.driver = driver;
        }
      }
      await db.job.update({ where: { id: job.id }, data: { assignedTruckId: bestTruck.id, assignedDriverId: bestTruck.driver?.id ?? null } });
      assignments.push({ jobId: job.id, jobTitle: job.title, assignedTruck: bestTruck.truckName, driver: bestTruck.driver?.name ?? "Unassigned", score: Math.round(bestScore * 100) / 100 });
    }
  }

  return { success: true, totalJobs: jobs.length, assigned: assignments.length, assignments };
}
/**
 * Build optimized routes for all trucks with assigned jobs.
 * Adds a Google Maps route URL to share with drivers.
 */
export async function getOptimizedRoutes(opts?: { decodePolyline?: boolean; sortStrategy?: "nearest" | "as_uploaded" }) {
  const { decodePolyline = false, sortStrategy = "nearest" } = opts || {};

  const trucks = await db.truck.findMany({
    where: { isActive: true },
    include: {
      driver: true,
      jobs: { where: { assignedTruckId: { not: null }, isCompleted: false }, include: { location: true } },
    },
  });

  const routes: any[] = [];

  for (const truck of trucks) {
    const jobs = Array.isArray(truck.jobs) ? truck.jobs : [];
    if (!jobs.length) continue;

    let sortedJobs = jobs;

    if (sortStrategy === "nearest") {
      // Greedy sort by distance from truck start
      sortedJobs = [...jobs].sort((a, b) => {
        if (!a.location || !b.location) return 0;
        const distA = haversine(
          { lat: truck.lastKnownLat as number, lon: truck.lastKnownLng as number },
          { lat: a.location.latitude as number, lon: a.location.longitude as number }
        );
        const distB = haversine(
          { lat: truck.lastKnownLat as number, lon: truck.lastKnownLng as number },
          { lat: b.location.latitude as number, lon: b.location.longitude as number }
        );
        return distA - distB;
      });
    }

    const points: RoutePoint[] = [
      { lat: truck.lastKnownLat as number, lng: truck.lastKnownLng as number },
      ...sortedJobs
        .filter((j: any) => j.location)
        .map((j: any) => ({
          lat: j.location.latitude as number,
          lng: j.location.longitude as number,
          jobId: j.id,
          title: j.title,
        })),
    ];

    const routeData = await getRoutePath(
      points.map((p) => ({ lat: p.lat as number, lng: p.lng as number })),
      { decodePolyline }
    );

    // ---- Build Google Maps URL ----
    const origin = `${points[0].lat},${points[0].lng}`;
    const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
    const waypoints = points
      .slice(1, -1)
      .map((p) => `${p.lat},${p.lng}`)
      .join("|");

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin
    )}&destination=${encodeURIComponent(destination)}${
      waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""
    }`;

    routes.push({
      truckId: truck.id,
      truckName: truck.truckName,
      driver: truck.driver?.name ?? "Unassigned",
      type: truck.truckType,
      status:truck.currentStatus,
      totalJobs: sortedJobs.length,
      color:truck.color,
      stops: sortedJobs.map((j: any) => ({
        jobId: j.id,
        title: j.title,
        lat: j.location?.latitude,
        lng: j.location?.longitude,
      })),
      route: routeData,
      googleMapsUrl,
    });
  }

  return { success: true, totalTrucks: routes.length, routes };
}


// ---- Export default for convenience ---------------------------------------
export default { optimizeJobs, getOptimizedRoutes };
