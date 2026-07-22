import { createLocalObservable } from "mobx-solid";
import { createEffect } from "solid-js";

export function ThemeToggle() {
  const theme = createLocalObservable(() => ({
    mode: (localStorage.getItem("mobx-solid-theme") as "light" | "dark") || "dark",
    toggle() {
      this.mode = this.mode === "dark" ? "light" : "dark";
    },
  }));

  createEffect(() => {
    document.documentElement.dataset.theme = theme.mode;
    localStorage.setItem("mobx-solid-theme", theme.mode);
  });

  return (
    <button type="button" class="btn theme" onClick={() => theme.toggle()}>
      {theme.mode === "dark" ? "Light" : "Dark"}
    </button>
  );
}
