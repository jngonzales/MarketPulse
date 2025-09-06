import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { ChartService } from '../../services/chart-service';

export default {
  data: new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare prices of multiple assets')
    .addStringOption(option =>
      option.setName('symbols')
        .setDescription('Symbols to compare (comma-separated, e.g., BTC,ETH,AAPL)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('timeframe')
        .setDescription('Chart timeframe')
        .setRequired(false)
        .addChoices(
          { name: '1 Day', value: '1d' },
          { name: '3 Days', value: '3d' },
          { name: '7 Days', value: '7d' },
          { name: '30 Days', value: '30d' },
          { name: '90 Days', value: '90d' }
        )
    ),

  async execute(interaction: any) {
    const symbolsInput = interaction.options.getString('symbols');
    const timeframe = interaction.options.getString('timeframe') || '7d';
    
    const symbols = symbolsInput
      .split(',')
      .map((s: string) => s.trim().toUpperCase())
      .slice(0, 5); // Limit to 5 symbols

    if (symbols.length < 2) {
      return await interaction.reply({
        content: '❌ Please provide at least 2 symbols to compare.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      // Verify all symbols exist and get current prices
      const validSymbols = [];
      const currentPrices = [];

      for (const symbol of symbols) {
        try {
          let price;
          try {
            const cryptoData = await interaction.client.marketData.getCryptoPrice(symbol);
            price = cryptoData.price;
          } catch {
            const stockData = await interaction.client.marketData.getStockPrice(symbol);
            price = stockData.price;
          }
          
          validSymbols.push(symbol);
          currentPrices.push(price);
        } catch {
          console.log(`Symbol ${symbol} not found`);
        }
      }

      if (validSymbols.length < 2) {
        return await interaction.editReply({
          content: '❌ Could not find valid data for at least 2 symbols. Please check your symbols and try again.',
        });
      }

      // Generate comparison chart
      const chartService = new ChartService(interaction.client.marketData);
      const chartBuffer = await chartService.generateComparisonChart(validSymbols, timeframe);

      const attachment = new AttachmentBuilder(chartBuffer, { 
        name: 'comparison-chart.png' 
      });

      // Create embed with current prices
      const embed = new EmbedBuilder()
        .setTitle(`📊 Asset Comparison (${timeframe.toUpperCase()})`)
        .setDescription(`Comparing **${validSymbols.join(' vs ')}**`)
        .setImage('attachment://comparison-chart.png')
        .setColor(0x0099ff)
        .setFooter({
          text: 'MarketPulse Pro • Real-time market data',
        })
        .setTimestamp();

      // Add current prices
      for (let i = 0; i < validSymbols.length; i++) {
        embed.addFields([{
          name: `💰 ${validSymbols[i]}`,
          value: `$${currentPrices[i].toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`,
          inline: true,
        }]);
      }

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });

    } catch (error) {
      console.error('Error generating comparison chart:', error);
      await interaction.editReply({
        content: '❌ Failed to generate comparison chart. Please try again later.',
      });
    }
  },
};
