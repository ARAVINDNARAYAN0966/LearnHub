import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("../src/models/Course.js", () => ({
  default: {
    findById: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock("../src/models/LessonProgress.js", () => ({
  default: { countDocuments: vi.fn() },
}));
vi.mock("../src/lib/auth.js", () => ({
  getCurrentUser: vi.fn(),
}));
vi.mock("../src/lib/mongodb.js", () => ({
  connectToDatabase: vi.fn(),
}));
vi.mock("../src/lib/auth-http.js", () => ({
  authJson: (body, status = 200) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } }),
  logAuthFailure: vi.fn(),
}));

import Course from "../src/models/Course.js";
import LessonProgress from "../src/models/LessonProgress.js";
import { getCurrentUser } from "../src/lib/auth.js";
import { connectToDatabase } from "../src/lib/mongodb.js";
import {
  GET as getCurriculum,
  POST as appendCurriculum,
  PUT as updateCurriculum,
} from "../src/app/api/admin/courses/[courseId]/curriculum/route.js";

const courseId = "507f1f77bcf86cd799439001";
const firstLessonId = "507f1f77bcf86cd799439011";
const secondLessonId = "507f1f77bcf86cd799439012";

function objectId(value) {
  return new mongoose.Types.ObjectId(value);
}

function queryResult(value) {
  const query = {
    select: vi.fn(() => query),
    lean: vi.fn().mockResolvedValue(value),
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return query;
}

function existingCourse(modules = [], version = 3) {
  return {
    _id: objectId(courseId),
    title: "Learn JavaScript",
    slug: "learn-javascript",
    __v: version,
    modules,
  };
}

function existingLesson(id, order, overrides = {}) {
  return {
    _id: objectId(id),
    title: `Lesson ${order}`,
    description: "",
    type: "article",
    content: `Lesson material ${order}`,
    videoUrl: "",
    durationMinutes: 10,
    order,
    published: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides,
  };
}

function curriculumModule(overrides = {}) {
  return {
    number: "01",
    title: "Foundations",
    description: "",
    lessons: [
      {
        title: "New lesson",
        description: "",
        type: "article",
        content: "Authored lesson material",
        videoUrl: "",
        durationMinutes: 10,
        order: 1,
        published: false,
      },
    ],
    ...overrides,
  };
}

function jsonRequest(method, body) {
  return new Request(
    `http://localhost/api/admin/courses/${courseId}/curriculum`,
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function routeParams() {
  return { params: Promise.resolve({ courseId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUser.mockResolvedValue({ id: "admin-id", role: "admin" });
  connectToDatabase.mockResolvedValue(undefined);
  Course.findById.mockReturnValue(queryResult(existingCourse()));
  Course.updateOne.mockResolvedValue({ matchedCount: 1 });
  LessonProgress.countDocuments.mockResolvedValue(0);
});

describe("admin curriculum API access", () => {
  it("rejects unauthenticated curriculum writes", async () => {
    getCurrentUser.mockResolvedValue(null);

    const responses = await Promise.all([
      appendCurriculum(
        jsonRequest("POST", {
          moduleNumber: "01",
          moduleTitle: "Foundations",
          lessons: [],
        }),
        routeParams(),
      ),
      updateCurriculum(jsonRequest("PUT", { version: 3, modules: [] }), routeParams()),
    ]);

    expect(responses.map((response) => response.status)).toEqual([401, 401]);
    expect(Course.updateOne).not.toHaveBeenCalled();
  });

  it("rejects student curriculum writes", async () => {
    getCurrentUser.mockResolvedValue({ id: "student-id", role: "student" });

    const responses = await Promise.all([
      appendCurriculum(
        jsonRequest("POST", {
          moduleNumber: "01",
          moduleTitle: "Foundations",
          lessons: [],
        }),
        routeParams(),
      ),
      updateCurriculum(jsonRequest("PUT", { version: 3, modules: [] }), routeParams()),
    ]);

    expect(responses.map((response) => response.status)).toEqual([403, 403]);
    expect(connectToDatabase).not.toHaveBeenCalled();
    expect(Course.updateOne).not.toHaveBeenCalled();
  });
});

describe("admin curriculum API updates", () => {
  it("returns existing modules, lessons, publication states, and stable lesson IDs", async () => {
    const lesson = existingLesson(firstLessonId, 1, { published: true });
    Course.findById.mockReturnValue(
      queryResult(
        existingCourse([
          {
            number: "01",
            title: "Foundations",
            description: "",
            summary: "",
            lessons: [lesson],
          },
        ]),
      ),
    );

    const response = await getCurriculum(new Request("http://localhost"), routeParams());

    expect(response.status).toBe(200);
    expect((await response.json()).curriculum).toMatchObject({
      version: 3,
      modules: [
        {
          number: "01",
          lessons: [{ id: firstLessonId, published: true }],
        },
      ],
    });
  });

  it("creates modules and lessons with server-generated IDs", async () => {
    const response = await updateCurriculum(
      jsonRequest("PUT", { version: 3, modules: [curriculumModule()] }),
      routeParams(),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      curriculum: { version: 4 },
    });
    const savedModules = Course.updateOne.mock.calls[0][1].$set.modules;
    expect(savedModules).toHaveLength(1);
    expect(savedModules[0].lessons[0]._id).toBeInstanceOf(
      mongoose.Types.ObjectId,
    );
    expect(Course.updateOne.mock.calls[0][1].$inc).toEqual({ __v: 1 });
  });

  it("supports legacy courses whose version key is not stored yet", async () => {
    const course = existingCourse([], 0);
    delete course.__v;
    Course.findById.mockReturnValue(queryResult(course));

    const response = await updateCurriculum(
      jsonRequest("PUT", { version: 0, modules: [curriculumModule()] }),
      routeParams(),
    );

    expect(response.status).toBe(200);
    expect(Course.updateOne.mock.calls[0][0].$or).toEqual([
      { __v: 0 },
      { __v: { $exists: false } },
    ]);
  });

  it("edits and reorders modules and lessons without changing lesson IDs", async () => {
    const modules = [
      {
        number: "01",
        title: "Foundations",
        description: "",
        lessons: [
          existingLesson(firstLessonId, 1),
          existingLesson(secondLessonId, 2),
        ],
      },
      {
        number: "02",
        title: "Practice",
        description: "",
        lessons: [],
      },
    ];
    Course.findById.mockReturnValue(queryResult(existingCourse(modules)));

    const response = await updateCurriculum(
      jsonRequest("PUT", {
        version: 3,
        modules: [
          { ...curriculumModule({ number: "02", title: "Practice revised", lessons: [] }) },
          {
            ...curriculumModule({
              number: "01",
              title: "Foundations revised",
              lessons: [
                {
                  ...curriculumModule().lessons[0],
                  id: secondLessonId,
                  title: "Second",
                  order: 1,
                },
                {
                  ...curriculumModule().lessons[0],
                  id: firstLessonId,
                  title: "First",
                  order: 2,
                },
              ],
            }),
          },
        ],
      }),
      routeParams(),
    );

    expect(response.status).toBe(200);
    const savedModules = Course.updateOne.mock.calls[0][1].$set.modules;
    expect(savedModules.map(({ number }) => number)).toEqual(["02", "01"]);
    expect(
      savedModules[1].lessons.map((lesson) => lesson._id.toString()),
    ).toEqual([secondLessonId, firstLessonId]);
    expect(LessonProgress.countDocuments).not.toHaveBeenCalled();
  });

  it("blocks deletion of lessons with progress without saving any changes", async () => {
    Course.findById.mockReturnValue(
      queryResult(
        existingCourse([
          {
            number: "01",
            title: "Foundations",
            description: "",
            lessons: [existingLesson(firstLessonId, 1)],
          },
        ]),
      ),
    );
    LessonProgress.countDocuments.mockResolvedValue(2);

    const response = await updateCurriculum(
      jsonRequest("PUT", { version: 3, modules: [] }),
      routeParams(),
    );

    expect(response.status).toBe(409);
    expect((await response.json()).dependencies.progressRecords).toBe(2);
    expect(Course.updateOne).not.toHaveBeenCalled();
  });

  it("rejects stale curriculum versions before writing", async () => {
    Course.findById.mockReturnValue(
      queryResult(existingCourse([], 4)),
    );

    const response = await updateCurriculum(
      jsonRequest("PUT", { version: 3, modules: [] }),
      routeParams(),
    );

    expect(response.status).toBe(409);
    expect(Course.updateOne).not.toHaveBeenCalled();
  });

  it("increments the curriculum version for the legacy append endpoint", async () => {
    Course.findById.mockReturnValue(
      queryResult(existingCourse([], 3)),
    );

    const response = await appendCurriculum(
      jsonRequest("POST", {
        moduleNumber: "01",
        moduleTitle: "Foundations",
        lessons: [
          {
            title: "First lesson",
            type: "article",
            content: "Authored material",
            durationMinutes: 10,
            order: 1,
          },
        ],
      }),
      routeParams(),
    );

    expect(response.status).toBe(201);
    expect(Course.updateOne.mock.calls[0][0].__v).toBe(3);
    expect(Course.updateOne.mock.calls[0][1].$inc).toEqual({ __v: 1 });
  });
});
