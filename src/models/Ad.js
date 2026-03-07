/**
 * Ad Model - MongoDB Schema for Geo-Targeted Ads
 * Supports state & zip code based targeting similar to Meta/Google Ads
 */

import mongoose from 'mongoose';

const adSchema = new mongoose.Schema({
  // Ad identification
  name: {
    type: String,
    required: true,
    trim: true
  },
  adId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Ad type (interstitial, banner, native)
  adType: {
    type: String,
    enum: ['interstitial', 'banner', 'native', 'in-feed'],
    required: true
  },
  
  // Ad unit ID (references ad-units.json config)
  adUnitId: {
    type: String,
    required: true
  },
  
  // Creative content
  creative: {
    // Image URL(s)
    images: [{
      url: String,
      width: Number,
      height: Number,
      altText: String
    }],
    // Headline
    headline: {
      type: String,
      maxlength: 90
    },
    // Description text
    description: {
      type: String,
      maxlength: 300
    },
    // Call-to-action button
    cta: {
      text: String,
      url: String,
      type: {
        type: String,
        enum: ['button', 'link'],
        default: 'button'
      }
    },
    // Logo
    logo: {
      url: String,
      width: Number,
      height: Number
    },
    // Sponsor name
    sponsorName: String
  },
  
  // Geo-targeting configuration
  targeting: {
    // Geographic targeting type
    geoType: {
      type: String,
      enum: ['all', 'states', 'zipcodes', 'radius'],
      default: 'all'
    },
    // Target specific states (US state codes)
    states: [{
      type: String,
      uppercase: true
    }],
    // Target specific zip codes (5-digit US zip codes)
    zipcodes: [{
      type: String,
      matchtype: {
        type: String,
        enum: ['exact', 'prefix'],
        default: 'exact'
      }
    }],
    // Radius targeting (center point + radius in miles)
    radius: {
      center: {
        lat: Number,
        lng: Number
      },
      radiusMiles: Number
    },
    // Exclude specific areas
    excludedStates: [{
      type: String,
      uppercase: true
    }],
    excludedZipcodes: [String],
    // Dayparting (time-based targeting)
    schedule: {
      daysOfWeek: [{
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
      }],
      startTime: String, // HH:MM format
      endTime: String    // HH:MM format
    }
  },
  
  // Campaign settings
  campaign: {
    campaignId: String,
    campaignName: String,
    advertiserId: String,
    startDate: Date,
    endDate: Date,
    budget: Number,
    priority: {
      type: Number,
      default: 1 // Higher = more priority
    }
  },
  
  // Ad status
  status: {
    type: String,
    enum: ['active', 'paused', 'expired', 'pending', 'rejected'],
    default: 'pending'
  },
  
  // Performance metrics
  metrics: {
    impressions: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    spend: {
      type: Number,
      default: 0
    },
    lastImpression: Date,
    lastClick: Date
  },
  
  // Targeting match info (for debugging)
  targetingMatch: {
    matchedStates: [String],
    matchedZipcodes: [String],
    lastMatched: Date
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: String,
  notes: String
});

// Indexes for efficient querying
adSchema.index({ status: 1, 'campaign.startDate': 1, 'campaign.endDate': 1 });
adSchema.index({ 'targeting.geoType': 1, 'targeting.states': 1 });
adSchema.index({ 'targeting.zipcodes': 1 });
adSchema.index({ adType: 1, status: 1 });
adSchema.index({ 'campaign.priority': -1, status: 1 });

// Pre-save middleware to update timestamp
adSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method: Find ads matching user's location
adSchema.statics.findByGeoLocation = async function(state, zipcode, adType = null, placementId = null) {
  const now = new Date();
  
  // Build query for active ads within date range
  let query = {
    status: 'active',
    'campaign.startDate': { $lte: now },
    'campaign.endDate': { $gte: now }
  };
  
  // Filter by ad type if specified
  if (adType) {
    query.adType = adType;
  }
  
  // Find ads where targeting matches user's location
  // Priority: all > states > zipcodes
  const ads = await this.find(query).sort({ 'campaign.priority': -1, createdAt: -1 });
  
  // Filter ads based on geo-targeting
  const matchingAds = ads.filter(ad => {
    const targeting = ad.targeting;
    
    // If targeting is 'all', match everywhere
    if (targeting.geoType === 'all') {
      return true;
    }
    
    // Check state targeting
    if (targeting.geoType === 'states' && targeting.states) {
      if (targeting.states.includes(state?.toUpperCase())) {
        return true;
      }
    }
    
    // Check zipcode targeting
    if (targeting.geoType === 'zipcodes' && targeting.zipcodes) {
      const userZip = zipcode?.toString().slice(0, 5);
      for (const targetZip of targeting.zipcodes) {
        if (targetZip.matchtype === 'exact' && targetZip.code === userZip) {
          return true;
        }
        if (targetZip.matchtype === 'prefix' && userZip?.startsWith(targetZip.code.slice(0, 3))) {
          return true;
        }
      }
    }
    
    // Check radius targeting
    if (targeting.geoType === 'radius' && targeting.radius && state) {
      // For radius targeting, we'd need user's coordinates
      // This is a simplified check
      return true;
    }
    
    return false;
  });
  
  return matchingAds;
};

// Static method: Get ads for a specific placement
adSchema.statics.getAdsForPlacement = async function(placementId, userLocation) {
  const { state, zipcode, lat, lng } = userLocation || {};
  
  // Get placement config to determine ad type
  const placementConfigs = {
    'in-feed-top-banner': { adType: 'banner', sizes: ['300x250', '320x50', '728x90'] },
    'in-feed-middle-banner': { adType: 'banner', sizes: ['300x250', '320x50'] },
    'interstitial-full': { adType: 'interstitial', sizes: ['320x480', '300x250'] },
    'in-feed-native': { adType: 'native', sizes: ['fluid'] }
  };
  
  const placement = placementConfigs[placementId];
  if (!placement) {
    return [];
  }
  
  return await this.findByGeoLocation(state, zipcode, placement.adType);
};

// Instance method: Record impression
adSchema.methods.recordImpression = async function() {
  this.metrics.impressions += 1;
  this.metrics.lastImpression = new Date();
  return this.save();
};

// Instance method: Record click
adSchema.methods.recordClick = async function() {
  this.metrics.clicks += 1;
  this.metrics.lastClick = new Date();
  return this.save();
};

// Instance method: Calculate CTR
adSchema.methods.getCTR = function() {
  if (this.metrics.impressions === 0) return 0;
  return (this.metrics.clicks / this.metrics.impressions) * 100;
};

// Virtual: Check if ad is currently active
adSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.status === 'active' &&
    (!this.campaign.startDate || this.campaign.startDate <= now) &&
    (!this.campaign.endDate || this.campaign.endDate >= now);
});

// Ensure virtuals are included in JSON
adSchema.set('toJSON', { virtuals: true });
adSchema.set('toObject', { virtuals: true });

export default mongoose.model('Ad', adSchema);

