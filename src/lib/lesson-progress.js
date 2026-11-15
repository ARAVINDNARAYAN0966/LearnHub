import "server-only";

import Enrollment from "../models/Enrollment";
import LessonProgress from "../models/LessonProgress";
import {
  getPublishedLessons,
  summarizeLessonProgress,
} from "./lesson-utils";
import { connectToDatabase } from "./mongodb";

export { getPublishedLessons } from "./lesson-utils";

export async function getProgressSummaries(userId, courses) {
  await connectToDatabase();

  const courseLessons = courses.map((course) => ({
    course,
    lessons: getPublishedLessons(course),
  }));
  const courseIds = courseLessons.map(({ course }) => course._id);
  const lessonIds = [
    ...new Set(courseLessons.flatMap(({ lessons }) => lessons.map(({ id }) => id))),
  ];
  const records = lessonIds.length
    ? await LessonProgress.find({
        user: userId,
        course: { $in: courseIds },
        lessonId: { $in: lessonIds },
      })
        .select("course lessonId completed completedAt lastAccessedAt")
        .lean()
    : [];
  const recordsByCourse = new Map();
  records.forEach((record) => {
    const courseId = record.course.toString();
    const courseRecords = recordsByCourse.get(courseId) || [];
    courseRecords.push(record);
    recordsByCourse.set(courseId, courseRecords);
  });

  return new Map(
    courseLessons.map(({ course, lessons }) => {
      const courseId = course._id.toString();
      return [
        courseId,
        summarizeLessonProgress(lessons, recordsByCourse.get(courseId) || []),
      ];
    }),
  );
}

export async function getProgressSummary(userId, course) {
  const progressByCourse = await getProgressSummaries(userId, [course]);
  return progressByCourse.get(course._id.toString());
}

export async function recordLessonAccess({
  userId,
  courseId,
  lessonId,
  completed = false,
}) {
  await connectToDatabase();
  await LessonProgress.init();

  const filter = { user: userId, course: courseId, lessonId };
  let record = await LessonProgress.findOne(filter);
  const now = new Date();

  if (!record) {
    try {
      return await LessonProgress.create({
        ...filter,
        completed,
        completedAt: completed ? now : null,
        lastAccessedAt: now,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      record = await LessonProgress.findOne(filter);
      if (!record) throw error;
    }
  }

  if (completed && !record.completed) {
    record.completed = true;
    record.completedAt = now;
  }
  record.lastAccessedAt = now;
  await record.save();
  return record;
}

export async function updateEnrollmentProgress(userId, course, progress) {
  await connectToDatabase();

  const update = {
    completedLessons: progress.completedLessons,
    progressPercentage: progress.progressPercentage,
  };
  if (
    progress.totalPublishedLessons > 0 &&
    progress.completedLessons === progress.totalPublishedLessons
  ) {
    update.status = "completed";
  }

  const enrollment = await Enrollment.findOneAndUpdate(
    {
      user: userId,
      course: course._id,
      status: { $in: ["active", "completed"] },
    },
    { $set: update },
    { new: true, runValidators: true },
  )
    .select("status")
    .lean();

  return enrollment?.status ?? null;
}
