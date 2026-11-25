import mongoose from "mongoose";
import Course from "../../../../../models/Course";
import { authJson } from "../../../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../../../lib/csrf";
import {
  adminCourseFailure,
  authorizeInstructorApi,
  courseInputErrorResponse,
  duplicateSlugResponse,
  isDuplicateSlugError,
  parseAdminJsonBody,
} from "../../../../../lib/admin-course-api";
import { serializeAdminCourse } from "../../../../../lib/admin-course-data";
import { connectToDatabase } from "../../../../../lib/mongodb";
import { canManageCourse } from "../../../../../lib/curriculum-policy";
import { getCourseVersionFilter } from "../../../../../lib/course-version";
import { getCoursePublicationReadiness } from "../../../../../lib/lesson-utils";
import { deleteCourseWithCoordination } from "../../../../../lib/course-write-coordination";
import {
  AdminCourseInputError,
  validateAdminCourseInput,
  validateAdminCoursePublication,
} from "../../../../../lib/admin-course-validation";

function validCourseId(courseId) {
  return (
    typeof courseId === "string" &&
    /^[\da-f]{24}$/i.test(courseId) &&
    mongoose.isValidObjectId(courseId)
  );
}

async function getCourseId(params) {
  const { courseId } = await params;
  return validCourseId(courseId) ? courseId : null;
}

export async function GET(_request, { params }) {
  const authorization = await authorizeInstructorApi("Instructor course lookup");
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    await connectToDatabase();
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    if (!canManageCourse(authorization.user, course)) {
      return authJson(
        { error: "You are not authorized to view or edit this course." },
        403,
      );
    }

    return authJson({ course: serializeAdminCourse(course) });
  } catch (error) {
    return adminCourseFailure("Instructor course lookup", error);
  }
}

export async function PUT(request, { params }) {
  const authorization = await authorizeInstructorApi("Instructor course update");
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  const parsed = await parseAdminJsonBody(request);
  if (parsed.response) return parsed.response;

  let input;
  try {
    input = validateAdminCourseInput(parsed.body);
  } catch (error) {
    if (error instanceof AdminCourseInputError) {
      return courseInputErrorResponse(error);
    }
    throw error;
  }

  try {
    await connectToDatabase();
    const existing = await Course.findById(courseId).lean();
    if (!existing) {
      return authJson({ error: "Course not found." }, 404);
    }

    if (!canManageCourse(authorization.user, existing)) {
      return authJson(
        { error: "You are not authorized to update this course." },
        403,
      );
    }

    if (input.published) {
      const readiness = getCoursePublicationReadiness(existing);
      if (!readiness.ready) {
        return authJson({ error: readiness.error }, 409);
      }
    }

    const duplicateCourse = await Course.findOne({
      _id: { $ne: courseId },
      slug: input.slug,
    })
      .select("_id")
      .lean();
    if (duplicateCourse) {
      return duplicateSlugResponse();
    }

    const course = await Course.findOneAndUpdate(
      { _id: courseId },
      { $set: input },
      { new: true, runValidators: true },
    ).lean();

    return authJson({ course: serializeAdminCourse(course) });
  } catch (error) {
    if (isDuplicateSlugError(error)) return duplicateSlugResponse();
    return adminCourseFailure("Instructor course update", error);
  }
}

export async function PATCH(request, { params }) {
  const authorization = await authorizeInstructorApi(
    "Instructor course publication",
  );
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  const parsed = await parseAdminJsonBody(request);
  if (parsed.response) return parsed.response;

  let publication;
  try {
    publication = validateAdminCoursePublication(parsed.body);
  } catch (error) {
    if (error instanceof AdminCourseInputError) {
      return courseInputErrorResponse(error);
    }
    throw error;
  }

  try {
    await connectToDatabase();
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    if (!canManageCourse(authorization.user, course)) {
      return authJson(
        { error: "You are not authorized to publish or unpublish this course." },
        403,
      );
    }

    if (publication.published) {
      const readiness = getCoursePublicationReadiness(course);
      if (!readiness.ready) {
        return authJson({ error: readiness.error }, 409);
      }
    }

    const versionFilter = getCourseVersionFilter(course.__v ?? 0);
    const updatedCourse = await Course.findOneAndUpdate(
      { _id: courseId, ...versionFilter },
      { $set: { published: publication.published } },
      { new: true },
    ).lean();

    if (!updatedCourse) {
      return authJson(
        {
          error:
            "The course curriculum changed while it was being published. Reload and retry.",
        },
        409,
      );
    }

    return authJson({ course: serializeAdminCourse(updatedCourse) });
  } catch (error) {
    return adminCourseFailure("Instructor course publication", error);
  }
}

export async function DELETE(request, { params }) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  const authorization = await authorizeInstructorApi("Instructor course deletion");
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    await connectToDatabase();
    const course = await Course.findById(courseId).lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    if (!canManageCourse(authorization.user, course)) {
      return authJson(
        { error: "You are not authorized to delete this course." },
        403,
      );
    }

    const outcome = await deleteCourseWithCoordination(courseId);
    if (outcome.type === "not-found") {
      return authJson({ error: "Course not found." }, 404);
    }
    if (outcome.type === "published") {
      return authJson(
        { error: "Unpublish this course before deleting it." },
        409,
      );
    }
    if (outcome.type === "dependencies") {
      return authJson(
        {
          error:
            "Cannot delete a course that already has enrolled learners or progress records.",
        },
        409,
      );
    }
    if (outcome.type === "busy" || outcome.type === "changed") {
      return authJson(
        {
          error:
            "The course is being modified by another request. Please retry.",
        },
        409,
      );
    }

    return authJson({ message: "Course deleted successfully." });
  } catch (error) {
    return adminCourseFailure("Instructor course deletion", error);
  }
}
