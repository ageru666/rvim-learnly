import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { UPLOADS_PATH } from '../../src/config/env.js';
import { db } from '../../src/lib/db.js';
import { seedActivity } from './activity.js';
import { seedCatalog } from './catalog.js';
import { DEMO_PASSWORD, seedUsers } from './users.js';

async function truncateAll(): Promise<void> {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(({ tablename }) => `"public"."${tablename}"`).join(', ');
  if (list) await db.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

async function main(): Promise<void> {
  await truncateAll();
  await rm(join(UPLOADS_PATH, 'covers'), { recursive: true, force: true });

  const users = await seedUsers(db);
  const courses = await seedCatalog(db, users.authors);
  const activity = await seedActivity(db, courses, users);

  console.log(
    `Seeded ${users.students.length + 4} users, ${courses.length} courses, ` +
      `${activity.enrollments} enrollments, ${activity.reviews} reviews. Password: ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
