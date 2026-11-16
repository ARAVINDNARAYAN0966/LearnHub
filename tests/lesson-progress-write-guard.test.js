import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../src/models/Course.js", () => ({
  default: { updateOne: vi.fn() },
}));
vi.mock("../src/models/Enrollment.js", () => ({
  default: {},
}));
vi.mock("../src/models/LessonProgress.js", () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    init: vi.fn(),
  },
}));
vi.mock("../src/lib/mongodb.js", () => ({
  connectToDatabase: vi.fn(),
}));

import Course from "../src/models/Course.js";
import LessonProgress from "../src/models/LessonProgress.js";
import { connectToDatabase } from "../src/lib/mongodb.js";
import {
  PublishedLessonUnavailableError,
  recordLessonAccess,
} from "../src/lib/lesson-progress.js";

const access = {
  userId: "507f1f77bcf86cd799439001",
  courseId: "507f1f77bcf86cd799439002",
  lessonId: "507f1f77bcf86cd799439003",
};
const session = {
  withTransaction: vi.fn(async (callback) => callback()),
  endSession: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  vi.spyOn(mongoose, "startSession").mockResolvedValue(session);
  connectToDatabase.mockResolvedValue(undefined);
  Course.updateOne.mockResolvedValue({ matchedCount: 1 });
  LessonProgress.init.mockResolvedValue(undefined);
  LessonProgress.findOne.mockResolvedValue(null);
  LessonProgress.create.mockResolvedValue([{ _id: "progress-id" }]);
});

describe("lesson progress concurrency guard", () => {
  it("serializes first progress writes against curriculum edits", async () => {
    await recordLessonAccess(access);

    expect(Course.updateOne).toHaveBeenCalledWith(
      {
        _id: access.courseId,
        published: true,
        modules: {
          $elemMatch: {
            lessons: {
              $elemMatch: { _id: access.lessonId, published: true },
            },
          },
        },
      },
      { $inc: { __v: 1 } },
      { timestamps: false, session },
    );
    expect(
      Course.updateOne.mock.invocationCallOrder[0],
    ).toBeLessThan(LessonProgress.create.mock.invocationCallOrder[0]);
  });

  it("does not create progress after a lesson is unpublished or removed", async () => {
    Course.updateOne.mockResolvedValue({ matchedCount: 0 });

    await expect(recordLessonAccess(access)).rejects.toBeInstanceOf(
      PublishedLessonUnavailableError,
    );
    expect(LessonProgress.create).not.toHaveBeenCalled();
  });

  it("updates existing progress without changing the course revision", async () => {
    const record = {
      completed: false,
      completedAt: null,
      save: vi.fn().mockResolvedValue(undefined),
    };
    LessonProgress.findOne.mockResolvedValue(record);

    await recordLessonAccess({ ...access, completed: true });

    expect(Course.updateOne).not.toHaveBeenCalled();
    expect(record.completed).toBe(true);
    expect(record.save).toHaveBeenCalledOnce();
  });
});
