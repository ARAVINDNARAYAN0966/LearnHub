import "server-only";

import Course from "../models/Course";
import { connectToDatabase } from "./mongodb";

const ADMIN_COURSE_FIELDS =
  "_id title slug description category instructor price currency image published createdAt updatedAt";

export function serializeAdminCourse(course) {
  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    description: course.description,
    category: course.category,
    instructor: course.instructor,
    price: course.price,
    currency: course.currency,
    image: course.image,
    published: course.published,
    createdAt: course.createdAt?.toISOString?.() ?? null,
    updatedAt: course.updatedAt?.toISOString?.() ?? null,
  };
}

export async function getAllAdminCourses() {
  await connectToDatabase();
  const courses = await Course.find({})
    .select(ADMIN_COURSE_FIELDS)
    .sort({ updatedAt: -1, _id: -1 })
    .lean();

  return courses.map(serializeAdminCourse);
}
