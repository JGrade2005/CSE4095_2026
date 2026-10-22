import { useEffect } from "react";
import { useNavigate, useRouteError } from "react-router";
import { paths } from "../../app/paths";
import Button from "./Button";
import ErrorMessage from "./ErrorMessage";

export default function RouteError() {
  const error = useRouteError();
  const navigate = useNavigate();

  useEffect(() => {
    if (import.meta.env.DEV) console.error("Unexpected route error:", error);
  }, [error]);

  return (
    <ErrorMessage>
      <Button size="large" onClick={() => navigate(paths.home)}>
        Go Home
      </Button>
    </ErrorMessage>
  );
}
