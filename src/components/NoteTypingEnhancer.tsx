import { useEffect } from "react";

function suggestionButtons(textarea: HTMLTextAreaElement) {
  const composer = textarea.closest(".mp-note-composer");
  if (!composer) return [] as HTMLButtonElement[];
  return [...composer.querySelectorAll<HTMLButtonElement>(".mp-note-suggestions button")];
}

function select(buttons: HTMLButtonElement[], index: number) {
  if (!buttons.length) return;
  const next = ((index % buttons.length) + buttons.length) % buttons.length;
  buttons.forEach((button, i) => button.classList.toggle("is-active", i === next));
  buttons[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

export function NoteTypingEnhancer() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const textarea = event.target;
      if (!(textarea instanceof HTMLTextAreaElement) || !textarea.closest(".mp-note-editor")) return;
      const buttons = suggestionButtons(textarea);
      if (!buttons.length) return;
      const active = Math.max(0, buttons.findIndex((button) => button.classList.contains("is-active")));

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        select(buttons, active + (event.key === "ArrowDown" ? 1 : -1));
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        (buttons[active] || buttons[0])?.click();
      }
    };

    const onInput = (event: Event) => {
      const textarea = event.target;
      if (!(textarea instanceof HTMLTextAreaElement) || !textarea.closest(".mp-note-editor")) return;
      requestAnimationFrame(() => {
        const buttons = suggestionButtons(textarea);
        if (buttons.length && !buttons.some((button) => button.classList.contains("is-active"))) select(buttons, 0);
      });
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("input", onInput, true);
    };
  }, []);

  return null;
}
