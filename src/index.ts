import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';
import { MarketPulseWebSocketManager } from './services/marketpulse-websocket-manager';
import { MarketDataService } from './services/market-data-service';
import { AlertService } from './services/alert-service';
import { PortfolioService } from './services/portfolio-service';
import { ChartService } from './services/chart-service';

config();

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, any>;
    prisma: PrismaClient;
    marketData: MarketDataService;
    alerts: AlertService;
    portfolio: PortfolioService;
    websocket: MarketPulseWebSocketManager;
    chart: ChartService;
  }
}

class MarketPulseBot {
  private client: Client;
  private prisma: PrismaClient;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.prisma = new PrismaClient();
    this.client.prisma = this.prisma;
    this.client.commands = new Collection();

    // Initialize services
    this.client.marketData = new MarketDataService(this.prisma);
    this.client.alerts = new AlertService(this.prisma, this.client);
    this.client.portfolio = new PortfolioService(this.prisma, this.client.marketData);
    this.client.chart = new ChartService(this.client.marketData);
    this.client.websocket = new MarketPulseWebSocketManager(this.client.marketData, this.client.alerts);
  }

  async start() {
    try {
      console.log('🚀 Starting MarketPulse Pro...');

      // Validate required env vars early
      const requiredEnv = ['BOT_TOKEN', 'CLIENT_ID'];
      const missing = requiredEnv.filter((k) => !process.env[k]);
      if (missing.length) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
      
      // Connect to database
      await this.prisma.$connect();
      console.log('✅ Database connected');

      // Load commands
      await this.loadCommands();
      console.log('✅ Commands loaded');

      // Load events
      await this.loadEvents();
      console.log('✅ Events loaded');

      // Start WebSocket connections
      this.client.websocket.start();
      console.log('✅ WebSocket connections started');

      // Login to Discord
      await this.client.login(process.env.BOT_TOKEN);
      console.log('✅ Bot logged in successfully');

    } catch (error) {
      console.error('❌ Failed to start bot:', error);
      process.exit(1);
    }
  }

  private async loadCommands() {
    const commandsPath = join(__dirname, 'commands');
    const entries = readdirSync(commandsPath, { withFileTypes: true });

    const loadCommandFile = async (filePath: string) => {
      const mod = await import(filePath);
      const command = mod.default ?? mod;
      if (command && 'data' in command && 'execute' in command) {
        this.client.commands.set(command.data.name, command);
      } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    };

    for (const entry of entries) {
      const entryPath = join(commandsPath, entry.name);
      if (entry.isDirectory()) {
        const commandFiles = readdirSync(entryPath)
          .filter((file) => file.endsWith('.js') || file.endsWith('.ts'));
        for (const file of commandFiles) {
          await loadCommandFile(join(entryPath, file));
        }
      } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.ts'))) {
        await loadCommandFile(entryPath);
      }
    }
  }

  private async loadEvents() {
    const eventsPath = join(__dirname, 'events');
    const eventFiles = readdirSync(eventsPath).filter(
      (file) => file.endsWith('.js') || file.endsWith('.ts')
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const mod = await import(filePath);
      const event = mod.default ?? mod;
      if (!event || !event.name || !event.execute) {
        console.log(`⚠️ Event at ${filePath} is missing required exports.`);
        continue;
      }
      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args));
      } else {
        this.client.on(event.name, (...args) => event.execute(...args));
      }
    }
  }

  async shutdown() {
    console.log('🔄 Shutting down MarketPulse Pro...');
    
    this.client.websocket.stop();
    await this.prisma.$disconnect();
    this.client.destroy();
    
    console.log('✅ Bot shutdown complete');
    process.exit(0);
  }
}

// Start the bot
const bot = new MarketPulseBot();
bot.start();

// Graceful shutdown handlers should call bot.shutdown()
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT signal');
  await bot.shutdown();
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM signal');
  await bot.shutdown();
});

export default MarketPulseBot;
