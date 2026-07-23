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
  - title: Optional bridges
    icon: <span class="i-logos:typescript-icon"></span>
    details: Use obs when you need a Solid signal without enabling global tracking.
  - title: No wrappers
    icon: ⚡
    details: Unlike mobx-react-lite, you do not need an observer HOC or wrapper components.
---
