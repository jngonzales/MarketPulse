<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# MarketPulse Pro - Discord Bot Development

This is a professional Discord bot project for crypto and stock market analytics.

## Project Architecture
- **Language**: TypeScript with Node.js
- **Framework**: discord.js v14
- **Database**: PostgreSQL with Prisma ORM
- **Real-time Data**: WebSocket connections to Binance API
- **APIs**: CoinGecko (crypto), Alpha Vantage (stocks), Finnhub
- **Charts**: Chart.js with chartjs-node-canvas
- **Technical Analysis**: technicalindicators library

## Key Features
1. **Multi-Asset Support**: Cryptocurrencies and stocks
2. **Real-time Price Tracking**: WebSocket streaming
3. **Smart Alerts System**: Database-stored alerts with DM notifications
4. **Technical Analysis**: Charts with SMA, EMA, RSI indicators
5. **Portfolio Management**: Track holdings and P&L
6. **Market Analytics**: Heatmaps, gainers/losers, comparisons

## Code Style Guidelines
- Use TypeScript strict mode
- Follow clean architecture patterns
- Implement proper error handling
- Use descriptive variable names
- Add JSDoc comments for complex functions
- Maintain separation of concerns (services, commands, events)

## Database Models
- **User**: Discord user data
- **Alert**: Price alert configurations
- **Portfolio**: User holdings
- **PriceHistory**: Historical price data
- **MarketData**: Current market information

## Command Structure
- `/price` - Current price information
- `/alert` - Create price alerts
- `/chart` - Generate technical charts
- `/portfolio` - Portfolio management
- `/heatmap` - Market overview

## Services
- **MarketDataService**: API data fetching and caching
- **AlertService**: Alert management and notifications
- **PortfolioService**: Portfolio calculations
- **WebSocketManager**: Real-time data streaming
- **ChartService**: Chart generation

When working on this project, prioritize:
1. Type safety and error handling
2. Real-time data accuracy
3. User experience in Discord
4. Database performance
5. API rate limiting compliance
