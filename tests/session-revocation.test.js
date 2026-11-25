import mongoose from "mongoose";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockCookiesStore = new Map();
const mockCookies = {
  get: vi.fn((name) => mockCookiesStore.get(name)),
  set: vi.fn((name, value, options) => {
    mockCookiesStore.set(name, { value, ...options });
  }),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookies),
}));

vi.mock("../src/models/User.js", () => {
  const UserMock = {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  };
  return { default: UserMock };
});

vi.mock("../src/lib/mongodb.js", () => ({
  connectToDatabase: vi.fn(async () => {}),
}));

import User from "../src/models/User.js";
import {
  clearSession,
  getCurrentUser,
  issueSession,
  revokeUserSessions,
} from "../src/lib/auth.js";
import { canManageCourse } from "../src/lib/curriculum-policy.js";

describe("JWT session security & token version revocation", () => {
  const originalEnv = process.env.SESSION_SECRET;
  const testSecret = "01234567890123456789012345678901"; // 32 bytes
  const userId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    process.env.SESSION_SECRET = testSecret;
    mockCookiesStore.clear();
    vi.clearAllMocks();
  });

  afterAll(() => {
    process.env.SESSION_SECRET = originalEnv;
  });

  it("authenticates a user whose token version matches database", async () => {
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(userId),
          name: "Test Student",
          email: "student@example.test",
          role: "student",
          tokenVersion: 0,
        }),
      }),
    });

    await issueSession(
      { _id: userId, tokenVersion: 0 },
      false,
      0,
    );

    const currentUser = await getCurrentUser();
    expect(currentUser).not.toBeNull();
    expect(currentUser.id).toBe(userId);
    expect(currentUser.email).toBe("student@example.test");
  });

  it("invalidates a session when token version is incremented (revocation)", async () => {
    // User originally had tokenVersion 0
    await issueSession(
      { _id: userId, tokenVersion: 0 },
      false,
      0,
    );

    // Database record now has tokenVersion 1 (revoked by logout or role change)
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(userId),
          name: "Test Student",
          email: "student@example.test",
          role: "student",
          tokenVersion: 1,
        }),
      }),
    });

    const currentUser = await getCurrentUser();
    expect(currentUser).toBeNull();
  });

  it("revokeUserSessions increments tokenVersion in MongoDB", async () => {
    User.findByIdAndUpdate.mockResolvedValue({
      _id: userId,
      tokenVersion: 1,
    });

    await revokeUserSessions(userId);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      { $inc: { tokenVersion: 1 } },
      { new: true },
    );
  });

  it("clearSession sets an expired empty cookie", async () => {
    await clearSession();
    expect(mockCookies.set).toHaveBeenCalledWith(
      "learnhub_session",
      "",
      expect.objectContaining({
        maxAge: 0,
        httpOnly: true,
      }),
    );
  });

  it("preserves compatibility for legacy users without a tokenVersion field in database", async () => {
    // Database returns legacy document where tokenVersion is undefined
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(userId),
          name: "Legacy User",
          email: "legacy@example.test",
          role: "student",
          tokenVersion: undefined,
        }),
      }),
    });

    // Token issued with default version (0)
    await issueSession({ _id: userId }, false, 0);

    const currentUser = await getCurrentUser();
    expect(currentUser).not.toBeNull();
    expect(currentUser.name).toBe("Legacy User");
  });

  it("preserves remember-me sessions with 30-day expiration and valid tokenVersion", async () => {
    User.findById.mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(userId),
          name: "Remembered User",
          email: "remember@example.test",
          role: "student",
          tokenVersion: 2,
        }),
      }),
    });

    await issueSession(
      { _id: userId, tokenVersion: 2 },
      true, // rememberMe
      2,
    );

    expect(mockCookies.set).toHaveBeenCalledWith(
      "learnhub_session",
      expect.any(String),
      expect.objectContaining({
        maxAge: 60 * 60 * 24 * 30, // 30 days
        httpOnly: true,
      }),
    );

    const currentUser = await getCurrentUser();
    expect(currentUser).not.toBeNull();
    expect(currentUser.name).toBe("Remembered User");
  });
});

describe("Legacy course ownership enforcement", () => {
  const instructor = {
    id: "507f1f77bcf86cd799439011",
    role: "instructor",
  };
  const otherInstructor = {
    id: "507f1f77bcf86cd799439022",
    role: "instructor",
  };
  const admin = {
    id: "507f1f77bcf86cd799439099",
    role: "admin",
  };

  it("denies instructors access to legacy courses without an assigned instructorId", () => {
    const unassignedCourse = {
      _id: "507f1f77bcf86cd799439001",
      title: "Legacy Unassigned Course",
      instructor: "Marcus Williams",
      instructorId: null,
    };

    expect(canManageCourse(instructor, unassignedCourse)).toBe(false);
  });

  it("allows admins access to legacy courses without an assigned instructorId", () => {
    const unassignedCourse = {
      _id: "507f1f77bcf86cd799439001",
      title: "Legacy Unassigned Course",
      instructor: "Marcus Williams",
      instructorId: null,
    };

    expect(canManageCourse(admin, unassignedCourse)).toBe(true);
  });

  it("allows instructor to manage their own assigned course", () => {
    const assignedCourse = {
      _id: "507f1f77bcf86cd799439002",
      title: "Assigned Course",
      instructorId: instructor.id,
    };

    expect(canManageCourse(instructor, assignedCourse)).toBe(true);
  });

  it("denies instructor access to another instructor's assigned course", () => {
    const assignedCourse = {
      _id: "507f1f77bcf86cd799439002",
      title: "Assigned Course",
      instructorId: instructor.id,
    };

    expect(canManageCourse(otherInstructor, assignedCourse)).toBe(false);
  });
});
