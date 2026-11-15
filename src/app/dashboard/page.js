import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import CourseCard from "../../components/CourseCard";
import LogoutButton from "../../components/LogoutButton";
import { getCurrentUser } from "../../lib/auth";
import { getPublishedCourses } from "../../lib/course-data";
import { getUserEnrollments } from "../../lib/enrollment-data";

export const metadata = { title: "My learning" };

function formatEnrollmentDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatLearningTime(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `${hours} hr ${remainingMinutes} min`
    : `${hours} hr`;
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-page" aria-busy="true">
          <div className="page-container dashboard-loading">
            Loading your learning space...
          </div>
        </main>
      }
    >
      <AuthenticatedDashboard />
    </Suspense>
  );
}

async function AuthenticatedDashboard() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const allEnrollments = await getUserEnrollments(user.id);
  const enrollments = allEnrollments.filter(
    (enrollment) =>
      enrollment.status === "active" || enrollment.status === "completed",
  );
  const activeCount = enrollments.filter(
    (enrollment) => enrollment.status === "active",
  ).length;
  const completedCount = enrollments.filter(
    (enrollment) => enrollment.status === "completed",
  ).length;
  const totalLearningMinutes = enrollments.reduce(
    (total, enrollment) => total + enrollment.completedLearningMinutes,
    0,
  );
  const enrolledCourseIds = new Set(
    enrollments
      .filter((enrollment) => enrollment.course)
      .map((enrollment) => enrollment.course.id),
  );
  const recommendations = (await getPublishedCourses())
    .filter((course) => !enrolledCourseIds.has(course.id))
    .slice(0, 3);

  const firstName = user.name.split(/\s+/)[0];
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <main className="dashboard-page">
      <section className="dashboard-welcome">
        <div className="page-container dashboard-welcome-inner">
          <div><span className="eyebrow eyebrow-light">YOUR LEARNING SPACE</span><h1>A good day to<br />learn something, {firstName}.</h1><p>You’re building something great. Keep it going.</p></div>
          <div className="dashboard-avatar">{initials}<span>✳</span></div>
        </div>
      </section>
      <div className="page-container dashboard-content">
        <div className="dashboard-stats">
          <article className="dashboard-stat"><span className="stat-icon stat-icon-lilac">↗</span><span className="eyebrow">ENROLLED COURSES</span><strong>{enrollments.length}</strong><p>Your active and completed courses.</p></article>
          <article className="dashboard-stat"><span className="stat-icon stat-icon-peach">◷</span><span className="eyebrow">ACTIVE COURSES</span><strong>{activeCount}</strong><p>Courses currently in progress.</p></article>
          <article className="dashboard-stat"><span className="stat-icon stat-icon-mint">✓</span><span className="eyebrow">COMPLETED COURSES</span><strong>{completedCount}</strong><p>Courses you have completed.</p></article>
          <article className="dashboard-stat"><span className="stat-icon stat-icon-lilac">◴</span><span className="eyebrow">LEARNING TIME</span><strong>{formatLearningTime(totalLearningMinutes)}</strong><p>Duration of your completed lessons.</p></article>
        </div>
        <section className="dashboard-courses">
          <div className="section-heading"><div><span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span><h2>Your learning <span>journey.</span></h2></div><Link className="text-link" href="/courses">Find another class <span aria-hidden="true">↗</span></Link></div>
          {enrollments.length === 0 ? (
            <div className="empty-state dashboard-learning-empty">
              <span aria-hidden="true">◷</span>
              <h2>No enrolled courses yet.</h2>
              <p>Explore the catalog and enroll in a course to start your learning journey.</p>
              <Link className="button button-primary" href="/courses">Explore courses</Link>
            </div>
          ) : (
            <div className="progress-course-list">
              {enrollments.filter((enrollment) => enrollment.course).map((enrollment) => {
                const { course } = enrollment;
                const progress = enrollment.progressPercentage;

                return (
                  <div className="progress-course" key={enrollment.id}>
                    <Link
                      className="progress-course-image"
                      href={`/courses/${course.slug}`}
                      style={{ backgroundImage: `url("${course.image}")` }}
                      aria-label={`View ${course.title}`}
                    />
                    <div className="progress-course-info">
                      <span className="eyebrow">{course.category} · {enrollment.status}</span>
                      <h3><Link href={`/courses/${course.slug}`}>{course.title}</Link></h3>
                      <p>Enrolled {formatEnrollmentDate(enrollment.enrolledAt)}</p>
                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-label={`${course.title} progress`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                      >
                        <span style={{ width: `${progress}%` }} />
                      </div>
                      <div className="progress-meta">
                        <span>{enrollment.completedLessons} of {enrollment.totalLessons} lessons</span>
                        <strong>{progress}%</strong>
                      </div>
                    </div>
                    <Link
                      className="progress-action"
                      href={
                        enrollment.continueLessonId
                          ? `/learn/${course.slug}/${enrollment.continueLessonId}`
                          : `/courses/${course.slug}#curriculum`
                      }
                    >
                      Continue learning <span aria-hidden="true">↗</span>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        <section className="profile-card"><div className="profile-card-icon">{initials}</div><div><span className="eyebrow">YOUR PROFILE</span><h2>{user.name}</h2><p>{user.email}</p><p className="profile-note">Your LearnHub account details.</p></div><LogoutButton className="button button-outline" /></section>
        {recommendations.length > 0 && (
          <section className="dashboard-recommend"><div className="section-heading"><div><span className="eyebrow">A GOOD NEXT STEP</span><h2>Explore another <span>class.</span></h2></div></div><div className="course-grid">{recommendations.map((course) => <CourseCard key={course.slug} course={course} />)}</div></section>
        )}
      </div>
    </main>
  );
}
