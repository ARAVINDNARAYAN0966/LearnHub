"use client";

export default function CourseDataError({ reset, title }) {
  return (
    <main className="page-container course-load-error">
      <section className="empty-state" role="alert">
        <span aria-hidden="true">↻</span>
        <h1>{title}</h1>
        <p>Please try again in a moment.</p>
        <button className="button button-outline" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
