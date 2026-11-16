const LESSON_TYPES = new Set(["article", "video", "quiz"]);

function isValidPublishedLesson(lesson) {
  if (
    lesson.published !== true ||
    !lesson._id ||
    typeof lesson.title !== "string" ||
    !lesson.title.trim() ||
    !LESSON_TYPES.has(lesson.type) ||
    !Number.isInteger(lesson.durationMinutes) ||
    lesson.durationMinutes < 0 ||
    lesson.durationMinutes > 1440 ||
    !Number.isInteger(lesson.order) ||
    lesson.order < 0 ||
    lesson.order > 10000
  ) {
    return false;
  }

  const hasContent =
    typeof lesson.content === "string" &&
    lesson.content.length <= 100000 &&
    Boolean(lesson.content.trim());
  if (lesson.type !== "video") return hasContent;
  if (hasContent) return true;

  if (typeof lesson.videoUrl !== "string" || lesson.videoUrl.length > 2048) {
    return false;
  }

  try {
    const url = new URL(lesson.videoUrl);
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function getPublishedLessons(course) {
  const lessons = [];

  (course.modules || []).forEach((module, moduleIndex) => {
    (module.lessons || [])
      .filter(isValidPublishedLesson)
      .sort((left, right) => left.order - right.order)
      .forEach((lesson) => {
        lessons.push({
          id: lesson._id.toString(),
          title: lesson.title,
          description: lesson.description || "",
          type: lesson.type,
          content: lesson.content || "",
          videoUrl: lesson.videoUrl || "",
          durationMinutes: lesson.durationMinutes,
          order: lesson.order,
          moduleNumber:
            module.number || String(moduleIndex + 1).padStart(2, "0"),
          moduleTitle: module.title,
          moduleDescription: module.description || module.summary || "",
        });
      });
  });

  return lessons;
}

export function getPublishedModuleSummaries(course) {
  return (course.modules || []).flatMap((module, moduleIndex) => {
    const lessonCount = (module.lessons || []).filter(isValidPublishedLesson).length;
    if (lessonCount === 0) return [];

    return [
      {
        number: module.number || String(moduleIndex + 1).padStart(2, "0"),
        title: module.title,
        description: module.description || module.summary || "",
        lessonCount,
      },
    ];
  });
}

export function getCoursePublicationReadiness(course) {
  const publishedLessons = (course.modules || []).flatMap((module) =>
    (module.lessons || []).filter((lesson) => lesson.published === true),
  );

  if (publishedLessons.length === 0) {
    return {
      ready: false,
      error: "Publish at least one lesson before publishing this course.",
    };
  }

  if (publishedLessons.some((lesson) => !isValidPublishedLesson(lesson))) {
    return {
      ready: false,
      error: "Every published lesson must contain valid lesson material.",
    };
  }

  return { ready: true, error: null };
}

function formatLessonDuration(minutes) {
  if (minutes < 60) return minutes === 0 ? "0h" : `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `${hours}h ${remainingMinutes}m`
    : `${hours}h`;
}

export function getPublishedLessonStats(course) {
  const lessons = getPublishedLessons(course);
  const totalDurationMinutes = lessons.reduce(
    (total, lesson) => total + lesson.durationMinutes,
    0,
  );

  return {
    lessons: lessons.length,
    duration: formatLessonDuration(totalDurationMinutes),
  };
}

export function getEnrollmentDisplayStatus(status, progress) {
  if (status === "cancelled" || !progress?.totalPublishedLessons) {
    return status;
  }

  if (progress.completedLessons === progress.totalPublishedLessons) {
    return "completed";
  }
  return status === "completed" ? "active" : status;
}

export function summarizeLessonProgress(lessons, records) {
  const recordByLesson = new Map(
    records.map((record) => [record.lessonId.toString(), record]),
  );
  const lessonProgress = lessons.map((lesson) => {
    const record = recordByLesson.get(lesson.id);
    return {
      id: lesson.id,
      title: lesson.title,
      moduleTitle: lesson.moduleTitle,
      type: lesson.type,
      durationMinutes: lesson.durationMinutes,
      completed: Boolean(record?.completed),
      completedAt: record?.completedAt?.toISOString() ?? null,
      lastAccessedAt: record?.lastAccessedAt?.toISOString() ?? null,
    };
  });
  const completedLessons = lessonProgress.filter(
    (lesson) => lesson.completed,
  ).length;
  const completedLearningMinutes = lessonProgress.reduce(
    (total, lesson) =>
      total + (lesson.completed ? lesson.durationMinutes || 0 : 0),
    0,
  );
  const totalPublishedLessons = lessons.length;
  const progressPercentage =
    totalPublishedLessons === 0
      ? 0
      : Number(((completedLessons / totalPublishedLessons) * 100).toFixed(2));
  const nextLesson =
    lessonProgress.find((lesson) => !lesson.completed) ||
    lessonProgress.at(-1) ||
    null;

  return {
    totalPublishedLessons,
    completedLessons,
    completedLearningMinutes,
    progressPercentage,
    continueLessonId: nextLesson?.id ?? null,
    lessons: lessonProgress,
  };
}
