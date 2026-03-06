<!-- 
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                        🚗 PDRides - Community Carpooling                     ║
║                    WhatsApp Bot for Community Carpooling                     ║
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
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

<!-- Logo -->
<div align="center">
  
# 🚗 PDRides

### Community Carpooling Made Easy

_A WhatsApp-powered carpooling platform that connects commuters, reduces transportation costs, and promotes eco-friendly travel._

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
| 💬 **WhatsApp Integration** | Seamless communication via WhatsApp |
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
| 📱 **WhatsApp** | Business | Messaging platform |

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
| 🗺️ `http://localhost:3000/map` | Interactive map |
| 🔐 `http://localhost:3000/login` | User login |
| 📝 `http://localhost:3000/register` | User registration |
| ⚙️ `http://localhost:3000/settings` | User settings |
| 🔍 `http://localhost:3000/browse-all-rides` | Browse all rides |
| 🚗 `http://localhost:3000/my-rides` | My rides |
| ❓ `http://localhost:3000/help-center` | Help center |
| 📧 `http://localhost:3000/contact-us` | Contact us |
| 🔒 `http://localhost:3000/privacy-policy` | Privacy policy |
| 📜 `http://localhost:3000/terms-of-service` | Terms of service |
| ❤️ `http://localhost:3000/health` | Health check |

---

## 🏗️ Tech Stack

<div align="center">

| Layer | Technology | Icon |
|-------|------------|------|
| **Runtime** | Node.js 18+ | 🟢 |
| **Framework** | Express.js | ⚡ |
| **Database** | MongoDB + Mongoose | 🍃 |
| **Messaging** | WhatsApp Cloud API | 💬 |
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
│   │   ├── 📄 Ride.js         # 🚗 Ride listings model
│   │   └── 📄 Conversation.js # 💬 Conversation state model
│   │
│   ├── 📂 services/
│   │   ├── 📄 whatsapp.js    # 📱 WhatsApp API integration
│   │   ├── 📄 messageHandler.js  # 🧠 Message processing & bot logic
│   │   ├── 📄 scheduler.js    # ⏰ Background scheduled tasks
│   │   ├── 📄 maps.js          # 🗺️ Geocoding & routing services
│   │   ├── 📄 rideTypes.js     # 💵 Uber-style ride pricing
│   │   └── 📄 otp.js           # 🔐 OTP verification service
│   │
│   └── 📂 routes/
│       ├── 📄 auth.js         # 🔐 Authentication routes
│       ├── 📄 user.js         # 👤 User management routes
│       └── 📄 webhook.js      # 📥 WhatsApp webhook endpoints
│
├── 📂 test/
│   ├── 📄 test-full-flow.js   # 🧪 Full flow tests
│   ├── 📄 test-whatsapp.js    # 🧪 WhatsApp tests
│   └── 📄 test-*.json          # 🧪 Test data files
│
├── 📄 package.json            # 📦 Project dependencies
├── 📄 .env.example            # 📝 Environment template
└── 📄 README.md               # 📖 This file
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

### 👤 User Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/user/profile` | GET | Get user profile |
| `/api/user/profile` | PUT | Update user profile |
| `/api/user/driver-info` | PUT | Update driver info |
| `/api/user/ride-history` | GET | Get ride history |
| `/api/user/favorite-routes` | GET/POST/DELETE | Manage favorites |
| `/api/user/recent-searches` | GET/POST/DELETE | Manage search history |

### 🚗 Ride API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/route` | GET | Calculate route with pricing |
| `/api/fare` | GET | Uber-style fare estimate |
| `/api/rides` | GET | Get available rides |
| `/api/rides` | POST | Create new ride |
| `/api/rides/:id/book` | POST | Book a ride |
| `/api/ride/book` | POST | Instant ride booking |
| `/api/autocomplete` | GET | Location autocomplete |
| `/api/reverse-geocode` | GET | Reverse geocoding |

### 📱 WhatsApp

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook` | GET | Webhook verification |
| `/webhook` | POST | Receive messages |
| `/api/whatsapp/send-ride` | POST | Send ride to WhatsApp |
| `/api/whatsapp/send-message` | POST | Send direct message |

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
  favoriteRoutes: [],         // ⭐ Saved routes
  recentSearches: []          // 🔍 Recent searches
}
```

### 🚗 Ride Model

```javascript
{
  driverPhone: String,        // 📱 Driver's phone
  driverName: String,         // 👤 Driver's name
  pickupLocation: String,     // 📍 Pickup address
  destination: String,        // 🏁 Destination
  pickupLat/Lng: Number,      // 📍 Coordinates
  destLat/Lng: Number,        // 🏁 Coordinates
  date: Date,                 // 📅 Ride date
  time: String,               // ⏰ Ride time
  totalSeats: Number,          // 💺 Total seats
  availableSeats: Number,     // 💺 Available seats
  contribution: Number,       // 💵 Price per seat
  status: String,             // 📊 active/full/completed/cancelled
  passengers: [{              // 👥 Joined passengers
    phone: String,
    name: String,
    seats: Number
  }],
  tags: [String],             // 🏷️ Ride preferences
  expiresAt: Date             // ⏰ Expiration time
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
  │ Verify   │     │  Map     │     │  WhatsApp│     │  Ride    │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
```

### Step-by-Step Guide

| Step | Action | Description |
|------|--------|-------------|
| 1️⃣ | **Register** | Sign up with phone number + OTP verification |
| 2️⃣ | **Choose Role** | Register as passenger, driver, or both |
| 3️⃣ | **Find/Offer** | Search for rides or offer your own |
| 4️⃣ | **Connect** | Coordinate via WhatsApp |
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

---

**🌐 Language:** English  
**📅 Last Updated:** March 2025  
**📌 Version:** 1.0.0

</div>

