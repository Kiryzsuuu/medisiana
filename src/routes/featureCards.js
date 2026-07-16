const express = require('express');
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const ctrl = require('../controllers/featureCardController');

const router = express.Router();

router.use(auth);

router.get('/', ctrl.listFeatureCards);
router.post('/', adminOnly, ctrl.createFeatureCard);
router.patch('/:id', adminOnly, ctrl.updateFeatureCard);
router.delete('/:id', adminOnly, ctrl.deleteFeatureCard);

module.exports = router;
