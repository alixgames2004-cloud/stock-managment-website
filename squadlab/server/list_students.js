const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.user.findMany({
  where: { role: 'STUDENT' },
  select: { email: true, nom: true, prenom: true, isApproved: true, lab: { select: { nom: true } } }
}).then(u => console.log(JSON.stringify(u, null, 2))).finally(() => p.$disconnect());
