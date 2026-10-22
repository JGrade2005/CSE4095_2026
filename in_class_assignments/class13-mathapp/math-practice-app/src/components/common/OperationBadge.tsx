import type { MathOperation } from "../../types/question";
import { OPERATION_SYMBOLS } from "../../utils/math";
import styles from "./OperationBadge.module.css";

interface OperationBadgeProps {
  operation: MathOperation;
  size?: "sm" | "md" | "lg";
}

// Decorative: the operation's name is always written next to the badge.
export default function OperationBadge({ operation, size = "md" }: OperationBadgeProps) {
  return (
    <span aria-hidden="true" className={`${styles.badge} ${styles[size]} ${styles[operation]}`}>
      {OPERATION_SYMBOLS[operation]}
    </span>
  );
}
