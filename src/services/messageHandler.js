import User from '../models/User.js';
import Ride from '../models/Ride.js';
import Conversation from '../models/Conversation.js';
import { 
  sendTextMessage as waSendTextMessage, 
  sendButtonMessage as waSendButtonMessage, 
  sendListMessage as waSendListMessage,
  sendTemplateMessage as waSendTemplateMessage,
  parseIncomingMessage as parseWhatsAppMessage 
} from './whatsapp.js';
import {
  sendTextMessage as tgSendTextMessage,
  sendButtonMessage as tgSendButtonMessage,
  editMessageText,
  answerCallbackQuery,
  parseIncomingMessage as parseTelegramMessage
} from './telegram.js';
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

// Platform abstraction layer
const sendMessage = async (platform, chatId, text) => {
  if (platform === 'telegram') {
    return await tgSendTextMessage(chatId, text);
  }
  return await waSendTextMessage(chatId, text);
};

const sendButton = async (platform, chatId, text, buttons) => {
  if (platform === 'telegram') {
    return await tgSendButtonMessage(chatId, text, buttons);
  }
  return await waSendButtonMessage(chatId, text, buttons);
};

// Wrapper functions that use the abstraction (for backwards compatibility with existing code)
const sendTextMessage = async (chatId, text) => {
  return await waSendTextMessage(chatId, text);
};

const sendButtonMessage = async (chatId, text, buttons) => {
  return await waSendButtonMessage(chatId, text, buttons);
};

const sendListMessage = async (chatId, text, sections) => {
  return await waSendListMessage(chatId, text, sections);
};

// Telegram-specific send functions (to be used in Telegram handler)
const tgSendMessage = async (chatId, text) => {
  return await tgSendTextMessage(chatId, text);
};

const tgSendMessageButtons = async (chatId, text, buttons) => {
  return await tgSendButtonMessage(chatId, text, buttons);
};

const MAX_RESULTS = parseInt(process.env.MAX_RIDE_RESULTS) || 5;

// ============================================
// WELCOME & GREETING MESSAGES
// ============================================

const WELCOME_MESSAGE = `🚗 *Welcome to PDRides!*

Your community carpooling solution. Save money, reduce traffic, and connect with neighbors heading your way.

*What I can do:*
• 🚗 Offer rides and earn
• 🔍 Find rides near you
• 📋 Manage your rides
• ⭐ Rate and review

Let's get started!`;

// Quick reply keyboard for main actions
const showQuickReplies = async (phoneNumber, text, options) => {
  // Using list message for better UX
  const sections = [
    {
      title: 'Main Actions',
      rows: options.map(opt => ({
        id: opt.id,
        title: opt.title,
        description: opt.desc || ''
      }))
    }
  ];
  await sendListMessage(phoneNumber, text, sections);
};

// Main menu with enhanced buttons
const showMainMenu = async (phoneNumber, customText = null) => {
  const text = customText || `What would you like to do?`;
  const buttons = [
    { id: 'offer_ride', title: '🚗 Offer a Ride' },
    { id: 'find_ride', title: '🔍 Find a Ride' },
    { id: 'my_rides', title: '📋 My Rides' },
    { id: 'help_menu', title: '❓ Help' }
  ];
  
  await sendButtonMessage(phoneNumber, text, buttons);
};

// Help menu
const showHelpMenu = async (phoneNumber) => {
  const text = `❓ *How can I help?*\n\nChoose an option:`;
  const buttons = [
    { id: 'help_how_offer', title: '📤 Offer a Ride' },
    { id: 'help_how_find', title: '🔍 Find a Ride' },
    { id: 'help_rates', title: '💰 Pricing' },
    { id: 'help_safety', title: '🛡️ Safety' },
    { id: 'help_contact', title: '📞 Contact Us' },
    { id: 'back_menu', title: '⬅️ Back to Menu' }
  ];
  
  await sendButtonMessage(phoneNumber, text, buttons);
};

// Show help for offering rides
const showOfferRideHelp = async (phoneNumber) => {
  await sendTextMessage(phoneNumber,
    `📤 *How to Offer a Ride*\n\n` +
    `1. Click "Offer a Ride" from the menu\n` +
    `2. Enter your pickup location\n` +
    `3. Enter your destination\n` +
    `4. Set date and time\n` +
    `5. Choose seats available\n` +
    `6. Set contribution amount\n` +
    `7. Add preferences (optional)\n` +
    `8. Confirm and post!\n\n` +
    `💡 Tips:\n` +
    `• Be specific with locations\n` +
    `• Add tags for passenger preferences\n` +
    `• Keep your contact info ready`
  );
  await showMainMenu(phoneNumber);
};

// Show help for finding rides
const showFindRideHelp = async (phoneNumber) => {
  await sendTextMessage(phoneNumber,
    `🔍 *How to Find a Ride*\n\n` +
    `1. Click "Find a Ride" from menu\n` +
    `2. Enter your pickup location\n` +
    `3. Enter your destination\n` +
    `4. Choose date needed\n` +
    `5. Select number of seats\n` +
    `6. Browse available rides\n` +
    `7. Join a ride you like!\n\n` +
    `💡 Tips:\n` +
    `• Be flexible with times\n` +
    `• Check multiple routes\n` +
    `• Contact driver to confirm`
  );
  await showMainMenu(phoneNumber);
};

// Show pricing info
const showPricingInfo = async (phoneNumber) => {
  await sendTextMessage(phoneNumber,
    `💰 *PDRides Pricing*\n\n` +
    `*Drivers set their own contribution:*\n` +
    `• Free rides available\n` +
    `• Typical: $5-15 per ride\n` +
    `• Based on distance & fuel costs\n\n` +
    `*PDRides is free to use!*\n` +
    `We don't charge any fees.\n\n` +
    `Fair pricing helps drivers cover costs\n` +
    `and keeps rides affordable for all.`
  );
  await showMainMenu(phoneNumber);
};

// Show safety info
const showSafetyInfo = async (phoneNumber) => {
  await sendTextMessage(phoneNumber,
    `🛡️ *Safety Tips*\n\n` +
    `*Before the ride:*\n` +
    `• Verify driver & vehicle details\n` +
    `• Share trip info with a friend\n` +
    `• Confirm pickup location\n\n` +
    `*During the ride:**\n` +
    `• Trust your instincts\n` +
    `• Wear seatbelt\n` +
    `• Follow traffic laws\n\n` +
    `*After the ride:**\n` +
    `• Rate your experience\n` +
    `• Report any issues\n\n` +
    `🚨 Emergency? Contact 911`
  );
  await showMainMenu(phoneNumber);
};

// Show contact info
const showContactInfo = async (phoneNumber) => {
  await sendTextMessage(phoneNumber,
    `📞 *Contact Us*\n\n` +
    `Need help? We're here for you!\n\n` +
    `• Email: support@pdrides.com\n` +
    `• Website: www.pdrides.com\n` +
    `• Hours: 9am-6pm daily\n\n` +
    `*For urgent issues:*\n` +
    `Type "emergency" or call 911`
  );
  await showMainMenu(phoneNumber);
};

// ============================================
// ONBOARDING FLOW - TELEGRAM SPECIFIC
// ============================================

const handleTelegramOnboarding = async (chatId, text, conversation) => {
  if (conversation.state === 'onboarding_name') {
    const name = text.trim();
    if (name.length < 2) {
      await tgSendMessageText(chatId, 'Please enter your name (at least 2 characters):');
      return;
    }
    
    // Update user name
    await User.findOneAndUpdate(
      { phoneNumber: chatId.toString() },
      { name, onboardingComplete: true }
    );
    
    await conversation.setState('idle');
    
    // Show welcome with features
    await tgSendMessageText(chatId, 
      `Nice to meet you, ${name}! 👋\n\nWelcome to PDRides! 🎉`
    );
    
    // Show quick tour
    await tgSendMessageText(chatId,
      `*Here's how PDRides works:*\n\n🚗 *Offer Rides*\nShare your commute and earn for gas\n\n🔍 *Find Rides*\nConnect with neighbors going your way\n\n💰 *Save Money*\nSplit costs and reduce expenses\n\n🌍 *Help the Planet*\nLess cars = cleaner air!`
    );
    
    await tgShowMainMenu(chatId);
  }
};

// ============================================
// ONBOARDING FLOW
// ============================================

