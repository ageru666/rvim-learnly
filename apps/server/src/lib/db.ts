import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env.js';
import { PrismaClient, type Prisma } from '../generated/prisma/client.js';

export const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});

export type Tx = Prisma.TransactionClient;
