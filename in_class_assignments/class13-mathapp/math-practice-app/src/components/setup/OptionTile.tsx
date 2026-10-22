import type { ReactNode } from "react";
import styles from "./OptionTile.module.css";

interface OptionTileProps {
  type: "checkbox" | "radio";
  name?: string;
  checked: boolean;
  onChange: () => void;
  label: ReactNode;
  description?: string;
}

export default function OptionTile({
  type,
  name,
  checked,
  onChange,
  label,
  description,
}: OptionTileProps) {
  return (
    <label className={styles.tile}>
      <input
        className={styles.input}
        type={type}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className={styles.body}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
        <span className={styles.mark} aria-hidden="true">
          {checked ? "✓ Selected" : ""}
        </span>
      </span>
    </label>
  );
}
