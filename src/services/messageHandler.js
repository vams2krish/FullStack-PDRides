import User from '../models/User.js';
import Ride from '../models/Ride.js';
import Conversation from '../models/Conversation.js';
import { 
  sendTextMessage, 
  sendButtonMessage, 
  sendListMessage,
  parseIncomingMessage 
} from './whatsapp.js';
import { 
  parseLocation, 
  calculateRoute, 
  formatDistance, 
  formatDuration,
  extractCityState,
  generateStaticMapUrl 
} from './maps.js';
import {
  RIDE_TYPES,
  calculateFare,
  getAvailableRideTypes,
  formatFare,
  getMockDriver,
  generateReceipt,
  TRIP_STATUS
} from './rideTypes.js';

const MAX_RESULTS = parseInt(process.env.MAX_RIDE_RESULTS) || 5;

// Welcome message
const WELCOME_MESSAGE = `🚗 Welcome to *PDRides* - Community Carpooling!

Find or offer rides in your neighborhood. Save money, reduce traffic, and connect with your community.`;

// Main menu
const showMainMenu = async (phoneNumber) => {
  const text = `What would you like to do?`;
  const buttons = [
    { id: 'offer_ride', title: '🚗 Offer a Ride' },
    { id: 'find_ride', title: '🔍 Find a Ride' },
    { id: 'my_rides', title: '📋 My Rides' }
  ];
  
  await sendButtonMessage(phoneNumber, text, buttons);
};

// Onboarding flow
const handleOnboarding = async (phoneNumber, text, conversation) => {
  if (conversation.state === 'onboarding_name') {
    const name = text.trim();
    if (name.length < 2) {
      await sendTextMessage(phoneNumber, 'Please enter your name (at least 2 characters):');
      return;
    }
    
    await User.findOneAndUpdate(
      { phoneNumber },
      { name, onboardingComplete: true }
    );
    
    await conversation.setState('idle');
    await sendTextMessage(phoneNumber, `Nice to meet you, ${name}! 👋`);
    await showMainMenu(phoneNumber);
  }
};

// Start offering a ride
const startOfferRide = async (phoneNumber, conversation) => {
  await conversation.setState('offering_pickup');
  await sendTextMessage(phoneNumber, 
    '🚗 *Offer a Ride*\n\nWhere will you pick up passengers? (e.g., "Downtown Metuchen", "Rutgers Busch Campus")\n\nOr share your location:'
  );
};

