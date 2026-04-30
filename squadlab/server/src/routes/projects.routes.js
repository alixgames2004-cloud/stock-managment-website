const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireApproved, requireRoles } = require('../middleware/auth.middleware');
const bcrypt = require('bcryptjs');

// ── Helper: generate FD-{YYYY}-L{labNum}-{NNN} ──────────────────────────────
async function generateNumeroFiche(labNom) {
  const year = new Date().getFullYear();
  const labNum = labNom === 'LAB1' ? '1' : '3';
  const prefix = `FD-${year}-L${labNum}-`;

  // Count existing sheets for this lab+year to get next sequential number
  const count = await prisma.dischargeSheet.count({
    where: { numeroFiche: { startsWith: prefix } },
  });

  const seq = String(count + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

// ── Helper: format project output ───────────────────────────────────────────
const formatProject = (p) => ({
  id: p.id,
  titre: p.titre,
  type: p.type,
  statut: p.statut,
  labId: p.labId,
  labNom: p.lab?.nom,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  encadrant: p.encadrant ? { id: p.encadrant.id, nom: p.encadrant.nom, prenom: p.encadrant.prenom } : null,
  chefGroupeNom: p.chefGroupeNom,
  membresNoms: (() => { try { return JSON.parse(p.membresNoms || '[]'); } catch { return []; } })(),
  dischargeSheets: p.dischargeSheets?.map(d => ({
    id: d.id,
    numeroFiche: d.numeroFiche,
    statut: d.statut,
    isRefresh: d.isRefresh,
    dateCreation: d.dateCreation,
    dateApprobation: d.dateApprobation,
    items: d.items?.map(i => ({
      id: i.id,
      componentId: i.componentId,
      componentNom: i.component?.nom,
      componentArmoire: i.component?.armoire,
      componentCasier: i.component?.casier,
      componentBanque: i.component?.banque,
      componentNumero: i.component?.numero,
      quantiteDemandee: i.quantiteDemandee,
      quantiteAccordee: i.quantiteAccordee,
      statutRetour: i.statutRetour,
    })) || [],
  })) || [],
});

const projectIncludes = {
  lab: true,
  encadrant: { select: { id: true, nom: true, prenom: true } },
  dischargeSheets: {
    include: {
      items: { include: { component: true } },
    },
    // Initial sheet (isRefresh=false) first, then refreshes in chronological order
    orderBy: [{ isRefresh: 'asc' }, { dateCreation: 'asc' }],
  },
};

// ── GET /api/projects/search — EN_COURS projects for refresh ─────────────────
router.get('/search', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ success: true, data: [] });

    const projects = await prisma.project.findMany({
      where: {
        labId: req.user.labId,
        statut: 'EN_COURS',
        OR: [
          { titre: { contains: q, mode: 'insensitive' } },
          { chefGroupeNom: { contains: q, mode: 'insensitive' } },
          { membresNoms: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        encadrant: { select: { id: true, nom: true, prenom: true } },
        dischargeSheets: {
          select: { id: true, numeroFiche: true, isRefresh: true, statut: true, dateCreation: true },
          orderBy: { dateCreation: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: projects.map(p => ({
        id: p.id, titre: p.titre, type: p.type, statut: p.statut,
        chefGroupeNom: p.chefGroupeNom,
        membresNoms: (() => { try { return JSON.parse(p.membresNoms || '[]'); } catch { return []; } })(),
        encadrant: p.encadrant,
        dischargeSheets: p.dischargeSheets,
      })),
    });
  } catch (error) {
    console.error('GET /projects/search error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ── POST /api/projects/:id/refresh — immediate stock deduction, no reservation ─
router.post('/:id/refresh', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const { composants } = req.body;
    if (!Array.isArray(composants) || composants.length === 0)
      return res.status(400).json({ success: false, error: 'La liste des composants est vide' });

    for (const c of composants) {
      if (!c.componentId || !Number.isInteger(c.quantiteDemandee) || c.quantiteDemandee < 1)
        return res.status(400).json({ success: false, error: 'Données composant invalides' });
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { dischargeSheets: { where: { isRefresh: false }, select: { numeroFiche: true } } },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Projet introuvable' });
    if (project.labId !== req.user.labId) return res.status(403).json({ success: false, error: 'Accès refusé' });
    if (project.statut !== 'EN_COURS')
      return res.status(409).json({ success: false, error: 'Seuls les projets EN_COURS peuvent faire un refresh' });

    const originalFiche = project.dischargeSheets[0]?.numeroFiche || `FD-${new Date().getFullYear()}-L1-000`;

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Check availability (NO reservation — pure stock check)
      const insuffisants = [];
      const componentData = [];
      for (const item of composants) {
        const comp = await tx.component.findUnique({
          where: { id: item.componentId },
          select: { id: true, nom: true, qtyStock: true, qtyReservee: true, labId: true },
        });
        if (!comp) throw new Error(`Composant ${item.componentId} introuvable`);
        if (comp.labId !== req.user.labId) throw new Error(`Composant hors lab`);
        const qtyDisponible = comp.qtyStock - comp.qtyReservee;
        if (qtyDisponible < item.quantiteDemandee)
          insuffisants.push({ componentId: comp.id, nom: comp.nom, qtyDisponible, quantiteDemandee: item.quantiteDemandee });
        componentData.push({ comp, quantiteDemandee: item.quantiteDemandee });
      }
      if (insuffisants.length > 0) {
        const err = new Error('INSUFFICIENT_STOCK'); err.insuffisants = insuffisants; throw err;
      }

      // Step 2: Generate refresh fiche number
      const refreshCount = await tx.dischargeSheet.count({ where: { projectId: project.id, isRefresh: true } });
      const numeroFiche = `${originalFiche}-R${refreshCount + 1}`;
      const now = new Date();

      // Step 3: Create DischargeSheet directly APPROUVE
      const sheet = await tx.dischargeSheet.create({
        data: {
          projectId: project.id, numeroFiche, statut: 'APPROUVE',
          isRefresh: true, dateCreation: now, dateApprobation: now, validePar: req.user.id,
        },
      });

      // Step 4: Create items + deduct stock immediately (NO reservee touch)
      for (const { comp, quantiteDemandee } of componentData) {
        await tx.dischargeItem.create({
          data: {
            dischargeSheetId: sheet.id, componentId: comp.id,
            quantiteDemandee, quantiteAccordee: quantiteDemandee, statutRetour: 'DANS_PROJET',
          },
        });
        await tx.component.update({
          where: { id: comp.id },
          data: { qtyStock: { decrement: quantiteDemandee }, qtyProjets: { increment: quantiteDemandee } },
        });
        await tx.stockMovement.create({
          data: {
            componentId: comp.id, projectId: project.id,
            typeMouvement: 'SORTIE', quantite: quantiteDemandee, effectuePar: req.user.id,
            notes: `Rafraîchissement — ${numeroFiche}`,
          },
        });
      }

      const fullSheet = await tx.dischargeSheet.findUnique({
        where: { id: sheet.id },
        include: { items: { include: { component: { select: { id: true, numero: true, nom: true, armoire: true, casier: true, banque: true } } } } },
      });
      return { dischargeSheet: fullSheet, project: { id: project.id, titre: project.titre, statut: project.statut } };
    });

    // Format sheet items for response
    const formattedSheet = {
      ...result.dischargeSheet,
      items: result.dischargeSheet.items.map(i => ({
        id: i.id, componentId: i.componentId,
        componentNumero: i.component?.numero, componentNom: i.component?.nom,
        componentArmoire: i.component?.armoire, componentCasier: i.component?.casier,
        componentBanque: i.component?.banque,
        quantiteDemandee: i.quantiteDemandee, quantiteAccordee: i.quantiteAccordee,
        statutRetour: i.statutRetour,
      })),
    };
    res.status(201).json({ success: true, data: { dischargeSheet: formattedSheet, project: result.project } });

  } catch (error) {
    if (error.message === 'INSUFFICIENT_STOCK')
      return res.status(409).json({ success: false, error: 'Stock insuffisant', insuffisants: error.insuffisants });
    console.error('POST /projects/:id/refresh error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors du refresh' });
  }
});

// ── GET /api/projects/:id/cumulative-components ───────────────────────────────
router.get('/:id/cumulative-components', authenticate, requireApproved, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        dischargeSheets: {
          include: {
            items: {
              include: { component: { select: { id: true, numero: true, nom: true, armoire: true, casier: true, banque: true } } },
            },
          },
          orderBy: { dateCreation: 'asc' },
        },
      },
    });
    if (!project) return res.status(404).json({ success: false, error: 'Projet introuvable' });

    // Aggregate by component
    const map = {};
    for (const sheet of project.dischargeSheets) {
      for (const item of sheet.items) {
        const c = item.component;
        if (!map[c.id]) {
          map[c.id] = { componentId: c.id, nom: c.nom, numero: c.numero, armoire: c.armoire, casier: c.casier, banque: c.banque, quantiteTotale: 0, sheets: [] };
        }
        map[c.id].quantiteTotale += item.quantiteAccordee;
        map[c.id].sheets.push({ numeroFiche: sheet.numeroFiche, isRefresh: sheet.isRefresh, quantiteAccordee: item.quantiteAccordee, dateCreation: sheet.dateCreation });
      }
    }
    res.json({ success: true, data: Object.values(map) });
  } catch (error) {
    console.error('GET /projects/:id/cumulative-components error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ── GET /api/projects ─────────────────────────────────────────────────────────
router.get('/', authenticate, requireApproved, async (req, res) => {
  try {
    const { statut, lab } = req.query;
    const { role, labId } = req.user;

    let where = {};

    if (role === 'STUDENT') {
      // Students see all projects in their lab (no ProjectMember FK anymore)
      where = { labId };
    } else if (lab === 'ALL' && (role === 'LAB_ADMIN' || role === 'SUPERVISOR')) {
      // Cross-lab view (read only)
      where = {};
    } else {
      where = { labId };
    }

    if (statut && statut !== 'ALL') {
      where.statut = statut;
    }

    const projects = await prisma.project.findMany({
      where,
      include: projectIncludes,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: projects.map(formatProject) });
  } catch (error) {
    console.error('GET /projects error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching projects' });
  }
});

// ── GET /api/projects/:id ────────────────────────────────────────────────────
router.get('/:id', authenticate, requireApproved, async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: projectIncludes,
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    res.json({ success: true, data: formatProject(project) });
  } catch (error) {
    console.error('GET /projects/:id error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ── POST /api/projects ───────────────────────────────────────────────────────
router.post('/', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const { titre, type, encadrantId, chefGroupeNom, membresNoms, composants } = req.body;

    // ── Basic Validation ────────────────────────────────────────────────────
    if (!titre || !type || !encadrantId || !chefGroupeNom?.trim() || !composants?.length) {
      return res.status(400).json({ success: false, error: 'Champs requis manquants: titre, type, encadrantId, chefGroupeNom, composants' });
    }

    if (!['PFE', 'MINI_PROJET'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Type must be PFE or MINI_PROJET' });
    }

    // Validate encadrant: must be SUPERVISOR in same lab
    const encadrant = await prisma.user.findUnique({ where: { id: encadrantId } });
    if (!encadrant || encadrant.role !== 'SUPERVISOR' || encadrant.labId !== req.user.labId) {
      return res.status(400).json({ success: false, error: "L'encadrant doit être un superviseur du même lab" });
    }

    // membresNoms is an array of free-text strings
    const membresArray = Array.isArray(membresNoms) ? membresNoms.filter(n => n?.trim()) : [];

    // ── ATOMIC TRANSACTION ──────────────────────────────────────────────────
    const result = await prisma.$transaction(async (tx) => {

      // Step 1: Check availability for ALL components
      const insuffisants = [];
      const componentData = [];

      for (const item of composants) {
        const comp = await tx.component.findUnique({
          where: { id: item.componentId },
          select: { id: true, nom: true, qtyStock: true, qtyReservee: true },
        });

        if (!comp) {
          throw new Error(`Component ${item.componentId} not found`);
        }

        const qtyDisponible = comp.qtyStock - comp.qtyReservee;

        if (qtyDisponible < item.quantiteDemandee) {
          insuffisants.push({
            componentId: comp.id,
            nom: comp.nom,
            qtyDisponible,
            quantiteDemandee: item.quantiteDemandee,
          });
        }

        componentData.push({ comp, quantiteDemandee: item.quantiteDemandee });
      }

      // Step 2: ALL-or-NOTHING — abort if any component insufficient
      if (insuffisants.length > 0) {
        const err = new Error('INSUFFICIENT_STOCK');
        err.insuffisants = insuffisants;
        throw err;
      }

      // Step 3a: Create the Project with free-text chef + members
      const project = await tx.project.create({
        data: {
          titre,
          type,
          statut: 'EN_ATTENTE',
          labId: req.user.labId,
          encadrantId,
          chefGroupeNom: chefGroupeNom.trim(),
          membresNoms: JSON.stringify(membresArray),
        },
      });

      // Step 3b: No ProjectMember rows — members are free text

      // Step 3c: Generate fiche number and create DischargeSheet
      const lab = await tx.lab.findUnique({ where: { id: req.user.labId } });
      const numeroFiche = await generateNumeroFiche(lab.nom);
      const sheet = await tx.dischargeSheet.create({
        data: {
          projectId: project.id,
          numeroFiche,
          statut: 'EN_ATTENTE',
          isRefresh: false,
        },
      });

      // Step 3d: Create DischargeItems + reserve stock atomically
      for (const { comp, quantiteDemandee } of componentData) {
        await tx.dischargeItem.create({
          data: {
            dischargeSheetId: sheet.id,
            componentId: comp.id,
            quantiteDemandee,
            quantiteAccordee: quantiteDemandee,
            statutRetour: 'DANS_PROJET',
          },
        });

        // Atomic increment — prevents race conditions
        await tx.component.update({
          where: { id: comp.id },
          data: { qtyReservee: { increment: quantiteDemandee } },
        });
      }

      // Step 3e: Create Student account for the Chef de Groupe
      const randomPassword = Math.random().toString(36).slice(-8);
      const studentHash = await bcrypt.hash(randomPassword, 10);
      
      const cleanName = chefGroupeNom.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z.]/g, '');
      const uniqueSuffix = Math.floor(1000 + Math.random() * 9000);
      const email = `${cleanName}.${uniqueSuffix}@${lab.nom.toLowerCase()}.dz`;

      const nameParts = chefGroupeNom.trim().split(/\s+/);
      const prenom = nameParts[0];
      const nom = nameParts.slice(1).join(' ') || prenom;

      const studentUser = await tx.user.create({
        data: {
          email,
          passwordHash: studentHash,
          nom,
          prenom,
          role: 'STUDENT',
          isApproved: true,
          labId: lab.id
        }
      });

      // Return the full project along with credentials
      const fullProject = await tx.project.findUnique({
        where: { id: project.id },
        include: projectIncludes,
      });

      return { project: fullProject, studentCredentials: { email, password: randomPassword } };
    });

    res.status(201).json({ 
      success: true, 
      data: formatProject(result.project),
      studentCredentials: result.studentCredentials 
    });

  } catch (error) {
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({
        success: false,
        error: 'Stock insuffisant pour certains composants',
        insuffisants: error.insuffisants,
      });
    }
    console.error('POST /projects error:', error);
    res.status(500).json({ success: false, error: 'Server error creating project' });
  }
});

