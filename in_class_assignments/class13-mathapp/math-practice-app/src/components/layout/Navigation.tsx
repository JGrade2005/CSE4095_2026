import { NavLink } from "react-router";
import { paths } from "../../app/paths";
import styles from "./Navigation.module.css";

const links = [
  { to: paths.home, label: "Home", end: true },
  { to: paths.practiceSetup, label: "Practice", end: false },
  { to: paths.statistics, label: "Statistics", end: false },
  { to: paths.settings, label: "Settings", end: false },
];

export default function Navigation() {
  return (
    <nav aria-label="Main">
      <ul className={styles.list}>
        {links.map(({ to, label, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} className={styles.link}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
