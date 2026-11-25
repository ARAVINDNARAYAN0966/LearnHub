const COURSE_FIELDS = [
  "title",
  "slug",
  "description",
  "category",
  "instructor",
  "price",
  "image",
  "published",
  "level",
];

export class AdminCourseInputError extends Error {
  constructor(field, message) {
    super(message);
    this.name = "AdminCourseInputError";
    this.field = field;
  }
}

function assertObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AdminCourseInputError(
      "form",
      "Course details must be sent as an object.",
    );
  }
}

function assertAllowedFields(value) {
  if (Object.keys(value).some((field) => !COURSE_FIELDS.includes(field))) {
    throw new AdminCourseInputError(
      "form",
      "Course details contain unsupported fields.",
    );
  }
}

function requiredText(value, field, label, maximumLength) {
  if (typeof value !== "string") {
    throw new AdminCourseInputError(field, `${label} is required.`);
  }

  const text = value.trim();
  if (!text) {
    throw new AdminCourseInputError(field, `${label} is required.`);
  }
  if (text.length > maximumLength) {
    throw new AdminCourseInputError(
      field,
      `${label} must be ${maximumLength} characters or fewer.`,
    );
  }

  return text;
}

function validateSlug(value) {
  const slug = requiredText(value, "slug", "Slug", 200).toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AdminCourseInputError(
      "slug",
      "Use lowercase letters, numbers, and single hyphens in the slug.",
    );
  }
  return slug;
}

function validateImageUrl(value) {
  const image = requiredText(value, "image", "Image URL", 2048);
  let url;
  try {
    url = new URL(image);
  } catch {
    throw new AdminCourseInputError(
      "image",
      "Enter a valid HTTPS image URL.",
    );
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password
  ) {
    throw new AdminCourseInputError(
      "image",
      "Image URLs must use HTTPS and cannot include credentials.",
    );
  }

  return image;
}

export function validateAdminCourseInput(body) {
  assertObject(body);
  assertAllowedFields(body);

  const title = requiredText(body.title, "title", "Title", 200);
  const slug = validateSlug(body.slug);
  const description = requiredText(
    body.description,
    "description",
    "Description",
    20000,
  );
  const category = requiredText(body.category, "category", "Category", 80);
  const instructor = requiredText(
    body.instructor,
    "instructor",
    "Instructor",
    120,
  );
  const image = validateImageUrl(body.image);

  if (!Number.isSafeInteger(body.price) || body.price < 0) {
    throw new AdminCourseInputError(
      "price",
      "Price must be a non-negative whole number of INR.",
    );
  }
  if (typeof body.published !== "boolean") {
    throw new AdminCourseInputError(
      "published",
      "Choose whether the course is published or a draft.",
    );
  }

  let level = undefined;
  if (body.level !== undefined && body.level !== null) {
    if (typeof body.level !== "string") {
      throw new AdminCourseInputError("level", "Skill level must be text.");
    }
    const trimmed = body.level.trim();
    if (trimmed.length > 50) {
      throw new AdminCourseInputError(
        "level",
        "Skill level must be 50 characters or fewer.",
      );
    }
    level = trimmed || "All Levels";
  }

  return {
    title,
    slug,
    description,
    category,
    instructor,
    price: body.price,
    currency: "INR",
    image,
    published: body.published,
    ...(level !== undefined ? { level } : {}),
  };
}

export function validateAdminCoursePublication(body) {
  assertObject(body);
  if (Object.keys(body).some((field) => field !== "published")) {
    throw new AdminCourseInputError(
      "form",
      "Publication updates may only contain a published status.",
    );
  }
  if (typeof body.published !== "boolean") {
    throw new AdminCourseInputError(
      "published",
      "Publication status must be true or false.",
    );
  }

  return { published: body.published };
}

export function createCourseDocument(input, extraFields = {}) {
  return {
    ...input,
    instructorRole: input.instructorRole || "Instructor",
    originalPrice: input.originalPrice ?? input.price,
    duration: "0h",
    lessons: 0,
    rating: 0,
    reviews: 0,
    students: "0",
    level: input.level || extraFields.level || "Not specified",
    color: input.color || "lavender",
    learn: input.learn || [],
    modules: input.modules || [],
    ...extraFields,
  };
}
