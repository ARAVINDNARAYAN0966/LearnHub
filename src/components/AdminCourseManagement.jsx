"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "../lib/format-price";

const EMPTY_FORM = {
  title: "",
  slug: "",
  description: "",
  category: "",
  instructor: "",
  level: "All Levels",
  price: "",
  image: "",
  published: false,
};

function slugFromTitle(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function requestJson(url, options) {
  let response;
  try {
    response = await fetch(url, { cache: "no-store", ...options });
  } catch {
    throw new Error("Unable to reach LearnHub. Check your connection and retry.");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response. Please retry.");
  }

  if (!response.ok) {
    const error = new Error(
      result.error || "Unable to complete this course operation.",
    );
    error.fieldErrors =
      result.fieldErrors && typeof result.fieldErrors === "object"
        ? result.fieldErrors
        : {};
    error.dependencies = result.dependencies || null;
    throw error;
  }

  return result;
}

function CourseField({ id, label, error, children, className = "" }) {
  return (
    <div className={`admin-course-field${className ? ` ${className}` : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error && (
        <span className="admin-course-field-error" id={`${id}-error`}>
          {error}
        </span>
      )}
    </div>
  );
}

export default function AdminCourseManagement({
  apiBase = "/api/admin/courses",
  curriculumBase = "/admin/courses",
}) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formValues, setFormValues] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [busyAction, setBusyAction] = useState(null);
  const [slugEdited, setSlugEdited] = useState(false);

  const fetchCourses = useCallback(async () => {
    const result = await requestJson(apiBase);
    if (!Array.isArray(result.courses)) {
      throw new Error("The course list response was invalid. Please retry.");
    }
    return result.courses;
  }, [apiBase]);

  const loadCourses = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      setCourses(await fetchCourses());
      return true;
    } catch (error) {
      setLoadError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [fetchCourses]);

  useEffect(() => {
    let cancelled = false;
    fetchCourses()
      .then((loadedCourses) => {
        if (!cancelled) {
          setCourses(loadedCourses);
          setLoadError("");
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchCourses]);

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return courses.filter((course) => {
      const matchesSearch =
        !query ||
        course.title.toLowerCase().includes(query) ||
        course.category.toLowerCase().includes(query);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && course.published) ||
        (statusFilter === "draft" && !course.published);
      return matchesSearch && matchesStatus;
    });
  }, [courses, search, statusFilter]);

  function openCreateForm() {
    setEditingCourse(null);
    setFormValues(EMPTY_FORM);
    setFieldErrors({});
    setFeedback(null);
    setSlugEdited(false);
    setIsFormOpen(true);
  }

  function openEditForm(course) {
    setEditingCourse(course);
    setFormValues({
      title: course.title,
      slug: course.slug,
      description: course.description,
      category: course.category,
      instructor: course.instructor,
      level: course.level || "All Levels",
      price: String(course.price),
      image: course.image,
      published: course.published,
    });
    setFieldErrors({});
    setFeedback(null);
    setSlugEdited(true);
    setIsFormOpen(true);
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormValues((current) => ({
      ...current,
      [name]: name === "published" ? value === "published" : value,
      ...(name === "title" && !slugEdited
        ? { slug: slugFromTitle(value) }
        : {}),
    }));

    if (name === "slug") setSlugEdited(true);
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFeedback(null);
  }

  async function handleSave(event) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setFieldErrors({});
    setFeedback(null);
    try {
      const payload = {
        ...formValues,
        price: Number(formValues.price),
      };
      const result = await requestJson(
        editingCourse
          ? `${apiBase}/${editingCourse.id}`
          : apiBase,
        {
          method: editingCourse ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      setIsFormOpen(false);
      setFeedback({
        type: "success",
        message: editingCourse ? "Course details saved." : "Course created.",
      });
      if (!result.course) {
        throw new Error("The server did not return the saved course.");
      }
      await loadCourses();
    } catch (error) {
      setFieldErrors(error.fieldErrors || {});
      setFeedback({ type: "error", message: error.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublication(course) {
    setBusyAction({ id: course.id, action: "publication" });
    setFeedback(null);
    try {
      await requestJson(`${apiBase}/${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !course.published }),
      });
      setFeedback({
        type: "success",
        message: course.published
          ? `"${course.title}" is now a draft.`
          : `"${course.title}" is published.`,
      });
      await loadCourses();
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDelete(course) {
    const confirmed = window.confirm(
      `Delete "${course.title}"? Courses with enrollments or lesson progress cannot be deleted.`,
    );
    if (!confirmed) return;

    setBusyAction({ id: course.id, action: "delete" });
    setFeedback(null);
    try {
      await requestJson(`${apiBase}/${course.id}`, {
        method: "DELETE",
      });
      setFeedback({
        type: "success",
        message: `"${course.title}" was deleted.`,
      });
      await loadCourses();
    } catch (error) {
      const dependencyMessage = error.dependencies
        ? ` (${error.dependencies.enrollments} enrollments, ${error.dependencies.lessonProgress} lesson progress records)`
        : "";
      setFeedback({
        type: "error",
        message: `${error.message}${dependencyMessage}`,
      });
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="admin-course-management" aria-label="Course management">
      <div className="admin-course-toolbar">
        <div className="admin-course-filters">
          <label className="admin-course-search">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search by course title or category</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title or category"
            />
          </label>
          <label className="admin-course-status-filter">
            <span className="sr-only">Filter by publication status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </label>
        </div>
        <button
          className="button button-primary admin-create-course-button"
          type="button"
          onClick={openCreateForm}
        >
          Create course <span aria-hidden="true">+</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`admin-course-feedback admin-course-feedback-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live={feedback.type === "error" ? "assertive" : "polite"}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      {isFormOpen && (
        <form className="admin-course-form" onSubmit={handleSave}>
          <div className="admin-course-form-heading">
            <div>
              <span className="eyebrow">
                {editingCourse ? "UPDATE COURSE" : "NEW COURSE"}
              </span>
              <h2>{editingCourse ? "Edit course details" : "Create a course"}</h2>
            </div>
            <button
              className="admin-course-close"
              type="button"
              onClick={() => setIsFormOpen(false)}
              aria-label="Close course form"
            >
              ×
            </button>
          </div>
          <div className="admin-course-form-grid">
            <CourseField
              id="admin-course-title"
              label="Title"
              error={fieldErrors.title}
            >
              <input
                id="admin-course-title"
                name="title"
                value={formValues.title}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={
                  fieldErrors.title ? "admin-course-title-error" : undefined
                }
                maxLength={200}
                required
              />
            </CourseField>
            <CourseField
              id="admin-course-slug"
              label="Slug"
              error={fieldErrors.slug}
            >
              <input
                id="admin-course-slug"
                name="slug"
                value={formValues.slug}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.slug)}
                aria-describedby={
                  fieldErrors.slug ? "admin-course-slug-error" : undefined
                }
                maxLength={200}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                required
              />
            </CourseField>
            <CourseField
              id="admin-course-category"
              label="Category"
              error={fieldErrors.category}
            >
              <input
                id="admin-course-category"
                name="category"
                value={formValues.category}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.category)}
                aria-describedby={
                  fieldErrors.category
                    ? "admin-course-category-error"
                    : undefined
                }
                maxLength={80}
                required
              />
            </CourseField>
            <CourseField
              id="admin-course-instructor"
              label="Instructor"
              error={fieldErrors.instructor}
            >
              <input
                id="admin-course-instructor"
                name="instructor"
                value={formValues.instructor}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.instructor)}
                aria-describedby={
                  fieldErrors.instructor
                    ? "admin-course-instructor-error"
                    : undefined
                }
                maxLength={120}
                required
              />
            </CourseField>
            <CourseField
              id="admin-course-level"
              label="Skill level"
              error={fieldErrors.level}
            >
              <select
                id="admin-course-level"
                name="level"
                value={formValues.level || "All Levels"}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.level)}
              >
                <option value="All Levels">All Levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </CourseField>
            <CourseField
              id="admin-course-price"
              label="Price (INR)"
              error={fieldErrors.price}
            >
              <input
                id="admin-course-price"
                name="price"
                type="number"
                min="0"
                step="1"
                value={formValues.price}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.price)}
                aria-describedby={
                  fieldErrors.price ? "admin-course-price-error" : undefined
                }
                required
              />
            </CourseField>
            <CourseField
              id="admin-course-image"
              label="Thumbnail / image URL (HTTPS)"
              error={fieldErrors.image}
            >
              <input
                id="admin-course-image"
                name="image"
                type="url"
                value={formValues.image}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.image)}
                aria-describedby={
                  fieldErrors.image ? "admin-course-image-error" : undefined
                }
                maxLength={2048}
                required
              />
            </CourseField>
            <CourseField
              id="admin-course-description"
              label="Description"
              error={fieldErrors.description}
              className="admin-course-description-field"
            >
              <textarea
                id="admin-course-description"
                name="description"
                value={formValues.description}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={
                  fieldErrors.description
                    ? "admin-course-description-error"
                    : undefined
                }
                maxLength={20000}
                rows={4}
                required
              />
            </CourseField>
            <CourseField
              id="admin-course-published"
              label="Publication status"
              error={fieldErrors.published}
            >
              <select
                id="admin-course-published"
                name="published"
                value={formValues.published ? "published" : "draft"}
                onChange={handleFieldChange}
                aria-invalid={Boolean(fieldErrors.published)}
                aria-describedby={
                  fieldErrors.published
                    ? "admin-course-published-error"
                    : undefined
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </CourseField>
          </div>
          {fieldErrors.form && (
            <p className="admin-course-field-error" role="alert">
              {fieldErrors.form}
            </p>
          )}
          <div className="admin-course-form-actions">
            <button
              className="button button-outline"
              type="button"
              onClick={() => setIsFormOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={isSaving}
            >
              {isSaving
                ? "Saving..."
                : editingCourse
                  ? "Save changes"
                  : "Create course"}
            </button>
          </div>
        </form>
      )}

      <div className="admin-course-list-heading">
        <div>
          <span className="eyebrow">COURSE CATALOG</span>
          <h2>Courses</h2>
        </div>
        {!isLoading && !loadError && (
          <span>
            Showing {filteredCourses.length} of {courses.length}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="admin-course-state" role="status" aria-live="polite">
          <span className="admin-loading-spinner" aria-hidden="true" />
          <p>Loading courses from MongoDB...</p>
        </div>
      ) : loadError ? (
        <div className="admin-course-state admin-course-state-error" role="alert">
          <p>{loadError}</p>
          <button
            className="button button-outline"
            type="button"
            onClick={() => void loadCourses()}
          >
            Retry
          </button>
        </div>
      ) : courses.length === 0 ? (
        <div className="admin-course-state">
          <h3>No courses yet</h3>
          <p>Create a course to start building the catalog.</p>
          <button
            className="button button-primary"
            type="button"
            onClick={openCreateForm}
          >
            Create course
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="admin-course-state">
          <h3>No matching courses</h3>
          <p>Try a different title, category, or publication status.</p>
          <button
            className="button button-outline"
            type="button"
            onClick={() => {
              setSearch("");
              setStatusFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="admin-course-list" aria-busy={Boolean(busyAction)}>
          {filteredCourses.map((course) => {
            const actionBusy = busyAction?.id === course.id;
            return (
              <article className="admin-course-card" key={course.id}>
                <Image
                  className="admin-course-thumbnail"
                  src={course.image}
                  alt=""
                  width={74}
                  height={74}
                  unoptimized
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <div className="admin-course-details">
                  <div className="admin-course-card-title">
                    <h3>{course.title}</h3>
                    <span
                      className={`admin-course-status${course.published ? " admin-course-status-published" : " admin-course-status-draft"}`}
                    >
                      {course.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p>{course.category} · {course.level || "All Levels"} · {course.instructor}</p>
                  <code>/{course.slug}</code>
                  <strong className="admin-course-price">
                    {formatPrice(course.price)}
                  </strong>
                </div>
                <div className="admin-course-actions">
                  <Link
                    className="admin-course-action"
                    href={`${curriculumBase}/${course.id}/curriculum`}
                  >
                    Manage Curriculum
                  </Link>
                  <button
                    className="admin-course-action"
                    type="button"
                    onClick={() => openEditForm(course)}
                    disabled={Boolean(busyAction) || isSaving}
                  >
                    Edit
                  </button>
                  <button
                    className="admin-course-action"
                    type="button"
                    onClick={() => void handlePublication(course)}
                    disabled={Boolean(busyAction) || isSaving}
                  >
                    {actionBusy && busyAction.action === "publication"
                      ? "Saving..."
                      : course.published
                        ? "Unpublish"
                        : "Publish"}
                  </button>
                  <button
                    className="admin-course-action admin-course-action-danger"
                    type="button"
                    onClick={() => void handleDelete(course)}
                    disabled={Boolean(busyAction) || isSaving}
                  >
                    {actionBusy && busyAction.action === "delete"
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
