import { describe, expect, it } from "vitest";
import {
  getCurriculumAccess,
  getCurriculumManagementAccess,
} from "../src/lib/curriculum-policy.js";
import {
  CurriculumInputError,
  validateCurriculumAppend,
} from "../src/lib/curriculum-validation.js";

const draftLesson = (overrides = {}) => ({
  title: "Authored lesson",
  type: "article",
  content: "Genuine authored content",
  durationMinutes: 10,
  order: 1,
  ...overrides,
});

describe("curriculum authorization", () => {
  it("denies unauthenticated and non-enrolled users", () => {
    expect(getCurriculumAccess(null, null)).toMatchObject({
      allowed: false,
      status: 401,
    });
    expect(
      getCurriculumAccess({ id: "student-id" }, { status: "cancelled" }),
    ).toMatchObject({ allowed: false, status: 403 });
    expect(getCurriculumAccess({ id: "student-id" }, null)).toMatchObject({
      allowed: false,
      status: 403,
    });
  });

  it("allows active and completed students, but restricts curriculum management to admins", () => {
    const student = { id: "student-id", role: "student" };
    expect(getCurriculumAccess(student, { status: "active" }).allowed).toBe(
      true,
    );
    expect(getCurriculumAccess(student, { status: "completed" }).allowed).toBe(
      true,
    );
    expect(getCurriculumManagementAccess(student)).toMatchObject({
      allowed: false,
      status: 403,
    });
    expect(
      getCurriculumManagementAccess({ id: "admin-id", role: "admin" }).allowed,
    ).toBe(true);
  });
});

describe("append-only curriculum input validation", () => {
  it("defaults new lessons to unpublished and accepts supported lesson types", () => {
    const result = validateCurriculumAppend({
      moduleNumber: "01",
      moduleTitle: "Authored module",
      lessons: [
        draftLesson(),
        draftLesson({ title: "Video lesson", type: "video", order: 2 }),
        draftLesson({ title: "Quiz lesson", type: "quiz", order: 3 }),
      ],
    });

    expect(result.lessons.map((lesson) => lesson.published)).toEqual([
      false,
      false,
      false,
    ]);
    expect(result.lessons.map((lesson) => lesson.type)).toEqual([
      "article",
      "video",
      "quiz",
    ]);
  });

  it("rejects malformed types, duplicate order values, and unsafe video URLs", () => {
    expect(() =>
      validateCurriculumAppend({
        moduleNumber: "01",
        moduleTitle: "Authored module",
        lessons: [draftLesson({ type: "external" })],
      }),
    ).toThrow(CurriculumInputError);

    expect(() =>
      validateCurriculumAppend({
        moduleNumber: "01",
        moduleTitle: "Authored module",
        lessons: [draftLesson(), draftLesson({ title: "Duplicate order" })],
      }),
    ).toThrow(/unique/);

    expect(() =>
      validateCurriculumAppend({
        moduleNumber: "01",
        moduleTitle: "Authored module",
        lessons: [
          draftLesson({
            type: "video",
            videoUrl: "http://example.test/video",
          }),
        ],
      }),
    ).toThrow(/HTTPS/);

    expect(() =>
      validateCurriculumAppend({
        moduleNumber: "01",
        moduleTitle: "Authored module",
        userId: "another-user",
        lessons: [draftLesson()],
      }),
    ).toThrow(/unsupported fields/);

    expect(() =>
      validateCurriculumAppend({
        moduleNumber: "01",
        moduleTitle: "Authored module",
        lessons: [draftLesson({ durationMinutes: -1 })],
      }),
    ).toThrow(/duration/);
  });

  it("requires material before publishing and preserves existing module metadata", () => {
    expect(() =>
      validateCurriculumAppend({
        moduleNumber: "01",
        moduleTitle: "Authored module",
        lessons: [draftLesson({ content: "", published: true })],
      }),
    ).toThrow(/material/);

    expect(() =>
      validateCurriculumAppend(
        {
          moduleNumber: "01",
          moduleTitle: "Changed title",
          lessons: [draftLesson({ order: 2 })],
        },
        { number: "01", lessons: [{ order: 1 }] },
      ),
    ).toThrow(/cannot be changed/);

    expect(() =>
      validateCurriculumAppend(
        {
          moduleNumber: "01",
          lessons: [draftLesson({ order: 1 })],
        },
        { number: "01", lessons: [{ order: 1 }] },
      ),
    ).toThrow(/unique/);
  });
});
