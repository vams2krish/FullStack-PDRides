import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Current conversation state
  state: {
    type: String,
    enum: [
      'idle',
      'onboarding_name',
      'offering_pickup',
      'offering_destination',
      'offering_date',
      'offering_time',
      'offering_seats',
      'offering_contribution',
      'offering_tags',
      'offering_confirm',
      'requesting_pickup',
      'requesting_destination',
      'requesting_date',
      'requesting_time',
      'requesting_seats',
      'browsing_results',
      'awaiting_driver_response',
      'driver_reviewing_request'
    ],
    default: 'idle'
  },
  
  // Temporary data during conversation flow
  tempData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Current ride being worked on
  currentRideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride'
  },
  
  // Search results being shown
  searchResults: [{
    type: mongoose.Schema.Types.Mixed
  }],
  
  // Last activity timestamp
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Message history (last 10 messages for context)
  messageHistory: [{
    role: {
      type: String,
      enum: ['user', 'bot']
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
});

// Add message to history
conversationSchema.methods.addMessage = function(role, message) {
  this.messageHistory.push({ role, message });
  
  // Keep only last 10 messages
  if (this.messageHistory.length > 10) {
    this.messageHistory = this.messageHistory.slice(-10);
  }
  
  this.lastActivity = new Date();
  return this.save();
};

// Update state
conversationSchema.methods.setState = function(newState, tempData = null) {
  this.state = newState;
  this.lastActivity = new Date();
  
  if (tempData) {
    this.tempData = { ...this.tempData, ...tempData };
  }
  
  return this.save();
};

// Clear temp data
conversationSchema.methods.clearTempData = function() {
  this.tempData = {};
  this.currentRideId = null;
  this.searchResults = [];
  return this.save();
};

// Reset to idle
conversationSchema.methods.reset = function() {
  this.state = 'idle';
  this.tempData = {};
  this.currentRideId = null;
  this.searchResults = [];
  this.lastActivity = new Date();
  return this.save();
};

export default mongoose.model('Conversation', conversationSchema);
