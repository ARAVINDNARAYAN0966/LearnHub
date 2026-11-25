import "server-only";

import { connection } from "next/server";
import Course from "../models/Course";
import Enrollment from "../models/Enrollment";
import { connectToDatabase } from "./mongodb";

export async function getAdminDashboardStats() {
  await connection();
  await connectToDatabase();

  const [totalCourses, publishedCourses, totalEnrollments] = await Promise.all([
    Course.countDocuments({}),
    Course.countDocuments({ published: true }),
    Enrollment.countDocuments({}),
  ]);

  return {
    totalCourses,
    publishedCourses,
    draftCourses: totalCourses - publishedCourses,
    totalEnrollments,
  };
}

export async function getInstructorDashboardStats(instructorId) {
  await connection();
  await connectToDatabase();

  const filter = { instructorId };
  const instructorCourses = await Course.find(filter).select("_id").lean();
  const courseIds = (instructorCourses || []).map((c) => c._id);

  const [totalCourses, publishedCourses, totalEnrollments] = await Promise.all([
    Course.countDocuments(filter),
    Course.countDocuments({ ...filter, published: true }),
    courseIds.length > 0
      ? Enrollment.countDocuments({ course: { $in: courseIds } })
      : Promise.resolve(0),
  ]);

  return {
    totalCourses,
    publishedCourses,
    draftCourses: totalCourses - publishedCourses,
    totalEnrollments,
  };
}

export async function getInstructorRecentCourses(instructorId = null) {
  await connection();
  await connectToDatabase();

  try {
    const filter = instructorId ? { instructorId } : {};
    let query = Course.find(filter);
    if (typeof query.select === "function") {
      query = query.select("_id title slug category level published modules updatedAt");
    }
    if (typeof query.sort === "function") {
      query = query.sort({ updatedAt: -1, _id: -1 });
    }
    if (typeof query.limit === "function") {
      query = query.limit(5);
    }
    const recentDocs = typeof query.lean === "function" ? await query.lean() : await query;

    return (recentDocs || []).map((course) => ({
      id: course._id?.toString() ?? "",
      title: course.title || "",
      slug: course.slug || "",
      category: course.category || "General",
      level: course.level || "All Levels",
      published: Boolean(course.published),
      modulesCount: course.modules?.length || 0,
      lessonsCount:
        course.modules?.reduce(
          (acc, m) => acc + (m.lessons?.length || 0),
          0,
        ) || 0,
      updatedAt: course.updatedAt?.toISOString?.() ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getInstructorCompletionStats(instructorId = null) {
  await connection();
  await connectToDatabase();

  try {
    const filter = instructorId ? { instructorId } : {};
    let query = Course.find(filter);
    if (typeof query.select === "function") {
      query = query.select("_id");
    }
    const instructorCourses =
      typeof query.lean === "function" ? await query.lean() : await query;

    const courseIds = (instructorCourses || []).map((c) => c._id);
    if (courseIds.length === 0) {
      return { completedEnrollments: 0, completionRate: 0 };
    }

    const [totalEnrollments, completedEnrollments] = await Promise.all([
      Enrollment.countDocuments({ course: { $in: courseIds } }),
      Enrollment.countDocuments({
        course: { $in: courseIds },
        status: "completed",
      }),
    ]);

    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    return { completedEnrollments, completionRate };
  } catch {
    return { completedEnrollments: 0, completionRate: 0 };
  }
}
