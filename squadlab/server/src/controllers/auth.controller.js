const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const register = async (req, res) => {
  try {
    const { lab } = req.params; // 'lab1' or 'lab3'
    const { nom, prenom, email, password, role, annee, specialite } = req.body;

    // Basic Validation
    if (!nom || !prenom || !email || !password || !role) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!['LAB_ADMIN', 'SUPERVISOR', 'STUDENT'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    if (role === 'STUDENT' && (!annee || !specialite)) {
      return res.status(400).json({ message: "Année and spécialité are required for students" });
    }

    // Determine Lab ID
    const labName = lab.toUpperCase(); // LAB1 or LAB3
    const labRecord = await prisma.lab.findUnique({
      where: { nom: labName }
    });

    if (!labRecord) {
      return res.status(400).json({ message: "Invalid lab specified in URL" });
    }

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Bootstrap Logic: First LAB_ADMIN auto-approval
    let isApproved = false;
    let dateApprobation = null;

    if (role === 'LAB_ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          labId: labRecord.id,
          role: 'LAB_ADMIN'
        }
      });
      
      if (adminCount === 0) {
        isApproved = true;
        dateApprobation = new Date();
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        nom,
        prenom,
        email,
        passwordHash,
        role,
        labId: labRecord.id,
        isApproved,
        dateApprobation,
        ...(role === 'STUDENT' && { annee, specialite })
      }
    });

    if (isApproved) {
      // Auto-login if bootstrapped
      const token = jwt.sign(
        { userId: user.id, role: user.role, labId: user.labId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );
      
      return res.status(201).json({
        message: "First admin registered and auto-approved.",
        token,
        user: {
          id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, 
          role: user.role, labId: user.labId, labNom: labRecord.nom,
          isApproved: user.isApproved, annee: user.annee, specialite: user.specialite
        }
      });
    }

    res.status(201).json({ message: "Registration successful. Waiting for admin approval." });

  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { lab: true } // Include lab to get labNom
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, labId: user.labId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        labId: user.labId,
        labNom: user.lab.nom,
        isApproved: user.isApproved,
        annee: user.annee,
        specialite: user.specialite
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

const me = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { lab: true }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
        labId: user.labId,
        labNom: user.lab.nom,
        isApproved: user.isApproved,
        annee: user.annee,
        specialite: user.specialite
      }
    });
  } catch (error) {
    console.error("Me endpoint error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
  me
};
