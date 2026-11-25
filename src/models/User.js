import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    username: {
      type: String,
      trim: true,
      minlength: 4,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
      required: true,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
    headline: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },
    github: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    linkedin: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    avatarUrl: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
    },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
