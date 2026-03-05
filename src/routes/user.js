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

// Get user ride history
router.get('/ride-history', authenticate, async (req, res) => {
  try {
    const Ride = (await import('../models/Ride.js')).default;
    
    const { page = 1, limit = 10 } = req.query;
    
    // Get rides offered by user
    const offeredRides = await Ride.find({ driverPhone: req.phoneNumber })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    // Get rides joined by user
    const joinedRides = await Ride.find({ 
      'passengers.phone': req.phoneNumber 
    })
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    res.json({
      success: true,
      offeredRides: offeredRides.map(r => ({
        id: r._id,
        type: 'offered',
        pickup: r.pickupLocation,
        destination: r.destination,
        date: r.date,
        time: r.time,
        seats: r.totalSeats,
        contribution: r.contribution,
        status: r.status
      })),
      joinedRides: joinedRides.map(r => ({
        id: r._id,
        type: 'joined',
        pickup: r.pickupLocation,
        destination: r.destination,
        date: r.date,
        time: r.time,
        contribution: r.contribution,
        status: r.status,
        driverName: r.driverName
      }))
    });
  } catch (error) {
    console.error('Error getting ride history:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get ride history' 
    });
  }
});

export default router;