// Handle offer ride flow
const handleOfferRide = async (phoneNumber, text, conversation, messageData) => {
  const { tempData } = conversation;
  
  switch (conversation.state) {
    case 'offering_pickup':
      await sendTextMessage(phoneNumber, '📍 Validating pickup location...');
      const pickupResult = await parseLocation(text);
      
      if (!pickupResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${pickupResult.error || 'Could not find that location. Please try again with a more specific address:'}`
        );
        return;
      }
      
      const pickupLocation = extractCityState(pickupResult.location.address);
      await conversation.setState('offering_destination', { 
        pickup: pickupLocation,
        pickupLat: pickupResult.location.lat,
        pickupLng: pickupResult.location.lon,
        pickupAddress: pickupResult.location.display_name
      });
      
      await sendTextMessage(phoneNumber, 
        `✅ Found: ${pickupResult.location.display_name}\n\nWhere are you going to? (Enter destination address)`
      );
      break;
      
    case 'offering_destination':
      await sendTextMessage(phoneNumber, '📍 Validating destination...');
      const destResult = await parseLocation(text);
      
      if (!destResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${destResult.error || 'Could not find that location. Please try again:'}`
        );
        return;
      }
      
// Calculate route
      const route = await calculateRoute(
        tempData.pickupLat,
        tempData.pickupLng,
        destResult.location.lat,
        destResult.location.lon
      );
      
      const destination = extractCityState(destResult.location.address);
      
      // Calculate suggested price based on distance (e.g., $0.15 per km or $0.25 per mile)
      let suggestedPrice = 0;
      if (route?.distance) {
        const distanceMiles = route.distance / 1609.34; // Convert meters to miles
        suggestedPrice = Math.round(distanceMiles * 0.25); // $0.25 per mile
        if (suggestedPrice < 5) suggestedPrice = 5; // Minimum $5
        if (suggestedPrice > 50) suggestedPrice = 50; // Cap at $50
      }
      
      const routeInfo = route 
        ? `\n\n📏 Distance: ${formatDistance(route.distance)}\n⏱️ Estimated time: ${formatDuration(route.duration)}\n💰 Suggested contribution: $${suggestedPrice} (based on ${(route.distance / 1609.34).toFixed(1)} miles)`
        : '';
      
      await conversation.setState('offering_date', { 
        ...tempData, 
        destination,
        destLat: destResult.location.lat,
        destLng: destResult.location.lon,
        destAddress: destResult.location.display_name,
        routeDistance: route?.distance,
        routeDuration: route?.duration,
        suggestedPrice
      });
      
      await sendTextMessage(phoneNumber, 
        `✅ Found: ${destResult.location.display_name}${routeInfo}\n\nWhen is this ride?\n\nOptions:\n• Today\n• Tomorrow\n• Monday, Tuesday, etc.\n• MM/DD/YYYY`
      );
      break;
      
    case 'offering_date':
      const date = parseDate(text);
      if (!date) {
        await sendTextMessage(phoneNumber, 'Sorry, I didn\'t understand that date. Please try again (e.g., "today", "tomorrow", "Monday"):');
        return;
      }
      await conversation.setState('offering_time', { ...tempData, date });
      await sendTextMessage(phoneNumber, 'What time? (e.g., "8:00 AM", "5:30 PM", "14:00")');
      break;
      
    case 'offering_time':
      const time = parseTime(text);
      if (!time) {
        await sendTextMessage(phoneNumber, 'Sorry, I didn\'t understand that time. Please try again (e.g., "8:00 AM"):');
        return;
      }
      await conversation.setState('offering_seats', { ...tempData, time });
      await sendTextMessage(phoneNumber, 'How many seats available? (1-7)');
      break;
      
    case 'offering_seats':
      const seats = parseInt(text);
      if (isNaN(seats) || seats < 1 || seats > 7) {
        await sendTextMessage(phoneNumber, 'Please enter a number between 1 and 7:');
        return;
      }
      await conversation.setState('offering_contribution', { ...tempData, seats });
      
      // Build button options with suggested price if available
      const buttons = [
        { id: 'contrib_free', title: 'Free' }
      ];
      
      // Add suggested price button if we have route data
      if (tempData.suggestedPrice && tempData.suggestedPrice > 0) {
        buttons.push({ id: `contrib_${tempData.suggestedPrice}`, title: `💰 $${tempData.suggestedPrice} (suggested)` });
      }
      
      buttons.push(
        { id: 'contrib_5', title: '$5' },
        { id: 'contrib_10', title: '$10' },
        { id: 'contrib_other', title: 'Other' }
      );
      
      const contributionText = tempData.suggestedPrice 
        ? `💡 Based on the ${(tempData.routeDistance / 1609.34).toFixed(1)} mile route, we suggest $${tempData.suggestedPrice} per person.\n\nIs there a contribution for gas/parking?`
        : 'Is there a contribution for gas/parking?';
      
      await sendButtonMessage(phoneNumber, contributionText, buttons);
      break;
      
    case 'offering_contribution':
      let contribution = 0;
      if (text === '$5' || text.includes('5')) contribution = 5;
      else if (text === '$10' || text.includes('10')) contribution = 10;
      else if (!text.toLowerCase().includes('free')) {
        const match = text.match(/\d+/);
        if (match) contribution = parseInt(match[0]);
      }
      
      await conversation.setState('offering_tags', { ...tempData, contribution });
      await sendTextMessage(phoneNumber, 
        'Any preferences? (Reply with numbers, or "none")\n\n1️⃣ Female passengers only\n2️⃣ No smoking\n3️⃣ Pets OK\n4️⃣ Quiet ride\n5️⃣ AC available'
      );
      break;
      
    case 'offering_tags':
      const tags = [];
      const lowerText = text.toLowerCase();
      if (lowerText.includes('1')) tags.push('female-only');
      if (lowerText.includes('2')) tags.push('no-smoking');
      if (lowerText.includes('3')) tags.push('pets-ok');
      if (lowerText.includes('4')) tags.push('quiet-ride');
      if (lowerText.includes('5')) tags.push('ac');
      
      await conversation.setState('offering_confirm', { ...tempData, tags });
      
      const confirmText = `*Please confirm your ride:*\n\n` +
        `📍 From: ${tempData.pickup}\n` +
        `🏁 To: ${tempData.destination}\n` +
        `📅 Date: ${formatDate(tempData.date)}\n` +
        `⏰ Time: ${tempData.time}\n` +
        `💺 Seats: ${tempData.seats}\n` +
        `💰 Contribution: ${tempData.contribution > 0 ? '$' + tempData.contribution : 'Free'}\n` +
        `${tags.length > 0 ? '🏷️ Tags: ' + tags.join(', ') : ''}\n\n` +
        `Is this correct?`;
      
      await sendButtonMessage(phoneNumber, confirmText, [
        { id: 'confirm_yes', title: '✅ Yes, Post' },
        { id: 'confirm_no', title: '❌ Cancel' }
      ]);
      break;
      
    case 'offering_confirm':
      if (text.toLowerCase().includes('yes') || text.includes('✅')) {
        // Save the ride
        const user = await User.findOne({ phoneNumber });
        const expiresAt = new Date(tempData.date);
        expiresAt.setHours(expiresAt.getHours() + 24); // Expire 24h after ride time
        
        const ride = new Ride({
          driverPhone: phoneNumber,
          driverName: user?.name || 'Anonymous',
          pickupLocation: tempData.pickup,
          destination: tempData.destination,
          date: tempData.date,
          time: tempData.time,
          totalSeats: tempData.seats,
          availableSeats: tempData.seats,
          contribution: tempData.contribution,
          tags: tempData.tags || [],
          expiresAt,
          pickupLat: tempData.pickupLat,
          pickupLng: tempData.pickupLng,
          pickupAddress: tempData.pickupAddress,
          destLat: tempData.destLat,
          destLng: tempData.destLng,
          destAddress: tempData.destAddress,
          routeDistance: tempData.routeDistance,
          routeDuration: tempData.routeDuration
        });
        
        await ride.save();
        await User.findOneAndUpdate({ phoneNumber }, { $inc: { rideCount: 1 } });
        
        await conversation.reset();
        await sendTextMessage(phoneNumber, 
          `✅ Ride posted successfully!\n\n` +
          `Your ride from ${tempData.pickup} to ${tempData.destination} on ${formatDate(tempData.date)} at ${tempData.time} is now live.\n\n` +
          `You'll be notified when someone wants to join.`
        );
        await showMainMenu(phoneNumber);
      } else {
        await conversation.reset();
        await sendTextMessage(phoneNumber, 'Ride cancelled. No problem!');
        await showMainMenu(phoneNumber);
      }
      break;
  }
};

