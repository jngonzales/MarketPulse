import { PrismaClient } from '@prisma/client';
import axios, { AxiosError, AxiosInstance } from 'axios';

interface CoinGeckoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
}

interface AlphaVantageQuote {
  'Global Quote': {
    '01. symbol': string;
    '05. price': string;
    '09. change': string;
    '10. change percent': string;
    '03. high': string;
    '04. low': string;
    '06. volume': string;
  };
}

export class MarketDataService {
  private prisma: PrismaClient;
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3';
  private readonly ALPHA_VANTAGE_API = 'https://www.alphavantage.co/query';
  private axiosCG: AxiosInstance;
  private cgKeys: string[];
  private cgKeyIndex = 0;
  private coinIdCache: Map<string, { id: string; ts: number }> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.cgKeys = (process.env.COINGECKO_API_KEYS || '')
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    this.axiosCG = axios.create({ baseURL: this.COINGECKO_API, timeout: 15000 });
    this.axiosCG.interceptors.request.use((config) => {
      const key = this.cgKeys[this.cgKeyIndex];
      config.headers = config.headers || {} as any;
      if (key) {
        // Support both Demo and Pro header names; CoinGecko may accept either depending on plan
        (config.headers as any)['x-cg-demo-api-key'] = key;
        (config.headers as any)['x-cg-api-key'] = key;
        // Also attach as query param for some edge cases
        config.params = { ...(config.params || {}), x_cg_pro_api_key: key };
      }
      return config;
    });
  }

  // Binance REST fallback for spot price (public, no key required)
  private async fetchBinancePrice(symbol: string): Promise<number | null> {
    try {
      const sym = symbol.toUpperCase();
      const pair = sym.endsWith('USDT') ? sym : `${sym}USDT`;
      const res = await axios.get('https://api.binance.com/api/v3/ticker/price', {
        params: { symbol: pair }, timeout: 10000,
      });
      const price = parseFloat(res.data?.price);
      return isNaN(price) ? null : price;
    } catch {
      return null;
    }
  }

  private async cgGet<T>(url: string, params?: Record<string, any>, attempts = 0): Promise<T> {
    const maxAttempts = Math.max(1, (this.cgKeys.length || 1) * 2);
    try {
      const res = await this.axiosCG.get<T>(url, { params });
      return res.data as T;
    } catch (e) {
      const err = e as AxiosError;
      const status = err.response?.status;
      // Rotate key on auth/rate limit
      if ((status === 401 || status === 403 || status === 429) && attempts < maxAttempts - 1) {
        this.cgKeyIndex = (this.cgKeyIndex + 1) % Math.max(1, this.cgKeys.length || 1);
        const backoff = 300 * (attempts + 1);
        await new Promise(r => setTimeout(r, backoff));
        return this.cgGet<T>(url, params, attempts + 1);
      }
      throw err;
    }
  }

  // Resolve CoinGecko coin id from symbol with caching
  private async resolveCoinGeckoId(symbol: string): Promise<string> {
    const sym = symbol.toLowerCase();
    const cached = this.coinIdCache.get(sym);
    const now = Date.now();
    if (cached && now - cached.ts < 24 * 60 * 60 * 1000) return cached.id;

    // Fast path for popular coins
    const staticMap: Record<string, string> = {
      btc: 'bitcoin', eth: 'ethereum', ada: 'cardano', dot: 'polkadot', sol: 'solana',
      doge: 'dogecoin', matic: 'polygon', avax: 'avalanche-2', link: 'chainlink', uni: 'uniswap'
    };
    if (staticMap[sym]) {
      this.coinIdCache.set(sym, { id: staticMap[sym], ts: now });
      return staticMap[sym];
    }

    // Fetch full list once and map by symbol (first match)
    const list = await this.cgGet<Array<{ id: string; symbol: string; name: string }>>('/coins/list');
    const match = list.find(c => c.symbol.toLowerCase() === sym);
    const id = match ? match.id : sym;
    this.coinIdCache.set(sym, { id, ts: now });
    return id;
  }

  async getCryptoPrice(symbol: string): Promise<any> {
    try {
      // First check our database for recent data
      const cached = await this.prisma.marketData.findUnique({
        where: { symbol: symbol.toUpperCase() },
      });

      const isRecent = cached && new Date().getTime() - cached.lastUpdated.getTime() < 60000; // 1 minute
      if (cached && isRecent) {
        return this.formatCryptoData(cached);
      }

      // Fetch from CoinGecko via helper with API key rotation
      const id = await this.resolveCoinGeckoId(symbol);
      const dataArr = await this.cgGet<CoinGeckoPrice[]>('/coins/markets', {
        vs_currency: 'usd',
        ids: id,
        order: 'market_cap_desc',
        per_page: 1,
        page: 1,
        sparkline: false,
      });

      if (dataArr && dataArr.length > 0) {
        const data = dataArr[0];
        await this.updateMarketData({
          symbol: symbol.toUpperCase(),
          currentPrice: data.current_price,
          priceChange24h: data.price_change_24h,
          priceChangePercent24h: data.price_change_percentage_24h,
          high24h: data.high_24h,
          low24h: data.low_24h,
          volume24h: data.total_volume,
          marketCap: data.market_cap,
        });
        return this.formatCryptoData(data);
      }

      throw new Error('Cryptocurrency not found');
    } catch (error) {
      console.error(`Error fetching crypto price for ${symbol}:`, error);

      // Try Binance fallback before DB cache
      const binance = await this.fetchBinancePrice(symbol);
      if (binance !== null) {
        const up = {
          symbol: symbol.toUpperCase(),
          currentPrice: binance,
          priceChange24h: 0,
          priceChangePercent24h: 0,
          high24h: binance,
          low24h: binance,
          volume24h: 0,
          marketCap: null,
        };
        await this.updateMarketData(up);
        return this.formatCryptoData({ symbol: symbol.toUpperCase(), current_price: binance, price_change_24h: 0, price_change_percentage_24h: 0, high_24h: binance, low_24h: binance, total_volume: 0, market_cap: null, name: symbol.toUpperCase() });
      }

      // Fallback to last known cache if exists
      const fallback = await this.prisma.marketData.findUnique({ where: { symbol: symbol.toUpperCase() } });
      if (fallback) return this.formatCryptoData(fallback);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }

  async getStockPrice(symbol: string): Promise<any> {
    try {
      // Check database cache
      const cached = await this.prisma.marketData.findUnique({
        where: { symbol: symbol.toUpperCase() },
      });

      const isRecent = cached && 
        new Date().getTime() - cached.lastUpdated.getTime() < 300000; // 5 minutes

      if (cached && isRecent) {
        return this.formatStockData(cached);
      }

      // Fetch from Alpha Vantage
      const response = await axios.get(this.ALPHA_VANTAGE_API, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: symbol,
          apikey: process.env.ALPHA_VANTAGE_API_KEY,
        },
      });

      const quote = response.data as AlphaVantageQuote;
      if (quote['Global Quote']) {
        const data = quote['Global Quote'];
        
        // Update database
        await this.updateMarketData({
          symbol: symbol.toUpperCase(),
          currentPrice: parseFloat(data['05. price']),
          priceChange24h: parseFloat(data['09. change']),
          priceChangePercent24h: parseFloat(data['10. change percent'].replace('%', '')),
          high24h: parseFloat(data['03. high']),
          low24h: parseFloat(data['04. low']),
          volume24h: parseFloat(data['06. volume']),
          marketCap: null,
        });

        return this.formatStockData(data);
      }

      throw new Error('Stock not found');
    } catch (error) {
      console.error(`Error fetching stock price for ${symbol}:`, error);
      throw new Error(`Failed to fetch price for ${symbol}`);
    }
  }

  async getTopGainers(limit: number = 10): Promise<any[]> {
    try {
      const data = await this.cgGet<CoinGeckoPrice[]>('/coins/markets', {
        vs_currency: 'usd',
        order: 'price_change_percentage_24h_desc',
        per_page: limit,
        page: 1,
        sparkline: false,
      });
      return (data || []).map((coin) => this.formatCryptoData(coin));
    } catch (error) {
      console.error('Error fetching top gainers:', error);
      throw new Error('Failed to fetch top gainers');
    }
  }

  async getTopLosers(limit: number = 10): Promise<any[]> {
    try {
      const data = await this.cgGet<CoinGeckoPrice[]>('/coins/markets', {
        vs_currency: 'usd',
        order: 'price_change_percentage_24h_asc',
        per_page: limit,
        page: 1,
        sparkline: false,
      });
      return (data || []).map((coin) => this.formatCryptoData(coin));
    } catch (error) {
      console.error('Error fetching top losers:', error);
      throw new Error('Failed to fetch top losers');
    }
  }

  private async updateMarketData(data: {
    symbol: string;
    currentPrice: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    high24h: number;
    low24h: number;
    volume24h: number;
    marketCap: number | null;
  }) {
    await this.prisma.marketData.upsert({
      where: { symbol: data.symbol },
      update: {
        ...data,
        lastUpdated: new Date(),
      },
      create: {
        ...data,
        lastUpdated: new Date(),
      },
    });

    // Store price history
    await this.prisma.priceHistory.create({
      data: {
        symbol: data.symbol,
        price: data.currentPrice,
        volume: data.volume24h,
      },
    });
  }

  private formatCryptoData(data: any) {
    return {
      symbol: data.symbol?.toUpperCase() || data.symbol,
      name: data.name || data.symbol,
      price: data.current_price || data.currentPrice,
      change24h: data.price_change_24h || data.priceChange24h,
      changePercent24h: data.price_change_percentage_24h || data.priceChangePercent24h,
      high24h: data.high_24h || data.high24h,
      low24h: data.low_24h || data.low24h,
      volume24h: data.total_volume || data.volume24h,
      marketCap: data.market_cap || data.marketCap,
      type: 'crypto',
    };
  }

  private formatStockData(data: any) {
    if (data['05. price']) {
      // Alpha Vantage format
      return {
        symbol: data['01. symbol'],
        price: parseFloat(data['05. price']),
        change24h: parseFloat(data['09. change']),
        changePercent24h: parseFloat(data['10. change percent'].replace('%', '')),
        high24h: parseFloat(data['03. high']),
        low24h: parseFloat(data['04. low']),
        volume24h: parseFloat(data['06. volume']),
        type: 'stock',
      };
    } else {
      // Database format
      return {
        symbol: data.symbol,
        price: data.currentPrice,
        change24h: data.priceChange24h,
        changePercent24h: data.priceChangePercent24h,
        high24h: data.high24h,
        low24h: data.low24h,
        volume24h: data.volume24h,
        type: 'stock',
      };
    }
  }

  // Fetch recent price history from DB (used by /predict and charts as fallback)
  async getHistoricalData(symbol: string, days: number = 7): Promise<Array<{ timestamp: Date; price: number; volume: number }>> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const rowsRaw = await this.prisma.priceHistory.findMany({
        where: { symbol: symbol.toUpperCase(), timestamp: { gte: since } },
        orderBy: { timestamp: 'asc' },
        select: { timestamp: true, price: true, volume: true },
      });
      const rows = rowsRaw.map(r => ({ timestamp: r.timestamp, price: r.price, volume: r.volume ?? 0 }));
      return rows;
    } catch (error) {
      console.error(`Error fetching historical data for ${symbol}:`, error);
      return [];
    }
  }
}
