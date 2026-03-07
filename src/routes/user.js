import express from 'express';
import User from '../models/User.js';
import { validateToken } from '../services/otp.js';

const router = express.Router();

// Middleware to validate authentication - Support both headers and query params
const authenticate = async (req, res, next) => {
  // Accept both headers and query parameters
  const phoneNumber = req.headers.phoneNumber || req.query.phoneNumber;
  const token = req.headers.token || req.query.token;
  
  console.log('Auth check - Phone:', phoneNumber, 'Token exists:', !!token);
  
  if (!phoneNumber || !token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Authentication required. Please login again.' 
    });
  }
  
  const validation = await validateToken(phoneNumber, token);
  if (!validation.valid) {
    return res.status(401).json({ 
      success: false, 
      error: validation.error || 'Invalid or expired session. Please login again.' 
    });
  }
  
  req.user = validation.user;
  req.phoneNumber = phoneNumber;
  next();
};

// Get user profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      profile: {
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        rating: user.rating,
        totalRatings: user.totalRatings,
        rideCount: user.rideCount,
        createdAt: user.createdAt,
        lastActive: user.lastActive,
        preferences: user.preferences,
        roles: user.roles,
        driverInfo: user.driverInfo,
        emergencyContact: user.emergencyContact
      }
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get profile' 
    });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, email, preferences, emergencyContact } = req.body;
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    if (name) user.name = name;
    if (email) user.email = email;
    if (preferences) {
      user.preferences = { ...user.preferences, ...preferences };
    }
    if (emergencyContact) {
      user.emergencyContact = { ...user.emergencyContact, ...emergencyContact };
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        preferences: user.preferences,
        emergencyContact: user.emergencyContact
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update profile' 
    });
  }
});

// Update driver info
router.put('/driver-info', authenticate, async (req, res) => {
  try {
    const { vehicleMake, vehicleModel, vehicleYear, vehicleColor, licensePlate, isDriver } = req.body;
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Initialize driverInfo if not exists
    if (!user.driverInfo) {
      user.driverInfo = {};
    }
    
    if (vehicleMake !== undefined) user.driverInfo.vehicleMake = vehicleMake;
    if (vehicleModel !== undefined) user.driverInfo.vehicleModel = vehicleModel;
    if (vehicleYear !== undefined) user.driverInfo.vehicleYear = vehicleYear;
    if (vehicleColor !== undefined) user.driverInfo.vehicleColor = vehicleColor;
    if (licensePlate !== undefined) user.driverInfo.licensePlate = licensePlate;
    if (isDriver !== undefined) user.driverInfo.isDriver = isDriver;
    
    if (isDriver === true && !user.driverInfo.driverSince) {
      user.driverInfo.driverSince = new Date();
    }
    
    // Update roles
    if (isDriver !== undefined) {
      user.roles = user.roles || {};
      user.roles.driver = isDriver;
    }
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Driver info updated successfully',
      driverInfo: user.driverInfo
    });
  } catch (error) {
    console.error('Error updating driver info:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update driver info' 
    });
  }
});

// Schedule account deletion
router.delete('/account', authenticate, async (req, res) => {
  try {
    const { scheduledDeletion, deletionDate } = req.body;
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    if (scheduledDeletion) {
      // Schedule deletion for 60 days
      user.accountDeletionScheduled = true;
      user.scheduledDeletionDate = deletionDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
      user.isActive = false; // Temporarily deactivate
      await user.save();
      
      res.json({
        success: true,
        message: 'Account deletion scheduled. You have 60 days to cancel by logging in.',
        scheduledDeletionDate: user.scheduledDeletionDate
      });
    } else {
      // Immediate deletion
      await User.findOneAndDelete({ phoneNumber: req.phoneNumber });
      
      res.json({
        success: true,
        message: 'Account deleted successfully'
      });
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete account' 
    });
  }
});

// Cancel account deletion
router.post('/account/cancel-deletion', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    user.accountDeletionScheduled = false;
    user.scheduledDeletionDate = null;
    user.isActive = true;
    await user.save();
    
    res.json({
      success: true,
      message: 'Account deletion cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling deletion:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel deletion' 
    });
  }
});

// Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        error: 'Current password and new password are required' 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 6 characters' 
      });
    }
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // For WhatsApp-based auth, we don't have traditional passwords
    // This is a placeholder for future implementation
    // In production, you would verify the current password against passwordHash
    
    // Update password (in a real app, you would hash this)
    user.passwordHash = newPassword; // In production: bcrypt.hashSync(newPassword, 10);
    await user.save();
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to change password' 
    });
  }
});

