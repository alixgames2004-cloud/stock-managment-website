const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireApproved, requireRoles } = require('../middleware/auth.middleware');

const LOW_STOCK_THRESHOLD = 5;

// ── GET /api/dashboard/admin ──────────────────────────────────────────────────
router.get('/admin', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const labId = req.user.labId;

    const [
      totalComponents,
      activeProjects,
      pendingFiches,
      pendingUsers,
      lowStockComponents,
      recentProjects,
    ] = await Promise.all([
      prisma.component.count({ where: { labId } }),
      prisma.project.count({ where: { labId, statut: 'EN_COURS' } }),
      prisma.dischargeSheet.count({
        where: { project: { labId }, statut: 'EN_ATTENTE' },
      }),
      prisma.user.count({ where: { labId, isApproved: false } }),
      prisma.component.findMany({
        where: { labId, qtyDisponible: { lte: LOW_STOCK_THRESHOLD } },
        select: { id: true, nom: true, numero: true, qtyStock: true, qtyReservee: true, qtyDisponible: true, armoire: true, casier: true },
        orderBy: { qtyDisponible: 'asc' },
        take: 10,
      }),
      prisma.project.findMany({
        where: { labId, statut: { in: ['EN_ATTENTE', 'APPROUVE', 'EN_COURS'] } },
        include: { encadrant: { select: { nom: true, prenom: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: { totalComponents, activeProjects, pendingFiches, pendingUsers },
        lowStockAlerts: lowStockComponents,
        recentProjects: recentProjects.map(p => ({
          id: p.id, titre: p.titre, statut: p.statut,
          encadrant: p.encadrant ? `${p.encadrant.prenom} ${p.encadrant.nom}` : '—',
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('GET /dashboard/admin error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ── GET /api/dashboard/supervisor ────────────────────────────────────────────
router.get('/supervisor', authenticate, requireApproved, requireRoles('SUPERVISOR'), async (req, res) => {
  try {
    const userId = req.user.id;

    const [myActiveProjects, myPendingSheets, allMyProjects] = await Promise.all([
      prisma.project.count({ where: { encadrantId: userId, statut: 'EN_COURS' } }),
      prisma.dischargeSheet.count({
        where: { project: { encadrantId: userId }, statut: 'EN_ATTENTE' },
      }),
      prisma.project.findMany({
        where: { encadrantId: userId, statut: { in: ['EN_ATTENTE', 'APPROUVE', 'EN_COURS', 'EXPOSE'] } },
        include: {
          dischargeSheets: { where: { statut: 'EN_ATTENTE' }, select: { id: true, numeroFiche: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: { myActiveProjects, myPendingSheets },
        projects: allMyProjects.map(p => ({
          id: p.id, titre: p.titre, statut: p.statut,
          createdAt: p.createdAt,
          pendingSheets: p.dischargeSheets,
        })),
      },
    });
  } catch (error) {
    console.error('GET /dashboard/supervisor error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// ── GET /api/dashboard/student ────────────────────────────────────────────────
router.get('/student', authenticate, requireApproved, async (req, res) => {
  try {
    // Students are identified by name in membresNoms JSON — find projects where their name appears
    const fullName = `${req.user.prenom} ${req.user.nom}`;
    const projects = await prisma.project.findMany({
      where: {
        labId: req.user.labId,
        OR: [
          { chefGroupeNom: { contains: req.user.nom } },
          { membresNoms: { contains: req.user.nom } },
        ],
      },
      include: {
        encadrant: { select: { nom: true, prenom: true } },
        dischargeSheets: {
          include: { items: { include: { component: { select: { id: true, nom: true, numero: true, armoire: true, casier: true } } } } },
          orderBy: [{ isRefresh: 'asc' }, { dateCreation: 'asc' }],
        },
      },
    });

    res.json({
      success: true,
      data: { projects },
    });
  } catch (error) {
    console.error('GET /dashboard/student error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
