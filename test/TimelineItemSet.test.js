import assert from "node:assert";

import jsdom_global from "jsdom-global";
import { DataSet } from "vis-data/esnext";

import ItemSet from "../lib/timeline/component/ItemSet.js";
import * as DateUtil from "../lib/timeline/DateUtil.js";
import Range from "../lib/timeline/Range.js";
import TestSupport from "./TestSupport.js";

const internals = {};

describe("Timeline ItemSet", () => {
  before(() => {
    internals.jsdom = jsdom_global();

    const rangeBody = TestSupport.buildSimpleTimelineRangeBody();
    internals.testrange = new Range(rangeBody);
    internals.testrange.setRange(
      new Date(2017, 1, 26, 13, 26, 3, 320),
      new Date(2017, 1, 26, 13, 26, 4, 320),
      false,
      false,
      null,
    );
    internals.testitems = new DataSet({
      type: {
        start: "Date",
        end: "Date",
      },
    });
    // add single items with different date types
    internals.testitems.add({
      id: 1,
      content: "Item 1",
      start: new Date(2017, 1, 26, 13, 26, 3, 600),
      type: "point",
    });
    internals.testitems.add({
      id: 2,
      content: "Item 2",
      start: new Date(2017, 1, 26, 13, 26, 5, 600),
      type: "point",
    });
  });

  after(() => {
    internals.jsdom();
  });

  const getBasicBody = () => {
    const body = {
      dom: {
        container: document.createElement("div"),
        leftContainer: document.createElement("div"),
        centerContainer: document.createElement("div"),
        top: document.createElement("div"),
        left: document.createElement("div"),
        center: document.createElement("div"),
        backgroundVertical: document.createElement("div"),
      },
      domProps: {
        root: {},
        background: {},
        centerContainer: {},
        leftContainer: {},
        rightContainer: {},
        center: {},
        left: {},
        right: {},
        top: {},
        bottom: {},
        border: {},
        scrollTop: 0,
        scrollTopMin: 0,
      },
      emitter: {
        on: () => {
          return {};
        },
        emit: () => {},
      },
      util: {},
    };
    return body;
  };

  it("should initialise with minimal data", () => {
    const body = getBasicBody();
    const itemset = new ItemSet(body, {});
    assert(itemset);
  });

  it("should redraw() and have the right classNames", () => {
    const body = getBasicBody();
    body.range = internals.testrange;
    const itemset = new ItemSet(body, {});
    itemset.redraw();
    assert.equal(itemset.dom.frame.className, "vis-itemset");
    assert.equal(itemset.dom.background.className, "vis-background");
    assert.equal(itemset.dom.foreground.className, "vis-foreground");
    assert.equal(itemset.dom.axis.className, "vis-axis");
    assert.equal(itemset.dom.labelSet.className, "vis-labelset");
  });

  it("should start with no items", () => {
    const body = getBasicBody();
    const itemset = new ItemSet(body, {});
    assert.equal(itemset.getItems(), null);
  });

  it("skips a label resize redraw when it is destroyed before the frame", () => {
    const observers = [];
    const frames = [];
    const { ResizeObserver, requestAnimationFrame } = globalThis;
    globalThis.ResizeObserver = class {
      constructor(callback) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    };
    globalThis.requestAnimationFrame = (callback) => frames.push(callback);
    try {
      const body = getBasicBody();
      body.range = internals.testrange;
      const emitted = [];
      body.emitter.emit = (event) => emitted.push(event);
      body.emitter.off = () => {};
      const itemset = new ItemSet(body, {});
      itemset.setGroups(new DataSet([{ id: 1, content: "Group 1" }]));
      itemset.groups[1].props.label.width = 10; // the label was measured wider
      observers.forEach((callback) => callback());

      itemset.destroy();
      const emittedBeforeFrame = emitted.length;
      frames.forEach((callback) => callback());

      assert.equal(frames.length, 1);
      assert.equal(emitted.length, emittedBeforeFrame);
    } finally {
      globalThis.ResizeObserver = ResizeObserver;
      globalThis.requestAnimationFrame = requestAnimationFrame;
    }
  });

  it("should store items correctly", () => {
    const body = getBasicBody();
    body.range = internals.testrange;
    body.util.toScreen = (time) => {
      return DateUtil.toScreen(
        {
          body: {
            hiddenDates: [],
          },
          range: {
            conversion: () => {
              return { offset: 0, scale: 100 };
            },
          },
        },
        time,
        900,
      );
    };
    const itemset = new ItemSet(body, {});
    itemset.setItems(internals.testitems);
    assert.equal(itemset.getItems().length, 2);
    assert.deepEqual(itemset.getItems(), internals.testitems);
  });
});
