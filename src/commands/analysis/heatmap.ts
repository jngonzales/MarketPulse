import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('heatmap')
    .setDescription('View market heatmap with top gainers and losers'),

  async execute(interaction: any) {
    await interaction.deferReply();

    try {
      // Get top gainers and losers
      const [gainers, losers] = await Promise.all([
        interaction.client.marketData.getTopGainers(10),
        interaction.client.marketData.getTopLosers(10),
      ]);

      const embed = new EmbedBuilder()
        .setTitle('🔥 Market Heatmap')
        .setDescription('Top performers in the cryptocurrency market over the last 24 hours')
        .setColor(0x0099ff)
        .setFooter({
          text: 'MarketPulse Pro • Live market data',
        })
        .setTimestamp();

      // Top Gainers
      if (gainers.length > 0) {
        const gainersText = gainers
          .slice(0, 5)
          .map((coin: any, index: number) => {
            const changeEmoji = '🚀';
            return `${index + 1}. **${coin.symbol}** ${changeEmoji}\n   $${coin.price.toFixed(4)} (+${coin.changePercent24h.toFixed(2)}%)`;
          })
          .join('\n\n');

        embed.addFields([{
          name: '📈 Top Gainers',
          value: gainersText,
          inline: true,
        }]);
      }

      // Top Losers
      if (losers.length > 0) {
        const losersText = losers
          .slice(0, 5)
          .map((coin: any, index: number) => {
            const changeEmoji = '📉';
            return `${index + 1}. **${coin.symbol}** ${changeEmoji}\n   $${coin.price.toFixed(4)} (${coin.changePercent24h.toFixed(2)}%)`;
          })
          .join('\n\n');

        embed.addFields([{
          name: '📉 Top Losers',
          value: losersText,
          inline: true,
        }]);
      }

      // Market Summary
      const totalGain = gainers.reduce((sum: number, coin: any) => sum + coin.changePercent24h, 0);
      const totalLoss = Math.abs(losers.reduce((sum: number, coin: any) => sum + coin.changePercent24h, 0));
      const marketSentiment = totalGain > totalLoss ? 'Bullish 🐂' : 'Bearish 🐻';

      embed.addFields([{
        name: '🎯 Market Sentiment',
        value: `**${marketSentiment}**\n\nAverage Top Gainer: +${(totalGain / gainers.length).toFixed(2)}%\nAverage Top Loser: ${(totalLoss / losers.length * -1).toFixed(2)}%`,
        inline: false,
      }]);

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating heatmap:', error);
      await interaction.editReply({
        content: '❌ Failed to fetch market heatmap data. Please try again later.',
      });
    }
  },
};
