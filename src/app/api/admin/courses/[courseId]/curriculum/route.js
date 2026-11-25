import mongoose from "mongoose";
import Course from "../../../../../../models/Course";
import LessonProgress from "../../../../../../models/LessonProgress";
import { getCurrentUser } from "../../../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../../../lib/auth-http";
import { verifyCsrfOrigin } from "../../../../../../lib/csrf";
import {
  adminCourseFailure,
  authorizeAdminApi,
  authorizeInstructorApi,
} from "../../../../../../lib/admin-course-api";
import {
  canManageCourse,
  getCurriculumManagementAccess,
} from "../../../../../../lib/curriculum-policy";
import {
  CurriculumInputError,
  validateCurriculumAppend,
  validateCurriculumUpdate,
} from "../../../../../../lib/curriculum-validation";
import {
  connectToDatabase,
  isDatabaseConnectionError,
} from "../../../../../../lib/mongodb";
import { getCourseVersionFilter } from "../../../../../../lib/course-version";

const MAX_BODY_BYTES = 256000;
const MAX_UPDATE_BODY_BYTES = 8 * 1024 * 1024;

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

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

async function parseCurriculumBody(request) {
  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_UPDATE_BODY_BYTES
  ) {
    return {
      response: authJson({ error: "Curriculum request is too large." }, 413),
    };
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_UPDATE_BODY_BYTES) {
    return {
      response: authJson({ error: "Curriculum request is too large." }, 413),
    };
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  return { body, response: null };
}

function serializeCurriculum(course) {
  return {
    courseId: course._id.toString(),
    courseTitle: course.title,
    courseSlug: course.slug,
    version: course.__v ?? 0,
    modules: (course.modules || []).map((module) => ({
      number: module.number,
      title: module.title,
      description: module.description || module.summary || "",
      lessons: (module.lessons || [])
        .map((lesson) => ({
          id: lesson._id?.toString() ?? null,
          title: lesson.title,
          description: lesson.description || "",
          type: lesson.type,
          content: lesson.content || "",
          videoUrl: lesson.videoUrl || "",
          durationMinutes: lesson.durationMinutes,
          order: lesson.order,
          published: Boolean(lesson.published),
        }))
        .sort((left, right) => left.order - right.order),
    })),
  };
}

export async function GET(_request, { params }) {
  const authorization = await authorizeInstructorApi("Curriculum lookup");
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  try {
    await connectToDatabase();
    const course = await Course.findById(courseId)
      .select("_id title slug modules instructorId __v")
      .lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    if (!canManageCourse(authorization.user, course)) {
      return authJson(
        { error: "You are not authorized to view or edit this course curriculum." },
        403,
      );
    }

    return authJson({ curriculum: serializeCurriculum(course) });
  } catch (error) {
    return adminCourseFailure("Curriculum lookup", error);
  }
}

export async function POST(request, { params }) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  const authorization = await authorizeInstructorApi("Curriculum append");
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return authJson({ error: "Curriculum request is too large." }, 413);
  }

  let body;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      return authJson({ error: "Curriculum request is too large." }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return authJson({ error: "Invalid request body." }, 400);
  }

  try {
    await connectToDatabase();
    const course = await Course.findById(courseId).select("modules instructorId __v");
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    if (!canManageCourse(authorization.user, course)) {
      return authJson(
        { error: "You are not authorized to modify this course curriculum." },
        403,
      );
    }
    const version = course.__v ?? 0;

    const moduleNumber =
      typeof body?.moduleNumber === "string" ? body.moduleNumber.trim() : "";
    const existingModule = course.modules.find(
      (module) => module.number === moduleNumber,
    );
    const curriculum = validateCurriculumAppend(body, existingModule);

    let updateResult;
    if (existingModule) {
      updateResult = await Course.updateOne(
        {
          _id: course._id,
          ...getCourseVersionFilter(version),
          modules: {
            $elemMatch: {
              number: curriculum.moduleNumber,
              lessons: {
                $not: {
                  $elemMatch: {
                    order: {
                      $in: curriculum.lessons.map((lesson) => lesson.order),
                    },
                  },
                },
              },
            },
          },
        },
        {
          $push: {
            "modules.$.lessons": { $each: curriculum.lessons },
          },
          $inc: { __v: 1 },
        },
        { runValidators: true },
      );
    } else {
      updateResult = await Course.updateOne(
        {
          _id: course._id,
          ...getCourseVersionFilter(version),
          "modules.number": { $ne: curriculum.moduleNumber },
        },
        {
          $push: {
            modules: {
              number: curriculum.moduleNumber,
              title: curriculum.moduleTitle,
              description: curriculum.moduleDescription,
              summary: "",
              lessons: curriculum.lessons,
            },
          },
          $inc: { __v: 1 },
        },
        { runValidators: true },
      );
    }

    if (updateResult.matchedCount === 0) {
      return authJson(
        {
          error:
            "Curriculum or learner activity changed while this curriculum was being saved. Reload and retry.",
        },
        409,
      );
    }

    return authJson(
      {
        message: "Curriculum lessons added.",
        moduleNumber: curriculum.moduleNumber,
        addedLessons: curriculum.lessons.length,
      },
      201,
    );
  } catch (error) {
    if (error instanceof CurriculumInputError) {
      return authJson({ error: error.message }, 400);
    }
    if (error?.name === "ValidationError") {
      logAuthFailure("Curriculum validation", error);
      return authJson(
        { error: "Curriculum does not meet the course validation rules." },
        400,
      );
    }

    logAuthFailure("Curriculum management", error);
    return authJson(
      { error: "Unable to save course curriculum right now." },
      databaseFailureStatus(error),
    );
  }
}

