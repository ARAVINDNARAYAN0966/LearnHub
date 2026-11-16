"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";

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
      result.error || "Unable to complete this curriculum operation.",
    );
    error.dependencies = result.dependencies || null;
    throw error;
  }

  return result;
}

function createEmptyLesson(order, clientId) {
  return {
    clientId,
    title: "",
    description: "",
    type: "article",
    content: "",
    videoUrl: "",
    durationMinutes: 0,
    order,
    published: false,
  };
}

function formatSaveError(error) {
  if (!error.dependencies?.progressRecords) return error.message;
  return `${error.message} (${error.dependencies.progressRecords} progress records found.)`;
}

function getNextModuleNumber(modules) {
  const used = new Set(modules.map((module) => module.number));
  let next = 1;
  while (used.has(String(next).padStart(2, "0"))) next += 1;
  return String(next).padStart(2, "0");
}

export default function AdminCurriculumManagement({ courseId }) {
  const [course, setCourse] = useState(null);
  const [version, setVersion] = useState(null);
  const [modules, setModules] = useState([]);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCurriculum = useCallback(async () => {
    const result = await requestJson(
      `/api/admin/courses/${courseId}/curriculum`,
    );
    if (
      !result.curriculum ||
      !Array.isArray(result.curriculum.modules) ||
      !Number.isSafeInteger(result.curriculum.version)
    ) {
      throw new Error("The curriculum response was invalid. Please retry.");
    }
    return result.curriculum;
  }, [courseId]);

  const applyCurriculum = useCallback((curriculum) => {
    const nextModules = curriculum.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({
        ...lesson,
        clientId: lesson.id ? undefined : crypto.randomUUID(),
      })),
    }));
    setCourse({
      id: curriculum.courseId,
      title: curriculum.courseTitle,
      slug: curriculum.courseSlug,
    });
    setVersion(curriculum.version);
    setModules(nextModules);
    setSavedSnapshot(JSON.stringify(nextModules));
  }, []);

  const loadCurriculum = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      applyCurriculum(await fetchCurriculum());
      return true;
    } catch (error) {
      setLoadError(error.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [applyCurriculum, fetchCurriculum]);

  useEffect(() => {
    let cancelled = false;
    fetchCurriculum()
      .then((curriculum) => {
        if (!cancelled) applyCurriculum(curriculum);
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
  }, [applyCurriculum, fetchCurriculum]);

  const isDirty = useMemo(
    () => JSON.stringify(modules) !== savedSnapshot,
    [modules, savedSnapshot],
  );

  function updateModule(number, changes) {
    setModules((current) =>
      current.map((module) =>
        module.number === number ? { ...module, ...changes } : module,
      ),
    );
    setFeedback(null);
  }

  function updateLesson(moduleNumber, lessonKey, changes) {
    setModules((current) =>
      current.map((module) =>
        module.number === moduleNumber
          ? {
              ...module,
              lessons: module.lessons.map((lesson, index) =>
                (lesson.id || lesson.clientId) === lessonKey
                  ? { ...lesson, ...changes }
                  : lesson,
              ),
            }
          : module,
      ),
    );
    setFeedback(null);
  }

  function addModule() {
    setModules((current) => {
      const number = getNextModuleNumber(current);
      return [...current, { number, title: "", description: "", lessons: [] }];
    });
    setFeedback(null);
  }

  function deleteModule(module) {
    const confirmed = window.confirm(
      `Delete module ${module.number} and its ${module.lessons.length} lesson(s)? Any lesson with student progress will block the save.`,
    );
    if (!confirmed) return;
    setModules((current) =>
      current.filter((item) => item.number !== module.number),
    );
    setFeedback(null);
  }

  function moveModule(moduleNumber, direction) {
    setModules((current) => {
      const index = current.findIndex((module) => module.number === moduleNumber);
      const destination = index + direction;
      if (index < 0 || destination < 0 || destination >= current.length) {
        return current;
      }
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [
        reordered[destination],
        reordered[index],
      ];
      return reordered;
    });
    setFeedback(null);
  }

  function addLesson(module) {
    setModules((current) =>
      current.map((item) => {
        if (item.number !== module.number) return item;
        const nextOrder =
          Math.max(0, ...item.lessons.map((lesson) => lesson.order)) + 1;
        return {
          ...item,
          lessons: [
            ...item.lessons,
            createEmptyLesson(nextOrder, crypto.randomUUID()),
          ],
        };
      }),
    );
    setFeedback(null);
  }

  function deleteLesson(module, lesson, lessonKey) {
    const confirmed = window.confirm(
      `Delete "${lesson.title || "this lesson"}"? Lessons with student progress cannot be deleted.`,
    );
    if (!confirmed) return;
    updateModule(module.number, {
      lessons: module.lessons.filter(
        (item) => (item.id || item.clientId) !== lessonKey,
      ),
    });
  }

  function moveLesson(module, lessonIndex, direction) {
    const orderedLessons = [...module.lessons].sort(
      (left, right) => left.order - right.order,
    );
    const destination = lessonIndex + direction;
    if (destination < 0 || destination >= orderedLessons.length) return;

    [orderedLessons[lessonIndex], orderedLessons[destination]] = [
      orderedLessons[destination],
      orderedLessons[lessonIndex],
    ];
    updateModule(module.number, {
      lessons: orderedLessons.map((lesson, index) => ({
        ...lesson,
        order: index + 1,
      })),
    });
  }

  async function saveCurriculum(event) {
    event.preventDefault();
    if (isSaving || !isDirty || version === null) return;

    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await requestJson(
        `/api/admin/courses/${courseId}/curriculum`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            version,
            modules: modules.map((module) => ({
              number: module.number,
              title: module.title,
              description: module.description,
              lessons: module.lessons.map(
                ({
                  id,
                  title,
                  description,
                  type,
                  content,
                  videoUrl,
                  durationMinutes,
                  order,
                  published,
                }) => ({
                  ...(id ? { id } : {}),
                  title,
                  description,
                  type,
                  content,
                  videoUrl,
                  durationMinutes,
                  order,
                  published,
                }),
              ),
            })),
          }),
        },
      );

      applyCurriculum(result.curriculum);
      setFeedback({ type: "success", message: "Curriculum saved." });
    } catch (error) {
      const message = formatSaveError(error);
      setFeedback({ type: "error", message });
      if (error.dependencies?.progressRecords) {
        await loadCurriculum();
        setFeedback({
          type: "error",
          message: `${message} No changes were saved; the saved curriculum has been reloaded.`,
        });
      } else if (error.message.includes("changed while")) {
        await loadCurriculum();
        setFeedback({
          type: "error",
          message: "Curriculum or learner activity changed elsewhere. Latest saved content reloaded; review and save again.",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="admin-curriculum-state" role="status" aria-live="polite">
        <span className="admin-loading-spinner" aria-hidden="true" />
        <p>Loading curriculum from MongoDB...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="admin-curriculum-state admin-curriculum-state-error" role="alert">
        <h2>Unable to load curriculum</h2>
        <p>{loadError}</p>
        <button
          className="button button-outline"
          type="button"
          onClick={() => void loadCurriculum()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="admin-curriculum-editor" aria-label="Curriculum editor">
      <div className="admin-curriculum-heading">
        <div>
          <span className="eyebrow">COURSE CURRICULUM</span>
          <h2>{course?.title}</h2>
          <p>Draft lessons stay hidden until published. Existing lesson IDs and progress are preserved when reordering.</p>
        </div>
        <Link className="button button-outline" href="/admin/courses">
          Back to courses
        </Link>
      </div>

      {feedback && (
        <div
          className={`admin-curriculum-feedback admin-curriculum-feedback-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live={feedback.type === "error" ? "assertive" : "polite"}
        >
          {feedback.message}
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={saveCurriculum}>
        <div className="admin-curriculum-toolbar">
          <div>
            <span className="eyebrow">CONTENT STRUCTURE</span>
            <strong>{modules.length} modules</strong>
          </div>
          <div className="admin-curriculum-toolbar-actions">
            <button
              className="button button-outline"
              type="button"
              onClick={addModule}
              disabled={isSaving}
            >
              Add module
            </button>
            <button
              className="button button-primary"
              type="submit"
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="admin-curriculum-state">
            <h3>No modules yet</h3>
            <p>Add a module, then create lessons with authored content before publishing them.</p>
            <button
              className="button button-primary"
              type="button"
              onClick={addModule}
              disabled={isSaving}
            >
              Add first module
            </button>
          </div>
        ) : (
          <div className="admin-module-list">
            {modules.map((module, moduleIndex) => (
              <fieldset
                className="admin-module-card"
                key={module.number}
                disabled={isSaving}
              >
                <legend className="sr-only">
                  Module {module.number}: {module.title || "Untitled"}
                </legend>
                <header className="admin-module-header">
                  <div className="admin-module-title">
                    <span className="admin-module-order">
                      {String(moduleIndex + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="eyebrow">MODULE {module.number}</span>
                      <h3>{module.title || "Untitled module"}</h3>
                    </div>
                    <span
                      className={`admin-course-status${module.lessons.some((lesson) => lesson.published) ? " admin-course-status-published" : " admin-course-status-draft"}`}
                    >
                      {module.lessons.some((lesson) => lesson.published)
                        ? "Published content"
                        : "Draft"}
                    </span>
                  </div>
                  <div className="admin-module-actions">
                    <button
                      className="admin-course-action"
                      type="button"
                      onClick={() => moveModule(module.number, -1)}
                      disabled={isSaving || moduleIndex === 0}
                      aria-label={`Move module ${module.number} up`}
                    >
                      ↑
                    </button>
                    <button
                      className="admin-course-action"
                      type="button"
                      onClick={() => moveModule(module.number, 1)}
                      disabled={isSaving || moduleIndex === modules.length - 1}
                      aria-label={`Move module ${module.number} down`}
                    >
                      ↓
                    </button>
                    <button
                      className="admin-course-action admin-course-action-danger"
                      type="button"
                      onClick={() => deleteModule(module)}
                      disabled={isSaving}
                    >
                      Delete module
                    </button>
                  </div>
                </header>

                <div className="admin-curriculum-module-fields">
                  <label>
                    Module title
                    <input
                      value={module.title}
                      onChange={(event) =>
                        updateModule(module.number, { title: event.target.value })
                      }
                      maxLength={200}
                      required
                    />
                  </label>
                  <label>
                    Module description
                    <textarea
                      value={module.description}
                      onChange={(event) =>
                        updateModule(module.number, {
                          description: event.target.value,
                        })
                      }
                      maxLength={2000}
                      rows={2}
                    />
                  </label>
                </div>

                <div className="admin-lesson-list-heading">
                  <span className="eyebrow">LESSONS</span>
                  <button
                    className="admin-course-action"
                    type="button"
                    onClick={() => addLesson(module)}
                    disabled={isSaving}
                  >
                    Add lesson
                  </button>
                </div>

                {module.lessons.length === 0 ? (
                  <p className="admin-module-empty">
                    No lessons yet. Add a lesson to start building this module.
                  </p>
                ) : (
                  <div className="admin-lesson-list">
                    {[...module.lessons]
                      .sort((left, right) => left.order - right.order)
                      .map((lesson, lessonIndex) => (
                        <article
                          className="admin-lesson-card"
                          key={lesson.id || lesson.clientId}
                        >
                          <header className="admin-lesson-header">
                            <div>
                              <span className="admin-lesson-order">
                                LESSON {lesson.order}
                              </span>
                              <strong>{lesson.title || "Untitled lesson"}</strong>
                              <span
                                className={`admin-course-status${lesson.published ? " admin-course-status-published" : " admin-course-status-draft"}`}
                              >
                                {lesson.published ? "Published" : "Draft"}
                              </span>
                            </div>
                            <div className="admin-module-actions">
                              <button
                                className="admin-course-action"
                                type="button"
                                onClick={() =>
                                  moveLesson(module, lessonIndex, -1)
                                }
                                disabled={isSaving || lessonIndex === 0}
                                aria-label={`Move ${lesson.title || "lesson"} up`}
                              >
                                ↑
                              </button>
                              <button
                                className="admin-course-action"
                                type="button"
                                onClick={() =>
                                  moveLesson(module, lessonIndex, 1)
                                }
                                disabled={
                                  isSaving ||
                                  lessonIndex === module.lessons.length - 1
                                }
                                aria-label={`Move ${lesson.title || "lesson"} down`}
                              >
                                ↓
                              </button>
                              <button
                                className="admin-course-action admin-course-action-danger"
                                type="button"
                                onClick={() =>
                                  deleteLesson(
                                    module,
                                    lesson,
                                    lesson.id || lesson.clientId,
                                  )
                                }
                                disabled={isSaving}
                              >
                                Delete
                              </button>
                            </div>
                          </header>
                          <div className="admin-curriculum-lesson-fields">
                            <label>
                              Title
                              <input
                                value={lesson.title}
                                onChange={(event) =>
                                  updateLesson(
                                    module.number,
                                    lesson.id || lesson.clientId,
                                    {
                                    title: event.target.value,
                                    },
                                  )
                                }
                                maxLength={200}
                                required
                              />
                            </label>
                            <label>
                              Description
                              <input
                                value={lesson.description}
                                onChange={(event) =>
                                  updateLesson(
                                    module.number,
                                    lesson.id || lesson.clientId,
                                    {
                                    description: event.target.value,
                                    },
                                  )
                                }
                                maxLength={2000}
                              />
                            </label>
                            <label>
                              Type
                              <select
                                value={lesson.type}
                                onChange={(event) =>
                                  updateLesson(
                                    module.number,
                                    lesson.id || lesson.clientId,
                                    {
                                    type: event.target.value,
                                    },
                                  )
                                }
                              >
                                <option value="article">Text</option>
                                <option value="video">Video</option>
                                <option value="quiz">Quiz</option>
                              </select>
                            </label>
                            <label>
                              Duration (minutes)
                              <input
                                type="number"
                                min="0"
                                max="1440"
                                step="1"
                                value={lesson.durationMinutes}
                                onChange={(event) =>
                                  updateLesson(
                                    module.number,
                                    lesson.id || lesson.clientId,
                                    { durationMinutes: event.target.value },
                                  )
                                }
                                required
                              />
                            </label>
                            <label>
                              Display order
                              <input
                                type="number"
                                min="0"
                                max="10000"
                                step="1"
                                value={lesson.order}
                                onChange={(event) =>
                                  updateLesson(
                                    module.number,
                                    lesson.id || lesson.clientId,
                                    { order: Number(event.target.value) },
                                  )
                                }
                                required
                              />
                            </label>
                            <label>
                              Publication status
                              <select
                                value={lesson.published ? "published" : "draft"}
                                onChange={(event) =>
                                  updateLesson(
                                    module.number,
                                    lesson.id || lesson.clientId,
                                    {
                                      published:
                                        event.target.value === "published",
                                    },
                                  )
                                }
                              >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                              </select>
                            </label>
                            {lesson.type === "video" && (
                              <label className="admin-curriculum-wide-field">
                                Video URL (HTTPS)
                                <input
                                  type="url"
                                  value={lesson.videoUrl}
                                  onChange={(event) =>
                                    updateLesson(
                                      module.number,
                                      lesson.id || lesson.clientId,
                                      { videoUrl: event.target.value },
                                    )
                                  }
                                  maxLength={2048}
                                />
                              </label>
                            )}
                            <label className="admin-curriculum-wide-field">
                              {lesson.type === "video"
                                ? "Learning content / transcript"
                                : "Text-based learning content"}
                              <textarea
                                value={lesson.content}
                                onChange={(event) =>
                                  updateLesson(
                                    module.number,
                                    lesson.id || lesson.clientId,
                                    { content: event.target.value },
                                  )
                                }
                                maxLength={100000}
                                rows={5}
                              />
                            </label>
                          </div>
                        </article>
                      ))}
                  </div>
                )}
              </fieldset>
            ))}
          </div>
        )}

        {modules.length > 0 && (
          <div className="admin-curriculum-footer">
            <p>
              {isDirty
                ? "You have unsaved curriculum changes."
                : "All curriculum changes are saved."}
            </p>
            <button
              className="button button-primary"
              type="submit"
              disabled={isSaving || !isDirty}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
