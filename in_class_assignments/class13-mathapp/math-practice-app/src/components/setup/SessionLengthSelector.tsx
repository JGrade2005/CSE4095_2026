import { useId } from "react";
import type { SessionLength } from "../../types/session";
import { SESSION_LENGTH_OPTIONS, formatSessionLength } from "../../utils/labels";
import OptionTile from "./OptionTile";
import styles from "./SelectorGroup.module.css";

interface SessionLengthSelectorProps {
  value: SessionLength;
  onChange: (length: SessionLength) => void;
  legend?: string;
}

export default function SessionLengthSelector({
  value,
  onChange,
  legend = "How many questions?",
}: SessionLengthSelectorProps) {
  const name = useId();

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.grid}>
        {SESSION_LENGTH_OPTIONS.map((length) => (
          <OptionTile
            key={length}
            type="radio"
            name={name}
            checked={value === length}
            onChange={() => onChange(length)}
            label={formatSessionLength(length)}
          />
        ))}
      </div>
    </fieldset>
  );
}
