import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    default: '',
    sparse: true
  },
  passwordHash: {
    type: String,
    default: ''
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    default: null
  },
  verificationExpiry: {
    type: Date,
    default: null
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  lastOTPRequest: {
    type: Date,
    default: null
  },
  loginToken: {
    type: String,
    default: null
  },
  loginTokenExpiry: {
    type: Date,
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  rideCount: {
    type: Number,
    default: 0
  },
  rating: {
    type: Number,
    default: 5.0,
    min: 1,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  preferences: {
    notifications: {
      type: Boolean,
      default: true
    },
    femaleOnly: {
      type: Boolean,
      default: false
    },
    smoking: {
      type: Boolean,
      default: false
    }
  },
  onboardingComplete: {
    type: Boolean,
    default: false
  },
  
  // Route History - Recent searches
  recentSearches: [{
    pickup: String,
    destination: String,
    pickupLat: Number,
    pickupLng: Number,
    destLat: Number,
    destLng: Number,
    pickupAddress: String,
    destAddress: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Saved Favorite Routes
  favoriteRoutes: [{
    name: String,
    pickup: String,
    destination: String,
    pickupLat: Number,
    pickupLng: Number,
    destLat: Number,
    destLng: Number,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Driver-specific fields
  driverInfo: {
    isDriver: {
      type: Boolean,
      default: false
    },
    vehicleMake: {
      type: String,
      default: ''
    },
    vehicleModel: {
      type: String,
      default: ''
    },
    vehicleYear: {
      type: String,
      default: ''
    },
    vehicleColor: {
      type: String,
      default: ''
    },
    licensePlate: {
      type: String,
      default: ''
    },
    isDriverVerified: {
      type: Boolean,
      default: false
    },
    driverSince: {
      type: Date,
      default: null
    },
    totalTrips: {
      type: Number,
      default: 0
    }
  },

  // User role (passenger or driver or both)
  roles: {
    passenger: {
      type: Boolean,
      default: true
    },
    driver: {
      type: Boolean,
      default: false
    }
  },

  // Emergency contact
  emergencyContact: {
    name: String,
    phone: String
  },

  // Communication preferences
  communication: {
    whatsapp: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    }
  },

  // Account deletion scheduling
  accountDeletionScheduled: {
    type: Boolean,
    default: false
  },
  scheduledDeletionDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Update lastActive on each interaction
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

// Check if OTP is valid
userSchema.methods.isOTPValid = function() {
  if (!this.verificationCode || !this.verificationExpiry) {
    return false;
  }
  return new Date() < this.verificationExpiry && this.otpAttempts < 3;
};

// Increment OTP attempts
userSchema.methods.incrementOTPAttempts = function() {
  this.otpAttempts += 1;
  return this.save();
};

// Reset OTP attempts
userSchema.methods.resetOTPAttempts = function() {
  this.otpAttempts = 0;
  this.verificationCode = null;
  this.verificationExpiry = null;
  return this.save();
};

// Check if can request new OTP
userSchema.methods.canRequestOTP = function() {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  // Can request if never requested or last request was over 1 hour ago
  if (!this.lastOTPRequest || this.lastOTPRequest < oneHourAgo) {
    return true;
  }
  return false;
};

// Add to recent searches (keep last 10)
userSchema.methods.addRecentSearch = function(searchData) {
  // Remove duplicate if exists
  this.recentSearches = this.recentSearches.filter(s => 
    !(s.pickup === searchData.pickup && s.destination === searchData.destination)
  );
  
  // Add to beginning
  this.recentSearches.unshift(searchData);
  
  // Keep only last 10
  if (this.recentSearches.length > 10) {
    this.recentSearches = this.recentSearches.slice(0, 10);
  }
  
  return this.save();
};

// Add to favorite routes
userSchema.methods.addFavoriteRoute = function(routeData) {
  // Check if already exists
  const exists = this.favoriteRoutes.some(f => 
    f.pickup === routeData.pickup && f.destination === routeData.destination
  );
  
  if (!exists) {
    this.favoriteRoutes.push(routeData);
  }
  
  return this.save();
};

// Remove from favorite routes
userSchema.methods.removeFavoriteRoute = function(routeId) {
  this.favoriteRoutes = this.favoriteRoutes.filter(f => f._id.toString() !== routeId);
  return this.save();
};

// Update rating
userSchema.methods.updateRating = function(newRating) {
  const totalRatingScore = this.rating * this.totalRatings;
  this.totalRatings += 1;
  this.rating = (totalRatingScore + newRating) / this.totalRatings;
  return this.save();
};

// Static method to find by phone
userSchema.statics.findByPhone = function(phoneNumber) {
  return this.findOne({ phoneNumber });
};

// Static method to find verified users
userSchema.statics.findVerified = function() {
  return this.find({ isVerified: true });
};

export default mongoose.model('User', userSchema);

