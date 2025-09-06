import { PrismaClient } from '@prisma/client';
import { MarketDataService } from './market-data-service';

export class PortfolioService {
  private prisma: PrismaClient;
  private marketDataService: MarketDataService;

  constructor(prisma: PrismaClient, marketDataService: MarketDataService) {
    this.prisma = prisma;
    this.marketDataService = marketDataService;
  }

  async addHolding(
    discordId: string,
    symbol: string,
    quantity: number,
    avgBuyPrice?: number
  ): Promise<any> {
    try {
      // Ensure user exists
      await this.ensureUserExists(discordId);

      const holding = await this.prisma.portfolio.upsert({
        where: {
          userId_symbol: {
            userId: await this.getUserId(discordId),
            symbol: symbol.toUpperCase(),
          },
        },
        update: {
          quantity,
          avgBuyPrice,
        },
        create: {
          user: {
            connect: {
              discordId,
            },
          },
          symbol: symbol.toUpperCase(),
          quantity,
          avgBuyPrice,
        },
      });

      return holding;
    } catch (error) {
      console.error('Error adding holding:', error);
      throw new Error('Failed to add holding');
    }
  }

  async removeHolding(discordId: string, symbol: string): Promise<boolean> {
    try {
      const result = await this.prisma.portfolio.deleteMany({
        where: {
          symbol: symbol.toUpperCase(),
          user: {
            discordId,
          },
        },
      });

      return result.count > 0;
    } catch (error) {
      console.error('Error removing holding:', error);
      return false;
    }
  }

  async getUserPortfolio(discordId: string): Promise<any[]> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { discordId },
        include: {
          portfolios: {
            orderBy: { updatedAt: 'desc' },
          },
        },
      });

      if (!user?.portfolios) {
        return [];
      }

      // Enrich with current market data
      const enrichedPortfolio = await Promise.all(
        user.portfolios.map(async (holding: any) => {
          try {
            let marketData;
            
            // Try crypto first, then stocks
            try {
              marketData = await this.marketDataService.getCryptoPrice(holding.symbol);
            } catch {
              try {
                marketData = await this.marketDataService.getStockPrice(holding.symbol);
              } catch {
                marketData = null;
              }
            }

            const currentValue = marketData ? holding.quantity * marketData.price : 0;
            const investedValue = holding.avgBuyPrice ? holding.quantity * holding.avgBuyPrice : 0;
            const pnl = currentValue - investedValue;
            const pnlPercent = investedValue > 0 ? (pnl / investedValue) * 100 : 0;

            return {
              ...holding,
              currentPrice: marketData?.price || 0,
              currentValue,
              investedValue,
              pnl,
              pnlPercent,
              marketData,
            };
          } catch (error) {
            console.error(`Error enriching holding ${holding.symbol}:`, error);
            return {
              ...holding,
              currentPrice: 0,
              currentValue: 0,
              investedValue: 0,
              pnl: 0,
              pnlPercent: 0,
              marketData: null,
            };
          }
        })
      );

      return enrichedPortfolio;
    } catch (error) {
      console.error('Error fetching user portfolio:', error);
      return [];
    }
  }

  async getPortfolioSummary(discordId: string): Promise<any> {
    try {
      const portfolio = await this.getUserPortfolio(discordId);

      const summary = portfolio.reduce(
        (acc, holding) => {
          acc.totalValue += holding.currentValue;
          acc.totalInvested += holding.investedValue;
          acc.totalPnl += holding.pnl;

          if (holding.pnl > 0) {
            acc.gainers++;
          } else if (holding.pnl < 0) {
            acc.losers++;
          }

          return acc;
        },
        {
          totalValue: 0,
          totalInvested: 0,
          totalPnl: 0,
          totalPnlPercent: 0,
          gainers: 0,
          losers: 0,
          totalHoldings: portfolio.length,
        }
      );

      summary.totalPnlPercent = summary.totalInvested > 0 
        ? (summary.totalPnl / summary.totalInvested) * 100 
        : 0;

      return summary;
    } catch (error) {
      console.error('Error calculating portfolio summary:', error);
      return {
        totalValue: 0,
        totalInvested: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        gainers: 0,
        losers: 0,
        totalHoldings: 0,
      };
    }
  }

  async getTopPerformers(discordId: string, limit: number = 5): Promise<any[]> {
    try {
      const portfolio = await this.getUserPortfolio(discordId);
      
      return portfolio
        .filter(holding => holding.marketData && holding.pnlPercent !== 0)
        .sort((a, b) => b.pnlPercent - a.pnlPercent)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching top performers:', error);
      return [];
    }
  }

  async getWorstPerformers(discordId: string, limit: number = 5): Promise<any[]> {
    try {
      const portfolio = await this.getUserPortfolio(discordId);
      
      return portfolio
        .filter(holding => holding.marketData && holding.pnlPercent !== 0)
        .sort((a, b) => a.pnlPercent - b.pnlPercent)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching worst performers:', error);
      return [];
    }
  }

  private async ensureUserExists(discordId: string): Promise<void> {
    try {
      await this.prisma.user.upsert({
        where: { discordId },
        update: {},
        create: {
          discordId,
          username: 'Unknown User',
        },
      });
    } catch (error) {
      console.error('Error ensuring user exists:', error);
    }
  }

  private async getUserId(discordId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { discordId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.id;
  }
}
