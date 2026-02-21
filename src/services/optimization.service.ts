import { db } from "../utils/db.server";
import haversine from "haversine-distance";
import axios, { AxiosResponse } from "axios";
import { NotificationService } from "./NotificationService";
import type { Job, Location, Item } from "@prisma/client";

// Static truck origin location (used instead of live GPS location)
const TRUCK_ORIGIN_LAT = 34.2035603;
const TRUCK_ORIGIN_LNG = -118.484937;

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
function calculateJobItemsLoad(items: Item[]) {
  const totalWeight = items.reduce((sum, i) => sum + (i.weightLbs ?? 0), 0);
  const totalVolume = items.reduce((sum, i) => sum + (((i.lengthIn ?? 0) * (i.widthIn ?? 0) * (i.heightIn ?? 0)) / 1728), 0);
  return { totalWeight, totalVolume };
}

function getTruckTypeLevel(type: string): number {
  switch (type) {
    case "SMALL": return 1;
    case "MEDIUM": return 2;
    case "LARGE": return 3;
    case "HEAVY_DUTY": return 4;
    default: return 0;
  }
}

function isTruckTypeCompatible(truckType: string, jobTruckType: string) {
  return getTruckTypeLevel(truckType) >= getTruckTypeLevel(jobTruckType);
}

// async function getJobLoad(jobId: number) {
//   const items = await db.item.findMany({ where: { jobs: { some: { id: jobId } } } });
//   return calculateJobItemsLoad(items);
// }

