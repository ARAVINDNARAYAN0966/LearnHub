"use client";

import { useMemo, useState } from "react";
import CourseCard from "./CourseCard";
import { catalogCategories } from "../lib/catalog-categories";

const categoryAliases = {
  Design: "UI/UX Design",
  Development: "Web Development",
  Business: "Data Science",
};

function matchesCategory(courseCategory, selectedCategory) {
  if (!selectedCategory) return true;
  if (!courseCategory) return false;
  if (courseCategory.toLowerCase() === selectedCategory.toLowerCase()) return true;

  const mappedCourseCategory = categoryAliases[courseCategory] || courseCategory;
  if (mappedCourseCategory.toLowerCase() === selectedCategory.toLowerCase()) return true;

  for (const [key, value] of Object.entries(categoryAliases)) {
    if (
      value.toLowerCase() === selectedCategory.toLowerCase() &&
      key.toLowerCase() === courseCategory.toLowerCase()
    ) {
      return true;
    }
  }

  return false;
}

export default function CourseCatalog({ courses, initialCategory = "", initialSearch = "" }) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(
    () => categoryAliases[initialCategory] || initialCategory,
  );
  const [sort, setSort] = useState("popular");

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses
      .filter((course) => matchesCategory(course.category, category))
      .filter((course) =>
        !query ||
        `${course.title} ${course.instructor} ${course.category} ${course.description} ${course.level}`
          .toLowerCase()
          .includes(query)
      )
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        if (sort === "rating") return b.rating - a.rating;
        return b.reviews - a.reviews;
      });
  }, [category, courses, search, sort]);

  return (
    <>
      <div className="catalog-controls">
        <label className="catalog-search">
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.7" cy="8.7" r="5.9" /><path d="m13.2 13.2 4 4" /></svg>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses or skills..."
            aria-label="Search courses"
          />
        </label>
        <label className="select-wrap" htmlFor="catalog-sort-select">
          <span className="sr-only">Sort courses</span>
          <select
            id="catalog-sort-select"
            aria-label="Sort courses by"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
          >
            <option value="popular">Most popular</option>
            <option value="rating">Highest rated</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
          </select>
        </label>
      </div>
      <div className="catalog-category-filters" role="group" aria-label="Filter by category">
        <button
          type="button"
          className={!category ? "category-filter-active" : ""}
          aria-pressed={!category}
          onClick={() => setCategory("")}
        >
          All courses
        </button>
        {catalogCategories.map((item) => (
          <button
            type="button"
            className={category === item ? "category-filter-active" : ""}
            aria-pressed={category === item}
            key={item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="catalog-result-row" aria-live="polite">
        <p>
          <strong>{filteredCourses.length}</strong>{" "}
          {filteredCourses.length === 1 ? "course" : "courses"} to explore
        </p>
        {(category || search) && (
          <button
            type="button"
            className="clear-filters"
            onClick={() => {
              setCategory("");
              setSearch("");
              setSort("popular");
            }}
          >
            Clear filters <span aria-hidden="true">×</span>
          </button>
        )}
      </div>
      {filteredCourses.length > 0 ? (
        <div className="course-grid">
          {filteredCourses.map((course) => (
            <CourseCard key={course.slug} course={course} showViewButton />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">⌕</span>
          <h2>{courses.length === 0 ? "No courses are available yet" : "No courses found"}</h2>
          <p>
            {courses.length === 0
              ? "Published courses will appear here when they become available."
              : "Try a different search or clear your filters to see all courses."}
          </p>
        </div>
      )}
    </>
  );
}
