import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import LessonCompletionAction from "../../../../components/LessonCompletionAction";
import LessonCurriculumSidebar from "../../../../components/LessonCurriculumSidebar";
import ClaimCertificateButton from "../../../../components/ClaimCertificateButton";
import LessonVideoPlayer from "../../../../components/LessonVideoPlayer";
import LessonArticleViewer from "../../../../components/LessonArticleViewer";
import { getCurrentUser } from "../../../../lib/auth";
import { canManageCourse } from "../../../../lib/curriculum-policy";
import {
  getProgressSummary,
  getPublishedLessons,
  PublishedLessonUnavailableError,
  recordLessonAccess,
} from "../../../../lib/lesson-progress";
import { connectToDatabase } from "../../../../lib/mongodb";
import Course from "../../../../models/Course";
import Enrollment from "../../../../models/Enrollment";

export async function generateMetadata() {
  return { title: "Learning | LearnHub" };
}

export default function LessonPage({ params }) {
  return (
    <Suspense
      fallback={
        <main className="lesson-page">
          <div className="page-container lesson-loading">
            Loading lesson...
          </div>
        </main>
      }
    >
      <LessonDetails params={params} />
    </Suspense>
  );
}

async function LessonDetails({ params }) {
  await connection();
  const { courseSlug, lessonId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  await connectToDatabase();
  const course = await Course.findOne({
    slug: courseSlug,
    published: true,
  }).lean();
  if (!course) notFound();

  const enrollment = await Enrollment.findOne({
    user: user.id,
    course: course._id,
    status: { $in: ["active", "completed"] },
  })
    .select("_id")
    .lean();

  const isPrivileged = user.role === "admin" || canManageCourse(user, course);
  if (!enrollment && !isPrivileged) {
    redirect(`/courses/${courseSlug}#curriculum`);
  }

  const lessons = getPublishedLessons(course);
  const lessonIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (lessonIndex < 0) notFound();

  const lesson = lessons[lessonIndex];
  try {
    await recordLessonAccess({
      userId: user.id,
      courseId: course._id,
      lessonId: lesson.id,
    });
  } catch (error) {
    if (error instanceof PublishedLessonUnavailableError) notFound();
    throw error;
  }
  const progress = await getProgressSummary(user.id, course);
  const lessonProgress = progress.lessons.find((item) => item.id === lesson.id);
  const previousLesson = lessons[lessonIndex - 1] ?? null;
  const nextLesson = lessons[lessonIndex + 1] ?? null;

  const completedLessonMap = new Map(
    (progress?.lessons || []).map((item) => [item.id, item.completed]),
  );

  const structuredModules = (course.modules || [])
    .map((module, moduleIdx) => {
      const moduleNumber =
        module.number || String(moduleIdx + 1).padStart(2, "0");
      const moduleLessons = lessons
        .filter((item) => item.moduleNumber === moduleNumber)
        .map((item) => ({
          ...item,
          completed: completedLessonMap.get(item.id) || false,
        }));
      return {
        number: moduleNumber,
        title: module.title,
        description: module.description || module.summary || "",
        lessons: moduleLessons,
      };
    })
    .filter((module) => module.lessons.length > 0);

  return (
    <main className="lesson-page">
      <div className="page-container lesson-layout">
        <div className="lesson-main">
          <nav className="breadcrumbs lesson-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/dashboard">My learning</Link>
            <span>/</span>
            <Link href={`/courses/${courseSlug}`}>{course.title}</Link>
            <span>/</span>
            <span>{lesson.moduleTitle}</span>
          </nav>
          <article className="lesson-content-panel">
            <header className="lesson-header">
              <span className="eyebrow">
                MODULE {lesson.moduleNumber} · {lesson.type.toUpperCase()}
              </span>
              <h1>{lesson.title}</h1>
              {lesson.description && <p>{lesson.description}</p>}
              {lesson.moduleDescription && (
                <p className="lesson-module-description">
                  {lesson.moduleDescription}
                </p>
              )}
              <div className="lesson-meta">
                <span>{lesson.moduleTitle}</span>
                {lesson.durationMinutes > 0 && (
                  <span>{lesson.durationMinutes} min</span>
                )}
              </div>
            </header>

            {lesson.type === "video" && lesson.videoUrl && (
              <div className="lesson-video-wrapper">
                <LessonVideoPlayer videoUrl={lesson.videoUrl} title={lesson.title} />
              </div>
            )}

            {lesson.content ? (
              lesson.type === "article" ? (
                <LessonArticleViewer content={lesson.content} />
              ) : (
                <div className="lesson-material">{lesson.content}</div>
              )
            ) : lesson.type !== "video" ? (
              <p className="lesson-material-empty">
                Lesson material has not been added yet.
              </p>
            ) : null}

            <LessonCompletionAction
              courseId={course._id.toString()}
              lessonId={lesson.id}
              initiallyCompleted={Boolean(lessonProgress?.completed)}
            />

            <nav className="lesson-navigation" aria-label="Lesson navigation">
              {previousLesson ? (
                <Link
                  href={`/learn/${courseSlug}/${previousLesson.id}`}
                  className="lesson-navigation-link"
                >
                  <span>Previous lesson</span>
                  <strong>{previousLesson.title}</strong>
                </Link>
              ) : (
                <Link
                  href={`/courses/${courseSlug}#curriculum`}
                  className="lesson-navigation-link"
                >
                  <span>Course curriculum</span>
                  <strong>Back to course</strong>
                </Link>
              )}
              {nextLesson ? (
                <Link
                  href={`/learn/${courseSlug}/${nextLesson.id}`}
                  className="lesson-navigation-link lesson-navigation-next"
                >
                  <span>Next lesson</span>
                  <strong>{nextLesson.title}</strong>
                </Link>
              ) : (
                <div className="lesson-navigation-link lesson-navigation-end">
                  <span>Course complete</span>
                  <strong>You’ve reached the last lesson</strong>
                  {progress.progressPercentage === 100 && (
                    <div className="mt-3">
                      <ClaimCertificateButton
                        courseId={course._id.toString()}
                        buttonText="Claim Certificate 🎓"
                        className="button button-small button-primary"
                      />
                    </div>
                  )}
                </div>
              )}
            </nav>
          </article>
        </div>

        <LessonCurriculumSidebar
          courseSlug={courseSlug}
          courseTitle={course.title}
          currentLessonId={lesson.id}
          progressPercentage={progress.progressPercentage}
          completedLessons={progress.completedLessons}
          totalLessons={progress.totalPublishedLessons}
          modules={structuredModules}
        />
      </div>
    </main>
  );
}