const handleOnboarding = async (phoneNumber, text, conversation) => {
  if (conversation.state === 'onboarding_name') {
    const name = text.trim();
    if (name.length < 2) {
      await sendTextMessage(phoneNumber, 'Please enter your name (at least 2 characters):');
      return;
    }
    
    // Update user name
    await User.findOneAndUpdate(
      { phoneNumber },
      { name, onboardingComplete: true }
    );
    
    await conversation.setState('idle');
    
    // Show welcome with features
    await sendTextMessage(phoneNumber, 
      `Nice to meet you, ${name}! 👋\n\n` +
      `Welcome to PDRides! 🎉`
    );
    
    // Show quick tour
    await sendTextMessage(phoneNumber,
      `*Here's how PDRides works:*\n\n` +
      `🚗 *Offer Rides*\n` +
      `Share your commute and earn for gas\n\n` +
      `🔍 *Find Rides*\n` +
      `Connect with neighbors going your way\n\n` +
      `💰 *Save Money*\n` +
      `Split costs and reduce expenses\n\n` +
      `🌍 *Help the Planet*\n` +
      `Less cars = cleaner air!`
    );
    
    await showMainMenu(phoneNumber);
  }
};

// ============================================
// TELEGRAM MESSAGE HANDLER
// ============================================

// Platform-specific send functions for Telegram
const tgSendMessageText = async (chatId, text) => {
  return await tgSendTextMessage(chatId, text);
};

const tgSendMessageButton = async (chatId, text, buttons) => {
  return await tgSendButtonMessage(chatId, text, buttons);
};

// Telegram-specific main menu
const tgShowMainMenu = async (chatId, customText = null) => {
  const text = customText || `What would you like to do?`;
  const buttons = [
    { id: 'offer_ride', title: '🚗 Offer a Ride' },
    { id: 'find_ride', title: '🔍 Find a Ride' },
    { id: 'my_rides', title: '📋 My Rides' },
    { id: 'help_menu', title: '❓ Help' }
  ];
  
  await tgSendMessageButton(chatId, text, buttons);
};

// Telegram-specific help menu
const tgShowHelpMenu = async (chatId) => {
  const text = `❓ *How can I help?*\n\nChoose an option:`;
  const buttons = [
    { id: 'help_how_offer', title: '📤 Offer a Ride' },
    { id: 'help_how_find', title: '🔍 Find a Ride' },
    { id: 'help_rates', title: '💰 Pricing' },
    { id: 'help_safety', title: '🛡️ Safety' },
    { id: 'help_contact', title: '📞 Contact Us' },
    { id: 'back_menu', title: '⬅️ Back to Menu' }
  ];
  
  await tgSendMessageButton(chatId, text, buttons);
};

// Telegram: Handle incoming messages
export const handleTelegramMessage = async (reqBody) => {
  const messageData = parseTelegramMessage(reqBody);
  
  if (!messageData) {
    console.log('No valid Telegram message in webhook');
    return;
  }
  
  const { chatId, messageId, text, data: callbackData, type } = messageData;
  
  // Handle callback query (button clicks)
  if (type === 'callback' && callbackData) {
    await answerCallbackQuery(messageData.callbackQueryId, 'Processing...');
  }
  
  const inputText = callbackData || text || '';
  
  console.log(`Telegram message from ${chatId}: ${inputText}`);
  
  try {
    // Find or create user (using chatId as identifier)
    let user = await User.findOne({ phoneNumber: chatId.toString() });
    if (!user) {
      user = new User({ phoneNumber: chatId.toString() });
      await user.save();
    }
    await user.updateLastActive();
    
    // Find or create conversation
    let conversation = await Conversation.findOne({ phoneNumber: chatId.toString() });
    if (!conversation) {
      conversation = new Conversation({ phoneNumber: chatId.toString() });
      await conversation.save();
    }
    
    await conversation.addMessage('user', inputText);
    
    // Check if new user - start onboarding
    if (!user.onboardingComplete && conversation.state === 'idle') {
      await conversation.setState('onboarding_name');
      await tgSendMessageText(chatId, 
        `${WELCOME_MESSAGE}\n\nTo get started, what's your name?`
      );
      return;
    }
    
    // Handle special commands
    const lowerInput = inputText.toLowerCase().trim();
    
    // Quick commands - respond to "hi"
    if (lowerInput === 'hi' || lowerInput === 'hello' || lowerInput === 'start' || lowerInput === 'menu') {
      await conversation.reset();
      await tgSendMessageText(chatId, WELCOME_MESSAGE);
      await tgShowMainMenu(chatId);
      return;
    }
    
    if (lowerInput === 'bye' || lowerInput === 'goodbye' || lowerInput === 'good bye' || lowerInput === 'see you' || lowerInput === 'talk to you later') {
      await conversation.reset();
      await tgSendMessageText(chatId, 
        `Thank you! Bye for now! 👋\n\nWe hope to see you again soon!\nHave a great day! 🌟`
      );
      return;
    }
    
    if (lowerInput === 'help' || lowerInput === '?' || lowerInput === 'help menu') {
      await tgShowMainMenu(chatId);
      return;
    }
    
    if (lowerInput === 'cancel' || lowerInput === 'stop') {
      await conversation.reset();
      await tgSendMessageText(chatId, 'Cancelled. What would you like to do?');
      await tgShowMainMenu(chatId);
      return;
    }
    
    // Handle button/callback actions
    if (callbackData) {
      switch (callbackData) {
        case 'offer_ride':
          await tgStartOfferRide(chatId, conversation);
          return;
        case 'find_ride':
          await tgStartFindRide(chatId, conversation);
          return;
        case 'my_rides':
          await tgShowMyRides(chatId);
          return;
        case 'help_menu':
          await tgShowHelpMenu(chatId);
          return;
        case 'help_how_offer':
          await tgShowOfferRideHelp(chatId);
          return;
        case 'help_how_find':
          await tgShowFindRideHelp(chatId);
          return;
        case 'help_rates':
          await tgShowPricingInfo(chatId);
          return;
        case 'help_safety':
          await tgShowSafetyInfo(chatId);
          return;
        case 'help_contact':
          await tgShowContactInfo(chatId);
          return;
        case 'back_menu':
          await tgShowMainMenu(chatId);
          return;
        case 'confirm_yes':
        case 'confirm_no':
        case 'contrib_free':
        case 'contrib_5':
        case 'contrib_10':
        case 'contrib_other':
          await tgHandleOfferRide(chatId, inputText, conversation, messageData);
          return;
        default:
          if (callbackData && callbackData.startsWith('contrib_')) {
            await tgHandleOfferRide(chatId, inputText, conversation, messageData);
            return;
          }
          if (callbackData && callbackData.startsWith('join_')) {
            await tgHandleFindRide(chatId, callbackData, conversation, messageData);
            return;
          }
          if (callbackData === 'next_ride' || callbackData === 'prev_ride') {
            await tgHandleFindRide(chatId, callbackData, conversation, messageData);
            return;
          }
          // Default: show main menu
          await tgShowMainMenu(chatId);
          return;
      }
    }
    
    // Handle conversation states
    if (conversation.state.startsWith('onboarding_')) {
      await handleTelegramOnboarding(chatId, inputText, conversation);
    } else if (conversation.state.startsWith('offering_')) {
      await tgHandleOfferRide(chatId, inputText, conversation, messageData);
    } else if (conversation.state.startsWith('requesting_') || conversation.state === 'browsing_results') {
      await tgHandleFindRide(chatId, inputText, conversation, messageData);
    } else if (conversation.state === 'awaiting_driver_response') {
      await tgHandleDriverResponse(chatId, inputText, conversation);
    } else {
      // Default: show main menu
      await tgShowMainMenu(chatId);
    }
    
  } catch (error) {
    console.error('Error handling Telegram message:', error);
    await tgSendMessageText(chatId, 
      `😕 Sorry, something went wrong.\n\nType "menu" to start over or "help" for assistance.`
    );
  }
};

// ============================================
// TELEGRAM-SPECIFIC HANDLER FUNCTIONS
// ============================================

// Telegram-specific startOfferRide wrapper
const tgStartOfferRide = async (chatId, conversation) => {
  await conversation.setState('offering_pickup');
  await tgSendMessageText(chatId, 
    `🚗 *Offer a Ride*\n\n` +
    `Let's list your ride!\n\n` +
    `Where will you pick up passengers?\n\n` +
    `📍 *Tips:*\n` +
    `• Use a well-known address\n` +
    `• Include city/area name\n` +
    `• Or share your location`
  );
};

// Telegram-specific startFindRide wrapper
const tgStartFindRide = async (chatId, conversation) => {
  await conversation.setState('requesting_pickup');
  await tgSendMessageText(chatId, 
    `🔍 *Find a Ride*\n\n` +
    `Let's find you a ride!\n\n` +
    `Where do you need to be picked up?\n\n` +
    `📍 *Tips:*\n` +
    `• Use a specific address\n` +
    `• Include city name\n` +
    `• Or share your location`
  );
};