// ── PUT /api/projects/:id/composants — edit composants while EN_ATTENTE ──────
// Atomically: release all old reservations → check new availability → apply new reservations
router.put('/:id/composants', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const { composants } = req.body; // [{ componentId, quantiteDemandee }]

    if (!Array.isArray(composants) || composants.length === 0) {
      return res.status(400).json({ success: false, error: 'La liste des composants ne peut pas être vide' });
    }

    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        dischargeSheets: {
          where: { statut: 'EN_ATTENTE' },
          include: { items: true },
        },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Projet introuvable' });
    if (project.labId !== req.user.labId) return res.status(403).json({ success: false, error: 'Accès refusé' });
    if (project.statut !== 'EN_ATTENTE') {
      return res.status(409).json({ success: false, error: 'Seuls les projets EN_ATTENTE peuvent être modifiés' });
    }

    const sheet = project.dischargeSheets[0];
    if (!sheet) return res.status(404).json({ success: false, error: 'Fiche de décharge introuvable' });

    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Release ALL existing reservations
      for (const item of sheet.items) {
        await tx.component.update({
          where: { id: item.componentId },
          data: { qtyReservee: { decrement: item.quantiteDemandee } },
        });
      }

      // Step 2: Delete all existing DischargeItems
      await tx.dischargeItem.deleteMany({ where: { dischargeSheetId: sheet.id } });

      // Step 3: Check new availability for ALL components
      const insuffisants = [];
      const componentData = [];

      for (const item of composants) {
        const comp = await tx.component.findUnique({
          where: { id: item.componentId },
          select: { id: true, nom: true, qtyStock: true, qtyReservee: true, labId: true },
        });
        if (!comp) throw new Error(`Composant ${item.componentId} introuvable`);
        if (comp.labId !== req.user.labId) throw new Error(`Composant ${comp.nom} n'appartient pas à ce lab`);

        const qtyDisponible = comp.qtyStock - comp.qtyReservee;
        if (qtyDisponible < item.quantiteDemandee) {
          insuffisants.push({ componentId: comp.id, nom: comp.nom, qtyDisponible, quantiteDemandee: item.quantiteDemandee });
        }
        componentData.push({ comp, quantiteDemandee: item.quantiteDemandee });
      }

      // Step 4: ALL-or-NOTHING
      if (insuffisants.length > 0) {
        const err = new Error('INSUFFICIENT_STOCK');
        err.insuffisants = insuffisants;
        throw err;
      }

      // Step 5: Create new DischargeItems + reserve stock
      for (const { comp, quantiteDemandee } of componentData) {
        await tx.dischargeItem.create({
          data: {
            dischargeSheetId: sheet.id,
            componentId: comp.id,
            quantiteDemandee,
            quantiteAccordee: quantiteDemandee,
            statutRetour: 'DANS_PROJET',
          },
        });
        await tx.component.update({
          where: { id: comp.id },
          data: { qtyReservee: { increment: quantiteDemandee } },
        });
      }

      return tx.project.findUnique({
        where: { id: project.id },
        include: projectIncludes,
      });
    });

    res.json({ success: true, data: formatProject(result) });

  } catch (error) {
    if (error.message === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({
        success: false,
        error: 'Stock insuffisant pour certains composants',
        insuffisants: error.insuffisants,
      });
    }
    console.error('PUT /projects/:id/composants error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la modification' });
  }
});

