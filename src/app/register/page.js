import Link from "next/link";
import AuthForm from "../../components/AuthForm";

export const metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <div className="auth-aside auth-aside-register">
        <span className="eyebrow eyebrow-light">A LITTLE ROOM TO GROW</span>
        <h1>Start with<br />a <span>what if.</span></h1>
        <p>One new skill can take you somewhere unexpected.</p>
        <div className="auth-aside-quote"><span aria-hidden="true">✦</span><p>Learn something you love. Make something you’re proud of.</p><small>YOUR NEXT CHAPTER STARTS HERE</small></div>
        <span className="auth-aside-spark" aria-hidden="true">✳</span>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <div className="breadcrumbs"><Link href="/">Home</Link><span>/</span><span>Create account</span></div>
          <span className="eyebrow">COME ON IN</span>
          <h2>Make it yours.</h2>
          <p className="auth-subtitle">A curious mind looks good on you.</p>
          <AuthForm mode="register" />
          <p className="auth-privacy">Creating an account means you agree to our terms and privacy policy.</p>
        </div>
      </div>
    </main>
  );
}
