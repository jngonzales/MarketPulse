import { PrismaClient } from '@prisma/client';
import { Client, EmbedBuilder, User } from 'discord.js';

export class AlertService {
  private prisma: PrismaClient;
  private client: Client;

  constructor(prisma: PrismaClient, client: Client) {
    this.prisma = prisma;
    this.client = client;
  }

  async createAlert(
    discordId: string,
    symbol: string,
    condition: 'above' | 'below',
    targetPrice: number
  ): Promise<any> {
    try {
      // Ensure user exists
      await this.ensureUserExists(discordId);

      const alert = await this.prisma.alert.create({
        data: {
          user: {
            connect: {
              discordId: discordId
            }
          },
          symbol: symbol.toUpperCase(),
          condition,
          targetPrice,
        },
      });

      return alert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw new Error('Failed to create alert');
    }
  }

  async getUserAlerts(discordId: string): Promise<any[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { discordId },
        include: {
          alerts: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return user?.alerts || [];
    } catch (error) {
      console.error('Error fetching user alerts:', error);
      return [];
    }
  }

  async removeAlert(discordId: string, alertId: string): Promise<boolean> {
    try {
      const result = await this.prisma.alert.deleteMany({
        where: {
          id: alertId,
          user: {
            discordId,
          },
        },
      });

      return result.count > 0;
    } catch (error) {
      console.error('Error removing alert:', error);
      return false;
    }
  }

  async checkPriceAlerts(symbol: string, currentPrice: number): Promise<void> {
    try {
      const alerts = await this.prisma.alert.findMany({
        where: {
          symbol: symbol.toUpperCase(),
          isActive: true,
          triggered: false,
        },
        include: {
          user: true,
        },
      });

      for (const alert of alerts) {
        let shouldTrigger = false;

        if (alert.condition === 'above' && currentPrice >= alert.targetPrice) {
          shouldTrigger = true;
        } else if (alert.condition === 'below' && currentPrice <= alert.targetPrice) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          await this.triggerAlert(alert, currentPrice);
        }
      }
    } catch (error) {
      console.error('Error checking price alerts:', error);
    }
  }

  private async triggerAlert(alert: any, currentPrice: number): Promise<void> {
    try {
      // Mark alert as triggered
      await this.prisma.alert.update({
        where: { id: alert.id },
        data: { triggered: true },
      });

      // Send notification to user
      const user = await this.client.users.fetch(alert.user.discordId);
      if (user) {
        const embed = new EmbedBuilder()
          .setTitle('🚨 Price Alert Triggered!')
          .setDescription(`Your alert for **${alert.symbol}** has been triggered!`)
          .addFields([
            {
              name: 'Symbol',
              value: alert.symbol,
              inline: true,
            },
            {
              name: 'Condition',
              value: `${alert.condition} $${alert.targetPrice.toFixed(2)}`,
              inline: true,
            },
            {
              name: 'Current Price',
              value: `$${currentPrice.toFixed(2)}`,
              inline: true,
            },
          ])
          .setColor(alert.condition === 'above' ? 0x00ff00 : 0xff0000)
          .setTimestamp();

        await user.send({ embeds: [embed] });
        console.log(`✅ Alert triggered for ${alert.user.username}: ${alert.symbol} ${alert.condition} $${alert.targetPrice}`);
      }
    } catch (error) {
      console.error('Error triggering alert:', error);
    }
  }

  private async ensureUserExists(discordId: string): Promise<void> {
    try {
      const user = await this.client.users.fetch(discordId);
      
      await this.prisma.user.upsert({
        where: { discordId },
        update: {
          username: user.username,
        },
        create: {
          discordId,
          username: user.username,
        },
      });
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }

  async getActiveAlertsCount(): Promise<number> {
    try {
      return await this.prisma.alert.count({
        where: {
          isActive: true,
          triggered: false,
        },
      });
    } catch (error) {
      console.error('Error getting active alerts count:', error);
      return 0;
    }
  }

  async cleanupTriggeredAlerts(): Promise<void> {
    try {
      // Remove triggered alerts older than 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      await this.prisma.alert.deleteMany({
        where: {
          triggered: true,
          updatedAt: {
            lt: weekAgo,
          },
        },
      });

      console.log('✅ Cleaned up old triggered alerts');
    } catch (error) {
      console.error('Error cleaning up triggered alerts:', error);
    }
  }
}
