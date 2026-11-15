import "server-only";

import Course from "../models/Course";
import Enrollment from "../models/Enrollment";
import { getPublishedLessons } from "./lesson-utils";
import { connectToDatabase } from "./mongodb";
import { getCurriculumAccess } from "./curriculum-policy";

function serializePublishedCurriculum(course) {
  const lessonsByModule = new Map();
  for (const lesson of getPublishedLessons(course)) {
    const lessons = lessonsByModule.get(lesson.moduleNumber) || [];
    lessons.push({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      type: lesson.type,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      durationMinutes: lesson.durationMinutes,
      order: lesson.order,
    });
    lessonsByModule.set(lesson.moduleNumber, lessons);
  }

  return course.modules.flatMap((module, moduleIndex) => {
    const number =
      module.number || String(moduleIndex + 1).padStart(2, "0");
    const lessons = lessonsByModule.get(number) || [];
    if (!lessons.length) return [];

    return [
      {
        number,
        title: module.title,
        description: module.description || module.summary || "",
        lessons,
      },
    ];
  });
}

export async function getCourseCurriculumForUser(user, courseId) {
  await connectToDatabase();

  const course = await Course.findOne({ _id: courseId, published: true })
    .select("_id slug title modules")
    .lean();
  if (!course) {
    return { found: false };
  }

  const enrollment = user
    ? await Enrollment.findOne({
        user: user.id,
        course: course._id,
      })
        .select("status")
        .lean()
    : null;
  const access = getCurriculumAccess(user, enrollment);

  return {
    found: true,
    access,
    course: {
      id: course._id.toString(),
      slug: course.slug,
      title: course.title,
    },
    enrollmentStatus: enrollment?.status ?? null,
    modules: access.allowed ? serializePublishedCurriculum(course) : [],
  };
}
