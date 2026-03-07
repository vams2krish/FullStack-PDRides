/**
 * API Routes
 * Unified REST API endpoints for all operations
 */

import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import * as userService from '../services/userService.js';
import * as rideService from '../services/rideService.js';
import * as crud from '../services/crud.js';
import { healthCheck, pingDB, getDBStats, getCollectionStats } from '../services/database.js';
import * as maps from '../services/maps.js';

const router = express.Router();

// ============================================
// HEALTH & STATUS ENDPOINTS
// ============================================

/**
 * GET /api/health - Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ping - Ping database
 */
router.get('/ping', async (req, res) => {
  try {
    const result = await pingDB();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/stats - Database statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [dbStats, collectionStats] = await Promise.all([
      getDBStats(),
      getCollectionStats()
    ]);
    res.json({ success: true, dbStats, collectionStats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// MAPS & ROUTE ENDPOINTS
// ============================================

/**
 * GET /api/route - Calculate route and pricing between two locations
 */
router.get('/route', async (req, res) => {
  try {
    const { pickup, destination, seats = 1, adults = 1, children = 0, childSeatType = 'none' } = req.query;
    
    if (!pickup || !destination) {
      return res.status(400).json({ success: false, error: 'Pickup and destination are required' });
    }
    
    // Geocode pickup location
    const pickupGeocoded = await maps.geocodeAddress(pickup);
    if (!pickupGeocoded) {
      return res.status(400).json({ success: false, error: 'Could not find pickup location' });
    }
    
    // Geocode destination location
    const destGeocoded = await maps.geocodeAddress(destination);
    if (!destGeocoded) {
      return res.status(400).json({ success: false, error: 'Could not find destination location' });
    }
    
    // Calculate route
    const route = await maps.calculateRoute(
      pickupGeocoded.lat,
      pickupGeocoded.lon,
      destGeocoded.lat,
      destGeocoded.lon
    );
    
    if (!route) {
      return res.status(400).json({ success: false, error: 'Could not calculate route' });
    }
    
    // Calculate price with breakdown
    const priceInfo = maps.calculatePriceWithBreakdown(
      route.distance,
      parseInt(adults),
      parseInt(children),
      childSeatType
    );
    
    res.json({
      success: true,
      pickup: {
        lat: pickupGeocoded.lat,
        lng: pickupGeocoded.lon,
        address: pickupGeocoded.display_name
      },
      destination: {
        lat: destGeocoded.lat,
        lng: destGeocoded.lon,
        address: destGeocoded.display_name
      },
      distance: route.distance,
      distanceFormatted: maps.formatDistance(route.distance),
      duration: route.duration,
      durationFormatted: maps.formatDuration(route.duration),
      geometry: route.geometry,
      pricePerSeat: priceInfo.pricePerAdult,
      pricePerAdult: priceInfo.pricePerAdult,
      pricePerChild: priceInfo.pricePerChild,
      totalPrice: priceInfo.totalPrice,
      adults: parseInt(adults),
      children: parseInt(children),
      childSeatType
    });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/autocomplete - Get location autocomplete suggestions
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }
    
    const suggestions = await maps.searchLocations(q, parseInt(limit));
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/reverse-geocode - Convert coordinates to address
 */
router.get('/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }
    
    const result = await maps.reverseGeocode(parseFloat(lat), parseFloat(lon));
    
    if (!result) {
      return res.status(404).json({ success: false, error: 'Could not find address for location' });
    }
    
    res.json({
      success: true,
      address: result.display_name,
      details: result.address
    });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * GET /api/users/me - Get current user profile
 */
router.get('/users/me', authenticate, async (req, res) => {
  try {
    const profile = await userService.getUserProfile(req.phoneNumber);
    res.json({ success: true, profile });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/me - Update current user profile
 */
router.put('/users/me', authenticate, async (req, res) => {
  try {
    const { name, email, preferences, emergencyContact } = req.body;
    const user = await userService.updateProfile(req.phoneNumber, {
      name,
      email,
      preferences,
      emergencyContact
    });
    res.json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/driver-info - Get driver info
 */
router.get('/users/me/driver-info', authenticate, async (req, res) => {
  try {
    const user = await userService.getUserByPhone(req.phoneNumber);
    res.json({ success: true, driverInfo: user.driverInfo });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/me/driver-info - Update driver info
 */
router.put('/users/me/driver-info', authenticate, async (req, res) => {
  try {
    const user = await userService.updateDriverInfo(req.phoneNumber, req.body);
    res.json({ success: true, driverInfo: user.driverInfo });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/privacy-settings - Get privacy settings
 */
router.get('/users/me/privacy-settings', authenticate, async (req, res) => {
  try {
    const user = await userService.getUserByPhone(req.phoneNumber);
    res.json({ success: true, privacySettings: user.privacySettings });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/me/privacy-settings - Update privacy settings
 */
router.put('/users/me/privacy-settings', authenticate, async (req, res) => {
  try {
    const settings = await userService.updatePrivacySettings(req.phoneNumber, req.body);
    res.json({ success: true, privacySettings: settings });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/notification-settings - Get notification settings
 */
router.get('/users/me/notification-settings', authenticate, async (req, res) => {
  try {
    const user = await userService.getUserByPhone(req.phoneNumber);
    res.json({ success: true, notificationSettings: user.notificationSettings });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/users/me/notification-settings - Update notification settings
 */
router.put('/users/me/notification-settings', authenticate, async (req, res) => {
  try {
    const settings = await userService.updateNotificationSettings(req.phoneNumber, req.body);
    res.json({ success: true, notificationSettings: settings });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/recent-searches - Get recent searches
 */
router.get('/users/me/recent-searches', authenticate, async (req, res) => {
  try {
    const user = await userService.getUserByPhone(req.phoneNumber);
    res.json({ success: true, recentSearches: user.recentSearches });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/me/recent-searches - Add recent search
 */
router.post('/users/me/recent-searches', authenticate, async (req, res) => {
  try {
    const searches = await userService.addRecentSearch(req.phoneNumber, req.body);
    res.json({ success: true, recentSearches: searches });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users/me/recent-searches - Clear recent searches
 */
router.delete('/users/me/recent-searches', authenticate, async (req, res) => {
  try {
    await userService.getUserByPhone(req.phoneNumber);
    // Clear searches
    await crud.userCrud.updateByPhone(req.phoneNumber, { recentSearches: [] });
    res.json({ success: true, message: 'Recent searches cleared' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/favorite-routes - Get favorite routes
 */
router.get('/users/me/favorite-routes', authenticate, async (req, res) => {
  try {
    const user = await userService.getUserByPhone(req.phoneNumber);
    res.json({ success: true, favoriteRoutes: user.favoriteRoutes });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/me/favorite-routes - Add favorite route
 */
router.post('/users/me/favorite-routes', authenticate, async (req, res) => {
  try {
    const routes = await userService.addFavoriteRoute(req.phoneNumber, req.body);
    res.json({ success: true, favoriteRoutes: routes });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users/me/favorite-routes/:id - Remove favorite route
 */
router.delete('/users/me/favorite-routes/:id', authenticate, async (req, res) => {
  try {
    const routes = await userService.removeFavoriteRoute(req.phoneNumber, req.params.id);
    res.json({ success: true, favoriteRoutes: routes });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/stats - Get user ride statistics
 */
router.get('/users/me/stats', authenticate, async (req, res) => {
  try {
    const stats = await rideService.getUserRideStats(req.phoneNumber);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/users/me/account - Delete user account
 */
router.delete('/users/me/account', authenticate, async (req, res) => {
  try {
    const { scheduledDeletion } = req.body;
    if (scheduledDeletion) {
      const result = await userService.scheduleAccountDeletion(req.phoneNumber);
      res.json({ success: true, ...result });
    } else {
      await userService.deleteAccount(req.phoneNumber);
      res.json({ success: true, message: 'Account deleted successfully' });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/users/me/account/cancel-deletion - Cancel account deletion
 */
router.post('/users/me/account/cancel-deletion', authenticate, async (req, res) => {
  try {
    const result = await userService.cancelAccountDeletion(req.phoneNumber);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// RIDE ENDPOINTS
// ============================================

/**
 * GET /api/rides - Search rides
 */
router.get('/rides', optionalAuth, async (req, res) => {
  try {
    const {
      pickup,
      destination,
      date,
      seats = 1,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'asc',
      minPrice,
      maxPrice
    } = req.query;

    const filters = {
      pickup,
      destination,
      date: date ? new Date(date) : undefined,
      seats: parseInt(seats),
      tags: tags ? tags.split(',') : undefined,
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      sortOrder,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
    };

    const result = await rideService.searchRides(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rides - Create a new ride
 */
router.post('/rides', authenticate, async (req, res) => {
  try {
    const ride = await rideService.createRide({
      ...req.body,
      driverPhone: req.phoneNumber
    });
    res.status(201).json({ success: true, ride });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rides/:id - Get ride details
 */
router.get('/rides/:id', optionalAuth, async (req, res) => {
  try {
    const ride = await rideService.getRideById(req.params.id);
    res.json({ success: true, ride });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/rides/:id - Update ride
 */
router.put('/rides/:id', authenticate, async (req, res) => {
  try {
    const ride = await crud.rideCrud.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    if (ride.driverPhone !== req.phoneNumber) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const updated = await crud.rideCrud.update(req.params.id, req.body);
    res.json({ success: true, ride: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/rides/:id - Delete ride
 */
router.delete('/rides/:id', authenticate, async (req, res) => {
  try {
    const ride = await crud.rideCrud.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    if (ride.driverPhone !== req.phoneNumber) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await crud.rideCrud.delete(req.params.id);
    res.json({ success: true, message: 'Ride deleted' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rides/:id/book - Book a ride
 */
router.post('/rides/:id/book', authenticate, async (req, res) => {
  try {
    const { name, seats = 1 } = req.body;
    const user = await userService.getUserByPhone(req.phoneNumber);
    
    const ride = await rideService.bookRide(req.params.id, {
      phoneNumber: req.phoneNumber,
      name: name || user.name,
      seats
    });
    
    res.json({ success: true, ride });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rides/:id/cancel-booking - Cancel booking
 */
router.post('/rides/:id/cancel-booking', authenticate, async (req, res) => {
  try {
    const ride = await rideService.cancelBooking(req.params.id, req.phoneNumber);
    res.json({ success: true, ride });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rides/:id/cancel - Cancel ride (driver)
 */
router.post('/rides/:id/cancel', authenticate, async (req, res) => {
  try {
    const ride = await rideService.cancelRide(req.params.id, req.phoneNumber);
    res.json({ success: true, ride });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/rides/:id/complete - Complete ride (driver)
 */
router.post('/rides/:id/complete', authenticate, async (req, res) => {
  try {
    const ride = await rideService.completeRide(req.params.id, req.phoneNumber);
    res.json({ success: true, ride });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/rides/:id/status - Get ride status
 */
router.get('/rides/:id/status', authenticate, async (req, res) => {
  try {
    const ride = await crud.rideCrud.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }

    // Check if user is driver or passenger
    const isDriver = ride.driverPhone === req.phoneNumber;
    const isPassenger = ride.passengers?.some(p => p.phone === req.phoneNumber);

    if (!isDriver && !isPassenger) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    res.json({
      success: true,
      status: ride.status,
      availableSeats: ride.availableSeats,
      passengers: isDriver ? ride.passengers : undefined
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/rides/:id/status - Update ride status
 */
router.put('/rides/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const ride = await crud.rideCrud.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ success: false, error: 'Ride not found' });
    }
    if (ride.driverPhone !== req.phoneNumber) {
      return res.status(403).json({ success: false, error: 'Only driver can update status' });
    }

    const updated = await crud.rideCrud.updateStatus(req.params.id, status);
    res.json({ success: true, ride: updated });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// USER RIDES ENDPOINTS
// ============================================

/**
 * GET /api/users/me/rides - Get user's rides
 */
router.get('/users/me/rides', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const rides = await rideService.getUserRides(req.phoneNumber, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json({ success: true, ...rides });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/rides/offered - Get rides offered by user
 */
router.get('/users/me/rides/offered', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await crud.rideCrud.findByDriver(req.phoneNumber, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/users/me/rides/joined - Get rides joined by user
 */
router.get('/users/me/rides/joined', authenticate, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const result = await crud.rideCrud.findByPassenger(req.phoneNumber, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/admin/stats - Platform statistics
 */
router.get('/admin/stats', authenticate, async (req, res) => {
  try {
    // In production, add admin role check
    const stats = await userService.getPlatformStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/users - Get all users (paginated)
 */
router.get('/admin/users', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await crud.userCrud.findAll({
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/rides - Get all rides (paginated)
 */
router.get('/admin/rides', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filters = status ? { status } : {};
    const result = await crud.rideCrud.findAll(filters, {
      page: parseInt(page),
      limit: parseInt(limit)
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CONVERSATION ENDPOINTS
// ============================================

/**
 * GET /api/conversations/:phoneNumber - Get conversation
 */
router.get('/conversations/:phoneNumber', async (req, res) => {
  try {
    const conversation = await crud.conversationCrud.findByPhone(req.params.phoneNumber);
    res.json({ success: true, conversation });
  } catch (error) {
    res.status(404).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/conversations/:phoneNumber/reset - Reset conversation
 */
router.post('/conversations/:phoneNumber/reset', async (req, res) => {
  try {
    await crud.conversationCrud.reset(req.params.phoneNumber);
    res.json({ success: true, message: 'Conversation reset' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;

