import mongoose from "mongoose";
import Course from "../../../../../../models/Course";
import { getCurrentUser } from "../../../../../../lib/auth";
import { authJson, logAuthFailure } from "../../../../../../lib/auth-http";
import { getCurriculumManagementAccess } from "../../../../../../lib/curriculum-policy";
import {
  CurriculumInputError,
  validateCurriculumAppend,
} from "../../../../../../lib/curriculum-validation";
import { connectToDatabase } from "../../../../../../lib/mongodb";

const MAX_BODY_BYTES = 256000;

function databaseFailureStatus(error) {
  return error?.name === "MongooseServerSelectionError" ? 503 : 500;
}

export async function POST(request, { params }) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure("Curriculum management authentication", error);
    return authJson(
      { error: "Unable to verify your session." },
      databaseFailureStatus(error),
    );
  }

  const access = getCurriculumManagementAccess(user);
  if (!access.allowed) {
    return authJson({ error: access.error }, access.status);
  }

  const { courseId } = await params;
  if (!/^[\da-f]{24}$/i.test(courseId) || !mongoose.isValidObjectId(courseId)) {
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
    const course = await Course.findById(courseId).select("modules");
    if (!course) {
      return authJson({ error: "Course not found." }, 404);
    }

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
        },
        { runValidators: true },
      );
    } else {
      updateResult = await Course.updateOne(
        {
          _id: course._id,
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
        },
        { runValidators: true },
      );
    }

    if (updateResult.matchedCount === 0) {
      return authJson(
        {
          error:
            "The module or lesson order changed while this curriculum was being saved.",
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
