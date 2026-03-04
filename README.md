<!-- markdownlint-disable MD033 MD041 -->
<div align="center">

![PDRides Logo](https://img.shields.io/badge/PDRides-Community%20Carpooling-brightgreen?style=for-the-badge&logo=whatsapp)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud%20API-25D366?style=flat-square&logo=whatsapp)](https://developers.facebook.com/docs/whatsapp)

# 🚗 PDRides - Community Carpooling WhatsApp Bot

_A WhatsApp bot that enables community-based carpooling, allowing users to offer and find rides directly within WhatsApp. Features an interactive map view with real-time pricing._

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Stars](https://img.shields.io/github/stars/pdrides/pdrides-whatsapp-bot?style=social)](https://github.com/pdrides/pdrides-whatsapp-bot/stargazers)
[![GitHub Issues](https://img.shields.io/github/issues/pdrides/pdrides-whatsapp-bot)](https://github.com/pdrides/pdrides-whatsapp-bot/issues)

</div>

---

## ✨ Features

### Core Features
- 🚗 **Offer a Ride** - Drivers can post available rides with pickup, destination, time, seats, and contribution
- 🔍 **Find a Ride** - Passengers can search for matching rides
- 🧠 **Smart Matching** - Location-based ride matching
- ✅ **Driver Approval** - Drivers must approve passenger requests
- 📋 **My Rides** - View active rides you've offered or joined

### Uber-Style Ride Booking
- 💰 **Real-time Fare Estimates** - Get instant price quotes based on distance and time
- 🚙 **Multiple Ride Types** - Choose from UberX, UberXL, Premium, and Comfort
- ⚡ **Instant Booking** - Book rides with one tap
- 📍 **Trip Status Tracking** - Real-time updates on driver location

### Interactive Map
- 🗺️ **Route Visualization** - See your route on an interactive map
- 🚕 **Available Rides** - View all rides matching your route
- 📱 **WhatsApp Sync** - Send ride details directly to WhatsApp
- 💵 **Dynamic Pricing** - Fair pricing based on distance

---

## 🏗️ Tech Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Node.js 18+ (ES Modules) |
| **Web Server** | Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Messaging** | WhatsApp Cloud API |
| **Scheduling** | node-cron |
| **Maps** | Leaflet + OpenStreetMap |
| **Routing** | OSRM (Open Source Routing Machine) |
| **Geocoding** | Nominatim (OpenStreetMap) |

---

## 📁 Project Structure

```
PDRides/
├── src/
│   ├── index.js              # Main server entry point
│   ├── models/
│   │   ├── User.js           # User data model
│   │   ├── Ride.js           # Ride listings model
│   │   └── Conversation.js   # Conversation state model
│   ├── services/
│   │   ├── whatsapp.js       # WhatsApp API integration
│   │   ├── messageHandler.js # Message processing & bot logic
│   │   ├── scheduler.js      # Background scheduled tasks
│   │   ├── maps.js           # Geocoding & routing services
│   │   └── rideTypes.js      # Uber-style ride pricing
│   └── routes/
│       └── webhook.js        # WhatsApp webhook endpoints
├── map-view.html             # Interactive map interface
├── privacy-policy.html       # Privacy policy page
├── test-bot.html             # Bot testing interface
├── package.json              # Project dependencies
└── README.md                 # This file
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18 or higher
- **MongoDB** (local or Atlas cloud)
- **WhatsApp Business Account** with Meta Developer access

### Installation

```bash
# Clone the repository
git clone https://github.com/pdrides/pdrides-whatsapp-bot.git
cd pdrides-whatsapp-bot

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Configuration

Edit `.env` with your credentials:

```env
# App Configuration
APP_NAME=PDRides
PORT=3000
NODE_ENV=development

# WhatsApp Cloud API (from Meta Developer Dashboard)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

# MongoDB
MONGODB_URI=mongodb://localhost:27017/pdrides

# Web App URL (for map links)
WEB_APP_URL=https://your-domain.com

# Optional: Max ride search results
MAX_RIDE_RESULTS=5
```

### Running the Bot

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

### Ngrok for Local Development

```bash
# Install ngrok
npm install -g ngrok

# Start tunnel
ngrok http 3000

# Update webhook URL in Meta dashboard:
# https://your-ngrok-url.ngrok.io/webhook
```

---

## 📡 API Endpoints

### Main Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Welcome landing page |
| `/health` | GET | Health check endpoint |
| `/map` | GET | Interactive map view |
| `/privacy-policy` | GET | Privacy policy page |

### WhatsApp Webhook

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhook` | GET | Meta webhook verification |
| `/webhook` | POST | Receive WhatsApp messages |

### Ride API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/route` | GET | Calculate route with pricing |
| `/api/fare` | GET | Uber-style fare estimate |
| `/api/rides` | GET | Get available rides |
| `/api/rides/:id/book` | POST | Book a ride |
| `/api/ride/book` | POST | Instant ride booking |
| `/api/whatsapp/send-ride` | POST | Send ride to WhatsApp |

### API Examples

```bash
# Calculate route with pricing
curl "http://localhost:3000/api/route?pickup=Boston,MA&destination=NYC&seats=2"

# Get fare estimate
curl "http://localhost:3000/api/fare?pickup=Times+Square&destination=Central+Park&rideType=uberx"

# Find available rides
curl "http://localhost:3000/api/rides?pickup=Boston&destination=NYC&seats=2"
```

---

## 🚕 Ride Types & Pricing

| Type | Base Fare | Per Mile | Per Minute | Min Fare | Capacity |
|------|-----------|----------|------------|----------|----------|
| 🏎️ UberX | $5.00 | $0.25 | $0.10 | $8.00 | 4 |
| 🚙 UberXL | $8.00 | $0.35 | $0.15 | $12.00 | 6 |
| 💎 Premium | $15.00 | $0.50 | $0.25 | $25.00 | 4 |
| 💺 Comfort | $10.00 | $0.40 | $0.20 | $18.00 | 4 |

---

## 💬 WhatsApp Commands

| Command | Action |
|---------|--------|
| `hi`, `hello`, `start`, `menu` | Show main menu |
| `offer ride` | Start offering a ride |
| `find ride` | Start finding a ride |
| `my rides` | View your active rides |
| `help`, `rules` | Show community guidelines |
| `cancel` | Cancel current flow |

---

## 🗺️ Interactive Map Features

The map view (`/map`) provides:

1. **Route Planning** - Enter pickup and destination addresses
2. **Real-time Pricing** - See fare estimates instantly
3. **Ride Selection** - Choose from multiple ride types
4. **Available Rides** - View all matching community rides
5. **WhatsApp Sync** - Send ride details to your phone
6. **Map Visualization** - See routes on an interactive map

---

## 🗄️ Database Schema

### User
- `phoneNumber` (unique) - WhatsApp phone number
- `name` - User's name
- `preferences` - Notification and ride preferences
- `rideCount` - Number of rides offered/joined
- `rating` - User rating (1-5)
- `onboardingComplete` - Onboarding status

### Ride
- `driverPhone`, `driverName` - Driver information
- `pickupLocation`, `destination` - Route locations
- `pickupLat`, `pickupLng`, `destLat`, `destLng` - Coordinates
- `date`, `time` - Scheduled time
- `totalSeats`, `availableSeats` - Capacity
- `contribution` - Price per seat
- `tags` - Ride preferences (female-only, pets-ok, etc.)
- `passengers` - Joined passengers
- `status` - Ride status (active, full, completed, cancelled, expired)
- `expiresAt` - Expiration time

### Conversation
- `phoneNumber` - User's phone number
- `state` - Current conversation step
- `tempData` - Temporary data during flow
- `messageHistory` - Last 10 messages for context

---

## ⏰ Scheduled Tasks

- **Hourly** - Clean up expired rides
- **Daily (2 AM)** - Mark past rides as completed

---

## 🔒 Security & Privacy

- 🔐 Phone numbers are stored securely
- 🛡️ Location data is handled with care
- 👤 Users control their visibility
- 📜 Privacy policy available at `/privacy-policy`

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) first.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp) - Messaging platform
- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
- [Nominatim](https://nominatim.openstreetmap.org/) - Geocoding service
- [OSRM](https://project-osrm.org/) - Routing service
- [Leaflet](https://leafletjs.com/) - Interactive maps

---

## 📞 Support

For issues or questions, please open a [GitHub Issue](https://github.com/pdrides/pdrides-whatsapp-bot/issues) or contact support@pdrides.com

---

<div align="center">

**Made with ❤️ for community carpooling**

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/pdrides/pdrides-whatsapp-bot)

</div>

