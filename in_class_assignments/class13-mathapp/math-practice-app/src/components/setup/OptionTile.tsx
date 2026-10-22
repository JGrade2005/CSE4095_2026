import type { ReactNode } from "react";
import styles from "./OptionTile.module.css";

interface OptionTileProps {
  type: "checkbox" | "radio";
  name?: string;
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  description?: string;
  icon?: ReactNode;
  accent?: "add" | "sub" | "mul" | "div";
}

export default function OptionTile({
  type,
  name,
  checked,
  onChange,
  label,
  description,
  icon,
  accent,
}: OptionTileProps) {
  return (
    <label className={accent ? `${styles.tile} ${styles[accent]}` : styles.tile}>
      <input
        className={styles.input}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className={styles.body}>
        {icon && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        <span className={styles.text}>
          <span className={styles.label}>{label}</span>
          {description && <span className={styles.description}>{description}</span>}
          <span className={styles.mark} aria-hidden="true">
            {checked ? "✓ Selected" : ""}
          </span>
        </span>
      </span>
    </label>
  );
}
