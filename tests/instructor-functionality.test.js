import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../src/models/User.js", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}));
vi.mock("../src/models/Course.js", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
vi.mock("../src/models/Enrollment.js", () => ({
  default: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
vi.mock("../src/lib/auth.js", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("../src/lib/mongodb.js", () => ({
  connectToDatabase: vi.fn(),
  isDatabaseConnectionError: vi.fn(() => false),
}));
vi.mock("next/server", () => ({
  connection: vi.fn(),
}));
vi.mock("../src/lib/auth-http.js", () => ({
  authJson: (body, status = 200) =>
    Response.json(body, {
      status,
      headers: { "Cache-Control": "no-store" },
    }),
  logAuthFailure: vi.fn(),
}));

import Course from "../src/models/Course.js";
import Enrollment from "../src/models/Enrollment.js";
import { getCurrentUser } from "../src/lib/auth.js";
import { connectToDatabase } from "../src/lib/mongodb.js";
import { connection } from "next/server";
import { GET as getInstructorEnrollments } from "../src/app/api/instructor/enrollments/route.js";
import {
  AdminCourseInputError,
  validateAdminCourseInput,
  createCourseDocument,
} from "../src/lib/admin-course-validation.js";
import { serializeAdminCourse } from "../src/lib/admin-course-data.js";

const instructorId = "507f1f77bcf86cd799439011";
const otherInstructorId = "507f1f77bcf86cd799439099";
const myCourseId = "507f1f77bcf86cd799439022";
const otherCourseId = "507f1f77bcf86cd799439033";

const studentUser = {
  id: "507f1f77bcf86cd799439001",
  name: "Student Sam",
  email: "student@example.test",
  role: "student",
};

const instructorUser = {
  id: instructorId,
  name: "Instructor Irene",
  email: "instructor@example.test",
  role: "instructor",
};

const adminUser = {
  id: "507f1f77bcf86cd799439003",
  name: "Admin Alex",
  email: "admin@example.test",
  role: "admin",
};

const validCoursePayload = {
  title: "Full-Stack Web Engineering",
  slug: "full-stack-web-engineering",
  description: "A comprehensive guide to building scalable web apps.",
  category: "Development",
  instructor: "Instructor Irene",
  price: 1500,
  image: "https://images.example.test/course.jpg",
  published: false,
};

describe("Instructor Functionality & Enrollment Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectToDatabase.mockResolvedValue(undefined);
    connection.mockResolvedValue(undefined);
  });

  describe("GET /api/instructor/enrollments authorization and ownership", () => {
    it("returns 401 when unauthenticated", async () => {
      getCurrentUser.mockResolvedValue(null);
      const req = new Request("http://localhost:3000/api/instructor/enrollments");
      const res = await getInstructorEnrollments(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Authentication required.");
    });

    it("returns 403 when accessed by a student", async () => {
      getCurrentUser.mockResolvedValue(studentUser);
      const req = new Request("http://localhost:3000/api/instructor/enrollments");
      const res = await getInstructorEnrollments(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Instructor access is required.");
    });

    it("restricts instructor to only their own courses", async () => {
      getCurrentUser.mockResolvedValue(instructorUser);

      // Course.find mock returns only courses owned by instructorUser.id
      Course.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            {
              _id: myCourseId,
              title: "My React Course",
              slug: "my-react-course",
              modules: [
                {
                  lessons: [
                    { published: true },
                    { published: true },
                  ],
                },
              ],
            },
          ]),
        }),
      });

      Enrollment.find.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([
                {
                  _id: "e1",
                  user: { _id: "u1", name: "Alice", email: "alice@example.test" },
                  course: {
                    _id: myCourseId,
                    title: "My React Course",
                    slug: "my-react-course",
                    modules: [{ lessons: [{ published: true }, { published: true }] }],
                  },
                  enrolledAt: new Date("2026-02-01"),
                  status: "active",
                  progressPercentage: 50,
                  completedLessons: 1,
                },
              ]),
            }),
          }),
        }),
      });

      const req = new Request("http://localhost:3000/api/instructor/enrollments");
      const res = await getInstructorEnrollments(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.total).toBe(1);
      expect(data.enrollments[0]).toMatchObject({
        studentName: "Alice",
        studentEmail: "alice@example.test",
        courseTitle: "My React Course",
        progressPercentage: 50,
        completedLessons: 1,
        totalLessons: 2,
        status: "active",
      });
      // Verify query strictly filtered by instructor's courseId
      expect(Course.find).toHaveBeenCalledWith({ instructorId });
    });

    it("denies access with 403 when instructor requests enrollments for a course they do not own", async () => {
      getCurrentUser.mockResolvedValue(instructorUser);

      // Instructor only owns myCourseId
      Course.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: myCourseId, title: "My Course", slug: "my-course" },
          ]),
        }),
      });

      // Requesting otherCourseId
      const req = new Request(
        `http://localhost:3000/api/instructor/enrollments?courseId=${otherCourseId}`,
      );
      const res = await getInstructorEnrollments(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toContain("not authorized");
    });

    it("returns 400 for an invalid courseId parameter", async () => {
      getCurrentUser.mockResolvedValue(instructorUser);
      const req = new Request(
        "http://localhost:3000/api/instructor/enrollments?courseId=not-a-valid-id",
      );
      const res = await getInstructorEnrollments(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("A valid course ID is required.");
    });

    it("allows admin full visibility without instructorId restriction", async () => {
      getCurrentUser.mockResolvedValue(adminUser);

      Course.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([
            { _id: myCourseId, title: "Course 1", slug: "c1", modules: [] },
            { _id: otherCourseId, title: "Course 2", slug: "c2", modules: [] },
          ]),
        }),
      });

      Enrollment.find.mockReturnValue({
        populate: vi.fn().mockReturnValue({
          populate: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      const req = new Request("http://localhost:3000/api/instructor/enrollments");
      const res = await getInstructorEnrollments(req);
      expect(res.status).toBe(200);
      // Admin queries all courses without filtering by instructorId
      expect(Course.find).toHaveBeenCalledWith({});
    });
  });

  describe("Course Level and Metadata Validation", () => {
    it("validates and preserves custom course level", () => {
      const input = validateAdminCourseInput({
        ...validCoursePayload,
        level: "Intermediate",
      });

      expect(input.level).toBe("Intermediate");
      const doc = createCourseDocument(input);
      expect(doc.level).toBe("Intermediate");
    });

    it("defaults level to 'All Levels' when empty string or whitespace is provided", () => {
      const input = validateAdminCourseInput({
        ...validCoursePayload,
        level: "   ",
      });

      expect(input.level).toBe("All Levels");
    });

    it("rejects non-string level or level exceeding 50 characters", () => {
      expect(() =>
        validateAdminCourseInput({
          ...validCoursePayload,
          level: 12345,
        }),
      ).toThrow(AdminCourseInputError);

      expect(() =>
        validateAdminCourseInput({
          ...validCoursePayload,
          level: "a".repeat(51),
        }),
      ).toThrow(/50 characters/);
    });

    it("serializes level correctly in serializeAdminCourse", () => {
      const serialized = serializeAdminCourse({
        _id: { toString: () => myCourseId },
        ...validCoursePayload,
        level: "Advanced",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-02-01"),
      });

      expect(serialized.level).toBe("Advanced");
    });
  });
});