// ── PATCH /api/projects/:id/approve — Supervisor approves ────────────────────
router.patch('/:id/approve', authenticate, requireApproved, requireRoles('SUPERVISOR'), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        dischargeSheets: { where: { isRefresh: false, statut: 'EN_ATTENTE' } },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Projet introuvable' });
    if (project.statut !== 'EN_ATTENTE') {
      return res.status(409).json({ success: false, error: 'Seuls les projets EN_ATTENTE peuvent être approuvés' });
    }
    if (project.encadrantId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Vous ne pouvez approuver que les projets dont vous êtes l\'encadrant' });
    }

    const sheet = project.dischargeSheets[0];
    if (!sheet) return res.status(404).json({ success: false, error: 'Fiche de décharge introuvable' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: { statut: 'APPROUVE' },
      });
      await tx.dischargeSheet.update({
        where: { id: sheet.id },
        data: { statut: 'APPROUVE', approuvePar: req.user.id, dateApprobation: new Date() },
      });
      return tx.project.findUnique({ where: { id: project.id }, include: projectIncludes });
    });

    res.json({ success: true, data: formatProject(result) });
  } catch (error) {
    console.error('PATCH /projects/:id/approve error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ── PATCH /api/projects/:id/validate — Admin validates → EN_COURS ─────────────
router.patch('/:id/validate', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        dischargeSheets: {
          where: { isRefresh: false },
          include: { items: true },
        },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Projet introuvable' });
    if (project.labId !== req.user.labId) return res.status(403).json({ success: false, error: 'Accès refusé' });
    if (project.statut !== 'APPROUVE') {
      return res.status(409).json({ success: false, error: 'Seuls les projets APPROUVE peuvent être validés' });
    }

    const sheet = project.dischargeSheets[0];
    if (!sheet) return res.status(404).json({ success: false, error: 'Fiche de décharge introuvable' });

    // Optional: admin adjustments to quantite_accordee
    const adjustments = {};
    if (req.body?.composants && Array.isArray(req.body.composants)) {
      for (const adj of req.body.composants) {
        const item = sheet.items.find(i => i.id === adj.dischargeItemId);
        if (!item) continue;
        const qa = parseInt(adj.quantiteAccordee);
        if (isNaN(qa) || qa < 0 || qa > item.quantiteDemandee) {
          return res.status(400).json({
            success: false,
            error: `Quantité accordée invalide pour ${item.id}: doit être entre 0 et ${item.quantiteDemandee}`,
          });
        }
        adjustments[item.id] = qa;
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Apply adjustments then process each item
      for (const item of sheet.items) {
        const quantiteAccordee = adjustments[item.id] ?? item.quantiteAccordee;

        // Save accordee if it changed
        if (quantiteAccordee !== item.quantiteAccordee) {
          await tx.dischargeItem.update({
            where: { id: item.id },
            data: { quantiteAccordee },
          });
        }

        // Stock: clear reservation, deduct stock, add to projets
        await tx.component.update({
          where: { id: item.componentId },
          data: {
            qtyReservee: { decrement: item.quantiteDemandee }, // clear full reservation
            qtyStock: { decrement: quantiteAccordee },          // deduct only accordee
            qtyProjets: { increment: quantiteAccordee },
          },
        });

        // Log SORTIE movement (skip if 0)
        if (quantiteAccordee > 0) {
          await tx.stockMovement.create({
            data: {
              componentId: item.componentId,
              projectId: project.id,
              dischargeSheetId: sheet.id,
              typeMouvement: 'SORTIE',
              quantite: quantiteAccordee,
              effectuePar: req.user.id,
              notes: `Validation fiche ${sheet.numeroFiche}`,
            },
          });
        }
      }

      // Move project to EN_COURS
      await tx.project.update({
        where: { id: project.id },
        data: { statut: 'EN_COURS' },
      });

      // Mark discharge sheet as validated
      await tx.dischargeSheet.update({
        where: { id: sheet.id },
        data: { validePar: req.user.id },
      });

      return tx.project.findUnique({ where: { id: project.id }, include: projectIncludes });
    });

    res.json({ success: true, data: formatProject(result) });
  } catch (error) {
    console.error('PATCH /projects/:id/validate error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la validation' });
  }
});

