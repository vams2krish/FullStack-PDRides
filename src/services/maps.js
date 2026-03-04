import axios from 'axios';

/**
 * Maps Service using OpenStreetMap (Nominatim) - Free, no API key required
 * For production with high volume, consider Mapbox or Google Maps
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const OSRM_BASE_URL = 'https://router.project-osrm.org';

/**
 * Geocode an address to coordinates
 * @param {string} address - The address to geocode
 * @returns {Promise<{lat: number, lon: number, display_name: string} | null>}
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
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<{display_name: string, address: object} | null>}
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
 * @param {number} startLat - Start latitude
 * @param {number} startLon - Start longitude
 * @param {number} endLat - End latitude
 * @param {number} endLon - End longitude
 * @returns {Promise<{distance: number, duration: number, geometry: object} | null>}
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
        distance: route.distance, // in meters
        duration: route.duration, // in seconds
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
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Format duration for display
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
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
 * Validate if location is within service area (e.g., certain radius from city center)
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} centerLat - Center latitude
 * @param {number} centerLon - Center longitude
 * @param {number} maxDistanceKm - Maximum distance in km
 * @returns {boolean} True if within service area
 */
export function isWithinServiceArea(lat, lon, centerLat, centerLon, maxDistanceKm = 100) {
  const R = 6371; // Earth's radius in km
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
 * Search for locations (autocomplete)
 * @param {string} query - Search query
 * @returns {Promise<Array<{display_name: string, lat: number, lon: number}>>}
 */
export async function searchLocations(query) {
  try {
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: 5,
        addressdetails: 0
      },
      headers: {
        'User-Agent': 'PDRides/1.0'
      }
    });

    return response.data.map(item => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon)
    }));
  } catch (error) {
    console.error('Location search error:', error.message);
    return [];
  }
}

/**
 * Parse and validate location from user input
 * @param {string} input - User's location input
 * @returns {Promise<{valid: boolean, location: object, error: string | null}>}
 */
export async function parseLocation(input) {
  if (!input || input.trim().length < 3) {
    return { valid: false, location: null, error: 'Please provide a more detailed address' };
  }

  const geocoded = await geocodeAddress(input);
  
  if (!geocoded) {
    return { valid: false, location: null, error: 'Could not find that location. Please try with a more specific address.' };
  }

  // Check if it looks like a valid street address (has house number or street name)
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
 * Generate static map URL (using OpenStreetMap tiles via staticmap service)
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} zoom - Zoom level
 * @returns {string} Map image URL
 */
export function generateStaticMapUrl(lat, lon, zoom = 15) {
  // Using staticmap service (free) or you can use Mapbox/Google for production
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=${zoom}&size=400x300&markers=${lat},${lon},ol-marker`;
}

/**
 * Extract city and state from geocoded result
 * @param {object} address - Nominatim address object
 * @returns {string} City and state
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
 * @param {number} distanceMeters - Distance in meters
 * @param {number} seats - Number of seats
 * @returns {number} Calculated price per seat
 * 
 * Fare Structure:
 * - First mile: $5.00 flat
 * - Under 5 mi: $5 + (mi − 1)
 * - 5 – 10 mi: $5 + mi
 * - 10 – 15 mi: $5 + 1.1×mi
 * - 15 – 20 mi: $5 + 1.2×mi
 * - Above 20 mi: $5 + 1.3×mi
 */
export function calculatePrice(distanceMeters, seats = 1) {
  const distanceMiles = distanceMeters / 1609.34; // Convert meters to miles
  
  let pricePerSeat;
  
  if (distanceMiles <= 1) {
    // First mile: $5.00 flat
    pricePerSeat = 5;
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
  
  return pricePerSeat * seats;
}


/**
 * Check if two locations are the same (within small radius)
 * @param {number} lat1 - First location lat
 * @param {number} lon1 - First location lon
 * @param {number} lat2 - Second location lat
 * @param {number} lon2 - Second location lon
 * @param {number} thresholdMeters - Distance threshold in meters
 * @returns {boolean} True if same location
 */
export function isSameLocation(lat1, lon1, lat2, lon2, thresholdMeters = 100) {
  const R = 6371000; // Earth's radius in meters
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
