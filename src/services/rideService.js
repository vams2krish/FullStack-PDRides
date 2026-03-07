/**
 * Ride Service
 * Business logic for ride management
 */

import Ride from '../models/Ride.js';
import User from '../models/User.js';
import { calculateRoute, formatDistance, formatDuration } from './maps.js';
import { calculatePrice } from './maps.js';
import { sendTextMessage } from './whatsapp.js';

/**
 * Create a new ride with validation and route calculation
 */
export const createRide = async (rideData) => {
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
    destLng,
    tags = []
  } = rideData;

  // Validate required fields
  if (!driverPhone || !pickup || !destination || !date || !time || !seats) {
    throw new Error('Missing required fields');
  }

  // Get driver info
  const driver = await User.findOne({ phoneNumber: driverPhone });
  if (!driver) {
    throw new Error('Driver not found');
  }

  // Calculate route and price if coordinates provided
  let routeDistance = null;
  let calculatedPrice = contribution || 0;

  if (pickupLat && destLat && pickupLng && destLng) {
    const route = await calculateRoute(pickupLat, pickupLng, destLat, destLng);
    if (route) {
      routeDistance = route.distance;
      if (!contribution) {
        calculatedPrice = calculatePrice(route.distance, parseInt(seats));
      }
    }
  }

  // Set expiration (24 hours for one-time rides)
  const expiresAt = new Date(date);
  expiresAt.setHours(expiresAt.getHours() + 24);

  // Create ride
  const ride = new Ride({
    driverPhone,
    driverName: driverName || driver.name || 'Anonymous Driver',
    pickupLocation: pickup,
    destination: destination,
    pickupLat: pickupLat || null,
    pickupLng: pickupLng || null,
    destLat: destLat || null,
    destLng: destLng || null,
    date: new Date(date),
    time,
    totalSeats: parseInt(seats),
    availableSeats: parseInt(seats),
    contribution: calculatedPrice,
    tags,
    status: 'active',
    expiresAt,
    routeDistance
  });

  await ride.save();

  // Update driver stats
  if (driver.driverInfo) {
    driver.driverInfo.totalTrips = (driver.driverInfo.totalTrips || 0) + 1;
    await driver.save();
  }

  return ride;
};

/**
 * Search rides with advanced filtering
 */
export const searchRides = async (filters) => {
  const {
    pickup,
    destination,
    date,
    seats = 1,
    tags = [],
    page = 1,
    limit = 20,
    sortBy = 'date',
    sortOrder = 'asc',
    minPrice,
    maxPrice
  } = filters;

  const query = {
    status: 'active',
    expiresAt: { $gt: new Date() },
    availableSeats: { $gte: seats }
  };

  // Date filter
  if (date) {
    const searchDate = new Date(date);
    const nextDay = new Date(searchDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = { $gte: searchDate, $lt: nextDay };
  } else {
    // Default: only show future rides
    query.date = { $gte: new Date() };
  }

  // Location filter
  if (pickup || destination) {
    query.$or = [];
    if (pickup) {
      query.$or.push({ pickupLocation: { $regex: pickup, $options: 'i' } });
    }
    if (destination) {
      query.$or.push({ destination: { $regex: destination, $options: 'i' } });
    }
  }

  // Price filter
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.contribution = {};
    if (minPrice !== undefined) query.contribution.$gte = minPrice;
    if (maxPrice !== undefined) query.contribution.$lte = maxPrice;
  }

  // Tags filter
  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  // Sorting
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const rides = await Ride.find(query)
    .sort(sortOptions)
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Ride.countDocuments(query);

  // Enhance rides with additional data
  const enhancedRides = await Promise.all(rides.map(async (ride) => {
    const enhanced = ride.toObject();
    
    // Calculate distance if not stored
    if (!enhanced.routeDistance && ride.pickupLat && ride.destLat) {
      try {
        const route = await calculateRoute(
          ride.pickupLat, ride.pickupLng,
          ride.destLat, ride.destLng
        );
        if (route) {
          enhanced.routeDistance = route.distance;
          enhanced.distanceFormatted = formatDistance(route.distance);
          enhanced.durationFormatted = formatDuration(route.duration);
        }
      } catch (e) {
        // Ignore routing errors
      }
    }
    
    enhanced.distanceFormatted = formatDistance(enhanced.routeDistance || 0);
    
    return enhanced;
  }));

  return {
    data: enhancedRides,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
};

/**
 * Get ride by ID with full details
 */
export const getRideById = async (rideId) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  const rideObj = ride.toObject();

  // Get driver info
  const driver = await User.findOne({ phoneNumber: ride.driverPhone });
  if (driver) {
    rideObj.driver = {
      name: driver.name,
      phoneNumber: driver.phoneNumber,
      rating: driver.rating,
      totalRatings: driver.totalRatings,
      rideCount: driver.rideCount,
      driverInfo: driver.driverInfo
    };
  }

  // Calculate route if coordinates available
  if (ride.pickupLat && ride.pickupLng && ride.destLat && ride.destLng) {
    try {
      const route = await calculateRoute(
        ride.pickupLat, ride.pickupLng,
        ride.destLat, ride.destLng
      );
      if (route) {
        rideObj.route = {
          distance: route.distance,
          duration: route.duration,
          distanceFormatted: formatDistance(route.distance),
          durationFormatted: formatDuration(route.duration),
          geometry: route.geometry
        };
      }
    } catch (e) {
      // Ignore routing errors
    }
  }

  return rideObj;
};