// Start finding a ride
const startFindRide = async (phoneNumber, conversation) => {
  await conversation.setState('requesting_pickup');
  await sendTextMessage(phoneNumber, 
    '🔍 *Find a Ride*\n\nWhere do you need to be picked up?\n\nEnter a street address (e.g., "104 Hana Rd, Edison, NJ")'
  );
};

// Handle find ride flow
const handleFindRide = async (phoneNumber, text, conversation, messageData) => {
  const { tempData } = conversation;
  
  switch (conversation.state) {
    case 'requesting_pickup':
      await sendTextMessage(phoneNumber, '📍 Validating pickup location...');
      const pickupResult = await parseLocation(text);
      
      if (!pickupResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${pickupResult.error || 'Could not find that location. Please try again with a full street address:'}`
        );
        return;
      }
      
      const pickupLocation = extractCityState(pickupResult.location.address);
      await conversation.setState('requesting_destination', { 
        pickup: pickupLocation,
        pickupLat: pickupResult.location.lat,
        pickupLng: pickupResult.location.lon,
        pickupAddress: pickupResult.location.display_name
      });
      
      await sendTextMessage(phoneNumber, 
        `✅ Found: ${pickupResult.location.display_name}\n\nWhere are you going? (Enter destination address)`
      );
      break;
      
    case 'requesting_destination':
      await sendTextMessage(phoneNumber, '📍 Validating destination...');
      const destResult = await parseLocation(text);
      
      if (!destResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${destResult.error || 'Could not find that location. Please try again:'}`
        );
        return;
      }
      
      // Calculate route
      const route = await calculateRoute(
        tempData.pickupLat,
        tempData.pickupLng,
        destResult.location.lat,
        destResult.location.lon
      );
      
      const destination = extractCityState(destResult.location.address);
      const routeInfo = route 
        ? `\n\n📏 Distance: ${formatDistance(route.distance)}\n⏱️ Trip time: ${formatDuration(route.duration)}`
        : '';
      
      await conversation.setState('requesting_date', { 
        ...tempData, 
        destination,
        destLat: destResult.location.lat,
        destLng: destResult.location.lon,
        destAddress: destResult.location.display_name,
        routeDistance: route?.distance,
        routeDuration: route?.duration
      });
      
      await sendTextMessage(phoneNumber, 
        `✅ Found: ${destResult.location.display_name}${routeInfo}\n\nWhen do you need a ride?\n\n• Today\n• Tomorrow\n• This week\n• Or specific date`
      );
      break;
      
    case 'requesting_date':
      const dateText = text.toLowerCase();
      let dateFilter = {};
      
      if (dateText === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateFilter = { $gte: today, $lt: tomorrow };
      } else if (dateText === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        dateFilter = { $gte: tomorrow, $lt: dayAfter };
      } else if (dateText.includes('week')) {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        dateFilter = { $gte: today, $lt: nextWeek };
      } else {
        const date = parseDate(text);
        if (date) {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          dateFilter = { $gte: date, $lt: nextDay };
        }
      }
      
      await conversation.setState('requesting_seats', { ...tempData, dateFilter, dateText: text });
      await sendTextMessage(phoneNumber, 'How many seats do you need? (1-3)');
      break;
      
    case 'requesting_seats':
      const seats = parseInt(text);
      if (isNaN(seats) || seats < 1 || seats > 3) {
        await sendTextMessage(phoneNumber, 'Please enter a number between 1 and 3:');
        return;
      }
      
      // Search for matching rides
      await sendTextMessage(phoneNumber, '🔍 Searching for rides...');
      
      const query = {
        status: 'active',
        expiresAt: { $gt: new Date() },
        availableSeats: { $gte: seats },
        date: tempData.dateFilter || { $gte: new Date() }
      };
      
      // Try to find rides matching pickup or destination
      const rides = await Ride.find({
        ...query,
        $or: [
          { pickupLocation: { $regex: tempData.pickup, $options: 'i' } },
          { destination: { $regex: tempData.destination, $options: 'i' } }
        ]
      }).limit(MAX_RESULTS);
      
      if (rides.length === 0) {
        // Save rider's search criteria for notifications when matching rides become available
        await Ride.createRiderNotification(phoneNumber, {
          pickup: tempData.pickup,
          destination: tempData.destination,
          date: tempData.dateText,
          seats,
          pickupLat: tempData.pickupLat,
          pickupLng: tempData.pickupLng,
          destLat: tempData.destLat,
          destLng: tempData.destLng
        });
        
        await conversation.reset();
        await sendTextMessage(phoneNumber,
          `😕 No rides found matching:\n` +
          `📍 ${tempData.pickup} → ${tempData.destination}\n` +
          `📅 ${tempData.dateText}\n` +
          `💺 ${seats} seat${seats > 1 ? 's' : ''}\n\n` +
          `✅ *Don't worry! We've saved your request.*\n\n` +
          `We'll notify you when a matching ride becomes available.\n\n` +
          `In the meantime:\n` +
          `• Try different pickup/destination points\n` +
          `• Check back later for new rides\n` +
          `• Offer a ride and help others!`
        );
        await showMainMenu(phoneNumber);
        return;
      }

      
      // Show results
      await conversation.setState('browsing_results', { 
        ...tempData, 
        seats,
        searchResults: rides.map(r => ({ id: r._id.toString(), ...r.toObject() }))
      });
      
      await sendTextMessage(phoneNumber, `Found ${rides.length} ride${rides.length > 1 ? 's' : ''}:`);
      
      // Show first result with buttons
      const firstRide = rides[0];
      const rideText = formatRideDetails(firstRide, 1, rides.length);
      
      const buttons = [
        { id: `join_${firstRide._id}`, title: '✅ Join This Ride' },
        { id: 'next_ride', title: '➡️ Next' }
      ];
      
      if (rides.length === 1) {
        buttons.pop(); // Remove "Next" if only one result
      }
      
      await sendButtonMessage(phoneNumber, rideText, buttons);
      break;
      
    case 'browsing_results':
      if (text.startsWith('join_')) {
        const rideId = text.replace('join_', '');
        const ride = await Ride.findById(rideId);
        
        if (!ride || ride.isExpired() || ride.isFull()) {
          await sendTextMessage(phoneNumber, 'Sorry, this ride is no longer available.');
          return;
        }
        
        // Notify driver
        const user = await User.findOne({ phoneNumber });
        await sendTextMessage(ride.driverPhone,
          `🚗 *Ride Request!*\n\n` +
          `${user?.name || 'Someone'} wants to join your ride:\n` +
          `📍 ${ride.pickupLocation} → ${ride.destination}\n` +
          `📅 ${formatDate(ride.date)} at ${ride.time}\n` +
          `💺 Seats needed: ${tempData.seats}\n\n` +
          `Reply YES to accept or NO to decline.`
        );
        
        await conversation.setState('awaiting_driver_response', { ...tempData, pendingRideId: rideId });
        await sendTextMessage(phoneNumber, 
          `✅ Request sent! Waiting for the driver to confirm.\n\n` +
          `We'll notify you once they respond.`
        );
      } else if (text === 'next_ride') {
        // Show next result
        const currentIndex = tempData.currentResultIndex || 0;
        const nextIndex = currentIndex + 1;
        const rides = tempData.searchResults;
        
        if (nextIndex >= rides.length) {
          await sendTextMessage(phoneNumber, 'No more rides. Showing first one again.');
          await conversation.setState('browsing_results', { ...tempData, currentResultIndex: 0 });
          const ride = rides[0];
          const rideText = formatRideDetails(ride, 1, rides.length);
          await sendButtonMessage(phoneNumber, rideText, [
            { id: `join_${ride._id}`, title: '✅ Join This Ride' },
            { id: 'next_ride', title: '➡️ Next' }
          ]);
        } else {
          await conversation.setState('browsing_results', { ...tempData, currentResultIndex: nextIndex });
          const ride = rides[nextIndex];
          const rideText = formatRideDetails(ride, nextIndex + 1, rides.length);
          const buttons = [
            { id: `join_${ride._id}`, title: '✅ Join This Ride' }
          ];
          if (nextIndex < rides.length - 1) {
            buttons.push({ id: 'next_ride', title: '➡️ Next' });
          }
          await sendButtonMessage(phoneNumber, rideText, buttons);
        }
      }
      break;
  }
};

