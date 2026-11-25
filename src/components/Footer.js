import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="page-container">
        <div className="footer-main">
          <div className="footer-brand">
            <Logo light />
            <p>Make room for what’s next.</p>
            <div className="social-links" aria-label="Social links">
              <a href="https://www.instagram.com/" aria-label="Instagram">ig</a>
              <a href="https://www.linkedin.com/" aria-label="LinkedIn">in</a>
              <a href="https://www.youtube.com/" aria-label="YouTube">yt</a>
            </div>
          </div>
          <div className="footer-column">
            <h3>Explore</h3>
            <Link href="/courses">All courses</Link>
            <Link href="/courses#categories">Categories</Link>
            <Link href="/dashboard">My learning</Link>
            <Link href="/certificates/verify">Verify certificate</Link>
          </div>
          <div className="footer-column">
            <h3>LearnHub</h3>
            <Link href="/#about">Our story</Link>
            <Link href="/register">Become a student</Link>
            <Link href="/feedback">Platform Feedback</Link>
            <a href="mailto:hello@learnhub.example">Contact us</a>
          </div>
          <div className="footer-newsletter">
            <span className="eyebrow eyebrow-light">THE LEARNER LETTER</span>
            <h3>A little inspiration, in your inbox.</h3>
            <p>Ideas, new classes, and good things to learn. No noise.</p>
            <a href="mailto:hello@learnhub.example" className="footer-email-link">
              hello@learnhub.example <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 LearnHub. Made for curious minds.</span>
          <div><a href="mailto:hello@learnhub.example">Privacy</a><a href="mailto:hello@learnhub.example">Terms</a></div>
        </div>
      </div>
    </footer>
  );
}