/**
 * Book a seat on a ride
 */
export const bookRide = async (rideId, passengerData) => {
  const { phoneNumber, name, seats = 1 } = passengerData;

  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (ride.status !== 'active') {
    throw new Error('Ride is not available');
  }

  if (ride.availableSeats < seats) {
    throw new Error('Not enough seats available');
  }

  // Check if already booked
  const alreadyBooked = ride.passengers.some(p => p.phone === phoneNumber);
  if (alreadyBooked) {
    throw new Error('Already booked on this ride');
  }

  // Add passenger
  ride.passengers.push({
    phone: phoneNumber,
    name: name || 'Anonymous',
    seats,
    joinedAt: new Date()
  });
  ride.availableSeats -= seats;

  if (ride.availableSeats === 0) {
    ride.status = 'full';
  }

  await ride.save();

  // Update passenger stats
  const passenger = await User.findOne({ phoneNumber });
  if (passenger) {
    passenger.rideCount = (passenger.rideCount || 0) + 1;
    await passenger.save();
  }

  // Notify driver
  try {
    await sendTextMessage(ride.driverPhone,
      `🚗 *New Booking!*\n\n` +
      `Passenger: ${name || phoneNumber}\n` +
      `Seats: ${seats}\n` +
      `Total: $${ride.contribution * seats}\n\n` +
      `Your ride: ${ride.pickupLocation} → ${ride.destination}`
    );
  } catch (e) {
    console.log('Failed to notify driver:', e.message);
  }

  return ride;
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (rideId, phoneNumber) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  const passengerIndex = ride.passengers.findIndex(p => p.phone === phoneNumber);
  if (passengerIndex === -1) {
    throw new Error('Booking not found');
  }

  const passenger = ride.passengers[passengerIndex];
  ride.passengers.splice(passengerIndex, 1);
  ride.availableSeats += passenger.seats;

  if (ride.status === 'full') {
    ride.status = 'active';
  }

  await ride.save();

  // Notify driver
  try {
    await sendTextMessage(ride.driverPhone,
      `❌ *Booking Cancelled*\n\n` +
      `Passenger: ${passenger.name || phoneNumber}\n` +
      `Seats: ${passenger.seats}\n\n` +
      `${ride.availableSeats} seats now available`
    );
  } catch (e) {
    console.log('Failed to notify driver:', e.message);
  }

  return ride;
};

/**
 * Cancel a ride (by driver)
 */
export const cancelRide = async (rideId, driverPhone) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (ride.driverPhone !== driverPhone) {
    throw new Error('Not authorized to cancel this ride');
  }

  ride.status = 'cancelled';
  await ride.save();

  // Notify passengers
  for (const passenger of ride.passengers) {
    try {
      await sendTextMessage(passenger.phone,
        `❌ *Ride Cancelled*\n\n` +
        `The driver has cancelled the ride.\n\n` +
        `Route: ${ride.pickupLocation} → ${ride.destination}\n` +
        `Date: ${ride.date.toLocaleDateString()}`
      );
    } catch (e) {
      console.log('Failed to notify passenger:', e.message);
    }
  }

  return ride;
};

/**
 * Complete a ride
 */