// Update driver preferences
router.put('/driver-preferences', authenticate, async (req, res) => {
  try {
    const { smoking, music, chat, pets, food, phoneCharging, notes } = req.body;
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Initialize driverPreferences if not exists
    if (!user.driverPreferences) {
      user.driverPreferences = {};
    }
    
    if (smoking !== undefined) user.driverPreferences.smoking = smoking;
    if (music !== undefined) user.driverPreferences.music = music;
    if (chat !== undefined) user.driverPreferences.chat = chat;
    if (pets !== undefined) user.driverPreferences.pets = pets;
    if (food !== undefined) user.driverPreferences.food = food;
    if (phoneCharging !== undefined) user.driverPreferences.phoneCharging = phoneCharging;
    if (notes !== undefined) user.driverPreferences.notes = notes;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Driver preferences updated successfully',
      driverPreferences: user.driverPreferences
    });
  } catch (error) {
    console.error('Error updating driver preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update driver preferences' 
    });
  }
});

// Get driver preferences
router.get('/driver-preferences', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      driverPreferences: user.driverPreferences || {
        smoking: false,
        music: true,
        chat: true,
        pets: false,
        food: true,
        phoneCharging: true,
        notes: ''
      }
    });
  } catch (error) {
    console.error('Error getting driver preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get driver preferences' 
    });
  }
});

// Update privacy settings
router.put('/privacy-settings', authenticate, async (req, res) => {
  try {
    const { showProfile, showPhone, showRating, showRideHistory, allowMessages, showOnlineStatus } = req.body;
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Initialize privacySettings if not exists
    if (!user.privacySettings) {
      user.privacySettings = {};
    }
    
    if (showProfile !== undefined) user.privacySettings.showProfile = showProfile;
    if (showPhone !== undefined) user.privacySettings.showPhone = showPhone;
    if (showRating !== undefined) user.privacySettings.showRating = showRating;
    if (showRideHistory !== undefined) user.privacySettings.showRideHistory = showRideHistory;
    if (allowMessages !== undefined) user.privacySettings.allowMessages = allowMessages;
    if (showOnlineStatus !== undefined) user.privacySettings.showOnlineStatus = showOnlineStatus;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      privacySettings: user.privacySettings
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update privacy settings' 
    });
  }
});

// Get privacy settings
router.get('/privacy-settings', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      privacySettings: user.privacySettings || {
        showProfile: true,
        showPhone: true,
        showRating: true,
        showRideHistory: true,
        allowMessages: true,
        showOnlineStatus: false
      }
    });
  } catch (error) {
    console.error('Error getting privacy settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get privacy settings' 
    });
  }
});

// Update notification settings
router.put('/notification-settings', authenticate, async (req, res) => {
  try {
    const { rideRequests, rideUpdates, promotions, emailNotifications, smsNotifications } = req.body;
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Initialize notificationSettings if not exists
    if (!user.notificationSettings) {
      user.notificationSettings = {};
    }
    
    if (rideRequests !== undefined) user.notificationSettings.rideRequests = rideRequests;
    if (rideUpdates !== undefined) user.notificationSettings.rideUpdates = rideUpdates;
    if (promotions !== undefined) user.notificationSettings.promotions = promotions;
    if (emailNotifications !== undefined) user.notificationSettings.emailNotifications = emailNotifications;
    if (smsNotifications !== undefined) user.notificationSettings.smsNotifications = smsNotifications;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      notificationSettings: user.notificationSettings
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update notification settings' 
    });
  }
});

// Get notification settings
router.get('/notification-settings', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      notificationSettings: user.notificationSettings || {
        rideRequests: true,
        rideUpdates: true,
        promotions: false,
        emailNotifications: false,
        smsNotifications: true
      }
    });
  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get notification settings' 
    });
  }
});

// Get recent searches
router.get('/recent-searches', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      recentSearches: user.recentSearches
    });
  } catch (error) {
    console.error('Error getting recent searches:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get recent searches' 
    });
  }
});

