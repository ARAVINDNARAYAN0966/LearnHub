import "server-only";

import mongoose from "mongoose";
import Course from "../models/Course";
import Enrollment from "../models/Enrollment";
import LessonProgress from "../models/LessonProgress";
import { connectToDatabase } from "./mongodb";

const NO_ENROLLMENT_RESERVATIONS = {
  $or: [
    { enrollmentReservations: 0 },
    { enrollmentReservations: { $exists: false } },
  ],
};

export class CourseEnrollmentUnavailableError extends Error {
  constructor() {
    super("Course not found or unavailable.");
    this.name = "CourseEnrollmentUnavailableError";
  }
}

export function isTransactionUnsupportedError(error) {
  const pending = [error];
  const visited = new Set();

  while (pending.length > 0) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }

    visited.add(current);
    const message =
      typeof current.message === "string" ? current.message.toLowerCase() : "";
    if (
      ((current.code === 20 || current.code === 303) &&
        message.includes("transaction")) ||
      /transaction numbers are only allowed on a replica set member or mongos/.test(
        message,
      ) ||
      /transactions? (?:are|is) not supported/.test(message)
    ) {
      return true;
    }

    if (current.cause) pending.push(current.cause);
  }

  return false;
}

async function createEnrollmentWithReservation(userId, courseId) {
  const reservedCourse = await Course.findOneAndUpdate(
    {
      _id: courseId,
      published: true,
      deleting: { $ne: true },
    },
    { $inc: { enrollmentReservations: 1 } },
    { new: true, timestamps: false },
  )
    .select("_id")
    .lean();

  if (!reservedCourse) {
    throw new CourseEnrollmentUnavailableError();
  }

  let enrollment;
  let enrollmentError;
  try {
    enrollment = await Enrollment.create({ user: userId, course: courseId });
  } catch (error) {
    enrollmentError = error;
  }

  const releaseResult = await Course.updateOne(
    { _id: courseId, enrollmentReservations: { $gt: 0 } },
    { $inc: { enrollmentReservations: -1 } },
    { timestamps: false },
  );
  if (releaseResult.matchedCount !== 1) {
    throw new Error("Course enrollment reservation could not be released.");
  }
  if (enrollmentError) throw enrollmentError;

  return enrollment;
}

export async function createCourseEnrollment(userId, courseId) {
  await connectToDatabase();
  await Enrollment.init();

  const session = await mongoose.startSession();
  let enrollment = null;
  try {
    await session.withTransaction(async () => {
      enrollment = null;
      const courseUpdate = await Course.updateOne(
        {
          _id: courseId,
          published: true,
          deleting: { $ne: true },
        },
        { $inc: { __v: 1 } },
        { timestamps: false, session },
      );
      if (courseUpdate.matchedCount !== 1) {
        throw new CourseEnrollmentUnavailableError();
      }

      [enrollment] = await Enrollment.create(
        [{ user: userId, course: courseId }],
        { session },
      );
    });

    return enrollment;
  } catch (error) {
    if (!isTransactionUnsupportedError(error)) throw error;
    return await createEnrollmentWithReservation(userId, courseId);
  } finally {
    await session.endSession();
  }
}

async function countCourseDependencies(courseId, session) {
  let enrollmentQuery = Enrollment.countDocuments({ course: courseId });
  let progressQuery = LessonProgress.countDocuments({ course: courseId });
  if (session) {
    enrollmentQuery = enrollmentQuery.session(session);
    progressQuery = progressQuery.session(session);
  }

  const enrollments = await enrollmentQuery;
  const lessonProgress = await progressQuery;
  return { enrollments, lessonProgress };
}

async function deleteCourseWithoutTransactions(courseId) {
  const lockResult = await Course.updateOne(
    {
      _id: courseId,
      published: false,
      deleting: { $ne: true },
      ...NO_ENROLLMENT_RESERVATIONS,
    },
    { $set: { deleting: true } },
    { timestamps: false },
  );

  if (lockResult.matchedCount !== 1) {
    const course = await Course.findById(courseId)
      .select("published +deleting +enrollmentReservations")
      .lean();
    if (!course) return { type: "not-found" };
    if (course.published) return { type: "published" };
    return { type: "busy" };
  }

  let deleted = false;
  try {
    const dependencies = await countCourseDependencies(courseId);
    if (dependencies.enrollments > 0 || dependencies.lessonProgress > 0) {
      return { type: "dependencies", ...dependencies };
    }

    const result = await Course.deleteOne({
      _id: courseId,
      published: false,
      deleting: true,
      ...NO_ENROLLMENT_RESERVATIONS,
    });
    deleted = result.deletedCount === 1;
    return deleted ? { type: "deleted" } : { type: "changed" };
  } finally {
    if (!deleted) {
      await Course.updateOne(
        { _id: courseId, deleting: true },
        { $unset: { deleting: 1 } },
        { timestamps: false },
      );
    }
  }
}

export async function deleteCourseWithCoordination(courseId) {
  await connectToDatabase();

  const session = await mongoose.startSession();
  try {
    let outcome = null;
    try {
      await session.withTransaction(async () => {
        outcome = null;
        const course = await Course.findById(courseId)
          .select("published")
          .session(session)
          .lean();
        if (!course) {
          outcome = { type: "not-found" };
          return;
        }
        if (course.published) {
          outcome = { type: "published" };
          return;
        }

        const dependencies = await countCourseDependencies(courseId, session);
        if (dependencies.enrollments > 0 || dependencies.lessonProgress > 0) {
          outcome = { type: "dependencies", ...dependencies };
          return;
        }

        const result = await Course.deleteOne(
          { _id: courseId, published: false },
          { session },
        );
        outcome =
          result.deletedCount === 1
            ? { type: "deleted" }
            : { type: "changed" };
      });

      return outcome;
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) throw error;
      return await deleteCourseWithoutTransactions(courseId);
    }
  } finally {
    await session.endSession();
  }
}