// Show my rides
const showMyRides = async (phoneNumber) => {
  const offeredRides = await Ride.find({
    driverPhone: phoneNumber,
    status: { $in: ['active', 'full'] },
    expiresAt: { $gt: new Date() }
  }).sort({ date: 1 });
  
  const joinedRides = await Ride.find({
    'passengers.phone': phoneNumber,
    status: { $in: ['active', 'full'] }
  }).sort({ date: 1 });
  
  if (offeredRides.length === 0 && joinedRides.length === 0) {
    await sendTextMessage(phoneNumber, 
      '📋 *Your Rides*\n\n' +
      'You don\'t have any active rides.\n\n' +
      'Offer a ride or find one to get started!'
    );
    await showMainMenu(phoneNumber);
    return;
  }
  
  let message = '📋 *Your Rides*\n\n';
  
  if (offeredRides.length > 0) {
    message += '*Offering:*\n';
    offeredRides.forEach((ride, i) => {
      message += `${i + 1}. ${ride.pickupLocation} → ${ride.destination}\n`;
      message += `   📅 ${formatDate(ride.date)} at ${ride.time}\n`;
      message += `   💺 ${ride.availableSeats}/${ride.totalSeats} seats left\n\n`;
    });
  }
  
  if (joinedRides.length > 0) {
    message += '*Joined:*\n';
    joinedRides.forEach((ride, i) => {
      message += `${i + 1}. ${ride.pickupLocation} → ${ride.destination}\n`;
      message += `   📅 ${formatDate(ride.date)} at ${ride.time}\n`;
      message += `   📞 Driver: ${ride.driverPhone.slice(-4)}\n\n`;
    });
  }
  
  await sendTextMessage(phoneNumber, message);
  await showMainMenu(phoneNumber);
};

