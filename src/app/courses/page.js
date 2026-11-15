import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import CourseCatalog from "../../components/CourseCatalog";
import { getPublishedCourses } from "../../lib/course-data";

export const metadata = {
  title: "Explore Courses",
  description:
    "Explore demo courses in web development, programming, AI and machine learning, data science, UI/UX design, and DevOps.",
};

export default function CoursesPage({ searchParams }) {
  return (
    <main className="catalog-page">
      <section className="catalog-hero">
        <div className="page-container">
          <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Courses</span></div>
          <span className="eyebrow eyebrow-light">A WORLD OF POSSIBILITY</span>
          <h1>A class for wherever<br />you want to <span>go.</span></h1>
          <p>Find your next skill, your next idea, or just a new way to see things.</p>
        </div>
      </section>
      <section className="page-container catalog-content" id="categories">
        <Suspense fallback={<p className="catalog-loading">Finding your next class...</p>}>
          <CatalogResults searchParams={searchParams} />
        </Suspense>
      </section>
    </main>
  );
}

async function CatalogResults({ searchParams }) {
  await connection();
  const query = await searchParams;
  const category = typeof query.category === "string" ? query.category : "";
  const search = typeof query.search === "string" ? query.search : "";
  const courses = await getPublishedCourses();

  return (
    <CourseCatalog
      courses={courses}
      initialCategory={category}
      initialSearch={search}
    />
  );
}
