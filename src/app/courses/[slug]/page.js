import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import CourseCard from "../../../components/CourseCard";
import CourseEnrollmentAction from "../../../components/CourseEnrollmentAction";
import LessonProgress from "../../../models/LessonProgress";
import { getCurrentUser } from "../../../lib/auth";
import { getCourseCurriculumForUser } from "../../../lib/curriculum-data";
import {
  getPublishedCourseBySlug,
  getPublishedCourses,
} from "../../../lib/course-data";
import { formatPrice } from "../../../lib/format-price";

export async function generateMetadata({ params }) {
  await connection();
  const { slug } = await params;
  const canonicalSlug =
    slug === "product-design-figma" ? "product-design" : slug;
  const course = await getPublishedCourseBySlug(canonicalSlug);
  return { title: course ? course.title : "Course not found" };
}

export default function CoursePage({ params }) {
  return (
    <Suspense fallback={<main className="detail-loading page-container">Loading course details...</main>}>
      <CourseDetails params={params} />
    </Suspense>
  );
}

async function CourseDetails({ params }) {
  await connection();
  const { slug } = await params;
  if (slug === "product-design-figma") {
    permanentRedirect("/courses/product-design");
  }

  const course = await getPublishedCourseBySlug(slug);
  if (!course) notFound();

  const user = await getCurrentUser();
  const curriculumResult = user
    ? await getCourseCurriculumForUser(user, course.id)
    : null;
  const enrolledModules =
    curriculumResult?.access.allowed === true ? curriculumResult.modules : [];
  const enrollmentStatus = curriculumResult?.enrollmentStatus ?? null;
  const publishedLessonIds = enrolledModules.flatMap((module) =>
    module.lessons.map((lesson) => lesson.id),
  );
  let continueLessonId = publishedLessonIds[0] ?? null;
  if (
    user &&
    curriculumResult?.access.allowed &&
    publishedLessonIds.length > 0
  ) {
    const lastUnfinishedLesson = await LessonProgress.findOne({
      user: user.id,
      course: course.id,
      lessonId: { $in: publishedLessonIds },
      completed: false,
    })
      .sort({ lastAccessedAt: -1 })
      .select("lessonId")
      .lean();
    if (lastUnfinishedLesson) {
      continueLessonId = lastUnfinishedLesson.lessonId.toString();
    }
  }
  const courses = await getPublishedCourses();
  const sameCategory = courses.filter(
    (item) => item.slug !== slug && item.category === course.category,
  );
  const otherCourses = courses.filter(
    (item) => item.slug !== slug && item.category !== course.category,
  );
  const related = [...sameCategory, ...otherCourses].slice(0, 3);

  return (
    <main className="detail-page">
      <section className="detail-hero">
        <div className="page-container">
          <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><Link href="/courses">Courses</Link><span>/</span><span>{course.category}</span></div>
          <div className="detail-hero-grid">
            <div className="detail-intro">
              <span className="eyebrow eyebrow-light">{course.category.toUpperCase()} · {course.level.toUpperCase()}</span>
              <h1>{course.title}</h1>
              <p>{course.description}</p>
              <div className="detail-rating"><span aria-hidden="true">★★★★★</span> <strong>{course.rating}</strong> <span>({course.reviews.toLocaleString()} ratings)</span></div>
              <div className="detail-instructor"><span className="instructor-avatar">{course.instructor.split(" ").map((part) => part[0]).join("")}</span><span>Created by <strong>{course.instructor}</strong><small>{course.instructorRole}</small></span></div>
            </div>
            <div className={`detail-cover course-image-${course.color}`} style={{ backgroundImage: `url("${course.image}")` }} role="img" aria-label={`Cover image for ${course.title}`}>
              <span className="cover-play" aria-hidden="true">▶</span>
              <span className="cover-label">A CLASS TO COME BACK TO</span>
            </div>
          </div>
        </div>
      </section>
      <div className="page-container detail-layout">
        <div className="detail-main">
          <section className="detail-panel learn-panel">
            <span className="eyebrow">TAKE SOMETHING WITH YOU</span>
            <h2>What you’ll learn</h2>
            <div className="learn-grid">
              {course.learn.map((item) => <div key={item}><span aria-hidden="true">✓</span><p>{item}</p></div>)}
            </div>
          </section>
          <section className="detail-panel" id="curriculum">
            <span className="eyebrow">A CLEAR PATH, AT YOUR PACE</span>
            <h2>Course curriculum</h2>
            <p className="curriculum-summary">{course.lessons} lessons <span>·</span> {course.duration} <span>·</span> Learn anytime</p>
            <div className="curriculum-list">
              {course.curriculum.map(([number, title, description]) => {
                const lessons =
                  enrolledModules.find((module) => module.number === number)
                    ?.lessons ?? [];

                return (
                  <div className="curriculum-module" key={number}>
                    <div className="curriculum-row">
                      <span className="curriculum-number">{number}</span>
                      <strong>{title}</strong>
                      <span>{description}</span>
                      <span className="curriculum-plus" aria-hidden="true">
                        {lessons.length ? "−" : "+"}
                      </span>
                    </div>
                    {lessons.length > 0 && (
                      <ul className="curriculum-lessons">
                        {lessons.map((lesson) => (
                          <li key={lesson.id}>
                            <Link
                              href={`/learn/${course.slug}/${lesson.id}`}
                              className="curriculum-lesson-link"
                            >
                              <span>{lesson.title}</span>
                              <span>
                                {lesson.type}
                                {lesson.durationMinutes
                                  ? ` · ${lesson.durationMinutes} min`
                                  : ""}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="instructor-panel detail-panel">
            <span className="eyebrow">MEET YOUR INSTRUCTOR</span>
            <div className="instructor-profile"><span className="instructor-avatar instructor-avatar-large">{course.instructor.split(" ").map((part) => part[0]).join("")}</span><div><h2>{course.instructor}</h2><p>{course.instructorRole}</p><p className="instructor-bio">A thoughtful practitioner who loves making complex ideas feel simple, useful, and inspiring.</p></div></div>
          </section>
        </div>
        <aside className="enroll-card">
          <span className={`enroll-image course-image-${course.color}`} style={{ backgroundImage: `url("${course.image}")` }} />
          <div className="enroll-body">
            <span className="eyebrow">YOUR NEXT STEP</span>
            <div className="enroll-price">{formatPrice(course.price)}<del>{formatPrice(course.originalPrice)}</del></div>
            <p className="enroll-note">Enroll to save this course to your learning space.</p>
            <CourseEnrollmentAction
              courseId={course.id}
              courseSlug={course.slug}
              lessonId={continueLessonId}
              isAuthenticated={Boolean(user)}
              enrollmentStatus={enrollmentStatus}
            />
            <p className="enroll-includes">✓ Lifetime access<br />✓ Lessons you can revisit<br />✓ Learn on any device</p>
            <div className="enroll-facts"><span>◷ &nbsp;{course.duration} of lessons</span><span>▤ &nbsp;{course.lessons} bite-sized lessons</span><span>◎ &nbsp;{course.students} learners</span></div>
          </div>
        </aside>
      </div>
      {related.length > 0 && (
        <section className="page-container related-section"><div className="section-heading"><div><span className="eyebrow">KEEP FOLLOWING THE THREAD</span><h2>More to <span>explore.</span></h2></div><Link href="/courses" className="text-link">Explore all <span aria-hidden="true">↗</span></Link></div><div className="course-grid">{related.map((item) => <CourseCard key={item.slug} course={item} />)}</div></section>
      )}
    </main>
  );
}