// Handle driver response to ride request
const handleDriverResponse = async (phoneNumber, text, conversation) => {
  const { tempData } = conversation;
  
  if (!tempData.pendingRideId) {
    await conversation.reset();
    return;
  }
  
  const ride = await Ride.findById(tempData.pendingRideId);
  if (!ride) {
    await sendTextMessage(phoneNumber, 'Sorry, this ride is no longer available.');
    await conversation.reset();
    return;
  }
  
  const passengerPhone = phoneNumber; // The one waiting for response
  
  if (text.toLowerCase() === 'yes') {
    try {
      await ride.addPassenger(passengerPhone, 'Passenger', tempData.seats || 1);
      
      await sendTextMessage(ride.driverPhone,
        `✅ Confirmed! You've accepted the ride request.`
      );
      
      // Generate map URL with ride details
      const mapUrl = `${process.env.WEB_APP_URL || 'http://localhost:3002'}/map?pickup=${encodeURIComponent(ride.pickupLocation)}&destination=${encodeURIComponent(ride.destination)}`;
      
      await sendTextMessage(passengerPhone,
        `🎉 *Ride Confirmed!*\n\n` +
        `📍 ${ride.pickupLocation} → ${ride.destination}\n` +
        `📅 ${formatDate(ride.date)} at ${ride.time}\n` +
        `📞 Driver: ${ride.driverPhone}\n\n` +
        `🗺️ View on Map: ${mapUrl}\n\n` +
        `Contact your driver to coordinate pickup details.`
      );

    } catch (error) {
      await sendTextMessage(ride.driverPhone, 'Sorry, this ride is now full.');
      await sendTextMessage(passengerPhone, 'Sorry, this ride is no longer available.');
    }
  } else {
    await sendTextMessage(ride.driverPhone, 'Request declined.');
    await sendTextMessage(passengerPhone, 
      'The driver couldn\'t accept your request. Try another ride!'
    );
  }
  
  await conversation.reset();
  await showMainMenu(passengerPhone);
};

