<!-- 
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                        🚗 PDRides - Community Carpooling                     ║
║              WhatsApp & Telegram Bot for Community Carpooling               ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
-->

<div align="center">

<!-- Badges -->
![PDRides](https://img.shields.io/badge/PDRides-Community%20Carpooling-brightgreen?style=for-the-badge&logo=whatsapp)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366?style=flat-square&logo=whatsapp)
![Telegram](https://img.shields.io/badge/Telegram-Bot-2CA5E0?style=flat-square&logo=telegram)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

<!-- Logo -->
<div align="center">
  
# 🚗 PDRides

### Community Carpooling Made Easy

_A messaging-powered carpooling platform (WhatsApp & Telegram) that connects commuters, reduces transportation costs, and promotes eco-friendly travel._

</div>

[![GitHub Stars](https://img.shields.io/github/stars/pdrides/pdrides-whatsapp-bot?style=social)](https://github.com/pdrides/pdrides-whatsapp-bot/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/pdrides/pdrides-whatsapp-bot)](https://github.com/pdrides/pdrides-whatsapp-bot/issues)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue)]

---

## ✨ Why Choose PDRides?

| 🌟 Feature | 📝 Description |
|------------|-----------------|
| 💰 **Cost Savings** | Split ride costs with fellow commuters |
| 🌱 **Eco-Friendly** | Reduce carbon footprint by sharing rides |
| 💬 **Multi-Platform** | WhatsApp & Telegram bot integration |
| 🗺️ **Interactive Maps** | Visual route planning with real-time pricing |
| ⭐ **Trust System** | Verified users with ratings and reviews |
| 🔒 **Secure** | Phone verification via OTP |

</div>

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| 🟢 **Node.js** | 18+ | JavaScript runtime |
| 🍃 **MongoDB** | 7.x+ | Database |
| 📱 **WhatsApp** | Business | Messaging platform (optional) |
| ✈️ **Telegram** | Bot | Messaging platform (optional) |

### Installation

```bash
# 1️⃣ Clone the repository
git clone https://github.com/pdrides/pdrides-whatsapp-bot.git
cd pdrides-whatsapp-bot

# 2️⃣ Install dependencies
npm install

# 3️⃣ Setup environment
cp .env.example .env

# 4️⃣ Configure your .env file (see below)
```

### Environment Variables

```env
# ═══════════════════════════════════════════════════════════════════════════════
# 🔧 App Configuration
# ═══════════════════════════════════════════════════════════════════════════════
APP_NAME=PDRides
PORT=3000
NODE_ENV=development

# ═══════════════════════════════════════════════════════════════════════════════
# 📱 WhatsApp Cloud API (from Meta Developer Dashboard)
# ═══════════════════════════════════════════════════════════════════════════════
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

# ═══════════════════════════════════════════════════════════════════════════════
# ✈️ Telegram Bot (from BotFather)
# ═══════════════════════════════════════════════════════════════════════════════
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# ═══════════════════════════════════════════════════════════════════════════════
# 🗄️ MongoDB Configuration
# ═══════════════════════════════════════════════════════════════════════════════
MONGODB_URI=mongodb://localhost:27017/pdrides

# 🌐 Web App URL
WEB_APP_URL=http://localhost:3000
```

### Running the Application

```bash
# 🚦 Development mode (with auto-reload)
npm run dev

# 🏭 Production mode
npm start
```

### 🌐 Access Points

| Endpoint | Description |
|----------|-------------|
| 🌎 `http://localhost:3000/` | Main landing page |
| 🗺️ `http://localhost:3000/map-view` | Interactive map |
| 🔐 `http://localhost:3000/login` | User login |
| 📝 `http://localhost:3000/register` | User registration |
| ⚙️ `http://localhost:3000/settings` | User settings |
| 🔍 `http://localhost:3000/browse-rides` | Browse all rides |
| 🚗 `http://localhost:3000/my-rides` | My rides |
| 📋 `http://localhost:3000/ride-details` | Ride details |
| 📊 `http://localhost:3000/ads-config` | Ads configuration |
| ❓ `http://localhost:3000/help-center` | Help center |
| 📧 `http://localhost:3000/contact-us` | Contact us |
| 🔒 `http://localhost:3000/privacy-policy` | Privacy policy |
| 📜 `http://localhost:3000/terms-of-service` | Terms of service |
| 🧪 `http://localhost:3000/test-bot` | WhatsApp bot tester |
| ❤️ `http://localhost:3000/api/health` | Health check |

---

## 🏗️ Tech Stack

<div align="center">

| Layer | Technology | Icon |
|-------|------------|------|
| **Runtime** | Node.js 18+ | 🟢 |
| **Framework** | Express.js | ⚡ |
| **Database** | MongoDB + Mongoose | 🍃 |
| **Messaging** | WhatsApp Cloud API | 💬 |
| **Messaging** | Telegram Bot API | ✈️ |
| **Maps** | Leaflet + OpenStreetMap | 🗺️ |
| **Geocoding** | Nominatim | 📍 |
| **Routing** | OSRM | 🛣️ |
| **Scheduler** | node-cron | ⏰ |

</div>

---

## 📁 Project Structure

```
📦 PDRides/
├── 📄 index.html              # 🏠 Landing page
├── 📄 map-view.html          # 🗺️ Interactive map
├── 📄 login.html             # 🔐 Login page
├── 📄 register.html          # 📝 Registration page
├── 📄 settings.html          # ⚙️ User settings
├── 📄 browse-rides.html      # 🔍 Browse all rides
├── 📄 my-rides.html          # 🚗 My rides
├── 📄 ride-details.html      # 📋 Ride details page
├── 📄 ads-config.html        # 📊 Ads configuration
├── 📄 help-center.html       # ❓ Help center
├── 📄 contact-us.html        # 📧 Contact us
├── 📄 privacy-policy.html    # 🔒 Privacy policy
├── 📄 terms-of-service.html  # 📜 Terms of service
├── 📄 test-bot.html          # 🧪 WhatsApp bot tester
│
├── 📂 src/
│   ├── 📄 index.js           # 🚀 Main server entry point
│   │
│   ├── 📂 models/
│   │   ├── 📄 User.js        # 👤 User data model
│   │   ├── 📄 Ride.js        # 🚗 Ride listings model
│   │   ├── 📄 Ad.js          # 📊 Advertisement model
│   │   └── 📄 Conversation.js # 💬 Conversation state model
│   │
│   ├── 📂 services/
│   │   ├── 📄 whatsapp.js    # 📱 WhatsApp API integration
│   │   ├── 📄 telegram.js    # ✈️ Telegram Bot integration
│   │   ├── 📄 messageHandler.js  # 🧠 Message processing & bot logic
│   │   ├── 📄 scheduler.js   # ⏰ Background scheduled tasks
│   │   ├── 📄 maps.js        # 🗺️ Geocoding & routing services
│   │   ├── 📄 rideTypes.js   # 💵 Uber-style ride pricing
│   │   ├── 📄 otp.js         # 🔐 OTP verification service
│   │   ├── 📄 userService.js # 👤 User management service
│   │   ├── 📄 rideService.js # 🚗 Ride management service
│   │   ├── 📄 adService.js  # 📊 Advertisement service
│   │   ├── 📄 ads-client.js # 📊 Ads client service
│   │   ├── 📄 crud.js       # 📝 CRUD operations
│   │   ├── 📄 database.js   # 🗄️ Database connection
│   │   └── 📄 apiSync.js    # 🔄 API synchronization
│   │
│   ├── 📂 routes/
│   │   ├── 📄 auth.js       # 🔐 Authentication routes
│   │   ├── 📄 user.js       # 👤 User management routes
│   │   ├── 📄 api.js        # 🚗 Ride & general API routes
│   │   ├── 📄 webhook.js    # 📥 WhatsApp webhook endpoints
│   │   ├── 📄 telegram-webhook.js # ✈️ Telegram webhook endpoints
│   │   └── 📄 ads.js        # 📊 Ads management routes
│   │
│   ├── 📂 middleware/
│   │   └── 📄 auth.js       # 🔐 Authentication middleware
│   │
│   └── 📂 services/ (additional)
│       └── (see above)
│
├── 📂 ads-config/
│   ├── 📄 ad-units.json     # 📊 Ad unit configurations
│   ├── 📄 placements.json   # 📍 Ad placement settings
│   ├── 📄 geo-targeting.json # 🌍 Geographic targeting
│   └── 📄 fallback-content.json # ⏭️ Fallback content
│
├── 📂 ads-system/
│   ├── 📄 ads-loader.js     # 📊 Ads loader script
│   └── 📄 developer-config.json # 👨‍💻 Developer configuration
│
├── 📄 set-telegram-webhook.js # 🔧 Telegram webhook setup script
│
├── 📄 package.json          # 📦 Project dependencies
├── 📄 .env.example         # 📝 Environment template
└── 📄 README.md            # 📖 This file
```

---

## ✨ Features

### 🤖 WhatsApp Bot Commands

| Command | Action | Example |
|---------|--------|---------|
| `hi`, `hello`, `start`, `menu` | 📋 Show main menu | `hi` |
| `offer ride` | 🚗 Start offering a ride | `offer ride` |
| `find ride` | 🔍 Start finding a ride | `find ride` |
| `my rides` | 📋 View your rides | `my rides` |
| `help`, `rules` | ❓ Show guidelines | `help` |
| `cancel` | ❌ Cancel current flow | `cancel` |

### ✈️ Telegram Bot Commands

| Command | Action |
|---------|--------|
| `/start`, `/menu` | 📋 Show main menu |
| `/offer` | 🚗 Start offering a ride |
| `/find` | 🔍 Start finding a ride |
| `/myrides` | 📋 View your rides |
| `/help` | ❓ Show guidelines |

### 🚗 Ride Management

- ✅ **Offer Rides** - Drivers post available rides with pickup, destination, time, seats, and price
- 🔍 **Find Rides** - Passengers search and filter rides by location
- 📋 **Ride History** - View past and upcoming rides
- ⭐ **Rating System** - Rate drivers and passengers after each ride

### 💵 Pricing & Fare

| Ride Type | Base Fare | Per Mile | Per Minute | Min Fare | Capacity |
|-----------|------------|----------|------------|----------|----------|
| 🏎️ **UberX** | $5.00 | $0.25 | $0.10 | $8.00 | 4 seats |
| 🚙 **UberXL** | $8.00 | $0.35 | $0.15 | $12.00 | 6 seats |
| 💎 **Premium** | $15.00 | $0.50 | $0.25 | $25.00 | 4 seats |
| 💺 **Comfort** | $10.00 | $0.40 | $0.20 | $18.00 | 4 seats |

### 🗺️ Interactive Map Features

1. 📍 **Route Planning** - Enter pickup and destination
2. 💵 **Real-time Pricing** - Instant fare estimates
3. 🚗 **Ride Selection** - Choose from multiple ride types
4. 📊 **Available Rides** - View matching community rides
5. 📱 **WhatsApp Sync** - Send ride details to phone
6. 🗺️ **Map Visualization** - See routes on interactive map

### 📊 Advertisement System

- 🎯 **Targeted Ads** - Geo-targeting by state/region
- 📏 **Multiple Ad Units** - Banner, interstitial, native ads
- 📈 **Performance Tracking** - Impressions, clicks, CTR metrics
- ⚙️ **Configuration UI** - Admin panel for ad management

---

## 📡 API Endpoints

### 🔐 Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/request-otp` | POST | Request OTP code |
| `/api/auth/verify-otp` | POST | Verify OTP & login |
| `/api/auth/complete-registration` | POST | Complete registration |
| `/api/auth/logout` | POST | Logout user |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/check-onboarding` | GET | Check onboarding status |
| `/api/auth/resend-otp` | POST | Resend OTP code |

### 👤 User Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET | Get user profile |
| `/api/user/profile` | PUT | Update user profile |
| `/api/user/driver-info` | PUT | Update driver info |
| `/api/user/account` | DELETE | Schedule account deletion |
| `/api/user/account/cancel-deletion` | POST | Cancel account deletion |
| `/api/user/password` | PUT | Change password |
| `/api/user/driver-preferences` | GET/PUT | Driver preferences |
| `/api/user/privacy-settings` | GET/PUT | Privacy settings |
| `/api/user/notification-settings` | GET/PUT | Notification settings |
| `/api/user/ride-history` | GET | Get ride history |
| `/api/user/recent-searches` | GET/POST/DELETE | Manage searches |
| `/api/user/favorite-routes` | GET/POST/DELETE | Manage favorites |
| `/api/user/stats` | GET | Get user statistics |

### 🚗 Ride API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/route` | GET | Calculate route with pricing |
| `/api/fare` | GET | Uber-style fare estimate |
| `/api/rides` | GET | Get available rides |
| `/api/rides` | POST | Create new ride |
| `/api/rides/:id` | GET/PUT/DELETE | Ride CRUD |
| `/api/rides/:id/book` | POST | Book a ride |
| `/api/rides/:id/cancel-booking` | POST | Cancel booking |
| `/api/rides/:id/cancel` | POST | Cancel ride |
| `/api/rides/:id/complete` | POST | Complete ride |
| `/api/rides/:id/status` | GET/PUT | Ride status |
| `/api/users/me/rides` | GET | User's rides (all) |
| `/api/users/me/rides/offered` | GET | User's offered rides |
| `/api/users/me/rides/joined` | GET | User's joined rides |
| `/api/autocomplete` | GET | Location autocomplete |
| `/api/reverse-geocode` | GET | Reverse geocoding |

### 📱 WhatsApp

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook` | GET | Webhook verification |
| `/webhook` | POST | Receive messages |
| `/api/whatsapp/send-ride` | POST | Send ride to WhatsApp |
| `/api/whatsapp/send-message` | POST | Send direct message |

### ✈️ Telegram

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/telegram-webhook` | POST | Telegram webhook endpoint |
| `/telegram-webhook/health` | GET | Telegram bot health |

### 📊 Ads Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ads` | GET | List all ads |
| `/api/ads` | POST | Create new ad |
| `/api/ads/:adId` | GET/PUT/DELETE | Ad CRUD |
| `/api/ads/:adId/pause` | POST | Pause ad |
| `/api/ads/:adId/activate` | POST | Activate ad |
| `/api/ads/:adId/click` | POST | Track ad click |
| `/api/ads/:adId/impression` | POST | Track impression |
| `/api/ads/:adId/metrics` | GET | Get ad metrics |
| `/api/ads/stats/platform` | GET | Platform statistics |
| `/api/ads/config/units` | GET | Get ad unit configs |
| `/api/ads/config/placements` | GET | Get placement configs |
| `/api/ads/config/geo` | GET | Get geo targeting |
| `/api/ads/config/states` | GET | Get available states |

### 🏠 General

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/ping` | GET | Ping endpoint |
| `/api/stats` | GET | Platform statistics |
| `/api/admin/stats` | GET | Admin statistics |
| `/api/admin/users` | GET | List all users (admin) |
| `/api/admin/rides` | GET | List all rides (admin) |
| `/api/conversations/:phoneNumber` | GET | Get conversation |
| `/api/conversations/:phoneNumber/reset` | POST | Reset conversation |

---

## 🗄️ Database Schema

### 👤 User Model

```javascript
{
  phoneNumber: String,        // 📱 Unique phone number
  name: String,               // 👤 User's name
  email: String,              // 📧 Email address
  isVerified: Boolean,        // ✅ Phone verification status
  rating: Number,             // ⭐ User rating (1-5)
  rideCount: Number,          // 🚗 Total rides
  roles: {                   // 🎭 User roles
    passenger: Boolean,
    driver: Boolean
  },
  driverInfo: {              // 🚙 Driver details
    isDriver: Boolean,
    vehicleMake: String,
    vehicleModel: String,
    licensePlate: String,
    totalTrips: Number
  },
  preferences: {             // ⚙️ User preferences
    notifications: Boolean,
    femaleOnly: Boolean,
    smoking: Boolean
  },
  privacySettings: {         // 🔒 Privacy settings
    showPhone: Boolean,
    showEmail: Boolean
  },
  notificationSettings: {    // 🔔 Notification preferences
    rideUpdates: Boolean,
    promotional: Boolean
  },
  favoriteRoutes: [],         // ⭐ Saved routes
  recentSearches: []         // 🔍 Recent searches
}
```

### 🚗 Ride Model

```javascript
{
  driverPhone: String,        // 📱 Driver's phone
  driverName: String,        // 👤 Driver's name
  pickupLocation: String,   // 📍 Pickup address
  destination: String,       // 🏁 Destination
  pickupLat/Lng: Number,     // 📍 Coordinates
  destLat/Lng: Number,       // 🏁 Coordinates
  date: Date,                // 📅 Ride date
  time: String,              // ⏰ Ride time
  totalSeats: Number,        // 💺 Total seats
  availableSeats: Number,   // 💺 Available seats
  contribution: Number,      // 💵 Price per seat
  status: String,            // 📊 active/full/completed/cancelled
  rideType: String,          // 🚗 Ride type (UberX, UberXL, etc.)
  passengers: [{             // 👥 Joined passengers
    phone: String,
    name: String,
    seats: Number
  }],
  tags: [String],            // 🏷️ Ride preferences
  expiresAt: Date            // ⏰ Expiration time
}
```

### 📊 Ad Model

```javascript
{
  name: String,              // 📝 Ad name
  adUnit: String,            // 📏 Ad unit type
  content: {
    headline: String,
    description: String,
    imageUrl: String,
    ctaText: String,
    ctaUrl: String
  },
  targeting: {
    states: [String],       // 🌍 Geographic targeting
    radius: Number          // 📍 Radius targeting
  },
  status: String,            // 📊 active/paused/expired
  impressions: Number,       // 👁️ Total impressions
  clicks: Number,            // 👆 Total clicks
  createdAt: Date,          // 📅 Creation date
  expiresAt: Date           // ⏰ Expiration date
}
```

### 💬 Conversation Model

```javascript
{
  phoneNumber: String,       // 📱 User's phone
  platform: String,          // 📱 whatsapp/telegram
  state: String,            // 📊 current conversation state
  context: Object,           // 📝 Conversation context data
  lastMessage: String,      // 💬 Last message received
  updatedAt: Date           // 🕐 Last update timestamp
}
```

---

## 🎯 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                     🚗 PDRides Flow                             │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │   👤     │     │   📍     │     │   💵     │     │   🚗     │
  │  User    │────▶│  Enter   │────▶│  Get     │────▶│  Book/   │
  │ Registers│     │  Route   │     │  Price   │     │  Offer   │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
       │               │               │               │
       ▼               ▼               ▼               ▼
  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │    🔐    │     │   🗺️     │     │   💬     │     │   ⭐      │
  │   OTP    │     │  View    │     │ Connect  │     │  Rate    │
  │ Verify   │     │  Map     │     │ WhatsApp │     │  Ride    │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Step-by-Step Guide

| Step | Action | Description |
|------|--------|-------------|
| 1️⃣ | **Register** | Sign up with phone number + OTP verification |
| 2️⃣ | **Choose Role** | Register as passenger, driver, or both |
| 3️⃣ | **Find/Offer** | Search for rides or offer your own |
| 4️⃣ | **Connect** | Coordinate via WhatsApp or Telegram |
| 5️⃣ | **Ride** | Enjoy the trip! |
| 6️⃣ | **Rate** | Rate your experience |

---

## 🔒 Security & Privacy

- 🔐 **OTP Verification** - Phone number verification via WhatsApp
- 🛡️ **Token-based Auth** - Secure session management
- 👤 **Data Protection** - Minimal data collection
- 📜 **Privacy Policy** - Available at `/privacy-policy`
- 📜 **Terms of Service** - Available at `/terms-of-service`

---

## 🤝 Contributing

```bash
# 1️⃣ Fork the repository
# 2️⃣ Create your feature branch
git checkout -b feature/amazing-feature

# 3️⃣ Commit your changes
git commit -m 'Add amazing feature'

# 4️⃣ Push to the branch
git push origin feature/amazing-feature

# 5️⃣ Open a Pull Request
```

---

## 📞 Support

| Channel | Contact |
|---------|---------|
| 📧 Email | support@pdrides.com |
| 📱 Phone | +1 555 175 8507 |
| 🌐 Website | www.pdrides.com |
| 🐛 Issues | [GitHub Issues](https://github.com/pdrides/pdrides-whatsapp-bot/issues) |

---

## 🙏 Acknowledgments

<div align="center">

| Service | Description |
|---------|-------------|
| [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp) | 📱 Messaging platform |
| [Telegram Bot API](https://core.telegram.org/bots/api) | ✈️ Bot API |
| [OpenStreetMap](https://www.openstreetmap.org/) | 🗺️ Free map data |
| [Nominatim](https://nominatim.openstreetmap.org/) | 📍 Geocoding service |
| [OSRM](https://project-osrm.org/) | 🛣️ Routing engine |
| [Leaflet](https://leafletjs.com/) | 🗺️ Interactive maps |

</div>

---

## 📄 License

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**MIT License** - See [LICENSE](LICENSE) file for details.

---

## 🚀 Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/pdrides/pdrides-whatsapp-bot)
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

</div>

---

<div align="center">

## ❤️ Made with Love for Community Carpooling

![Built with](https://img.shields.io/badge/Built%20with-Node.js-green)
![Built with](https://img.shields.io/badge/Built%20with-MongoDB-green)
![Built with](https://img.shields.io/badge/Built%20with-WhatsApp-green)
![Built with](https://img.shields.io/badge/Built%20with-Telegram-green)

---

**🌐 Language:** English  
**📅 Last Updated:** March 2025  
**📌 Version:** 1.0.0

</div>

