const express = require('express');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/roomController');

const router = express.Router();

router.use(auth);

router.get('/', ctrl.listRooms);
router.post('/', ctrl.createRoom);
router.get('/:id', ctrl.getRoom);
router.post('/:id/join', ctrl.joinRoom);
router.delete('/:id/leave', ctrl.leaveRoom);
router.get('/:id/messages', ctrl.getMessages);
router.post('/:id/ask-ai', ctrl.askAi);

module.exports = router;