// ── DELETE /api/projects/:id ─────────────────────────────────────────────────
router.delete('/:id', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        dischargeSheets: {
          where: { statut: 'EN_ATTENTE' },
          include: { items: true },
        },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });
    if (project.labId !== req.user.labId) return res.status(403).json({ success: false, error: 'Cannot delete projects from another lab' });
    if (project.statut !== 'EN_ATTENTE') {
      return res.status(409).json({ success: false, error: 'Only EN_ATTENTE projects can be deleted' });
    }

    await prisma.$transaction(async (tx) => {
      // Release all reserved stock from the EN_ATTENTE discharge sheet
      for (const sheet of project.dischargeSheets) {
        for (const item of sheet.items) {
          await tx.component.update({
            where: { id: item.componentId },
            data: { qtyReservee: { decrement: item.quantiteDemandee } },
          });
        }
        // Delete discharge items then sheet
        await tx.dischargeItem.deleteMany({ where: { dischargeSheetId: sheet.id } });
        await tx.dischargeSheet.delete({ where: { id: sheet.id } });
      }

      await tx.project.delete({ where: { id: project.id } });
    });

    res.json({ success: true, data: { message: 'Project deleted and stock released' } });
  } catch (error) {
    console.error('DELETE /projects/:id error:', error);
    res.status(500).json({ success: false, error: 'Server error deleting project' });
  }
});

