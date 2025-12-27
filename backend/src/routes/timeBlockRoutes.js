const express = require('express');
const router = express.Router();
const timeBlockController = require('../controllers/timeBlockController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validateTimeBlock, validateId } = require('../middleware/validators');
const auditLog = require('../middleware/auditLog');

// Todas as rotas requerem autenticação de admin
router.use(verifyToken, verifyAdmin);

router.get('/', timeBlockController.getAllTimeBlocks);
router.get('/:id', validateId, timeBlockController.getTimeBlockById);
router.post('/', validateTimeBlock, auditLog('create_time_block', 'time_block'), timeBlockController.createTimeBlock);
router.put('/:id', validateId, auditLog('update_time_block', 'time_block'), timeBlockController.updateTimeBlock);
router.delete('/:id', validateId, auditLog('delete_time_block', 'time_block'), timeBlockController.deleteTimeBlock);

module.exports = router;
