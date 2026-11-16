import { beforeEach, describe, expect, it, vi } from "vitest";

const { mongoose, Course, Enrollment, LessonProgress, connectToDatabase } =
  vi.hoisted(() => ({
    mongoose: { startSession: vi.fn() },
    Course: {
      updateOne: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findById: vi.fn(),
      deleteOne: vi.fn(),
    },
    Enrollment: {
      init: vi.fn(),
      create: vi.fn(),
      countDocuments: vi.fn(),
    },
    LessonProgress: { countDocuments: vi.fn() },
    connectToDatabase: vi.fn(),
  }));

vi.mock("mongoose", () => ({ default: mongoose }));
vi.mock("../src/models/Course.js", () => ({ default: Course }));
vi.mock("../src/models/Enrollment.js", () => ({ default: Enrollment }));
vi.mock("../src/models/LessonProgress.js", () => ({
  default: LessonProgress,
}));
vi.mock("../src/lib/mongodb.js", () => ({ connectToDatabase }));
vi.mock("server-only", () => ({}));

import {
  CourseEnrollmentUnavailableError,
  createCourseEnrollment,
  deleteCourseWithCoordination,
} from "../src/lib/course-write-coordination.js";

const courseId = "507f1f77bcf86cd799439011";
const userId = "student-id";

function queryResult(value) {
  const query = {
    select: vi.fn(() => query),
    session: vi.fn(() => query),
    lean: vi.fn().mockImplementation(() => Promise.resolve(value)),
  };
  return query;
}

