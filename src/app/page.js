import Link from "next/link";
import CourseCard from "../components/CourseCard";
import HomeSearch from "../components/HomeSearch";
import { categories, courses } from "../lib/courses";

const testimonials = [
  {
    quote: "I finally stopped saving tutorials and started making things. The classes feel like having a brilliant mentor in your corner.",
    name: "Jamie Rivera",
    role: "Product designer",
    initials: "JR",
    color: "avatar-lilac",
  },
  {
    quote: "The best investment I made in myself this year. I learned at my pace and used what I learned the very same week.",
    name: "Sam Patel",
    role: "Frontend developer",
    initials: "SP",
    color: "avatar-peach",
  },
  {
    quote: "Thoughtful teachers, beautiful lessons, and no fluff. LearnHub made learning something I look forward to again.",
    name: "Taylor Morgan",
    role: "Creative founder",
    initials: "TM",
    color: "avatar-mint",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="page-container hero-layout">
          <div className="hero-copy">
            <div className="hero-kicker"><span className="kicker-dot" /> A learning space for what’s next</div>
            <h1>Make room for<br />your <span>next big thing.</span></h1>
            <p className="hero-description">
              Build real-world skills with classes that make you think, create, and do. Your next chapter starts here.
            </p>
            <div className="hero-actions">
              <Link className="button button-light" href="/courses">Explore courses <span aria-hidden="true">↗</span></Link>
              <Link className="hero-text-link" href="/#about">Our approach <span aria-hidden="true">↓</span></Link>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>J</span><span>M</span><span>A</span><span>+</span>
              </div>
              <p><strong>12,000+</strong> curious minds learning</p>
            </div>
          </div>
          <div className="hero-art" aria-label="Featured design course">
            <div className="hero-art-backdrop" />
            <div className="hero-photo" role="img" aria-label="Designer sketching a product idea" />
            <div className="hero-note hero-note-top"><span>✳</span> Learn by making</div>
            <Link href="/courses" className="hero-feature-card block text-inherit no-underline">
              <span className="feature-label">THIS WEEK’S PICK</span>
              <div className="feature-card-main">
                <div className="feature-icon">✳</div>
                <div><strong>Find your creative flow</strong><span>6 lessons · Beginner friendly</span></div>
                <span className="feature-arrow" aria-hidden="true">↗</span>
              </div>
              <div className="feature-progress"><span /></div>
              <div className="feature-foot"><span>Made for curious minds</span><span>01 / 06</span></div>
            </Link>
            <div className="hero-note hero-note-side"><span>✦</span> Keep growing</div>
          </div>
        </div>
        <div className="hero-bottom page-container">
          <span>Thoughtful classes for</span>
          <div><span>CREATIVE MINDS</span><span>CAREER SHIFTERS</span><span>CURIOUS PEOPLE</span></div>
        </div>
      </section>

      <main>
        <section className="section section-courses page-container" id="courses">
          <div className="section-heading">
            <div>
              <span className="eyebrow">A GOOD PLACE TO BEGIN</span>
              <h2>Find your next <span>favorite.</span></h2>
              <p>Expert-led classes that turn your curiosity into capability.</p>
            </div>
            <Link className="text-link" href="/courses">All courses <span aria-hidden="true">↗</span></Link>
          </div>
          <HomeSearch />
          <div className="course-grid course-grid-featured">
            {courses.slice(0, 3).map((course) => <CourseCard key={course.slug} course={course} />)}
          </div>
        </section>

        <section className="category-section" id="categories">
          <div className="page-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">FOLLOW YOUR CURIOSITY</span>
                <h2>What are you <span>into?</span></h2>
              </div>
              <p className="section-side-note">A little structure. A lot of possibility.</p>
            </div>
            <div className="category-grid">
              {categories.map((category, index) => (
                <Link
                  href={`/courses?category=${encodeURIComponent(category.catalogCategory || category.name)}`}
                  className={`category-card ${category.tone}`}
                  key={category.name}
                >
                  <span className="category-index">0{index + 1}</span>
                  <span className="category-symbol" aria-hidden="true">{category.icon}</span>
                  <span className="category-name">{category.name}</span>
                  <span className="category-count">{category.count}</span>
                  <span className="category-arrow" aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="story-section page-container" id="about">
          <div className="story-visual">
            <div className="story-image" role="img" aria-label="A creative team sharing ideas around a table" />
            <div className="story-caption"><span>01 / 03</span><span>Learn it. Make it. Share it.</span></div>
            <div className="story-stamp" aria-hidden="true">GROW<br />YOUR<br />WAY <span>✳</span></div>
          </div>
          <div className="story-copy">
            <span className="eyebrow">MORE THAN A WATCH-LATER LIST</span>
            <h2>Learning should feel like <span>opening a door.</span></h2>
            <p>We believe the best learning happens when good teachers meet genuinely curious people. Every LearnHub class is built to help you try something, make something, and take your next step with confidence.</p>
            <div className="story-points">
              <div><span>01</span><div><strong>Learn from people who do</strong><p>Real experience, generously shared.</p></div></div>
              <div><span>02</span><div><strong>Go at your own pace</strong><p>Small steps add up to big things.</p></div></div>
            </div>
            <Link className="text-link" href="/courses">Find your first class <span aria-hidden="true">↗</span></Link>
          </div>
        </section>

        <section className="testimonial-section">
          <div className="page-container">
            <div className="section-heading testimonial-heading">
              <div><span className="eyebrow">GOOD THINGS HAPPEN WHEN YOU BEGIN</span><h2>Don’t just take <span>our word.</span></h2></div>
              <div className="testimonial-count"><strong>4.9</strong><span><span aria-hidden="true">★★★★★</span><br />from 2,400+ learners</span></div>
            </div>
            <div className="testimonial-grid">
              {testimonials.map((item) => (
                <article className="testimonial-card" key={item.name}>
                  <span className="testimonial-stars" aria-label="5 out of 5 stars">★★★★★</span>
                  <blockquote>“{item.quote}”</blockquote>
                  <div className="testimonial-person"><span className={`person-avatar ${item.color}`}>{item.initials}</span><span><strong>{item.name}</strong><small>{item.role}</small></span></div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="cta-section page-container">
          <div className="cta-content">
            <span className="eyebrow eyebrow-light">YOUR NEXT CHAPTER IS YOURS</span>
            <h2>Curiosity looks<br />good on you.</h2>
            <p>Start with one class. See where it takes you.</p>
            <Link className="button button-light" href="/courses">Find your next class <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="cta-decoration" aria-hidden="true"><span>✳</span><span>✦</span><span>↗</span></div>
        </section>
      </main>
    </>
  );
}
