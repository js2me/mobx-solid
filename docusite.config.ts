import { defineConfig } from "docusite";

export default defineConfig({
  title: "mobx-solid",
  description:
    "MobX bindings for SolidJS — reactive state management with fine-grained UI updates",
  colors: {
    light: ["#2c4f7c", "#ea6a1f", "#66e2d5"],
    dark: ["#4f87c7", "#ff8c42", "#66e2d5"],
  },
  nav: [
    { text: "Guide", link: "/introduction/getting-started" },
    { text: "API", link: "/api/enable-observable-tracking" },
  ],
  sidebar: {
    "/": [
      {
        text: "Introduction",
        items: [
          { text: "Getting Started", link: "/introduction/getting-started" },
        ],
      },
      {
        text: "Guide",
        items: [
          { text: "How It Works", link: "/guide/how-it-works" },
          {
            text: "Reading Observables",
            link: "/guide/reading-observables",
          },
          {
            text: "Comparison with mobx-react-lite",
            link: "/guide/comparison",
          },
        ],
      },
      {
        text: "API",
        items: [
          {
            text: "enableObservableTracking",
            link: "/api/enable-observable-tracking",
          },
          { text: "obs", link: "/api/obs" },
        ],
      },
    ],
  },
  search: "local",
  llms: true,
  github: "https://github.com/js2me/mobx-solid",
});
