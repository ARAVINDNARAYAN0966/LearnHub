import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },
    userName: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "Anonymous Learner",
    },
    userEmail: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
      default: "",
    },
    userRole: {
      type: String,
      enum: ["student", "instructor", "admin", "guest"],
      default: "student",
    },
    category: {
      type: String,
      enum: ["general", "bug", "feature", "ui_ux", "performance"],
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: Number.isInteger,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: ["submitted", "under_review", "resolved", "rejected"],
      default: "submitted",
      index: true,
      required: true,
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

feedbackSchema.index({ user: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, category: 1, createdAt: -1 });

const Feedback =
  mongoose.models.Feedback || mongoose.model("Feedback", feedbackSchema);

export default Feedback;
