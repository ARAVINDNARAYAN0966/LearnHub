import { describe, expect, it } from "vitest";
import {
  getEnrollmentDisplayStatus,
  getCoursePublicationReadiness,
  getPublishedLessons,
  getPublishedModuleSummaries,
  getPublishedLessonStats,
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
          content: "Article content",
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
          videoUrl: "https://video.example.test/lesson.mp4",
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

  it("derives displayed course totals from valid published lessons", () => {
    expect(
      getPublishedLessonStats({
        ...sampleCourse,
        lessons: 48,
        duration: "99h",
      }),
    ).toEqual({ lessons: 2, duration: "30m" });
    expect(
      getPublishedLessonStats({
        modules: [
          {
            lessons: [
              {
                _id: "000000000000000000000005",
                title: "One hour lesson",
                type: "article",
                content: "Content",
                durationMinutes: 60,
                order: 1,
                published: true,
              },
            ],
          },
        ],
      }),
    ).toEqual({ lessons: 1, duration: "1h" });
  });

  it("requires published lessons to have valid authored material", () => {
    expect(getCoursePublicationReadiness({ modules: [] }).ready).toBe(false);
    expect(
      getCoursePublicationReadiness({
        modules: [
          {
            lessons: [
              {
                _id: "000000000000000000000006",
                title: "Empty lesson",
                type: "article",
                content: "  ",
                durationMinutes: 10,
                order: 1,
                published: true,
              },
            ],
          },
        ],
      }).ready,
    ).toBe(false);
    expect(
      getCoursePublicationReadiness({
        modules: [
          {
            lessons: [
              ...sampleCourse.modules[0].lessons,
              {
                _id: "000000000000000000000007",
                title: "Published but empty",
                type: "article",
                content: "",
                durationMinutes: 5,
                order: 3,
                published: true,
              },
            ],
          },
        ],
      }).ready,
    ).toBe(false);
    expect(getCoursePublicationReadiness(sampleCourse).ready).toBe(true);
  });

  it("shows modules only when they contain published lessons", () => {
    const summaries = getPublishedModuleSummaries({
      modules: [
        sampleCourse.modules[0],
        {
          number: "02",
          title: "Draft module",
          lessons: [
            {
              _id: "000000000000000000000004",
              title: "Unpublished",
              published: false,
            },
          ],
        },
      ],
    });

    expect(summaries).toEqual([
      {
        number: "01",
        title: "Foundations",
        description: "Existing module summary",
        lessonCount: 2,
      },
    ]);
  });

  it("reflects newly published lessons in a formerly completed enrollment", () => {
    expect(
      getEnrollmentDisplayStatus("completed", {
        completedLessons: 1,
        totalPublishedLessons: 2,
      }),
    ).toBe("active");
    expect(
      getEnrollmentDisplayStatus("active", {
        completedLessons: 2,
        totalPublishedLessons: 2,
      }),
    ).toBe("completed");
  });
});
