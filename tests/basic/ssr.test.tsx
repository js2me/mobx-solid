import { describe, it, expect, beforeEach } from "vitest";
import { observable, action } from "mobx";
import { renderToString } from "solid-js/web";
import { enableObservableTracking } from "../../src/enable-observable-tracking";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("SSR — renderToString with MobX observables", () => {
  beforeEach(() => {
    ensureBinding();
  });

  it("renders initial MobX state to string", () => {
    const store = observable({ count: 42 });

    const Counter = () => <span>{store.count}</span>;

    const html = renderToString(() => <Counter />);
    expect(html).toContain("42");
  });

  it("renders computed values to string", () => {
    const store = observable({
      count: 5,
      get double() {
        return this.count * 2;
      },
    });

    const Counter = () => (
      <div>
        <span>{store.count}</span>
        <span>{store.double}</span>
      </div>
    );

    const html = renderToString(() => <Counter />);
    expect(html).toContain("5");
    expect(html).toContain("10");
  });

  it("renders conditional MobX state to string", () => {
    const store = observable({ visible: true, label: "Hello SSR" });

    const Conditional = () => (
      <div>
        {store.visible ? <span>{store.label}</span> : <span>Hidden</span>}
      </div>
    );

    const html = renderToString(() => <Conditional />);
    expect(html).toContain("Hello SSR");
    expect(html).not.toContain("Hidden");
  });

  it("renders list from MobX observable array to string", () => {
    const store = observable({ items: ["A", "B", "C"] });

    const List = () => (
      <ul>
        {store.items.map((item) => (
          <li>{item}</li>
        ))}
      </ul>
    );

    const html = renderToString(() => <List />);
    expect(html).toContain("A");
    expect(html).toContain("B");
    expect(html).toContain("C");
    expect(html).toContain("<li");
    expect(html).toContain("</li>");
  });

  it("no MobX reactions leak after SSR — store changes do not cause errors", () => {
    const store = observable({ count: 0 });

    const Counter = () => <span>{store.count}</span>;

    renderToString(() => <Counter />);

    expect(() => {
      action(() => { store.count = 99; })();
    }).not.toThrow();
  });

  it("renders multiple components to string", () => {
    const storeA = observable({ value: "A" });
    const storeB = observable({ value: "B" });

    const CompA = () => <span>{storeA.value}</span>;
    const CompB = () => <span>{storeB.value}</span>;

    const html = renderToString(() => (
      <div>
        <CompA />
        <CompB />
      </div>
    ));

    expect(html).toContain("A");
    expect(html).toContain("B");
  });

  it("renders alongside static content in SSR", () => {
    const store = observable({ value: "dynamic" });

    const html = renderToString(() => (
      <div>
        <span>static</span>
        <span>{store.value}</span>
      </div>
    ));

    expect(html).toContain("static");
    expect(html).toContain("dynamic");
  });
});
