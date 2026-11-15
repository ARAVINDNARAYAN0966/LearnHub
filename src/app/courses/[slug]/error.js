"use client";

import CourseDataError from "../../../components/CourseDataError";

export default function CourseDetailsError({ reset }) {
  return (
    <CourseDataError
      reset={reset}
      title="Course details are temporarily unavailable."
    />
  );
}
