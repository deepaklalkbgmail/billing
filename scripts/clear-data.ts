// Deletes ALL data except Users (and Branches, which users reference).
// Usage: npm run db:clear         (asks nothing, makes a backup first)
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const KEEP = new Set(['User', 'Branch']);
const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL || 'file:./data/restopos.db';
  const rel = url.replace(/^file:/, '');
  const dbFile = path.resolve('prisma', rel);
  if (fs.existsSync(dbFile)) {
    const bak = dbFile.replace(/\.db$/, `.backup-${Date.now()}.db`);
    fs.copyFileSync(dbFile, bak);
    console.log('Backup saved:', bak);
  }
  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_%' ESCAPE '\\'`
  );
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = OFF');
  for (const { name } of tables) {
    if (KEEP.has(name)) continue;
    await prisma.$executeRawUnsafe(`DELETE FROM "${name}"`);
    console.log('Cleared', name);
  }
  await prisma.$executeRawUnsafe('PRAGMA foreign_keys = ON');
  const users = await prisma.user.findMany({ select: { username: true, role: true } });
  console.log('Kept users:', users);
}
main().finally(() => prisma.$disconnect());
