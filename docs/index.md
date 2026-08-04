---
layout: home

hero:
  name: mobx-solid
  text: MobX + SolidJS
  tagline: Reactive state management with fine-grained UI updates — no observer wrappers required
  actions:
    - theme: brand
      text: Get Started
      link: /introduction/getting-started
    - theme: alt
      text: API Reference
      link: /api/enable-observable-tracking
    - theme: alt
      text: GitHub
      link: https://github.com/js2me/mobx-solid

features:
  - title: Transparent tracking
    icon: <span class="i-logos:mobx"></span>
    details: Call enableObservableTracking once, then read MobX observables directly in JSX and Solid computations.
  - title: Fine-grained updates
    icon: <span class="i-logos:solidjs-icon"></span>
    details: Solid updates only the DOM that depends on changed observables — no full component re-renders.
  - title: No wrappers
    icon: ⚡
    details: Unlike mobx-react-lite, you do not need an observer HOC or wrapper components.
  - title: SSR safe
    icon: 🌐
    details: Works on the server with no zombie observers or memory leaks during server-side rendering.
---