// Telegram-specific showMyRides wrapper
const tgShowMyRides = async (chatId) => {
  const phoneNumber = chatId.toString();
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
    await tgSendMessageText(chatId, 
      `📋 *Your Rides*\n\n` +
      `You don't have any rides yet.\n\n` +
      `🚗 Offer a ride to earn\n` +
      `🔍 Find a ride to travel`
    );
    await tgShowMainMenu(chatId);
    return;
  }
  
  let message = '';
  
  if (offeredRides.length > 0) {
    message += `*🚗 Your Offered Rides (${offeredRides.length}):*\n\n`;
    offeredRides.forEach((ride, i) => {
      message += `${i + 1}. ${ride.pickupLocation} → ${ride.destination}\n`;
      message += `   📅 ${formatDate(ride.date)} at ${ride.time}\n`;
      message += `   💺 ${ride.availableSeats}/${ride.totalSeats} seats left\n`;
      message += `   💰 ${ride.contribution > 0 ? '$' + ride.contribution : 'Free'}\n\n`;
    });
  }
  
  if (joinedRides.length > 0) {
    message += `*🔍 Your Joined Rides (${joinedRides.length}):*\n\n`;
    joinedRides.forEach((ride, i) => {
      message += `${i + 1}. ${ride.pickupLocation} → ${ride.destination}\n`;
      message += `   📅 ${formatDate(ride.date)} at ${ride.time}\n`;
      message += `   👤 Driver: ${ride.driverName || ride.driverPhone.slice(-4)}\n\n`;
    });
  }
  
  await tgSendMessageText(chatId, message);
  
  const buttons = [
    { id: 'offer_ride', title: '🚗 Offer New Ride' },
    { id: 'find_ride', title: '🔍 Find a Ride' }
  ];
  
  await tgSendMessageButton(chatId, 'What would you like to do next?', buttons);
};

// Telegram handleOfferRide - uses tgSendMessageText/tgSendMessageButton
const tgHandleOfferRide = async (chatId, text, conversation, messageData) => {
  const phoneNumber = chatId.toString();
  const { tempData } = conversation;
  
  switch (conversation.state) {
    case 'offering_pickup':
      await tgSendMessageText(chatId, '📍 Validating pickup location...');
      const pickupResult = await parseLocation(text);
      
      if (!pickupResult.valid) {
        await tgSendMessageText(chatId, 
          `❌ ${pickupResult.error || 'Could not find that location. Please try again with a more specific address:\n\nExamples:\n• 123 Main St, Edison NJ\n• Rutgers Busch Campus\n• Downtown Metuchen'}`
        );
        return;
      }
      
      const pickupLocation = extractCityState(pickupResult.location.address);
      await conversation.setState('offering_destination', { 
        pickup: pickupLocation,
        pickupLat: pickupResult.location.lat,
        pickupLng: pickupResult.location.lng,
        pickupAddress: pickupResult.location.display_name
      });
      
      await tgSendMessageText(chatId, 
        `✅ Found: *${pickupResult.location.display_name}*\n\nNow, where are you heading?`
      );
      break;
      
    case 'offering_destination':
      await tgSendMessageText(chatId, '📍 Validating destination...');
      const destResult = await parseLocation(text);
      
      if (!destResult.valid) {
        await tgSendMessageText(chatId, 
          `❌ ${destResult.error || 'Could not find that location. Please try again:'}\n\nExamples:\n• Princeton University\n• 50 Hamilton St, New Brunswick\n• Newark Airport`
        );
        return;
      }
      
      const route = await calculateRoute(
        tempData.pickupLat, tempData.pickupLng,
        destResult.location.lat, destResult.location.lon
      );
      
      const destination = extractCityState(destResult.location.address);
      
      let suggestedPrice = 0;
      if (route?.distance) {
        const distanceMiles = route.distance / 1609.34;
        suggestedPrice = Math.round(distanceMiles * 0.25);
        if (suggestedPrice < 5) suggestedPrice = 5;
        if (suggestedPrice > 50) suggestedPrice = 50;
      }
      
      const routeInfo = route 
        ? `\n\n📏 Distance: ${formatDistance(route.distance)}\n⏱️ Est. time: ${formatDuration(route.duration)}\n💰 Suggested: $${suggestedPrice}`
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
      
      const dateText = routeInfo + `\n\nWhen is this ride?\n\nQuick options:\n• "Today" or "Now"\n• "Tomorrow"\n• Day of week (e.g., "Monday")`;
      
      await tgSendMessageText(chatId, 
        `✅ Destination: *${destResult.location.display_name}*${dateText}`
      );
      break;
      
    case 'offering_date':
      const date = parseDate(text);
      if (!date) {
        await tgSendMessageText(chatId, 
          `Sorry, I didn't understand that date.\n\nPlease try:\n• "today" or "tomorrow"\n• Day name (e.g., "Monday")\n• Date (e.g., "12/25")`
        );
        return;
      }
      
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (date < now) {
        await tgSendMessageText(chatId, 'Please choose a future date (today or later):');
        return;
      }
      
      await conversation.setState('offering_time', { ...tempData, date });
      await tgSendMessageText(chatId, 
        `📅 *${formatDate(date)}*\n\nWhat time? (e.g., "8:00 AM", "5:30 PM")`
      );
      break;
      
    case 'offering_time':
      const time = parseTime(text);
      if (!time) {
        await tgSendMessageText(chatId, 
          `I didn't understand that time.\n\nTry formats like:\n• "8:00 AM" or "8am"\n• "5:30 PM" or "5:30pm"\n• "14:00" (24-hour)`
        );
        return;
      }
      await conversation.setState('offering_seats', { ...tempData, time });
      await tgSendMessageText(chatId, 
        `⏰ *${formatTime12Hour(time)}*\n\nHow many seats are available?\n\n(1-7 passengers)`
      );
      break;
      
    case 'offering_seats':
      const seats = parseInt(text);
      if (isNaN(seats) || seats < 1 || seats > 7) {
        await tgSendMessageText(chatId, 'Please enter a number between 1 and 7:');
        return;
      }
      await conversation.setState('offering_contribution', { ...tempData, seats });
      
      const buttons = [
        { id: 'contrib_free', title: '🙋 Free' }
      ];
      
      if (tempData.suggestedPrice && tempData.suggestedPrice > 0) {
        buttons.push({ id: `contrib_${tempData.suggestedPrice}`, title: `💰 $${tempData.suggestedPrice}` });
      }
      
      buttons.push(
        { id: 'contrib_5', title: '$5' },
        { id: 'contrib_10', title: '$10' },
        { id: 'contrib_other', title: '💵 Other' }
      );
      
      const contributionText = tempData.suggestedPrice 
        ? `💡 Route info available\n\nIs there a contribution for gas/parking?`
        : `How much would you like to request?`;
      
      await tgSendMessageButton(chatId, contributionText, buttons);
      break;
      
    case 'offering_contribution':
      let contribution = parseContribution(text, tempData);
      
      if (contribution === -1) {
        await tgSendMessageText(chatId, 'Enter your contribution amount (e.g., "$8" or "8"):');
        return;
      }
      
      await conversation.setState('offering_tags', { ...tempData, contribution });
      
      await tgSendMessageText(chatId, 
        `Any preferences for passengers?\n\nReply with numbers (or "none"):\n\n1️⃣ Female only\n2️⃣ No smoking\n3️⃣ Pets OK\n4️⃣ Quiet ride`
      );
      break;
      
    case 'offering_tags':
      const tags = [];
      const lowerText = text.toLowerCase();
      
      if (lowerText === 'none' || lowerText === 'no' || lowerText === 'skip') {
        // No tags
      } else {
        if (lowerText.includes('1')) tags.push('Female only');
        if (lowerText.includes('2')) tags.push('No smoking');
        if (lowerText.includes('3')) tags.push('Pets OK');
        if (lowerText.includes('4')) tags.push('Quiet ride');
      }
      
      await conversation.setState('offering_confirm', { ...tempData, tags });
      
      const tagsDisplay = tags.length > 0 ? `\n🏷️ ${tags.join(', ')}` : '\n🏷️ No preferences';
      const confirmText = 
        `*📋 Please Confirm Your Ride:*\n\n` +
        `📍 From: ${tempData.pickup}\n` +
        `🏁 To: ${tempData.destination}\n` +
        `📅 Date: ${formatDate(tempData.date)}\n` +
        `⏰ Time: ${formatTime12Hour(tempData.time)}\n` +
        `💺 Seats: ${tempData.seats}\n` +
        `💰 Contribution: ${tempData.contribution > 0 ? '$' + tempData.contribution : 'Free'}` +
        tagsDisplay +
        `\n\nIs this correct?`;
      
      await tgSendMessageButton(chatId, confirmText, [
        { id: 'confirm_yes', title: '✅ Yes, Post It' },
        { id: 'confirm_no', title: '❌ Cancel' }
      ]);
      break;
      
    case 'offering_confirm':
      if (text.toLowerCase().includes('yes') || text.includes('✅')) {
        const user = await User.findOne({ phoneNumber });
        const expiresAt = new Date(tempData.date);
        expiresAt.setHours(expiresAt.getHours() + 24);
        
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
        
        await tgSendMessageText(chatId, 
          `✅ *Ride Posted Successfully!*\n\n` +
          `📍 ${tempData.pickup} → ${tempData.destination}\n` +
          `📅 ${formatDate(tempData.date)} at ${formatTime12Hour(tempData.time)}\n` +
          `💺 ${tempData.seats} seats\n\n` +
          `You'll be notified when someone wants to join!`
        );
        
        const quickButtons = [
          { id: 'my_rides', title: '📋 View My Rides' },
          { id: 'offer_ride', title: '➕ Post Another' }
        ];
        await tgSendMessageButton(chatId, 'What would you like to do next?', quickButtons);
      } else {
        await conversation.reset();
        await tgSendMessageText(chatId, 'No problem! Your ride was not posted.');
        await tgShowMainMenu(chatId);
      }
      break;
  }
};

