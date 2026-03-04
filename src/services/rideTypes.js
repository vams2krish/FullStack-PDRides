/**
 * Uber-style Ride Types Configuration
 * Defines different ride categories with pricing multipliers
 */

export const RIDE_TYPES = {
  uberx: {
    id: 'uberx',
    name: 'UberX',
    description: 'Affordable, everyday rides',
    icon: '🚗',
    basePrice: 5.00,
    pricePerMile: 0.25,
    pricePerMinute: 0.10,
    minPrice: 8.00,
    maxDistance: 50,
    capacity: 4,
    amenities: ['AC', 'Music']
  },
  uberxl: {
    id: 'uberxl',
    name: 'UberXL',
    description: 'Affordable rides for groups up to 6',
    icon: '🚙',
    basePrice: 8.00,
    pricePerMile: 0.35,
    pricePerMinute: 0.15,
    minPrice: 12.00,
    maxDistance: 50,
    capacity: 6,
    amenities: ['AC', 'Music', 'Extra Space']
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    description: 'Luxury vehicles with top-rated drivers',
    icon: '🏎️',
    basePrice: 15.00,
    pricePerMile: 0.50,
    pricePerMinute: 0.25,
    minPrice: 25.00,
    maxDistance: 100,
    capacity: 4,
    amenities: ['AC', 'Premium Sound', 'WiFi', 'Water']
  },
  comfort: {
    id: 'comfort',
    name: 'Comfort',
    description: 'Newer cars with extra legroom',
    icon: '💺',
    basePrice: 10.00,
    pricePerMile: 0.40,
    pricePerMinute: 0.20,
    minPrice: 18.00,
    maxDistance: 75,
    capacity: 4,
    amenities: ['AC', 'Extra Legroom', 'Music']
  }
};

/**
 * Calculate fare based on distance, duration, and ride type
 * @param {number} distanceMeters - Distance in meters
 * @param {number} durationSeconds - Duration in seconds
 * @param {string} rideTypeId - Ride type ID
 * @returns {object} Fare breakdown
 */
export function calculateFare(distanceMeters, durationSeconds, rideTypeId) {
  const rideType = RIDE_TYPES[rideTypeId] || RIDE_TYPES.uberx;
  
  const distanceMiles = distanceMeters / 1609.34;
  const durationMinutes = durationSeconds / 60;
  
  // Calculate components
  const baseFare = rideType.basePrice;
  const distanceFare = distanceMiles * rideType.pricePerMile;
  const timeFare = durationMinutes * rideType.pricePerMinute;
  
  // Calculate total
  let totalFare = baseFare + distanceFare + timeFare;
  
  // Apply minimum price
  if (totalFare < rideType.minPrice) {
    totalFare = rideType.minPrice;
  }
  
  // Round to 2 decimal places
  return {
    rideType: rideTypeId,
    rideTypeName: rideType.name,
    rideTypeIcon: rideType.icon,
    baseFare: Math.round(baseFare * 100) / 100,
    distanceFare: Math.round(distanceFare * 100) / 100,
    timeFare: Math.round(timeFare * 100) / 100,
    subtotal: Math.round((baseFare + distanceFare + timeFare) * 100) / 100,
    minimumFare: rideType.minPrice,
    totalFare: Math.round(totalFare * 100) / 100,
    currency: 'USD',
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    durationMinutes: Math.round(durationMinutes),
    capacity: rideType.capacity,
    amenities: rideType.amenities
  };
}

/**
 * Get all available ride types
 * @returns {Array} List of ride types
 */
export function getAvailableRideTypes() {
  return Object.values(RIDE_TYPES).map(rt => ({
    id: rt.id,
    name: rt.name,
    description: rt.description,
    icon: rt.icon,
    capacity: rt.capacity,
    minPrice: rt.minPrice
  }));
}

/**
 * Format fare for display
 * @param {object} fare - Fare breakdown
 * @returns {string} Formatted fare text
 */
export function formatFare(fare) {
  return (
    `💰 *Fare Estimate*\n\n` +
    `${fare.rideTypeIcon} *${fare.rideTypeName}*\n\n` +
    `📏 Distance: ${fare.distanceMiles} miles\n` +
    `⏱️ Est. time: ${fare.durationMinutes} min\n\n` +
    `*Price Breakdown:*\n` +
    `Base fare: $${fare.baseFare.toFixed(2)}\n` +
    `Distance: $${fare.distanceFare.toFixed(2)}\n` +
    `Time: $${fare.timeFare.toFixed(2)}\n\n` +
    `*Total: $${fare.totalFare.toFixed(2)}*`
  );
}

