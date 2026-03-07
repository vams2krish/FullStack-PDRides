/**
 * Ad Service - Business Logic for Geo-Targeted Ads
 * Handles ad management, targeting, and delivery
 */

import Ad from '../models/Ad.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration files
const loadConfig = (configName) => {
  try {
    const configPath = path.join(__dirname, '../../ads-config', configName);
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error(`Error loading config ${configName}:`, error);
  }
  return null;
};

// Get ad unit configurations
export const getAdUnits = () => {
  return loadConfig('ad-units.json') || getDefaultAdUnits();
};

// Get geo targeting configurations
export const getGeoTargetingConfig = () => {
  return loadConfig('geo-targeting.json') || getDefaultGeoConfig();
};

// Get placement configurations
export const getPlacementConfigs = () => {
  return loadConfig('placements.json') || getDefaultPlacements();
};

// Get fallback content configuration
export const getFallbackContent = () => {
  return loadConfig('fallback-content.json') || getDefaultFallback();
};

// Default ad units (similar to Google Ads dimensions)
const getDefaultAdUnits = () => ({
  units: [
    {
      id: 'banner-300x250',
      name: 'Medium Rectangle',
      type: 'banner',
      dimensions: { width: 300, height: 250 },
      description: 'Medium rectangle banner ad'
    },
    {
      id: 'banner-728x90',
      name: 'Leaderboard',
      type: 'banner',
      dimensions: { width: 728, height: 90 },
      description: 'Top leaderboard banner'
    },
    {
      id: 'banner-320x50',
      name: 'Mobile Banner',
      type: 'banner',
      dimensions: { width: 320, height: 50 },
      description: 'Mobile banner ad'
    },
    {
      id: 'banner-320x100',
      name: 'Large Mobile Banner',
      type: 'banner',
      dimensions: { width: 320, height: 100 },
      description: 'Large mobile banner'
    },
    {
      id: 'banner-300x600',
      name: 'Half Page',
      type: 'banner',
      dimensions: { width: 300, height: 600 },
      description: 'Half page ad'
    },
    {
      id: 'interstitial-320x480',
      name: 'Mobile Interstitial',
      type: 'interstitial',
      dimensions: { width: 320, height: 480 },
      description: 'Full screen mobile interstitial'
    },
    {
      id: 'interstitial-300x250',
      name: 'Interstitial Square',
      type: 'interstitial',
      dimensions: { width: 300, height: 250 },
      description: 'Square interstitial'
    },
    {
      id: 'native-in-feed',
      name: 'In-Feed Native Ad',
      type: 'native',
      dimensions: { width: 'fluid', height: 'auto' },
      description: 'Native ad that matches feed content',
      styles: {
        container: 'display: flex; gap: 12px; padding: 12px; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);',
        image: 'width: 100px; height: 100px; object-fit: cover; border-radius: 4px;',
        content: 'flex: 1;',
        headline: 'font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px;',
        description: 'font-size: 12px; color: #666; margin-bottom: 8px;',
        cta: 'display: inline-block; padding: 6px 16px; background: #667eea; color: #fff; border-radius: 4px; font-size: 12px; font-weight: 600; text-decoration: none;'
      }
    }
  ]
});

// Default geo targeting config
const getDefaultGeoConfig = () => ({
  supportedCountries: ['US'],
  defaultCountry: 'US',
  states: [
    { code: 'NJ', name: 'New Jersey' },
    { code: 'NY', name: 'New York' },
    { code: 'PA', name: 'Pennsylvania' },
    { code: 'CT', name: 'Connecticut' },
    { code: 'CA', name: 'California' },
    { code: 'TX', name: 'Texas' },
    { code: 'FL', name: 'Florida' }
  ],
  zipcodeLength: 5,
  radiusUnits: 'miles'
});

// Default placements
const getDefaultPlacements = () => ({
  placements: [
    {
      id: 'in-feed-top-banner',
      name: 'In-Feed Top Banner',
      description: 'Banner ad displayed above the map on map-view page',
      location: 'map-view',
      position: 'above-map',
      supportedUnits: ['banner-300x250', 'banner-320x50', 'banner-728x90'],
      defaultUnit: 'banner-320x50',
      priority: 1
    },
    {
      id: 'in-feed-middle-banner',
      name: 'In-Feed Middle Banner',
      description: 'Banner ad displayed after pricing card on map-view page',
      location: 'map-view',
      position: 'after-pricing',
      supportedUnits: ['banner-300x250', 'banner-320x50'],
      defaultUnit: 'banner-300x250',
      priority: 2
    },
    {
      id: 'interstitial-full',
      name: 'Full Screen Interstitial',
      description: 'Full screen interstitial ad',
      location: 'app-wide',
      position: 'modal',
      supportedUnits: ['interstitial-320x480', 'interstitial-300x250'],
      defaultUnit: 'interstitial-320x480',
      priority: 3
    }
  ]
});

