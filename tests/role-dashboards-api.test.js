import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../src/models/User.js", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
vi.mock("../src/models/Course.js", () => ({
  default: {
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));
vi.mock("../src/models/Enrollment.js", () => ({
  default: {
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

import User from "../src/models/User.js";
import Course from "../src/models/Course.js";
import Enrollment from "../src/models/Enrollment.js";
import { getCurrentUser } from "../src/lib/auth.js";
import { connectToDatabase } from "../src/lib/mongodb.js";
import { connection } from "next/server";
import { GET as getInstructorDashboard } from "../src/app/api/instructor/dashboard/route.js";
import { GET as getInstructorCourses } from "../src/app/api/instructor/courses/route.js";
import {
  GET as getAdminUsers,
  PATCH as updateAdminUserRole,
} from "../src/app/api/admin/users/route.js";

const studentUser = {
  id: "507f1f77bcf86cd799439011",
  name: "Sam Student",
  email: "sam@example.test",
  role: "student",
};

const instructorUser = {
  id: "507f1f77bcf86cd799439022",
  name: "Irene Instructor",
  email: "irene@example.test",
  role: "instructor",
};

const adminUser = {
  id: "507f1f77bcf86cd799439033",
  name: "Alex Admin",
  email: "alex@example.test",
  role: "admin",
};

describe("Role-based Dashboard APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    connectToDatabase.mockResolvedValue(undefined);
    connection.mockResolvedValue(undefined);
  });

  describe("GET /api/instructor/dashboard", () => {
    it("returns 401 when unauthenticated", async () => {
      getCurrentUser.mockResolvedValue(null);
      const res = await getInstructorDashboard();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Authentication required.");
    });

    it("returns 403 when user is a student", async () => {
      getCurrentUser.mockResolvedValue(studentUser);
      const res = await getInstructorDashboard();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Instructor access is required.");
    });

    it("returns 200 with instructor-scoped stats when user is an instructor", async () => {
      getCurrentUser.mockResolvedValue(instructorUser);
      Course.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([{ _id: "c1" }]),
        }),
      });
      Course.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
      Enrollment.countDocuments.mockResolvedValueOnce(18);

      const res = await getInstructorDashboard();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.stats).toEqual({
        totalCourses: 3,
        publishedCourses: 2,
        draftCourses: 1,
        totalEnrollments: 18,
      });
      expect(Course.find).toHaveBeenCalledWith({ instructorId: instructorUser.id });
    });

    it("returns 200 with platform-wide stats when user is an admin", async () => {
      getCurrentUser.mockResolvedValue(adminUser);
      Course.countDocuments.mockResolvedValueOnce(10).mockResolvedValueOnce(7);
      Enrollment.countDocuments.mockResolvedValueOnce(45);

      const res = await getInstructorDashboard();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.stats).toEqual({
        totalCourses: 10,
        publishedCourses: 7,
        draftCourses: 3,
        totalEnrollments: 45,
      });
    });
  });

  describe("GET /api/instructor/courses", () => {
    it("returns 401 when unauthenticated", async () => {
      getCurrentUser.mockResolvedValue(null);
      const res = await getInstructorCourses();
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Authentication required.");
    });

    it("returns 403 when user is a student", async () => {
      getCurrentUser.mockResolvedValue(studentUser);
      const res = await getInstructorCourses();
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBe("Instructor access is required.");
    });

    it("returns 200 with courses filtered by instructorId for instructors", async () => {
      getCurrentUser.mockResolvedValue(instructorUser);
      Course.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: { toString: () => "c1" },
                title: "My Course",
                slug: "my-course",
                description: "Test description",
                category: "Programming",
                instructor: "Irene Instructor",
                instructorId: instructorUser.id,
                price: 1999,
                currency: "INR",
                image: "https://example.com/img.jpg",
                published: false,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                updatedAt: new Date("2026-01-01T00:00:00.000Z"),
              },
            ]),
          }),
        }),
      });

      const res = await getInstructorCourses();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.courses).toHaveLength(1);
      expect(Course.find).toHaveBeenCalledWith({ instructorId: instructorUser.id });
    });

    it("returns 200 with unfiltered courses for admin", async () => {
      getCurrentUser.mockResolvedValue(adminUser);
      Course.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const res = await getInstructorCourses();
      expect(res.status).toBe(200);
      expect(Course.find).toHaveBeenCalledWith({});
    });
  });

  describe("GET /api/admin/users", () => {
    it("returns 401 when unauthenticated", async () => {
      getCurrentUser.mockResolvedValue(null);
      const res = await getAdminUsers();
      expect(res.status).toBe(401);
    });

    it("returns 403 when user is a student", async () => {
      getCurrentUser.mockResolvedValue(studentUser);
      const res = await getAdminUsers();
      expect(res.status).toBe(403);
    });

    it("returns 403 when user is an instructor", async () => {
      getCurrentUser.mockResolvedValue(instructorUser);
      const res = await getAdminUsers();
      expect(res.status).toBe(403);
    });

    it("returns 200 with serialized user list when user is an admin", async () => {
      getCurrentUser.mockResolvedValue(adminUser);
      User.find.mockReturnValue({
        select: vi.fn().mockReturnValue({
          sort: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue([
              {
                _id: { toString: () => "507f1f77bcf86cd799439011" },
                name: "Sam Student",
                email: "sam@example.test",
                username: "sam",
                role: "student",
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
              },
            ]),
          }),
        }),
      });

      const res = await getAdminUsers();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.users).toEqual([
        {
          id: "507f1f77bcf86cd799439011",
          name: "Sam Student",
          email: "sam@example.test",
          username: "sam",
          role: "student",
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ]);
    });
  });

  describe("PATCH /api/admin/users", () => {
    it("returns 401 when unauthenticated", async () => {
      getCurrentUser.mockResolvedValue(null);
      const req = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentUser.id, role: "instructor" }),
      });
      const res = await updateAdminUserRole(req);
      expect(res.status).toBe(401);
    });

    it("returns 403 when user is an instructor", async () => {
      getCurrentUser.mockResolvedValue(instructorUser);
      const req = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentUser.id, role: "instructor" }),
      });
      const res = await updateAdminUserRole(req);
      expect(res.status).toBe(403);
    });

    it("returns 400 for invalid userId or invalid role", async () => {
      getCurrentUser.mockResolvedValue(adminUser);

      const invalidIdReq = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "invalid-id", role: "instructor" }),
      });
      const res1 = await updateAdminUserRole(invalidIdReq);
      expect(res1.status).toBe(400);

      const invalidRoleReq = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentUser.id, role: "superhero" }),
      });
      const res2 = await updateAdminUserRole(invalidRoleReq);
      expect(res2.status).toBe(400);
    });

    it("returns 404 when target user is not found", async () => {
      getCurrentUser.mockResolvedValue(adminUser);
      User.findById.mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentUser.id, role: "instructor" }),
      });
      const res = await updateAdminUserRole(req);
      expect(res.status).toBe(404);
    });

    it("returns 409 when attempting to demote the sole remaining admin", async () => {
      getCurrentUser.mockResolvedValue(adminUser);
      const targetAdmin = {
        _id: { toString: () => adminUser.id },
        name: adminUser.name,
        email: adminUser.email,
        role: "admin",
        save: vi.fn(),
      };
      User.findById.mockResolvedValue(targetAdmin);
      User.countDocuments.mockResolvedValue(0); // 0 other admins

      const req = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUser.id, role: "student" }),
      });
      const res = await updateAdminUserRole(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("Cannot demote the only remaining administrator.");
    });

    it("successfully updates role and saves user when authorized", async () => {
      getCurrentUser.mockResolvedValue(adminUser);
      const targetStudent = {
        _id: { toString: () => studentUser.id },
        name: studentUser.name,
        email: studentUser.email,
        role: "student",
        save: vi.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(targetStudent);

      const req = new Request("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: studentUser.id, role: "instructor" }),
      });
      const res = await updateAdminUserRole(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.message).toBe("User role updated to instructor.");
      expect(targetStudent.role).toBe("instructor");
      expect(targetStudent.save).toHaveBeenCalledOnce();
    });
  });
});
