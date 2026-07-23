/* @refresh reload */
import { hydrate } from "solid-js/web";
import { enableObservableTracking } from "mobx-solid";
import { App } from "./App";
import "./styles.css";

enableObservableTracking();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

hydrate(() => <App />, root);
