import { createContext } from "react";
import type { PracticeSessionApi } from "../types/practice";

export const PracticeSessionContext = createContext<PracticeSessionApi | null>(null);
