/**
 * Tiny fake DOM for the zero-dependency unit tests.
 * Unlike the throw-away mocks in arcade-games.test.js, this one REMEMBERS event listeners,
 * so a test can click a button or press a key and see what the game really does.
 */
class FakeElement {
  constructor(tag) {
    this.tagName = (tag || 'div').toUpperCase();
    this._classes = new Set();
    this._listeners = {};
    this.children = [];
    this.style = {};
    this.attrs = {};
    this.textContent = '';
    this._html = '';
    this.dataset = {};
    const self = this;
    this.classList = {
      add: (...c) => c.forEach(x => self._classes.add(x)),
      remove: (...c) => c.forEach(x => self._classes.delete(x)),
      toggle: (c, on) => { if (on === undefined ? !self._classes.has(c) : on) self._classes.add(c); else self._classes.delete(c); },
      contains: c => self._classes.has(c)
    };
  }
  set innerHTML(v) { this._html = String(v); this.children = []; }   // like a real DOM: replacing HTML drops old children
  get innerHTML() { return this._html; }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this._classes].join(' '); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k.startsWith('data-')) this.dataset[k.slice(5)] = String(v); }
  getAttribute(k) { return this.attrs[k] !== undefined ? this.attrs[k] : null; }
  addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); }
  removeEventListener(type, fn) { this._listeners[type] = (this._listeners[type] || []).filter(f => f !== fn); }
  appendChild(c) { this.children.push(c); return c; }
  dispatch(type, ev) { (this._listeners[type] || []).slice().forEach(fn => fn(ev || {})); }
  click() { this.dispatch('click', {}); }
  focus() {}
  querySelector(sel) { this._q = this._q || {}; return (this._q[sel] = this._q[sel] || new FakeElement('div')); }
  querySelectorAll() { return []; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 500, height: 500 }; }
  getContext() {
    const noop = () => {};
    return new Proxy({}, { get: (t, k) => (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop: noop }) : (k === 'measureText' ? () => ({ width: 10 }) : noop), set: () => true });
  }
}

/** A container whose querySelector hands back the SAME element for the same selector. */
function createContainer() {
  const els = {};
  const c = new FakeElement('div');
  c.querySelector = sel => (els[sel] = els[sel] || new FakeElement('div'));
  c.querySelectorAll = () => [];
  c._els = els;
  return c;
}

const windowListeners = {};
function installGlobals() {
  global.performance = { now: () => Date.now() };
  global.requestAnimationFrame = () => 1;   // never run frames: tests drive the game by hand
  global.cancelAnimationFrame = () => {};
  global.window = {
    location: { hash: '#' },
    addEventListener: (t, fn) => { (windowListeners[t] = windowListeners[t] || []).push(fn); },
    removeEventListener: (t, fn) => { windowListeners[t] = (windowListeners[t] || []).filter(f => f !== fn); }
  };
  global.document = {
    createElement: tag => new FakeElement(tag),
    getElementById: () => null,
    body: { classList: { add() {}, remove() {} } }
  };
  const store = {};
  global.localStorage = {
    getItem: k => (store[k] !== undefined ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => Object.keys(store).forEach(k => delete store[k])
  };
}

/** Send a keydown to every handler a game registered on window. */
function pressKey(key, extra) {
  const ev = Object.assign({ key, repeat: false, preventDefault() {} }, extra || {});
  (windowListeners.keydown || []).slice().forEach(fn => fn(ev));
}
function keydownHandlerCount() { return (windowListeners.keydown || []).length; }
function resetWindowListeners() { Object.keys(windowListeners).forEach(k => { windowListeners[k] = []; }); }

module.exports = { FakeElement, createContainer, installGlobals, pressKey, keydownHandlerCount, resetWindowListeners };
