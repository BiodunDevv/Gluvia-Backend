const express = require('express');
const router = express.Router();
const ruleController = require('../controllers/rule.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { requireAdmin } = require('../middlewares/role.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createRuleSchema, updateRuleSchema } = require('../utils/validators');

// Public routes
router.get('/', ruleController.getAllRules);
router.get('/:slug', ruleController.getRuleBySlug);

// Admin routes
router.post('/', authenticate, requireAdmin, validate(createRuleSchema), ruleController.createRule);
router.put('/:slug', authenticate, requireAdmin, validate(updateRuleSchema), ruleController.updateRule);
router.delete('/:slug', authenticate, requireAdmin, ruleController.deleteRule);

module.exports = router;
