import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <section className={styles.card}>
      <svg className={styles.mark} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
        <circle cx="50" cy="60" r="46" fill="var(--color-primary-tint)" />
        <path
          d="M32 46C32 24 68 24 68 46C68 62 50 64 50 80"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <circle cx="50" cy="102" r="9" fill="var(--color-sun)" stroke="#9a6b00" strokeWidth="3" />
      </svg>
      <h1>Page not found</h1>
      <p>Oops! We could not find that page. Let's head back home.</p>
      <Button onClick={() => navigate(paths.home)}>Go Home</Button>
    </section>
  );
}
