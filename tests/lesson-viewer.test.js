import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import LessonCurriculumSidebar from "../src/components/LessonCurriculumSidebar.jsx";

function render(element) {
  return renderToStaticMarkup(element);
}

describe("LessonCurriculumSidebar", () => {
  const sampleModules = [
    {
      number: "01",
      title: "Getting Started",
      description: "Introductory module",
      lessons: [
        {
          id: "lesson-1",
          title: "Welcome to the Course",
          type: "article",
          durationMinutes: 5,
          completed: true,
        },
        {
          id: "lesson-2",
          title: "Setting Up Your Environment",
          type: "video",
          durationMinutes: 12,
          completed: false,
        },
      ],
    },
    {
      number: "02",
      title: "Core Fundamentals",
      description: "Deep dive",
      lessons: [
        {
          id: "lesson-3",
          title: "Building Components",
          type: "article",
          durationMinutes: 15,
          completed: false,
        },
      ],
    },
  ];

  it("renders course title and back link", () => {
    const html = render(
      createElement(LessonCurriculumSidebar, {
        courseSlug: "intro-web-dev",
        courseTitle: "Introduction to Web Development",
        currentLessonId: "lesson-2",
        progressPercentage: 33.33,
        completedLessons: 1,
        totalLessons: 3,
        modules: sampleModules,
      }),
    );

    expect(html).toContain("Introduction to Web Development");
    expect(html).toContain('href="/courses/intro-web-dev"');
    expect(html).toContain("Back to course");
  });

  it("displays course progress and lesson counts", () => {
    const html = render(
      createElement(LessonCurriculumSidebar, {
        courseSlug: "intro-web-dev",
        courseTitle: "Introduction to Web Development",
        currentLessonId: "lesson-2",
        progressPercentage: 33.33,
        completedLessons: 1,
        totalLessons: 3,
        modules: sampleModules,
      }),
    );

    expect(html).toContain("33.33%");
    expect(html).toContain("1 of 3 lessons completed");
    expect(html).toContain('aria-valuenow="33.33"');
  });

  it("renders all modules and lessons with correct status indicators", () => {
    const html = render(
      createElement(LessonCurriculumSidebar, {
        courseSlug: "intro-web-dev",
        courseTitle: "Introduction to Web Development",
        currentLessonId: "lesson-2",
        progressPercentage: 33.33,
        completedLessons: 1,
        totalLessons: 3,
        modules: sampleModules,
      }),
    );

    // Module 1
    expect(html).toContain("MODULE 01");
    expect(html).toContain("Getting Started");
    expect(html).toContain("Welcome to the Course");
    expect(html).toContain("lesson-sidebar-item-completed");
    expect(html).toContain("lesson-status-completed");
    expect(html).toContain("✓");

    // Lesson 2 is current
    expect(html).toContain("Setting Up Your Environment");
    expect(html).toContain("lesson-sidebar-item-current");
    expect(html).toContain('aria-current="step"');
    expect(html).toContain("▶");

    // Module 2
    expect(html).toContain("MODULE 02");
    expect(html).toContain("Core Fundamentals");
    expect(html).toContain("Building Components");
    expect(html).toContain("○");
  });
});
