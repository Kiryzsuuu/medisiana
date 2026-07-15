const express = require('express');
const { auth } = require('../middleware/auth');
const ctrl = require('../controllers/caseController');

const router = express.Router();

router.use(auth);

router.get('/', ctrl.listCases);
router.post('/', ctrl.createCase);
router.get('/:id', ctrl.getCase);
router.post('/:id/comments', ctrl.addComment);
router.post('/:id/ask-ai', ctrl.askAi);

module.exports = router;
