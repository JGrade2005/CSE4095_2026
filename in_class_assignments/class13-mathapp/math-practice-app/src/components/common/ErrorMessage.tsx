import type { ReactNode } from "react";
import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
  title?: string;
  message?: string;
  children?: ReactNode;
}

// Never given an error object on purpose: kids should not see technical details.
export default function ErrorMessage({
  title = "Oops! Something went wrong.",
  message = "Don't worry, your practice is safe. Let's head back home and try again.",
  children,
}: ErrorMessageProps) {
  return (
    <section className={styles.wrapper} role="alert">
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.message}>{message}</p>
      {children}
    </section>
  );
}

// A plain link works outside the router, where the error boundary in App.tsx sits.
export function HomeLink() {
  return (
    <a className={styles.homeLink} href={import.meta.env.BASE_URL}>
      Go Home
    </a>
  );
}