async function getAvailableTrucks(jobDate?: string | Date) {
  const jobDateObj = jobDate ? new Date(jobDate) : new Date();
  const startOfDay = new Date(jobDateObj.setHours(0, 0, 0, 0));
  const endOfDay = new Date(jobDateObj.setHours(23, 59, 59, 999));
  return db.truck.findMany({
    where: { isActive: true, currentStatus: "AVAILABLE", driverId: { not: null }, },
    include: { driver: true ,
      jobs: {
        where: {
          isCompleted: false,
          date: { gte: startOfDay, lt: endOfDay },
        },
        include: { location: true, items: true },
      },
    },
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

// ---- Public API -----------------------------------------------------------
/**
 * Assign best available trucks to unassigned jobs using a VRP construction heuristic.
 * Minimizes total fleet distance while respecting constraints.
 */
export async function optimizeJobs(jobDate?: string | Date) {
  const jobDateObj = jobDate ? new Date(jobDate) : new Date(); // default to today
  const startOfDay = new Date(jobDateObj.setHours(0, 0, 0, 0));
  const endOfDay = new Date(jobDateObj.setHours(23, 59, 59, 999));
 
  // 1. Fetch unassigned jobs
  const jobs = await db.job.findMany({ 
    where: { 
      assignedTruckId: null, 
      isCompleted: false, 
      date: { gte: startOfDay, lt: endOfDay }, 
    }, 
    include: { location: true, items: true }, 
    orderBy: { priority: 'desc' } 
  }) as Array<Job & { location: Location | null; items: Item[] }>;
    
  // 2. Fetch available trucks (with existing jobs)
  const trucksDB = await getAvailableTrucks(jobDate);
  
  // 3. Initialize Truck State
  interface TruckState {
    id: number;
    truck: any;
    currentLat: number;
    currentLng: number;
    currentWeight: number;
    currentVolume: number;
    assignedCount: number;
  }

  const truckStates: TruckState[] = [];

  for (const t of trucksDB) {
    let currentWeight = 0;
    let currentVolume = 0;
    
    // Calculate existing load
    for (const j of t.jobs) {
        const load = calculateJobItemsLoad(j.items);
        currentWeight += load.totalWeight;
        currentVolume += load.totalVolume;
    }

    // Determine start location (use static origin instead of live location)
    let startLat = TRUCK_ORIGIN_LAT;
    let startLng = TRUCK_ORIGIN_LNG;

    if (t.jobs.length > 0) {
        // Sort existing jobs to find the tail of the route
        let remaining = [...t.jobs];
        let curr = { lat: startLat, lng: startLng };
        
        // Simple greedy sort to find endpoint
        while (remaining.length > 0) {
            let nearestIdx = -1;
            let minDist = Infinity;
            for (let i = 0; i < remaining.length; i++) {
                if (!remaining[i].location) continue;
                const d = haversine({ lat: curr.lat, lon: curr.lng }, { lat: remaining[i].location!.latitude, lon: remaining[i].location!.longitude });
                if (d < minDist) {
                    minDist = d;
                    nearestIdx = i;
                }
            }
            if (nearestIdx === -1) break; 
            
            const nextJob = remaining[nearestIdx];
            if (nextJob.location) {
                 curr = { lat: nextJob.location.latitude, lng: nextJob.location.longitude };
            }
            remaining.splice(nearestIdx, 1);
        }
        startLat = curr.lat;
        startLng = curr.lng;
    }
    
    truckStates.push({
        id: t.id,
        truck: t,
        currentLat: startLat,
        currentLng: startLng,
        currentWeight,
        currentVolume,
        assignedCount: t.jobs.length
    });
  }

  // 4. Assign Jobs using Iterative Best Assignment
  // Instead of iterating jobs, we loop until all jobs are assigned or no valid moves exist.
  // We pick the best (Truck, Job) pair that minimizes: Distance + (AssignedCount * PENALTY)
  
  const BALANCE_PENALTY_KM = 5; // Each assigned job adds 5km "virtual distance" cost
  const unassignedJobs = [...jobs];
  const assignments: any[] = [];

  while (unassignedJobs.length > 0) {
    let bestMove: { truckState: TruckState; jobIndex: number; score: number; addedDistance: number } | null = null;
    let minScore = Infinity;

    // Check all combinations
    for (const state of truckStates) {
      for (let i = 0; i < unassignedJobs.length; i++) {
        const job = unassignedJobs[i];
        if (!job.location) continue;

        // Constraint Checks
        if (!isTruckTypeCompatible(state.truck.truckType, job.truckType)) continue;

        const jobLoad = calculateJobItemsLoad(job.items);
        const newWeight = state.currentWeight + jobLoad.totalWeight;
        const newVolume = state.currentVolume + jobLoad.totalVolume;

        if (newWeight > state.truck.maxWeightLbs) continue;
        if (newVolume > state.truck.capacityCuFt) continue;
        if (job.largeTruckOnly && state.truck.truckType === 'SMALL') continue;

        // Cost Calculation
        const dist = await getRouteDistance(
            state.currentLat, 
            state.currentLng, 
            job.location.latitude, 
            job.location.longitude
        );

        // Score = Distance + Penalty
        // This balances: prefer short distances, but also prefer trucks with fewer jobs
        const score = dist + (state.assignedCount * BALANCE_PENALTY_KM);

        if (score < minScore) {
          minScore = score;
          bestMove = { truckState: state, jobIndex: i, score, addedDistance: dist };
        }
      }
    }

    // Execute best move
    if (bestMove) {
      const { truckState, jobIndex, addedDistance } = bestMove;
      const job = unassignedJobs[jobIndex];
      const jobLoad = calculateJobItemsLoad(job.items);

      // Remove from pool
      unassignedJobs.splice(jobIndex, 1);
      console.log(addedDistance)

      // Apply Assignment to DB
      await db.job.update({ 
        where: { id: job.id }, 
        data: { 
          assignedTruckId: truckState.id, 
          assignedDriverId: truckState.truck.driverId 
        } 
      });

      // Update Truck State
      truckState.currentLat = job.location!.latitude;
      truckState.currentLng = job.location!.longitude;
      truckState.currentWeight += jobLoad.totalWeight;
      truckState.currentVolume += jobLoad.totalVolume;
      truckState.assignedCount++;

      assignments.push({ 
        jobId: job.id, 
        jobTitle: job.title, 
        assignedTruck: truckState.truck.truckName, 
        driver: truckState.truck.driver?.name ?? "Unassigned", 
        score: Math.round(minScore * 100) / 100 
      });

      // Notifications
      let priority = job.priority == 1 ? "High" : "Low"; 
      const itemNames = job.items?.map((item) => item.name || `Item #${item.id}`).join(", ") || "No items";
      const recipient = truckState.truck.driver?.phone ? `${truckState.truck.driver.phone}` : undefined;
      
      const destination = `${job.location!.latitude},${job.location!.longitude}`;
      const routeLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
      
      try {
        if (recipient) {
          const message =
            "🚛 New Job Assigned!\n\n" +
            `📌 Title: ${job.title}\n` +
            `⚙️ Action Type: ${job.actionType}\n` +
            `🚚 Truck Type: ${job.truckType == "MEDIUM" ? "ANY" : job.truckType}\n` +
            `📍 Location: ${job.location?.address || job.location?.name || "N/A"}\n` +
            `🗺️ Map: ${routeLink}\n` +
            `🧱 Items: ${itemNames}\n` +
            `⭐ Priority: ${priority}`;

          if (truckState.truck.driver?.smsOptIn) {
            await NotificationService.sendSMS(recipient, message);
          }
          if (truckState.truck.driver?.whatsappOptIn) {
            const jobSummary = `${job.title} | ${job.actionType} | ${job.location?.address || job.location?.name || "N/A"} | Items: ${itemNames}`;
            await NotificationService.sendWhatsAppJobAssignedTemplate(recipient, {
              job_id: String(job.id),
              job_summary: jobSummary,
              route_link: routeLink,
            });
          }
        }
      } catch (err) {
        console.error("❌ Failed to send notification:", err);
      }

    } else {
      // No valid moves found for remaining jobs (e.g. constraints)
      break;
    }
  }

  return { success: true, totalJobs: jobs.length, assigned: assignments.length, assignments };
}
/**
 * Build optimized routes for all trucks with assigned jobs.
 * Adds a Google Maps route URL to share with drivers.
 */
export async function getOptimizedRoutes(opts?: { decodePolyline?: boolean; sortStrategy?: "nearest" | "as_uploaded" ; jobDate?: string | Date; }) {
  const { decodePolyline = false, sortStrategy = "nearest", jobDate } = opts || {};
  const jobDateObj = jobDate ? new Date(jobDate) : null;
  const trucks = await db.truck.findMany({
    where: { isActive: true },
    include: {
      driver: true,
      jobs: {
        where: {
          assignedTruckId: { not: null },
          isCompleted: false,
          ...(jobDateObj && {
            date: {
              gte: new Date(jobDateObj.setHours(0, 0, 0, 0)),
              lt: new Date(jobDateObj.setHours(23, 59, 59, 999)),
            },
          }),
        },
        include: { location: true },
      },
    },
  });

  const routes: any[] = [];

  for (const truck of trucks) {
    const jobs = Array.isArray(truck.jobs) ? truck.jobs : [];
    if (!jobs.length) continue;

    let sortedJobs = jobs;

    if (sortStrategy === "nearest") {
      // Greedy sort by distance from static truck origin
      sortedJobs = [...jobs].sort((a, b) => {
        if (!a.location || !b.location) return 0;
        const distA = haversine(
          { lat: TRUCK_ORIGIN_LAT, lon: TRUCK_ORIGIN_LNG },
          { lat: a.location.latitude as number, lon: a.location.longitude as number }
        );
        const distB = haversine(
          { lat: TRUCK_ORIGIN_LAT, lon: TRUCK_ORIGIN_LNG },
          { lat: b.location.latitude as number, lon: b.location.longitude as number }
        );
        return distA - distB;
      });
    }

    const points: RoutePoint[] = [
      { lat: TRUCK_ORIGIN_LAT, lng: TRUCK_ORIGIN_LNG },
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
