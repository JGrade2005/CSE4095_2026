import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import OperationBadge from "../components/common/OperationBadge";
import { MATH_OPERATIONS } from "../types/question";
import styles from "./HomePage.module.css";

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <h1>Welcome to Math Practice!</h1>
        <p>
          Let's practice adding, subtracting, multiplying, and dividing. Pick a button to get
          started!
        </p>
        <div className={styles.actions}>
          <Button size="large" onClick={() => navigate(paths.practiceSetup)}>
            <Icon>
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
            </Icon>
            Start Practice
          </Button>
          <Button variant="secondary" onClick={() => navigate(paths.statistics)}>
            <Icon>
              <rect x="3" y="12" width="5" height="9" rx="1.5" />
              <rect x="9.5" y="4" width="5" height="17" rx="1.5" />
              <rect x="16" y="9" width="5" height="12" rx="1.5" />
            </Icon>
            View Statistics
          </Button>
          <Button variant="secondary" onClick={() => navigate(paths.settings)}>
            <Icon>
              <path
                fillRule="evenodd"
                d="M10.3 2.5h3.4l.5 2.6c.6.2 1.2.5 1.7.9l2.5-.9 1.7 3-2 1.7c.1.6.1 1.2 0 1.8l2 1.7-1.7 3-2.5-.9c-.5.4-1.1.7-1.7.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.2-.5-1.7-.9l-2.5.9-1.7-3 2-1.7a6 6 0 0 1 0-1.8l-2-1.7 1.7-3 2.5.9c.5-.4 1.1-.7 1.7-.9l.5-2.6ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
              />
            </Icon>
            Settings
          </Button>
        </div>
        <p className={styles.note}>Your progress stays on this device.</p>
      </div>
      <div className={styles.cluster} aria-hidden="true">
        {MATH_OPERATIONS.map((operation) => (
          <span key={operation} className={`${styles.bubble} ${styles[operation]}`}>
            <OperationBadge operation={operation} size="lg" />
          </span>
        ))}
      </div>
    </section>
  );
}