function unsupportedTransactionSession() {
  return {
    withTransaction: vi.fn().mockRejectedValue(
      Object.assign(
        new Error(
          "Transaction numbers are only allowed on a replica set member or mongos",
        ),
        { code: 20 },
      ),
    ),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
}

function supportedTransactionSession() {
  return {
    withTransaction: vi.fn(async (callback) => callback()),
    endSession: vi.fn().mockResolvedValue(undefined),
  };
}

function countQuery(value) {
  const query = {
    session: vi.fn(() => query),
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  connectToDatabase.mockResolvedValue(undefined);
  Enrollment.init.mockResolvedValue(undefined);
  Course.updateOne.mockResolvedValue({ matchedCount: 1 });
  Course.findOneAndUpdate.mockReturnValue(queryResult({ _id: courseId }));
  Course.findById.mockReturnValue(queryResult({ published: false }));
  Course.deleteOne.mockResolvedValue({ deletedCount: 1 });
  Enrollment.create.mockResolvedValue([{ _id: "enrollment-id" }]);
  Enrollment.countDocuments.mockReturnValue(countQuery(0));
  LessonProgress.countDocuments.mockReturnValue(countQuery(0));
  mongoose.startSession.mockResolvedValue(supportedTransactionSession());
});

describe("course enrollment and deletion coordination", () => {
  it("writes the course revision and enrollment in the same transaction", async () => {
    const calls = [];
    const session = supportedTransactionSession();
    mongoose.startSession.mockResolvedValue(session);
    Course.updateOne.mockImplementation(async (...args) => {
      calls.push("course");
      expect(args[2].session).toBe(session);
      return { matchedCount: 1 };
    });
    Enrollment.create.mockImplementation(async (...args) => {
      calls.push("enrollment");
      expect(args[1].session).toBe(session);
      return [{ _id: "enrollment-id" }];
    });

    await createCourseEnrollment(userId, courseId);

    expect(calls).toEqual(["course", "enrollment"]);
    expect(Course.updateOne).toHaveBeenCalledWith(
      {
        _id: courseId,
        published: true,
        deleting: { $ne: true },
      },
      { $inc: { __v: 1 } },
      { timestamps: false, session },
    );
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("does not create enrollment when the published-course check fails", async () => {
    Course.updateOne.mockResolvedValue({ matchedCount: 0 });

    await expect(createCourseEnrollment(userId, courseId)).rejects.toBeInstanceOf(
      CourseEnrollmentUnavailableError,
    );

    expect(Enrollment.create).not.toHaveBeenCalled();
  });

  it("checks dependents and deletes inside the same transaction", async () => {
    const session = supportedTransactionSession();
    const courseQuery = queryResult({ published: false });
    const enrollmentQuery = countQuery(0);
    const progressQuery = countQuery(0);
    mongoose.startSession.mockResolvedValue(session);
    Course.findById.mockReturnValue(courseQuery);
    Enrollment.countDocuments.mockReturnValue(enrollmentQuery);
    LessonProgress.countDocuments.mockReturnValue(progressQuery);
    Course.deleteOne.mockImplementation(async (...args) => {
      expect(args[1].session).toBe(session);
      return { deletedCount: 1 };
    });

    const outcome = await deleteCourseWithCoordination(courseId);

    expect(outcome).toEqual({ type: "deleted" });
    expect(courseQuery.session).toHaveBeenCalledWith(session);
    expect(enrollmentQuery.session).toHaveBeenCalledWith(session);
    expect(progressQuery.session).toHaveBeenCalledWith(session);
    expect(Course.deleteOne).toHaveBeenCalledWith(
      { _id: courseId, published: false },
      { session },
    );
    expect(session.endSession).toHaveBeenCalledOnce();
  });

  it("rejects deletion when transaction support is unavailable for a course with dependents", async () => {
    mongoose.startSession.mockResolvedValue(unsupportedTransactionSession());
    Course.updateOne
      .mockResolvedValueOnce({ matchedCount: 1 })
      .mockResolvedValueOnce({ matchedCount: 1 });
    Enrollment.countDocuments.mockReturnValue(countQuery(1));

    const outcome = await deleteCourseWithCoordination(courseId);

    expect(outcome).toEqual({
      type: "dependencies",
      enrollments: 1,
      lessonProgress: 0,
    });
    expect(Course.deleteOne).not.toHaveBeenCalled();
    expect(Course.updateOne).toHaveBeenLastCalledWith(
      { _id: courseId, deleting: true },
      { $unset: { deleting: 1 } },
      { timestamps: false },
    );
  });

  it("prevents a deletion from racing an in-flight fallback enrollment", async () => {
    const state = {
      published: true,
      deleting: false,
      reservations: 0,
      enrollments: 0,
      deleted: false,
    };
    mongoose.startSession.mockImplementation(async () =>
      unsupportedTransactionSession(),
    );
    Course.findOneAndUpdate.mockImplementation((_filter, update) => {
      if (!state.published || state.deleting) return queryResult(null);
      state.reservations += update.$inc.enrollmentReservations;
      return queryResult({ _id: courseId });
    });
    Course.updateOne.mockImplementation(async (filter, update) => {
      if (update.$set?.deleting === true) {
        if (
          state.published ||
          state.deleting ||
          state.reservations !== 0
        ) {
          return { matchedCount: 0 };
        }
        state.deleting = true;
        return { matchedCount: 1 };
      }
      if (update.$inc?.enrollmentReservations === -1) {
        state.reservations -= 1;
        return { matchedCount: 1 };
      }
      if (update.$unset?.deleting) {
        state.deleting = false;
        return { matchedCount: 1 };
      }
      return { matchedCount: 0 };
    });
    Course.findById.mockImplementation(() =>
      queryResult({
        published: state.published,
        deleting: state.deleting,
        enrollmentReservations: state.reservations,
      }),
    );
    Course.deleteOne.mockImplementation(async () => {
      state.deleted = true;
      return { deletedCount: 1 };
    });

    let beginEnrollment;
    let finishEnrollment;
    const enrollmentStarted = new Promise((resolve) => {
      beginEnrollment = resolve;
    });
    const enrollmentCanFinish = new Promise((resolve) => {
      finishEnrollment = resolve;
    });
    Enrollment.create.mockImplementation(async () => {
      beginEnrollment();
      await enrollmentCanFinish;
      state.enrollments += 1;
      return { _id: "enrollment-id" };
    });
    Enrollment.countDocuments.mockImplementation(() =>
      countQuery(state.enrollments),
    );

    const enrollmentPromise = createCourseEnrollment(userId, courseId);
    await enrollmentStarted;
    state.published = false;

    const inFlightDelete = await deleteCourseWithCoordination(courseId);
    expect(inFlightDelete.type).toBe("busy");
    expect(state.deleted).toBe(false);

    finishEnrollment();
    await enrollmentPromise;
    const retriedDelete = await deleteCourseWithCoordination(courseId);

    expect(retriedDelete).toEqual({
      type: "dependencies",
      enrollments: 1,
      lessonProgress: 0,
    });
    expect(state.reservations).toBe(0);
    expect(state.deleted).toBe(false);
  });
});
