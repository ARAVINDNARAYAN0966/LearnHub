import "server-only";

import Course from "../models/Course";
import { connectToDatabase } from "./mongodb";

function toCourseData(course) {
  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    description: course.description,
    category: course.category,
    instructor: course.instructor,
    instructorRole: course.instructorRole,
    price: course.price,
    originalPrice: course.originalPrice,
    currency: course.currency,
    image: course.image,
    duration: course.duration,
    lessons: course.lessons,
    rating: course.rating,
    reviews: course.reviews,
    students: course.students,
    level: course.level,
    color: course.color,
    learn: course.learn,
    curriculum: course.modules.map(({ number, title, description, summary }) => [
      number,
      title,
      description || summary,
    ]),
  };
}

export async function getPublishedCourses() {
  await connectToDatabase();
  const records = await Course.find({ published: true })
    .select("-__v")
    .sort({ title: 1 })
    .lean();

  return records.map(toCourseData);
}

export async function getPublishedCourseBySlug(slug) {
  await connectToDatabase();
  const course = await Course.findOne({ slug, published: true })
    .select("-__v")
    .lean();

  return course ? toCourseData(course) : null;
}
