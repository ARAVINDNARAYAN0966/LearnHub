import mongoose from "mongoose";
import { courses } from "../src/lib/courses.js";
import Course from "../src/models/Course.js";

function toCourseDocument(course) {
  return {
    title: course.title,
    slug: course.slug,
    description: course.description,
    category: course.category,
    instructor: course.instructor,
    instructorRole: course.instructorRole,
    price: course.price,
    originalPrice: course.originalPrice,
    currency: "INR",
    image: course.image,
    duration: course.duration,
    lessons: course.lessons,
    rating: course.rating,
    reviews: course.reviews,
    students: course.students,
    level: course.level,
    color: course.color,
    learn: course.learn,
    modules: course.curriculum.map(([number, title, summary]) => ({
      number,
      title,
      summary,
    })),
    published: true,
  };
}

async function seedCourses() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
    throw new Error("A valid MONGODB_URI is required to seed courses.");
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await Course.init();

    const seedTimestamp = new Date();
    const operations = courses.map((course) => {
      const { modules, ...courseFields } = toCourseDocument(course);
      return {
        updateOne: {
          filter: { slug: course.slug },
          update: {
            $set: courseFields,
            $setOnInsert: {
              modules,
              createdAt: seedTimestamp,
              updatedAt: seedTimestamp,
            },
          },
          upsert: true,
        },
      };
    });
    const result = await Course.bulkWrite(operations, {
      ordered: true,
      timestamps: false,
    });

    console.log(
      JSON.stringify({
        sourceCourses: courses.length,
        inserted: result.upsertedCount,
        matched: result.matchedCount,
        updated: result.modifiedCount,
      }),
    );
  } finally {
    await mongoose.disconnect();
  }
}

seedCourses().catch((error) => {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  console.error(`Course seed failed (${errorName}).`);
  process.exitCode = 1;
});
