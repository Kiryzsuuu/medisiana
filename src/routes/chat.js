const express = require('express');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/chatController');

const router = express.Router();

router.post('/', auth, ctrl.chat);
router.get('/sessions', auth, ctrl.listSessions);
router.get('/sessions/:id', auth, ctrl.getSession);
router.patch('/sessions/:id', auth, ctrl.updateSession);
router.delete('/sessions/:id', auth, ctrl.deleteSession);

module.exports = router;
