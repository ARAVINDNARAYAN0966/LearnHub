import mongoose from "mongoose";

const courseModuleSchema = new mongoose.Schema(
  {
    number: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    summary: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },
    lessons: {
      type: [
        new mongoose.Schema(
          {
            title: {
              type: String,
              required: true,
              trim: true,
              maxlength: 200,
            },
            description: {
              type: String,
              trim: true,
              default: "",
              maxlength: 2000,
            },
            type: {
              type: String,
              enum: ["video", "article", "quiz"],
              required: true,
            },
            content: {
              type: String,
              trim: true,
              default: "",
              maxlength: 100000,
            },
            videoUrl: {
              type: String,
              trim: true,
              default: "",
              maxlength: 2048,
              validate: {
                validator(value) {
                  if (!value) return true;
                  try {
                    const url = new URL(value);
                    return (
                      url.protocol === "https:" &&
                      Boolean(url.hostname) &&
                      !url.username &&
                      !url.password
                    );
                  } catch {
                    return false;
                  }
                },
                message: "Video URLs must use HTTPS.",
              },
            },
            durationMinutes: {
              type: Number,
              required: true,
              min: 0,
              max: 1440,
              validate: Number.isInteger,
            },
            order: {
              type: Number,
              required: true,
              min: 0,
              max: 10000,
              validate: Number.isInteger,
            },
            published: {
              type: Boolean,
              default: false,
              required: true,
            },
          },
          { timestamps: true },
        ),
      ],
      default: [],
    },
  },
  { _id: false },
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    instructor: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    instructorRole: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    originalPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    currency: {
      type: String,
      enum: ["INR"],
      default: "INR",
      required: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    lessons: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    rating: {
      type: Number,
      required: true,
      min: 0,
      max: 5,
    },
    reviews: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    students: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      trim: true,
    },
    learn: {
      type: [String],
      required: true,
      default: [],
    },
    modules: {
      type: [courseModuleSchema],
      required: true,
      default: [],
    },
    published: {
      type: Boolean,
      required: true,
      default: false,
    },
    deleting: {
      type: Boolean,
      select: false,
    },
    enrollmentReservations: {
      type: Number,
      min: 0,
      select: false,
    },
  },
  { timestamps: true },
);

courseSchema.index({ published: 1, title: 1 });

const Course = mongoose.models.Course || mongoose.model("Course", courseSchema);

export default Course;
