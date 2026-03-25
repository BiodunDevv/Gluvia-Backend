const RuleTemplate = require('../models/ruleTemplate.model');
const Config = require('../models/config.model');
const auditService = require('./audit.service');
const { incrementServerVersion, getServerVersion } = require('./food.service');

const validateRuleDefinition = (definition) => {
  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    throw new Error("Rule definition must be a JSON object");
  }

  const stack = [definition];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const value of Object.values(current)) {
      if (typeof value === "number" && !Number.isFinite(value)) {
        throw new Error("Rule definition contains an invalid numeric value");
      }

      if (value && typeof value === "object" && !Array.isArray(value)) {
        stack.push(value);
      }
    }
  }
};

/**
 * Get all rules
 */
const getAllRules = async () => {
  const rules = await RuleTemplate.find({ deleted: false }).lean();
  const serverVersion = await getServerVersion();
  
  return {
    items: rules,
    serverVersion,
  };
};

/**
 * Get rule by slug
 */
const getRuleBySlug = async (slug) => {
  const rule = await RuleTemplate.findOne({ slug, deleted: false });
  if (!rule) {
    throw new Error('Rule not found');
  }
  return rule;
};

/**
 * Create new rule (admin)
 */
const createRule = async (ruleData, userId) => {
  // Check if slug already exists
  const existing = await RuleTemplate.findOne({ slug: ruleData.slug });
  if (existing) {
    throw new Error('Rule with this slug already exists');
  }

  validateRuleDefinition(ruleData.definition);

  const rule = await RuleTemplate.create({
    ...ruleData,
    version: 1,
    createdBy: userId,
  });

  // Increment server version
  const serverVersion = await incrementServerVersion();

  // Audit log
  await auditService.logAudit({
    action: 'rule_created',
    who: userId,
    target: { collection: 'rule_templates', id: rule._id },
    payload: ruleData,
  });

  return { rule, serverVersion };
};

/**
 * Update rule (admin)
 */
const updateRule = async (slug, ruleData, userId) => {
  const rule = await RuleTemplate.findOne({ slug, deleted: false });
  if (!rule) {
    throw new Error('Rule not found');
  }

  // Check version conflict
  if (ruleData.version && ruleData.version !== rule.version) {
    throw new Error('Version conflict - rule has been modified');
  }

  if (ruleData.definition !== undefined) {
    validateRuleDefinition(ruleData.definition);
  }

  // Update fields
  Object.assign(rule, ruleData);
  rule.version += 1;
  await rule.save();

  // Increment server version
  const serverVersion = await incrementServerVersion();

  // Audit log
  await auditService.logAudit({
    action: 'rule_updated',
    who: userId,
    target: { collection: 'rule_templates', id: rule._id },
    payload: ruleData,
  });

  return { rule, serverVersion };
};

/**
 * Delete rule (admin) - soft delete
 */
const deleteRule = async (slug, userId) => {
  const rule = await RuleTemplate.findOne({ slug });
  if (!rule) {
    throw new Error('Rule not found');
  }

  rule.deleted = true;
  rule.version += 1;
  await rule.save();

  // Increment server version
  const serverVersion = await incrementServerVersion();

  // Audit log
  await auditService.logAudit({
    action: 'rule_deleted',
    who: userId,
    target: { collection: 'rule_templates', id: rule._id },
  });

  return { ok: true, serverVersion };
};

/**
 * Get rules changed since version
 */
const getRulesChangedSince = async (clientVersion = 0) => {
  const rules = await RuleTemplate.find({
    version: { $gt: clientVersion },
  }).lean();

  // Include deleted items as tombstones
  const rulesWithTombstones = rules.map(rule => {
    if (rule.deleted) {
      return {
        _id: rule._id,
        slug: rule.slug,
        deleted: true,
        deletedAt: rule.updatedAt,
        version: rule.version,
      };
    }
    return rule;
  });

  return rulesWithTombstones;
};

module.exports = {
  getAllRules,
  getRuleBySlug,
  createRule,
  updateRule,
  deleteRule,
  getRulesChangedSince,
  validateRuleDefinition,
};
