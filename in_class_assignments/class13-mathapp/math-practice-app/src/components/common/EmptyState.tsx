import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  title: string;
  message: string;
  action?: ReactNode;
  headingLevel?: 2 | 3;
}

export default function EmptyState({ title, message, action, headingLevel = 2 }: EmptyStateProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={styles.emptyState}>
      <Heading className={styles.title}>{title}</Heading>
      <p>{message}</p>
      {action}
    </section>
  );
}
