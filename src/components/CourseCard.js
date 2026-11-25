import Link from "next/link";
import { formatPrice } from "../lib/format-price";

export default function CourseCard({ course, showViewButton = false }) {
  const hasDiscount =
    course.originalPrice > course.price && course.originalPrice > 0;
  const discountPercent = hasDiscount
    ? Math.round(((course.originalPrice - course.price) / course.originalPrice) * 100)
    : 0;

  return (
    <article className="course-card">
      <Link
        href={`/courses/${course.slug}`}
        className={`course-image course-image-${course.color}`}
        style={{ backgroundImage: `url("${course.image}")` }}
        aria-label={`View ${course.title}`}
      >
        <span className="course-category">{course.category}</span>
        {showViewButton && hasDiscount && (
          <span className="course-discount">Save {discountPercent}%</span>
        )}
        <span className="course-image-arrow" aria-hidden="true">↗</span>
      </Link>
      <div className="course-card-body">
        <div className="course-card-meta">
          <span className="rating">
            <span aria-hidden="true">★</span> {course.rating}
            {showViewButton && (
              <span className="course-rating-count"> · {course.reviews.toLocaleString()}</span>
            )}
          </span>
          <span>{course.duration}</span>
        </div>
        <h3><Link href={`/courses/${course.slug}`}>{course.title}</Link></h3>
        <p className="course-instructor">with {course.instructor}</p>
        {showViewButton && (
          <p className="course-description">{course.description}</p>
        )}
        <div className={`course-card-footer${showViewButton ? " course-card-footer-catalog" : ""}`}>
          <span className="course-price">
            {formatPrice(course.price)}
            {hasDiscount && <del>{formatPrice(course.originalPrice)}</del>}
          </span>
          <span className="course-level">{course.level}</span>
          {showViewButton && (
            <Link className="course-view-button button button-small button-primary" href={`/courses/${course.slug}`}>
              View course <span aria-hidden="true">↗</span>
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
