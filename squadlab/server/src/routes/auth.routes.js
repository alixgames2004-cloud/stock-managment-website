const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/:lab/register', authController.register);
router.post('/:lab/login', authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
