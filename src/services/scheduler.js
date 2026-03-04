import cron from 'node-cron';
import Ride from '../models/Ride.js';

/**
 * Start all scheduled tasks
 */
export const startScheduledTasks = () => {
  // Clean up expired rides every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled task: Cleanup expired rides');
    await cleanupExpiredRides();
  });
  
  // Mark rides as completed the day after they occur
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled task: Mark completed rides');
    await markCompletedRides();
  });
  
  console.log('Scheduled tasks initialized');
};

/**
 * Cleanup expired rides
 */
const cleanupExpiredRides = async () => {
  try {
    const result = await Ride.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} rides as expired`);
    }
  } catch (error) {
    console.error('Error cleaning up expired rides:', error);
  }
};

/**
 * Mark rides as completed after they occur
 */
const markCompletedRides = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    
    const result = await Ride.updateMany(
      {
        status: { $in: ['active', 'full'] },
        date: { $lt: yesterday }
      },
      {
        $set: { status: 'completed' }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} rides as completed`);
    }
  } catch (error) {
    console.error('Error marking completed rides:', error);
  }
};
