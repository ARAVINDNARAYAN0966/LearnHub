import Course from "../../../../models/Course";
import { authJson } from "../../../../lib/auth-http";
import {
  adminCourseFailure,
  authorizeAdminApi,
  courseInputErrorResponse,
  duplicateSlugResponse,
  isDuplicateSlugError,
  parseAdminJsonBody,
} from "../../../../lib/admin-course-api";
import { getAllAdminCourses, serializeAdminCourse } from "../../../../lib/admin-course-data";
import { connectToDatabase } from "../../../../lib/mongodb";
import {
  AdminCourseInputError,
  createCourseDocument,
  validateAdminCourseInput,
} from "../../../../lib/admin-course-validation";

export async function GET() {
  const authorization = await authorizeAdminApi("Admin course list");
  if (authorization.response) return authorization.response;

  try {
    const courses = await getAllAdminCourses();
    return authJson({ courses });
  } catch (error) {
    return adminCourseFailure("Admin course list", error);
  }
}

export async function POST(request) {
  const authorization = await authorizeAdminApi("Admin course creation");
  if (authorization.response) return authorization.response;

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

  if (input.published) {
    return authJson(
      {
        error:
          "Add and publish at least one valid lesson before publishing this course.",
      },
      409,
    );
  }

  try {
    await connectToDatabase();
    if (await Course.exists({ slug: input.slug })) {
      return duplicateSlugResponse();
    }

    const course = await Course.create(createCourseDocument(input));
    return authJson({ course: serializeAdminCourse(course) }, 201);
  } catch (error) {
    if (isDuplicateSlugError(error)) return duplicateSlugResponse();
    return adminCourseFailure("Admin course creation", error);
  }
}
