import type { ReactNode } from "react";
import styles from "./PageContainer.module.css";

export default function PageContainer({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className={styles.container}>
      {children}
    </main>
  );
}
