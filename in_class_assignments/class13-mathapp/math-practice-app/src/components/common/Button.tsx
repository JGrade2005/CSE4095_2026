import type { ComponentPropsWithRef } from "react";
import styles from "./Button.module.css";

type ButtonProps = ComponentPropsWithRef<"button"> & {
  variant?: "primary" | "secondary";
  size?: "normal" | "large";
};

export default function Button({
  variant = "primary",
  size = "normal",
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], size === "large" ? styles.large : "", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...rest} />;
}
