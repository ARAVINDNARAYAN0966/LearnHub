import mongoose from "mongoose";
import { getCurrentUser } from "../../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../../lib/auth-http";
import { getCourseCurriculumForUser } from "../../../../../lib/curriculum-data";

function databaseFailureStatus(error) {
  return error?.name === "MongooseServerSelectionError" ? 503 : 500;
}

export async function GET(_request, { params }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Curriculum authentication", error);
    return authJson(
      { error: "Unable to verify your session." },
      databaseFailureStatus(error),
    );
  }

  if (!user) {
    return authJson({ error: "Authentication required." }, 401);
  }

  const { courseId } = await params;
  if (!/^[\da-f]{24}$/i.test(courseId) || !mongoose.isValidObjectId(courseId)) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    const result = await getCourseCurriculumForUser(user, courseId);
    if (!result.found) {
      return authJson({ error: "Course not found or unavailable." }, 404);
    }
    if (!result.access.allowed) {
      return authJson({ error: result.access.error }, result.access.status);
    }

    return authJson({
      curriculum: {
        courseId: result.course.id,
        courseSlug: result.course.slug,
        courseTitle: result.course.title,
        modules: result.modules,
      },
    });
  } catch (error) {
    logAuthFailure("Curriculum lookup", error);
    return authJson(
      { error: "Unable to load course curriculum right now." },
      databaseFailureStatus(error),
    );
  }
}
