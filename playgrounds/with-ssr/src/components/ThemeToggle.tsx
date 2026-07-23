import { makeAutoObservable } from "mobx";
import { createEffect } from "solid-js";
import { isServer } from "solid-js/web";

export function ThemeToggle() {
  const theme = makeAutoObservable({
    mode: (
      isServer
        ? "dark"
        : (localStorage.getItem("mobx-solid-theme") as "light" | "dark" | null) || "dark"
    ) as "light" | "dark",
    toggle() {
      this.mode = this.mode === "dark" ? "light" : "dark";
    },
  });

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
