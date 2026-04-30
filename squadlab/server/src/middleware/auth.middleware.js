const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required. Token missing or invalid format." });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch full user to ensure they still exist and get current state
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};

const requireApproved = (req, res, next) => {
  if (!req.user.isApproved) {
    return res.status(403).json({ message: "Account pending admin approval" });
  }
  next();
};

const requireRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
};

const requireSameLab = (req, res, next) => {
  // Try to get target lab from params or body
  const targetLabId = req.params.labId || req.body.labId;
  
  if (targetLabId && targetLabId !== req.user.labId) {
    return res.status(403).json({ message: "Cannot modify resources outside of your assigned lab" });
  }
  next();
};

module.exports = {
  authenticate,
  requireApproved,
  requireRoles,
  requireSameLab
};
