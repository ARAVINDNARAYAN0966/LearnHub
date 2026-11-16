import mongoose from "mongoose";

const authRateLimitSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      required: true,
      min: 1,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: "auth_rate_limits",
    versionKey: false,
    timestamps: false,
  },
);

authRateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthRateLimit =
  mongoose.models.AuthRateLimit ||
  mongoose.model("AuthRateLimit", authRateLimitSchema);

export default AuthRateLimit;
