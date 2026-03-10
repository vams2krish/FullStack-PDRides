import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import webhookRoutes from './routes/webhook.js';
import telegramWebhookRoutes from './routes/telegram-webhook.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import apiRoutes from './routes/api.js';
import { startScheduledTasks } from './services/scheduler.js';
import { connectDB, healthCheck, pingDB } from './services/database.js';
import { 
  calculateRoute, 
  geocodeAddress, 
  formatDistance, 
  formatDuration,
  calculatePrice,
  calculatePriceWithBreakdown,
  calculateDetailedFare,
  searchLocations,
  reverseGeocode
} from './services/maps.js';
import {
  calculateFare,
  getAvailableRideTypes,
  getMockDriver,
  TRIP_STATUS,
  getTripStatusMessage
} from './services/rideTypes.js';
import { sendTextMessage, sendButtonMessage } from './services/whatsapp.js';
import Ride from './models/Ride.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = process.env.PORT || 3002;

// Enable CORS for demo
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, phoneNumber, token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    app: process.env.APP_NAME || 'PDRides'
  });
});

// Privacy Policy page
app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, '../privacy-policy.html'));
});

// Terms of Service page
app.get('/terms-of-service', (req, res) => {
  res.sendFile(path.join(__dirname, '../terms-of-service.html'));
});

// Welcome page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});


// Serve map view
app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, '../map-view.html'));
});



// Serve registration page
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../register.html'));
});

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

// Serve settings page
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../settings.html'));
});

// Serve help center page
app.get('/help-center', (req, res) => {
  res.sendFile(path.join(__dirname, '../help-center.html'));
});

// Serve contact us page
app.get('/contact-us', (req, res) => {
  res.sendFile(path.join(__dirname, '../contact-us.html'));
});

// Serve browse all rides page
app.get('/browse-all-rides', (req, res) => {
  res.sendFile(path.join(__dirname, '../browse-rides.html'));
});

// Serve my rides page
app.get('/my-rides', (req, res) => {
  res.sendFile(path.join(__dirname, '../my-rides.html'));
});

// Serve ad configuration tool (internal developer tool)
app.get('/ads-config', (req, res) => {
  res.sendFile(path.join(__dirname, '../ads-config.html'));
});

// Serve ride details page (for shareable links)
app.get('/ride/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../ride-details.html'));
});

// API: Get ride details for sharing
app.get('/api/rides/:id', async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    // Calculate route and pricing if coordinates available
    let routeDistance = ride.routeDistance;
    let fareBreakdown = null;
    
    if (ride.pickupLat && ride.pickupLng && ride.destLat && ride.destLng) {
      const route = await calculateRoute(
        ride.pickupLat, ride.pickupLng,
        ride.destLat, ride.destLng
      );
      
      if (route) {
        routeDistance = route.distance;
        // Calculate detailed fare breakdown
        fareBreakdown = calculateDetailedFare(route.distance, ride.totalSeats, 0, 'none');
      }
    }
    
    // Build shareable ride details
    const rideDetails = {
      id: ride._id,
      driverName: ride.driverName,
      driverPhone: ride.driverPhone,
      pickupLocation: ride.pickupLocation,
      destination: ride.destination,
      date: ride.date,
      time: ride.time,
      totalSeats: ride.totalSeats,
      availableSeats: ride.availableSeats,
      contribution: ride.contribution,
      status: ride.status,
      routeDistance: routeDistance,
      distanceFormatted: formatDistance(routeDistance || 0),
      fareBreakdown: fareBreakdown,
      createdAt: ride.createdAt,
      // Shareable link info
      shareUrl: `/ride/${ride._id}`,
      expiresAt: ride.expiresAt
    };
    
    res.json({
      success: true,
      ride: rideDetails
    });
  } catch (error) {
    console.error('Error fetching ride details:', error);
    res.status(500).json({ error: 'Failed to fetch ride details' });
  }
});

// API: Uber-style fare estimate
app.get('/api/fare', async (req, res) => {
  try {
    const { pickup, destination, rideType = 'uberx' } = req.query;
    
    if (!pickup || !destination) {
      return res.status(400).json({ error: 'Pickup and destination are required' });
    }

    const pickupCoords = await geocodeAddress(pickup);
    const destCoords = await geocodeAddress(destination);
    
    if (!pickupCoords || !destCoords) {
      return res.status(400).json({ error: 'Could not geocode one or both locations' });
    }

    const route = await calculateRoute(
      pickupCoords.lat, pickupCoords.lon, destCoords.lat, destCoords.lon
    );

    if (!route) {
      return res.status(400).json({ error: 'Could not calculate route' });
    }

    const rideTypes = getAvailableRideTypes();
    const fares = rideTypes.map(rt => calculateFare(route.distance, route.duration, rt.id));

    res.json({
      success: true,
      pickup: { address: pickupCoords.display_name, lat: pickupCoords.lat, lon: pickupCoords.lon },
      destination: { address: destCoords.display_name, lat: destCoords.lat, lon: destCoords.lon },
      distance: route.distance,
      duration: route.duration,
      distanceFormatted: formatDistance(route.distance),
      durationFormatted: formatDuration(route.duration),
      fares: fares,
      currency: 'USD'
    });
  } catch (error) {
    console.error('Fare calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate fare' });
  }
});

