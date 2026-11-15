export function getPublishedLessons(course) {
  const lessons = [];

  (course.modules || []).forEach((module, moduleIndex) => {
    (module.lessons || [])
      .filter((lesson) => lesson.published && lesson._id)
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
