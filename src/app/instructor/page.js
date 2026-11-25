import { Suspense } from "react";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import AdminLayout from "../../components/AdminLayout.jsx";
import {
  AdminAccessError,
  AdminAccessLoading,
  AdminDashboardError,
  AdminDashboardLoading,
} from "../../components/AdminDashboardView.jsx";
import { getCurrentUser } from "../../lib/auth";
import {
  getAdminDashboardStats,
  getInstructorDashboardStats,
  getInstructorRecentCourses,
  getInstructorCompletionStats,
} from "../../lib/admin-dashboard-data";
import { getInstructorDashboardRedirect } from "../../lib/curriculum-policy";

export const metadata = { title: "Instructor dashboard" };

export default function InstructorPage() {
  return (
    <Suspense fallback={<AdminAccessLoading message="Verifying instructor access..." />}>
      <AuthenticatedInstructorDashboard />
    </Suspense>
  );
}

async function AuthenticatedInstructorDashboard() {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Instructor access verification failed (${errorName})`);
    return <AdminAccessError />;
  }

  const redirectTo = getInstructorDashboardRedirect(user);
  if (redirectTo) redirect(redirectTo);

  return (
    <AdminLayout
      activeSection="overview"
      title="Instructor dashboard"
      description="Monitor your courses, publish lessons, and track learner activity."
      role="instructor"
    >
      <Suspense fallback={<AdminDashboardLoading />}>
        <InstructorOverview user={user} />
      </Suspense>
    </AdminLayout>
  );
}

async function InstructorOverview({ user }) {
  let stats;
  let recentCourses = [];
  let completionStats = { completedEnrollments: 0, completionRate: 0 };
  try {
    const isPlatformAdmin = user.role === "admin";
    const instructorId = isPlatformAdmin ? null : user.id;

    [stats, recentCourses, completionStats] = await Promise.all([
      isPlatformAdmin
        ? getAdminDashboardStats()
        : getInstructorDashboardStats(user.id),
      getInstructorRecentCourses(instructorId),
      getInstructorCompletionStats(instructorId),
    ]);
  } catch (error) {
    unstable_rethrow(error);
    const errorName = error instanceof Error ? error.name : "UnknownError";
    console.error(`Instructor dashboard statistics failed (${errorName})`);
    return <AdminDashboardError />;
  }

  return (
    <div className="admin-overview-content">
      <section className="admin-stats-grid" aria-label="Course statistics">
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-lilac" aria-hidden="true">
            C
          </span>
          <span className="eyebrow">YOUR COURSES</span>
          <strong>{stats.totalCourses.toLocaleString()}</strong>
          <p>Total course offerings</p>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-mint" aria-hidden="true">
            P
          </span>
          <span className="eyebrow">PUBLISHED</span>
          <strong>{stats.publishedCourses.toLocaleString()}</strong>
          <p>Active in the catalog</p>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-peach" aria-hidden="true">
            D
          </span>
          <span className="eyebrow">DRAFT COURSES</span>
          <strong>{stats.draftCourses.toLocaleString()}</strong>
          <p>In preparation</p>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-blue" aria-hidden="true">
            E
          </span>
          <span className="eyebrow">ENROLLMENTS</span>
          <strong>{stats.totalEnrollments.toLocaleString()}</strong>
          <p>Active students</p>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-mint" aria-hidden="true">
            ✓
          </span>
          <span className="eyebrow">COMPLETIONS</span>
          <strong>{completionStats.completedEnrollments?.toLocaleString() || 0}</strong>
          <p>{completionStats.completionRate || 0}% completion rate</p>
        </article>
      </section>

      <section className="admin-quick-links" aria-labelledby="instructor-management-heading">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">QUICK ACTIONS</span>
            <h2 id="instructor-management-heading">Instructor workspace actions</h2>
          </div>
          <p>Manage courses, author curricula, and monitor learner progress.</p>
        </div>
        <div className="admin-management-grid">
          <Link className="admin-management-card" href="/instructor/courses">
            <span className="admin-management-icon" aria-hidden="true">
              +
            </span>
            <span>
              <strong>Create & Manage Courses</strong>
              <small>Author new courses, edit metadata, and publish.</small>
            </span>
            <span className="admin-management-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <Link className="admin-management-card" href="/instructor/enrollments">
            <span className="admin-management-icon admin-management-icon-mint" aria-hidden="true">
              👥
            </span>
            <span>
              <strong>Student Enrollments</strong>
              <small>View learner progress, completion rates, and rosters.</small>
            </span>
            <span className="admin-management-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <Link className="admin-management-card" href="/courses">
            <span className="admin-management-icon admin-management-icon-alt" aria-hidden="true">
              👁
            </span>
            <span>
              <strong>Browse Public Catalog</strong>
              <small>Review published courses from the learner perspective.</small>
            </span>
            <span className="admin-management-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      </section>

      <section className="admin-recent-courses-section" aria-labelledby="recent-courses-heading">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">RECENT COURSES</span>
            <h2 id="recent-courses-heading">Recent course activity</h2>
          </div>
          <Link className="button button-outline button-small" href="/instructor/courses">
            View all courses ↗
          </Link>
        </div>

        {recentCourses && recentCourses.length > 0 ? (
          <div className="admin-recent-courses-table-wrapper">
            <table className="admin-recent-courses-table">
              <thead>
                <tr>
                  <th scope="col">Course Title</th>
                  <th scope="col">Category</th>
                  <th scope="col">Level</th>
                  <th scope="col">Curriculum</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCourses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <strong>{course.title}</strong>
                      <span className="admin-table-slug">/{course.slug}</span>
                    </td>
                    <td>{course.category}</td>
                    <td>{course.level}</td>
                    <td>
                      {course.modulesCount}{" "}
                      {course.modulesCount === 1 ? "module" : "modules"} ·{" "}
                      {course.lessonsCount}{" "}
                      {course.lessonsCount === 1 ? "lesson" : "lessons"}
                    </td>
                    <td>
                      <span
                        className={`admin-course-status${course.published ? " admin-course-status-published" : " admin-course-status-draft"}`}
                      >
                        {course.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link
                          className="button button-small button-outline"
                          href={`/instructor/courses/${course.id}/curriculum`}
                        >
                          Curriculum
                        </Link>
                        {course.published && (
                          <Link
                            className="button button-small button-ghost"
                            href={`/courses/${course.slug}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Preview
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <p>No courses created yet.</p>
            <Link className="button button-primary" href="/instructor/courses">
              Create your first course
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
