const express = require('express');
const { auth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const ctrl = require('../controllers/adminController');

const router = express.Router();

router.use(auth, adminOnly);

router.get('/users', ctrl.listUsers);
router.post('/users', ctrl.createUser);
router.put('/users/:id', ctrl.updateUser);
router.patch('/users/:id/suspend', ctrl.suspendUser);
router.delete('/users/:id', ctrl.deleteUser);
router.post('/users/import', ctrl.importUsers);
router.post('/users/:id/resend-verification', ctrl.resendVerification);

router.get('/analytics', ctrl.analytics);
router.get('/analytics/topics', ctrl.analyticsTopics);
router.get('/analytics/rag-miss', ctrl.analyticsRagMiss);
router.get('/analytics/active-students', ctrl.analyticsActiveStudents);

router.get('/config', ctrl.getConfig);
router.put('/config', ctrl.updateConfig);

module.exports = router;
