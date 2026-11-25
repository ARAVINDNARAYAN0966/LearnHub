import "server-only";

import mongoose from "mongoose";
import User from "../models/User";
import Course from "../models/Course";
import Certificate from "../models/Certificate";
import Review from "../models/Review";
import Feedback from "../models/Feedback";
import { getUserEnrollments } from "./enrollment-data";
import { getInstructorDashboardStats } from "./admin-dashboard-data";
import { connectToDatabase } from "./mongodb";

export async function getUserProfile(userId) {
  await connectToDatabase();

  const user = await User.findById(userId)
    .select("name email username role createdAt headline bio location website github linkedin avatarUrl")
    .lean();

  if (!user) return null;

  const baseProfile = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    username: user.username || "",
    role: user.role,
    createdAt: user.createdAt?.toISOString() || null,
    headline: user.headline || "",
    bio: user.bio || "",
    location: user.location || "",
    website: user.website || "",
    github: user.github || "",
    linkedin: user.linkedin || "",
    avatarUrl: user.avatarUrl || "",
  };

  if (user.role === "student") {
    // 1. Enrollments
    const enrollments = await getUserEnrollments(userId);
    const completedCourses = enrollments.filter((e) => e.status === "completed").length;
    const activeCourses = enrollments.filter((e) => e.status === "active").length;
    const totalEnrolled = enrollments.length;

    // Overall learning progress
    const totalProgress = enrollments.reduce((acc, e) => acc + (e.progressPercentage || 0), 0);
    const averageProgress = totalEnrolled > 0 ? Math.round(totalProgress / totalEnrolled) : 0;
    const totalLearningMinutes = enrollments.reduce((acc, e) => acc + (e.completedLearningMinutes || 0), 0);

    // 2. Certificates
    const certificates = await Certificate.find({ user: userId })
      .sort({ issuedAt: -1 })
      .lean();

    const formattedCertificates = certificates.map((cert) => ({
      id: cert._id.toString(),
      certificateId: cert.certificateId,
      courseTitle: cert.courseTitle,
      instructorName: cert.instructorName,
      issuedAt: cert.issuedAt.toISOString(),
    }));

    // 3. Submitted Reviews
    const reviews = await Review.find({ user: userId })
      .populate("course", "title slug image")
      .sort({ createdAt: -1 })
      .lean();

    const formattedReviews = reviews.map((r) => ({
      id: r._id.toString(),
      courseTitle: r.course?.title || "Course",
      courseSlug: r.course?.slug || "",
      courseImage: r.course?.image || "",
      rating: r.rating,
      title: r.title || "",
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      ...baseProfile,
      studentData: {
        totalEnrolled,
        completedCourses,
        activeCourses,
        averageProgress,
        totalLearningMinutes,
        recentCourses: enrollments.slice(0, 4),
        certificates: formattedCertificates,
        reviews: formattedReviews,
      },
    };
  }

  if (user.role === "instructor") {
    const stats = await getInstructorDashboardStats(userId);
    const courses = await Course.find({
      $or: [{ instructorId: userId }, { instructor: user.name }],
    })
      .select("title slug category level published price rating reviews image duration students modules")
      .sort({ createdAt: -1 })
      .lean();

    const formattedCourses = courses.map((c) => ({
      id: c._id.toString(),
      title: c.title,
      slug: c.slug,
      category: c.category,
      level: c.level,
      published: Boolean(c.published),
      price: c.price,
      rating: c.rating,
      reviews: c.reviews,
      image: c.image,
      duration: c.duration,
      students: c.students,
      lessonCount: (c.modules || []).reduce((acc, m) => acc + (m.lessons || []).length, 0),
    }));

    const totalRatings = formattedCourses.reduce((sum, c) => sum + (c.reviews || 0), 0);
    const totalWeightedRating = formattedCourses.reduce((sum, c) => sum + (c.rating * (c.reviews || 0)), 0);
    const averageRating = totalRatings > 0 ? (totalWeightedRating / totalRatings).toFixed(1) : "N/A";

    return {
      ...baseProfile,
      instructorData: {
        stats,
        courses: formattedCourses,
        totalCourses: formattedCourses.length,
        publishedCount: formattedCourses.filter((c) => c.published).length,
        totalRatings,
        averageRating,
      },
    };
  }

  if (user.role === "admin") {
    const [totalUsers, totalCourses, totalFeedback] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Feedback.countDocuments(),
    ]);

    return {
      ...baseProfile,
      adminData: {
        totalUsers,
        totalCourses,
        totalFeedback,
        privileges: [
          "Full Platform User Management & Role Administration",
          "Course Curriculum Approval, Editing & Publishing",
          "Platform Feedback Facility Review & Resolution",
          "System Health Monitoring & Certificate Auditing",
        ],
      },
    };
  }

  return baseProfile;
}
