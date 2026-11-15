import "server-only";

import Enrollment from "../models/Enrollment";
import { getProgressSummaries } from "./lesson-progress";
import { connectToDatabase } from "./mongodb";

const COURSE_FIELDS =
  "title slug description category instructor price originalPrice currency image duration rating reviews level color lessons modules";

function toCourseData(course) {
  if (!course) return null;

  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    description: course.description,
    category: course.category,
    instructor: course.instructor,
    price: course.price,
    originalPrice: course.originalPrice,
    currency: course.currency,
    image: course.image,
    duration: course.duration,
    rating: course.rating,
    reviews: course.reviews,
    level: course.level,
    color: course.color,
    lessons: course.lessons,
  };
}

export async function getUserEnrollments(userId) {
  await connectToDatabase();
  const enrollments = await Enrollment.find({ user: userId })
    .sort({ enrolledAt: -1, _id: -1 })
    .populate({ path: "course", select: COURSE_FIELDS })
    .lean();

  const courses = enrollments
    .map((enrollment) => enrollment.course)
    .filter(Boolean);
  const progressByCourse = await getProgressSummaries(userId, courses);

  return enrollments.map((enrollment) => {
    const course = enrollment.course;
    const progress = course
      ? progressByCourse.get(course._id.toString())
      : null;

    return {
      id: enrollment._id.toString(),
      enrolledAt: enrollment.enrolledAt.toISOString(),
      status: enrollment.status,
      progressPercentage: progress?.progressPercentage ?? 0,
      completedLessons: progress?.completedLessons ?? 0,
      totalLessons: progress?.totalPublishedLessons ?? 0,
      completedLearningMinutes: progress?.completedLearningMinutes ?? 0,
      continueLessonId: progress?.continueLessonId ?? null,
      course: toCourseData(course),
    };
  });
}