// Telegram handleFindRide wrapper
const tgHandleFindRide = async (chatId, text, conversation, messageData) => {
  const phoneNumber = chatId.toString();
  const { tempData } = conversation;
  
  switch (conversation.state) {
    case 'requesting_pickup':
      await tgSendMessageText(chatId, '📍 Validating pickup location...');
      const pickupResult = await parseLocation(text);
      
      if (!pickupResult.valid) {
        await tgSendMessageText(chatId, 
          `❌ ${pickupResult.error || 'Could not find that location.'}\n\nTry a more specific address:\n• "104 Hana Rd, Edison NJ"\n• "Rutgers Busch Campus"`
        );
        return;
      }
      
      const pickupLocation = extractCityState(pickupResult.location.address);
      await conversation.setState('requesting_destination', { 
        pickup: pickupLocation,
        pickupLat: pickupResult.location.lat,
        pickupLng: pickupResult.location.lng,
        pickupAddress: pickupResult.location.display_name
      });
      
      await tgSendMessageText(chatId, 
        `✅ Pickup: *${pickupResult.location.display_name}*\n\nWhere are you going?`
      );
      break;
      
    case 'requesting_destination':
      await tgSendMessageText(chatId, '📍 Validating destination...');
      const destResult = await parseLocation(text);
      
      if (!destResult.valid) {
        await tgSendMessageText(chatId, 
          `❌ ${destResult.error || 'Could not find that location.'}\n\nExamples:\n• "Princeton University"\n• "Newark Airport"`
        );
        return;
      }
      
      const route = await calculateRoute(
        tempData.pickupLat, tempData.pickupLng,
        destResult.location.lat, destResult.location.lon
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
      
      const dateText = routeInfo + `\n\nWhen do you need a ride?\n\nQuick options:\n• "Today"\n• "Tomorrow"\n• "This week"`;
      
      await tgSendMessageText(chatId, 
        `✅ Destination: *${destResult.location.display_name}*${dateText}`
      );
      break;
      
    case 'requesting_date':
      const dateTextInput = text.toLowerCase();
      let dateFilter = {};
      let displayDate = '';
      
      if (dateTextInput === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateFilter = { $gte: today, $lt: tomorrow };
        displayDate = 'Today';
      } else if (dateTextInput === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        dateFilter = { $gte: tomorrow, $lt: dayAfter };
        displayDate = 'Tomorrow';
      } else if (dateTextInput.includes('week')) {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        dateFilter = { $gte: today, $lt: nextWeek };
        displayDate = 'This Week';
      } else {
        const date = parseDate(text);
        if (date) {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          dateFilter = { $gte: date, $lt: nextDay };
          displayDate = formatDate(date);
        } else {
          await tgSendMessageText(chatId, 
            `I didn't understand that date.\n\nTry:\n• "today"\n• "tomorrow"\n• "Monday" or other day`
          );
          return;
        }
      }
      
      await conversation.setState('requesting_seats', { ...tempData, dateFilter, displayDate });
      await tgSendMessageText(chatId, 
        `📅 *${displayDate}*\n\nHow many seats do you need? (1-3)`
      );
      break;
      
    case 'requesting_seats':
      const seats = parseInt(text);
      if (isNaN(seats) || seats < 1 || seats > 3) {
        await tgSendMessageText(chatId, 'Please enter 1, 2, or 3 seats:');
        return;
      }
      
      await tgSendMessageText(chatId, '🔍 Searching for rides...');
      
      const query = {
        status: 'active',
        expiresAt: { $gt: new Date() },
        availableSeats: { $gte: seats },
        date: tempData.dateFilter || { $gte: new Date() }
      };
      
      const rides = await Ride.find({
        ...query,
        $or: [
          { pickupLocation: { $regex: tempData.pickup, $options: 'i' } },
          { destination: { $regex: tempData.destination, $options: 'i' } }
        ]
      }).limit(MAX_RESULTS);
      
      if (rides.length === 0) {
        await Ride.createRiderNotification(phoneNumber, {
          pickup: tempData.pickup,
          destination: tempData.destination,
          date: tempData.displayDate,
          seats,
          pickupLat: tempData.pickupLat,
          pickupLng: tempData.pickupLng,
          destLat: tempData.destLat,
          destLng: tempData.destLng
        });
        
        await conversation.reset();
        
        await tgSendMessageText(chatId,
          `😕 *No Rides Found*\n\n` +
          `Looking for:\n` +
          `📍 ${tempData.pickup} → ${tempData.destination}\n` +
          `📅 ${tempData.displayDate}\n` +
          `💺 ${seats} seat${seats > 1 ? 's' : ''}\n\n` +
          `*We saved your search!*\n` +
          `We'll notify you when a matching ride is posted.`
        );
        
        await tgShowMainMenu(chatId);
        return;
      }
      
      await conversation.setState('browsing_results', { 
        ...tempData, 
        seats,
        searchResults: rides.map(r => ({ id: r._id.toString(), ...r.toObject() })),
        currentResultIndex: 0
      });
      
      await tgShowRideResult(chatId, rides, 0, tempData);
      break;
      
    case 'browsing_results':
      if (text.startsWith('join_')) {
        const rideId = text.replace('join_', '');
        const ride = await Ride.findById(rideId);
        
        if (!ride || ride.isExpired() || ride.isFull()) {
          await tgSendMessageText(chatId, 'Sorry, this ride is no longer available.');
          return;
        }
        
        const user = await User.findOne({ phoneNumber });
        
        await sendTextMessage(ride.driverPhone,
          `🚗 *Ride Request!*\n\n` +
          `*${user?.name || 'Someone'}* wants to join your ride:\n\n` +
          `📍 ${ride.pickupLocation} → ${ride.destination}\n` +
          `📅 ${formatDate(ride.date)} at ${ride.time}\n` +
          `💺 Seats needed: ${tempData.seats}\n\n` +
          `Reply:\n• "YES" to accept\n• "NO" to decline`
        );
        
        await conversation.setState('awaiting_driver_response', { 
          ...tempData, 
          pendingRideId: rideId,
          driverPhone: ride.driverPhone
        });
        
        await tgSendMessageText(chatId, 
          `✅ *Request Sent!*\n\n` +
          `📍 ${ride.pickupLocation} → ${ride.destination}\n` +
          `📅 ${formatDate(ride.date)} at ${ride.time}\n\n` +
          `Waiting for driver to confirm...`
        );
        
      } else if (text === 'next_ride' || text === 'prev_ride') {
        // Handle navigation
        const rides = tempData.searchResults;
        const currentIndex = tempData.currentResultIndex || 0;
        let newIndex = currentIndex;
        
        if (text === 'next_ride') {
          newIndex = (currentIndex + 1) % rides.length;
        } else {
          newIndex = currentIndex === 0 ? rides.length - 1 : currentIndex - 1;
        }
        
        await conversation.setState('browsing_results', { 
          ...tempData, 
          currentResultIndex: newIndex 
        });
        
        await tgShowRideResult(chatId, rides, newIndex, tempData);
      }
      break;
  }
};

// Telegram show ride result
const tgShowRideResult = async (chatId, rides, index, tempData) => {
  const ride = rides[index];
  if (!ride) return;
  
  const rideText = formatRideDetails(ride, index + 1, rides.length);
  
  const buttons = [
    { id: `join_${ride._id}`, title: '✅ Join This Ride' }
  ];
  
  if (rides.length > 1) {
    buttons.push({ id: 'next_ride', title: '➡️ Next Ride' });
  }
  
  if (index > 0) {
    buttons.push({ id: 'prev_ride', title: '⬅️ Previous' });
  }
  
  await tgSendMessageButton(chatId, rideText, buttons);
};

// Telegram handleDriverResponse wrapper
const tgHandleDriverResponse = async (chatId, text, conversation) => {
  const phoneNumber = chatId.toString();
  const { tempData } = conversation;
  
  if (!tempData.pendingRideId) {
    await conversation.reset();
    await tgShowMainMenu(chatId);
    return;
  }
  
  const ride = await Ride.findById(tempData.pendingRideId);
  if (!ride) {
    await tgSendMessageText(chatId, 'Sorry, this ride is no longer available.');
    await conversation.reset();
    await tgShowMainMenu(chatId);
    return;
  }
  
  const lowerText = text.toLowerCase();
  
  if (lowerText === 'yes' || lowerText === 'accept') {
    try {
      const passengerPhone = tempData.passengerPhone || phoneNumber;
      const user = await User.findOne({ phoneNumber });
      
      await ride.addPassenger(passengerPhone, user?.name || 'Passenger', tempData.seats || 1);
      
      await tgSendMessageText(chatId, 
        `✅ *Ride Confirmed!*\n\nYou've accepted the request.`
      );
      
    } catch (error) {
      await tgSendMessageText(chatId, 'Sorry, this ride is now full.');
    }
  } else if (lowerText === 'no' || lowerText === 'decline') {
    await tgSendMessageText(chatId, 'Request declined.');
  } else {
    await tgSendMessageText(chatId,
      `Please reply with:\n• "YES" to accept\n• "NO" to decline`
    );
    return;
  }
  
  await conversation.reset();
  await tgShowMainMenu(chatId);
};

// ============================================
// OFFER RIDE FLOW
// ============================================

const startOfferRide = async (phoneNumber, conversation) => {
  await conversation.setState('offering_pickup');
  await sendTextMessage(phoneNumber, 
    `🚗 *Offer a Ride*\n\n` +
    `Let's list your ride!\n\n` +
    `Where will you pick up passengers?\n\n` +
    `📍 *Tips:*\n` +
    `• Use a well-known address\n` +
    `• Include city/area name\n` +
    `• Or share your location`
  );
};

// Parse contribution from button/text
const parseContribution = (text, tempData) => {
  let contribution = 0;
  
  // Handle button replies
  if (text === 'contrib_free') return 0;
  if (text.startsWith('contrib_')) {
    const val = text.replace('contrib_', '');
    if (val === 'other') return -1; // Signal to ask for custom amount
    return parseInt(val) || 0;
  }
  
  // Handle text input
  const lower = text.toLowerCase();
  if (lower.includes('free') || lower.includes('0')) return 0;
  
  const match = text.match(/\d+/);
  if (match) {
    contribution = parseInt(match[0]);
    // Validate reasonable range
    if (contribution > 100) contribution = 100;
  }
  
  return contribution;
};

const handleOfferRide = async (phoneNumber, text, conversation, messageData) => {
  const { tempData } = conversation;
  
  switch (conversation.state) {
    case 'offering_pickup':
      await sendTextMessage(phoneNumber, '📍 Validating pickup location...');
      const pickupResult = await parseLocation(text);
      
      if (!pickupResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${pickupResult.error || 'Could not find that location. Please try again with a more specific address:\n\nExamples:\n• 123 Main St, Edison NJ\n• Rutgers Busch Campus\n• Downtown Metuchen'}`
        );
        return;
      }
      
      const pickupLocation = extractCityState(pickupResult.location.address);
      await conversation.setState('offering_destination', { 
        pickup: pickupLocation,
        pickupLat: pickupResult.location.lat,
        pickupLng: pickupResult.location.lng,
        pickupAddress: pickupResult.location.display_name
      });
      
      await sendTextMessage(phoneNumber, 
        `✅ Found: *${pickupResult.location.display_name}*\n\n` +
        `Now, where are you heading?`
      );
      break;
      
    case 'offering_destination':
      await sendTextMessage(phoneNumber, '📍 Validating destination...');
      const destResult = await parseLocation(text);
      
      if (!destResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${destResult.error || 'Could not find that location. Please try again:'}\n\n` +
          `Examples:\n• Princeton University\n• 50 Hamilton St, New Brunswick\n• Newark Airport`
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
      
      // Calculate suggested price
      let suggestedPrice = 0;
      if (route?.distance) {
        const distanceMiles = route.distance / 1609.34;
        suggestedPrice = Math.round(distanceMiles * 0.25);
        if (suggestedPrice < 5) suggestedPrice = 5;
        if (suggestedPrice > 50) suggestedPrice = 50;
      }
      
      const routeInfo = route 
        ? `\n\n📏 Distance: ${formatDistance(route.distance)}\n⏱️ Est. time: ${formatDuration(route.duration)}\n💰 Suggested: $${suggestedPrice}`
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
      
      const dateText = routeInfo + `\n\nWhen is this ride?\n\n` +
        `Quick options:\n` +
        `• "Today" or "Now"\n` +
        `• "Tomorrow"\n` +
        `• Day of week (e.g., "Monday")\n` +
        `• Specific date (e.g., "12/25")`;
      
      await sendTextMessage(phoneNumber, 
        `✅ Destination: *${destResult.location.display_name}*${dateText}`
      );
      break;
      
    case 'offering_date':
      const date = parseDate(text);
      if (!date) {
        await sendTextMessage(phoneNumber, 
          `Sorry, I didn't understand that date.\n\n` +
          `Please try:\n• "today" or "tomorrow"\n• Day name (e.g., "Monday")\n• Date (e.g., "12/25" or "12/25/2024")`
        );
        return;
      }
      
      // Check if date is in the past
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (date < now) {
        await sendTextMessage(phoneNumber, 'Please choose a future date (today or later):');
        return;
      }
      
      await conversation.setState('offering_time', { ...tempData, date });
      await sendTextMessage(phoneNumber, 
        `📅 *${formatDate(date)}*\n\n` +
        `What time? (e.g., "8:00 AM", "5:30 PM", "14:00")`
      );
      break;
      
    case 'offering_time':
      const time = parseTime(text);
      if (!time) {
        await sendTextMessage(phoneNumber, 
          `I didn't understand that time.\n\n` +
          `Try formats like:\n• "8:00 AM" or "8am"\n• "5:30 PM" or "5:30pm"\n• "14:00" (24-hour)`
        );
        return;
      }
      await conversation.setState('offering_seats', { ...tempData, time });
      
      await sendTextMessage(phoneNumber, 
        `⏰ *${formatTime12Hour(time)}*\n\n` +
        `How many seats are available?\n\n` +
        `(1-7 passengers)`
      );
      break;
      
    case 'offering_seats':
      const seats = parseInt(text);
      if (isNaN(seats) || seats < 1 || seats > 7) {
        await sendTextMessage(phoneNumber, 'Please enter a number between 1 and 7:');
        return;
      }
      await conversation.setState('offering_contribution', { ...tempData, seats });
      
      // Build contribution buttons
      const buttons = [
        { id: 'contrib_free', title: '🙋 Free' }
      ];
      
      if (tempData.suggestedPrice && tempData.suggestedPrice > 0) {
        buttons.push({ id: `contrib_${tempData.suggestedPrice}`, title: `💰 $${tempData.suggestedPrice}` });
      }
      
      buttons.push(
        { id: 'contrib_5', title: '$5' },
        { id: 'contrib_10', title: '$10' },
        { id: 'contrib_other', title: '💵 Other' }
      );
      
      const distanceMiles = tempData.routeDistance 
        ? (tempData.routeDistance / 1609.34).toFixed(1) 
        : 'N/A';
      
      const contributionText = tempData.suggestedPrice 
        ? `💡 *Route Info:* ${distanceMiles} miles\n\nIs there a contribution for gas/parking?`
        : `How much would you like to request?`;
      
      await sendButtonMessage(phoneNumber, contributionText, buttons);
      break;
      
    case 'offering_contribution':
      let contribution = parseContribution(text, tempData);
      
      if (contribution === -1) {
        // Ask for custom amount
        await sendTextMessage(phoneNumber, 'Enter your contribution amount (e.g., "$8" or "8"):');
        return;
      }
      
      await conversation.setState('offering_tags', { ...tempData, contribution });
      
      const tagsText = `Any preferences for passengers?\n\n` +
        `Reply with numbers (or "none"):\n\n` +
        `1️⃣ Female only\n` +
        `2️⃣ No smoking\n` +
        `3️⃣ Pets OK\n` +
        `4️⃣ Quiet ride\n` +
        `5️⃣ AC available\n` +
        `6️⃣ Luggage space`;
      
      await sendTextMessage(phoneNumber, tagsText);
      break;
      
    case 'offering_tags':
      const tags = [];
      const lowerText = text.toLowerCase();
      
      if (lowerText === 'none' || lowerText === 'no' || lowerText === 'skip') {
        // No tags selected
      } else {
        if (lowerText.includes('1')) tags.push('Female only');
        if (lowerText.includes('2')) tags.push('No smoking');
        if (lowerText.includes('3')) tags.push('Pets OK');
        if (lowerText.includes('4')) tags.push('Quiet ride');
        if (lowerText.includes('5')) tags.push('AC');
        if (lowerText.includes('6')) tags.push('Luggage');
      }
      
      await conversation.setState('offering_confirm', { ...tempData, tags });
      
      // Format confirmation message
      const tagsDisplay = tags.length > 0 ? `\n🏷️ ${tags.join(', ')}` : '\n🏷️ No preferences';
      const confirmText = 
        `*📋 Please Confirm Your Ride:*\n\n` +
        `📍 *From:* ${tempData.pickup}\n` +
        `🏁 *To:* ${tempData.destination}\n` +
        `📅 *Date:* ${formatDate(tempData.date)}\n` +
        `⏰ *Time:* ${formatTime12Hour(tempData.time)}\n` +
        `💺 *Seats:* ${tempData.seats}\n` +
        `💰 *Contribution:* ${tempData.contribution > 0 ? '$' + tempData.contribution : 'Free'}` +
        tagsDisplay +
        `\n\nIs this correct?`;
      
      await sendButtonMessage(phoneNumber, confirmText, [
        { id: 'confirm_yes', title: '✅ Yes, Post It' },
        { id: 'confirm_no', title: '❌ Cancel' }
      ]);
      break;
      
    case 'offering_confirm':
      if (text.toLowerCase().includes('yes') || text.includes('✅')) {
        // Save the ride
        const user = await User.findOne({ phoneNumber });
        const expiresAt = new Date(tempData.date);
        expiresAt.setHours(expiresAt.getHours() + 24);
        
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
        
        // Success message with share option
        await sendTextMessage(phoneNumber, 
          `✅ *Ride Posted Successfully!*\n\n` +
          `📍 ${tempData.pickup} → ${tempData.destination}\n` +
          `📅 ${formatDate(tempData.date)} at ${formatTime12Hour(tempData.time)}\n` +
          `💺 ${tempData.seats} seats\n\n` +
          `You'll be notified when someone wants to join!`
        );
        
        // Show quick actions
        const buttons = [
          { id: 'my_rides', title: '📋 View My Rides' },
          { id: 'offer_ride', title: '➕ Post Another' }
        ];
        await sendButtonMessage(phoneNumber, 'What would you like to do next?', buttons);
      } else {
        await conversation.reset();
        await sendTextMessage(phoneNumber, 'No problem! Your ride was not posted.');
        await showMainMenu(phoneNumber);
      }
      break;
  }
};

// ============================================
// FIND RIDE FLOW
// ============================================

const startFindRide = async (phoneNumber, conversation) => {
  await conversation.setState('requesting_pickup');
  await sendTextMessage(phoneNumber, 
    `🔍 *Find a Ride*\n\n` +
    `Let's find you a ride!\n\n` +
    `Where do you need to be picked up?\n\n` +
    `📍 *Tips:*\n` +
    `• Use a specific address\n` +
    `• Include city name\n` +
    `• Or share your location`
  );
};

const handleFindRide = async (phoneNumber, text, conversation, messageData) => {
  const { tempData } = conversation;
  
  switch (conversation.state) {
    case 'requesting_pickup':
      await sendTextMessage(phoneNumber, '📍 Validating pickup location...');
      const pickupResult = await parseLocation(text);
      
      if (!pickupResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${pickupResult.error || 'Could not find that location.'}\n\n` +
          `Try a more specific address:\n` +
          `• "104 Hana Rd, Edison NJ"\n` +
          `• "Rutgers Busch Campus"\n` +
          `• "Metuchen Train Station"`
        );
        return;
      }
      
      const pickupLocation = extractCityState(pickupResult.location.address);
      await conversation.setState('requesting_destination', { 
        pickup: pickupLocation,
        pickupLat: pickupResult.location.lat,
        pickupLng: pickupResult.location.lng,
        pickupAddress: pickupResult.location.display_name
      });
      
      await sendTextMessage(phoneNumber, 
        `✅ Pickup: *${pickupResult.location.display_name}*\n\n` +
        `Where are you going?`
      );
      break;
      
    case 'requesting_destination':
      await sendTextMessage(phoneNumber, '📍 Validating destination...');
      const destResult = await parseLocation(text);
      
      if (!destResult.valid) {
        await sendTextMessage(phoneNumber, 
          `❌ ${destResult.error || 'Could not find that location.'}\n\n` +
          `Examples:\n` +
          `• "Princeton University"\n` +
          `• "Newark Airport"\n` +
          `• "50 Hamilton St, New Brunswick"`
        );
        return;
      }
      
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
      
      const dateText = routeInfo + `\n\nWhen do you need a ride?\n\n` +
        `Quick options:\n` +
        `• "Today" - for today\n` +
        `• "Tomorrow" - for tomorrow\n` +
        `• "This week" - any day this week\n` +
        `• Specific date`;
      
      await sendTextMessage(phoneNumber, 
        `✅ Destination: *${destResult.location.display_name}*${dateText}`
      );
      break;
      
    case 'requesting_date':
      const dateTextInput = text.toLowerCase();
      let dateFilter = {};
      let displayDate = '';
      
      if (dateTextInput === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateFilter = { $gte: today, $lt: tomorrow };
        displayDate = 'Today';
      } else if (dateTextInput === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setDate(dayAfter.getDate() + 1);
        dateFilter = { $gte: tomorrow, $lt: dayAfter };
        displayDate = 'Tomorrow';
      } else if (dateTextInput.includes('week')) {
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        dateFilter = { $gte: today, $lt: nextWeek };
        displayDate = 'This Week';
      } else {
        const date = parseDate(text);
        if (date) {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);
          dateFilter = { $gte: date, $lt: nextDay };
          displayDate = formatDate(date);
        } else {
          await sendTextMessage(phoneNumber, 
            `I didn't understand that date.\n\n` +
            `Try:\n` +
            `• "today"\n` +
            `• "tomorrow"\n` +
            `• "Monday" or other day\n` +
            `• "12/25" or date`
          );
          return;
        }
      }
      
      await conversation.setState('requesting_seats', { ...tempData, dateFilter, displayDate });
      await sendTextMessage(phoneNumber, 
        `📅 *${displayDate}*\n\n` +
        `How many seats do you need? (1-3)`
      );
      break;
      
    case 'requesting_seats':
      const seats = parseInt(text);
      if (isNaN(seats) || seats < 1 || seats > 3) {
        await sendTextMessage(phoneNumber, 'Please enter 1, 2, or 3 seats:');
        return;
      }
      
      // Search for rides
      await sendTextMessage(phoneNumber, '🔍 Searching for rides...');
      
      const query = {
        status: 'active',
        expiresAt: { $gt: new Date() },
        availableSeats: { $gte: seats },
        date: tempData.dateFilter || { $gte: new Date() }
      };
      
      const rides = await Ride.find({
        ...query,
        $or: [
          { pickupLocation: { $regex: tempData.pickup, $options: 'i' } },
          { destination: { $regex: tempData.destination, $options: 'i' } }
        ]
      }).limit(MAX_RESULTS);
      
      if (rides.length === 0) {
        // Save search for notifications
        await Ride.createRiderNotification(phoneNumber, {
          pickup: tempData.pickup,
          destination: tempData.destination,
          date: tempData.displayDate,
          seats,
          pickupLat: tempData.pickupLat,
          pickupLng: tempData.pickupLng,
          destLat: tempData.destLat,
          destLng: tempData.destLng
        });
        
        await conversation.reset();
        
        // Show suggestions
        await sendTextMessage(phoneNumber,
          `😕 *No Rides Found*\n\n` +
          `Looking for:\n` +
          `📍 ${tempData.pickup} → ${tempData.destination}\n` +
          `📅 ${tempData.displayDate}\n` +
          `💺 ${seats} seat${seats > 1 ? 's' : ''}\n\n` +
          `*We saved your search!*\n` +
          `We'll notify you when a matching ride is posted.\n\n` +
          `*Suggestions:*\n` +
          `• Try different pickup/destination\n` +
          `• Check another date\n` +
          `• Offer a ride and help others!`
        );
        
        await showMainMenu(phoneNumber);
        return;
      }
      
      // Store results and show first
      await conversation.setState('browsing_results', { 
        ...tempData, 
        seats,
        searchResults: rides.map(r => ({ id: r._id.toString(), ...r.toObject() })),
        currentResultIndex: 0
      });
      
      await showRideResult(phoneNumber, rides, 0, tempData);
      break;
      
    case 'browsing_results':
      if (text.startsWith('join_')) {
        const rideId = text.replace('join_', '');
        const ride = await Ride.findById(rideId);
        
        if (!ride || ride.isExpired() || ride.isFull()) {
          await sendTextMessage(phoneNumber, 'Sorry, this ride is no longer available. Showing next option...');
          await showNextRide(phoneNumber, tempData, conversation);
          return;
        }
        
        // Send request to driver
        const user = await User.findOne({ phoneNumber });
        
        // Notify driver
        await sendTextMessage(ride.driverPhone,
          `🚗 *Ride Request!*\n\n` +
          `*${user?.name || 'Someone'}* wants to join your ride:\n\n` +
          `📍 ${ride.pickupLocation} → ${ride.destination}\n` +
          `📅 ${formatDate(ride.date)} at ${ride.time}\n` +
          `💺 Seats needed: ${tempData.seats}\n\n` +
          `*Passenger:* ${user?.name || 'Unknown'}\n\n` +
          `Reply:\n` +
          `• "YES" to accept\n` +
          `• "NO" to decline\n` +
          `• "FULL" if no more seats`
        );
        
        await conversation.setState('awaiting_driver_response', { 
          ...tempData, 
          pendingRideId: rideId,
          driverPhone: ride.driverPhone
        });
        
        await sendTextMessage(phoneNumber, 
          `✅ *Request Sent!*\n\n` +
          `📍 ${ride.pickupLocation} → ${ride.destination}\n` +
          `📅 ${formatDate(ride.date)} at ${ride.time}\n\n` +
          `Waiting for driver to confirm...\n` +
          `We'll notify you when they respond!`
        );
        
      } else if (text === 'next_ride' || text === '➡️ Next') {
        await showNextRide(phoneNumber, tempData, conversation);
      } else if (text === 'prev_ride' || text === '⬅️ Previous') {
        await showPrevRide(phoneNumber, tempData, conversation);
      } else if (text.toLowerCase() === 'save') {
        // Save search for later
        await User.findOneAndUpdate(
          { phoneNumber },
          { $push: { recentSearches: {
            pickup: tempData.pickup,
            destination: tempData.destination,
            pickupLat: tempData.pickupLat,
            pickupLng: tempData.pickupLng,
            destLat: tempData.destLat,
            destLng: tempData.destLng,
            createdAt: new Date()
          }}}
        );
        
        await sendTextMessage(phoneNumber, '✅ Search saved! You can quickly search this route again later.');
        await showMainMenu(phoneNumber);
        await conversation.reset();
      } else {
        // Default: show current ride again
        await showRideResult(phoneNumber, tempData.searchResults, tempData.currentResultIndex || 0, tempData);
      }
      break;
  }
};