export async function PUT(request, { params }) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) return csrf.response;

  const authorization = await authorizeInstructorApi("Curriculum update");
  if (authorization.response) return authorization.response;

  const courseId = await getCourseId(params);
  if (!courseId) {
    return authJson({ error: "A valid course ID is required." }, 400);
  }

  const parsed = await parseCurriculumBody(request);
  if (parsed.response) return parsed.response;

  try {
    await connectToDatabase();
    const course = await Course.findById(courseId)
      .select("_id title slug modules instructorId __v")
      .lean();
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

    if (!canManageCourse(authorization.user, course)) {
      return authJson(
        { error: "You are not authorized to modify this course curriculum." },
        403,
      );
    }

    let update;
    try {
      update = validateCurriculumUpdate(parsed.body, course.modules || []);
    } catch (error) {
      if (error instanceof CurriculumInputError) {
        return authJson({ error: error.message }, 400);
      }
      throw error;
    }

    const currentVersion = course.__v ?? 0;
    if (update.version !== currentVersion) {
      return authJson(
        {
          error:
            "Curriculum or learner activity changed while it was being edited. Reload and try again.",
        },
        409,
      );
    }

    if (update.removedLessonIds.length > 0) {
      const progressRecords = await LessonProgress.countDocuments({
        course: course._id,
        lessonId: { $in: update.removedLessonIds },
      });
      if (progressRecords > 0) {
        return authJson(
          {
            error:
              "Lessons with student progress cannot be deleted. No curriculum changes were saved.",
            dependencies: { progressRecords },
          },
          409,
        );
      }
    }

    const existingLessons = new Map(
      (course.modules || []).flatMap((module) =>
        (module.lessons || []).map((lesson) => [
          lesson._id.toString().toLowerCase(),
          lesson,
        ]),
      ),
    );
    const modules = update.modules.map((module) => {
      return {
        number: module.number,
        title: module.title,
        description: module.description,
        summary: "",
        lessons: module.lessons.map((lesson) => {
          const previousLesson = lesson.id
            ? existingLessons.get(lesson.id)
            : null;
          return {
            ...(lesson.id
              ? { _id: previousLesson._id }
              : { _id: new mongoose.Types.ObjectId() }),
            ...(previousLesson?.createdAt
              ? { createdAt: previousLesson.createdAt }
              : {}),
            ...(previousLesson?.updatedAt
              ? { updatedAt: previousLesson.updatedAt }
              : {}),
            title: lesson.title,
            description: lesson.description,
            type: lesson.type,
            content: lesson.content,
            videoUrl: lesson.videoUrl,
            durationMinutes: lesson.durationMinutes,
            order: lesson.order,
            published: lesson.published,
          };
        }),
      };
    });

    const result = await Course.updateOne(
      { _id: course._id, ...getCourseVersionFilter(currentVersion) },
      { $set: { modules }, $inc: { __v: 1 } },
      { runValidators: true },
    );
    if (result.matchedCount !== 1) {
      return authJson(
        {
          error:
            "Curriculum or learner activity changed while it was being saved. Reload and try again.",
        },
        409,
      );
    }

    const updatedCurriculum = serializeCurriculum({
      ...course,
      modules,
      __v: currentVersion + 1,
    });
    return authJson({
      message: "Curriculum saved.",
      curriculum: updatedCurriculum,
    });
  } catch (error) {
    if (error?.name === "ValidationError") {
      return authJson(
        { error: "Curriculum does not meet the course validation rules." },
        400,
      );
    }
    return adminCourseFailure("Admin curriculum update", error);
  }
}