// API: Instant ride booking (Uber-style)
app.post('/api/ride/book', async (req, res) => {
  try {
    const { pickup, destination, rideType, phoneNumber, pickupLat, pickupLng, destLat, destLng } = req.body;
    
    if (!pickup || !destination || !phoneNumber) {
      return res.status(400).json({ error: 'Pickup, destination, and phone number are required' });
    }

    let route = null;
    let fare = null;
    
    if (pickupLat && destLat) {
      route = await calculateRoute(pickupLat, pickupLng, destLat, destLng);
      if (route) {
        fare = calculateFare(route.distance, route.duration, rideType || 'uberx');
      }
    }

    const driver = getMockDriver();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const ride = new Ride({
      driverPhone: driver.phone,
      driverName: driver.name,
      pickupLocation: pickup,
      destination: destination,
      date: new Date(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      totalSeats: 1,
      availableSeats: 1,
      contribution: fare?.totalFare || 10,
      status: 'active',
      expiresAt
    });

    await ride.save();

    await sendTextMessage(phoneNumber,
      `🎉 *Ride Confirmed!*\n\n📍 Pickup: ${pickup}\n🏁 Destination: ${destination}\n\n🚗 *Driver Details*\n👤 ${driver.name}\n⭐ Rating: ${driver.rating}\n🚙 ${driver.vehicleInfo}\n🔢 Plates: ${driver.licensePlate}\n\n💰 Fare: $${fare?.totalFare || '10.00'}\n⏱️ ETA: ${fare?.durationMinutes || '15'} min\n\nYour driver is on the way!`
    );

    res.json({
      success: true,
      message: 'Ride booked successfully',
      bookingId: ride._id,
      driver: driver,
      fare: fare,
      etaMinutes: fare?.durationMinutes || 15
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to book ride' });
  }
});

// API: Get available rides with pricing
app.get('/api/rides', async (req, res) => {
  try {
    const { pickup, destination, date, seats = 1 } = req.query;
    
    let query = {
      status: 'active',
      expiresAt: { $gt: new Date() },
      availableSeats: { $gte: parseInt(seats) || 1 }
    };

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: searchDate, $lt: nextDay };
    }

    if (pickup) {
      query.$or = [
        { pickupLocation: { $regex: pickup, $options: 'i' } }
      ];
    }

    const rides = await Ride.find(query).sort({ date: 1 }).limit(20);

    const ridesWithPricing = await Promise.all(rides.map(async (ride) => {
      let distance = ride.routeDistance;
      let price = ride.contribution;
      
      if (ride.pickupLat && ride.pickupLng && ride.destLat && ride.destLng && !distance) {
        const route = await calculateRoute(
          ride.pickupLat, ride.pickupLng,
          ride.destLat, ride.destLng
        );
        if (route) {
          distance = route.distance;
          price = calculatePrice(distance, parseInt(seats));
        }
      }

      return {
        ...ride.toObject(),
        calculatedPrice: price || ride.contribution,
        distanceFormatted: formatDistance(distance),
        totalPrice: (price || ride.contribution) * parseInt(seats)
      };
    }));

    res.json({
      success: true,
      rides: ridesWithPricing,
      count: ridesWithPricing.length
    });
  } catch (error) {
    console.error('Error fetching rides:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// API: Create a new ride (for drivers)
app.post('/api/rides', async (req, res) => {
  try {
    const { 
      driverPhone, 
      driverName,
      pickup, 
      destination, 
      date, 
      time, 
      seats, 
      contribution,
      pickupLat,
      pickupLng,
      destLat,
      destLng
    } = req.body;

    // Validate required fields
    if (!driverPhone || !pickup || !destination || !date || !time || !seats) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: driverPhone, pickup, destination, date, time, seats' 
      });
    }

    // Get driver info from database
    const driver = await User.findOne({ phoneNumber: driverPhone });
    if (!driver) {
      return res.status(404).json({ 
        success: false,
        error: 'Driver not found' 
      });
    }

    // Check if user is registered as driver
    if (!driver.driverInfo || !driver.driverInfo.isDriver) {
      return res.status(403).json({ 
        success: false,
        error: 'User is not registered as a driver' 
      });
    }

    // Calculate route and price if coordinates provided
    let routeDistance = null;
    let calculatedPrice = contribution;

    if (pickupLat && destLat) {
      const route = await calculateRoute(pickupLat, pickupLng, destLat, destLng);
      if (route) {
        routeDistance = route.distance;
        // Auto-calculate price if not provided
        if (!contribution) {
          calculatedPrice = calculatePrice(routeDistance, parseInt(seats));
        }
      }
    }

    // Set expiration (24 hours from now for one-time rides)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create the ride
    const ride = new Ride({
      driverPhone: driverPhone,
      driverName: driverName || driver.name || 'Anonymous Driver',
      pickupLocation: pickup,
      destination: destination,
      pickupLat: pickupLat || null,
      pickupLng: pickupLng || null,
      destLat: destLat || null,
      destLng: destLng || null,
      date: new Date(date),
      time: time,
      totalSeats: parseInt(seats),
      availableSeats: parseInt(seats),
      contribution: calculatedPrice || 0,
      status: 'active',
      expiresAt: expiresAt,
      routeDistance: routeDistance
    });

    await ride.save();

    // Update driver's total trips
    if (driver.driverInfo) {
      driver.driverInfo.totalTrips = (driver.driverInfo.totalTrips || 0) + 1;
      await driver.save();
    }

    res.json({
      success: true,
      message: 'Ride created successfully',
      ride: {
        id: ride._id,
        pickup: ride.pickupLocation,
        destination: ride.destination,
        date: ride.date,
        time: ride.time,
        seats: ride.totalSeats,
        availableSeats: ride.availableSeats,
        contribution: ride.contribution,
        status: ride.status
      }
    });
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create ride' 
    });
  }
});

