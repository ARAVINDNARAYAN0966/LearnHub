const MODULE_KEYS = [
  "moduleNumber",
  "moduleTitle",
  "moduleDescription",
  "lessons",
];
const LESSON_KEYS = [
  "title",
  "description",
  "type",
  "content",
  "videoUrl",
  "durationMinutes",
  "order",
  "published",
];
const LESSON_TYPES = new Set(["article", "video", "quiz"]);
const MAX_MODULES = 100;
const MAX_LESSONS = 1000;

export class CurriculumInputError extends Error {}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CurriculumInputError(`${label} must be an object.`);
  }
}

function assertAllowedKeys(value, allowedKeys, label) {
  if (Object.keys(value).some((key) => !allowedKeys.includes(key))) {
    throw new CurriculumInputError(`${label} contains unsupported fields.`);
  }
}

function optionalText(value, label, maximumLength) {
  if (value === undefined) return "";
  if (typeof value !== "string" || value.length > maximumLength) {
    throw new CurriculumInputError(`${label} is invalid.`);
  }
  return value.trim();
}

function requiredText(value, label, maximumLength) {
  const text = optionalText(value, label, maximumLength);
  if (!text) {
    throw new CurriculumInputError(`${label} is required.`);
  }
  return text;
}

function validateVideoUrl(value) {
  const videoUrl = optionalText(value, "Video URL", 2048);
  if (!videoUrl) return "";

  try {
    const url = new URL(videoUrl);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      throw new Error("Invalid video URL");
    }
  } catch {
    throw new CurriculumInputError("Video URLs must be valid HTTPS URLs.");
  }

  return videoUrl;
}

export function validateCurriculumAppend(body, existingModule = null) {
  assertObject(body, "Request body");
  assertAllowedKeys(body, MODULE_KEYS, "Request body");

  const moduleNumber = requiredText(body.moduleNumber, "Module number", 20);
  if (
    existingModule &&
    (body.moduleTitle !== undefined || body.moduleDescription !== undefined)
  ) {
    throw new CurriculumInputError(
      "Existing module details cannot be changed by this append-only operation.",
    );
  }

  const moduleTitle = existingModule
    ? ""
    : requiredText(body.moduleTitle, "Module title", 200);
  const moduleDescription = existingModule
    ? ""
    : optionalText(body.moduleDescription, "Module description", 2000);

  if (
    !Array.isArray(body.lessons) ||
    body.lessons.length < 1 ||
    body.lessons.length > 50
  ) {
    throw new CurriculumInputError("Provide between 1 and 50 lessons.");
  }

  const lessonOrders = new Set(
    (existingModule?.lessons || []).map((lesson) => lesson.order),
  );
  const lessons = body.lessons.map((lesson) => {
    assertObject(lesson, "Lesson");
    assertAllowedKeys(lesson, LESSON_KEYS, "Lesson");

    const title = requiredText(lesson.title, "Lesson title", 200);
    const description = optionalText(
      lesson.description,
      "Lesson description",
      2000,
    );
    if (!LESSON_TYPES.has(lesson.type)) {
      throw new CurriculumInputError(
        "Lesson type must be article, video, or quiz.",
      );
    }

    const content = optionalText(lesson.content, "Lesson content", 100000);
    const videoUrl = validateVideoUrl(lesson.videoUrl);
    const durationMinutes =
      typeof lesson.durationMinutes === "string" &&
      /^\d+$/.test(lesson.durationMinutes.trim())
        ? Number.parseInt(lesson.durationMinutes.trim(), 10)
        : lesson.durationMinutes;
    const order =
      typeof lesson.order === "string" && /^\d+$/.test(lesson.order.trim())
        ? Number.parseInt(lesson.order.trim(), 10)
        : lesson.order;
    const published = lesson.published === undefined ? false : lesson.published;

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 0 ||
      durationMinutes > 1440
    ) {
      throw new CurriculumInputError(
        "Lesson duration must be a whole number from 0 to 1440 minutes.",
      );
    }
    if (!Number.isInteger(order) || order < 0 || order > 10000) {
      throw new CurriculumInputError(
        "Lesson order must be a whole number from 0 to 10000.",
      );
    }
    if (lessonOrders.has(order)) {
      throw new CurriculumInputError(
        "Lesson order values must be unique within the module.",
      );
    }
    lessonOrders.add(order);
    if (typeof published !== "boolean") {
      throw new CurriculumInputError("Lesson publication status must be boolean.");
    }
    if (
      published &&
      (lesson.type === "video" ? !content && !videoUrl : !content)
    ) {
      throw new CurriculumInputError(
        "Published lessons must include their lesson material.",
      );
    }

    return {
      title,
      description,
      type: lesson.type,
      content,
      videoUrl,
      durationMinutes,
      order,
      published,
    };
  });

  return {
    moduleNumber,
    moduleTitle,
    moduleDescription,
    lessons,
  };
}

