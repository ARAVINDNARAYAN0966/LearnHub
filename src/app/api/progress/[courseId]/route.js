import mongoose from "mongoose";
import Course from "../../../../models/Course";
import Enrollment from "../../../../models/Enrollment";
import { getCurrentUser } from "../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../lib/auth-http";
import {
  getProgressSummary,
  getPublishedLessons,
  PublishedLessonUnavailableError,
  recordLessonAccess,
  updateEnrollmentProgress,
} from "../../../../lib/lesson-progress";
import { connectToDatabase } from "../../../../lib/mongodb";

function databaseFailureStatus(error) {
  return error?.name === "MongooseServerSelectionError" ? 503 : 500;
}

async function getAuthenticatedUser() {
  try {
    return { user: await getCurrentUser() };
  } catch (error) {
    logAuthFailure("Lesson progress authentication", error);
    return { response: authJson({ error: "Unable to verify your session." }, databaseFailureStatus(error)) };
  }
}

async function getEnrolledCourse(userId, courseId) {
  await connectToDatabase();

  const course = await Course.findOne({ _id: courseId, published: true }).lean();
  if (!course) {
    return { response: authJson({ error: "Course not found or unavailable." }, 404) };
  }

  const enrollment = await Enrollment.findOne({
    user: userId,
    course: course._id,
    status: { $in: ["active", "completed"] },
  })
    .select("status")
    .lean();

  if (!enrollment) {
    return { response: authJson({ error: "An active enrollment is required." }, 403) };
  }

  return { course, enrollment };
}

export async function GET(request, { params }) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;
  if (!auth.user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  const { courseId } = await params;
  if (!/^[\da-f]{24}$/i.test(courseId) || !mongoose.isValidObjectId(courseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    const result = await getEnrolledCourse(auth.user.id, courseId);
    if (result.response) return result.response;

    const progress = await getProgressSummary(auth.user.id, result.course);
    return authJson({
      progress: {
        courseId: result.course._id.toString(),
        enrollmentStatus: result.enrollment.status,
        ...progress,
      },
    });
  } catch (error) {
    logAuthFailure("Lesson progress lookup", error);
    return authJson(
      { error: "Unable to load lesson progress right now." },
      databaseFailureStatus(error),
    );
  }
}

export async function POST(request, { params }) {
  const auth = await getAuthenticatedUser();
  if (auth.response) return auth.response;
  if (!auth.user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  const { courseId } = await params;
  if (!/^[\da-f]{24}$/i.test(courseId) || !mongoose.isValidObjectId(courseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
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

  const lessonId = typeof body.lessonId === "string" ? body.lessonId : "";
  if (!/^[\da-f]{24}$/i.test(lessonId) || !mongoose.isValidObjectId(lessonId)) {
    return authJson({ error: "A valid lesson ID is required." }, 400);
  }

  try {
    const result = await getEnrolledCourse(auth.user.id, courseId);
    if (result.response) return result.response;

    const lesson = getPublishedLessons(result.course).find(
      (publishedLesson) => publishedLesson.id === lessonId.toLowerCase(),
    );
    if (!lesson) {
      return authJson({ error: "Published lesson not found in this course." }, 404);
    }

    await recordLessonAccess({
      userId: auth.user.id,
      courseId: result.course._id,
      lessonId,
      completed: true,
    });
    const progress = await getProgressSummary(auth.user.id, result.course);
    const enrollmentStatus = await updateEnrollmentProgress(
      auth.user.id,
      result.course,
      progress,
    );

    return authJson({
      progress: {
        courseId: result.course._id.toString(),
        enrollmentStatus: enrollmentStatus || result.enrollment.status,
        ...progress,
      },
    });
  } catch (error) {
    if (error instanceof PublishedLessonUnavailableError) {
      return authJson(
        { error: "Published lesson not found in this course." },
        404,
      );
    }
    logAuthFailure("Lesson progress update", error);
    return authJson(
      { error: "Unable to update lesson progress right now." },
      databaseFailureStatus(error),
    );
  }
}
