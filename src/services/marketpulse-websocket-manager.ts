import WebSocket from 'ws';
import { MarketDataService } from './market-data-service.js';
import { AlertService } from './alert-service.js';

interface BinanceTickerData {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  C: number; // Close time
  o: string; // Open price
  h: string; // High price
  l: string; // Low price
  v: string; // Total traded base asset volume
  q: string; // Total traded quote asset volume
  P: string; // Price change percent
  p: string; // Price change
}

export class MarketPulseWebSocketManager {
  private binanceWs: WebSocket | null = null;
  private marketDataService: MarketDataService;
  private alertService: AlertService;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private isConnected = false;

  // Popular symbols to track
  private trackedSymbols = [
    'btcusdt', 'ethusdt', 'adausdt', 'dotusdt', 'solusdt',
    'dogeusdt', 'maticusdt', 'avaxusdt', 'linkusdt', 'uniusdt'
  ];

  constructor(marketDataService: MarketDataService, alertService: AlertService) {
    this.marketDataService = marketDataService;
    this.alertService = alertService;
  }

  start() {
    this.connectToBinance();
  }

  stop() {
    if (this.binanceWs) {
      this.binanceWs.close();
      this.binanceWs = null;
    }
    this.isConnected = false;
  }

  private connectToBinance() {
    try {
      const streams = this.trackedSymbols.map(symbol => `${symbol}@ticker`).join('/');
      const wsUrl = `wss://stream.binance.com:9443/ws/${streams}`;
      
      console.log('🔌 Connecting to Binance WebSocket...');
      this.binanceWs = new WebSocket(wsUrl);

      this.binanceWs.on('open', () => {
        console.log('✅ Connected to Binance WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.binanceWs.on('message', (data: WebSocket.Data) => {
        try {
          const tickerData = JSON.parse(data.toString()) as BinanceTickerData;
          this.handleTickerUpdate(tickerData);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      this.binanceWs.on('close', (code, reason) => {
        console.log(`🔌 Binance WebSocket closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.handleReconnect();
      });

      this.binanceWs.on('error', (error) => {
        console.error('❌ Binance WebSocket error:', error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('❌ Error connecting to Binance WebSocket:', error);
      this.handleReconnect();
    }
  }

  private async handleTickerUpdate(data: BinanceTickerData) {
    try {
      const symbol = data.s.replace('USDT', ''); // Remove USDT suffix
      const price = parseFloat(data.c);
      const priceChange24h = parseFloat(data.p);
      const priceChangePercent24h = parseFloat(data.P);
      const high24h = parseFloat(data.h);
      const low24h = parseFloat(data.l);
      const volume24h = parseFloat(data.v);

      // Update market data in database
      await this.marketDataService['updateMarketData']({
        symbol: symbol.toUpperCase(),
        currentPrice: price,
        priceChange24h,
        priceChangePercent24h,
        high24h,
        low24h,
        volume24h,
        marketCap: null,
      });

      // Check alerts
      await this.alertService.checkPriceAlerts(symbol.toUpperCase(), price);

    } catch (error) {
      console.error('Error handling ticker update:', error);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect to Binance WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectToBinance();
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached for Binance WebSocket');
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  addSymbolToTrack(symbol: string) {
    const normalizedSymbol = `${symbol.toLowerCase()}usdt`;
    if (!this.trackedSymbols.includes(normalizedSymbol)) {
      this.trackedSymbols.push(normalizedSymbol);
      // Restart connection with new symbols
      this.stop();
      setTimeout(() => this.start(), 1000);
    }
  }

  removeSymbolFromTrack(symbol: string) {
    const normalizedSymbol = `${symbol.toLowerCase()}usdt`;
    const index = this.trackedSymbols.indexOf(normalizedSymbol);
    if (index > -1) {
      this.trackedSymbols.splice(index, 1);
      // Restart connection without the symbol
      this.stop();
      setTimeout(() => this.start(), 1000);
    }
  }

  getTrackedSymbols(): string[] {
    return this.trackedSymbols.map(symbol => symbol.replace('usdt', '').toUpperCase());
  }
}
