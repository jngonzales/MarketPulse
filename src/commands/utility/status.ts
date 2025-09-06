import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check bot status and connection health'),

  async execute(interaction: any) {
    await interaction.deferReply();

    try {
      // Check WebSocket status
      const wsStatus = interaction.client.websocket.getConnectionStatus();
      
      // Check database connection
      let dbStatus = false;
      try {
        await interaction.client.prisma.$queryRaw`SELECT 1`;
        dbStatus = true;
      } catch {
        dbStatus = false;
      }

      // Get active alerts count
      const activeAlerts = await interaction.client.alerts.getActiveAlertsCount();

      // Get tracked symbols
      const trackedSymbols = interaction.client.websocket.getTrackedSymbols();

      const embed = new EmbedBuilder()
        .setTitle('⚡ MarketPulse Pro Status')
        .setDescription('System health and connection status')
        .addFields([
          {
            name: '🌐 WebSocket Connection',
            value: wsStatus ? '✅ Connected (Live Data)' : '❌ Disconnected',
            inline: true,
          },
          {
            name: '🗄️ Database',
            value: dbStatus ? '✅ Connected' : '❌ Disconnected',
            inline: true,
          },
          {
            name: '🚨 Active Alerts',
            value: activeAlerts.toString(),
            inline: true,
          },
          {
            name: '📊 Tracked Symbols',
            value: `${trackedSymbols.length} symbols\n${trackedSymbols.slice(0, 5).join(', ')}${trackedSymbols.length > 5 ? '...' : ''}`,
            inline: false,
          },
          {
            name: '🔧 Bot Information',
            value: `**Version:** 1.0.0\n**Uptime:** ${Math.floor(process.uptime() / 60)} minutes\n**Memory:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
            inline: false,
          },
        ])
        .setColor(wsStatus && dbStatus ? 0x00ff00 : 0xff6b6b)
        .setFooter({
          text: 'MarketPulse Pro • Professional Trading Analytics',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error checking status:', error);
      await interaction.editReply({
        content: '❌ Failed to check system status.',
      });
    }
  },
};
