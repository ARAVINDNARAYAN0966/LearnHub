import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPublishedCourses } = vi.hoisted(() => ({
  getPublishedCourses: vi.fn(),
}));

vi.mock("../src/lib/course-data.js", () => ({ getPublishedCourses }));
vi.mock("server-only", () => ({}));

import { GET } from "../src/app/api/courses/route.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/courses", () => {
  it("returns 200 with courses array on success", async () => {
    const mockCourses = [
      { id: "1", title: "Course 1", slug: "course-1" },
      { id: "2", title: "Course 2", slug: "course-2" },
    ];
    getPublishedCourses.mockResolvedValueOnce(mockCourses);

    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body).toEqual({ courses: mockCourses });
  });

  it("returns 503 when a MongooseServerSelectionError occurs", async () => {
    const error = new Error("Could not connect to any servers");
    error.name = "MongooseServerSelectionError";
    getPublishedCourses.mockRejectedValueOnce(error);

    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body).toEqual({ error: "Unable to load courses right now." });
  });

  it("returns 503 when a buffering timeout MongooseError occurs", async () => {
    const error = new Error("Operation `courses.find()` buffering timed out after 10000ms");
    error.name = "MongooseError";
    getPublishedCourses.mockRejectedValueOnce(error);

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({ error: "Unable to load courses right now." });
  });

  it("returns 503 when a MongoNetworkError occurs", async () => {
    const error = new Error("connection closed");
    error.name = "MongoNetworkError";
    getPublishedCourses.mockRejectedValueOnce(error);

    const response = await GET();
    expect(response.status).toBe(503);

    const body = await response.json();
    expect(body).toEqual({ error: "Unable to load courses right now." });
  });

  it("returns 500 when an unexpected internal error occurs", async () => {
    const error = new TypeError("Cannot read properties of null");
    getPublishedCourses.mockRejectedValueOnce(error);

    const response = await GET();
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body).toEqual({ error: "Unable to load courses right now." });
  });
});
