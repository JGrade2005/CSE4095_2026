import type { ReactNode } from "react";
import type { MathOperation } from "../../types/question";
import OperationBadge from "../common/OperationBadge";
import styles from "./CardBand.module.css";

interface CardBandProps {
  operation: MathOperation;
  children: ReactNode;
}

export default function CardBand({ operation, children }: CardBandProps) {
  return (
    <div className={styles.band}>
      <span className={styles.ring}>
        <OperationBadge operation={operation} size="md" />
      </span>
      {children}
    </div>
  );
}
