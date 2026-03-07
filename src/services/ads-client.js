/**
 * Ads Client - Frontend JavaScript for Loading and Displaying Geo-Targeted Ads
 * Works with the adService backend to display ads based on user location
 */

// User location cache
let userLocation = {
    state: null,
    zipcode: null,
    lat: null,
    lng: null
};

// Default fallback content (from config)
const DEFAULT_FALLBACK = {
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
};

// Initialize ads when page loads
document.addEventListener('DOMContentLoaded', function() {
    initAds();
});

// Initialize ads system
async function initAds() {
    // Try to get user's location from various sources
    await getUserLocation();
    
    // Load ads for both placements
    loadAdPlacement('in-feed-top-banner', 'ad-placement-top');
    loadAdPlacement('in-feed-middle-banner', 'ad-placement-middle');
}

// Get user's location from different sources
async function getUserLocation() {
    // Try to get from localStorage (if previously saved)
    const savedLocation = localStorage.getItem('pdrides_userLocation');
    if (savedLocation) {
        const parsed = JSON.parse(savedLocation);
        userLocation = { ...userLocation, ...parsed };
    }
    
    // Try to get from browser geolocation
    if (navigator.geolocation) {
        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 300000 // 5 minutes cache
                });
            });
            
            userLocation.lat = position.coords.latitude;
            userLocation.lng = position.coords.longitude;
            
            // Try to get state/zip from coordinates
            await reverseGeocode(userLocation.lat, userLocation.lng);
        } catch (error) {
            console.log('Geolocation not available or permission denied');
        }
    }
    
    // Try to extract from URL params
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('state')) {
        userLocation.state = urlParams.get('state');
    }
    if (urlParams.get('zipcode')) {
        userLocation.zipcode = urlParams.get('zipcode');
    }
    
    // Save to localStorage
    localStorage.setItem('pdrides_userLocation', JSON.stringify(userLocation));
}

// Reverse geocode to get state and zipcode
async function reverseGeocode(lat, lng) {
    try {
        const response = await fetch(`/api/reverse-geocode?lat=${lat}&lon=${lng}`);
        const data = await response.json();
        
        if (data.success && data.address) {
            // Extract state from address
            if (data.address.state) {
                userLocation.state = data.address.state;
            }
            // Try to extract zipcode
            if (data.address.postcode) {
                userLocation.zipcode = data.address.postcode.toString();
            }
        }
    } catch (error) {
        console.error('Reverse geocode error:', error);
    }
}

// Load ad for a specific placement
async function loadAdPlacement(placementId, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Ad container ${containerId} not found`);
        return;
    }
    
    try {
        // Call the API to get ads
        const response = await fetch(`/api/ads/placement/${placementId}?state=${userLocation.state || ''}&zipcode=${userLocation.zipcode || ''}&lat=${userLocation.lat || ''}&lng=${userLocation.lng || ''}`);
        const data = await response.json();
        
        if (data.ads && data.ads.length > 0) {
            // Display the first matching ad
            renderAd(data.ads[0], container, placementId);
            
            // Record impression
            if (data.ads[0].adId) {
                recordAdImpression(data.ads[0].adId);
            }
        } else {
            // Show fallback content
            renderFallback(container, placementId, data.fallback);
        }
    } catch (error) {
        console.error('Error loading ads:', error);
        // Show fallback on error
        renderFallback(container, placementId, DEFAULT_FALLBACK);
    }
}

// Render an ad
function renderAd(ad, container, placementId) {
    const creative = ad.creative || {};
    const adUnitId = ad.adUnitId || '';
    
    // Determine ad size class based on adUnitId
    let sizeClass = 'ad-banner-320x50';
    if (adUnitId.includes('300x250')) {
        sizeClass = 'ad-banner-300x250';
    } else if (adUnitId.includes('728x90')) {
        sizeClass = 'ad-banner-728x90';
    }
    
    // Build ad HTML based on ad type
    let adHtml = '';
    
    if (ad.adType === 'native') {
        // Native ad format
        const imageUrl = creative.images && creative.images[0] ? creative.images[0].url : '';
        adHtml = `
            <a href="${creative.cta?.url || '#'}" target="_blank" rel="noopener noreferrer" onclick="recordAdClick('${ad.adId}')">
                <div class="ad-native">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${creative.images[0].altText || 'Ad'}" class="ad-native-image">` : ''}
                    <div class="ad-native-content">
                        <div class="ad-native-sponsored">Sponsored - ${creative.sponsorName || 'Advertisement'}</div>
                        <div class="ad-native-headline">${creative.headline || ''}</div>
                        <div class="ad-native-description">${creative.description || ''}</div>
                        ${creative.cta ? `<span class="ad-native-cta">${creative.cta.text || 'Learn More'}</span>` : ''}
                    </div>
                </div>
            </a>
        `;
    } else {
        // Banner ad format
        const imageUrl = creative.images && creative.images[0] ? creative.images[0].url : '';
        const clickUrl = creative.cta?.url || '#';
        
        adHtml = `
            <div class="ad-banner ${sizeClass}">
                <a href="${clickUrl}" target="_blank" rel="noopener noreferrer" onclick="recordAdClick('${ad.adId}')">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${creative.images[0].altText || creative.headline || 'Advertisement'}">` : `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; text-align: center; width: 100%; height: 100%;">
                            <div style="font-weight: 700; font-size: 14px; color: #333; margin-bottom: 4px;">${creative.headline || ''}</div>
                            <div style="font-size: 11px; color: #666;">${creative.description || ''}</div>
                            ${creative.cta ? `<div style="margin-top: 6px; padding: 4px 12px; background: #667eea; color: white; border-radius: 4px; font-size: 10px; font-weight: 600;">${creative.cta.text}</div>` : ''}
                        </div>
                    `}
                </a>
            </div>
        `;
    }
    
    container.innerHTML = adHtml + '<div class="ad-label">Advertisement</div>';
}

// Render fallback content
function renderFallback(container, placementId, fallback) {
    fallback = fallback || DEFAULT_FALLBACK;
    
    const fallbackHtml = `
        <div class="ad-fallback" style="background: linear-gradient(135deg, ${fallback.backgroundColor || '#f8f9fa'} 0%, #e9ecef 100%);">
            <span class="ad-fallback-icon">📢</span>
            <div class="ad-fallback-title">${fallback.title || 'Promote Your Local Business'}</div>
            <div class="ad-fallback-description">${fallback.description || 'Reach thousands of commuters in your area'}</div>
            <a href="${fallback.ctaUrl || '/contact-us'}" class="ad-fallback-cta" style="background: linear-gradient(135deg, ${fallback.accentColor || '#667eea'} 0%, #764ba2 100%);">
                ${fallback.ctaText || 'Advertise With Us'}
            </a>
            ${fallback.showEmail !== false ? `
                <div class="ad-fallback-contact">
                    Contact: <a href="mailto:${fallback.contactEmail || 'ads@pdrides.com'}">${fallback.contactEmail || 'ads@pdrides.com'}</a>
                </div>
            ` : ''}
        </div>
    `;
    
    container.innerHTML = fallbackHtml;
}

// Record ad impression
async function recordAdImpression(adId) {
    try {
        await fetch(`/api/ads/${adId}/impression`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error recording impression:', error);
    }
}

// Record ad click
async function recordAdClick(adId) {
    try {
        await fetch(`/api/ads/${adId}/click`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Error recording click:', error);
    }
}

// Export functions for global use
window.loadAdPlacement = loadAdPlacement;
window.recordAdImpression = recordAdImpression;
window.recordAdClick = recordAdClick;