// API: Book ride with real-time pricing
app.post('/api/rides/:id/book', async (req, res) => {
  try {
    const { phoneNumber, passengerName, seats = 1 } = req.body;
    const ride = await Ride.findById(req.params.id);

    if (!ride || ride.status !== 'active' || ride.availableSeats < seats) {
      return res.status(400).json({ error: 'Ride not available' });
    }

    let price = ride.contribution;
    if (ride.routeDistance) {
      price = calculatePrice(ride.routeDistance, parseInt(seats));
    }

    const message = `🚗 *New Booking Request!*\n\nPassenger: ${phoneNumber}\nSeats: ${seats}\nPrice: $${price * seats}\n\nReply YES to accept or NO to decline.`;
    await sendTextMessage(ride.driverPhone, message);

    res.json({
      success: true,
      message: 'Booking request sent to driver',
      estimatedPrice: price * seats,
      driverPhone: ride.driverPhone
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Failed to book ride' });
  }
});

// WhatsApp Sync: Send ride details to WhatsApp
app.post('/api/whatsapp/send-ride', async (req, res) => {
  try {
    const { phoneNumber, pickup, destination, date, time, price, seats } = req.body;

    const message = `🚗 *Ride Found!*\n\n📍 From: ${pickup}\n🏁 To: ${destination}\n📅 Date: ${date}\n⏰ Time: ${time}\n💺 Seats: ${seats}\n💰 Total: $${price}\n\nWould you like to book this ride?`;

    const buttons = [
      { id: 'book_yes', title: '✅ Book Now' },
      { id: 'book_no', title: '❌ Cancel' }
    ];

    await sendButtonMessage(phoneNumber, message, buttons);

    res.json({ success: true, message: 'Ride details sent to WhatsApp' });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

// WhatsApp: Send direct message to user
app.post('/api/whatsapp/send-message', async (req, res) => {
  try {
    const { phoneNumber, message, type = 'text' } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    await sendTextMessage(phoneNumber, message);

    res.json({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('WhatsApp send error:', error);
    res.status(500).json({ error: 'Failed to send WhatsApp message' });
  }
});

// API: Location autocomplete
app.get('/api/autocomplete', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 3) {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await searchLocations(q, 5);
    res.json({ success: true, suggestions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// API: Reverse geocode (coordinates to address)
app.get('/api/reverse-geocode', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const address = await reverseGeocode(parseFloat(lat), parseFloat(lon));
    
    if (!address) {
      return res.status(400).json({ error: 'Could not reverse geocode' });
    }

    res.json({ success: true, address: address.display_name });
  } catch (error) {
    console.error('Reverse geocode error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode' });
  }
});

// Auth routes
app.use('/api/auth', authRoutes);

// User routes (protected)
app.use('/api/user', userRoutes);

// New unified API routes
app.use('/api', apiRoutes);

// Webhook routes
app.use('/webhook', webhookRoutes);

// Telegram webhook routes
app.use('/telegram-webhook', telegramWebhookRoutes);

// Ads API routes
import adRoutes from './routes/ads.js';
app.use('/api', adRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Use new database service with proper connection handling
    await connectDB();
    console.log('Database connection established');

    startScheduledTasks();

    app.listen(PORT, () => {
      console.log(`🚀 ${process.env.APP_NAME || 'PDRides'} server running on port ${PORT}`);
      console.log(`📱 Webhook endpoint: http://localhost:${PORT}/webhook`);
      console.log(`📡 API endpoint: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
