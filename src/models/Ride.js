import mongoose from 'mongoose';

const rideSchema = new mongoose.Schema({
  // Driver information
  driverPhone: {
    type: String,
    required: true,
    index: true
  },
  driverName: {
    type: String,
    default: ''
  },
  
  // Ride details
  pickupLocation: {
    type: String,
    required: true
  },
  pickupCoordinates: {
    lat: Number,
    lng: Number
  },
  pickupLat: {
    type: Number
  },
  pickupLng: {
    type: Number
  },
  pickupAddress: {
    type: String
  },
  destination: {
    type: String,
    required: true
  },
  destinationCoordinates: {
    lat: Number,
    lng: Number
  },
  destLat: {
    type: Number
  },
  destLng: {
    type: Number
  },
  destAddress: {
    type: String
  },
  
  // Schedule
  date: {
    type: Date,
    required: true,
    index: true
  },
  time: {
    type: String,
    required: true
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringDays: [{
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  }],
  
  // Capacity
  totalSeats: {
    type: Number,
    required: true,
    min: 1,
    max: 8
  },
  availableSeats: {
    type: Number,
    required: true,
    min: 0,
    max: 8
  },
  
  // Pricing
  contribution: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  
  // Preferences/Tags
  tags: [{
    type: String,
    enum: ['female-only', 'pets-ok', 'no-smoking', 'quiet-ride', 'ac', 'luggage']
  }],
  
  // Status
  status: {
    type: String,
    enum: ['active', 'full', 'completed', 'cancelled', 'expired'],
    default: 'active',
    index: true
  },
  
  // Passengers who joined
  passengers: [{
    phone: String,
    name: String,
    seats: Number,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
});

// Check if ride is expired
rideSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Check if ride is full
rideSchema.methods.isFull = function() {
  return this.availableSeats <= 0;
};

// Add passenger to ride
rideSchema.methods.addPassenger = async function(phone, name, seats = 1) {
  if (this.availableSeats < seats) {
    throw new Error('Not enough seats available');
  }
  
  this.passengers.push({ phone, name, seats });
  this.availableSeats -= seats;
  
  if (this.availableSeats === 0) {
    this.status = 'full';
  }
  
  return this.save();
};

// Static method to find active rides
rideSchema.statics.findActive = function() {
  return this.find({
    status: 'active',
    expiresAt: { $gt: new Date() }
  }).sort({ date: 1, time: 1 });
};

// Static method to find rides by location (simple text matching for MVP)
rideSchema.statics.findByLocation = function(pickup, destination) {
  const pickupRegex = new RegExp(pickup, 'i');
  const destRegex = new RegExp(destination, 'i');
  
  return this.find({
    status: 'active',
    expiresAt: { $gt: new Date() },
    $or: [
      { pickupLocation: pickupRegex },
      { destination: destRegex }
    ]
  }).sort({ date: 1, time: 1 });
};

// Static method to create a rider notification request (saved for when matching rides become available)
rideSchema.statics.createRiderNotification = async function(phoneNumber, requestData) {
  // Store the rider's search request in a simple collection
  // This could be extended to notify when matching rides are posted
  console.log(`Rider notification saved for ${phoneNumber}:`, requestData);
  
  // For MVP, we'll just log this. In production, you could:
  // 1. Store in a separate collection and poll for matching rides
  // 2. Use MongoDB change streams to watch for new rides
  // 3. Set up a scheduled job to match and notify
  
  return { saved: true, phoneNumber, requestData };
};

export default mongoose.model('Ride', rideSchema);