// Format ride details
const formatRideDetails = (ride, current, total) => {
  const tags = ride.tags?.length > 0 ? `🏷️ ${ride.tags.join(', ')}\n` : '';
  return (
    `*Ride ${current}/${total}*\n\n` +
    `📍 ${ride.pickupLocation}\n` +
    `🏁 ${ride.destination}\n` +
    `📅 ${formatDate(ride.date)} at ${ride.time}\n` +
    `💺 ${ride.availableSeats} seat${ride.availableSeats > 1 ? 's' : ''} available\n` +
    `💰 ${ride.contribution > 0 ? '$' + ride.contribution : 'Free'}\n` +
    `${tags}` +
    `👤 Driver: ${ride.driverName || 'Anonymous'}`
  );
};

// Parse date from text
const parseDate = (text) => {
  const lower = text.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (lower === 'today') {
    return today;
  }
  
  if (lower === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = days.indexOf(lower);
  
  if (dayIndex !== -1) {
    const targetDate = new Date(today);
    const daysUntil = (dayIndex - today.getDay() + 7) % 7;
    targetDate.setDate(targetDate.getDate() + (daysUntil === 0 ? 7 : daysUntil));
    return targetDate;
  }
  
  // Try parsing MM/DD/YYYY
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/?(\d{2,4})?/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1;
    const day = parseInt(dateMatch[2]);
    let year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    
    const date = new Date(year, month, day);
    if (date >= today) {
      return date;
    }
  }
  
  return null;
};

