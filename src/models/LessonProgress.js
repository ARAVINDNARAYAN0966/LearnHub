import mongoose from "mongoose";

const lessonProgressSchema = new mongoose.Schema(
  {
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
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true },
);

lessonProgressSchema.index(
  { user: 1, course: 1, lessonId: 1 },
  { unique: true },
);

const LessonProgress =
  mongoose.models.LessonProgress ||
  mongoose.model("LessonProgress", lessonProgressSchema);

export default LessonProgress;
