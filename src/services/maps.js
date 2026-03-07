import axios from 'axios';

/**
 * Maps Service using OpenStreetMap (Nominatim) - Free, no API key required
 * For production with high volume, consider Mapbox or Google Maps
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address) {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: address,
        format: 'json',
        limit: 1,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'PDRides/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name,
        address: result.address
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(lat, lon) {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'PDRides/1.0'
      }
    });

    if (response.data) {
      return {
        display_name: response.data.display_name,
        address: response.data.address
      };
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error.message);
    return null;
  }
}

/**
 * Calculate route between two points
 */
export async function calculateRoute(startLat, startLon, endLat, endLon) {
  try {
    const response = await axios.get(
      `${OSRM_BASE_URL}/route/v1/driving/${startLon},${startLat};${endLon},${endLat}`,
      {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true
        }
      }
    );

    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        steps: route.legs[0]?.steps || []
      };
    }
    return null;
  } catch (error) {
    console.error('Route calculation error:', error.message);
    return null;
  }
}

/**
 * Format distance for display
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

/**
 * Validate if location is within service area
 */
export function isWithinServiceArea(lat, lon, centerLat, centerLon, maxDistanceKm = 100) {
  const R = 6371;
  const dLat = (lat - centerLat) * Math.PI / 180;
  const dLon = (lon - centerLon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(centerLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance <= maxDistanceKm;
}

/**
 * Search for locations (autocomplete suggestions)
 */
export async function searchLocations(query, limit = 5) {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: limit,
        addressdetails: 1,
        featuretype: 'settlement|road|building'
      },
      headers: {
        'User-Agent': 'PDRides/1.0'
      }
    });

    return response.data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      address: item.address
    }));
  } catch (error) {
    console.error('Location search error:', error.message);
    return [];
  }
}

/**
 * Parse and validate location from user input
 */
export async function parseLocation(input) {
  if (!input || input.trim().length < 3) {
    return { valid: false, location: null, error: 'Please provide a more detailed address' };
  }

  const geocoded = await geocodeAddress(input);
  
  if (!geocoded) {
    return { valid: false, location: null, error: 'Could not find that location. Please try with a more specific address.' };
  }

  const hasStreetInfo = geocoded.address && (
    geocoded.address.road || 
    geocoded.address.house_number ||
    geocoded.address.street
  );

  if (!hasStreetInfo) {
    return { 
      valid: false, 
      location: geocoded, 
      error: 'Please provide a street address, not just a city or state.' 
    };
  }

  return { 
    valid: true, 
    location: geocoded, 
    error: null 
  };
}

/**
 * Generate static map URL
 */
