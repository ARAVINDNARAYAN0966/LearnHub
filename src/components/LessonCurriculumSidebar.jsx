"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function LessonCurriculumSidebar({
  courseSlug,
  courseTitle,
  currentLessonId,
  progressPercentage = 0,
  completedLessons = 0,
  totalLessons = 0,
  modules = [],
}) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <aside className="lesson-sidebar" aria-label="Course curriculum navigation">
      {/* Mobile Drawer Toggle */}
      <div className="lesson-sidebar-mobile-toggle">
        <button
          type="button"
          onClick={() => setMobileExpanded((prev) => !prev)}
          className="lesson-sidebar-toggle-button button button-outline"
          aria-expanded={mobileExpanded}
          aria-controls="lesson-curriculum-content"
        >
          <span className="lesson-sidebar-toggle-left">
            <span aria-hidden="true">☰</span>
            <strong>Curriculum ({completedLessons}/{totalLessons})</strong>
          </span>
          <span className="lesson-sidebar-toggle-right">
            {progressPercentage}% · {mobileExpanded ? "Hide" : "Show"}
          </span>
        </button>
      </div>

      <div
        id="lesson-curriculum-content"
        className={`lesson-sidebar-inner${mobileExpanded ? " lesson-sidebar-mobile-open" : ""}`}
      >
        <div className="lesson-sidebar-header">
          <Link href={`/courses/${courseSlug}`} className="lesson-sidebar-back">
            <span aria-hidden="true">←</span> Back to course
          </Link>
          <h2 className="lesson-sidebar-title">{courseTitle}</h2>
          <div className="lesson-sidebar-progress">
            <div className="lesson-sidebar-progress-meta">
              <span>Course progress</span>
              <strong>{progressPercentage}%</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label={`${courseTitle} progress`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercentage}
            >
              <span style={{ width: `${progressPercentage}%` }} />
            </div>
            <p className="lesson-sidebar-progress-sub">
              {completedLessons} of {totalLessons} lessons completed
            </p>
          </div>
        </div>

        <div className="lesson-sidebar-modules">
          {modules.map((module) => {
            return (
              <div key={module.number} className="lesson-sidebar-module">
                <div className="lesson-sidebar-module-header">
                  <span className="eyebrow">MODULE {module.number}</span>
                  <h3 className="lesson-sidebar-module-title">{module.title}</h3>
                </div>
                <ul className="lesson-sidebar-lesson-list">
                  {module.lessons.map((item) => {
                    const isCurrent = item.id === currentLessonId;
                    const isCompleted = Boolean(item.completed);
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/learn/${courseSlug}/${item.id}`}
                          className={`lesson-sidebar-item${isCurrent ? " lesson-sidebar-item-current" : ""}${isCompleted ? " lesson-sidebar-item-completed" : ""}`}
                          aria-current={isCurrent ? "step" : undefined}
                          onClick={() => setMobileExpanded(false)}
                        >
                          <span
                            className={`lesson-sidebar-status-icon${isCompleted ? " lesson-status-completed" : isCurrent ? " lesson-status-current" : " lesson-status-pending"}`}
                            aria-hidden="true"
                          >
                            {isCompleted ? "✓" : isCurrent ? "▶" : "○"}
                          </span>
                          <div className="lesson-sidebar-item-info">
                            <span className="lesson-sidebar-item-title">{item.title}</span>
                            <span className="lesson-sidebar-item-meta">
                              {item.type === "article" ? "Article" : item.type === "video" ? "Video" : "Quiz"}
                              {item.durationMinutes ? ` · ${item.durationMinutes} min` : ""}
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
