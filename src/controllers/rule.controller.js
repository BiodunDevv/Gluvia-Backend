const ruleService = require("../services/rule.service");
const { asyncHandler } = require("../middlewares/error.middleware");

/**
 * @swagger
 * tags:
 *   name: Rules
 *   description: Rule template management
 */

/**
 * @swagger
 * /rules:
 *   get:
 *     summary: Get all active rule templates [PUBLIC]
 *     description: Public endpoint - No authentication required. Retrieve all active rule templates.
 *     tags: [Rules]
 *     responses:
 *       200:
 *         description: List of active rules
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RuleTemplate'
 */
const getAllRules = asyncHandler(async (req, res) => {
  const rules = await ruleService.getAllRules();

  res.json({
    success: true,
    data: rules,
  });
});

/**
 * @swagger
 * /rules/{slug}:
 *   get:
 *     summary: Get rule template by slug [PUBLIC]
 *     description: Public endpoint - No authentication required. Get details of a specific rule template.
 *     tags: [Rules]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule slug
 *     responses:
 *       200:
 *         description: Rule template details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RuleTemplate'
 *       404:
 *         description: Rule not found
 */
const getRuleBySlug = asyncHandler(async (req, res) => {
  const rule = await ruleService.getRuleBySlug(req.params.slug);

  if (!rule) {
    return res.status(404).json({
      success: false,
      message: "Rule template not found",
    });
  }

  res.json({
    success: true,
    data: rule,
  });
});

/**
 * @swagger
 * /rules:
 *   post:
 *     summary: Create a new rule template [ADMIN ONLY]
 *     description: Requires admin role. Create a new rule template.
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - category
 *               - definition
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [safety, optimization, education]
 *               definition:
 *                 type: object
 *               priority:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Rule template created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RuleTemplate'
 *       400:
 *         description: Invalid input or slug already exists
 */
const createRule = asyncHandler(async (req, res) => {
  const rule = await ruleService.createRule(req.body);

  res.status(201).json({
    success: true,
    message: "Rule template created successfully",
    data: rule,
  });
});

/**
 * @swagger
 * /admin/rules/{slug}:
 *   put:
 *     summary: Update a rule template [ADMIN ONLY]
 *     description: Requires admin role. Update an existing rule template.
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule slug
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               definition:
 *                 type: object
 *               priority:
 *                 type: number
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Rule template updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/RuleTemplate'
 *       404:
 *         description: Rule not found
 */
const updateRule = asyncHandler(async (req, res) => {
  const rule = await ruleService.updateRule(req.params.slug, req.body);

  if (!rule) {
    return res.status(404).json({
      success: false,
      message: "Rule template not found",
    });
  }

  res.json({
    success: true,
    message: "Rule template updated successfully",
    data: rule,
  });
});

/**
 * @swagger
 * /admin/rules/{slug}:
 *   delete:
 *     summary: Soft delete a rule template [ADMIN ONLY]
 *     description: Requires admin role. Soft delete a rule template (sets isActive to false).
 *     tags: [Rules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Rule slug
 *     responses:
 *       200:
 *         description: Rule template deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Rule not found
 */
const deleteRule = asyncHandler(async (req, res) => {
  const result = await ruleService.deleteRule(req.params.slug);

  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Rule template not found",
    });
  }

  res.json({
    success: true,
    message: "Rule template deleted successfully",
  });
});

module.exports = {
  getAllRules,
  getRuleBySlug,
  createRule,
  updateRule,
  deleteRule,
};

