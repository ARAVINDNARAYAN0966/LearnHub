import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/models/Course.js", () => ({
  default: {
    create: vi.fn(),
    deleteOne: vi.fn(),
    exists: vi.fn(),
    find: vi.fn(),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock("../src/lib/course-write-coordination.js", () => ({
  deleteCourseWithCoordination: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/auth.js", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("../src/lib/mongodb.js", () => ({
  connectToDatabase: vi.fn(),
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
import { deleteCourseWithCoordination } from "../src/lib/course-write-coordination.js";
import { getCurrentUser } from "../src/lib/auth.js";
import { connectToDatabase } from "../src/lib/mongodb.js";
import { GET as listCourses, POST as createCourse } from "../src/app/api/admin/courses/route.js";
import {
  DELETE as deleteCourse,
  PATCH as changePublication,
  PUT as updateCourse,
} from "../src/app/api/admin/courses/[courseId]/route.js";

const courseId = "507f1f77bcf86cd799439011";
const courseInput = {
  title: "Learn JavaScript",
  slug: "learn-javascript",
  description: "An introductory programming course.",
  category: "Programming",
  instructor: "Avery Morgan",
  price: 2500,
  image: "https://images.example.test/course.jpg",
  published: false,
};

function storedCourse(overrides = {}) {
  return {
    _id: { toString: () => courseId },
    ...courseInput,
    currency: "INR",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function publishableCourse(overrides = {}) {
  return storedCourse({
    __v: 3,
    modules: [
      {
        number: "1",
        title: "Foundations",
        lessons: [
          {
            _id: "000000000000000000000001",
            title: "Introduction",
            type: "article",
            content: "Published lesson content",
            durationMinutes: 10,
            order: 0,
            published: true,
          },
        ],
      },
    ],
    ...overrides,
  });
}

function queryResult(value) {
  const query = {
    select: vi.fn(() => query),
    sort: vi.fn(() => query),
    session: vi.fn(() => query),
    lean: vi.fn().mockResolvedValue(value),
  };
  return query;
}

function jsonRequest(method, body) {
  return new Request("http://localhost/api/admin/courses", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function routeParams() {
  return { params: Promise.resolve({ courseId }) };
}

async function responseBody(response) {
  return response.json();
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "admin-id", role: "admin" });
  connectToDatabase.mockResolvedValue(undefined);
  Course.exists.mockResolvedValue(null);
  Course.findById.mockReturnValue(queryResult(storedCourse({ published: false })));
  Course.findOneAndUpdate.mockReturnValue(queryResult(storedCourse()));
  Course.deleteOne.mockResolvedValue({ deletedCount: 1 });
  Course.create.mockResolvedValue(storedCourse());
  Course.find.mockReturnValue(queryResult([]));
  deleteCourseWithCoordination.mockResolvedValue({ type: "deleted" });
});

describe("admin course API authorization", () => {
  it("rejects unauthenticated write requests", async () => {
    getCurrentUser.mockResolvedValue(null);
    const route = routeParams();

    const responses = await Promise.all([
      createCourse(jsonRequest("POST", courseInput)),
      updateCourse(jsonRequest("PUT", courseInput), route),
      changePublication(jsonRequest("PATCH", { published: true }), route),
      deleteCourse(new Request("http://localhost"), route),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401,
    ]);
    expect(Course.create).not.toHaveBeenCalled();
    expect(Course.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Course.deleteOne).not.toHaveBeenCalled();
  });

  it("rejects students from create, update, publish, and delete operations", async () => {
    getCurrentUser.mockResolvedValue({ id: "student-id", role: "student" });
    const route = routeParams();

    const responses = await Promise.all([
      createCourse(jsonRequest("POST", courseInput)),
      updateCourse(jsonRequest("PUT", courseInput), route),
      changePublication(jsonRequest("PATCH", { published: true }), route),
      deleteCourse(new Request("http://localhost"), route),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      403, 403, 403, 403,
    ]);
    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Course.create).not.toHaveBeenCalled();
    expect(Course.findOneAndUpdate).not.toHaveBeenCalled();
    expect(Course.deleteOne).not.toHaveBeenCalled();
  });
});

describe("admin course API operations", () => {
  it("lists all MongoDB courses without filtering out drafts", async () => {
    const records = [
      storedCourse({ published: true }),
      storedCourse({
        _id: { toString: () => "507f1f77bcf86cd799439012" },
        slug: "draft-course",
        published: false,
      }),
    ];
    Course.find.mockReturnValue(queryResult(records));

    const response = await listCourses();

    expect(response.status).toBe(200);
    expect((await responseBody(response)).courses).toHaveLength(2);
    expect(Course.find).toHaveBeenCalledWith({});
  });

  it("creates a course with validated details and model defaults", async () => {
    const response = await createCourse(jsonRequest("POST", courseInput));

    expect(response.status).toBe(201);
    expect(Course.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: courseInput.title,
        slug: courseInput.slug,
        price: 2500,
        currency: "INR",
        published: false,
        originalPrice: 2500,
        modules: [],
      }),
    );
  });

  it("does not create a course directly in published state", async () => {
    const response = await createCourse(
      jsonRequest("POST", { ...courseInput, published: true }),
    );

    expect(response.status).toBe(409);
    expect(Course.create).not.toHaveBeenCalled();
  });

  it("rejects duplicate slugs before creating a course", async () => {
    Course.exists.mockResolvedValue({ _id: courseId });

    const response = await createCourse(jsonRequest("POST", courseInput));

    expect(response.status).toBe(409);
    expect((await responseBody(response)).fieldErrors.slug).toBeTruthy();
    expect(Course.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input without writing to MongoDB", async () => {
    const response = await createCourse(
      jsonRequest("POST", { ...courseInput, price: 2500.5 }),
    );

    expect(response.status).toBe(400);
    expect((await responseBody(response)).fieldErrors.price).toBeTruthy();
    expect(Course.create).not.toHaveBeenCalled();
  });

  it("updates existing course details", async () => {
    Course.findOneAndUpdate.mockReturnValue(queryResult(storedCourse()));

    const response = await updateCourse(
      jsonRequest("PUT", { ...courseInput, title: "Updated JavaScript" }),
      routeParams(),
    );

    expect(response.status).toBe(200);
    expect(Course.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: courseId },
      {
        $set: expect.objectContaining({
          title: "Updated JavaScript",
          currency: "INR",
        }),
      },
      { new: true, runValidators: true },
    );
  });

  it("persists publish and unpublish changes through the course model", async () => {
    Course.findById.mockReturnValue(queryResult(publishableCourse()));
    Course.findOneAndUpdate.mockReturnValue(
      queryResult(storedCourse({ published: true })),
    );

    const response = await changePublication(
      jsonRequest("PATCH", { published: true }),
      routeParams(),
    );

    expect(response.status).toBe(200);
    expect(Course.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: courseId,
        __v: 3,
      }),
      { $set: { published: true }, $inc: { __v: 1 } },
      { new: true, runValidators: true },
    );
  });

  it("rejects publishing a course without valid published lessons", async () => {
    Course.findById.mockReturnValue(
      queryResult(storedCourse({ modules: [], __v: 0 })),
    );

    const response = await changePublication(
      jsonRequest("PATCH", { published: true }),
      routeParams(),
    );

    expect(response.status).toBe(409);
    expect(Course.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects publishing through course updates without valid lessons", async () => {
    Course.findById.mockReturnValue(
      queryResult(storedCourse({ modules: [], __v: 0 })),
    );

    const response = await updateCourse(
      jsonRequest("PUT", { ...courseInput, published: true }),
      routeParams(),
    );

    expect(response.status).toBe(409);
    expect(Course.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("persists unpublishing without requiring a valid curriculum", async () => {
    Course.findOneAndUpdate.mockReturnValue(
      queryResult(storedCourse({ published: false })),
    );

    const response = await changePublication(
      jsonRequest("PATCH", { published: false }),
      routeParams(),
    );

    expect(response.status).toBe(200);
    expect(Course.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: courseId },
      { $set: { published: false } },
      { new: true, runValidators: true },
    );
  });

  it.each([
    [
      "enrollments",
      { type: "dependencies", enrollments: 1, lessonProgress: 0 },
    ],
    [
      "lesson progress",
      { type: "dependencies", enrollments: 0, lessonProgress: 1 },
    ],
  ])("blocks deletion when %s exist", async (dependencyName, outcome) => {
    deleteCourseWithCoordination.mockResolvedValueOnce(outcome);

    const response = await deleteCourse(
      new Request("http://localhost"),
      routeParams(),
    );

    expect(response.status).toBe(409);
    expect((await responseBody(response)).error).toContain(
      "cannot be deleted",
    );
    expect(Course.deleteOne).not.toHaveBeenCalled();
  });

  it("requires published courses to be unpublished before deletion", async () => {
    deleteCourseWithCoordination.mockResolvedValueOnce({ type: "published" });

    const response = await deleteCourse(
      new Request("http://localhost"),
      routeParams(),
    );

    expect(response.status).toBe(409);
    expect(Course.deleteOne).not.toHaveBeenCalled();
  });

  it("deletes only an unpublished course with no dependent records", async () => {
    const response = await deleteCourse(
      new Request("http://localhost"),
      routeParams(),
    );

    expect(response.status).toBe(200);
    expect(deleteCourseWithCoordination).toHaveBeenCalledWith(courseId);
  });
});
