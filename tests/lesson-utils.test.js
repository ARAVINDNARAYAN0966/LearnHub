import { describe, expect, it } from "vitest";
import {
  getPublishedLessons,
  summarizeLessonProgress,
} from "../src/lib/lesson-utils.js";

const sampleCourse = {
  lessons: 48,
  modules: [
    {
      number: "01",
      title: "Foundations",
      summary: "Existing module summary",
      lessons: [
        {
          _id: "000000000000000000000002",
          title: "Second lesson",
          type: "article",
          durationMinutes: 20,
          order: 2,
          published: true,
        },
        {
          _id: "000000000000000000000001",
          title: "Draft lesson",
          type: "video",
          durationMinutes: 15,
          order: 1,
          published: false,
        },
        {
          _id: "000000000000000000000003",
          title: "First lesson",
          type: "video",
          durationMinutes: 10,
          order: 1,
          published: true,
        },
      ],
    },
  ],
};

describe("lesson data and progress summaries", () => {
  it("uses only published lesson records in module order", () => {
    const lessons = getPublishedLessons(sampleCourse);

    expect(lessons.map((lesson) => lesson.title)).toEqual([
      "First lesson",
      "Second lesson",
    ]);
    expect(lessons[0].moduleDescription).toBe("Existing module summary");
    expect(lessons).toHaveLength(2);
  });

  it("calculates progress and completed lesson duration from persisted records", () => {
    const lessons = getPublishedLessons(sampleCourse);
    const progress = summarizeLessonProgress(lessons, [
      {
        lessonId: lessons[0].id,
        completed: true,
        completedAt: new Date("2025-01-01T00:00:00.000Z"),
        lastAccessedAt: new Date("2025-01-01T00:00:00.000Z"),
      },
    ]);

    expect(progress.completedLessons).toBe(1);
    expect(progress.totalPublishedLessons).toBe(2);
    expect(progress.progressPercentage).toBe(50);
    expect(progress.completedLearningMinutes).toBe(10);
    expect(progress.continueLessonId).toBe(lessons[1].id);
  });

  it("reports full course completion when every published lesson is complete", () => {
    const lessons = getPublishedLessons(sampleCourse);
    const progress = summarizeLessonProgress(
      lessons,
      lessons.map((lesson) => ({
        lessonId: lesson.id,
        completed: true,
        completedAt: new Date("2025-01-01T00:00:00.000Z"),
        lastAccessedAt: new Date("2025-01-01T00:00:00.000Z"),
      })),
    );

    expect(progress.completedLessons).toBe(2);
    expect(progress.progressPercentage).toBe(100);
    expect(progress.completedLearningMinutes).toBe(30);
  });

  it("returns zero progress when no published lesson records exist", () => {
    const progress = summarizeLessonProgress([], []);

    expect(progress.totalPublishedLessons).toBe(0);
    expect(progress.completedLessons).toBe(0);
    expect(progress.progressPercentage).toBe(0);
    expect(progress.continueLessonId).toBeNull();
  });
});