// Add to recent searches
router.post('/recent-searches', authenticate, async (req, res) => {
  try {
    const { pickup, destination, pickupLat, pickupLng, destLat, destLng, pickupAddress, destAddress } = req.body;
    
    if (!pickup || !destination) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pickup and destination are required' 
      });
    }
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    await user.addRecentSearch({
      pickup,
      destination,
      pickupLat: pickupLat || null,
      pickupLng: pickupLng || null,
      destLat: destLat || null,
      destLng: destLng || null,
      pickupAddress: pickupAddress || pickup,
      destAddress: destAddress || destination
    });
    
    res.json({
      success: true,
      message: 'Search saved to history'
    });
  } catch (error) {
    console.error('Error saving recent search:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save search' 
    });
  }
});

// Clear recent searches
router.delete('/recent-searches', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    user.recentSearches = [];
    await user.save();
    
    res.json({
      success: true,
      message: 'Recent searches cleared'
    });
  } catch (error) {
    console.error('Error clearing recent searches:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to clear searches' 
    });
  }
});

// Get favorite routes
router.get('/favorite-routes', authenticate, async (req, res) => {
  try {
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    res.json({
      success: true,
      favoriteRoutes: user.favoriteRoutes
    });
  } catch (error) {
    console.error('Error getting favorite routes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get favorite routes' 
    });
  }
});

// Add favorite route
router.post('/favorite-routes', authenticate, async (req, res) => {
  try {
    const { name, pickup, destination, pickupLat, pickupLng, destLat, destLng, pickupAddress, destAddress } = req.body;
    
    if (!pickup || !destination) {
      return res.status(400).json({ 
        success: false, 
        error: 'Pickup and destination are required' 
      });
    }
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Check if already exists
    const exists = user.favoriteRoutes.some(f => 
      f.pickup === pickup && f.destination === destination
    );
    
    if (exists) {
      return res.status(400).json({ 
        success: false, 
        error: 'Route already in favorites' 
      });
    }
    
    await user.addFavoriteRoute({
      name: name || `${pickup} → ${destination}`,
      pickup,
      destination,
      pickupLat: pickupLat || null,
      pickupLng: pickupLng || null,
      destLat: destLat || null,
      destLng: destLng || null,
      pickupAddress: pickupAddress || pickup,
      destAddress: destAddress || destination
    });
    
    res.json({
      success: true,
      message: 'Route added to favorites'
    });
  } catch (error) {
    console.error('Error adding favorite route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to add favorite route' 
    });
  }
});

// Remove favorite route
router.delete('/favorite-routes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    await user.removeFavoriteRoute(id);
    
    res.json({
      success: true,
      message: 'Route removed from favorites'
    });
  } catch (error) {
    console.error('Error removing favorite route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to remove favorite route' 
    });
  }
});

// Update favorite route (rename)
router.put('/favorite-routes/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        error: 'Route name is required' 
      });
    }
    
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }
    
    // Find and update the route
    const route = user.favoriteRoutes.find(f => f._id.toString() === id);
    if (!route) {
      return res.status(404).json({ 
        success: false, 
        error: 'Route not found' 
      });
    }
    
    route.name = name.trim();
    await user.save();
    
    res.json({
      success: true,
      message: 'Route renamed successfully',
      route: {
        id: route._id,
        name: route.name,
        pickup: route.pickup,
        destination: route.destination
      }
    });
  } catch (error) {
    console.error('Error renaming favorite route:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to rename route' 
    });
  }
});

