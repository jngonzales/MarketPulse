import { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } from 'discord.js';
import { ChartService } from '../../services/chart-service';

export default {
  data: new SlashCommandBuilder()
    .setName('price')
    .setDescription('Get current price information for a cryptocurrency or stock')
    .addStringOption(option =>
      option.setName('symbol')
        .setDescription('The symbol to get price for (e.g., BTC, AAPL)')
        .setRequired(true)
    )
    .addBooleanOption(option =>
      option.setName('chart')
        .setDescription('Include a price chart')
        .setRequired(false)
    ),

  async execute(interaction: any) {
    const symbol = interaction.options.getString('symbol');
    const includeChart = interaction.options.getBoolean('chart') || false;

    await interaction.deferReply();

    try {
      let marketData;
      let assetType = 'unknown';

      // Try to get crypto data first
      try {
        marketData = await interaction.client.marketData.getCryptoPrice(symbol);
        assetType = 'crypto';
      } catch {
        // If crypto fails, try stock data
        try {
          marketData = await interaction.client.marketData.getStockPrice(symbol);
          assetType = 'stock';
        } catch {
          return await interaction.editReply({
            content: `❌ Could not find price data for **${symbol.toUpperCase()}**. Please check the symbol and try again.`,
          });
        }
      }

      // Format price change color
      const changeColor = marketData.changePercent24h >= 0 ? 0x00ff00 : 0xff0000;
      const changeEmoji = marketData.changePercent24h >= 0 ? '📈' : '📉';
      const changePrefix = marketData.changePercent24h >= 0 ? '+' : '';

      const embed = new EmbedBuilder()
        .setTitle(`${changeEmoji} ${marketData.symbol || symbol.toUpperCase()} ${marketData.name ? `(${marketData.name})` : ''}`)
        .setColor(changeColor)
        .addFields([
          {
            name: '💰 Current Price',
            value: `$${marketData.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`,
            inline: true,
          },
          {
            name: '📊 24h Change',
            value: `${changePrefix}$${marketData.change24h?.toFixed(2) || 'N/A'}`,
            inline: true,
          },
          {
            name: '📈 24h Change %',
            value: `${changePrefix}${marketData.changePercent24h?.toFixed(2) || 'N/A'}%`,
            inline: true,
          },
          {
            name: '⬆️ 24h High',
            value: `$${marketData.high24h?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) || 'N/A'}`,
            inline: true,
          },
          {
            name: '⬇️ 24h Low',
            value: `$${marketData.low24h?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) || 'N/A'}`,
            inline: true,
          },
          {
            name: '🔊 24h Volume',
            value: marketData.volume24h ? `$${marketData.volume24h.toLocaleString('en-US')}` : 'N/A',
            inline: true,
          },
        ])
        .setFooter({
          text: `${assetType.toUpperCase()} • Data from live market feeds • MarketPulse Pro`,
        })
        .setTimestamp();

      // Add market cap for crypto
      if (assetType === 'crypto' && marketData.marketCap) {
        embed.addFields([{
          name: '🏦 Market Cap',
          value: `$${marketData.marketCap.toLocaleString('en-US')}`,
          inline: true,
        }]);
      }

      const responseData: any = { embeds: [embed] };

      // Generate chart if requested
      if (includeChart) {
        try {
          const chartService = new ChartService(interaction.client.marketData);
          const chartBuffer = await chartService.generatePriceChart(symbol, '7d');
          
          const attachment = new AttachmentBuilder(chartBuffer, { 
            name: `${symbol.toLowerCase()}-chart.png` 
          });
          
          embed.setImage(`attachment://${symbol.toLowerCase()}-chart.png`);
          responseData.files = [attachment];
        } catch (chartError) {
          console.error('Error generating chart:', chartError);
          // Continue without chart
        }
      }

      await interaction.editReply(responseData);

    } catch (error) {
      console.error('Error in price command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching price data. Please try again later.',
      });
    }
  },
};
