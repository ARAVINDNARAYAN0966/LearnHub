import "server-only";

import { getCurrentUser } from "./auth";
import { authJson, logAuthFailure } from "./auth-http";
import { verifyCsrfOrigin } from "./csrf";
import {
  getCurriculumManagementAccess,
  getInstructorManagementAccess,
} from "./curriculum-policy";
import { isDatabaseConnectionError } from "./mongodb";

const MAX_BODY_BYTES = 32768;

function databaseFailureStatus(error) {
  return isDatabaseConnectionError(error) ? 503 : 500;
}

export async function authorizeAdminApi(operation) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure(`${operation} authentication`, error);
    return {
      response: authJson(
        { error: "Unable to verify your session." },
        databaseFailureStatus(error),
      ),
    };
  }

  const access = getCurriculumManagementAccess(user);
  if (!access.allowed) {
    return {
      response: authJson({ error: access.error }, access.status),
    };
  }

  return { user, response: null };
}

export async function authorizeInstructorApi(operation) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    logAuthFailure(`${operation} authentication`, error);
    return {
      response: authJson(
        { error: "Unable to verify your session." },
        databaseFailureStatus(error),
      ),
    };
  }

  const access = getInstructorManagementAccess(user);
  if (!access.allowed) {
    return {
      response: authJson({ error: access.error }, access.status),
    };
  }

  return { user, response: null };
}

export async function parseAdminJsonBody(request) {
  const csrf = verifyCsrfOrigin(request);
  if (!csrf.ok) {
    return { response: csrf.response };
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return {
      response: authJson({ error: "Course request is too large." }, 413),
    };
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return {
      response: authJson({ error: "Course request is too large." }, 413),
    };
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { response: authJson({ error: "Invalid request body." }, 400) };
  }

  return { body, response: null };
}

export function courseInputErrorResponse(error) {
  return authJson(
    {
      error: "Please correct the course details.",
      fieldErrors: { [error.field]: error.message },
    },
    400,
  );
}

export function duplicateSlugResponse() {
  return authJson(
    {
      error: "A course with this slug already exists.",
      fieldErrors: { slug: "This slug is already in use." },
    },
    409,
  );
}

export function adminCourseFailure(operation, error) {
  logAuthFailure(operation, error);
  if (error?.name === "ValidationError") {
    return authJson(
      { error: "Course details do not meet the database validation rules." },
      400,
    );
  }

  return authJson(
    { error: "Unable to complete this course operation right now." },
    databaseFailureStatus(error),
  );
}

export function isDuplicateSlugError(error) {
  return error?.code === 11000;
}