// Helper: Show a specific ride result
const showRideResult = async (phoneNumber, rides, index, tempData) => {
  const ride = rides[index];
  if (!ride) return;
  
  const rideText = formatRideDetails(ride, index + 1, rides.length);
  
  const buttons = [
    { id: `join_${ride._id}`, title: '✅ Join This Ride' }
  ];
  
  if (rides.length > 1) {
    buttons.push({ id: 'next_ride', title: '➡️ Next Ride' });
  }
  
  // Add back option if not first
  if (index > 0) {
    buttons.push({ id: 'prev_ride', title: '⬅️ Previous' });
  }
  
  await sendButtonMessage(phoneNumber, rideText, buttons);
};

// Helper: Show next ride in results
const showNextRide = async (phoneNumber, tempData, conversation) => {
  const rides = tempData.searchResults;
  const currentIndex = tempData.currentResultIndex || 0;
  const nextIndex = (currentIndex + 1) % rides.length;
  
  await conversation.setState('browsing_results', { 
    ...tempData, 
    currentResultIndex: nextIndex 
  });
  
  await showRideResult(phoneNumber, rides, nextIndex, tempData);
};

// Helper: Show previous ride in results
const showPrevRide = async (phoneNumber, tempData, conversation) => {
  const rides = tempData.searchResults;
  const currentIndex = tempData.currentResultIndex || 0;
  const prevIndex = currentIndex === 0 ? rides.length - 1 : currentIndex - 1;
  
  await conversation.setState('browsing_results', { 
    ...tempData, 
    currentResultIndex: prevIndex 
  });
  
  await showRideResult(phoneNumber, rides, prevIndex, tempData);
};

