import { describe, expect, it } from "vitest";
import {
  CurriculumInputError,
  validateCurriculumUpdate,
} from "../src/lib/curriculum-validation.js";
import {
  getPublishedLessons,
  getPublishedModuleSummaries,
} from "../src/lib/lesson-utils.js";

const existingLessonId = "507f1f77bcf86cd799439011";
const secondLessonId = "507f1f77bcf86cd799439012";

function lesson(overrides = {}) {
  return {
    title: "Foundations",
    description: "Lesson overview",
    type: "article",
    content: "Read this authored lesson.",
    videoUrl: "",
    durationMinutes: 10,
    order: 1,
    published: false,
    ...overrides,
  };
}

function module(overrides = {}) {
  return {
    number: "01",
    title: "Foundations",
    description: "",
    lessons: [lesson()],
    ...overrides,
  };
}

describe("curriculum update validation", () => {
  it("accepts new modules and lessons without client-supplied lesson IDs", () => {
    const result = validateCurriculumUpdate(
      { version: 0, modules: [module()] },
      [],
    );

    expect(result).toMatchObject({
      version: 0,
      modules: [{ number: "01", lessons: [{ id: null, order: 1 }] }],
      removedLessonIds: [],
    });
  });

  describe("student-visible curriculum", () => {
    const firstLesson = {
      _id: { toString: () => existingLessonId },
      title: "Published lesson",
      description: "",
      type: "article",
      content: "Published content",
      durationMinutes: 10,
      order: 1,
      published: true,
    };
    const draftLesson = {
      ...firstLesson,
      _id: { toString: () => secondLessonId },
      title: "Draft lesson",
      published: false,
    };
    const course = {
      modules: [
        {
          number: "01",
          title: "Published module",
          description: "Visible",
          lessons: [firstLesson, draftLesson],
        },
        {
          number: "02",
          title: "Draft-only module",
          description: "Hidden until lessons are published",
          lessons: [draftLesson],
        },
      ],
    };

    it("returns only published modules to the public course page", () => {
      expect(getPublishedModuleSummaries(course)).toEqual([
        {
          number: "01",
          title: "Published module",
          description: "Visible",
          lessonCount: 1,
        },
      ]);
    });

    it("returns only published lessons to enrolled student curriculum", () => {
      expect(getPublishedLessons(course).map(({ id, title }) => ({ id, title }))).toEqual([
        { id: existingLessonId, title: "Published lesson" },
      ]);
    });
  });

  it("retains existing lesson IDs while allowing module and lesson reorder", () => {
    const existing = [
      {
        number: "01",
        lessons: [
          { _id: { toString: () => existingLessonId }, order: 1 },
          { _id: { toString: () => secondLessonId }, order: 2 },
        ],
      },
    ];
    const result = validateCurriculumUpdate(
      {
        version: 4,
        modules: [
          module({
            lessons: [
              lesson({ id: secondLessonId, title: "Second", order: 1 }),
              lesson({ id: existingLessonId, title: "First", order: 2 }),
            ],
          }),
          module({
            number: "02",
            title: "Practice",
            lessons: [],
          }),
        ],
      },
      existing,
    );

    expect(result.modules[0].lessons.map(({ id }) => id)).toEqual([
      secondLessonId,
      existingLessonId,
    ]);
    expect(result.removedLessonIds).toEqual([]);
  });

  it("identifies removed lessons without accepting IDs from another course", () => {
    const existing = [
      {
        number: "01",
        lessons: [
          { _id: { toString: () => existingLessonId } },
          { _id: { toString: () => secondLessonId } },
        ],
      },
    ];
    const result = validateCurriculumUpdate(
      {
        version: 1,
        modules: [
          module({
            lessons: [lesson({ id: existingLessonId })],
          }),
        ],
      },
      existing,
    );

    expect(result.removedLessonIds).toEqual([secondLessonId]);
    expect(() =>
      validateCurriculumUpdate(
        {
          version: 1,
          modules: [
            module({ lessons: [lesson({ id: "507f1f77bcf86cd799439099" })] }),
          ],
        },
        existing,
      ),
    ).toThrow(/another course/);
  });

  it("rejects duplicate IDs, duplicate module numbers, and duplicate lesson order", () => {
    const existing = [
      {
        number: "01",
        lessons: [
          { _id: { toString: () => existingLessonId } },
          { _id: { toString: () => secondLessonId } },
        ],
      },
    ];
    const twoExistingLessons = [
      lesson({ id: existingLessonId }),
      lesson({ id: secondLessonId }),
    ];

    expect(() =>
      validateCurriculumUpdate(
        {
          version: 1,
          modules: [
            module({
              lessons: [
                twoExistingLessons[0],
                lesson({ ...twoExistingLessons[0], order: 2 }),
              ],
            }),
          ],
        },
        existing,
      ),
    ).toThrow(/IDs must be unique/);
    expect(() =>
      validateCurriculumUpdate({
        version: 1,
        modules: [module(), module()],
      }),
    ).toThrow(/Module numbers must be unique/);
    expect(() =>
      validateCurriculumUpdate({
        version: 1,
        modules: [
          module({
            lessons: [
              lesson(),
              lesson({ title: "Duplicate order", order: 1 }),
            ],
          }),
        ],
      }),
    ).toThrow(/order values must be unique/);
  });

  it("enforces lesson content, URL, order, and publication validation", () => {
    expect(() =>
      validateCurriculumUpdate({
        version: 1,
        modules: [
          module({
            lessons: [lesson({ published: true, content: "" })],
          }),
        ],
      }),
    ).toThrow(/material/);
    expect(() =>
      validateCurriculumUpdate({
        version: 1,
        modules: [
          module({
            lessons: [
              lesson({
                type: "video",
                videoUrl: "http://example.test/lesson.mp4",
              }),
            ],
          }),
        ],
      }),
    ).toThrow(/HTTPS/);
    expect(() =>
      validateCurriculumUpdate({
        version: 1,
        modules: [
          module({
            lessons: [lesson({ order: -1 })],
          }),
        ],
      }),
    ).toThrow(/order/);
    expect(() =>
      validateCurriculumUpdate({
        version: 1,
        modules: [
          module({
            lessons: [lesson({ published: "true" })],
          }),
        ],
      }),
    ).toThrow(CurriculumInputError);
  });
});
