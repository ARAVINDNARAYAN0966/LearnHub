import { beforeEach, describe, expect, it, vi } from "vitest";

const { Course, connectToDatabase } = vi.hoisted(() => ({
  Course: {
    find: vi.fn(),
    findOne: vi.fn(),
  },
  connectToDatabase: vi.fn(),
}));

vi.mock("../src/models/Course.js", () => ({ default: Course }));
vi.mock("../src/lib/mongodb.js", () => ({ connectToDatabase }));
vi.mock("server-only", () => ({}));

import {
  getPublishedCourseBySlug,
  getPublishedCourses,
} from "../src/lib/course-data.js";

const courseRecord = {
  _id: { toString: () => "507f1f77bcf86cd799439011" },
  title: "MongoDB Course",
  slug: "mongodb-course",
  description: "Course description",
  category: "Database",
  instructor: "Instructor",
  instructorRole: "Engineer",
  price: 2500,
  originalPrice: 3000,
  currency: "INR",
  image: "https://images.example.test/course.jpg",
  duration: "99h",
  lessons: 99,
  rating: 4.5,
  reviews: 10,
  students: "1k",
  level: "Beginner",
  color: "blue",
  learn: [],
  modules: [
    {
      number: "1",
      title: "Basics",
      lessons: [
        {
          _id: "000000000000000000000001",
          title: "Article",
          type: "article",
          content: "Published article",
          durationMinutes: 20,
          order: 0,
          published: true,
        },
        {
          _id: "000000000000000000000002",
          title: "Draft",
          type: "article",
          content: "Draft article",
          durationMinutes: 60,
          order: 1,
          published: false,
        },
      ],
    },
  ],
};

function queryResult(value) {
  const query = {
    select: vi.fn(() => query),
    sort: vi.fn(() => query),
    lean: vi.fn().mockResolvedValue(value),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  connectToDatabase.mockResolvedValue(undefined);
  Course.find.mockReturnValue(queryResult([courseRecord]));
  Course.findOne.mockReturnValue(queryResult(courseRecord));
});

describe("published course totals", () => {
  it("uses the same actual published lesson totals for catalog and detail data", async () => {
    const [catalogCourse] = await getPublishedCourses();
    const detailCourse = await getPublishedCourseBySlug("mongodb-course");

    expect(catalogCourse.lessons).toBe(1);
    expect(catalogCourse.duration).toBe("20m");
    expect(detailCourse.lessons).toBe(catalogCourse.lessons);
    expect(detailCourse.duration).toBe(catalogCourse.duration);
    expect(detailCourse.curriculum).toEqual([
      ["1", "Basics", "", 1],
    ]);
  });
});
