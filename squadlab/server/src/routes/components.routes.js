const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireApproved, requireRoles } = require('../middleware/auth.middleware');

// Helper: compute qty_disponible and format component output
const formatComponent = (c) => ({
  id: c.id,
  numero: c.numero,
  codeFournisseur: c.codeFournisseur,
  nom: c.nom,
  prix: c.prix,
  type: c.type,
  armoire: c.armoire,
  casier: c.casier,
  banque: c.banque,
  labId: c.labId,
  labNom: c.lab?.nom,
  qtyStock: c.qtyStock,
  qtyReservee: c.qtyReservee,
  qtyDisponible: c.qtyStock - c.qtyReservee, // Always computed
  qtyProjets: c.qtyProjets,
  qtyEndommage: c.qtyEndommage,
  qtyPerdu: c.qtyPerdu,
  createdAt: c.createdAt,
  updatedAt: c.updatedAt,
});

// GET /api/components — search with filters
router.get('/', authenticate, requireApproved, async (req, res) => {
  try {
    const { name, numero, code_fournisseur, lab, armoire } = req.query;

    // Build lab filter
    let labFilter = {};
    if (lab && lab !== 'ALL') {
      const labRecord = await prisma.lab.findUnique({ where: { nom: lab } });
      if (labRecord) {
        labFilter = { labId: labRecord.id };
      }
    }

    // Build where clause
    const where = {
      ...labFilter,
      ...(armoire && { armoire }),
      ...(numero && { numero: parseInt(numero) || undefined }),
      ...(code_fournisseur && {
        codeFournisseur: { contains: code_fournisseur },
      }),
      ...(name && {
        OR: [
          { nom: { contains: name } },
          { codeFournisseur: { contains: name } },
        ],
      }),
    };

    const components = await prisma.component.findMany({
      where,
      include: { lab: true },
      orderBy: [{ lab: { nom: 'asc' } }, { numero: 'asc' }],
    });

    res.json({ success: true, data: components.map(formatComponent) });
  } catch (error) {
    console.error('GET /components error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching components' });
  }
});

// GET /api/components/:id — single component with stock movements
router.get('/:id', authenticate, requireApproved, async (req, res) => {
  try {
    const component = await prisma.component.findUnique({
      where: { id: req.params.id },
      include: {
        lab: true,
        stockMovements: {
          include: {
            user: { select: { id: true, nom: true, prenom: true } },
            project: { select: { id: true, titre: true } },
          },
          orderBy: { dateMouvement: 'desc' },
        },
      },
    });

    if (!component) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }

    res.json({
      success: true,
      data: {
        ...formatComponent(component),
        stockMovements: component.stockMovements,
      },
    });
  } catch (error) {
    console.error('GET /components/:id error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// POST /api/components — create component (LAB_ADMIN only)
router.post('/', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const {
      numero, codeFournisseur, nom, prix, type, armoire, casier, banque, labId, qtyStock
    } = req.body;

    if (!nom || !armoire || casier === undefined || !labId || qtyStock === undefined) {
      return res.status(400).json({ success: false, error: 'Missing required fields: nom, armoire, casier, banque, labId, qtyStock' });
    }

    // Enforce same-lab rule
    if (labId !== req.user.labId) {
      return res.status(403).json({ success: false, error: 'Cannot create components for a different lab' });
    }

    // Auto-increment numero if not provided
    let componentNumero = numero ? parseInt(numero) : null;
    if (!componentNumero) {
      const lastComponent = await prisma.component.findFirst({
        where: { labId },
        orderBy: { numero: 'desc' },
      });
      componentNumero = lastComponent ? lastComponent.numero + 1 : 1;
    }

    // Create component + initial stock movement in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const component = await tx.component.create({
        data: {
          numero: componentNumero,  // Already parsed as Int above
          codeFournisseur: codeFournisseur || null,
          nom,
          prix: prix ? parseFloat(prix) : null,
          type: type || null,
          armoire,
          casier: parseInt(casier),
          banque: banque ? parseInt(banque) : null,
          labId,
          qtyStock: parseInt(qtyStock),
          qtyReservee: 0,
          qtyProjets: 0,
          qtyEndommage: 0,
          qtyPerdu: 0,
        },
        include: { lab: true },
      });

      await tx.stockMovement.create({
        data: {
          componentId: component.id,
          typeMouvement: 'ENTREE',
          quantite: parseInt(qtyStock),
          effectuePar: req.user.id,
          notes: 'Arrivage initial',
        },
      });

      return component;
    });

    res.status(201).json({ success: true, data: formatComponent(result) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'This component number already exists for this lab' });
    }
    console.error('POST /components error:', error);
    res.status(500).json({ success: false, error: 'Server error creating component' });
  }
});

