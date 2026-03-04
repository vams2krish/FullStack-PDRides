// This simulates the full WhatsApp conversation flow
// Run this to see the exact Uber-style experience

const conversation = [
    { from: "user", text: "Hi" },
    { from: "bot", text: `🚗 Welcome to *PDRides* - Community Carpooling!

Find or offer rides in your neighborhood. Save money, reduce traffic, and connect with your community.` },
    { from: "bot", text: `What would you like to do?

🚗 Offer a Ride - Share your ride with others
🔍 Find a Ride - Search for available rides  
📋 My Rides - View your rides` },

    // User clicks "Find Ride"
    { from: "user", text: "Find ride" },
    { from: "bot", text: `🔍 *Find a Ride*

Where do you need to be picked up?

Enter a street address (e.g., "104 Hana Rd, Edison, NJ")` },

    // User enters pickup
    { from: "user", text: "104 Hana Road, Edison, New Jersey" },
    { from: "bot", text: `✅ Found: 104 Hana Road, Edison, NJ 08817, USA

Where are you going? (Enter destination address)` },

    // User enters destination
    { from: "user", text: "Rutgers University, New Brunswick, NJ" },
    { from: "bot", text: `📍 Validating destination...

✅ Found: Rutgers University, New Brunswick, NJ 08901, USA

📏 Distance: 8.2 miles
⏱️ Trip time: 15 min

When do you need a ride?

• Today
• Tomorrow  
• This week` },

    // User selects date
    { from: "user", text: "Today" },
    { from: "bot", text: `How many seats do you need? (1-3)` },

    // User selects seats
    { from: "user", text: "2" },
    { from: "bot", text: `🔍 Searching for rides...` },

    // Results shown
    { from: "bot", text: `Found 2 rides:

*Ride 1/2*
📍 Edison, NJ
🏁 New Brunswick, NJ
📅 Today at 3:00 PM
💺 3 seats available
💰 $8.00
👤 Driver: John S.

[✅ Join This Ride] [➡️ Next]` },

    // User clicks Join
    { from: "user", text: "Join This Ride" },
    { from: "bot", text: `🚗 *New Booking Request!*

Passenger: +14756556866
Seats: 2
Price: $16.00

Reply YES to accept or NO to decline.` },

    // (Driver would say YES - simulating confirmation)
    { from: "user", text: "(Driver accepts)" },
    { from: "bot", text: `🎉 *Ride Confirmed!*

📍 Pickup: 104 Hana Road, Edison, NJ
🏁 Destination: Rutgers University, New Brunswick, NJ
📅 Today at 3:00 PM

🚗 *Driver Details*
👤 John Smith
⭐ Rating: 4.8 ★
🚙 Toyota Camry (Black)
🔢 Plates: NJ-AB-1234

💰 Total Fare: $16.00 (2 seats × $8.00)
⏱️ ETA: 8 minutes

Your driver is on the way!` }
];

console.log("=== PDRides WhatsApp Bot - Full Conversation Flow ===\n");

conversation.forEach((msg, i) => {
    const prefix = msg.from === "user" ? "👤 USER:" : "🤖 BOT:";
    console.log(`${prefix} ${msg.text}\n`);
    console.log("-".repeat(50));
});

console.log("\n✅ This is exactly what happens in WhatsApp!");
console.log("The only difference is the UI is in WhatsApp chat.");
