import Button from "../common/Button";
import OperationBadge from "../common/OperationBadge";
import { MATH_OPERATIONS } from "../../types/question";
import type { MathOperation } from "../../types/question";
import { OPERATION_LABELS } from "../../utils/labels";
import { OPERATION_SYMBOLS } from "../../utils/math";
import OptionTile from "./OptionTile";
import styles from "./SelectorGroup.module.css";

interface OperationSelectorProps {
  value: MathOperation[];
  onChange: (operations: MathOperation[]) => void;
  legend?: string;
}

const ACCENTS = {
  addition: "add",
  subtraction: "sub",
  multiplication: "mul",
  division: "div",
} as const;

export default function OperationSelector({
  value,
  onChange,
  legend = "Which math do you want to practice?",
}: OperationSelectorProps) {
  function toggle(operation: MathOperation) {
    const next = value.includes(operation)
      ? value.filter((item) => item !== operation)
      : [...value, operation];
    onChange(MATH_OPERATIONS.filter((item) => next.includes(item)));
  }

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        {MATH_OPERATIONS.map((operation) => (
          <OptionTile
            key={operation}
            type="checkbox"
            checked={value.includes(operation)}
            onChange={() => toggle(operation)}
            label={`${OPERATION_SYMBOLS[operation]} ${OPERATION_LABELS[operation]}`}
            icon={<OperationBadge operation={operation} size="md" />}
            accent={ACCENTS[operation]}
          />
        ))}
      </div>
      <div className={styles.extra}>
        <Button variant="secondary" onClick={() => onChange([...MATH_OPERATIONS])}>
          All operations (mixed)
        </Button>
      </div>
    </fieldset>
  );
}
