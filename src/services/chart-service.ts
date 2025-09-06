import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { MarketDataService } from './market-data-service';
import * as technicalindicators from 'technicalindicators';

export class ChartService {
  private chartJSNodeCanvas: ChartJSNodeCanvas;
  private marketDataService: MarketDataService;

  constructor(marketDataService: MarketDataService) {
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white',
    });
    this.marketDataService = marketDataService;
  }

  async generatePriceChart(
    symbol: string,
    timeframe: string = '7d',
    indicators: string[] = []
  ): Promise<Buffer> {
    try {
      const days = this.parseTimeframe(timeframe);
      const historicalData = await this.marketDataService.getHistoricalData(symbol, days);

      if (historicalData.length === 0) {
        throw new Error('No historical data available');
      }

      const labels = historicalData.map(data => 
        new Date(data.timestamp).toLocaleDateString()
      );
      const prices = historicalData.map(data => data.price);

      const datasets = [
        {
          label: `${symbol} Price`,
          data: prices,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: false,
          tension: 0.1,
        },
      ];

      // Add technical indicators
      for (const indicator of indicators) {
        const indicatorData = await this.calculateIndicator(indicator, prices);
        if (indicatorData) {
          datasets.push(indicatorData);
        }
      }

      const configuration = {
        type: 'line' as const,
        data: {
          labels,
          datasets,
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: `${symbol} Price Chart (${timeframe})`,
              font: {
                size: 16,
              },
            },
            legend: {
              display: true,
              position: 'top' as const,
            },
          },
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: 'Price (USD)',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Date',
              },
            },
          },
        },
      };

      return await this.chartJSNodeCanvas.renderToBuffer(configuration);
    } catch (error) {
      console.error('Error generating price chart:', error);
      throw new Error('Failed to generate chart');
    }
  }

  async generateComparisonChart(symbols: string[], timeframe: string = '7d'): Promise<Buffer> {
    try {
      const days = this.parseTimeframe(timeframe);
      const datasets = [];

      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        const historicalData = await this.marketDataService.getHistoricalData(symbol, days);
        
        if (historicalData.length > 0) {
          const prices = historicalData.map(data => data.price);
          const color = this.getChartColor(i);

          datasets.push({
            label: symbol,
            data: prices,
            borderColor: color.border,
            backgroundColor: color.background,
            fill: false,
            tension: 0.1,
          });
        }
      }

      if (datasets.length === 0) {
        throw new Error('No data available for comparison');
      }

      // Use the first symbol's timestamps as labels
      const firstSymbolData = await this.marketDataService.getHistoricalData(symbols[0], days);
      const labels = firstSymbolData.map(data => 
        new Date(data.timestamp).toLocaleDateString()
      );

      const configuration = {
        type: 'line' as const,
        data: {
          labels,
          datasets,
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: `Price Comparison: ${symbols.join(' vs ')} (${timeframe})`,
              font: {
                size: 16,
              },
            },
            legend: {
              display: true,
              position: 'top' as const,
            },
          },
          scales: {
            y: {
              beginAtZero: false,
              title: {
                display: true,
                text: 'Price (USD)',
              },
            },
            x: {
              title: {
                display: true,
                text: 'Date',
              },
            },
          },
        },
      };

      return await this.chartJSNodeCanvas.renderToBuffer(configuration);
    } catch (error) {
      console.error('Error generating comparison chart:', error);
      throw new Error('Failed to generate comparison chart');
    }
  }

  private async calculateIndicator(indicator: string, prices: number[]): Promise<any | null> {
    try {
      switch (indicator.toLowerCase()) {
        case 'sma':
          const sma = technicalindicators.sma({
            period: 20,
            values: prices,
          });
          return {
            label: 'SMA(20)',
            data: this.padArray(sma, prices.length),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: false,
          };

        case 'ema':
          const ema = technicalindicators.ema({
            period: 20,
            values: prices,
          });
          return {
            label: 'EMA(20)',
            data: this.padArray(ema, prices.length),
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            fill: false,
          };

        case 'rsi':
          const rsi = technicalindicators.rsi({
            period: 14,
            values: prices,
          });
          return {
            label: 'RSI(14)',
            data: this.padArray(rsi, prices.length),
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            fill: false,
            yAxisID: 'y1',
          };

        default:
          return null;
      }
    } catch (error) {
      console.error(`Error calculating ${indicator}:`, error);
      return null;
    }
  }

  private padArray(array: number[], targetLength: number): (number | null)[] {
    const padded: (number | null)[] = new Array(targetLength - array.length).fill(null);
    return padded.concat(array);
  }

  private parseTimeframe(timeframe: string): number {
    const timeframeMap: { [key: string]: number } = {
      '1h': 0.04,
      '4h': 0.17,
      '1d': 1,
      '3d': 3,
      '7d': 7,
      '30d': 30,
      '90d': 90,
    };

    return timeframeMap[timeframe] || 7;
  }

  private getChartColor(index: number): { border: string; background: string } {
    const colors = [
      { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
      { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
      { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
      { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
      { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
    ];

    return colors[index % colors.length];
  }
}
