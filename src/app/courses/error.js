"use client";

import CourseDataError from "../../components/CourseDataError";

export default function CoursesError({ reset }) {
  return (
    <CourseDataError
      reset={reset}
      title="Courses are temporarily unavailable."
    />
  );
}
