import { useEffect, useId, useRef, useState } from "react";
import { NavLink } from "react-router";
import { paths } from "../../app/paths";
import Button from "../common/Button";
import styles from "./Navigation.module.css";

const links = [
  { to: paths.home, label: "Home", end: true },
  { to: paths.practiceSetup, label: "Practice", end: false },
  { to: paths.statistics, label: "Statistics", end: false },
  { to: paths.settings, label: "Settings", end: false },
];

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (listRef.current?.contains(document.activeElement)) buttonRef.current?.focus();
      setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <nav aria-label="Main" className={styles.nav}>
      <Button
        ref={buttonRef}
        variant="secondary"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">{open ? "✕ " : "☰ "}</span>
        Menu
      </Button>
      <ul ref={listRef} id={listId} className={styles.list} data-open={open}>
        {links.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={styles.link} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
