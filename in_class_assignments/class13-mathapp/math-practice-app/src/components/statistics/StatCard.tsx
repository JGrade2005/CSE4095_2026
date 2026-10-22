import styles from "./StatCard.module.css";

export type StatTone = "primary" | "good" | "warm" | "sun";

interface StatCardProps {
  label: string;
  value: string | number;
  tone?: StatTone;
}

// Renders one dt/dd group, so it must sit inside a <dl>.
export default function StatCard({ label, value, tone = "primary" }: StatCardProps) {
  return (
    <div className={`${styles.card} ${styles[tone]}`}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}