// Get user ride history
router.get('/ride-history', authenticate, async (req, res) => {
  try {
    const Ride = (await import('../models/Ride.js')).default;
    const User = (await import('../models/User.js')).default;
    
    const { page = 1, limit = 50, status, mode, startDate, endDate } = req.query;
    
    // Build query filters
    const offeredQuery = { driverPhone: req.phoneNumber };
    const joinedQuery = { 'passengers.phone': req.phoneNumber };
    
    // Filter by status if provided
    if (status && status !== 'all') {
      offeredQuery.status = status;
      joinedQuery.status = status;
    }
    
    // Filter by date range if provided
    if (startDate || endDate) {
      offeredQuery.date = {};
      joinedQuery.date = {};
      if (startDate) {
        offeredQuery.date.$gte = new Date(startDate);
        joinedQuery.date.$gte = new Date(startDate);
      }
      if (endDate) {
        offeredQuery.date.$lte = new Date(endDate);
        joinedQuery.date.$lte = new Date(endDate);
      }
    }
    
    // Get user's driver info to check if they are a driver
    const user = await User.findOne({ phoneNumber: req.phoneNumber });
    const isDriver = user?.driverInfo?.isDriver === true;
    
    // Get rides offered by user (as driver)
    const offeredRides = await Ride.find(offeredQuery)
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Get rides joined by user (as passenger)
    const joinedRides = await Ride.find(joinedQuery)
      .sort({ date: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Calculate earnings for driver mode
    const allOfferedRides = await Ride.find({ driverPhone: req.phoneNumber });
    const totalEarnings = allOfferedRides
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => {
        const filledSeats = r.totalSeats - r.availableSeats;
        return sum + (r.contribution * filledSeats);
      }, 0);
    
    // Calculate total spent as passenger
    const allJoinedRides = await Ride.find({ 'passengers.phone': req.phoneNumber });
    const totalSpent = allJoinedRides
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => {
        const passenger = r.passengers.find(p => p.phone === req.phoneNumber);
        return sum + (r.contribution * (passenger?.seats || 1));
      }, 0);
    
    // Get counts by status for offered rides
    const offeredStats = {
      total: allOfferedRides.length,
      active: allOfferedRides.filter(r => r.status === 'active').length,
      completed: allOfferedRides.filter(r => r.status === 'completed').length,
      cancelled: allOfferedRides.filter(r => r.status === 'cancelled').length,
      full: allOfferedRides.filter(r => r.status === 'full').length,
      expired: allOfferedRides.filter(r => r.status === 'expired').length
    };
    
    // Get counts by status for joined rides
    const joinedStats = {
      total: allJoinedRides.length,
      active: allJoinedRides.filter(r => r.status === 'active').length,
      completed: allJoinedRides.filter(r => r.status === 'completed').length,
      cancelled: allJoinedRides.filter(r => r.status === 'cancelled').length,
      expired: allJoinedRides.filter(r => r.status === 'expired').length
    };
    
    // Map offered rides with comprehensive data
    const mappedOfferedRides = offeredRides.map(r => {
      const passengers = r.passengers || [];
      const filledSeats = r.totalSeats - r.availableSeats;
      
      return {
        id: r._id,
        type: 'offered',
        pickup: r.pickupLocation,
        pickupAddress: r.pickupAddress,
        pickupLat: r.pickupLat,
        pickupLng: r.pickupLng,
        destination: r.destination,
        destAddress: r.destAddress,
        destLat: r.destLat,
        destLng: r.destLng,
        date: r.date,
        time: r.time,
        totalSeats: r.totalSeats,
        availableSeats: r.availableSeats,
        filledSeats: filledSeats,
        contribution: r.contribution,
        totalEarnings: r.contribution * filledSeats,
        status: r.status,
        tags: r.tags || [],
        isRecurring: r.isRecurring,
        recurringDays: r.recurringDays,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        // Passenger details
        passengers: passengers.map(p => ({
          name: p.name,
          phone: p.phone,
          seats: p.seats,
          joinedAt: p.joinedAt
        }))
      };
    });
    
    // Map joined rides with comprehensive data
    const mappedJoinedRides = joinedRides.map(r => {
      const myPassenger = r.passengers?.find(p => p.phone === req.phoneNumber) || {};
      
      return {
        id: r._id,
        type: 'joined',
        pickup: r.pickupLocation,
        pickupAddress: r.pickupAddress,
        pickupLat: r.pickupLat,
        pickupLng: r.pickupLng,
        destination: r.destination,
        destAddress: r.destAddress,
        destLat: r.destLat,
        destLng: r.destLng,
        date: r.date,
        time: r.time,
        totalSeats: r.totalSeats,
        availableSeats: r.availableSeats,
        contribution: r.contribution,
        totalPaid: r.contribution * (myPassenger.seats || 1),
        status: r.status,
        tags: r.tags || [],
        isRecurring: r.isRecurring,
        createdAt: r.createdAt,
        // Driver details
        driver: {
          name: r.driverName,
          phone: r.driverPhone,
          rating: 5.0, // Could be fetched from User model
          totalTrips: 0
        },
        // My booking details
        myBooking: {
          seats: myPassenger.seats || 1,
          joinedAt: myPassenger.joinedAt
        }
      };
    });
    
    res.json({
      success: true,
      isDriver: isDriver,
      mode: mode || (isDriver ? 'driver' : 'passenger'),
      stats: {
        offered: offeredStats,
        joined: joinedStats,
        totalEarnings: totalEarnings,
        totalSpent: totalSpent
      },
      offeredRides: mappedOfferedRides,
      joinedRides: mappedJoinedRides,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalOffered: offeredStats.total,
        totalJoined: joinedStats.total
      }
    });
  } catch (error) {
    console.error('Error getting ride history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get ride history' 
    });
  }
});

