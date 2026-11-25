import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import CourseCard from "../../components/CourseCard";
import LogoutButton from "../../components/LogoutButton";
import ClaimCertificateButton from "../../components/ClaimCertificateButton";
import Certificate from "../../models/Certificate";
import { connectToDatabase } from "../../lib/mongodb";
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

  let certificates = [];
  try {
    await connectToDatabase();
    certificates = await Certificate.find({ user: user.id })
      .sort({ issuedAt: -1 })
      .lean();
  } catch {
    certificates = [];
  }

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
                    <div className="progress-course-actions flex flex-col sm:flex-row items-start sm:items-center gap-2">
                      <Link
                        className="progress-action"
                        href={
                          enrollment.continueLessonId
                            ? `/learn/${course.slug}/${enrollment.continueLessonId}`
                            : `/courses/${course.slug}#curriculum`
                        }
                      >
                        {progress === 100 ? "Review lessons" : "Continue learning"} <span aria-hidden="true">↗</span>
                      </Link>
                      {progress === 100 && (
                        <ClaimCertificateButton
                          courseId={course.id}
                          buttonText="Certificate 🎓"
                          className="button button-small button-outline"
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-certificates detail-panel mt-10">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR ACHIEVEMENTS</span>
              <h2>Verified <span>Certificates.</span></h2>
            </div>
            <Link className="text-link" href="/certificates/verify">
              Verify a credential <span aria-hidden="true">↗</span>
            </Link>
          </div>
          {certificates.length === 0 && completedCount === 0 ? (
            <div className="empty-state py-8 text-center">
              <span aria-hidden="true" className="text-3xl">
                🎓
              </span>
              <h3 className="font-bold text-base mt-2">
                No certificates earned yet
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Complete 100% of the lessons in any enrolled course to unlock
                your official verified certificate of completion.
              </p>
            </div>
          ) : (
            <div className="dashboard-certificates-grid">
              {certificates.map((cert) => (
                <article
                  key={cert.certificateId}
                  className="dashboard-cert-card"
                >
                  <div>
                    <div className="dashboard-cert-header">
                      <span className="dashboard-cert-id">
                        {cert.certificateId}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--ink-muted, #726b77)",
                        }}
                      >
                        {formatEnrollmentDate(cert.issuedAt || cert.createdAt)}
                      </span>
                    </div>
                    <h3
                      style={{
                        fontSize: 17,
                        fontWeight: 700,
                        margin: "8px 0 4px",
                      }}
                    >
                      {cert.courseTitle}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-muted, #726b77)",
                        margin: 0,
                      }}
                    >
                      Instructor: {cert.instructorName}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      paddingTop: 12,
                      borderTop: "1px solid var(--line, #e9e7e5)",
                    }}
                  >
                    <Link
                      href={`/certificates/${cert.certificateId}`}
                      className="button button-small button-primary text-xs"
                    >
                      View Certificate ↗
                    </Link>
                    <a
                      href={`/api/certificates/${cert.certificateId}/download`}
                      className="button button-small button-outline text-xs"
                      download
                    >
                      PDF ⬇
                    </a>
                  </div>
                </article>
              ))}

              {enrollments
                .filter(
                  (e) =>
                    e.course &&
                    (e.status === "completed" || e.progressPercentage === 100) &&
                    !certificates.some(
                      (c) =>
                        c.course?.toString() === e.course.id ||
                        c.course === e.course.id,
                    ),
                )
                .map((e) => (
                  <article
                    key={e.id}
                    className="dashboard-cert-card"
                    style={{
                      borderColor: "#f59e0b",
                      background: "rgba(245, 158, 11, 0.05)",
                    }}
                  >
                    <div>
                      <span className="eyebrow" style={{ color: "#b45309" }}>
                        COMPLETED COURSE · CERTIFICATE READY
                      </span>
                      <h3
                        style={{
                          fontSize: 17,
                          fontWeight: 700,
                          margin: "6px 0 4px",
                        }}
                      >
                        {e.course.title}
                      </h3>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--ink-muted, #726b77)",
                          margin: 0,
                        }}
                      >
                        All lessons completed. Claim your official credential
                        now.
                      </p>
                    </div>
                    <div>
                      <ClaimCertificateButton
                        courseId={e.course.id}
                        buttonText="Claim Certificate 🎓"
                        className="button button-small button-primary text-xs"
                      />
                    </div>
                  </article>
                ))}
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
