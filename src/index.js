import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import webhookRoutes from './routes/webhook.js';
import { startScheduledTasks } from './services/scheduler.js';
import { 
  calculateRoute, 
  geocodeAddress, 
  formatDistance, 
  formatDuration,
  calculatePrice
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
const PORT = process.env.PORT || 3000;

// Enable CORS for demo
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

// Welcome page
app.get('/', (req, res) => {

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PDRides - WhatsApp Carpool Bot</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .container { 
          text-align: center; 
          color: white;
          padding: 40px;
          max-width: 600px;
        }
        h1 { font-size: 3rem; margin-bottom: 20px; }
        p { font-size: 1.2rem; margin-bottom: 30px; opacity: 0.9; }
        .feature {
          background: rgba(255,255,255,0.15);
          padding: 15px 20px;
          border-radius: 10px;
          margin: 10px 0;
          text-align: left;
        }
        .btn {
          display: inline-block;
          background: #25D366;
          color: white;
          padding: 15px 30px;
          border-radius: 25px;
          text-decoration: none;
          font-weight: bold;
          margin: 10px;
          transition: transform 0.2s;
        }
        .btn:hover { transform: scale(1.05); }
        .status { 
          margin-top: 30px; 
          padding: 15px; 
          background: rgba(0,0,0,0.2); 
          border-radius: 10px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🚗 PDRides</h1>
        <p>Community Carpooling via WhatsApp</p>
        
        <div class="feature">
          <strong>🚙 Offer a Ride</strong> - Share your ride with community members
        </div>
        <div class="feature">
          <strong>🔍 Find a Ride</strong> - Search and book available rides
        </div>
        <div class="feature">
          <strong>💬 WhatsApp Integration</strong> - Easy booking via chat
        </div>
        
        <div class="status">
          <strong>✅ Bot Status:</strong> Connected & Running<br>
          <strong>🔗 Webhook:</strong> ${process.env.WEB_APP_URL ? process.env.WEB_APP_URL.replace('/webhook', '') + '/webhook' : 'Configure WEB_APP_URL in .env'}
        </div>
        
        <br><br>
        <a href="/map" class="btn">🗺️ Open Map View</a>
        <a href="/health" class="btn">💚 Health Check</a>
      </div>
    </body>
    </html>
  `);
});


// Serve map view
app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, '../map-view.html'));
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

// API: Calculate route with real-time pricing
app.get('/api/route', async (req, res) => {
  try {
    const { pickup, destination, seats = 1 } = req.query;
    
    if (!pickup || !destination) {
      return res.status(400).json({ error: 'Pickup and destination are required' });
    }

    const pickupCoords = await geocodeAddress(pickup);
    const destCoords = await geocodeAddress(destination);
    
    if (!pickupCoords || !destCoords) {
      return res.status(400).json({ error: 'Could not geocode one or both locations' });
    }

    const route = await calculateRoute(
      pickupCoords.lat,
      pickupCoords.lon,
      destCoords.lat,
      destCoords.lon
    );

    if (!route) {
      return res.status(400).json({ error: 'Could not calculate route' });
    }

    const price = calculatePrice(route.distance, parseInt(seats) || 1);
    const pricePerSeat = calculatePrice(route.distance, 1);

    res.json({
      success: true,
      pickup: {
        address: pickupCoords.display_name,
        lat: pickupCoords.lat,
        lon: pickupCoords.lon
      },
      destination: {
        address: destCoords.display_name,
        lat: destCoords.lat,
        lon: destCoords.lon
      },
      distance: route.distance,
      duration: route.duration,
      distanceFormatted: formatDistance(route.distance),
      durationFormatted: formatDuration(route.duration),
      price: price,
      pricePerSeat: pricePerSeat,
      currency: 'USD',
      geometry: route.geometry,
      seats: parseInt(seats) || 1
    });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate route' });
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

// API: Book ride with real-time pricing
app.post('/api/rides/:id/book', async (req, res) => {
  try {
    const { phoneNumber, seats = 1 } = req.body;
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

// Webhook routes
app.use('/webhook', webhookRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdrides');
    console.log('Connected to MongoDB');

    startScheduledTasks();

    app.listen(PORT, () => {
      console.log(`🚀 ${process.env.APP_NAME || 'PDRides'} server running on port ${PORT}`);
      console.log(`📱 Webhook endpoint: http://localhost:${PORT}/webhook`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
