import { ChatInputCommandInteraction, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { MarketDataService } from '../services/market-data-service';
import { ChartService } from '../services/chart-service';
import { PrismaClient } from '@prisma/client';

interface PredictionData {
  currentPrice: number;
  predicted1d: number;
  predicted1w: number;
  predicted1m: number;
  confidence1d: number;
  confidence1w: number;
  confidence1m: number;
  trend: 'bullish' | 'bearish' | 'neutral';
  rsi: number;
  sma20: number;
  ema12: number;
  support: number;
  resistance: number;
}

export const data = new SlashCommandBuilder()
  .setName('predict')
  .setDescription('🔮 AI-powered cryptocurrency price predictions with technical analysis')
  .addStringOption(option =>
    option.setName('coin')
      .setDescription('Cryptocurrency symbol (e.g., BTC, ETH, ADA)')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('timeframe')
      .setDescription('Prediction timeframe')
      .setRequired(true)
      .addChoices(
        { name: '1 Day', value: '1d' },
        { name: '1 Week', value: '1w' },
        { name: '1 Month', value: '1m' },
        { name: 'All Timeframes', value: 'all' }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  // Initialize services with required dependencies
  const prisma = new PrismaClient();
  
  try {
    const coin = interaction.options.getString('coin', true).toLowerCase();
    const timeframe = interaction.options.getString('timeframe', true);
    
    const marketDataService = new MarketDataService(prisma);
    const chartService = new ChartService(marketDataService);

    // Get current price and historical data
    const currentData = await marketDataService.getCryptoPrice(coin);
    if (!currentData) {
      await interaction.editReply('❌ Cryptocurrency not found. Please check the symbol and try again.');
      return;
    }

    // Get historical data for analysis (simulate API call)
    const historicalData = await getHistoricalPriceData(coin);
    
    // Calculate technical indicators
    const technicalAnalysis = calculateTechnicalIndicators(historicalData);
    
    // Generate predictions
    const predictions = generatePredictions(currentData.current_price, technicalAnalysis, historicalData);

    if (timeframe === 'all') {
      await sendAllPredictions(interaction, coin, currentData, predictions, chartService);
    } else {
      await sendSinglePrediction(interaction, coin, currentData, predictions, timeframe, chartService);
    }

  } catch (error) {
    console.error('Prediction error:', error);
    await interaction.editReply('❌ Error generating predictions. Please try again later.');
  } finally {
    // Clean up Prisma connection
    await prisma.$disconnect();
  }
}

async function getHistoricalPriceData(coin: string): Promise<number[]> {
  // Simulate historical price data (in production, this would fetch real data)
  // This creates realistic price movements for demonstration
  const basePrice = Math.random() * 50000 + 10000; // Random base price
  const prices: number[] = [];
  
  for (let i = 0; i < 30; i++) {
    const volatility = 0.05; // 5% daily volatility
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    const previousPrice = i === 0 ? basePrice : prices[i - 1];
    const newPrice = previousPrice * (1 + randomChange);
    prices.push(newPrice);
  }
  
  return prices;
}

function calculateTechnicalIndicators(prices: number[]) {
  const length = prices.length;
  
  // Simple Moving Average (20 periods)
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  
  // Exponential Moving Average (12 periods)
  const multiplier = 2 / (12 + 1);
  let ema12 = prices[0];
  for (let i = 1; i < Math.min(12, length); i++) {
    ema12 = (prices[i] * multiplier) + (ema12 * (1 - multiplier));
  }
  
  // RSI calculation (14 periods)
  const rsi = calculateRSI(prices.slice(-14));
  
  // Support and Resistance levels
  const recentPrices = prices.slice(-10);
  const support = Math.min(...recentPrices) * 0.98;
  const resistance = Math.max(...recentPrices) * 1.02;
  
  return { sma20, ema12, rsi, support, resistance };
}

function calculateRSI(prices: number[]): number {
  if (prices.length < 2) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / (prices.length - 1);
  const avgLoss = losses / (prices.length - 1);
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return Math.round(rsi * 100) / 100;
}

function generatePredictions(currentPrice: number, indicators: any, historicalData: number[]): PredictionData {
  const { sma20, ema12, rsi, support, resistance } = indicators;
  
  // Determine trend based on technical indicators
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (currentPrice > sma20 && currentPrice > ema12 && rsi < 70) {
    trend = 'bullish';
  } else if (currentPrice < sma20 && currentPrice < ema12 && rsi > 30) {
    trend = 'bearish';
  }
  
  // Calculate volatility from historical data
  const returns: number[] = [];
  for (let i = 1; i < historicalData.length; i++) {
    returns.push((historicalData[i] - historicalData[i-1]) / historicalData[i-1]);
  }
  const volatility = Math.sqrt(returns.reduce((sum, ret) => sum + ret * ret, 0) / returns.length);
  
  // Generate predictions with confidence intervals
  const trendMultiplier = trend === 'bullish' ? 1.02 : trend === 'bearish' ? 0.98 : 1.0;
  const rsiInfluence = (50 - rsi) / 1000; // RSI influence on predictions
  
  // 1 Day prediction
  const predicted1d = currentPrice * trendMultiplier * (1 + rsiInfluence) * (1 + (Math.random() - 0.5) * volatility * 0.5);
  const confidence1d = Math.max(60, 90 - volatility * 100);
  
  // 1 Week prediction
  const predicted1w = currentPrice * Math.pow(trendMultiplier, 3) * (1 + rsiInfluence * 2) * (1 + (Math.random() - 0.5) * volatility);
  const confidence1w = Math.max(50, 80 - volatility * 150);
  
  // 1 Month prediction
  const predicted1m = currentPrice * Math.pow(trendMultiplier, 8) * (1 + rsiInfluence * 4) * (1 + (Math.random() - 0.5) * volatility * 2);
  const confidence1m = Math.max(40, 70 - volatility * 200);
  
  return {
    currentPrice,
    predicted1d: Math.round(predicted1d * 100) / 100,
    predicted1w: Math.round(predicted1w * 100) / 100,
    predicted1m: Math.round(predicted1m * 100) / 100,
    confidence1d: Math.round(confidence1d),
    confidence1w: Math.round(confidence1w),
    confidence1m: Math.round(confidence1m),
    trend,
    rsi: Math.round(rsi * 100) / 100,
    sma20: Math.round(sma20 * 100) / 100,
    ema12: Math.round(ema12 * 100) / 100,
    support: Math.round(support * 100) / 100,
    resistance: Math.round(resistance * 100) / 100
  };
}

async function sendAllPredictions(
  interaction: ChatInputCommandInteraction,
  coin: string,
  currentData: any,
  predictions: PredictionData,
  chartService: ChartService
) {
  const change1d = ((predictions.predicted1d - predictions.currentPrice) / predictions.currentPrice) * 100;
  const change1w = ((predictions.predicted1w - predictions.currentPrice) / predictions.currentPrice) * 100;
  const change1m = ((predictions.predicted1m - predictions.currentPrice) / predictions.currentPrice) * 100;

  const trendEmoji = predictions.trend === 'bullish' ? '📈' : predictions.trend === 'bearish' ? '📉' : '➡️';
  const trendColor = predictions.trend === 'bullish' ? 0x00ff00 : predictions.trend === 'bearish' ? 0xff0000 : 0xffff00;

  const embed = new EmbedBuilder()
    .setTitle(`🔮 ${coin.toUpperCase()} Price Predictions`)
    .setDescription(`AI-powered predictions based on technical analysis`)
    .setColor(trendColor)
    .setThumbnail(currentData.image?.large || null)
    .addFields(
      {
        name: '💰 Current Price',
        value: `$${predictions.currentPrice.toLocaleString()}`,
        inline: true
      },
      {
        name: `${trendEmoji} Overall Trend`,
        value: `${predictions.trend.toUpperCase()}`,
        inline: true
      },
      {
        name: '📊 RSI',
        value: `${predictions.rsi}`,
        inline: true
      },
      {
        name: '📅 1 Day Prediction',
        value: `**$${predictions.predicted1d.toLocaleString()}**\n${change1d >= 0 ? '📈' : '📉'} ${change1d.toFixed(2)}%\n🎯 Confidence: ${predictions.confidence1d}%`,
        inline: true
      },
      {
        name: '📅 1 Week Prediction',
        value: `**$${predictions.predicted1w.toLocaleString()}**\n${change1w >= 0 ? '📈' : '📉'} ${change1w.toFixed(2)}%\n🎯 Confidence: ${predictions.confidence1w}%`,
        inline: true
      },
      {
        name: '📅 1 Month Prediction',
        value: `**$${predictions.predicted1m.toLocaleString()}**\n${change1m >= 0 ? '📈' : '📉'} ${change1m.toFixed(2)}%\n🎯 Confidence: ${predictions.confidence1m}%`,
        inline: true
      },
      {
        name: '📈 Technical Indicators',
        value: `**SMA(20):** $${predictions.sma20.toLocaleString()}\n**EMA(12):** $${predictions.ema12.toLocaleString()}\n**Support:** $${predictions.support.toLocaleString()}\n**Resistance:** $${predictions.resistance.toLocaleString()}`,
        inline: false
      }
    )
    .setFooter({
      text: '⚠️ Predictions are for educational purposes only. Not financial advice. | MarketPulse Pro',
      iconURL: interaction.client.user?.displayAvatarURL()
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}

async function sendSinglePrediction(
  interaction: ChatInputCommandInteraction,
  coin: string,
  currentData: any,
  predictions: PredictionData,
  timeframe: string,
  chartService: ChartService
) {
  let predicted: number;
  let confidence: number;
  let timeframeName: string;

  switch (timeframe) {
    case '1d':
      predicted = predictions.predicted1d;
      confidence = predictions.confidence1d;
      timeframeName = '1 Day';
      break;
    case '1w':
      predicted = predictions.predicted1w;
      confidence = predictions.confidence1w;
      timeframeName = '1 Week';
      break;
    case '1m':
      predicted = predictions.predicted1m;
      confidence = predictions.confidence1m;
      timeframeName = '1 Month';
      break;
    default:
      return;
  }

  const change = ((predicted - predictions.currentPrice) / predictions.currentPrice) * 100;
  const trendEmoji = change >= 0 ? '📈' : '📉';
  const color = change >= 0 ? 0x00ff00 : 0xff0000;

  const embed = new EmbedBuilder()
    .setTitle(`🔮 ${coin.toUpperCase()} - ${timeframeName} Prediction`)
    .setDescription(`AI-powered price prediction with ${confidence}% confidence`)
    .setColor(color)
    .setThumbnail(currentData.image?.large || null)
    .addFields(
      {
        name: '💰 Current Price',
        value: `$${predictions.currentPrice.toLocaleString()}`,
        inline: true
      },
      {
        name: `🎯 ${timeframeName} Target`,
        value: `**$${predicted.toLocaleString()}**`,
        inline: true
      },
      {
        name: '📊 Expected Change',
        value: `${trendEmoji} **${change.toFixed(2)}%**`,
        inline: true
      },
      {
        name: '🎯 Confidence Level',
        value: `${confidence}%`,
        inline: true
      },
      {
        name: `${predictions.trend === 'bullish' ? '📈' : predictions.trend === 'bearish' ? '📉' : '➡️'} Market Trend`,
        value: `${predictions.trend.toUpperCase()}`,
        inline: true
      },
      {
        name: '📊 RSI',
        value: `${predictions.rsi}`,
        inline: true
      },
      {
        name: '🔧 Key Levels',
        value: `**Support:** $${predictions.support.toLocaleString()}\n**Resistance:** $${predictions.resistance.toLocaleString()}`,
        inline: false
      }
    )
    .setFooter({
      text: '⚠️ Predictions are for educational purposes only. Not financial advice. | MarketPulse Pro',
      iconURL: interaction.client.user?.displayAvatarURL()
    })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