// PUT /api/components/:id — update (LAB_ADMIN, same lab only)
router.put('/:id', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const component = await prisma.component.findUnique({
      where: { id: req.params.id },
    });

    if (!component) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }

    if (component.labId !== req.user.labId) {
      return res.status(403).json({ success: false, error: 'Cannot modify components from a different lab' });
    }

    const { codeFournisseur, nom, prix, type, armoire, casier, banque } = req.body;
    // Explicitly exclude qty_stock and lab_id changes

    const updated = await prisma.component.update({
      where: { id: req.params.id },
      data: {
        ...(codeFournisseur !== undefined && { codeFournisseur }),
        ...(nom && { nom }),
        ...(prix !== undefined && { prix: prix ? parseFloat(prix) : null }),
        ...(type !== undefined && { type }),
        ...(armoire && { armoire }),
        ...(casier !== undefined && { casier: parseInt(casier) }),
        ...(banque !== undefined && { banque: banque ? parseInt(banque) : null }),
      },
      include: { lab: true },
    });

    res.json({ success: true, data: formatComponent(updated) });
  } catch (error) {
    console.error('PUT /components/:id error:', error);
    res.status(500).json({ success: false, error: 'Server error updating component' });
  }
});

// DELETE /api/components/:id — delete (LAB_ADMIN, same lab, only if not in use)
router.delete('/:id', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const component = await prisma.component.findUnique({
      where: { id: req.params.id },
    });

    if (!component) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }

    if (component.labId !== req.user.labId) {
      return res.status(403).json({ success: false, error: 'Cannot delete components from a different lab' });
    }

    if (component.qtyProjets > 0 || component.qtyReservee > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete component: ${component.qtyProjets} unit(s) are currently in projects and ${component.qtyReservee} unit(s) are reserved. Return all components before deleting.`,
      });
    }

    // SQLite doesn't enforce cascades reliably — manually delete related records first
    await prisma.$transaction(async (tx) => {
      await tx.stockMovement.deleteMany({ where: { componentId: req.params.id } });
      await tx.dischargeItem.deleteMany({ where: { componentId: req.params.id } });
      await tx.component.delete({ where: { id: req.params.id } });
    });

    res.json({ success: true, data: { message: 'Component deleted successfully' } });
  } catch (error) {
    console.error('DELETE /components/:id error:', error);
    res.status(500).json({ success: false, error: 'Server error deleting component' });
  }
});

// POST /api/components/:id/add-stock — increase stock (LAB_ADMIN, same lab)
router.post('/:id/add-stock', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const { quantite } = req.body;

    if (!quantite || parseInt(quantite) <= 0) {
      return res.status(400).json({ success: false, error: 'quantite must be a positive integer' });
    }

    const component = await prisma.component.findUnique({
      where: { id: req.params.id },
    });

    if (!component) {
      return res.status(404).json({ success: false, error: 'Component not found' });
    }

    if (component.labId !== req.user.labId) {
      return res.status(403).json({ success: false, error: 'Cannot modify components from a different lab' });
    }

    const qty = parseInt(quantite);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.component.update({
        where: { id: req.params.id },
        data: { qtyStock: { increment: qty } },
        include: { lab: true },
      });

      await tx.stockMovement.create({
        data: {
          componentId: component.id,
          typeMouvement: 'ENTREE',
          quantite: qty,
          effectuePar: req.user.id,
          notes: req.body.notes || null,
        },
      });

      return updated;
    });

    res.json({ success: true, data: formatComponent(result) });
  } catch (error) {
    console.error('POST /components/:id/add-stock error:', error);
    res.status(500).json({ success: false, error: 'Server error adding stock' });
  }
});

module.exports = router;
