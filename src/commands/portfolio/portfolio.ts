import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('portfolio')
    .setDescription('Manage your portfolio')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a holding to your portfolio')
        .addStringOption(option =>
          option.setName('symbol')
            .setDescription('Asset symbol (e.g., BTC, AAPL)')
            .setRequired(true)
        )
        .addNumberOption(option =>
          option.setName('quantity')
            .setDescription('Quantity owned')
            .setRequired(true)
            .setMinValue(0.000001)
        )
        .addNumberOption(option =>
          option.setName('buy_price')
            .setDescription('Average buy price (optional)')
            .setRequired(false)
            .setMinValue(0.000001)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a holding from your portfolio')
        .addStringOption(option =>
          option.setName('symbol')
            .setDescription('Asset symbol to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View your portfolio')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('summary')
        .setDescription('View portfolio summary and performance')
    ),

  async execute(interaction: any) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'add':
        await this.handleAdd(interaction);
        break;
      case 'remove':
        await this.handleRemove(interaction);
        break;
      case 'view':
        await this.handleView(interaction);
        break;
      case 'summary':
        await this.handleSummary(interaction);
        break;
    }
  },

  async handleAdd(interaction: any) {
    const symbol = interaction.options.getString('symbol').toUpperCase();
    const quantity = interaction.options.getNumber('quantity');
    const buyPrice = interaction.options.getNumber('buy_price');

    await interaction.deferReply();

    try {
      // Verify the symbol exists
      try {
        await interaction.client.marketData.getCryptoPrice(symbol);
      } catch {
        try {
          await interaction.client.marketData.getStockPrice(symbol);
        } catch {
          return await interaction.editReply({
            content: `❌ Could not find data for **${symbol}**. Please check the symbol and try again.`,
          });
        }
      }

      await interaction.client.portfolio.addHolding(
        interaction.user.id,
        symbol,
        quantity,
        buyPrice
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Portfolio Updated')
        .setDescription('Your holding has been added to your portfolio.')
        .addFields([
          {
            name: '🎯 Symbol',
            value: symbol,
            inline: true,
          },
          {
            name: '📊 Quantity',
            value: quantity.toString(),
            inline: true,
          },
          {
            name: '💰 Buy Price',
            value: buyPrice ? `$${buyPrice.toFixed(2)}` : 'Not specified',
            inline: true,
          },
        ])
        .setColor(0x00ff00)
        .setFooter({
          text: 'Use /portfolio view to see your complete portfolio • MarketPulse Pro',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error adding to portfolio:', error);
      await interaction.editReply({
        content: '❌ Failed to add holding to portfolio. Please try again later.',
      });
    }
  },

  async handleRemove(interaction: any) {
    const symbol = interaction.options.getString('symbol').toUpperCase();

    await interaction.deferReply();

    try {
      const success = await interaction.client.portfolio.removeHolding(interaction.user.id, symbol);

      if (success) {
        const embed = new EmbedBuilder()
          .setTitle('✅ Holding Removed')
          .setDescription(`**${symbol}** has been removed from your portfolio.`)
          .setColor(0xff6b6b)
          .setFooter({
            text: 'MarketPulse Pro',
          })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({
          content: `❌ Could not find **${symbol}** in your portfolio.`,
        });
      }

    } catch (error) {
      console.error('Error removing from portfolio:', error);
      await interaction.editReply({
        content: '❌ Failed to remove holding from portfolio. Please try again later.',
      });
    }
  },

  async handleView(interaction: any) {
    await interaction.deferReply();

    try {
      const portfolio = await interaction.client.portfolio.getUserPortfolio(interaction.user.id);

      if (portfolio.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('📊 Your Portfolio')
          .setDescription('Your portfolio is empty.\n\nUse `/portfolio add` to add your first holding!')
          .setColor(0x0099ff)
          .setFooter({
            text: 'MarketPulse Pro',
          });

        return await interaction.editReply({ embeds: [embed] });
      }

      const embed = new EmbedBuilder()
        .setTitle('📊 Your Portfolio')
        .setDescription(`You have **${portfolio.length}** holding${portfolio.length > 1 ? 's' : ''}`)
        .setColor(0x0099ff)
        .setFooter({
          text: 'Use /portfolio summary for detailed performance • MarketPulse Pro',
        })
        .setTimestamp();

      for (const holding of portfolio.slice(0, 10)) {
        const pnlEmoji = holding.pnl >= 0 ? '📈' : '📉';
        const pnlColor = holding.pnl >= 0 ? '+' : '';
        
        embed.addFields([{
          name: `${pnlEmoji} ${holding.symbol}`,
          value: `**Quantity:** ${holding.quantity}\n**Current Price:** $${holding.currentPrice.toFixed(2)}\n**Value:** $${holding.currentValue.toFixed(2)}\n**P&L:** ${pnlColor}$${holding.pnl.toFixed(2)} (${pnlColor}${holding.pnlPercent.toFixed(2)}%)`,
          inline: true,
        }]);
      }

      if (portfolio.length > 10) {
        embed.setDescription(`${embed.data.description}\n\n*Showing first 10 holdings*`);
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error viewing portfolio:', error);
      await interaction.editReply({
        content: '❌ Failed to fetch your portfolio. Please try again later.',
      });
    }
  },

  async handleSummary(interaction: any) {
    await interaction.deferReply();

    try {
      const summary = await interaction.client.portfolio.getPortfolioSummary(interaction.user.id);

      if (summary.totalHoldings === 0) {
        return await interaction.editReply({
          content: '📊 Your portfolio is empty. Use `/portfolio add` to get started!',
        });
      }

      const pnlEmoji = summary.totalPnl >= 0 ? '📈' : '📉';
      const pnlColor = summary.totalPnl >= 0 ? 0x00ff00 : 0xff0000;
      const pnlPrefix = summary.totalPnl >= 0 ? '+' : '';

      const embed = new EmbedBuilder()
        .setTitle('📊 Portfolio Summary')
        .setDescription('Your portfolio performance overview')
        .addFields([
          {
            name: '💰 Total Value',
            value: `$${summary.totalValue.toFixed(2)}`,
            inline: true,
          },
          {
            name: '💵 Total Invested',
            value: `$${summary.totalInvested.toFixed(2)}`,
            inline: true,
          },
          {
            name: `${pnlEmoji} Total P&L`,
            value: `${pnlPrefix}$${summary.totalPnl.toFixed(2)} (${pnlPrefix}${summary.totalPnlPercent.toFixed(2)}%)`,
            inline: true,
          },
          {
            name: '📈 Gainers',
            value: summary.gainers.toString(),
            inline: true,
          },
          {
            name: '📉 Losers',
            value: summary.losers.toString(),
            inline: true,
          },
          {
            name: '🎯 Total Holdings',
            value: summary.totalHoldings.toString(),
            inline: true,
          },
        ])
        .setColor(pnlColor)
        .setFooter({
          text: 'Real-time market data • MarketPulse Pro',
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error generating portfolio summary:', error);
      await interaction.editReply({
        content: '❌ Failed to generate portfolio summary. Please try again later.',
      });
    }
  },
};