// ============================================
// MY RIDES
// ============================================

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
  
  // Also get past rides
  const pastOffered = await Ride.find({
    driverPhone: phoneNumber,
    $or: [
      { status: { $in: ['completed', 'cancelled', 'expired'] } },
      { expiresAt: { $lt: new Date() } }
    ]
  }).sort({ date: -1 }).limit(5);
  
  const pastJoined = await Ride.find({
    'passengers.phone': phoneNumber,
    $or: [
      { status: { $in: ['completed', 'cancelled', 'expired'] } },
      { expiresAt: { $lt: new Date() } }
    ]
  }).sort({ date: -1 }).limit(5);
  
  if (offeredRides.length === 0 && joinedRides.length === 0 && pastOffered.length === 0 && pastJoined.length === 0) {
    await sendTextMessage(phoneNumber, 
      `📋 *Your Rides*\n\n` +
      `You don't have any rides yet.\n\n` +
      `🚗 Offer a ride to earn\n` +
      `🔍 Find a ride to travel`
    );
    await showMainMenu(phoneNumber);
    return;
  }
  
  let message = '';
  
  // Active offered rides
  if (offeredRides.length > 0) {
    message += `*🚗 Your Offered Rides (${offeredRides.length}):*\n\n`;
    offeredRides.forEach((ride, i) => {
      const seatsLeft = ride.availableSeats;
      message += `${i + 1}. ${ride.pickupLocation} → ${ride.destination}\n`;
      message += `   📅 ${formatDate(ride.date)} at ${ride.time}\n`;
      message += `   💺 ${seatsLeft}/${ride.totalSeats} seats left\n`;
      message += `   💰 ${ride.contribution > 0 ? '$' + ride.contribution : 'Free'}\n\n`;
    });
  }
  
  // Active joined rides
  if (joinedRides.length > 0) {
    message += `*🔍 Your Joined Rides (${joinedRides.length}):*\n\n`;
    joinedRides.forEach((ride, i) => {
      message += `${i + 1}. ${ride.pickupLocation} → ${ride.destination}\n`;
      message += `   📅 ${formatDate(ride.date)} at ${ride.time}\n`;
      message += `   👤 Driver: ${ride.driverName || ride.driverPhone.slice(-4)}\n\n`;
    });
  }
  
  // Show message
  await sendTextMessage(phoneNumber, message);
  
  // Quick actions
  const buttons = [
    { id: 'offer_ride', title: '🚗 Offer New Ride' },
    { id: 'find_ride', title: '🔍 Find a Ride' }
  ];
  
  await sendButtonMessage(phoneNumber, 'What would you like to do next?', buttons);
};

