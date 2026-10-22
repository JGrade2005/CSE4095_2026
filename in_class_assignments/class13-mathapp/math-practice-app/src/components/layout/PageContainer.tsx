import type { ReactNode } from "react";
import styles from "./PageContainer.module.css";

export default function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className={styles.container}>
      {children}
    </main>
  );
}
