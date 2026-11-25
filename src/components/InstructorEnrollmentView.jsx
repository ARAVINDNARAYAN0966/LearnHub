"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

function formatEnrollmentDate(isoString) {
  if (!isoString) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export default function InstructorEnrollmentView() {
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchEnrollments = useCallback(async () => {
    const params = new URLSearchParams();
    if (courseFilter !== "all") params.set("courseId", courseFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search.trim()) params.set("search", search.trim());

    const url = `/api/instructor/enrollments?${params.toString()}`;
    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load student enrollments.");
    }

    return data;
  }, [courseFilter, statusFilter, search]);

  const loadEnrollments = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchEnrollments();
      setEnrollments(data.enrollments || []);
      if (data.courses) setCourses(data.courses);
    } catch (error) {
      setLoadError(error.message || "Failed to load enrollments.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchEnrollments]);

  useEffect(() => {
    let cancelled = false;
    fetchEnrollments()
      .then((data) => {
        if (!cancelled) {
          setEnrollments(data.enrollments || []);
          if (data.courses) setCourses(data.courses);
          setIsLoading(false);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error.message || "Failed to load enrollments.");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fetchEnrollments]);

  const summary = useMemo(() => {
    const total = enrollments.length;
    const active = enrollments.filter((e) => e.status === "active").length;
    const completed = enrollments.filter((e) => e.status === "completed").length;
    return { total, active, completed };
  }, [enrollments]);

  return (
    <section className="instructor-enrollments-view" aria-label="Student enrollments">
      <div className="admin-overview-content mb-6">
        <section className="admin-stats-grid" aria-label="Enrollment summary statistics">
          <article className="admin-stat-card">
            <span className="admin-stat-icon admin-stat-icon-blue" aria-hidden="true">
              👥
            </span>
            <span className="eyebrow">TOTAL ENROLLED</span>
            <strong>{summary.total.toLocaleString()}</strong>
            <p>Students in your courses</p>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon admin-stat-icon-peach" aria-hidden="true">
              ▶
            </span>
            <span className="eyebrow">IN PROGRESS</span>
            <strong>{summary.active.toLocaleString()}</strong>
            <p>Active learning students</p>
          </article>
          <article className="admin-stat-card">
            <span className="admin-stat-icon admin-stat-icon-mint" aria-hidden="true">
              ✓
            </span>
            <span className="eyebrow">COMPLETED</span>
            <strong>{summary.completed.toLocaleString()}</strong>
            <p>100% course completions</p>
          </article>
        </section>
      </div>

      <div className="admin-course-toolbar">
        <div className="admin-course-search">
          <label className="sr-only" htmlFor="enrollment-search">
            Search enrollments
          </label>
          <input
            id="enrollment-search"
            type="search"
            placeholder="Search by student name, email, or course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="admin-course-status-filter">
          <span className="sr-only">Filter by course</span>
          <select
            id="course-select-filter"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>

        <label className="admin-course-status-filter">
          <span className="sr-only">Filter by status</span>
          <select
            id="status-select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>

        <button
          className="button button-outline"
          type="button"
          onClick={() => {
            setSearch("");
            setCourseFilter("all");
            setStatusFilter("all");
          }}
        >
          Reset
        </button>
      </div>

      {isLoading ? (
        <div className="admin-course-state" role="status" aria-live="polite">
          <span className="admin-loading-spinner" aria-hidden="true" />
          <p>Loading student enrollment data...</p>
        </div>
      ) : loadError ? (
        <div className="admin-course-state admin-course-state-error" role="alert">
          <h3>Unable to load enrollments</h3>
          <p>{loadError}</p>
          <button
            className="button button-outline"
            type="button"
            onClick={loadEnrollments}
          >
            Retry
          </button>
        </div>
      ) : enrollments.length === 0 ? (
        <div className="admin-course-state">
          <h3>No enrollments found</h3>
          <p>
            {search || courseFilter !== "all" || statusFilter !== "all"
              ? "No student enrollments match your filter criteria."
              : "Students who enroll in your published courses will appear here."}
          </p>
          <div className="flex gap-2 justify-center mt-2">
            <Link className="button button-outline" href="/instructor/courses">
              View your courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="admin-recent-courses-table-wrapper">
          <table className="admin-recent-courses-table" aria-label="Student enrollments list">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Course</th>
                <th scope="col">Enrolled Date</th>
                <th scope="col">Status</th>
                <th scope="col">Progress</th>
              </tr>
            </thead>
            <tbody>
              {enrollments.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.studentName}</strong>
                    <span className="admin-table-slug">{item.studentEmail}</span>
                  </td>
                  <td>
                    <strong>{item.courseTitle}</strong>
                    <div className="text-xs text-muted">
                      <Link
                        className="text-primary hover:underline"
                        href={`/instructor/courses/${item.courseId}/curriculum`}
                      >
                        Curriculum
                      </Link>
                    </div>
                  </td>
                  <td>{formatEnrollmentDate(item.enrolledAt)}</td>
                  <td>
                    <span
                      className={`admin-course-status${
                        item.status === "completed"
                          ? " admin-course-status-published"
                          : item.status === "active"
                            ? " admin-course-status-draft"
                            : ""
                      }`}
                    >
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 min-w-[140px]">
                      <div
                        className="text-xs font-semibold"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <span>{item.progressPercentage}%</span>
                        <span style={{ color: "var(--ink-muted, #726b77)" }}>
                          {item.completedLessons} / {item.totalLessons} lessons
                        </span>
                      </div>
                      <div
                        className="progress-track"
                        role="progressbar"
                        aria-label={`${item.studentName} progress in ${item.courseTitle}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={item.progressPercentage}
                        style={{ height: "6px" }}
                      >
                        <span style={{ width: `${item.progressPercentage}%` }} />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
