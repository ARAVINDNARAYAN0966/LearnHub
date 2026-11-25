/**
 * Tests for /api/enrollments
 *
 * Verifies authentication, validation, paid vs free course handling (402 Payment Required).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("../src/lib/mongodb", () => ({
  connectToDatabase: vi.fn().mockResolvedValue(undefined),
  isDatabaseConnectionError: vi.fn((e) => e?.__isDbError === true),
}));

vi.mock("../src/lib/auth", () => ({
  getCurrentUser: vi.fn().mockResolvedValue(null),
}));

vi.mock("../src/lib/auth-http", () => ({
  authJson: vi.fn((body, status = 200) => ({ body, status })),
  logAuthFailure: vi.fn(),
}));

vi.mock("../src/models/Course", () => ({
  default: {
    findById: vi.fn(),
  },
}));

vi.mock("../src/models/Enrollment", () => ({
  default: {
    findOne: vi.fn(),
  },
}));

vi.mock("../src/lib/course-write-coordination", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createCourseEnrollment: vi.fn(),
  };
});

vi.mock("../src/lib/enrollment-data", () => ({
  getUserEnrollments: vi.fn(),
}));

import { getCurrentUser } from "../src/lib/auth";
import Course from "../src/models/Course";
import { createCourseEnrollment } from "../src/lib/course-write-coordination";
import { getUserEnrollments } from "../src/lib/enrollment-data";
import { GET, POST } from "../src/app/api/enrollments/route";

const VALID_COURSE_ID = "c".repeat(24);
const VALID_USER_ID = "u".repeat(24);

describe("POST /api/enrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    const req = {
      json: vi.fn().mockResolvedValue({ courseId: VALID_COURSE_ID }),
    };

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentication required/i);
  });

  it("returns 400 when courseId is missing or invalid", async () => {
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, role: "student" });
    const req = {
      json: vi.fn().mockResolvedValue({ courseId: "invalid-id" }),
    };

    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid course ID/i);
  });

  it("returns 404 when course is not found or not published", async () => {
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, role: "student" });
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });

    const req = {
      json: vi.fn().mockResolvedValue({ courseId: VALID_COURSE_ID }),
    };

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("returns 402 Payment Required for paid courses (price > 0)", async () => {
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, role: "student" });
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: VALID_COURSE_ID,
          price: 2499,
          published: true,
          deleting: false,
        }),
      }),
    });

    const req = {
      json: vi.fn().mockResolvedValue({ courseId: VALID_COURSE_ID }),
    };

    const res = await POST(req);
    expect(res.status).toBe(402);
    expect(res.body.paymentUnavailable).toBe(true);
    expect(res.body.error).toMatch(/payment gateway is configured/i);
  });

  it("allows enrollment for free courses (price === 0)", async () => {
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, role: "student" });
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: VALID_COURSE_ID,
          price: 0,
          published: true,
          deleting: false,
        }),
      }),
    });

    createCourseEnrollment.mockResolvedValue({
      _id: "e".repeat(24),
      course: VALID_COURSE_ID,
      enrolledAt: new Date("2026-01-01T00:00:00Z"),
      status: "active",
      progressPercentage: 0,
      completedLessons: 0,
    });

    const req = {
      json: vi.fn().mockResolvedValue({ courseId: VALID_COURSE_ID }),
    };

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(res.body.enrollment.status).toBe("active");
  });
});

describe("GET /api/enrollments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns enrollments when authenticated", async () => {
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, role: "student" });
    getUserEnrollments.mockResolvedValue([
      { id: "e1", courseId: VALID_COURSE_ID },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.body.enrollments).toHaveLength(1);
  });
});
