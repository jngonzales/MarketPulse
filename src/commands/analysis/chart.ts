import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { ChartService } from '../../services/chart-service';

export default {
  data: new SlashCommandBuilder()
    .setName('chart')
    .setDescription('Generate a price chart with technical indicators')
    .addStringOption(option =>
      option.setName('symbol')
        .setDescription('The symbol to chart (e.g., BTC, AAPL)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('timeframe')
        .setDescription('Chart timeframe')
        .setRequired(false)
        .addChoices(
          { name: '1 Hour', value: '1h' },
          { name: '4 Hours', value: '4h' },
          { name: '1 Day', value: '1d' },
          { name: '3 Days', value: '3d' },
          { name: '7 Days', value: '7d' },
          { name: '30 Days', value: '30d' },
          { name: '90 Days', value: '90d' }
        )
    )
    .addStringOption(option =>
      option.setName('indicators')
        .setDescription('Technical indicators (comma-separated: sma, ema, rsi)')
        .setRequired(false)
    ),

  async execute(interaction: any) {
    const symbol = interaction.options.getString('symbol').toUpperCase();
    const timeframe = interaction.options.getString('timeframe') || '7d';
    const indicatorsInput = interaction.options.getString('indicators') || '';

    const chartService: ChartService = interaction.client.chart;
    const marketData = interaction.client.marketData;

    const indicators = indicatorsInput
      .split(',')
      .map((i: string) => i.trim().toLowerCase())
      .filter((i: string) => ['sma', 'ema', 'rsi'].includes(i));

    await interaction.deferReply();

    try {
      // Verify the symbol exists
      try {
        await marketData.getCryptoPrice(symbol);
      } catch {
        try {
          await marketData.getStockPrice(symbol);
        } catch {
          return await interaction.editReply({
            content: `❌ Could not find data for **${symbol}**. Please check the symbol and try again.`,
          });
        }
      }

      // Generate chart
      const chartBuffer = await chartService.generatePriceChart(symbol, timeframe, indicators);

      const attachment = new AttachmentBuilder(chartBuffer, { 
        name: `${symbol.toLowerCase()}-chart.png` 
      });

      const embed = new EmbedBuilder()
        .setTitle(`📈 ${symbol} Price Chart`)
        .setDescription(`**Timeframe:** ${timeframe.toUpperCase()}\n**Indicators:** ${indicators.length > 0 ? indicators.join(', ').toUpperCase() : 'None'}`)
        .setImage(`attachment://${symbol.toLowerCase()}-chart.png`)
        .setColor(0x0099ff)
        .setFooter({
          text: 'MarketPulse Pro • Real-time market data',
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });

    } catch (error) {
      console.error('Error generating chart:', error);
      await interaction.editReply({
        content: '❌ Failed to generate chart. This might be due to insufficient historical data or an invalid symbol.',
      });
    }
  },
};
