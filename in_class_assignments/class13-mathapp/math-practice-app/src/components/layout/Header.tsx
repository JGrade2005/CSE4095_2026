import { Link } from "react-router";
import { paths } from "../../app/paths";
import Navigation from "./Navigation";
import styles from "./Header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to={paths.home} className={styles.title}>
          Math Practice
        </Link>
        <Navigation />
      </div>
    </header>
  );
}
