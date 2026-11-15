import { NextResponse } from "next/server";
import { getPublishedCourses } from "../../../lib/course-data";

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

    return NextResponse.json(
      { error: "Unable to load courses right now." },
      {
        status: error?.name === "MongooseServerSelectionError" ? 503 : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
