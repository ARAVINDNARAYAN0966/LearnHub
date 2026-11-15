import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <span className="eyebrow eyebrow-light">GOOD TO HAVE YOU BACK</span>
        <h1>Your next idea<br />is waiting.</h1>
        <p>Pick up where your curiosity left off.</p>
        <div className="auth-aside-quote"><span aria-hidden="true">“</span><p>The best time to learn something new is the moment you get curious.</p><small>THE LEARNHUB WAY</small></div>
        <span className="auth-aside-spark" aria-hidden="true">✳</span>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Log in</span></div>
          <span className="eyebrow">YOUR LEARNING SPACE</span>
          <h2>Welcome back.</h2>
          <p className="auth-subtitle">A little progress goes a long way.</p>
          <AuthForm mode="login" />
          <p className="auth-privacy">Your information stays yours. We’ll never share it.</p>
        </div>
      </div>
    </main>
  );
}
