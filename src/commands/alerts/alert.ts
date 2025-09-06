import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('alert')
    .setDescription('Create a price alert for a cryptocurrency or stock')
    .addStringOption(option =>
      option.setName('symbol')
        .setDescription('The symbol to set alert for (e.g., BTC, AAPL)')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('condition')
        .setDescription('Alert condition')
        .setRequired(true)
        .addChoices(
          { name: 'Above (≥)', value: 'above' },
          { name: 'Below (≤)', value: 'below' }
        )
    )
    .addNumberOption(option =>
      option.setName('price')
        .setDescription('Target price for the alert')
        .setRequired(true)
        .setMinValue(0.000001)
    ),

  async execute(interaction: any) {
    const symbol = interaction.options.getString('symbol').toUpperCase();
    const condition = interaction.options.getString('condition');
    const targetPrice = interaction.options.getNumber('price');

    await interaction.deferReply();

    try {
      // Verify the symbol exists
      let currentPrice;
      try {
        const cryptoData = await interaction.client.marketData.getCryptoPrice(symbol);
        currentPrice = cryptoData.price;
      } catch {
        try {
          const stockData = await interaction.client.marketData.getStockPrice(symbol);
          currentPrice = stockData.price;
        } catch {
          return await interaction.editReply({
            content: `❌ Could not find data for **${symbol}**. Please check the symbol and try again.`,
          });
        }
      }

      // Create the alert
      const alert = await interaction.client.alerts.createAlert(
        interaction.user.id,
        symbol,
        condition,
        targetPrice
      );

      const conditionText = condition === 'above' ? '≥' : '≤';
      const statusEmoji = condition === 'above' ? '🚀' : '📉';

      const embed = new EmbedBuilder()
        .setTitle('✅ Price Alert Created!')
        .setDescription(`Your alert has been successfully set up.`)
        .addFields([
          {
            name: '🎯 Symbol',
            value: symbol,
            inline: true,
          },
          {
            name: '⚡ Condition',
            value: `${conditionText} $${targetPrice.toFixed(2)}`,
            inline: true,
          },
          {
            name: '💰 Current Price',
            value: `$${currentPrice.toFixed(2)}`,
            inline: true,
          },
          {
            name: `${statusEmoji} Status`,
            value: 'Active',
            inline: true,
          },
          {
            name: '🆔 Alert ID',
            value: alert.id.slice(-8),
            inline: true,
          },
          {
            name: '📅 Created',
            value: new Date().toLocaleDateString(),
            inline: true,
          },
        ])
        .setColor(0x00ff00)
        .setFooter({
          text: 'You will be notified via DM when this alert triggers • MarketPulse Pro',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error creating alert:', error);
      await interaction.editReply({
        content: '❌ Failed to create alert. Please try again later.',
      });
    }
  },
};
