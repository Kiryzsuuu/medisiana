const express = require('express');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/wellnessController');

const router = express.Router();

router.use(auth);

router.post('/', ctrl.logToday);
router.get('/', ctrl.listLogs);
router.post('/ask-ai', ctrl.askAi);

module.exports = router;
