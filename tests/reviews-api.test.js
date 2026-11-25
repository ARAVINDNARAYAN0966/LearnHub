/**
 * Tests for GET/POST /api/courses/[courseId]/reviews
 *
 * Uses vitest + vi.mock to avoid real DB connections.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

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

vi.mock("../src/lib/lesson-progress", () => ({
  getProgressSummary: vi.fn(),
}));

vi.mock("../src/models/Course", () => ({
  default: {
    findById: vi.fn(),
    updateOne: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("../src/models/Enrollment", () => ({
  default: { findOne: vi.fn() },
}));

vi.mock("../src/models/Review", () => ({
  default: {
    find: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
    aggregate: vi.fn(),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_COURSE_ID = "a".repeat(24);
const VALID_USER_ID = "b".repeat(24);

function makeParams(courseId) {
  return { params: Promise.resolve({ courseId }) };
}

function makePostRequest(body) {
  return { json: vi.fn().mockResolvedValue(body) };
}

// ── Lazy import after mocks are set up ───────────────────────────────────────

async function getHandlers() {
  const mod = await import(
    "../src/app/api/courses/[courseId]/reviews/route.js"
  );
  return { GET: mod.GET, POST: mod.POST, DELETE: mod.DELETE };
}

// ── GET tests ────────────────────────────────────────────────────────────────

describe("GET /api/courses/[courseId]/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for an invalid courseId", async () => {
    const { GET } = await getHandlers();
    const result = await GET({}, makeParams("not-valid"));
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/valid course ID/i);
  });

  it("returns 404 when the course does not exist", async () => {
    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    });

    const { GET } = await getHandlers();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(404);
    expect(result.body.error).toMatch(/course not found/i);
  });

  it("returns 200 with reviews array and aggregate stats", async () => {
    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Review = (await import("../src/models/Review")).default;
    const fakeReview = {
      _id: { toString: () => "rev1" },
      user: { _id: { toString: () => VALID_USER_ID }, name: "Alice" },
      rating: 4,
      title: "Great",
      comment: "Very useful course",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
    };
    Review.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([fakeReview]),
    });

    const { GET } = await getHandlers();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(200);
    expect(result.body.reviews).toHaveLength(1);
    expect(result.body.averageRating).toBe(4);
    expect(result.body.totalReviews).toBe(1);
    expect(result.body.distribution[4]).toBe(1);
  });

  it("calculates correct average rating and distribution across multiple reviews", async () => {
    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Review = (await import("../src/models/Review")).default;
    const multiReviews = [
      {
        _id: { toString: () => "rev1" },
        user: { _id: { toString: () => "u1" }, name: "Alice" },
        rating: 5,
        title: "Awesome",
        comment: "Excellent content",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      },
      {
        _id: { toString: () => "rev2" },
        user: { _id: { toString: () => "u2" }, name: "Bob" },
        rating: 4,
        title: "Good",
        comment: "Solid explanations",
        createdAt: new Date("2024-01-02"),
        updatedAt: new Date("2024-01-02"),
      },
      {
        _id: { toString: () => "rev3" },
        user: { _id: { toString: () => "u3" }, name: "Charlie" },
        rating: 4,
        title: "Nice",
        comment: "Helpful course",
        createdAt: new Date("2024-01-03"),
        updatedAt: new Date("2024-01-03"),
      },
      {
        _id: { toString: () => "rev4" },
        user: { _id: { toString: () => "u4" }, name: "Dave" },
        rating: 3,
        title: "Okay",
        comment: "Average course",
        createdAt: new Date("2024-01-04"),
        updatedAt: new Date("2024-01-04"),
      },
      {
        _id: { toString: () => "rev5" },
        user: { _id: { toString: () => "u5" }, name: "Eve" },
        rating: 5,
        title: "Loved it",
        comment: "Outstanding value",
        createdAt: new Date("2024-01-05"),
        updatedAt: new Date("2024-01-05"),
      },
    ];

    Review.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(multiReviews),
    });

    const { GET } = await getHandlers();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(200);
    expect(result.body.totalReviews).toBe(5);
    // (5 + 4 + 4 + 3 + 5) / 5 = 21 / 5 = 4.2
    expect(result.body.averageRating).toBe(4.2);
    expect(result.body.distribution).toEqual({
      5: 2,
      4: 2,
      3: 1,
      2: 0,
      1: 0,
    });
  });

  it("returns canReview=false when user is not authenticated", async () => {
    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Review = (await import("../src/models/Review")).default;
    Review.find.mockReturnValue({
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    });

    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue(null);

    const { GET } = await getHandlers();
    const result = await GET({}, makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(200);
    expect(result.body.canReview).toBe(false);
    expect(result.body.currentUserReview).toBeNull();
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/courses/[courseId]/reviews", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue(null);

    const { POST } = await getHandlers();
    const result = await POST(makePostRequest({}), makeParams(VALID_COURSE_ID));
    expect(result.status).toBe(401);
    expect(result.body.error).toMatch(/authentication required/i);
  });

  it("returns 400 for an invalid courseId", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 4, comment: "Great course!" }),
      makeParams("bad-id"),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/valid course ID/i);
  });

  it("returns 400 for an out-of-range rating", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 6, comment: "Great course!" }),
      makeParams(VALID_COURSE_ID),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/integer between 1 and 5/i);
  });

  it("returns 400 for a rating of 0", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 0, comment: "Great course!" }),
      makeParams(VALID_COURSE_ID),
    );
    expect(result.status).toBe(400);
  });

  it("returns 400 when comment is too short", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 4, comment: "Hi" }),
      makeParams(VALID_COURSE_ID),
    );
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/at least 5 characters/i);
  });

  it("returns 403 when user is not enrolled", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 4, comment: "Great course!" }),
      makeParams(VALID_COURSE_ID),
    );
    expect(result.status).toBe(403);
    expect(result.body.error).toMatch(/enrolled/i);
  });

  it("returns 403 when enrolled student has not completed the course", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "enr1",
        status: "active",
        completedLessons: 1,
        totalLessons: 4,
      }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 4,
      completedLessons: 1,
      progressPercentage: 25,
    });

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 4, comment: "Great course!" }),
      makeParams(VALID_COURSE_ID),
    );
    expect(result.status).toBe(403);
    expect(result.body.error).toMatch(/must complete this course/i);
  });

  it("denies review when enrollment is marked completed but actual published lesson progress is incomplete", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test Course" }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    // Inconsistent state: enrollment.status is marked "completed", but lesson progress is incomplete
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "enr1",
        status: "completed",
        completedLessons: 2,
        totalLessons: 4,
      }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 4,
      completedLessons: 2,
      progressPercentage: 50,
    });

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 5, comment: "Attempting to review with incomplete lesson progress" }),
      makeParams(VALID_COURSE_ID),
    );

    expect(result.status).toBe(403);
    expect(result.body.error).toMatch(/must complete this course/i);
  });

  it("creates a review for a completed enrolled student", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "enr1",
        status: "completed",
        completedLessons: 4,
        totalLessons: 4,
      }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 4,
      completedLessons: 4,
      progressPercentage: 100,
    });

    const Review = (await import("../src/models/Review")).default;
    const savedReview = {
      _id: { toString: () => "rev1" },
      rating: 4,
      title: "Great",
      comment: "Very useful course",
      createdAt: new Date("2024-01-01"),
    };
    Review.findOneAndUpdate.mockResolvedValue(savedReview);
    Review.aggregate.mockResolvedValue([{ avgRating: 4, total: 1 }]);

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 4, title: "Great", comment: "Very useful course" }),
      makeParams(VALID_COURSE_ID),
    );
    expect(result.status).toBe(200);
    expect(result.body.review.rating).toBe(4);
    expect(result.body.courseRating.rating).toBe(4);
  });

  it("updates existing review instead of creating duplicate records when user submits again", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "enr1",
        status: "completed",
        completedLessons: 4,
        totalLessons: 4,
      }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 4,
      completedLessons: 4,
      progressPercentage: 100,
    });

    const Review = (await import("../src/models/Review")).default;
    const updatedReview = {
      _id: { toString: () => "rev1" },
      rating: 5,
      title: "Updated Title",
      comment: "Updated review comment with more details",
      createdAt: new Date("2024-01-01"),
    };
    Review.findOneAndUpdate.mockResolvedValue(updatedReview);
    Review.aggregate.mockResolvedValue([{ avgRating: 5, total: 1 }]);

    const { POST } = await getHandlers();
    const result = await POST(
      makePostRequest({ rating: 5, title: "Updated Title", comment: "Updated review comment with more details" }),
      makeParams(VALID_COURSE_ID),
    );
    expect(result.status).toBe(200);
    expect(Review.findOneAndUpdate).toHaveBeenCalledWith(
      { user: VALID_USER_ID, course: VALID_COURSE_ID },
      { $set: { rating: 5, title: "Updated Title", comment: "Updated review comment with more details" } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    expect(result.body.review.rating).toBe(5);
  });

  it("strictly enforces review ownership by binding mutations to the authenticated user ID", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Course = (await import("../src/models/Course")).default;
    Course.findById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ _id: VALID_COURSE_ID, title: "Test" }),
    });

    const Enrollment = (await import("../src/models/Enrollment")).default;
    Enrollment.findOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: "enr1",
        status: "completed",
        completedLessons: 4,
        totalLessons: 4,
      }),
    });

    const { getProgressSummary } = await import("../src/lib/lesson-progress");
    getProgressSummary.mockResolvedValue({
      totalPublishedLessons: 4,
      completedLessons: 4,
      progressPercentage: 100,
    });

    const Review = (await import("../src/models/Review")).default;
    Review.findOneAndUpdate.mockResolvedValue({
      _id: { toString: () => "rev1" },
      rating: 5,
      title: "Title",
      comment: "Comment",
      createdAt: new Date(),
    });
    Review.aggregate.mockResolvedValue([{ avgRating: 5, total: 1 }]);

    const { POST } = await getHandlers();
    await POST(
      makePostRequest({ rating: 5, comment: "Legitimate student review" }),
      makeParams(VALID_COURSE_ID),
    );

    // Verify filter strictly isolates to VALID_USER_ID
    expect(Review.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ user: VALID_USER_ID, course: VALID_COURSE_ID }),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("allows student to delete their own review and recalculates course ratings", async () => {
    const { getCurrentUser } = await import("../src/lib/auth");
    getCurrentUser.mockResolvedValue({ id: VALID_USER_ID, name: "Alice" });

    const Review = (await import("../src/models/Review")).default;
    Review.findOneAndDelete.mockResolvedValue({
      _id: "rev1",
      user: VALID_USER_ID,
      course: VALID_COURSE_ID,
    });
    Review.aggregate.mockResolvedValue([]);

    const Course = (await import("../src/models/Course")).default;
    Course.updateOne.mockResolvedValue({});

    const { DELETE } = await getHandlers();
    const result = await DELETE({}, makeParams(VALID_COURSE_ID));

    expect(result.status).toBe(200);
    expect(Review.findOneAndDelete).toHaveBeenCalledWith({
      user: VALID_USER_ID,
      course: VALID_COURSE_ID,
    });
    expect(Course.updateOne).toHaveBeenCalledWith(
      { _id: VALID_COURSE_ID },
      { $set: { rating: 0, reviews: 0 } },
    );
    expect(result.body.courseRating).toEqual({ rating: 0, reviews: 0 });
  });
});
