import styles from "./PageLoading.module.css";

export default function PageLoading() {
  return (
    <p role="status" className={styles.loading}>
      Loading...
    </p>
  );
}
