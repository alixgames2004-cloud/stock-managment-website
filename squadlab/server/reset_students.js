const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('student123', 10);
  const emails = [
    'ali.meziane@lab1.dz',
    'sara.abed@lab1.dz',
    'karim.benaissa@lab1.dz',
    'nour.chaib@lab1.dz',
    'yacine.laid@lab3.dz',
    'amina.toumi@lab3.dz',
  ];
  for (const email of emails) {
    await p.user.update({ where: { email }, data: { passwordHash: hash, isApproved: true } });
    console.log('Reset:', email);
  }
}

main().finally(() => p.$disconnect());
