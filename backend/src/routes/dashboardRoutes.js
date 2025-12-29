const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Todas as rotas exigem admin
router.get('/stats', verifyToken, verifyAdmin, dashboardController.getDashboardStats);
router.get('/financial-report', verifyToken, verifyAdmin, dashboardController.getFinancialReport);
router.get('/upcoming', verifyToken, verifyAdmin, dashboardController.getUpcomingAppointments);

module.exports = router;
