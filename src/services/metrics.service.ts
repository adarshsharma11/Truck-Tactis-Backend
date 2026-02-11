import { db } from '../utils/db.server';
import { TMetricsQuery, TMetricsResponse, TTruckUtilization } from '../types/metrics';

// =============================
// 📊 Get Dashboard Metrics
// =============================
export const getMetrics = async (query: TMetricsQuery): Promise<TMetricsResponse> => {
  const { from, to, truckId, driverId } = query;
  
  // Set default date range to last 30 days if not provided
  const endDate = to ? new Date(to) : new Date();
  const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  // Format dates for response
  const date_range = {
    from: startDate.toISOString().split('T')[0],
    to: endDate.toISOString().split('T')[0]
  };

  // Build where clause for job queries
  const jobWhere: any = {
    createdAt: {
      gte: startDate,
      lte: endDate
    }
  };

  if (truckId) {
    jobWhere.assignedTruckId = truckId;
  }

  if (driverId) {
    jobWhere.assignedDriverId = driverId;
  }

  // Get jobs in the date range
  const allJobs = await db.job.findMany({
    where: jobWhere,
    select: {
      id: true,
      isCompleted: true,
      assignedTruckId: true,
      date: true,
      serviceMinutes: true
    }
  });

  const now = new Date();

  // Logic: 
  // 1. If job is marked isCompleted: true -> Completed
  // 2. If job has a truckId AND the date is in the past -> Completed
  // 3. Otherwise -> Deferred
  let jobsCompleted = 0;
  let jobsDeferred = 0;
  let totalServiceTime = 0;
  let serviceTimeCount = 0;

  allJobs.forEach(job => {
    const isPast = job.date ? new Date(job.date) < now : false;
    const hasTruck = job.assignedTruckId !== null;

    if (job.isCompleted || (hasTruck && isPast)) {
      jobsCompleted++;
      if (job.serviceMinutes) {
        totalServiceTime += job.serviceMinutes;
        serviceTimeCount++;
      }
    } else {
      jobsDeferred++;
    }
  });

  // Calculate average service time using serviceMinutes field
  const avgServiceTimeMinutes = serviceTimeCount > 0 
    ? Math.round(totalServiceTime / serviceTimeCount) 
    : 0;

  // Calculate on-time percentage
  const totalJobsCount = jobsCompleted + jobsDeferred;
  const onTimePercentage = totalJobsCount > 0 ? Math.round((jobsCompleted / totalJobsCount) * 100) : 0;

  // Get utilization by truck
  const trucks = await db.truck.findMany({
    where: { isActive: true },
    include: {
      jobs: {
        where: jobWhere,
        select: { id: true, isCompleted: true, date: true, assignedTruckId: true }
      }
    }
  });

  const utilizationByTruck: TTruckUtilization[] = trucks.map(truck => {
    const totalJobsForTruck = truck.jobs.length;
    const completedJobsForTruck = truck.jobs.filter(job => {
      const isPast = job.date ? new Date(job.date) < now : false;
      const hasTruck = job.assignedTruckId !== null;
      return job.isCompleted || (hasTruck && isPast);
    }).length;
    const utilization = totalJobsForTruck > 0 ? Math.round((completedJobsForTruck / totalJobsForTruck) * 100) : 0;
    
    return {
      truck_name: truck.truckName,
      utilization
    };
  });

  return {
    date_range,
    jobs_completed: jobsCompleted,
    jobs_deferred: jobsDeferred,
    on_time_percentage: onTimePercentage,
    avg_service_time_minutes: avgServiceTimeMinutes,
    utilization_by_truck: utilizationByTruck
  };
};

// =============================
// 📈 Get Jobs Trend Data
// =============================
export const getJobsTrend = async (query: TMetricsQuery) => {
  const { from, to, truckId, driverId } = query;
  
  const endDate = to ? new Date(to) : new Date();
  const startDate = from ? new Date(from) : new Date(endDate.getTime() - 6 * 24 * 60 * 60 * 1000); // Default to last 7 days including today

  // Set time for accurate filtering
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const jobWhere: any = {
    createdAt: {
      gte: start,
      lte: end
    }
  };

  if (truckId) jobWhere.assignedTruckId = truckId;
  if (driverId) jobWhere.assignedDriverId = driverId;

  const jobs = await db.job.findMany({
    where: jobWhere,
    select: {
      id: true,
      isCompleted: true,
      assignedTruckId: true,
      date: true,
      createdAt: true
    }
  });

  const now = new Date();
  const isJobCompleted = (job: any) => job.isCompleted || (!!job.assignedTruckId && !!job.date && new Date(job.date) < now);

  const trendData = [];
  const daysShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate number of days to show
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  for (let i = 0; i < diffDays; i++) {
    const currentDay = new Date(start);
    currentDay.setDate(start.getDate() + i);
    
    const dayStart = new Date(currentDay);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDay);
    dayEnd.setHours(23, 59, 59, 999);

    const dayJobs = jobs.filter(job => {
      const jobCreatedAt = new Date(job.createdAt);
      return jobCreatedAt >= dayStart && jobCreatedAt <= dayEnd;
    });

    const completed = dayJobs.filter(isJobCompleted).length;
    const deferred = dayJobs.length - completed;

    trendData.push({
      day: daysShort[currentDay.getDay()],
      date: currentDay.toISOString().split('T')[0],
      completed,
      deferred
    });
  }

  return trendData;
};