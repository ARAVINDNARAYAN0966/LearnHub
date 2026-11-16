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
