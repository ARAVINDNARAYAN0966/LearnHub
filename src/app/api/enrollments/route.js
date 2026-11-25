import mongoose from "mongoose";
import Course from "../../../models/Course";
import Enrollment from "../../../models/Enrollment";
import { getCurrentUser } from "../../../lib/auth";
import { authJson, logAuthFailure } from "../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../lib/csrf";
import {
  CourseEnrollmentUnavailableError,
  createCourseEnrollment,
} from "../../../lib/course-write-coordination";
import { getUserEnrollments } from "../../../lib/enrollment-data";
import { connectToDatabase, isDatabaseConnectionError } from "../../../lib/mongodb";

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
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
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

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
    await connectToDatabase();
    const course = await Course.findById(courseId).select("price published deleting").lean();
    if (!course || !course.published || course.deleting) {
      return authJson({ error: "Course not found or unavailable." }, 404);
    }

    if (course.price > 0) {
      return authJson(
        {
          error: "Paid course enrollment is currently unavailable as no payment gateway is configured.",
          paymentUnavailable: true,
          price: course.price,
        },
        402,
      );
    }

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