// ============================================
// DRIVER RESPONSE HANDLING
// ============================================

const handleDriverResponse = async (phoneNumber, text, conversation) => {
  const { tempData } = conversation;
  
  if (!tempData.pendingRideId) {
    await conversation.reset();
    await showMainMenu(phoneNumber);
    return;
  }
  
  const ride = await Ride.findById(tempData.pendingRideId);
  if (!ride) {
    await sendTextMessage(phoneNumber, 'Sorry, this ride is no longer available.');
    await conversation.reset();
    await showMainMenu(phoneNumber);
    return;
  }
  
  const lowerText = text.toLowerCase();
  const passengerPhone = tempData.passengerPhone || phoneNumber;
  const user = await User.findOne({ phoneNumber });
  
  if (lowerText === 'yes' || lowerText === 'accept') {
    try {
      await ride.addPassenger(passengerPhone, user?.name || 'Passenger', tempData.seats || 1);
      
      // Confirm to driver
      await sendTextMessage(phoneNumber, 
        `✅ *Ride Confirmed!*\n\n` +
        `You've accepted the request.\n\n` +
        `Passenger: ${user?.name || 'Unknown'}\n` +
        `Seats: ${tempData.seats || 1}`
      );
      
      // Notify passenger
      const mapUrl = `${process.env.WEB_APP_URL || 'http://localhost:3002'}/map?pickup=${encodeURIComponent(ride.pickupLocation)}&destination=${encodeURIComponent(ride.destination)}`;
      
      await sendTextMessage(passengerPhone,
        `🎉 *Ride Confirmed!*\n\n` +
        `✅ The driver accepted your request!\n\n` +
        `*Ride Details:*\n` +
        `📍 ${ride.pickupLocation} → ${ride.destination}\n` +
        `📅 ${formatDate(ride.date)} at ${ride.time}\n` +
        `👤 Driver: ${ride.driverName || ride.driverPhone}\n\n` +
        `🗺️ View Route: ${mapUrl}\n\n` +
        `Contact your driver to arrange pickup!`
      );
      
    } catch (error) {
      await sendTextMessage(phoneNumber, 'Sorry, this ride is now full.');
      await sendTextMessage(passengerPhone, 'Sorry, this ride is no longer available.');
    }
  } else if (lowerText === 'no' || lowerText === 'decline') {
    await sendTextMessage(phoneNumber, 'Request declined. The passenger has been notified.');
    await sendTextMessage(passengerPhone, 
      `😕 *Request Declined*\n\n` +
      `The driver couldn't accept your request this time.\n\n` +
      `Try finding another ride!`
    );
  } else if (lowerText === 'full') {
    await sendTextMessage(phoneNumber, 'Noted. No seats available.');
    await sendTextMessage(passengerPhone, 
      `😕 *Ride Full*\n\n` +
      `Unfortunately, this ride is now full.\n\n` +
      `Try finding another ride!`
    );
  } else {
    // Unclear response, ask again
    await sendTextMessage(phoneNumber,
      `Please reply with:\n` +
      `• "YES" to accept\n` +
      `• "NO" to decline\n` +
      `• "FULL" if no seats available`
    );
    return;
  }
  
  await conversation.reset();
  await showMainMenu(phoneNumber);
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatRideDetails = (ride, current, total) => {
  const tags = ride.tags?.length > 0 ? `\n🏷️ ${ride.tags.join(', ')}` : '';
  return (
    `*Ride ${current}${total > 1 ? '/' + total : ''}*\n\n` +
    `📍 ${ride.pickupLocation}\n` +
    `🏁 ${ride.destination}\n\n` +
    `📅 ${formatDate(ride.date)} at ${ride.time}\n` +
    `💺 ${ride.availableSeats} seat${ride.availableSeats > 1 ? 's' : ''} available\n` +
    `💰 ${ride.contribution > 0 ? '$' + ride.contribution : 'Free'}` +
    tags +
    `\n\n👤 Driver: ${ride.driverName || 'Anonymous'}`
  );
};

const parseDate = (text) => {
  const lower = text.toLowerCase().trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (lower === 'today') return today;
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
  
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/?(\d{2,4})?/);
  if (dateMatch) {
    const month = parseInt(dateMatch[1]) - 1;
    const day = parseInt(dateMatch[2]);
    let year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    
    const date = new Date(year, month, day);
    if (date >= today) return date;
  }
  
  return null;
};

