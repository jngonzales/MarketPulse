import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('removealert')
    .setDescription('Remove a price alert')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('The alert ID to remove (last 8 characters)')
        .setRequired(true)
    ),

  async execute(interaction: any) {
    const alertId = interaction.options.getString('id');

    await interaction.deferReply();

    try {
      // Get user's alerts to find the full ID
      const alerts = await interaction.client.alerts.getUserAlerts(interaction.user.id);
      const matchingAlert = alerts.find((alert: any) => alert.id.endsWith(alertId));

      if (!matchingAlert) {
        return await interaction.editReply({
          content: `❌ Could not find an alert with ID ending in **${alertId}**.\n\nUse \`/alerts\` to view your active alerts.`,
        });
      }

      // Remove the alert
      const success = await interaction.client.alerts.removeAlert(interaction.user.id, matchingAlert.id);

      if (success) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Alert Removed')
          .setDescription('Your price alert has been successfully removed.')
          .addFields([
            {
              name: '🎯 Symbol',
              value: matchingAlert.symbol,
              inline: true,
            },
            {
              name: '⚡ Condition',
              value: `${matchingAlert.condition === 'above' ? '≥' : '≤'} $${matchingAlert.targetPrice.toFixed(2)}`,
              inline: true,
            },
            {
              name: '🆔 Alert ID',
              value: matchingAlert.id.slice(-8),
              inline: true,
            },
          ])
          .setColor(0xff6b6b)
          .setFooter({
            text: 'MarketPulse Pro',
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({
          content: '❌ Failed to remove the alert. Please try again later.',
        });
      }

    } catch (error) {
      console.error('Error removing alert:', error);
      await interaction.editReply({
        content: '❌ An error occurred while removing the alert. Please try again later.',
      });
    }
  },
};
