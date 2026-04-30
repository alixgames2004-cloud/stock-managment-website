const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireApproved } = require('../middleware/auth.middleware');

// GET /api/discharge-sheets/:id — full detail of one fiche
router.get('/:id', authenticate, requireApproved, async (req, res) => {
  try {
    const sheet = await prisma.dischargeSheet.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            component: {
              select: { id: true, numero: true, nom: true, armoire: true, casier: true, banque: true, type: true },
            },
          },
        },
        project: {
          include: {
            lab: true,
            encadrant: { select: { id: true, nom: true, prenom: true } },
          },
        },
        approuveParUser: { select: { id: true, nom: true, prenom: true } },
        valideParUser:   { select: { id: true, nom: true, prenom: true } },
      },
    });

    if (!sheet) return res.status(404).json({ success: false, error: 'Fiche introuvable' });

    // Parse members from project (stored as JSON text)
    let membresNoms = [];
    try { membresNoms = JSON.parse(sheet.project.membresNoms || '[]'); } catch {}

    res.json({
      success: true,
      data: {
        id: sheet.id,
        numeroFiche: sheet.numeroFiche,
        statut: sheet.statut,
        isRefresh: sheet.isRefresh,
        dateCreation: sheet.dateCreation,
        dateApprobation: sheet.dateApprobation,
        approuvePar: sheet.approuveParUser,
        validePar: sheet.valideParUser,
        project: {
          id: sheet.project.id,
          titre: sheet.project.titre,
          type: sheet.project.type,
          statut: sheet.project.statut,
          labNom: sheet.project.lab?.nom,
          encadrant: sheet.project.encadrant,
          chefGroupeNom: sheet.project.chefGroupeNom,
          membresNoms,
        },
        items: sheet.items.map(i => ({
          id: i.id,
          componentId: i.componentId,
          componentNumero: i.component?.numero,
          componentNom: i.component?.nom,
          componentArmoire: i.component?.armoire,
          componentCasier: i.component?.casier,
          componentBanque: i.component?.banque,
          componentType: i.component?.type,
          quantiteDemandee: i.quantiteDemandee,
          quantiteAccordee: i.quantiteAccordee,
          statutRetour: i.statutRetour,
        })),
      },
    });
  } catch (error) {
    console.error('GET /discharge-sheets/:id error:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

module.exports = router;
