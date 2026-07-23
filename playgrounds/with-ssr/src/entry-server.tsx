import { generateHydrationScript, renderToString } from "solid-js/web";
import { enableObservableTracking } from "mobx-solid";
import { App } from "./App";

enableObservableTracking();

export function render() {
  const html = renderToString(() => <App />);
  return {
    html,
    hydrationScript: generateHydrationScript(),
  };
}
