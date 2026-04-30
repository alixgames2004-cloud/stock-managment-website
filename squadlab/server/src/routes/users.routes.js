const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate, requireApproved, requireRoles } = require('../middleware/auth.middleware');

// GET /api/users — list users filtered by role (LAB_ADMIN only)
router.get('/', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const { role } = req.query;

    const where = {
      labId: req.user.labId, // Always scoped to admin's own lab
      isApproved: true,
      ...(role && { role }),
    };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        role: true,
        annee: true,
        specialite: true,
        isApproved: true,
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('GET /users error:', error);
    res.status(500).json({ success: false, error: 'Server error fetching users' });
  }
});

// GET /api/users/pending — list unapproved users (LAB_ADMIN only)
router.get('/pending', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { labId: req.user.labId, isApproved: false },
      select: {
        id: true, nom: true, prenom: true, email: true,
        role: true, annee: true, specialite: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('GET /users/pending error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// PUT /api/users/:id/approve — approve a user (LAB_ADMIN only)
router.put('/:id/approve', authenticate, requireApproved, requireRoles('LAB_ADMIN'), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.labId !== req.user.labId) return res.status(403).json({ success: false, error: 'Cannot approve users from another lab' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isApproved: true, dateApprobation: new Date() },
      select: { id: true, nom: true, prenom: true, email: true, role: true, isApproved: true, dateApprobation: true },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /users/:id/approve error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
