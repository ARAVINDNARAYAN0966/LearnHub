import mongoose from "mongoose";
import Course from "../../../../../models/Course";
import { authJson } from "../../../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../../../lib/csrf";
import {
  adminCourseFailure,
  authorizeAdminApi,
  courseInputErrorResponse,
  duplicateSlugResponse,
  isDuplicateSlugError,
  parseAdminJsonBody,
} from "../../../../../lib/admin-course-api";
import { serializeAdminCourse } from "../../../../../lib/admin-course-data";
import { connectToDatabase } from "../../../../../lib/mongodb";
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

export async function PUT(request, { params }) {
  const authorization = await authorizeAdminApi("Admin course update");
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
    let course;
    if (input.published) {
      const currentCourse = await Course.findById(courseId)
        .select("_id modules __v")
        .lean();
      if (!currentCourse) {
        return authJson({ error: "Course not found." }, 404);
      }

      const readiness = getCoursePublicationReadiness(currentCourse);
      if (!readiness.ready) {
        return authJson({ error: readiness.error }, 409);
      }

      course = await Course.findOneAndUpdate(
        {
          _id: courseId,
          ...getCourseVersionFilter(currentCourse.__v ?? 0),
        },
        { $set: input, $inc: { __v: 1 } },
        { new: true, runValidators: true },
      )
        .select(
          "_id title slug description category instructor price currency image published createdAt updatedAt",
        )
        .lean();
      if (!course) {
        return authJson(
          {
            error:
              "The course curriculum changed while it was being published. Reload and retry.",
          },
          409,
        );
      }
    } else {
      course = await Course.findOneAndUpdate(
        { _id: courseId },
        { $set: input },
        { new: true, runValidators: true },
      )
        .select(
          "_id title slug description category instructor price currency image published createdAt updatedAt",
        )
        .lean();
    }

    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    return authJson({ course: serializeAdminCourse(course) });
  } catch (error) {
    if (isDuplicateSlugError(error)) return duplicateSlugResponse();
    return adminCourseFailure("Admin course update", error);
  }
}

export async function PATCH(request, { params }) {
  const authorization = await authorizeAdminApi("Admin course publication");
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
    let course;
    if (publication.published) {
      const currentCourse = await Course.findById(courseId)
        .select("_id modules __v")
        .lean();
      if (!currentCourse) {
        return authJson({ error: "Course not found." }, 404);
      }

      const readiness = getCoursePublicationReadiness(currentCourse);
      if (!readiness.ready) {
        return authJson({ error: readiness.error }, 409);
      }

      course = await Course.findOneAndUpdate(
        {
          _id: courseId,
          ...getCourseVersionFilter(currentCourse.__v ?? 0),
        },
        { $set: publication, $inc: { __v: 1 } },
        { new: true, runValidators: true },
      )
        .select(
          "_id title slug description category instructor price currency image published createdAt updatedAt",
        )
        .lean();
      if (!course) {
        return authJson(
          {
            error:
              "The course curriculum changed while it was being published. Reload and retry.",
          },
          409,
        );
      }
    } else {
      course = await Course.findOneAndUpdate(
        { _id: courseId },
        { $set: publication },
        { new: true, runValidators: true },
      )
        .select(
          "_id title slug description category instructor price currency image published createdAt updatedAt",
        )
        .lean();
    }

    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    return authJson({ course: serializeAdminCourse(course) });
  } catch (error) {
    return adminCourseFailure("Admin course publication", error);
  }
}

export async function DELETE(request, { params }) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  const authorization = await authorizeAdminApi("Admin course deletion");
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
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
    if (outcome.type === "busy") {
      return authJson(
        {
          error:
            "An enrollment is being created for this course. Wait and retry deletion.",
        },
        409,
      );
    }
    if (outcome.type === "dependencies") {
      return authJson(
        {
          error:
            "This course has enrollment or lesson progress records and cannot be deleted.",
          dependencies: {
            enrollments: outcome.enrollments,
            lessonProgress: outcome.lessonProgress,
          },
        },
        409,
      );
    }
    if (outcome.type === "changed") {
      return authJson(
        {
          error:
            "The course changed while deletion was being checked. Refresh and try again.",
        },
        409,
      );
    }

    return authJson({ message: "Course deleted." });
  } catch (error) {
    return adminCourseFailure("Admin course deletion", error);
  }
}
