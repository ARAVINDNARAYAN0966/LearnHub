import { NextResponse } from "next/server";
import { getPublishedCourses } from "../../../lib/course-data";
import { isDatabaseConnectionError } from "../../../lib/mongodb";

export async function GET() {
  try {
    const courses = await getPublishedCourses();

    return NextResponse.json(
      { courses },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const errorName =
      error instanceof Error ? error.name : "UnknownError";
    console.error(`Published course lookup failed (${errorName})`);

    const status = isDatabaseConnectionError(error) ? 503 : 500;

    return NextResponse.json(
      { error: "Unable to load courses right now." },
      {
        status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
