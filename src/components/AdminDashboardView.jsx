import React from "react";
import Link from "next/link";

export function AdminAccessLoading({
  message = "Verifying administrator access...",
} = {}) {
  return (
    <main className="admin-dashboard admin-dashboard-loading min-h-screen">
      <div className="admin-loading-card" role="status" aria-live="polite">
        <span className="admin-loading-mark" aria-hidden="true">
          LH
        </span>
        <p>{message}</p>
      </div>
    </main>
  );
}

export function AdminAccessError() {
  return (
    <main className="admin-dashboard admin-dashboard-loading min-h-screen">
      <div className="admin-dashboard-error" role="alert">
        <span className="admin-state-icon" aria-hidden="true">
          !
        </span>
        <div>
          <h2>Administrator access could not be verified</h2>
          <p>
            We could not verify your account right now. Please try again.
          </p>
        </div>
        <Link className="admin-retry-link" href="/admin">
          Retry
        </Link>
      </div>
    </main>
  );
}

export function AdminDashboardLoading() {
  return (
    <div
      className="admin-dashboard-loading-panel"
      role="status"
      aria-live="polite"
    >
      <span className="admin-loading-spinner" aria-hidden="true" />
      <p>Loading dashboard statistics...</p>
    </div>
  );
}

export function AdminDashboardError() {
  return (
    <div className="admin-dashboard-error" role="alert">
      <span className="admin-state-icon" aria-hidden="true">
        !
      </span>
      <div>
        <h2>Dashboard data is unavailable</h2>
        <p>
          We could not load the latest data from the database. Please try again.
        </p>
      </div>
      <Link className="admin-retry-link" href="/admin">
        Retry
      </Link>
    </div>
  );
}

export default function AdminDashboardView({ stats }) {
  return (
    <div className="admin-overview-content">
      <section className="admin-stats-grid" aria-label="Platform statistics">
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-lilac" aria-hidden="true">
            C
          </span>
          <span className="eyebrow">TOTAL COURSES</span>
          <strong>{stats.totalCourses.toLocaleString()}</strong>
          <p>All course records</p>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-mint" aria-hidden="true">
            P
          </span>
          <span className="eyebrow">PUBLISHED COURSES</span>
          <strong>{stats.publishedCourses.toLocaleString()}</strong>
          <p>Visible in the catalog</p>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-peach" aria-hidden="true">
            D
          </span>
          <span className="eyebrow">DRAFT COURSES</span>
          <strong>{stats.draftCourses.toLocaleString()}</strong>
          <p>Not currently published</p>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-icon admin-stat-icon-blue" aria-hidden="true">
            E
          </span>
          <span className="eyebrow">TOTAL ENROLLMENTS</span>
          <strong>{stats.totalEnrollments.toLocaleString()}</strong>
          <p>All enrollment records</p>
        </article>
      </section>

      {stats.totalCourses === 0 && (
        <div className="admin-empty-state" role="status">
          <span aria-hidden="true">C</span>
          <div>
            <h2>No courses have been created yet.</h2>
            <p>
              Course totals will appear here once MongoDB contains course
              records.
            </p>
          </div>
        </div>
      )}

      <section className="admin-quick-links" aria-labelledby="admin-quick-links">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">WORKSPACE</span>
            <h2 id="admin-quick-links">Management areas</h2>
          </div>
          <p>Jump to a course-management area.</p>
        </div>
        <div className="admin-management-grid">
          <Link
            className="admin-management-card"
            href="/admin/courses"
          >
            <span className="admin-management-icon" aria-hidden="true">
              C
            </span>
            <span>
              <strong>Course management</strong>
              <small>Search, edit, and publish courses.</small>
            </span>
            <span className="admin-management-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <Link
            className="admin-management-card"
            href="/admin/courses"
          >
            <span className="admin-management-icon admin-management-icon-alt" aria-hidden="true">
              L
            </span>
            <span>
              <strong>Curriculum management</strong>
              <small>Choose a course to edit its modules and lessons.</small>
            </span>
            <span className="admin-management-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
          <Link
            className="admin-management-card"
            href="/admin/users"
          >
            <span className="admin-management-icon" aria-hidden="true">
              U
            </span>
            <span>
              <strong>User management</strong>
              <small>View users and manage instructor/admin roles.</small>
            </span>
            <span className="admin-management-arrow" aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      </section>

      <div className="admin-management-notices">
        <section
          className="admin-management-notice"
          id="course-management"
          aria-labelledby="course-management-title"
        >
          <span className="eyebrow">COURSES</span>
          <h2 id="course-management-title">Course management</h2>
          <p>
            Review and update course details in the course management area.
          </p>
          <Link className="admin-retry-link" href="/admin/courses">
            Open course management
          </Link>
        </section>
        <section
          className="admin-management-notice"
          id="curriculum-management"
          aria-labelledby="curriculum-management-title"
        >
          <span className="eyebrow">CURRICULUM</span>
          <h2 id="curriculum-management-title">Curriculum management</h2>
          <p>
            Edit modules and lessons from a course&apos;s curriculum workspace.
          </p>
          <Link className="admin-retry-link" href="/admin/courses">
            Choose a course
          </Link>
        </section>
      </div>
    </div>
  );
}