// Parse time from text
const parseTime = (text) => {
  // Match patterns like "8:00 AM", "14:00", "5:30pm"
  const match = text.match(/(\d{1,2}):?(\d{2})?\s?(am|pm)?/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3]?.toLowerCase();
  
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Format date for display
const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Main message handler
export const handleMessage = async (reqBody) => {
  const messageData = parseIncomingMessage(reqBody);
  
  if (!messageData) {
    console.log('No valid message in webhook');
    return;
  }
  
  const { phoneNumber, text, buttonReply, listReply, type } = messageData;
  const inputText = buttonReply || listReply || text || '';
  
  console.log(`Message from ${phoneNumber}: ${inputText}`);
  
  try {
    // Find or create user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({ phoneNumber });
      await user.save();
    }
    await user.updateLastActive();
    
    // Find or create conversation
    let conversation = await Conversation.findOne({ phoneNumber });
    if (!conversation) {
      conversation = new Conversation({ phoneNumber });
      await conversation.save();
    }
    
    await conversation.addMessage('user', inputText);
    
    // Check if new user - start onboarding
    if (!user.onboardingComplete && conversation.state === 'idle') {
      await conversation.setState('onboarding_name');
      await sendTextMessage(phoneNumber, 
        `${WELCOME_MESSAGE}\n\nTo get started, what's your name?`
      );
      return;
    }
    
    // Handle special commands
    const lowerInput = inputText.toLowerCase();
    
    if (lowerInput === 'hi' || lowerInput === 'hello' || lowerInput === 'start' || lowerInput === 'menu') {
      await conversation.reset();
      await sendTextMessage(phoneNumber, WELCOME_MESSAGE);
      await showMainMenu(phoneNumber);
      return;
    }
    
    if (lowerInput === 'help' || lowerInput === 'rules') {
      await sendTextMessage(phoneNumber,
        `📋 *PDRides Community Guidelines*\n\n` +
        `1️⃣ Be respectful and punctual\n` +
        `2️⃣ Share accurate ride details\n` +
        `3️⃣ Confirm pickup location clearly\n` +
        `4️⃣ Cancel in advance if plans change\n` +
        `5️⃣ Drive safely and legally\n` +
        `6️⃣ Report any issues\n\n` +
        `Safety: Always share ride details with a friend. Trust your instincts.`
      );
      await showMainMenu(phoneNumber);
      return;
    }
    
    if (lowerInput === 'cancel') {
      await conversation.reset();
      await sendTextMessage(phoneNumber, 'Cancelled. What would you like to do?');
      await showMainMenu(phoneNumber);
      return;
    }
    
    // Handle button actions
    if (buttonReply) {
      switch (buttonReply) {
        case 'offer_ride':
          await startOfferRide(phoneNumber, conversation);
          return;
        case 'find_ride':
          await startFindRide(phoneNumber, conversation);
          return;
        case 'my_rides':
          await showMyRides(phoneNumber);
          return;
        case 'confirm_yes':
        case 'confirm_no':
        case 'contrib_free':
        case 'contrib_5':
        case 'contrib_10':
        case 'contrib_other':
          await handleOfferRide(phoneNumber, inputText, conversation, messageData);
          return;
        default:
          // Handle dynamic contribution buttons (e.g., "contrib_12")
          if (buttonReply && buttonReply.startsWith('contrib_')) {
            await handleOfferRide(phoneNumber, inputText, conversation, messageData);
            return;
          }
      }
      
      if (buttonReply.startsWith('join_')) {
        await handleFindRide(phoneNumber, buttonReply, conversation, messageData);
        return;
      }
      
      if (buttonReply === 'next_ride') {
        await handleFindRide(phoneNumber, buttonReply, conversation, messageData);
        return;
      }
    }
    
    // Handle conversation states
    if (conversation.state.startsWith('onboarding_')) {
      await handleOnboarding(phoneNumber, inputText, conversation);
    } else if (conversation.state.startsWith('offering_')) {
      await handleOfferRide(phoneNumber, inputText, conversation, messageData);
    } else if (conversation.state.startsWith('requesting_') || conversation.state === 'browsing_results') {
      await handleFindRide(phoneNumber, inputText, conversation, messageData);
    } else if (conversation.state === 'awaiting_driver_response') {
      await handleDriverResponse(phoneNumber, inputText, conversation);
    } else {
      // Default: show main menu
      await showMainMenu(phoneNumber);
    }
    
  } catch (error) {
    console.error('Error handling message:', error);
    await sendTextMessage(phoneNumber, 
      'Sorry, something went wrong. Please try again or type "menu" to start over.'
    );
  }
};
