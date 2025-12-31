const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/user/:userId/nutrition', authenticate, reportController.getUserNutritionReport);

module.exports = router;
