/**
 * Ads API Routes
 * REST API endpoints for ad management and delivery
 */

import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import * as adService from '../services/adService.js';

const router = express.Router();

// ============================================
// ADMIN: AD MANAGEMENT
// ============================================

/**
 * POST /api/ads - Create a new ad
 */
router.post('/ads', authenticate, async (req, res) => {
  try {
    const adData = req.body;
    const ad = await adService.createAd(adData);
    res.status(201).json({ success: true, ad });
  } catch (error) {
    console.error('Error creating ad:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ads - Get all ads (with optional filters)
 */
router.get('/ads', authenticate, async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      adType: req.query.adType,
      advertiserId: req.query.advertiserId
    };
    
    const ads = await adService.getAllAds(filters);
    res.json({ success: true, ads, count: ads.length });
  } catch (error) {
    console.error('Error fetching ads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ads/:adId - Get specific ad
 */
router.get('/ads/:adId', authenticate, async (req, res) => {
  try {
    const ad = await adService.getAdById(req.params.adId);
    
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, ad });
  } catch (error) {
    console.error('Error fetching ad:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/ads/:adId - Update an ad
 */
router.put('/ads/:adId', authenticate, async (req, res) => {
  try {
    const ad = await adService.updateAd(req.params.adId, req.body);
    
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, ad });
  } catch (error) {
    console.error('Error updating ad:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/ads/:adId - Delete an ad
 */
router.delete('/ads/:adId', authenticate, async (req, res) => {
  try {
    const ad = await adService.deleteAd(req.params.adId);
    
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, message: 'Ad deleted successfully' });
  } catch (error) {
    console.error('Error deleting ad:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ads/:adId/pause - Pause an ad
 */
router.post('/ads/:adId/pause', authenticate, async (req, res) => {
  try {
    const ad = await adService.pauseAd(req.params.adId);
    
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, ad });
  } catch (error) {
    console.error('Error pausing ad:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ads/:adId/activate - Activate an ad
 */
router.post('/ads/:adId/activate', authenticate, async (req, res) => {
  try {
    const ad = await adService.activateAd(req.params.adId);
    
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, ad });
  } catch (error) {
    console.error('Error activating ad:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// AD DELIVERY (Public endpoints)
// ============================================

/**
 * GET /api/ads/placement/:placementId - Get ads for a specific placement
 * 
 * Query params:
 * - state: User's state code (e.g., 'NJ')
 * - zipcode: User's zip code (e.g., '08830')
 * - lat: User's latitude (for radius targeting)
 * - lng: User's longitude (for radius targeting)
 * - limit: Maximum number of ads to return (default: 1)
 */
router.get('/ads/placement/:placementId', optionalAuth, async (req, res) => {
  try {
    const { placementId } = req.params;
    const { state, zipcode, lat, lng, limit } = req.query;
    
    const userLocation = {
      state,
      zipcode,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null
    };
    
    const result = await adService.getAdsWithFallback(placementId, userLocation);
    
    // Record impression for each returned ad
    if (result.ads && result.ads.length > 0) {
      for (const ad of result.ads) {
        await adService.recordImpression(ad.adId);
      }
    }
    
    res.json({
      success: true,
      placementId,
      ads: result.ads.map(ad => ({
        adId: ad.adId,
        name: ad.name,
        adType: ad.adType,
        adUnitId: ad.adUnitId,
        creative: ad.creative,
        targeting: ad.targeting
      })),
      fallback: result.fallback,
      placement: result.placement
    });
  } catch (error) {
    console.error('Error fetching placement ads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ads/placement/:placementId/fallback - Get fallback content for placement
 */
router.get('/ads/placement/:placementId/fallback', async (req, res) => {
  try {
    const { placementId } = req.params;
    const fallback = adService.getFallbackForPlacement(placementId);
    res.json({ success: true, fallback });
  } catch (error) {
    console.error('Error fetching fallback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ads/:adId/click - Record ad click
 */
router.post('/ads/:adId/click', async (req, res) => {
  try {
    const ad = await adService.recordClick(req.params.adId);
    
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, message: 'Click recorded' });
  } catch (error) {
    console.error('Error recording click:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ads/:adId/impression - Record ad impression
 */
router.post('/ads/:adId/impression', async (req, res) => {
  try {
    const ad = await adService.recordImpression(req.params.adId);
    
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, message: 'Impression recorded' });
  } catch (error) {
    console.error('Error recording impression:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// ANALYTICS & REPORTING
// ============================================

/**
 * GET /api/ads/:adId/metrics - Get metrics for specific ad
 */
router.get('/ads/:adId/metrics', authenticate, async (req, res) => {
  try {
    const metrics = await adService.getAdMetrics(req.params.adId);
    
    if (!metrics) {
      return res.status(404).json({ success: false, error: 'Ad not found' });
    }
    
    res.json({ success: true, metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ads/stats/platform - Get platform-wide ad statistics
 */
router.get('/ads/stats/platform', authenticate, async (req, res) => {
  try {
    const stats = await adService.getPlatformAdStats();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching platform stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CONFIGURATION ENDPOINTS
// ============================================

/**
 * GET /api/ads/config/units - Get ad unit configurations
 */
router.get('/ads/config/units', async (req, res) => {
  try {
    const units = adService.getAdUnits();
    res.json({ success: true, units });
  } catch (error) {
    console.error('Error fetching ad units:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ads/config/placements - Get placement configurations
 */
router.get('/ads/config/placements', async (req, res) => {
  try {
    const placements = adService.getPlacementConfigs();
    res.json({ success: true, placements });
  } catch (error) {
    console.error('Error fetching placements:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ads/config/geo - Get geo targeting configuration
 */
router.get('/ads/config/geo', async (req, res) => {
  try {
    const geo = adService.getGeoTargetingConfig();
    res.json({ success: true, geo });
  } catch (error) {
    console.error('Error fetching geo config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/ads/config/states - Get supported states for targeting
 */
router.get('/ads/config/states', async (req, res) => {
  try {
    const states = adService.getSupportedStates();
    res.json({ success: true, states });
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ads/validate-targeting - Validate targeting configuration
 */
router.post('/ads/validate-targeting', authenticate, async (req, res) => {
  try {
    const { targeting } = req.body;
    const validation = adService.validateTargeting(targeting);
    res.json({ success: true, ...validation });
  } catch (error) {
    console.error('Error validating targeting:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/ads/generate-samples - Generate sample ads for testing
 */
router.post('/ads/generate-samples', authenticate, async (req, res) => {
  try {
    const ads = await adService.generateSampleAds();
    res.json({ success: true, message: `Created ${ads.length} sample ads`, ads });
  } catch (error) {
    console.error('Error generating samples:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

