import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('alerts')
    .setDescription('View your active price alerts'),

  async execute(interaction: any) {
    await interaction.deferReply();

    try {
      const alerts = await interaction.client.alerts.getUserAlerts(interaction.user.id);

      if (alerts.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📊 Your Price Alerts')
          .setDescription('You don\'t have any active alerts yet.\n\nUse `/alert` to create your first price alert!')
          .setColor(0x0099ff)
          .setFooter({
            text: 'MarketPulse Pro',
          });

        return await interaction.editReply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Your Active Price Alerts')
        .setDescription(`You have **${alerts.length}** active alert${alerts.length > 1 ? 's' : ''}`)
        .setColor(0x00ff00)
        .setFooter({
          text: `Use /removealert <id> to delete an alert • MarketPulse Pro`,
        })
        .setTimestamp();

      // Add fields for each alert
      for (const alert of alerts.slice(0, 10)) { // Limit to 10 alerts to avoid embed limits
        const conditionEmoji = alert.condition === 'above' ? '🚀' : '📉';
        const conditionText = alert.condition === 'above' ? '≥' : '≤';
        
        embed.addFields([{
          name: `${conditionEmoji} ${alert.symbol}`,
          value: `**Condition:** ${conditionText} $${alert.targetPrice.toFixed(2)}\n**ID:** \`${alert.id.slice(-8)}\`\n**Created:** ${new Date(alert.createdAt).toLocaleDateString()}`,
          inline: true,
        }]);
      }

      if (alerts.length > 10) {
        embed.setDescription(`${embed.data.description}\n\n*Showing first 10 alerts*`);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error fetching alerts:', error);
      await interaction.editReply({
        content: '❌ Failed to fetch your alerts. Please try again later.',
      });
    }
  },
};
