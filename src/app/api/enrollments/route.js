import mongoose from "mongoose";
import Enrollment from "../../../models/Enrollment";
import { getCurrentUser } from "../../../lib/auth";
import { authJson, logAuthFailure } from "../../../lib/auth-http";
import {
  CourseEnrollmentUnavailableError,
  createCourseEnrollment,
} from "../../../lib/course-write-coordination";
import { getUserEnrollments } from "../../../lib/enrollment-data";

function databaseFailureStatus(error) {
  return error?.name === "MongooseServerSelectionError" ? 503 : 500;
}

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Enrollment authentication", error);
    return authJson(
      { error: "Unable to load enrollments right now." },
      databaseFailureStatus(error),
    );
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  try {
    const enrollments = await getUserEnrollments(user.id);
    return authJson({ enrollments });
  } catch (error) {
    logAuthFailure("Enrollment lookup", error);
    return authJson(
      { error: "Unable to load enrollments right now." },
      databaseFailureStatus(error),
    );
  }
}

export async function POST(request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Enrollment authentication", error);
    return authJson(
      { error: "Unable to create an enrollment right now." },
      databaseFailureStatus(error),
    );
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return authJson({ error: "Invalid request body." }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return authJson({ error: "Invalid request body." }, 400);
  }

  const courseId = typeof body.courseId === "string" ? body.courseId : "";
  if (!/^[\da-f]{24}$/i.test(courseId) || !mongoose.isValidObjectId(courseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    const enrollment = await createCourseEnrollment(user.id, courseId);

    return authJson(
      {
        enrollment: {
          id: enrollment._id.toString(),
          courseId: enrollment.course.toString(),
          enrolledAt: enrollment.enrolledAt.toISOString(),
          status: enrollment.status,
          progressPercentage: enrollment.progressPercentage,
          completedLessons: enrollment.completedLessons,
        },
      },
      201,
    );
  } catch (error) {
    if (error instanceof CourseEnrollmentUnavailableError) {
      return authJson({ error: error.message }, 404);
    }
    if (error?.code === 11000) {
      return authJson(
        { error: "An enrollment record already exists for this course." },
        409,
      );
    }

    logAuthFailure("Enrollment creation", error);
    return authJson(
      { error: "Unable to create an enrollment right now." },
      databaseFailureStatus(error),
    );
  }
}
