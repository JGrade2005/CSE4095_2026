import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <h1>Welcome to Math Practice!</h1>
      <p>
        Let's practice adding, subtracting, multiplying, and dividing. Pick a button to get started!
      </p>
      <div className={styles.actions}>
        <Button size="large" onClick={() => navigate(paths.practiceSetup)}>
          Start Practice
        </Button>
        <Button variant="secondary" onClick={() => navigate(paths.statistics)}>
          View Statistics
        </Button>
        <Button variant="secondary" onClick={() => navigate(paths.settings)}>
          Settings
        </Button>
      </div>
    </>
  );
}