export function validateCurriculumUpdate(body, existingModules = []) {
  assertObject(body, "Request body");
  assertAllowedKeys(body, ["version", "modules"], "Request body");

  if (!Number.isSafeInteger(body.version) || body.version < 0) {
    throw new CurriculumInputError("Curriculum version is invalid.");
  }
  if (!Array.isArray(body.modules) || body.modules.length > MAX_MODULES) {
    throw new CurriculumInputError(
      `Provide no more than ${MAX_MODULES} modules.`,
    );
  }

  const existingLessonIds = new Set();
  for (const existingModule of existingModules) {
    for (const lesson of existingModule.lessons || []) {
      if (lesson._id) existingLessonIds.add(lesson._id.toString().toLowerCase());
    }
  }

  const moduleNumbers = new Set();
  const lessonIds = new Set();
  let totalLessons = 0;
  const modules = body.modules.map((moduleData) => {
    assertObject(moduleData, "Module");
    assertAllowedKeys(
      moduleData,
      ["number", "title", "description", "lessons"],
      "Module",
    );

    const number = requiredText(moduleData.number, "Module number", 20);
    if (moduleNumbers.has(number)) {
      throw new CurriculumInputError("Module numbers must be unique.");
    }
    moduleNumbers.add(number);

    const title = requiredText(moduleData.title, "Module title", 200);
    const description = optionalText(
      moduleData.description,
      "Module description",
      2000,
    );
    if (!Array.isArray(moduleData.lessons)) {
      throw new CurriculumInputError("Module lessons must be an array.");
    }

    totalLessons += moduleData.lessons.length;
    if (totalLessons > MAX_LESSONS) {
      throw new CurriculumInputError(
        `Provide no more than ${MAX_LESSONS} lessons.`,
      );
    }

    const orders = new Set();
    const lessons = moduleData.lessons.map((lesson) => {
      assertObject(lesson, "Lesson");
      assertAllowedKeys(
        lesson,
        [
          "id",
          "title",
          "description",
          "type",
          "content",
          "videoUrl",
          "durationMinutes",
          "order",
          "published",
        ],
        "Lesson",
      );

      let id = null;
      if (lesson.id !== undefined) {
        if (
          typeof lesson.id !== "string" ||
          !/^[\da-f]{24}$/i.test(lesson.id)
        ) {
          throw new CurriculumInputError("Lesson ID is invalid.");
        }
        id = lesson.id.toLowerCase();
        if (!existingLessonIds.has(id)) {
          throw new CurriculumInputError(
            "Existing lesson IDs cannot be replaced or moved from another course.",
          );
        }
        if (lessonIds.has(id)) {
          throw new CurriculumInputError("Lesson IDs must be unique.");
        }
        lessonIds.add(id);
      }

      const title = requiredText(lesson.title, "Lesson title", 200);
      const description = optionalText(
        lesson.description,
        "Lesson description",
        2000,
      );
      if (!LESSON_TYPES.has(lesson.type)) {
        throw new CurriculumInputError(
          "Lesson type must be text (article), video, or quiz.",
        );
      }
      const content = optionalText(lesson.content, "Lesson content", 100000);
      const videoUrl = validateVideoUrl(lesson.videoUrl);
      const durationMinutes =
        typeof lesson.durationMinutes === "string" &&
        /^\d+$/.test(lesson.durationMinutes.trim())
          ? Number.parseInt(lesson.durationMinutes.trim(), 10)
          : lesson.durationMinutes;
      const order =
        typeof lesson.order === "string" && /^\d+$/.test(lesson.order.trim())
          ? Number.parseInt(lesson.order.trim(), 10)
          : lesson.order;
      const published = lesson.published;

      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 0 ||
        durationMinutes > 1440
      ) {
        throw new CurriculumInputError(
          "Lesson duration must be a whole number from 0 to 1440 minutes.",
        );
      }
      if (!Number.isInteger(order) || order < 0 || order > 10000) {
        throw new CurriculumInputError(
          "Lesson order must be a whole number from 0 to 10000.",
        );
      }
      if (orders.has(order)) {
        throw new CurriculumInputError(
          "Lesson order values must be unique within the module.",
        );
      }
      orders.add(order);
      if (typeof published !== "boolean") {
        throw new CurriculumInputError(
          "Lesson publication status must be boolean.",
        );
      }
      if (
        published &&
        (lesson.type === "video" ? !content && !videoUrl : !content)
      ) {
        throw new CurriculumInputError(
          "Published lessons must include their lesson material.",
        );
      }

      return {
        id,
        title,
        description,
        type: lesson.type,
        content,
        videoUrl,
        durationMinutes,
        order,
        published,
      };
    });

    lessons.sort((left, right) => left.order - right.order);
    return { number, title, description, lessons };
  });

  return {
    version: body.version,
    modules,
    removedLessonIds: [...existingLessonIds].filter(
      (id) => !lessonIds.has(id),
    ),
  };
}
