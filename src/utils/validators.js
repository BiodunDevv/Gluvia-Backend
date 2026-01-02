const { z } = require("zod");

/**
 * Email validation schema
 */
const emailSchema = z.string().email("Invalid email format");

/**
 * Password validation schema
 * Minimum 8 characters, at least one letter and one number
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(
    /^(?=.*[A-Za-z])(?=.*\d)/,
    "Password must contain at least one letter and one number"
  );

/**
 * Phone validation schema (optional, supports Nigerian and international formats)
 * Accepts formats: +2348012345678, 08012345678, 8012345678, +1234567890
 */
const phoneSchema = z
  .string()
  .regex(
    /^(\+?\d{1,4}[-.\s]?)?(\(?\d{1,4}\)?[-.\s]?)?\d{7,15}$/,
    "Invalid phone number format"
  )
  .optional();

/**
 * ObjectId validation schema
 */
const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

/**
 * Registration validation schema
 */
const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1, "Name is required").optional(),
  phone: phoneSchema,
  deviceId: z.string().optional(),
  consent: z.object({
    accepted: z
      .boolean()
      .refine((val) => val === true, "Consent must be accepted"),
  }),
});

/**
 * Login validation schema
 */
const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
  deviceId: z.string().optional(),
});

/**
 * Password reset request validation schema
 */
const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/**
 * Password reset validation schema
 */
const passwordResetSchema = z.object({
  resetToken: z.string().min(1, "Reset token is required"),
  newPassword: passwordSchema,
});

/**
 * User profile update validation schema
 */
const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: phoneSchema,
  profile: z
    .object({
      age: z.number().int().min(1).max(120).optional(),
      sex: z.enum(["male", "female", "other"]).optional(),
      heightCm: z.number().min(50).max(300).optional(),
      weightKg: z.number().min(20).max(500).optional(),
      diabetesType: z
        .enum(["type1", "type2", "prediabetes", "unknown"])
        .optional(),
      activityLevel: z.enum(["low", "moderate", "high"]).optional(),
      allergies: z.array(z.string()).optional(),
      incomeBracket: z.enum(["low", "middle", "high"]).optional(),
      language: z.string().optional(),
    })
    .optional(),
});

/**
 * Food item validation schema
 */
const foodItemSchema = z.object({
  localName: z.string().min(1, "Local name is required"),
  canonicalName: z.string().optional(),
  category: z.string().optional(),
  nutrients: z
    .object({
      calories: z.number().min(0).optional(),
      carbs_g: z.number().min(0).optional(),
      protein_g: z.number().min(0).optional(),
      fat_g: z.number().min(0).optional(),
      fibre_g: z.number().min(0).optional(),
      gi: z.number().min(0).max(100).nullable().optional(),
    })
    .optional(),
  portionSizes: z
    .array(
      z.object({
        name: z.string(),
        grams: z.number().min(0),
        carbs_g: z.number().min(0).optional(),
      })
    )
    .optional(),
  affordability: z.enum(["low", "medium", "high"]).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  regionVariants: z
    .array(
      z.object({
        region: z.string(),
        note: z.string(),
      })
    )
    .optional(),
  source: z.string().optional(),
});

/**
 * Food item update validation schema (all fields optional)
 */
const foodItemUpdateSchema = z.object({
  localName: z.string().min(1).optional(),
  canonicalName: z.string().optional(),
  category: z.string().optional(),
  nutrients: z
    .object({
      calories: z.number().min(0).optional(),
      carbs_g: z.number().min(0).optional(),
      protein_g: z.number().min(0).optional(),
      fat_g: z.number().min(0).optional(),
      fibre_g: z.number().min(0).optional(),
      gi: z.number().min(0).max(100).nullable().optional(),
    })
    .optional(),
  portionSizes: z
    .array(
      z.object({
        name: z.string(),
        grams: z.number().min(0),
        carbs_g: z.number().min(0).optional(),
      })
    )
    .optional(),
  affordability: z.enum(["low", "medium", "high"]).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  regionVariants: z
    .array(
      z.object({
        region: z.string(),
        note: z.string(),
      })
    )
    .optional(),
  source: z.string().optional(),
});

/**
 * Rule template validation schema
 */
const ruleTemplateSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
  title: z.string().min(1, "Title is required"),
  type: z.enum([
    "constraint",
    "scoring",
    "substitution",
    "portion_adjustment",
    "alert",
  ]),
  definition: z.record(z.any()),
  nlTemplate: z.string().optional(),
  appliesTo: z.array(z.string()).optional(),
});

const updateRuleTemplateSchema = z
  .object({
    slug: z.string().min(1, "Slug is required").optional(),
    title: z.string().min(1, "Title is required").optional(),
    type: z
      .enum([
        "constraint",
        "scoring",
        "substitution",
        "portion_adjustment",
        "alert",
      ])
      .optional(),
    definition: z.record(z.any()).optional(),
    nlTemplate: z.string().optional(),
    appliesTo: z.array(z.string()).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Sync upload validation schema
 */
const syncUploadSchema = z.object({
  logs: z.object({
    meals: z
      .array(
        z.object({
          entries: z.array(
            z.object({
              foodId: z.string(),
              portionName: z.string().optional(),
              grams: z.number().min(0),
              carbs_g: z.number().min(0).optional(),
            })
          ),
          clientGeneratedId: z.string().optional(),
          createdAt: z.string().datetime().optional(),
        })
      )
      .optional(),
    glucose: z
      .array(
        z.object({
          valueMgDl: z.number().min(0),
          type: z.enum(["fasting", "postprandial", "random"]),
          clientGeneratedId: z.string().optional(),
          timestamp: z.string().datetime().optional(),
          notes: z.string().optional(),
        })
      )
      .optional(),
  }),
  clientVersion: z.number().int().min(0).optional(),
  lastSyncAt: z.string().datetime().optional(),
});

module.exports = {
  emailSchema,
  passwordSchema,
  phoneSchema,
  objectIdSchema,
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  updateProfileSchema,
  foodItemSchema,
  foodItemUpdateSchema,
  ruleTemplateSchema,
  updateRuleTemplateSchema,
  syncUploadSchema,
  uploadLogsSchema: syncUploadSchema, // Alias
  createFoodSchema: foodItemSchema,
  updateFoodSchema: foodItemUpdateSchema,
  createRuleSchema: ruleTemplateSchema,
  updateRuleSchema: updateRuleTemplateSchema,
};
