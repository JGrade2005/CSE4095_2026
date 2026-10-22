import { useContext } from "react";
import { PracticeSessionContext } from "../app/practiceSessionContext";

export function usePracticeSession() {
  const context = useContext(PracticeSessionContext);
  if (!context) {
    throw new Error("usePracticeSession must be used inside a PracticeSessionProvider.");
  }
  return context;
}
