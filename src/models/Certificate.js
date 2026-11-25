import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    certificateId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    enrollment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enrollment",
      required: true,
    },
    recipientName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    courseTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    instructorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
      immutable: true,
    },
  },
  { timestamps: true },
);

certificateSchema.index({ user: 1, course: 1 }, { unique: true });

const Certificate =
  mongoose.models.Certificate ||
  mongoose.model("Certificate", certificateSchema);

export default Certificate;
