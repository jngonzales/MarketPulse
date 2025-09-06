# 🚀 MarketPulse Pro

**Professional Discord bot for crypto and stock market analytics** - Built for serious traders who need real-time market data, advanced alerts, and portfolio tracking directly in Discord.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?logo=discord&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white)

## ✨ Features

### 📊 **Multi-Asset Coverage**
- **500+ Cryptocurrencies**: BTC, ETH, SOL, DOGE, ADA, and more
- **Global Stock Markets**: NASDAQ, NYSE, major international exchanges
- **Multiple Fiat Currencies**: USD, EUR, JPY, PHP support

### ⚡ **Real-Time Price Tracking**
- Live WebSocket streaming from Binance
- Sub-second price updates
- Professional embed-style responses
- 24h statistics with volume and market cap

### 🚨 **Smart Alerts System**
- Set price alerts: `/alert BTC above 50000`
- Instant DM notifications when triggered
- PostgreSQL storage for reliability
- Manage alerts with `/alerts` and `/removealert`

### 📈 **Advanced Technical Analysis**
- Interactive price charts with indicators
- Support for SMA, EMA, RSI
- Multi-timeframe analysis (1h to 90d)
- Asset comparison charts

### 🎯 **Portfolio Management**
- Track holdings with `/portfolio add`
- Real-time P&L calculations
- Performance summaries and analytics
- Automatic market value updates

### 🔥 **Market Intelligence**
- Live market heatmaps
- Top gainers and losers
- Market sentiment analysis
- Professional trader-focused UI

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- Discord Bot Token
- API Keys (optional but recommended):
  - Alpha Vantage (for stocks)
  - Finnhub (for additional stock data)

### Installation

1. **Clone and install dependencies**
```bash
git clone <your-repo>
cd marketpulse-pro
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Database Setup**
```bash
npm run prisma:migrate
npm run prisma:generate
```

4. **Deploy Commands**
```bash
npm run deploy
```

5. **Start the Bot**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 🛠️ Configuration

### Environment Variables

```env
# Discord Bot
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_test_guild_id

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/marketpulse"

# API Keys (Optional)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key

# Settings
NODE_ENV=production
```

### Discord Bot Setup

1. Create a bot at [Discord Developer Portal](https://discord.com/developers/applications)
2. Enable these permissions:
   - Send Messages
   - Use Slash Commands
   - Embed Links
   - Attach Files
   - Send Messages in Threads
3. Invite bot to your server with proper permissions

## 📚 Commands Reference

### Market Data
- `/price <symbol> [chart]` - Get current price with optional chart
- `/chart <symbol> [timeframe] [indicators]` - Generate technical chart
- `/compare <symbols>` - Compare multiple assets
- `/heatmap` - View market overview

### Alerts
- `/alert <symbol> <above/below> <price>` - Create price alert
- `/alerts` - View your active alerts
- `/removealert <id>` - Remove an alert

### Portfolio
- `/portfolio add <symbol> <quantity> [buy_price]` - Add holding
- `/portfolio view` - View your portfolio
- `/portfolio summary` - Performance overview
- `/portfolio remove <symbol>` - Remove holding

### Utility
- `/help` - Command guide
- `/status` - Bot health check

## 🏗️ Architecture

### Project Structure
```
src/
├── commands/           # Slash commands
│   ├── alerts/        # Alert management
│   ├── analysis/      # Technical analysis
│   ├── market/        # Market data
│   ├── portfolio/     # Portfolio management
│   └── utility/       # Utility commands
├── events/            # Discord events
├── services/          # Business logic
│   ├── market-data-service.ts
│   ├── alert-service.ts
│   ├── portfolio-service.ts
│   ├── websocket-manager.ts
│   └── chart-service.ts
├── index.ts           # Main bot file
└── deploy-commands.ts # Command deployment
```

### Tech Stack
- **Backend**: Node.js + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: WebSocket (Binance API)
- **Charts**: Chart.js + Canvas
- **Discord**: discord.js v14
- **APIs**: CoinGecko, Alpha Vantage, Finnhub

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run deploy       # Deploy slash commands
npm run prisma:migrate # Run database migrations
npm run prisma:studio  # Open Prisma Studio
```

### Adding New Features

1. **New Command**: Create in appropriate `/commands` folder
2. **New Service**: Add to `/services` with proper interfaces
3. **Database Changes**: Update `prisma/schema.prisma` and migrate
4. **WebSocket Data**: Extend `WebSocketManager` for new symbols

## 📊 Database Schema

```sql
User {
  id          String   @id @default(cuid())
  discordId   String   @unique
  username    String
  alerts      Alert[]
  portfolios  Portfolio[]
}

Alert {
  id          String   @id
  symbol      String
  condition   String   // "above" | "below"
  targetPrice Float
  isActive    Boolean
  triggered   Boolean
}

Portfolio {
  id          String   @id
  symbol      String
  quantity    Float
  avgBuyPrice Float?
}
```

## 🚨 Production Considerations

### Performance
- Connection pooling for database
- Redis caching for frequent queries
- Rate limiting for API calls
- WebSocket reconnection handling

### Security
- Input validation on all commands
- API key rotation
- User permission checks
- SQL injection protection (Prisma)

### Monitoring
- Error logging and alerts
- WebSocket connection health
- Database performance metrics
- API response times

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Add proper error handling
- Write descriptive commit messages
- Update documentation for new features
- Test commands thoroughly

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: Create an issue on GitHub
- **Discord**: Join our support server
- **Documentation**: Check the `/help` command in Discord

## 🔮 Roadmap

### Upcoming Features
- [ ] AI-powered market sentiment analysis
- [ ] Options and futures tracking
- [ ] Custom watchlists
- [ ] Automated trading signals
- [ ] Web dashboard (Next.js)
- [ ] Mobile notifications
- [ ] Multi-language support
- [ ] Advanced portfolio analytics

### API Integrations
- [ ] Coinbase Pro API
- [ ] Binance Futures
- [ ] TradingView indicators
- [ ] News sentiment analysis

---

**MarketPulse Pro** - Where professional trading meets Discord convenience. Built by traders, for traders.

⭐ **Star this repo if you find it useful!** ⭐
