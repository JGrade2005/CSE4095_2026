import { useEffect, useRef } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select")) return true;
  const editable = target.closest("[contenteditable]");
  return editable !== null && editable.getAttribute("contenteditable") !== "false";
}

interface UseAnswerShortcutsOptions {
  choices: number[];
  enabled: boolean;
  onSelect: (value: number) => void;
}

// Keys 1 to 4 pick the choice in that on-screen position.
export function useAnswerShortcuts({ choices, enabled, onSelect }: UseAnswerShortcutsOptions) {
  const latest = useRef({ choices, onSelect });
  useEffect(() => {
    latest.current = { choices, onSelect };
  });

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.shiftKey || event.isComposing) return;
      if (!/^[1-4]$/.test(event.key)) return;
      if (isTypingTarget(event.target)) return;
      if (document.activeElement?.closest('[role="alertdialog"]')) return;

      const choice = latest.current.choices[Number(event.key) - 1];
      if (choice === undefined) return;
      event.preventDefault();
      latest.current.onSelect(choice);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);
}
