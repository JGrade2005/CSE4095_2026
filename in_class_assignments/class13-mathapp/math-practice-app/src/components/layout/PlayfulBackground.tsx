import { useSettings } from "../../hooks/useSettings";
import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import styles from "./PlayfulBackground.module.css";

interface Shape {
  kind: "symbol" | "circle" | "triangle" | "star" | "square";
  symbol?: string;
  top: string;
  left: string;
  size: string;
  tone: "add" | "sub" | "mul" | "div" | "sun";
  duration: string;
  delay: string;
}

const SHAPES: Shape[] = [
  {
    kind: "symbol",
    symbol: "+",
    top: "8%",
    left: "4%",
    size: "4rem",
    tone: "add",
    duration: "22s",
    delay: "0s",
  },
  {
    kind: "circle",
    top: "18%",
    left: "88%",
    size: "3.5rem",
    tone: "sun",
    duration: "26s",
    delay: "-4s",
  },
  {
    kind: "symbol",
    symbol: "×",
    top: "62%",
    left: "6%",
    size: "4.5rem",
    tone: "mul",
    duration: "28s",
    delay: "-8s",
  },
  {
    kind: "triangle",
    top: "78%",
    left: "82%",
    size: "4rem",
    tone: "sub",
    duration: "24s",
    delay: "-2s",
  },
  {
    kind: "symbol",
    symbol: "÷",
    top: "40%",
    left: "92%",
    size: "4rem",
    tone: "div",
    duration: "30s",
    delay: "-12s",
  },
  {
    kind: "star",
    top: "4%",
    left: "52%",
    size: "3rem",
    tone: "sun",
    duration: "20s",
    delay: "-6s",
  },
  {
    kind: "symbol",
    symbol: "−",
    top: "88%",
    left: "38%",
    size: "4rem",
    tone: "sub",
    duration: "25s",
    delay: "-10s",
  },
  {
    kind: "square",
    top: "30%",
    left: "2%",
    size: "2.75rem",
    tone: "div",
    duration: "27s",
    delay: "-3s",
  },
  {
    kind: "symbol",
    symbol: "=",
    top: "52%",
    left: "48%",
    size: "3.5rem",
    tone: "mul",
    duration: "32s",
    delay: "-14s",
  },
  {
    kind: "circle",
    top: "70%",
    left: "62%",
    size: "2.5rem",
    tone: "add",
    duration: "23s",
    delay: "-7s",
  },
  {
    kind: "star",
    top: "92%",
    left: "8%",
    size: "2.75rem",
    tone: "sun",
    duration: "21s",
    delay: "-9s",
  },
  {
    kind: "triangle",
    top: "12%",
    left: "28%",
    size: "2.5rem",
    tone: "mul",
    duration: "29s",
    delay: "-5s",
  },
  {
    kind: "symbol",
    symbol: "+",
    top: "84%",
    left: "94%",
    size: "3rem",
    tone: "div",
    duration: "26s",
    delay: "-11s",
  },
  {
    kind: "square",
    top: "46%",
    left: "74%",
    size: "2.25rem",
    tone: "add",
    duration: "31s",
    delay: "-13s",
  },
];

export default function PlayfulBackground() {
  const { settings } = useSettings();
  const prefersReducedMotion = usePrefersReducedMotion();
  const moving = settings.cardAnimationEnabled && !prefersReducedMotion;

  return (
    <div aria-hidden="true" className={`${styles.layer} ${moving ? styles.moving : ""}`}>
      {SHAPES.map((shape, index) => (
        <span
          key={index}
          className={`${styles.shape} ${styles[shape.kind]} ${styles[shape.tone]}`}
          style={{
            top: shape.top,
            left: shape.left,
            fontSize: shape.size,
            animationDuration: shape.duration,
            animationDelay: shape.delay,
          }}
        >
          {shape.kind === "symbol" ? shape.symbol : null}
        </span>
      ))}
    </div>
  );
}
