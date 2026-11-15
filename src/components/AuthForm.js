"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const initialValues = {
  name: "",
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
};

function validateField(field, value, values, isRegister) {
  if (field === "name" && isRegister && !value.trim()) {
    return "Enter your full name.";
  }

  if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return "Enter a valid email address.";
  }

  if (field === "username" && isRegister && value.trim().length < 4) {
    return "Username must be at least 4 characters.";
  }

  if (field === "password") {
    if (!value) return "Enter your password.";
    if (isRegister) {
      if (value.length < 8) return "Use at least 8 characters.";
      if (!/[A-Z]/.test(value)) return "Add at least one uppercase letter.";
      if (!/[a-z]/.test(value)) return "Add at least one lowercase letter.";
      if (!/[0-9]/.test(value)) return "Add at least one number.";
      if (!/[^A-Za-z0-9]/.test(value)) return "Add at least one special character.";
    }
  }

  if (
    field === "confirmPassword" &&
    isRegister &&
    value !== values.password
  ) {
    return "Passwords do not match.";
  }

  return "";
}

function getPasswordStrength(password) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = score < 2 ? "Weak" : score < 4 ? "Fair" : score < 5 ? "Good" : "Strong";

  return { checks, score, label };
}

function FormField({ id, label, error, children }) {
  const errorId = `${id}-error`;

  return (
    <div className={`form-field${error ? " form-field-invalid" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children(errorId)}
      {error && <p className="field-error" id={errorId} aria-live="polite">{error}</p>}
    </div>
  );
}

export default function AuthForm({ mode = "login" }) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [serverErrors, setServerErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fields = isRegister
    ? ["name", "email", "username", "password", "confirmPassword"]
    : ["email", "password"];
  const passwordStrength = getPasswordStrength(values.password);

  function getError(field) {
    if (serverErrors[field]) return serverErrors[field];
    if (!submitted && !touched[field]) return "";
    return validateField(field, values[field], values, isRegister);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    setTouched((current) => ({ ...current, [name]: true }));
    setServerErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFeedback(null);
  }

  function handleBlur(event) {
    setTouched((current) => ({ ...current, [event.target.name]: true }));
  }

  function togglePasswordVisibility(field) {
    setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitted(true);

    const hasErrors = fields.some((field) =>
      validateField(field, values[field], values, isRegister),
    );

    if (hasErrors) {
      setFeedback({ type: "error", message: "Please correct the highlighted fields." });
      const firstInvalid = fields.find((field) =>
        validateField(field, values[field], values, isRegister),
      );
      document.getElementById(`auth-${mode}-${firstInvalid}`)?.focus();
      return;
    }

    const form = event.currentTarget;
    const payload = isRegister
      ? {
          name: values.name,
          email: values.email,
          username: values.username,
          password: values.password,
        }
      : {
          email: values.email,
          password: values.password,
          rememberMe: Boolean(form.elements.remember?.checked),
        };

    setIsSubmitting(true);
    setFeedback(null);
    setServerErrors({});

    try {
      const response = await fetch(
        isRegister ? "/api/auth/register" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
      );
      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        setServerErrors(
          result?.fieldErrors && typeof result.fieldErrors === "object"
            ? result.fieldErrors
            : {},
        );
        setFeedback({
          type: "error",
          message:
            result?.error ||
            (isRegister
              ? "Unable to create your account right now."
              : "Unable to sign in right now."),
        });
        return;
      }

      window.dispatchEvent(new Event("learnhub:auth-changed"));
      router.push("/dashboard");
    } catch {
      setFeedback({
        type: "error",
        message: "We couldn’t reach LearnHub. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function renderInput(field, label, type, autoComplete, placeholder, options = {}) {
    const id = `auth-${mode}-${field}`;
    const strengthId = `${id}-strength`;
    const error = getError(field);
    const inputType = options.password
      ? visiblePasswords[field] ? "text" : "password"
      : type;

    return (
      <FormField id={id} label={label} error={error} key={field}>
        {(errorId) => (
          <>
            <div className={options.password ? "password-input" : undefined}>
              <input
                id={id}
                name={field}
                type={inputType}
                autoComplete={autoComplete}
                placeholder={placeholder}
                value={values[field]}
                onChange={handleChange}
                onBlur={handleBlur}
                aria-invalid={Boolean(error)}
                aria-describedby={[
                  error ? errorId : "",
                  options.password && isRegister && field === "password" ? strengthId : "",
                ].filter(Boolean).join(" ") || undefined}
                required
              />
              {options.password && (
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility(field)}
                  aria-label={visiblePasswords[field] ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
                  aria-pressed={Boolean(visiblePasswords[field])}
                >
                  {visiblePasswords[field] ? "Hide" : "Show"}
                </button>
              )}
            </div>
            {options.password && isRegister && field === "password" && (
              <div
                className={`password-strength strength-${passwordStrength.label.toLowerCase()}`}
                id={strengthId}
                role="meter"
                aria-label={`Password strength: ${passwordStrength.label}`}
                aria-valuemin={0}
                aria-valuemax={5}
                aria-valuenow={passwordStrength.score}
                aria-valuetext={passwordStrength.label}
              >
                <div className="strength-bars" aria-hidden="true">
                  {passwordStrength.checks.map((passed, index) => (
                    <span className={passed ? "strength-bar strength-bar-filled" : "strength-bar"} key={index} />
                  ))}
                </div>
                <span>Password strength: <strong>{passwordStrength.label}</strong></span>
              </div>
            )}
          </>
        )}
      </FormField>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
      {isRegister && renderInput("name", "Full name", "text", "name", "Your name")}
      {renderInput("email", "Email address", "email", "email", "you@example.com")}
      {isRegister && renderInput("username", "Username", "text", "username", "At least 4 characters")}
      {renderInput(
        "password",
        "Password",
        "password",
        isRegister ? "new-password" : "current-password",
        isRegister ? "Create a strong password" : "Enter your password",
        { password: true },
      )}
      {isRegister && renderInput("confirmPassword", "Confirm password", "password", "new-password", "Re-enter your password", { password: true })}

      {!isRegister && (
        <div className="auth-extra">
          <label htmlFor="remember-me"><input id="remember-me" name="remember" type="checkbox" /> Remember me</label>
          <a href="mailto:support@learnhub.example?subject=Password%20reset">Forgot password?</a>
        </div>
      )}

      {feedback && (
        <p
          className={`auth-notice${feedback.type === "error" ? " auth-notice-error" : ""}`}
          role={feedback.type === "error" ? "alert" : "status"}
          aria-live={feedback.type === "error" ? "assertive" : "polite"}
        >
          {feedback.message}
        </p>
      )}

      <button className="button button-primary auth-submit" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Please wait..." : isRegister ? "Create your account" : "Log in"}
        {!isSubmitting && <span aria-hidden="true">↗</span>}
      </button>
      <p className="auth-switch">
        {isRegister ? "Already learning with us? " : "New to LearnHub? "}
        <Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Create an account"}</Link>
      </p>
    </form>
  );
}
