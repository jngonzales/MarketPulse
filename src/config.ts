import { config as loadEnv } from 'dotenv';
import { z, ZodIssue } from 'zod';

loadEnv();

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1, 'BOT_TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  GUILD_ID: z.string().optional(),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('3000')
    .transform((v: string) => parseInt(v || '3000', 10)),
  BINANCE_API_KEY: z.string().optional(),
  BINANCE_SECRET_KEY: z.string().optional(),
  FINNHUB_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  COINGECKO_API_KEYS: z.string().optional(),
  REDIS_URL: z.string().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i: ZodIssue) => `${i.path.join('.')}: ${i.message}`)
    .join(', ');
  console.error(`❌ Invalid environment variables: ${issues}`);
}

export const appConfig = {
  BOT_TOKEN: process.env.BOT_TOKEN!,
  CLIENT_ID: process.env.CLIENT_ID!,
  GUILD_ID: process.env.GUILD_ID,
  DATABASE_URL: process.env.DATABASE_URL!,
  NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
  PORT: parseInt(process.env.PORT || '3000', 10),
  BINANCE_API_KEY: process.env.BINANCE_API_KEY,
  BINANCE_SECRET_KEY: process.env.BINANCE_SECRET_KEY,
  FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
  COINGECKO_API_KEYS: process.env.COINGECKO_API_KEYS,
  REDIS_URL: process.env.REDIS_URL,
};

export default appConfig;