export const completeRide = async (rideId, driverPhone) => {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new Error('Ride not found');
  }

  if (ride.driverPhone !== driverPhone) {
    throw new Error('Not authorized to complete this ride');
  }

  ride.status = 'completed';
  await ride.save();

  // Notify passengers and update ratings
  for (const passenger of ride.passengers) {
    try {
      await sendTextMessage(passenger.phone,
        `✅ *Ride Completed!*\n\n` +
        `Thank you for riding with PDRides!\n\n` +
        `Route: ${ride.pickupLocation} → ${ride.destination}\n\n` +
        `Please rate your experience.`
      );
    } catch (e) {
      console.log('Failed to notify passenger:', e.message);
    }
  }

  return ride;
};

/**
 * Get user's rides (as driver and passenger)
 */
export const getUserRides = async (phoneNumber, options = {}) => {
  const { status, page = 1, limit = 20 } = options;

  const driverQuery = { driverPhone: phoneNumber };
  const passengerQuery = { 'passengers.phone': phoneNumber };

  if (status) {
    driverQuery.status = status;
    passengerQuery.status = status;
  }

  const [offeredRides, joinedRides] = await Promise.all([
    Ride.find(driverQuery).sort({ date: -1 }).limit(limit).skip((page - 1) * limit),
    Ride.find(passengerQuery).sort({ date: -1 }).limit(limit).skip((page - 1) * limit)
  ]);

  return {
    offered: offeredRides.map(r => ({
      ...r.toObject(),
      type: 'offered',
      myRole: 'driver'
    })),
    joined: joinedRides.map(r => ({
      ...r.toObject(),
      type: 'joined',
      myRole: 'passenger'
    })),
    pagination: {
      page,
      limit
    }
  };
};

/**
 * Get ride statistics for a user
 */
export const getUserRideStats = async (phoneNumber) => {
  const [offeredRides, joinedRides] = await Promise.all([
    Ride.find({ driverPhone: phoneNumber }),
    Ride.find({ 'passengers.phone': phoneNumber })
  ]);

  const offeredStats = {
    total: offeredRides.length,
    active: offeredRides.filter(r => r.status === 'active').length,
    completed: offeredRides.filter(r => r.status === 'completed').length,
    cancelled: offeredRides.filter(r => r.status === 'cancelled').length
  };

  const joinedStats = {
    total: joinedRides.length,
    completed: joinedRides.filter(r => r.status === 'completed').length,
    cancelled: joinedRides.filter(r => r.status === 'cancelled').length
  };

  // Calculate earnings and spending
  const totalEarnings = offeredRides
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => {
      const filledSeats = r.totalSeats - r.availableSeats;
      return sum + (r.contribution * filledSeats);
    }, 0);

  const totalSpent = joinedRides
    .filter(r => r.status === 'completed')
    .reduce((sum, r) => {
      const myBooking = r.passengers.find(p => p.phone === phoneNumber);
      return sum + (r.contribution * (myBooking?.seats || 1));
    }, 0);

  return {
    offered: offeredStats,
    joined: joinedStats,
    totalEarnings,
    totalSpent
  };
};

/**
 * Get nearby rides based on coordinates
 */
export const getNearbyRides = async (lat, lng, radiusKm = 10, options = {}) => {
  const { seats = 1, date } = options;

  // Approximate bounding box calculation
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(lat * Math.PI / 180));

  const query = {
    status: 'active',
    expiresAt: { $gt: new Date() },
    availableSeats: { $gte: seats },
    pickupLat: { $gte: lat - latDelta, $lte: lat + latDelta },
    pickupLng: { $gte: lng - lngDelta, $lte: lng + lngDelta }
  };

  if (date) {
    const searchDate = new Date(date);
    const nextDay = new Date(searchDate);
    nextDay.setDate(nextDay.getDate() + 1);
    query.date = { $gte: searchDate, $lt: nextDay };
  }

  const rides = await Ride.find(query)
    .sort({ date: 1 })
    .limit(20);

  // Calculate actual distance and filter
  const nearbyRides = await Promise.all(
    rides.map(async (ride) => {
      if (!ride.pickupLat || !ride.destLat) {
        return { ...ride.toObject(), distanceKm: null };
      }

      // Calculate actual distance
      const route = await calculateRoute(lat, lng, ride.pickupLat, ride.pickupLng);
      const distanceKm = route ? route.distance / 1000 : null;

      if (distanceKm && distanceKm <= radiusKm) {
        return { ...ride.toObject(), distanceKm };
      }
      return null;
    })
  );

  return nearbyRides.filter(r => r !== null);
};

export default {
  createRide,
  searchRides,
  getRideById,
  bookRide,
  cancelBooking,
  cancelRide,
  completeRide,
  getUserRides,
  getUserRideStats,
  getNearbyRides
};

