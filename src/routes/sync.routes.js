const express = require('express');
const router = express.Router();
const syncController = require('../controllers/sync.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { uploadLogsSchema } = require('../utils/validators');

router.post('/upload', authenticate, validate(uploadLogsSchema), syncController.uploadLogs);
router.get('/updates', authenticate, syncController.getDeltaUpdates);
router.get('/full', authenticate, syncController.getFullSync);
router.get('/aggregations', authenticate, syncController.getUserAggregations);

module.exports = router;