// Default fallback content
const getDefaultFallback = () => ({
  enabled: true,
  title: 'Promote Your Local Business',
  description: 'Reach thousands of commuters in your area',
  ctaText: 'Advertise With Us',
  ctaUrl: '/contact-us',
  contactEmail: 'ads@pdrides.com',
  showEmail: true,
  backgroundColor: '#f8f9fa',
  textColor: '#333333',
  accentColor: '#667eea'
});

// ============================================
// AD CREATION & MANAGEMENT
// ============================================

/**
 * Create a new ad
 */
export const createAd = async (adData) => {
  // Generate unique ad ID if not provided
  if (!adData.adId) {
    adData.adId = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  const ad = new Ad(adData);
  await ad.save();
  return ad;
};

/**
 * Update an existing ad
 */
export const updateAd = async (adId, updateData) => {
  const ad = await Ad.findOneAndUpdate(
    { adId },
    { ...updateData, updatedAt: new Date() },
    { new: true }
  );
  return ad;
};

/**
 * Delete an ad
 */
export const deleteAd = async (adId) => {
  const ad = await Ad.findOneAndDelete({ adId });
  return ad;
};

/**
 * Get ad by ID
 */
export const getAdById = async (adId) => {
  return await Ad.findOne({ adId });
};

/**
 * Get all ads with filters
 */
export const getAllAds = async (filters = {}) => {
  const query = {};
  
  if (filters.status) query.status = filters.status;
  if (filters.adType) query.adType = filters.adType;
  if (filters.advertiserId) query['campaign.advertiserId'] = filters.advertiserId;
  
  const ads = await Ad.find(query).sort({ createdAt: -1 });
  return ads;
};

/**
 * Pause an ad
 */
export const pauseAd = async (adId) => {
  return await updateAd(adId, { status: 'paused' });
};

/**
 * Activate an ad
 */
export const activateAd = async (adId) => {
  return await updateAd(adId, { status: 'active' });
};

// ============================================
// AD DELIVERY & TARGETING
// ============================================

/**
 * Get ads for a specific placement based on user location
 * @param {string} placementId - The placement ID (e.g., 'in-feed-top-banner')
 * @param {object} userLocation - User's location { state, zipcode, lat, lng }
 * @param {object} options - Additional options { limit, randomize }
 */
export const getAdsForPlacement = async (placementId, userLocation, options = {}) => {
  const { limit = 1, randomize = true } = options;
  
  // Get placement configuration
  const placements = getPlacementConfigs();
  const placement = placements.placements?.find(p => p.id === placementId);
  
  if (!placement) {
    console.log(`Placement ${placementId} not found, using fallback`);
    return { ads: [], fallback: true };
  }
  
  // Get ads matching the placement's supported ad types
  const now = new Date();
  let query = {
    status: 'active',
    'campaign.startDate': { $lte: now },
    'campaign.endDate': { $gte: now }
  };
  
  // Find ads that support this placement's ad types
  const adUnits = getAdUnits();
  const supportedTypes = placement.supportedUnits
    .map(unitId => adUnits.units?.find(u => u.id === unitId)?.type)
    .filter(Boolean);
  
  if (supportedTypes.length > 0) {
    query.adType = { $in: [...new Set(supportedTypes)] };
  }
  
  // Get all active ads
  const ads = await Ad.find(query).sort({ 'campaign.priority': -1, createdAt: -1 });
  
  // Filter ads based on geo-targeting
  const matchingAds = filterAdsByGeo(ads, userLocation);
  
  // Apply ad unit filtering based on placement
  const validAds = matchingAds.filter(ad => {
    const adUnit = adUnits.units?.find(u => u.id === ad.adUnitId);
    return adUnit && placement.supportedUnits.includes(adUnit.id);
  });
  
  // Apply randomization and limit
  let resultAds = randomize 
    ? validAds.sort(() => Math.random() - 0.5) 
    : validAds;
  
  if (limit > 0) {
    resultAds = resultAds.slice(0, limit);
  }
  
  return {
    ads: resultAds,
    placement: placement,
    fallback: resultAds.length === 0
  };
};

/**
 * Filter ads based on user's geographic location
 */
const filterAdsByGeo = (ads, userLocation) => {
  const { state, zipcode, lat, lng } = userLocation || {};
  
  if (!state && !zipcode && !lat) {
    // If no location, return ads targeting 'all'
    return ads.filter(ad => ad.targeting.geoType === 'all');
  }
  
  return ads.filter(ad => {
    const targeting = ad.targeting;
    
    // If targeting is 'all', it matches everywhere
    if (targeting.geoType === 'all') {
      // Check if state or zipcode is excluded
      if (targeting.excludedStates?.includes(state?.toUpperCase())) {
        return false;
      }
      if (targeting.excludedZipcodes?.includes(zipcode)) {
        return false;
      }
      return true;
    }
    
    // State-level targeting
    if (targeting.geoType === 'states') {
      if (!targeting.states || targeting.states.length === 0) {
        return true;
      }
      const stateMatch = targeting.states.includes(state?.toUpperCase());
      const excluded = targeting.excludedStates?.includes(state?.toUpperCase());
      return stateMatch && !excluded;
    }
    
    // Zipcode-level targeting
    if (targeting.geoType === 'zipcodes') {
      if (!targeting.zipcodes || targeting.zipcodes.length === 0) {
        return true;
      }
      
      const userZip = zipcode?.toString().slice(0, 5);
      
      for (const targetZip of targeting.zipcodes) {
        if (targetZip.matchtype === 'exact' && targetZip.code === userZip) {
          return !targeting.excludedZipcodes?.includes(zipcode);
        }
        if (targetZip.matchtype === 'prefix') {
          const prefix = targetZip.code.slice(0, 3);
          if (userZip?.startsWith(prefix)) {
            return !targeting.excludedZipcodes?.includes(zipcode);
          }
        }
      }
      
      return false;
    }
    
    // Radius targeting (requires lat/lng)
    if (targeting.geoType === 'radius' && targeting.radius) {
      if (!lat || !lng) return false;
      
      const distance = calculateDistance(
        lat, lng,
        targeting.radius.center.lat,
        targeting.radius.center.lng
      );
      
      return distance <= targeting.radius.radiusMiles;
    }
    
    return false;
  });
};

/**
 * Calculate distance between two points (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

// ============================================
// FALLBACK CONTENT
// ============================================

/**
 * Get fallback content for a placement
 */
export const getFallbackForPlacement = (placementId) => {
  const fallback = getFallbackContent();
  const placements = getPlacementConfigs();
  const placement = placements.placements?.find(p => p.id === placementId);
  
  return {
    ...fallback,
    placementId,
    placementName: placement?.name || placementId
  };
};

/**
 * Get ads with fallback
 */
export const getAdsWithFallback = async (placementId, userLocation) => {
  const result = await getAdsForPlacement(placementId, userLocation);
  
  if (result.fallback || result.ads.length === 0) {
    return {
      ads: [],
      fallback: getFallbackForPlacement(placementId),
      placement: result.placement
    };
  }
  
  return result;
};

// ============================================
// ANALYTICS & REPORTING
// ============================================

/**
 * Record an ad impression
 */
export const recordImpression = async (adId) => {
  const ad = await Ad.findOne({ adId });
  if (ad) {
    await ad.recordImpression();
  }
  return ad;
};

/**
 * Record an ad click
 */
export const recordClick = async (adId) => {
  const ad = await Ad.findOne({ adId });
  if (ad) {
    await ad.recordClick();
  }
  return ad;
};

/**
 * Get ad performance metrics
 */
export const getAdMetrics = async (adId) => {
  const ad = await Ad.findOne({ adId });
  if (!ad) return null;
  
  return {
    adId: ad.adId,
    name: ad.name,
    impressions: ad.metrics.impressions,
    clicks: ad.metrics.clicks,
    conversions: ad.metrics.conversions,
    ctr: ad.getCTR(),
    spend: ad.metrics.spend,
    lastImpression: ad.metrics.lastImpression,
    lastClick: ad.metrics.lastClick
  };
};

/**
 * Get platform-wide ad stats
 */
export const getPlatformAdStats = async () => {
  const ads = await Ad.find({ status: 'active' });
  
  const stats = {
    totalAds: ads.length,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    avgCTR: 0,
    byType: {}
  };
  
  let totalCTR = 0;
  
  ads.forEach(ad => {
    stats.totalImpressions += ad.metrics.impressions;
    stats.totalClicks += ad.metrics.clicks;
    stats.totalConversions += ad.metrics.conversions;
    
    if (!stats.byType[ad.adType]) {
      stats.byType[ad.adType] = {
        count: 0,
        impressions: 0,
        clicks: 0
      };
    }
    
    stats.byType[ad.adType].count++;
    stats.byType[ad.adType].impressions += ad.metrics.impressions;
    stats.byType[ad.adType].clicks += ad.metrics.clicks;
    
    totalCTR += ad.getCTR();
  });
  
  stats.avgCTR = ads.length > 0 ? totalCTR / ads.length : 0;
  
  return stats;
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Validate targeting configuration
 */
export const validateTargeting = (targeting) => {
  const errors = [];
  
  if (!targeting.geoType) {
    errors.push('Geo targeting type is required');
  }
  
  if (targeting.geoType === 'states' && (!targeting.states || targeting.states.length === 0)) {
    errors.push('At least one state must be specified for state targeting');
  }
  
  if (targeting.geoType === 'zipcodes' && (!targeting.zipcodes || targeting.zipcodes.length === 0)) {
    errors.push('At least one zipcode must be specified for zipcode targeting');
  }
  
  if (targeting.geoType === 'radius' && (!targeting.radius || !targeting.radius.center)) {
    errors.push('Radius center is required for radius targeting');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get supported states for targeting
 */
export const getSupportedStates = () => {
  const config = getGeoTargetingConfig();
  return config.states || [];
};

/**
 * Generate sample ads for testing
 */
export const generateSampleAds = async () => {
  const sampleAds = [
    {
      name: 'NJ Local Restaurant Ad',
      adType: 'banner',
      adUnitId: 'banner-300x250',
      creative: {
        images: [{ url: 'https://via.placeholder.com/300x250/667eea/ffffff?text=NJ+Restaurant', altText: 'Restaurant Ad' }],
        headline: 'Best Pizza in New Jersey',
        description: 'Order now and get 20% off your first order!',
        cta: { text: 'Order Now', url: 'https://example.com/order' },
        sponsorName: 'NJ Pizza Palace'
      },
      targeting: {
        geoType: 'states',
        states: ['NJ']
      },
      campaign: {
        campaignId: 'camp_001',
        campaignName: 'NJ Local Ads',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: 10
      },
      status: 'active'
    },
    {
      name: 'NY Taxi Service Ad',
      adType: 'banner',
      adUnitId: 'banner-320x50',
      creative: {
        images: [{ url: 'https://via.placeholder.com/320x50/25D366/ffffff?text=NY+Taxi', altText: 'Taxi Ad' }],
        headline: 'NYC Airport Rides',
        description: 'Book your airport ride now!',
        cta: { text: 'Book Ride', url: 'https://example.com/book' },
        sponsorName: 'NYC Express Taxi'
      },
      targeting: {
        geoType: 'states',
        states: ['NY']
      },
      campaign: {
        campaignId: 'camp_002',
        campaignName: 'NY Transportation',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: 8
      },
      status: 'active'
    },
    {
      name: 'National Brand Awareness',
      adType: 'banner',
      adUnitId: 'banner-728x90',
      creative: {
        images: [{ url: 'https://via.placeholder.com/728x90/764ba2/ffffff?text=National+Brand', altText: 'Brand Ad' }],
        headline: 'PDRides - Your Community Carpool',
        description: 'Connect with neighbors and save money on rides',
        cta: { text: 'Get Started', url: 'https://pdrides.com' },
        sponsorName: 'PDRides Inc'
      },
      targeting: {
        geoType: 'all'
      },
      campaign: {
        campaignId: 'camp_003',
        campaignName: 'Brand Awareness',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        priority: 1
      },
      status: 'active'
    },
    {
      name: 'NY Specific Zipcode Ad',
      adType: 'native',
      adUnitId: 'native-in-feed',
      creative: {
        images: [{ url: 'https://via.placeholder.com/100x100/ff9800/ffffff?text=NY', altText: 'Local Service' }],
        headline: 'Brooklyn Auto Repair',
        description: 'Professional auto repair services in Brooklyn',
        cta: { text: 'Learn More', url: 'https://example.com/auto' },
        sponsorName: 'Brooklyn Auto Care'
      },
      targeting: {
        geoType: 'zipcodes',
        zipcodes: [
          { code: '11201', matchtype: 'exact' },
          { code: '112', matchtype: 'prefix' }
        ]
      },
      campaign: {
        campaignId: 'camp_004',
        campaignName: 'Brooklyn Auto',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: 15
      },
      status: 'active'
    }
  ];
  
  // Create sample ads in database
  const createdAds = [];
  for (const adData of sampleAds) {
    try {
      const ad = await createAd(adData);
      createdAds.push(ad);
    } catch (error) {
      console.log(`Ad ${adData.name} may already exist`);
    }
  }
  
  return createdAds;
};

export default {
  createAd,
  updateAd,
  deleteAd,
  getAdById,
  getAllAds,
  pauseAd,
  activateAd,
  getAdsForPlacement,
  getAdsWithFallback,
  getFallbackForPlacement,
  recordImpression,
  recordClick,
  getAdMetrics,
  getPlatformAdStats,
  getAdUnits,
  getGeoTargetingConfig,
  getPlacementConfigs,
  getFallbackContent,
  validateTargeting,
  getSupportedStates,
  generateSampleAds
};

