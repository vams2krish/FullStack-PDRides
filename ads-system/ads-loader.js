/**
 * PDRides Ads System - Frontend Loader
 * Geo-targeted ads with Meta/Google Ads style configuration
 * 
 * Developer Usage:
 * 1. Include this script in your HTML: <script src="/ads-system/ads-loader.js"></script>
 * 2. Initialize ads on page load: window.adsSystem.init()
 * 3. Or use auto-initialization with data attributes
 * 
 * Configuration:
 * - All settings are loaded from /ads-system/developer-config.json
 * - Override settings using window.adsConfig before initialization
 */

(function() {
    'use strict';

    // Default configuration
    const DEFAULT_CONFIG = {
        debug: false,
        loadTimeout: 5000,
        maxRetries: 2,
        placements: {
            'in-feed-top-banner': {
                containerId: 'ad-placement-top',
                supportedUnits: ['banner-320x50', 'banner-300x250', 'banner-728x90', 'banner-320x100'],
                defaultUnit: 'banner-320x50'
            },
            'in-feed-middle-banner': {
                containerId: 'ad-placement-middle',
                supportedUnits: ['banner-300x250', 'banner-320x50', 'banner-320x100'],
                defaultUnit: 'banner-300x250'
            }
        },
        fallback: {
            title: 'Promote Your Local Business',
            description: 'Reach thousands of commuters in your area with targeted advertising',
            ctaText: 'Advertise Here',
            ctaUrl: '/contact-us',
            businessEnquiryEmail: 'ads@pdrides.com',
            showEmail: true
        },
        geoTargeting: {
            enabled: true,
            sources: ['geolocation', 'ip', 'url', 'storage']
        }
    };

    // User location data
    let userLocation = {
        state: null,
        zipcode: null,
        city: null,
        lat: null,
        lng: null,
        country: 'US'
    };

    // Ad system state
    let config = { ...DEFAULT_CONFIG };
    let isInitialized = false;
    let loadedPlacements = new Set();

    // ============================================
    // CORE FUNCTIONS
    // ============================================

    /**
     * Initialize the ads system
     */
    async function init(customConfig = {}) {
        if (isInitialized) {
            log('Ads system already initialized');
            return;
        }

        // Merge custom config
        config = { ...DEFAULT_CONFIG, ...customConfig };
        
        // Allow global config override
        if (window.adsConfig) {
            config = { ...config, ...window.adsConfig };
        }

        log('Initializing PDRides Ads System...');

        try {
            // Load developer config from JSON
            await loadDeveloperConfig();

            // Get user location
            await detectUserLocation();

            // Load ads for all configured placements
            await loadAllPlacements();

            isInitialized = true;
            log('Ads system initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ads system:', error);
            // Still try to show fallback content
            showAllFallbacks();
        }
    }

    /**
     * Load developer configuration from JSON file
     */
    async function loadDeveloperConfig() {
        try {
            const response = await fetch('/ads-system/developer-config.json');
            if (response.ok) {
                const devConfig = await response.json();
                
                // Apply developer config settings
                if (devConfig.adPlacements) {
                    config.placements = devConfig.adPlacements;
                }
                if (devConfig.fallbackSettings) {
                    config.fallback = { ...config.fallback, ...devConfig.fallbackSettings.content };
                }
                if (devConfig.geoTargeting) {
                    config.geoTargeting = { ...config.geoTargeting, ...devConfig.geoTargeting };
                }
                if (devConfig.developerSettings) {
                    config.debug = devConfig.developerSettings.enableDebug || false;
                }
                
                log('Developer configuration loaded');
            }
        } catch (error) {
            log('Could not load developer config, using defaults');
        }
    }

    /**
     * Detect user's location for geo-targeting
     */
    async function detectUserLocation() {
        log('Detecting user location...');

        // Try to get from localStorage first
        const stored = localStorage.getItem('pdrides_userLocation');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                Object.assign(userLocation, parsed);
                log('Location loaded from storage:', userLocation);
            } catch (e) {}
        }

        // Try browser geolocation
        if (navigator.geolocation && config.geoTargeting.sources.includes('geolocation')) {
            try {
                const position = await getGeolocation();
                userLocation.lat = position.coords.latitude;
                userLocation.lng = position.coords.longitude;
                
                // Reverse geocode to get state/zip
                await reverseGeocode(userLocation.lat, userLocation.lng);
            } catch (error) {
                log('Geolocation not available:', error.message);
            }
        }

        // Try URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('state')) {
            userLocation.state = urlParams.get('state').toUpperCase();
        }
        if (urlParams.get('zipcode')) {
            userLocation.zipcode = urlParams.get('zipcode');
        }
        if (urlParams.get('lat')) {
            userLocation.lat = parseFloat(urlParams.get('lat'));
        }
        if (urlParams.get('lng')) {
            userLocation.lng = parseFloat(urlParams.get('lng'));
        }

        // Save to localStorage
        localStorage.setItem('pdrides_userLocation', JSON.stringify(userLocation));
        
        log('User location detected:', userLocation);
    }

    /**
     * Get geolocation with timeout
     */
    function getGeolocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 300000
            });
        });
    }

    /**
     * Reverse geocode coordinates to get state and zipcode
     */
    async function reverseGeocode(lat, lng) {
        try {
            const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`);
            const data = await response.json();
            
            if (data.success && data.address) {
                if (data.address.state) {
                    userLocation.state = data.address.state;
                }
                if (data.address.postcode) {
                    userLocation.zipcode = data.address.postcode.toString();
                }
                if (data.address.city) {
                    userLocation.city = data.address.city;
                }
            }
        } catch (error) {
            log('Reverse geocode failed:', error.message);
        }
    }

    /**
     * Load ads for all configured placements
     */
    async function loadAllPlacements() {
        const promises = [];
        
        for (const [placementId, settings] of Object.entries(config.placements)) {
            if (settings.containerId) {
                promises.push(loadPlacement(placementId, settings.containerId));
            }
        }

        await Promise.all(promises);
    }

    /**
     * Load ads for a specific placement
     */
    async function loadPlacement(placementId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            log(`Container not found: ${containerId}`);
            return;
        }

        // Show loading state
        container.innerHTML = renderLoadingState(placementId);
        loadedPlacements.add(placementId);

        try {
            // Build query params for geo-targeting
            const params = new URLSearchParams();
            if (userLocation.state) params.set('state', userLocation.state);
            if (userLocation.zipcode) params.set('zipcode', userLocation.zipcode);
            if (userLocation.lat) params.set('lat', userLocation.lat.toString());
            if (userLocation.lng) params.set('lng', userLocation.lng.toString());

            // Call API to get ads
            const url = `/api/ads/placement/${placementId}?${params.toString()}`;
            const response = await fetchWithTimeout(url, config.loadTimeout);
            
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }

            const data = await response.json();

            if (data.ads && data.ads.length > 0) {
                // Render the ad
                renderAd(container, data.ads[0], placementId);
                
                // Record impression
                if (data.ads[0].adId) {
                    recordImpression(data.ads[0].adId);
                }
                
                log(`Ad loaded for ${placementId}`);
            } else {
                // Show fallback content
                renderFallback(container, placementId, data.fallback);
                log(`Fallback shown for ${placementId} (no ads available)`);
            }

        } catch (error) {
            log(`Error loading ad for ${placementId}:`, error.message);
            renderFallback(container, placementId);
        }
    }

    /**
     * Fetch with timeout
     */
    async function fetchWithTimeout(url, timeout) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(id);
            return response;
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    }

    // ============================================
    // RENDERING FUNCTIONS
    // ============================================

    /**
     * Render loading state
     */
    function renderLoadingState(placementId) {
        return `
            <div class="ad-loading" style="padding: 20px; text-align: center; color: #999; background: #f8f9fa; border-radius: 8px; margin: 10px 0;">
                <span style="font-size: 0.8rem;">Loading advertisement...</span>
            </div>
        `;
    }

    /**
     * Render an ad
     */
    function renderAd(container, ad, placementId) {
        const creative = ad.creative || {};
        const adUnitId = ad.adUnitId || '';
        
        // Get ad dimensions from unit ID
        const dimensions = getAdDimensions(adUnitId);
        
        let adHtml = '';

        if (ad.adType === 'native') {
            // Native ad format
            adHtml = renderNativeAd(creative, ad.adId);
        } else {
            // Banner ad format
            adHtml = renderBannerAd(creative, adUnitId, ad.adId, dimensions);
        }

        container.innerHTML = adHtml + '<div class="ad-label">Advertisement</div>';
    }

    /**
     * Get ad dimensions from unit ID
     */
    function getAdDimensions(adUnitId) {
        const dimMap = {
            'banner-320x50': { width: 320, height: 50 },
            'banner-320x100': { width: 320, height: 100 },
            'banner-300x250': { width: 300, height: 250 },
            'banner-728x90': { width: 728, height: 90 },
            'banner-300x600': { width: 300, height: 600 }
        };
        return dimMap[adUnitId] || { width: 320, height: 50 };
    }

    /**
     * Render banner ad
     */
    function renderBannerAd(creative, adUnitId, adId, dimensions) {
        const imageUrl = creative.images && creative.images[0] ? creative.images[0].url : '';
        const clickUrl = creative.cta?.url || '#';
        const headline = creative.headline || '';
        const description = creative.description || '';
        const ctaText = creative.cta?.text || 'Learn More';

        // Build size-specific styles
        const sizeStyles = getBannerStyles(adUnitId);

        return `
            <div class="ad-banner ${sizeStyles.className}" style="${sizeStyles.style}">
                <a href="${clickUrl}" 
                   target="_blank" 
                   rel="noopener noreferrer" 
                   onclick="window.adsSystem.recordClick('${adId}')"
                   style="display: flex; width: 100%; height: 100%; text-decoration: none; align-items: center; justify-content: center;">
                    ${imageUrl ? `
                        <img src="${imageUrl}" 
                             alt="${creative.images[0]?.altText || headline || 'Advertisement'}"
                             style="width: 100%; height: 100%; object-fit: cover;">
                    ` : `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; text-align: center; width: 100%; height: 100%; box-sizing: border-box;">
                            ${headline ? `<div style="font-weight: 700; font-size: ${sizeStyles.headlineSize}; color: #333; margin-bottom: 4px;">${headline}</div>` : ''}
                            ${description ? `<div style="font-size: ${sizeStyles.descSize}; color: #666;">${description}</div>` : ''}
                            <div style="margin-top: 6px; padding: 6px 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 4px; font-size: 11px; font-weight: 600;">${ctaText}</div>
                        </div>
                    `}
                </a>
            </div>
        `;
    }

    /**
     * Get banner-specific styles based on unit type
     */
    function getBannerStyles(adUnitId) {
        const styles = {
            'banner-320x50': {
                className: 'ad-banner-320x50',
                style: 'height: 50px; width: 100%; max-width: 320px; margin: 0 auto;',
                headlineSize: '13px',
                descSize: '10px'
            },
            'banner-320x100': {
                className: 'ad-banner-320x100',
                style: 'height: 100px; width: 100%; max-width: 320px; margin: 0 auto;',
                headlineSize: '16px',
                descSize: '12px'
            },
            'banner-300x250': {
                className: 'ad-banner-300x250',
                style: 'height: 250px; width: 100%; max-width: 300px; margin: 0 auto;',
                headlineSize: '18px',
                descSize: '14px'
            },
            'banner-728x90': {
                className: 'ad-banner-728x90',
                style: 'height: 90px; width: 100%; max-width: 728px; margin: 0 auto;',
                headlineSize: '16px',
                descSize: '12px'
            }
        };
        return styles[adUnitId] || styles['banner-320x50'];
    }

    /**
     * Render native ad
     */
    function renderNativeAd(creative, adId) {
        const imageUrl = creative.images && creative.images[0] ? creative.images[0].url : '';
        const headline = creative.headline || '';
        const description = creative.description || '';
        const ctaText = creative.cta?.text || 'Learn More';
        const ctaUrl = creative.cta?.url || '#';
        const sponsorName = creative.sponsorName || 'Sponsored';

        return `
            <a href="${ctaUrl}" 
               target="_blank" 
               rel="noopener noreferrer" 
               onclick="window.adsSystem.recordClick('${adId}')"
               style="text-decoration: none;">
                <div class="ad-native" style="display: flex; gap: 12px; padding: 12px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin: 10px 0;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${headline}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px; flex-shrink: 0;">` : ''}
                    <div style="flex: 1; display: flex; flex-direction: column;">
                        <div style="font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${sponsorName}</div>
                        <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 4px; line-height: 1.3;">${headline}</div>
                        <div style="font-size: 12px; color: #666; margin-bottom: 8px; line-height: 1.4; flex: 1;">${description}</div>
                        <span style="display: inline-block; padding: 6px 14px; background: #667eea; color: #fff; border-radius: 4px; font-size: 11px; font-weight: 600; align-self: flex-start;">${ctaText}</span>
                    </div>
                </div>
            </a>
        `;
    }

    /**
     * Render fallback content when no ads are available
     */
    function renderFallback(container, placementId, fallbackData = null) {
        const fallback = fallbackData || config.fallback;
        
        // Determine compact mode for top banner
        const isCompact = placementId === 'in-feed-top-banner';
        
        const fallbackHtml = `
            <div class="ad-fallback" style="
                padding: ${isCompact ? '15px' : '20px'};
                text-align: center;
                background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
                border: 1px solid #dee2e6;
                border-radius: 12px;
                margin: 10px 0;
            ">
                <span style="font-size: ${isCompact ? '1.8rem' : '2.5rem'}; display: block; margin-bottom: 10px;">📢</span>
                <div style="font-size: ${isCompact ? '0.95rem' : '1.1rem'}; font-weight: 700; color: #333; margin-bottom: 8px;">
                    ${fallback.title || 'Promote Your Local Business'}
                </div>
                <div style="font-size: ${isCompact ? '0.8rem' : '0.85rem'}; color: #666; margin-bottom: 12px; line-height: 1.4;">
                    ${fallback.description || 'Reach thousands of commuters in your area with targeted advertising'}
                </div>
                <a href="${fallback.ctaUrl || '/contact-us'}" 
                   style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; border-radius: 20px; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: transform 0.2s, box-shadow 0.2s;"
                   onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)';"
                   onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';">
                    ${fallback.ctaText || 'Advertise Here'}
                </a>
                ${fallback.showEmail !== false ? `
                    <div style="margin-top: 12px; font-size: 0.8rem; color: #999;">
                        For business enquiries: <a href="mailto:${fallback.businessEnquiryEmail || 'ads@pdrides.com'}" style="color: #667eea; text-decoration: none;">${fallback.businessEnquiryEmail || 'ads@pdrides.com'}</a>
                    </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = fallbackHtml;
    }

    /**
     * Show fallback for all placements
     */
    function showAllFallbacks() {
        for (const [placementId, settings] of Object.entries(config.placements)) {
            const container = document.getElementById(settings.containerId);
            if (container) {
                renderFallback(container, placementId);
            }
        }
    }

    // ============================================
    // TRACKING FUNCTIONS
    // ============================================

    /**
     * Record ad impression
     */
    async function recordImpression(adId) {
        try {
            await fetch(`/api/ads/${adId}/impression`, { method: 'POST' });
            log(`Impression recorded for ad: ${adId}`);
        } catch (error) {
            log('Failed to record impression:', error.message);
        }
    }

    /**
     * Record ad click
     */
    async function recordClick(adId) {
        try {
            await fetch(`/api/ads/${adId}/click`, { method: 'POST' });
            log(`Click recorded for ad: ${adId}`);
        } catch (error) {
            log('Failed to record click:', error.message);
        }
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    /**
     * Log debug messages
     */
    function log(...args) {
        if (config.debug) {
            console.log('[PDRides Ads]', ...args);
        }
    }

    /**
     * Get current user location
     */
    function getUserLocation() {
        return { ...userLocation };
    }

    /**
     * Update user location
     */
    function updateLocation(newLocation) {
        Object.assign(userLocation, newLocation);
        localStorage.setItem('pdrides_userLocation', JSON.stringify(userLocation));
        
        // Reload ads with new location
        if (isInitialized) {
            loadAllPlacements();
        }
    }

    /**
     * Refresh ads for a specific placement
     */
    async function refreshPlacement(placementId) {
        const settings = config.placements[placementId];
        if (settings && settings.containerId) {
            await loadPlacement(placementId, settings.containerId);
        }
    }

    /**
     * Refresh all ads
     */
    async function refreshAll() {
        loadedPlacements.clear();
        await loadAllPlacements();
    }

    // ============================================
    // AUTO-INITIALIZATION
    // ============================================

    // Check if we should auto-initialize
    function checkAutoInit() {
        // Check for data attribute on body
        if (document.body && document.body.getAttribute('data-ads-auto-init') !== 'false') {
            // Auto-init when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => init());
            } else {
                init();
            }
        }
    }

    // Expose public API
    window.adsSystem = {
        init,
        loadPlacement,
        refreshPlacement,
        refreshAll,
        getUserLocation,
        updateLocation,
        recordImpression,
        recordClick,
        config,
        isInitialized: () => isInitialized
    };

    // Start auto-init
    checkAutoInit();

})();

