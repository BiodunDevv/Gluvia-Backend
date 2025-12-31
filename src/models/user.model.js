const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin", "health_worker"],
      default: "user",
    },
    profile: {
      age: Number,
      sex: {
        type: String,
        enum: ["male", "female", "other"],
      },
      heightCm: Number,
      weightKg: Number,
      bmi: Number,
      diabetesType: {
        type: String,
        enum: ["type1", "type2", "prediabetes", "unknown"],
      },
      activityLevel: {
        type: String,
        enum: ["low", "moderate", "high"],
      },
      allergies: [String],
      incomeBracket: {
        type: String,
        enum: ["low", "middle", "high"],
      },
      language: String,
      profileImage: {
        public_id: String,
        secure_url: String,
      },
    },
    consent: {
      accepted: {
        type: Boolean,
        required: true,
        default: false,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
userSchema.index({ createdAt: -1 });

// Method to calculate BMI
userSchema.methods.calculateBMI = function () {
  if (this.profile.heightCm && this.profile.weightKg) {
    const heightM = this.profile.heightCm / 100;
    this.profile.bmi = parseFloat(
      (this.profile.weightKg / (heightM * heightM)).toFixed(2)
    );
  }
};

// Remove sensitive data from JSON response
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  delete obj.devices; // Remove devices field (for backward compatibility with existing documents)
  delete obj.__v;
  return obj;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