// Get specific ride details
router.get('/ride-history/:rideId', authenticate, async (req, res) => {
  try {
    const Ride = (await import('../models/Ride.js')).default;
    
    const { rideId } = req.params;
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }
    
    // Check if user is the driver or a passenger
    const isDriver = ride.driverPhone === req.phoneNumber;
    const isPassenger = ride.passengers?.some(p => p.phone === req.phoneNumber);
    
    if (!isDriver && !isPassenger) {
      return res.status(403).json({
        success: false,
        error: 'You are not authorized to view this ride'
      });
    }
    
    // Build response based on user role
    const response = {
      success: true,
      ride: {
        id: ride._id,
        type: isDriver ? 'offered' : 'joined',
        pickup: ride.pickupLocation,
        pickupAddress: ride.pickupAddress,
        pickupLat: ride.pickupLat,
        pickupLng: ride.pickupLng,
        destination: ride.destination,
        destAddress: ride.destAddress,
        destLat: ride.destLat,
        destLng: ride.destLng,
        date: ride.date,
        time: ride.time,
        totalSeats: ride.totalSeats,
        availableSeats: ride.availableSeats,
        contribution: ride.contribution,
        status: ride.status,
        tags: ride.tags || [],
        isRecurring: ride.isRecurring,
        recurringDays: ride.recurringDays,
        createdAt: ride.createdAt,
        expiresAt: ride.expiresAt
      }
    };
    
    // Add driver info for passengers
    if (!isDriver) {
      response.ride.driver = {
        name: ride.driverName,
        phone: ride.driverPhone,
        rating: 5.0
      };
      
      const myPassenger = ride.passengers.find(p => p.phone === req.phoneNumber);
      response.ride.myBooking = {
        seats: myPassenger?.seats || 1,
        joinedAt: myPassenger?.joinedAt,
        totalPaid: ride.contribution * (myPassenger?.seats || 1)
      };
    }
    
    // Add passenger info for drivers
    if (isDriver) {
      const filledSeats = ride.totalSeats - ride.availableSeats;
      response.ride.passengers = ride.passengers.map(p => ({
        name: p.name,
        phone: p.phone,
        seats: p.seats,
        joinedAt: p.joinedAt
      }));
      response.ride.totalEarnings = ride.contribution * filledSeats;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error getting ride details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ride details'
    });
  }
});

// Update ride status (for drivers)
router.put('/ride-history/:rideId/status', authenticate, async (req, res) => {
  try {
    const Ride = (await import('../models/Ride.js')).default;
    
    const { rideId } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['active', 'completed', 'cancelled', 'expired', 'full'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }
    
    const ride = await Ride.findById(rideId);
    
    if (!ride) {
      return res.status(404).json({
        success: false,
        error: 'Ride not found'
      });
    }
    
    // Only the driver can update status
    if (ride.driverPhone !== req.phoneNumber) {
      return res.status(403).json({
        success: false,
        error: 'Only the driver can update ride status'
      });
    }
    
    ride.status = status;
    await ride.save();
    
    res.json({
      success: true,
      message: 'Ride status updated successfully',
      status: ride.status
    });
  } catch (error) {
    console.error('Error updating ride status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ride status'
    });
  }
});

// Get real-time ride updates
router.get('/ride-history/updates', authenticate, async (req, res) => {
  try {
    const Ride = (await import('../models/Ride.js')).default;
    
    const { lastUpdate } = req.query;
    
    const query = {
      $or: [
        { driverPhone: req.phoneNumber },
        { 'passengers.phone': req.phoneNumber }
      ]
    };
    
    // Only get rides updated after the last update time
    if (lastUpdate) {
      query.updatedAt = { $gt: new Date(lastUpdate) };
    }
    
    const updatedRides = await Ride.find(query)
      .sort({ updatedAt: -1 })
      .limit(20);
    
    res.json({
      success: true,
      rides: updatedRides.map(r => ({
        id: r._id,
        type: r.driverPhone === req.phoneNumber ? 'offered' : 'joined',
        status: r.status,
        availableSeats: r.availableSeats,
        passengers: r.passengers,
        updatedAt: r.updatedAt
      })),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting ride updates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ride updates'
    });
  }
});

export default router;

