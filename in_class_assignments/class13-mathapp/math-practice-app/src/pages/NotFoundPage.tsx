import { useNavigate } from "react-router";
import { paths } from "../app/paths";
import Button from "../components/common/Button";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <h1>Page not found</h1>
      <p>Oops! We could not find that page. Let's head back home.</p>
      <Button onClick={() => navigate(paths.home)}>Go Home</Button>
    </>
  );
}
