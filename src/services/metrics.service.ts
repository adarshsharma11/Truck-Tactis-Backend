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

  // Get jobs completed in the date range
  const jobsCompleted = await db.job.count({
    where: {
      ...jobWhere,
      isCompleted: true
    }
  });

  // Get jobs deferred (not completed) in the date range
  const jobsDeferred = await db.job.count({
    where: {
      ...jobWhere,
      isCompleted: false
    }
  });

  // Calculate on-time percentage (assuming jobs with earliestTime and completion within time)
  const totalJobs = jobsCompleted + jobsDeferred;
  const onTimePercentage = totalJobs > 0 ? Math.round((jobsCompleted / totalJobs) * 100) : 0;

  // Calculate average service time (mock calculation based on job duration)
  // This is a simplified calculation - you might want to enhance this based on your actual business logic
  const avgServiceTimeMinutes = 45; // Default average service time

  // Get utilization by truck
  const trucks = await db.truck.findMany({
    where: { isActive: true },
    include: {
      jobs: {
        where: jobWhere,
        select: { id: true, isCompleted: true }
      }
    }
  });

  const utilizationByTruck: TTruckUtilization[] = trucks.map(truck => {
    const totalJobsForTruck = truck.jobs.length;
    const completedJobs = truck.jobs.filter(job => job.isCompleted).length;
    const utilization = totalJobsForTruck > 0 ? Math.round((completedJobs / totalJobsForTruck) * 100) : 0;
    
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
  const { from } = query;
  
  const startDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  // Generate daily data for the last 7 days
  const trendData = [];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    // Mock data - in a real implementation, you would query the database for each day
    const completed = Math.floor(Math.random() * 20) + 20; // 20-40 jobs
    const deferred = Math.floor(Math.random() * 5) + 1; // 1-5 jobs
    
    trendData.push({
      day: days[date.getDay() === 0 ? 6 : date.getDay() - 1], // Convert to Mon-Sun
      completed,
      deferred
    });
  }

  return trendData;
};