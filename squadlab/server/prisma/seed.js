const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // 1. Create Labs
  const lab1 = await prisma.lab.upsert({
    where: { nom: 'LAB1' },
    update: {},
    create: {
      nom: 'LAB1',
      description: 'Laboratoire 1',
    },
  });

  const lab3 = await prisma.lab.upsert({
    where: { nom: 'LAB3' },
    update: {},
    create: {
      nom: 'LAB3',
      description: 'Laboratoire 3',
    },
  });

  console.log('Labs created/verified.');

  // 2. Create LAB_ADMINs
  const passwordHash = await bcrypt.hash('admin123', 10);

  const adminLab1 = await prisma.user.upsert({
    where: { email: 'admin@lab1.dz' },
    update: {},
    create: {
      nom: 'Admin',
      prenom: 'Lab1',
      email: 'admin@lab1.dz',
      passwordHash: passwordHash,
      role: 'LAB_ADMIN',
      isApproved: true,
      labId: lab1.id,
    },
  });

  const adminLab3 = await prisma.user.upsert({
    where: { email: 'admin@lab3.dz' },
    update: {},
    create: {
      nom: 'Admin',
      prenom: 'Lab3',
      email: 'admin@lab3.dz',
      passwordHash: passwordHash,
      role: 'LAB_ADMIN',
      isApproved: true,
      labId: lab3.id,
    },
  });

  console.log('Admins created/verified.');

  // 3. Supervisors
  const supervisorHash = await bcrypt.hash('super123', 10);
  const supervisors = [
    { email: 'hamid.berber@lab1.dz', nom: 'Berber', prenom: 'Hamid', labId: lab1.id },
    { email: 'leila.kaci@lab1.dz',   nom: 'Kaci',   prenom: 'Leila', labId: lab1.id },
    { email: 'omar.saad@lab3.dz',    nom: 'Saad',   prenom: 'Omar',  labId: lab3.id },
  ];
  for (const s of supervisors) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, passwordHash: supervisorHash, role: 'SUPERVISOR', isApproved: true },
    });
  }

  // 4. Students
  const studentHash = await bcrypt.hash('student123', 10);
  const studentsData = [
    { email: 'ali.meziane@lab1.dz',    nom: 'Meziane',  prenom: 'Ali',     annee: '3ème', specialite: 'Informatique', labId: lab1.id },
    { email: 'sara.abed@lab1.dz',      nom: 'Abed',     prenom: 'Sara',    annee: '3ème', specialite: 'Electronique', labId: lab1.id },
    { email: 'karim.benaissa@lab1.dz', nom: 'Benaissa', prenom: 'Karim',   annee: '2ème', specialite: 'Automatique', labId: lab1.id },
    { email: 'nour.chaib@lab1.dz',     nom: 'Chaib',    prenom: 'Nour',    annee: '2ème', specialite: 'Informatique', labId: lab1.id },
    { email: 'yacine.laid@lab3.dz',    nom: 'Laid',     prenom: 'Yacine',  annee: '3ème', specialite: 'Robotique',    labId: lab3.id },
    { email: 'amina.toumi@lab3.dz',    nom: 'Toumi',    prenom: 'Amina',   annee: '2ème', specialite: 'Electronique', labId: lab3.id },
  ];
  for (const s of studentsData) {
    await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, passwordHash: studentHash, role: 'STUDENT', isApproved: true },
    });
  }

  console.log('Users (supervisors + students) created/verified.');

  // 3. Sample Components
  const componentsLab1 = [
    { numero: 1, nom: "HC-06 Bluetooth Module", codeFournisseur: "DZD000548", prix: 450.00, type: "Module", armoire: "LAB01-A_A", casier: 3, qtyStock: 10, qtyDisponible: 10 },
    { numero: 2, nom: "Arduino Uno R3", codeFournisseur: "ARD-001", prix: 1500.00, type: "Microcontrôleur", armoire: "LAB01-A_B", casier: 1, qtyStock: 15, qtyDisponible: 15 },
    { numero: 3, nom: "ESP32 Development Board", codeFournisseur: "ESP-32", prix: 850.00, type: "Microcontrôleur", armoire: "LAB01-A_B", casier: 2, qtyStock: 20, qtyDisponible: 20 },
    { numero: 4, nom: "Capteur Ultrason HC-SR04", codeFournisseur: "SEN-004", prix: 200.00, type: "Capteur", armoire: "LAB01-A_C", casier: 5, qtyStock: 30, qtyDisponible: 30 },
    { numero: 5, nom: "Moteur Pas à Pas NEMA 17", codeFournisseur: "MOT-017", prix: 1200.00, type: "Actionneur", armoire: "LAB01-A_D", casier: 1, qtyStock: 8, qtyDisponible: 8 },
  ];

  const componentsLab3 = [
    { numero: 1, nom: "Raspberry Pi 4 Model B (4GB)", codeFournisseur: "RPI-4B-4", prix: 8500.00, type: "SBC", armoire: "LAB03-A_A", casier: 1, qtyStock: 5, qtyDisponible: 5 },
    { numero: 2, nom: "Caméra Module V2", codeFournisseur: "CAM-002", prix: 3500.00, type: "Module", armoire: "LAB03-A_B", casier: 2, qtyStock: 8, qtyDisponible: 8 },
    { capteur: "Lidar RPLIDAR A1M8", numero: 3, nom: "Lidar RPLIDAR A1M8", codeFournisseur: "LID-A1", prix: 15000.00, type: "Capteur", armoire: "LAB03-A_C", casier: 1, qtyStock: 2, qtyDisponible: 2 },
    { numero: 4, nom: "Batterie LiPo 3S 2200mAh", codeFournisseur: "BAT-3S", prix: 2500.00, type: "Alimentation", armoire: "LAB03-A_D", casier: 3, qtyStock: 12, qtyDisponible: 12 },
    { numero: 5, nom: "Carte de Commande L298N", codeFournisseur: "MOD-L298", prix: 350.00, type: "Module", armoire: "LAB03-A_E", casier: 4, qtyStock: 25, qtyDisponible: 25 },
  ];

  for (const comp of componentsLab1) {
    const { capteur, ...data } = comp; // In case I accidentally left properties
    await prisma.component.upsert({
      where: {
        numero_labId: {
          numero: comp.numero,
          labId: lab1.id
        }
      },
      update: {},
      create: {
        ...data,
        labId: lab1.id,
      }
    });
  }

  for (const comp of componentsLab3) {
    const { capteur, ...data } = comp;
    await prisma.component.upsert({
      where: {
        numero_labId: {
          numero: comp.numero,
          labId: lab3.id
        }
      },
      update: {},
      create: {
        ...data,
        labId: lab3.id,
      }
    });
  }

  console.log('Components created/verified.');
  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
