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
  }
});

// Update lastActive on each interaction
userSchema.methods.updateLastActive = function() {
  this.lastActive = new Date();
  return this.save();
};

export default mongoose.model('User', userSchema);