const parseTime = (text) => {
  const match = text.match(/(\d{1,2}):?(\d{2})?\s?(am|pm)?/i);
  if (!match) return null;
  
  let hours = parseInt(match[1]);
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const ampm = match[3]?.toLowerCase();
  
  if (ampm === 'pm' && hours !== 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const formatTime12Hour = (time24) => {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
};

const formatDate = (date) => {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
};

// ============================================
// MAIN MESSAGE HANDLER
// ============================================

export const handleMessage = async (reqBody) => {
  const messageData = parseIncomingMessage(reqBody);
  
  if (!messageData) {
    console.log('No valid message in webhook');
    return;
  }
  
  const { phoneNumber, text, buttonReply, listReply, type, location } = messageData;
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
    const lowerInput = inputText.toLowerCase().trim();
    
    // Quick commands
    if (lowerInput === 'hi' || lowerInput === 'hello' || lowerInput === 'start' || lowerInput === 'menu') {
      await conversation.reset();
      await sendTextMessage(phoneNumber, WELCOME_MESSAGE);
      await showMainMenu(phoneNumber);
      return;
    }
    
    if (lowerInput === 'bye' || lowerInput === 'goodbye' || lowerInput === 'good bye' || lowerInput === 'see you' || lowerInput === 'talk to you later') {
      await conversation.reset();
      await sendTextMessage(phoneNumber, 
        `Thank you! Bye for now! 👋\n\n` +
        `We hope to see you again soon!\n` +
        `Have a great day! 🌟`
      );
      return;
    }
    
    if (lowerInput === 'help' || lowerInput === '?' || lowerInput === 'help menu') {
      await showHelpMenu(phoneNumber);
      return;
    }
    
    if (lowerInput === 'cancel' || lowerInput === 'stop') {
      await conversation.reset();
      await sendTextMessage(phoneNumber, 'Cancelled. What would you like to do?');
      await showMainMenu(phoneNumber);
      return;
    }
    
    if (lowerInput === 'back' || lowerInput === 'go back') {
      // Handle back navigation based on current state
      await handleBackNavigation(phoneNumber, conversation);
      return;
    }
    
    // Help menu handlers
    if (buttonReply === 'help_menu' || lowerInput === 'help') {
      await showHelpMenu(phoneNumber);
      return;
    }
    
    if (buttonReply === 'help_how_offer') {
      await showOfferRideHelp(phoneNumber);
      return;
    }
    
    if (buttonReply === 'help_how_find') {
      await showFindRideHelp(phoneNumber);
      return;
    }
    
    if (buttonReply === 'help_rates') {
      await showPricingInfo(phoneNumber);
      return;
    }
    
    if (buttonReply === 'help_safety') {
      await showSafetyInfo(phoneNumber);
      return;
    }
    
    if (buttonReply === 'help_contact') {
      await showContactInfo(phoneNumber);
      return;
    }
    
    if (buttonReply === 'back_menu') {
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
          if (buttonReply && buttonReply.startsWith('contrib_')) {
            await handleOfferRide(phoneNumber, inputText, conversation, messageData);
            return;
          }
      }
      
      if (buttonReply && buttonReply.startsWith('join_')) {
        await handleFindRide(phoneNumber, buttonReply, conversation, messageData);
        return;
      }
      
      if (buttonReply === 'next_ride' || buttonReply === 'prev_ride') {
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
      `😕 Sorry, something went wrong.\n\n` +
      `Type "menu" to start over or "help" for assistance.`
    );
  }
};

// Handle back navigation
const handleBackNavigation = async (phoneNumber, conversation) => {
  const state = conversation.state;
  const tempData = conversation.tempData;
  
  // Map states to their previous states
  const backMap = {
    'offering_destination': 'offering_pickup',
    'offering_date': 'offering_destination',
    'offering_time': 'offering_date',
    'offering_seats': 'offering_time',
    'offering_contribution': 'offering_seats',
    'offering_tags': 'offering_contribution',
    'offering_confirm': 'offering_tags',
    'requesting_destination': 'requesting_pickup',
    'requesting_date': 'requesting_destination',
    'requesting_seats': 'requesting_date'
  };
  
  const prevState = backMap[state];
  
  if (prevState) {
    // Go back to previous state
    await conversation.setState(prevState, tempData);
    
    // Send appropriate message for that state
    if (prevState === 'offering_pickup') {
      await sendTextMessage(phoneNumber, '🔙 Went back.\n\nWhere will you pick up passengers?');
    } else if (prevState === 'offering_destination') {
      await sendTextMessage(phoneNumber, `🔙 Back to: ${tempData.pickup}\n\nWhere are you going?`);
    } else if (prevState === 'requesting_pickup') {
      await sendTextMessage(phoneNumber, '🔙 Back to start.\n\nWhere do you need to be picked up?');
    } else if (prevState === 'requesting_destination') {
      await sendTextMessage(phoneNumber, `🔙 Back to: ${tempData.pickup}\n\nWhere are you going?`);
    } else {
      await sendTextMessage(phoneNumber, '🔙 Going back...');
    }
  } else {
    // Can't go back further, reset to main menu
    await conversation.reset();
    await sendTextMessage(phoneNumber, '🔙 Starting over...');
    await showMainMenu(phoneNumber);
  }
};

