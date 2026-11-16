import { describe, expect, it } from "vitest";
import {
  AdminCourseInputError,
  createCourseDocument,
  validateAdminCourseInput,
  validateAdminCoursePublication,
} from "../src/lib/admin-course-validation.js";

const validCourse = (overrides = {}) => ({
  title: "Learn JavaScript",
  slug: "learn-javascript",
  description: "An introductory programming course.",
  category: "Programming",
  instructor: "Avery Morgan",
  price: 2500,
  image: "https://images.example.test/course.jpg",
  published: false,
  ...overrides,
});

describe("admin course validation", () => {
  it("normalizes the slug and restricts currency to INR", () => {
    expect(
      validateAdminCourseInput(validCourse({ slug: "LEARN-JAVASCRIPT" })),
    ).toMatchObject({
      slug: "learn-javascript",
      price: 2500,
      currency: "INR",
      published: false,
    });
  });

  it("rejects malformed or unsupported course fields", () => {
    const invalidInputs = [
      validCourse({ title: " " }),
      validCourse({ slug: "not a slug" }),
      validCourse({ category: "x".repeat(81) }),
      validCourse({ instructor: "" }),
      validCourse({ image: "http://images.example.test/course.jpg" }),
      validCourse({ image: "https://user:pass@images.example.test/course.jpg" }),
      validCourse({ price: -1 }),
      validCourse({ price: 2.5 }),
      validCourse({ published: "true" }),
      { ...validCourse(), passwordHash: "unexpected" },
    ];

    invalidInputs.forEach((input) => {
      expect(() => validateAdminCourseInput(input)).toThrow(
        AdminCourseInputError,
      );
    });
  });

  it("uses honest neutral defaults for model-required fields omitted by the form", () => {
    const input = validateAdminCourseInput(validCourse());

    expect(createCourseDocument(input)).toMatchObject({
      originalPrice: input.price,
      instructorRole: "Instructor",
      duration: "0h",
      lessons: 0,
      rating: 0,
      reviews: 0,
      students: "0",
      level: "Not specified",
      learn: [],
      modules: [],
    });
  });

  it("accepts only a boolean publication update", () => {
    expect(validateAdminCoursePublication({ published: true })).toEqual({
      published: true,
    });
    expect(() =>
      validateAdminCoursePublication({ published: true, title: "Changed" }),
    ).toThrow(/unsupported|only contain/i);
    expect(() =>
      validateAdminCoursePublication({ published: 1 }),
    ).toThrow(AdminCourseInputError);
  });
});
