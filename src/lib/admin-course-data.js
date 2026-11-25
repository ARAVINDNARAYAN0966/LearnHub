import "server-only";

import Course from "../models/Course";
import { connectToDatabase } from "./mongodb";

const ADMIN_COURSE_FIELDS =
  "_id title slug description category instructor instructorId instructorRole price currency image published level createdAt updatedAt";

export function serializeAdminCourse(course) {
  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    description: course.description,
    category: course.category,
    instructor: course.instructor,
    instructorRole: course.instructorRole || null,
    instructorId: course.instructorId ? course.instructorId.toString() : null,
    price: course.price,
    currency: course.currency,
    image: course.image,
    published: course.published,
    level: course.level || "All Levels",
    createdAt: course.createdAt?.toISOString?.() ?? null,
    updatedAt: course.updatedAt?.toISOString?.() ?? null,
  };
}

export async function getAllAdminCourses(filter = {}) {
  await connectToDatabase();
  const courses = await Course.find(filter)
    .select(ADMIN_COURSE_FIELDS)
    .sort({ updatedAt: -1, _id: -1 })
    .lean();

  return courses.map(serializeAdminCourse);
}