/**
 * Trip status definitions
 */
export const TRIP_STATUS = {
  DRIVER_ASSIGNED: 'driver_assigned',
  DRIVER_EN_ROUTE: 'driver_en_route',
  DRIVER_ARRIVED: 'driver_arrived',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Get trip status message
 * @param {string} status - Trip status
 * @param {object} tripData - Trip information
 * @returns {string} Status message
 */
export function getTripStatusMessage(status, tripData) {
  const { driverName, driverRating, vehicleInfo, etaMinutes, pickupLocation } = tripData;
  
  switch (status) {
    case TRIP_STATUS.DRIVER_ASSIGNED:
      return (
        `✅ *Driver Assigned!*\n\n` +
        `👤 Driver: ${driverName}\n` +
        `⭐ Rating: ${driverRating} ★\n` +
        `🚗 Vehicle: ${vehicleInfo}\n\n` +
        `Driver is heading to pick you up.\n` +
        `ETA: ${etaMinutes} minutes`
      );
      
    case TRIP_STATUS.DRIVER_EN_ROUTE:
      return (
        `🚗 *Driver En Route*\n\n` +
        `👤 ${driverName} is on the way\n` +
        `📍 Heading to: ${pickupLocation}\n` +
        `⏱️ ETA: ${etaMinutes} min\n\n` +
        `Track your driver on the map`
      );
      
    case TRIP_STATUS.DRIVER_ARRIVED:
      return (
        `🎉 *Driver Arrived!*\n\n` +
        `Your driver has arrived at the pickup location.\n\n` +
        `🚗 ${vehicleInfo}\n` +
        `👤 Driver: ${driverName}\n\n` +
        `Please board the vehicle when ready.`
      );
      
    case TRIP_STATUS.IN_PROGRESS:
      return (
        `🚗 *Trip in Progress*\n\n` +
        `You're on your way to your destination.\n\n` +
        `Stay safe and enjoy the ride!`
      );
      
    case TRIP_STATUS.COMPLETED:
      return (
        `✅ *Trip Completed!*\n\n` +
        `Thank you for riding with PDRides!\n\n` +
        `📝 Trip receipt has been sent.\n` +
        `⭐ Rate your driver: Reply with 1-5 stars`
      );
      
    case TRIP_STATUS.CANCELLED:
      return (
        `❌ *Trip Cancelled*\n\n` +
        `Your ride has been cancelled.\n\n` +
        `If you need a new ride, type "find ride"`
      );
      
    default:
      return 'Processing your request...';
  }
}

/**
 * Generate mock driver data for demo
 * @returns {object} Driver information
 */
export function getMockDriver() {
  const firstNames = ['John', 'Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'Robert', 'Amanda'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  const carModels = ['Toyota Camry', 'Honda Accord', 'Hyundai Sonata', 'Kia Optima', 'Nissan Altima'];
  const carColors = ['Black', 'White', 'Silver', 'Blue', 'Gray'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const carModel = carModels[Math.floor(Math.random() * carModels.length)];
  const carColor = carColors[Math.floor(Math.random() * carColors.length)];
  const plates = `${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  return {
    name: `${firstName} ${lastName}`,
    rating: (4.5 + Math.random() * 0.5).toFixed(1),
    vehicleInfo: `${carColor} ${carModel}`,
    licensePlate: plates,
    phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`
  };
}

/**
 * Generate trip receipt
 * @param {object} tripData - Complete trip information
 * @returns {string} Receipt message
 */
export function generateReceipt(tripData) {
  const { fare, pickupLocation, destination, distance, duration, driverName, tripDate } = tripData;
  
  return (
    `🧾 *Trip Receipt*\n\n` +
    `📅 ${tripDate}\n` +
    `👤 Driver: ${driverName}\n\n` +
    `*Trip Details:*\n` +
    `📍 From: ${pickupLocation}\n` +
    `🏁 To: ${destination}\n` +
    `📏 Distance: ${distance} miles\n` +
    `⏱️ Duration: ${duration} min\n\n` +
    `*Fare Breakdown:*\n` +
    `Base Fare: $${fare.baseFare.toFixed(2)}\n` +
    `Distance (${distance} mi): $${fare.distanceFare.toFixed(2)}\n` +
    `Time (${duration} min): $${fare.timeFare.toFixed(2)}\n\n` +
    `*Total: $${fare.totalFare.toFixed(2)}*\n\n` +
    `Thank you for riding with PDRides!`
  );
}
