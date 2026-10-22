import type { MouseEvent } from "react";
import { Link } from "react-router";
import { paths } from "../../app/paths";
import { MATH_OPERATIONS } from "../../types/question";
import OperationBadge from "../common/OperationBadge";
import Navigation from "./Navigation";
import styles from "./Header.module.css";

function skipToMain(event: MouseEvent<HTMLAnchorElement>) {
  const main = document.getElementById("main-content");
  if (!main) return;
  event.preventDefault();
  main.focus();
}

export default function Header() {
  return (
    <header className={styles.header}>
      <a href="#main-content" className={styles.skipLink} onClick={skipToMain}>
        Skip to main content
      </a>
      <div className={styles.inner}>
        <Link to={paths.home} className={styles.title}>
          <span className={styles.logo} aria-hidden="true">
            {MATH_OPERATIONS.map((operation) => (
              <OperationBadge key={operation} operation={operation} size="sm" />
            ))}
          </span>
          Math Practice
        </Link>
        <Navigation />
      </div>
    </header>
  );
}
