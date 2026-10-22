import styles from "./StatCard.module.css";

interface StatCardProps {
  label: string;
  value: string | number;
}

// Renders one dt/dd group, so it must sit inside a <dl>.
export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className={styles.card}>
      <dt className={styles.label}>{label}</dt>
      <dd className={styles.value}>{value}</dd>
    </div>
  );
}
