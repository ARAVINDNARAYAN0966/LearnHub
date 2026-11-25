"use client";

import { useEffect, useState } from "react";

export default function HomeSearch() {
  const [placeholder, setPlaceholder] = useState("What would you love to learn?");

  useEffect(() => {
    function updatePlaceholder() {
      if (window.innerWidth < 640) {
        setPlaceholder("Search courses...");
      } else {
        setPlaceholder("What would you love to learn?");
      }
    }

    updatePlaceholder();
    window.addEventListener("resize", updatePlaceholder);
    return () => window.removeEventListener("resize", updatePlaceholder);
  }, []);

  return (
    <form className="home-search" action="/courses">
      <svg viewBox="0 0 20 20" aria-hidden="true">
        <circle cx="8.7" cy="8.7" r="5.9" />
        <path d="m13.2 13.2 4 4" />
      </svg>
      <input
        type="search"
        name="search"
        placeholder={placeholder}
        aria-label="Search courses"
      />
      <button type="submit">
        Find a course <span aria-hidden="true">↗</span>
      </button>
    </form>
  );
}
