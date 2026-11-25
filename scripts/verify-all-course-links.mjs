import mongoose from "mongoose";

async function verifyAllLinks() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB:", mongoose.connection.name);

  // 1. Check Homepage
  console.log("\n--- Checking Homepage (/) ---");
  const homeRes = await fetch("http://localhost:3000/");
  console.log(`Homepage status: ${homeRes.status} ${homeRes.statusText}`);
  const homeHtml = await homeRes.text();
  const hasProductDesignInHome = homeHtml.includes("/courses/product-design");
  console.log(`Contains legacy /courses/product-design: ${hasProductDesignInHome ? "YES (FAIL)" : "NO (PASS)"}`);

  // Extract /courses/[slug] links from homepage
  const homeCourseLinks = [...homeHtml.matchAll(/href="\/courses\/([\w-]+)"/g)].map(m => m[1]);
  const uniqueHomeSlugs = [...new Set(homeCourseLinks)];
  console.log("Slugs featured on homepage:", uniqueHomeSlugs);

  // 2. Fetch all published courses from DB
  const publishedCourses = await mongoose.connection.db
    .collection("courses")
    .find({ published: true }, { projection: { slug: 1, title: 1, instructor: 1 } })
    .toArray();

  console.log(`\nFound ${publishedCourses.length} published courses in MongoDB:`);

  let passed = 0;
  let failed = 0;

  for (const course of publishedCourses) {
    const url = `http://localhost:3000/courses/${course.slug}`;
    const res = await fetch(url);
    const html = await res.text();

    const escapedTitle = course.title.replace(/&/g, "&amp;");
    const titleMatches = html.includes(course.title) || html.includes(escapedTitle);
    const instructorMatches = html.includes(course.instructor);
    const curriculumPresent = html.includes("Course curriculum") || html.includes("curriculum");

    if (res.status === 200 && titleMatches && instructorMatches && curriculumPresent) {
      console.log(`  [PASS] /courses/${course.slug} -> 200 OK | "${course.title}" | Instructor: ${course.instructor}`);
      passed++;
    } else {
      console.error(`  [FAIL] /courses/${course.slug} -> Status: ${res.status} | Title found: ${titleMatches} | Instructor found: ${instructorMatches}`);
      failed++;
    }
  }

  // 3. Test non-existent course returns 404 cleanly
  console.log("\n--- Checking non-existent course (/courses/product-design) ---");
  const notFoundRes = await fetch("http://localhost:3000/courses/product-design");
  const notFoundHtml = await notFoundRes.text();
  const isNotFound = notFoundHtml.includes("Course not found") || notFoundHtml.includes("NEXT_NOT_FOUND") || notFoundRes.status === 404;
  console.log(`Non-existent course (/courses/product-design) correctly renders 404 / Course not found: ${isNotFound ? "YES (PASS)" : "NO (FAIL)"}`);

  await mongoose.disconnect();

  console.log("\n--- Summary ---");
  console.log(`Total courses tested: ${publishedCourses.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0 || hasProductDesignInHome || !isNotFound) {
    throw new Error("Verification failed!");
  }
  console.log("\nAll course links verified successfully!");
}

verifyAllLinks().catch((err) => {
  console.error("Error:", err.message);
  process.exitCode = 1;
});