// ── PATCH /api/projects/:id/close — R9: terminal, irreversible ───────────────
// INVARIANT: after this call, for each closed item:
//   qty_projets -= quantite_accordee
//   RENDU    → qty_stock    += quantite
//   ENDOMMAGE→ qty_endommage+= quantite
//   PERDU    → qty_perdu   += quantite
// StockMovement entries created here are permanent (R8).
router.patch('/:id/close', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const { composants } = req.body;

    if (!Array.isArray(composants) || composants.length === 0)
      return res.status(400).json({ success: false, error: 'La liste des composants est vide' });

    const validStatuts = ['RENDU', 'ENDOMMAGE', 'PERDU'];
    // Normalize and validate each composant entry
    for (const c of composants) {
      c.quantite = parseInt(c.quantite); // coerce float/string to int
      if (!c.dischargeItemId || !validStatuts.includes(c.statutRetour) || isNaN(c.quantite) || c.quantite < 1)
        return res.status(400).json({ success: false, error: 'Données composant invalides' });
    }

    // Load project with all sheets and DANS_PROJET items
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        lab: true,
        dischargeSheets: {
          include: { items: { include: { component: true } } },
          orderBy: [{ isRefresh: 'asc' }, { dateCreation: 'asc' }],
        },
      },
    });

    if (!project) return res.status(404).json({ success: false, error: 'Projet introuvable' });
    if (project.labId !== req.user.labId) return res.status(403).json({ success: false, error: 'Accès refusé' });
    if (project.statut !== 'EN_COURS')
      return res.status(409).json({ success: false, error: 'Le projet doit être EN_COURS pour être clôturé' });

    // Gather all DANS_PROJET items across all sheets (skip qty=0 — never given)
    const dansProjets = [];
    for (const sheet of project.dischargeSheets) {
      for (const item of sheet.items) {
        if (item.statutRetour === 'DANS_PROJET' && item.quantiteAccordee > 0) {
          dansProjets.push({ ...item, dischargeSheetId: sheet.id });
        }
      }
    }

    // Validate all DANS_PROJET items are covered
    const bodyIds = new Set(composants.map(c => c.dischargeItemId));
    const manquants = dansProjets
      .filter(i => !bodyIds.has(i.id))
      .map(i => ({ dischargeItemId: i.id, componentNom: i.component?.nom }));
    if (manquants.length > 0)
      return res.status(400).json({ success: false, error: 'Tous les composants doivent avoir un statut final', manquants });

    // Validate quantite matches quantiteAccordee for each item
    const itemMap = Object.fromEntries(dansProjets.map(i => [i.id, i]));
    for (const c of composants) {
      const item = itemMap[c.dischargeItemId];
      if (!item) return res.status(400).json({ success: false, error: `Item ${c.dischargeItemId} introuvable` });
      if (c.quantite !== parseInt(item.quantiteAccordee))
        return res.status(400).json({ success: false, error: `Quantité incorrecte pour ${item.component?.nom}` });
    }

    await prisma.$transaction(async (tx) => {
      for (const c of composants) {
        const item = itemMap[c.dischargeItemId];

        // a. Update DischargeItem statut
        await tx.dischargeItem.update({
          where: { id: c.dischargeItemId },
          data: { statutRetour: c.statutRetour },
        });

        // b. Apply stock changes based on final status
        let stockDelta = {};
        if (c.statutRetour === 'RENDU') {
          stockDelta = { qtyProjets: { decrement: c.quantite }, qtyStock: { increment: c.quantite } };
        } else if (c.statutRetour === 'ENDOMMAGE') {
          stockDelta = { qtyProjets: { decrement: c.quantite }, qtyEndommage: { increment: c.quantite } };
        } else if (c.statutRetour === 'PERDU') {
          stockDelta = { qtyProjets: { decrement: c.quantite }, qtyPerdu: { increment: c.quantite } };
        }
        await tx.component.update({ where: { id: item.componentId }, data: stockDelta });

        // c. StockMovement (R8: permanent — never delete)
        await tx.stockMovement.create({
          data: {
            componentId: item.componentId,
            projectId: project.id,
            typeMouvement: c.statutRetour === 'RENDU' ? 'RETOUR' : c.statutRetour,
            quantite: c.quantite,
            effectuePar: req.user.id,
            notes: `Cloture projet — ${project.titre}`,
          },
        });
      }

      // d. Move project to terminal EXPOSE state (R9: irreversible)
      await tx.project.update({
        where: { id: project.id },
        data: { statut: 'EXPOSE' },
      });
    });

    res.json({ success: true, data: { project: { id: project.id, titre: project.titre, statut: 'EXPOSE' } } });
  } catch (error) {
    console.error('PATCH /projects/:id/close error:', error.message, error);
    res.status(500).json({ success: false, error: error.message || 'Erreur serveur lors de la cloture' });
  }
});

module.exports = router;

