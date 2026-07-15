const express = require('express');
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const ctrl = require('../controllers/bannerController');

const router = express.Router();

router.use(auth);

router.get('/', ctrl.listBanners);
router.post('/', adminOnly, ctrl.createBanner);
router.patch('/:id', adminOnly, ctrl.updateBanner);
router.delete('/:id', adminOnly, ctrl.deleteBanner);

module.exports = router;