export function generateStaticMapUrl(lat, lon, zoom = 15) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=400x300&markers=${lat},${lon},ol-marker`;
}

/**
 * Extract city and state from geocoded result
 */
export function extractCityState(address) {
  const city = address.city || address.town || address.village || address.suburb || address.county;
  const state = address.state || address.state_code;
  
  if (city && state) {
    return `${city}, ${state}`;
  } else if (city) {
    return city;
  } else if (state) {
    return state;
  }
  return address.display_name || 'Unknown location';
}

/**
 * Calculate price based on distance using PDRides fare structure
 * Fare Structure:
 * - First mile: $5.00 flat
 * - Under 5 mi: $5 + (mi − 1)
 * - 5 – 10 mi: $5 + mi
 * - 10 – 15 mi: $5 + 1.1×mi
 * - 15 – 20 mi: $5 + 1.2×mi
 * - Above 20 mi: $5 + 1.3×mi
 * 
 * Child seat discounts:
 * - infant: 50% off adult price (requires infant car seat)
 * - booster: 25% off adult price (uses booster seat)
 * - none: no discount
 */
export function calculatePrice(distanceMeters, seats = 1, tipAmount = 0) {
  const distanceMiles = distanceMeters / 1609.34;
  
  let pricePerSeat;
  
  if (distanceMiles <= 1) {
    // First mile: $5.00 flat
    pricePerSeat = 5.00;
  } else if (distanceMiles < 5) {
    // Under 5 mi: $5 + (mi − 1)
    pricePerSeat = 5 + (distanceMiles - 1);
  } else if (distanceMiles < 10) {
    // 5 – 10 mi: $5 + mi
    pricePerSeat = 5 + distanceMiles;
  } else if (distanceMiles < 15) {
    // 10 – 15 mi: $5 + 1.1×mi
    pricePerSeat = 5 + (1.1 * distanceMiles);
  } else if (distanceMiles < 20) {
    // 15 – 20 mi: $5 + 1.2×mi
    pricePerSeat = 5 + (1.2 * distanceMiles);
  } else {
    // Above 20 mi: $5 + 1.3×mi
    pricePerSeat = 5 + (1.3 * distanceMiles);
  }
  
  // Round to 2 decimal places
  pricePerSeat = Math.round(pricePerSeat * 100) / 100;
  
  // Add tip if provided
  const totalWithTip = (pricePerSeat * seats) + tipAmount;
  return Math.round(totalWithTip * 100) / 100;
}

/**
 * Calculate price with adult/child breakdown
 * @param {number} distanceMeters - Distance in meters
 * @param {number} adults - Number of adult passengers
 * @param {number} children - Number of child passengers
 * @param {string} childSeatType - 'infant', 'booster', or 'none'
 * @returns {object} Price breakdown object
 */
export function calculatePriceWithBreakdown(distanceMeters, adults = 1, children = 0, childSeatType = 'none') {
  const distanceMiles = distanceMeters / 1609.34;
  
  // Calculate base price per mile
  let pricePerMile;
  if (distanceMiles <= 1) {
    pricePerMile = 5.00; // Flat rate for first mile
  } else if (distanceMiles < 5) {
    pricePerMile = 5 + (distanceMiles - 1);
  } else if (distanceMiles < 10) {
    pricePerMile = 5 + distanceMiles;
  } else if (distanceMiles < 15) {
    pricePerMile = 5 + (1.1 * distanceMiles);
  } else if (distanceMiles < 20) {
    pricePerMile = 5 + (1.2 * distanceMiles);
  } else {
    pricePerMile = 5 + (1.3 * distanceMiles);
  }
  
  // Round base price
  const basePricePerSeat = Math.round(pricePerMile * 100) / 100;
  
  // Calculate child discount
  let childDiscount = 0;
  if (childSeatType === 'infant') {
    childDiscount = 0.50; // 50% off for infant seat
  } else if (childSeatType === 'booster') {
    childDiscount = 0.25; // 25% off for booster seat
  }
  
  const pricePerAdult = basePricePerSeat;
  const pricePerChild = basePricePerSeat * (1 - childDiscount);
  
  const adultTotal = pricePerAdult * adults;
  const childTotal = pricePerChild * children;
  const totalPrice = adultTotal + childTotal;
  
  return {
    basePricePerSeat,
    pricePerAdult,
    pricePerChild,
    adultDiscount: 0,
    childDiscount: childDiscount * 100, // as percentage
    adults,
    children,
    childSeatType,
    adultTotal: Math.round(adultTotal * 100) / 100,
    childTotal: Math.round(childTotal * 100) / 100,
    totalPrice: Math.round(totalPrice * 100) / 100,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    currency: 'USD'
  };
}

/**
 * Calculate detailed fare breakdown for receipt
 * @param {number} distanceMeters - Distance in meters
 * @param {number} adults - Number of adults
 * @param {number} children - Number of children
 * @param {string} childSeatType - Child seat type
 * @returns {object} Detailed fare breakdown
 */
export function calculateDetailedFare(distanceMeters, adults = 1, children = 0, childSeatType = 'none') {
  const distanceMiles = distanceMeters / 1609.34;
  
  // Base fare components
  let baseFare = 5.00;
  let distanceRate;
  
  if (distanceMiles <= 1) {
    distanceRate = 0;
  } else if (distanceMiles < 5) {
    distanceRate = distanceMiles - 1;
  } else if (distanceMiles < 10) {
    distanceRate = distanceMiles;
  } else if (distanceMiles < 15) {
    distanceRate = 1.1 * distanceMiles;
  } else if (distanceMiles < 20) {
    distanceRate = 1.2 * distanceMiles;
  } else {
    distanceRate = 1.3 * distanceMiles;
  }
  
  const distanceFare = distanceRate;
  
  // Child seat discount
  let childDiscountRate = 0;
  if (childSeatType === 'infant') {
    childDiscountRate = 0.50;
  } else if (childSeatType === 'booster') {
    childDiscountRate = 0.25;
  }
  
  // Calculate per person fares
  const adultFare = baseFare + distanceFare;
  const childFare = adultFare * (1 - childDiscountRate);
  
  const subtotalAdults = adultFare * adults;
  const subtotalChildren = childFare * children;
  const subtotal = subtotalAdults + subtotalChildren;
  
  return {
    distance: distanceMeters,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    baseFare,
    distanceFare: Math.round(distanceFare * 100) / 100,
    adultFare: Math.round(adultFare * 100) / 100,
    childFare: Math.round(childFare * 100) / 100,
    adults,
    children,
    childSeatType,
    childDiscountRate,
    subtotalAdults: Math.round(subtotalAdults * 100) / 100,
    subtotalChildren: Math.round(subtotalChildren * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(subtotal * 100) / 100,
    currency: 'USD'
  };
}

/**
 * Check if two locations are the same (within small radius)
 */
export function isSameLocation(lat1, lon1, lat2, lon2, thresholdMeters = 100) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance <= thresholdMeters;
}

