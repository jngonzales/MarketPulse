import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get help with MarketPulse Pro commands'),

  async execute(interaction: any) {
    const embed = new EmbedBuilder()
      .setTitle('📚 MarketPulse Pro - Command Guide')
      .setDescription('Professional crypto and stock market analytics for Discord')
      .setColor(0x0099ff)
      .addFields([
        {
          name: '💰 Market Data',
          value: '`/price <symbol>` - Get current price and 24h stats\n`/price <symbol> chart:true` - Include price chart',
          inline: false,
        },
        {
          name: '🚨 Price Alerts',
          value: '`/alert <symbol> <above/below> <price>` - Create price alert\n`/alerts` - View your active alerts\n`/removealert <id>` - Remove an alert',
          inline: false,
        },
        {
          name: '📊 Technical Analysis',
          value: '`/chart <symbol> [timeframe] [indicators]` - Generate price chart\n`/compare <symbols>` - Compare multiple assets\n`/heatmap` - View market heatmap',
          inline: false,
        },
        {
          name: '🎯 Portfolio Management',
          value: '`/portfolio add <symbol> <quantity> [buy_price]` - Add holding\n`/portfolio view` - View your portfolio\n`/portfolio summary` - Portfolio performance\n`/portfolio remove <symbol>` - Remove holding',
          inline: false,
        },
        {
          name: '⚙️ Supported Assets',
          value: '**Cryptocurrencies:** BTC, ETH, ADA, SOL, DOGE, MATIC, AVAX, LINK, UNI, and hundreds more\n**Stocks:** AAPL, GOOGL, MSFT, TSLA, AMZN, and major global markets',
          inline: false,
        },
        {
          name: '📈 Technical Indicators',
          value: '**Available:** SMA, EMA, RSI\n**Usage:** `/chart BTC 7d sma,ema,rsi`',
          inline: false,
        },
        {
          name: '⏰ Timeframes',
          value: '**Supported:** 1h, 4h, 1d, 3d, 7d, 30d, 90d\n**Default:** 7d for charts',
          inline: false,
        },
        {
          name: '🔔 Alert Notifications',
          value: 'You\'ll receive a **DM** when your price alerts trigger. Make sure DMs are enabled!',
          inline: false,
        },
      ])
      .setFooter({
        text: 'MarketPulse Pro • Real-time market data powered by live WebSocket feeds',
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
