const express = require('express');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

const router = express.Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', auth, ctrl.me);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);

module.exports = router;
