import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
// Import server build directly — jsdom resolves solid-js/web to browser build
// which doesn't have renderToString
import { renderToString } from "solid-js/web";
import { enableObservableTracking } from "../src/enable-observable-tracking";
import { enableStaticRendering, isUsingStaticRendering } from "../src/static-rendering";
import { observer } from "../src/observer";
import { Observer } from "../src/observer-component";
import { createLocalObservable } from "../src/create-local-observable";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("SSR — renderToString with observer", () => {
  beforeEach(() => {
    ensureBinding();
    enableStaticRendering(true);
  });

  afterEach(() => {
    enableStaticRendering(false);
  });

  it("renders initial MobX state to string", () => {
    const store = observable({ count: 42 });

    const Counter = observer(() => {
      return <span>{store.count}</span>;
    });

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

    const Counter = observer(() => {
      return (
        <div>
          <span>{store.count}</span>
          <span>{store.double}</span>
        </div>
      );
    });

    const html = renderToString(() => <Counter />);
    expect(html).toContain("5");
    expect(html).toContain("10");
  });

  it("renders createLocalObservable state to string", () => {
    const Counter = observer(() => {
      const store = createLocalObservable(() => ({
        count: 7,
        get double() {
          return this.count * 2;
        },
      }));

      return (
        <div>
          <span>{store.count}</span>
          <span>{store.double}</span>
        </div>
      );
    });

    const html = renderToString(() => <Counter />);
    expect(html).toContain("7");
    expect(html).toContain("14");
  });

  it("renders conditional MobX state to string", () => {
    const store = observable({ visible: true, label: "Hello SSR" });

    const Conditional = observer(() => {
      return (
        <div>
          {store.visible ? <span>{store.label}</span> : <span>Hidden</span>}
        </div>
      );
    });

    const html = renderToString(() => <Conditional />);
    expect(html).toContain("Hello SSR");
    expect(html).not.toContain("Hidden");
  });

  it("renders list from MobX observable array to string", () => {
    const store = observable({ items: ["A", "B", "C"] });

    const List = observer(() => {
      return (
        <ul>
          {store.items.map((item) => (
            <li>{item}</li>
          ))}
        </ul>
      );
    });

    const html = renderToString(() => <List />);
    expect(html).toContain("A");
    expect(html).toContain("B");
    expect(html).toContain("C");
    expect(html).toContain("<li");
    expect(html).toContain("</li>");
  });

  it("no MobX reactions leak after SSR — store changes do not cause errors", () => {
    const store = observable({ count: 0 });

    const Counter = observer(() => {
      return <span>{store.count}</span>;
    });

    renderToString(() => <Counter />);

    // After SSR, changing the store should not throw
    // (no orphaned reactions trying to update non-existent DOM)
    expect(() => {
      action(() => { store.count = 99; })();
    }).not.toThrow();
  });

  it("renders multiple observer components to string", () => {
    const storeA = observable({ value: "A" });
    const storeB = observable({ value: "B" });

    const CompA = observer(() => <span>{storeA.value}</span>);
    const CompB = observer(() => <span>{storeB.value}</span>);

    const html = renderToString(() => (
      <div>
        <CompA />
        <CompB />
      </div>
    ));

    expect(html).toContain("A");
    expect(html).toContain("B");
  });
});

describe("SSR — renderToString with Observer", () => {
  beforeEach(() => {
    ensureBinding();
    enableStaticRendering(true);
  });

  afterEach(() => {
    enableStaticRendering(false);
  });

  it("renders children to string in static mode", () => {
    const store = observable({ count: 10 });

    const html = renderToString(() => (
      <Observer>{() => <span>{store.count}</span>}</Observer>
    ));

    expect(html).toContain("10");
  });

  it("renders alongside static content in SSR", () => {
    const store = observable({ value: "dynamic" });

    const html = renderToString(() => (
      <div>
        <span>static</span>
        <Observer>{() => <span>{store.value}</span>}</Observer>
      </div>
    ));

    expect(html).toContain("static");
    expect(html).toContain("dynamic");
  });

  it("multiple Observer boundaries render correctly in SSR", () => {
    const storeA = observable({ value: "X" });
    const storeB = observable({ value: "Y" });

    const html = renderToString(() => (
      <div>
        <Observer>{() => <span>{storeA.value}</span>}</Observer>
        <Observer>{() => <span>{storeB.value}</span>}</Observer>
      </div>
    ));

    expect(html).toContain("X");
    expect(html).toContain("Y");
  });

  it("no MobX reactions leak from Observer after SSR", () => {
    const store = observable({ count: 0 });

    renderToString(() => (
      <Observer>{() => <span>{store.count}</span>}</Observer>
    ));

    // After SSR, changing the store should not throw
    expect(() => {
      action(() => { store.count = 99; })();
    }).not.toThrow();
  });
});

describe("SSR — enableStaticRendering lifecycle", () => {
  beforeEach(() => {
    ensureBinding();
  });

  afterEach(() => {
    enableStaticRendering(false);
  });

  it("observer returns unwrapped component in SSR mode", () => {
    enableStaticRendering(true);

    const MyComp = () => <span>test</span>;
    const wrapped = observer(MyComp);

    // In SSR mode, observer returns the original component unchanged
    expect(wrapped).toBe(MyComp);
  });

  it("isUsingStaticRendering reflects current state", () => {
    expect(isUsingStaticRendering()).toBe(false);

    enableStaticRendering(true);
    expect(isUsingStaticRendering()).toBe(true);

    enableStaticRendering(false);
    expect(isUsingStaticRendering()).toBe(false);
  });

  it("renders correctly with and without static rendering", () => {
    const store = observable({ count: 0 });

    // SSR render
    enableStaticRendering(true);
    const Counter = observer(() => <span>{store.count}</span>);
    const ssrHtml = renderToString(() => <Counter />);
    expect(ssrHtml).toContain("0");

    // After disabling static rendering, observer wraps the component
    enableStaticRendering(false);
    const Counter2 = observer(() => <span>{store.count}</span>);
    const ssrHtml2 = renderToString(() => <Counter2 />);
    expect(ssrHtml2).toContain("0");
  });
});
