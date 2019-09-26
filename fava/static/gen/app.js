(function () {
  'use strict';

  class ValidationError extends Error {
  }
  function unknown(json) {
      return json;
  }
  function string(json) {
      if (typeof json === "string") {
          return json;
      }
      throw new ValidationError(`Expected a string, got '${json}' instead.`);
  }
  function boolean(json) {
      if (typeof json === "boolean") {
          return json;
      }
      throw new ValidationError(`Expected a boolean, got '${json}' instead.`);
  }
  function number(json) {
      if (typeof json === "number") {
          return json;
      }
      throw new ValidationError(`Expected a number, got '${json}' instead.`);
  }
  function date(json) {
      if (typeof json === "string" || json instanceof Date) {
          return new Date(json);
      }
      throw new ValidationError(`Expected a date: ${json}`);
  }
  function constant(value) {
      return (json) => {
          if (json === value) {
              return json;
          }
          throw new ValidationError(`Expected a constant: ${json}`);
      };
  }
  function union(a, b) {
      return (json) => {
          for (const validator of [a, b]) {
              try {
                  return validator(json);
              }
              catch (exc) {
                  // pass
              }
          }
          throw new ValidationError(`Validating union failed`);
      };
  }
  function lazy(func) {
      return (json) => {
          return func()(json);
      };
  }
  function array(validator) {
      return (json) => {
          if (Array.isArray(json)) {
              const result = [];
              json.forEach(element => {
                  result.push(validator(element));
              });
              return result;
          }
          throw new ValidationError(`Expected an array: ${json}`);
      };
  }
  function tuple(decoders) {
      return (json) => {
          if (Array.isArray(json) && json.length === 2) {
              const result = [];
              for (let i = 0; i < decoders.length; i += 1) {
                  result[i] = decoders[i](json[i]);
              }
              return result;
          }
          throw new ValidationError(`Expected a tuple: ${json}`);
      };
  }
  const isJsonObject = (json) => typeof json === "object" && json !== null && !Array.isArray(json);
  function object(validators) {
      return (json) => {
          if (isJsonObject(json)) {
              const obj = {};
              // eslint-disable-next-line no-restricted-syntax
              for (const key in validators) {
                  if (Object.prototype.hasOwnProperty.call(validators, key)) {
                      try {
                          obj[key] = validators[key](json[key]);
                      }
                      catch (exc) {
                          console.log(`Validating key ${key} failed`);
                          console.log(json[key]);
                          console.log(json);
                          throw exc;
                      }
                  }
              }
              return obj;
          }
          throw new ValidationError();
      };
  }
  function record(decoder) {
      return (json) => {
          if (isJsonObject(json)) {
              const ret = {};
              // eslint-disable-next-line no-restricted-syntax
              for (const key in json) {
                  if (Object.prototype.hasOwnProperty.call(json, key)) {
                      ret[key] = decoder(json[key]);
                  }
              }
              return ret;
          }
          throw new ValidationError();
      };
  }

  function noop() { }
  function assign(tar, src) {
      // @ts-ignore
      for (const k in src)
          tar[k] = src[k];
      return tar;
  }
  function is_promise(value) {
      return value && typeof value === 'object' && typeof value.then === 'function';
  }
  function run(fn) {
      return fn();
  }
  function blank_object() {
      return Object.create(null);
  }
  function run_all(fns) {
      fns.forEach(run);
  }
  function is_function(thing) {
      return typeof thing === 'function';
  }
  function safe_not_equal(a, b) {
      return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
  }
  function subscribe(store, callback) {
      const unsub = store.subscribe(callback);
      return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
  }
  function component_subscribe(component, store, callback) {
      component.$$.on_destroy.push(subscribe(store, callback));
  }
  function create_slot(definition, ctx, fn) {
      if (definition) {
          const slot_ctx = get_slot_context(definition, ctx, fn);
          return definition[0](slot_ctx);
      }
  }
  function get_slot_context(definition, ctx, fn) {
      return definition[1]
          ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
          : ctx.$$scope.ctx;
  }
  function get_slot_changes(definition, ctx, changed, fn) {
      return definition[1]
          ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
          : ctx.$$scope.changed || {};
  }
  function null_to_empty(value) {
      return value == null ? '' : value;
  }
  function set_store_value(store, ret, value = ret) {
      store.set(value);
      return ret;
  }

  function append(target, node) {
      target.appendChild(node);
  }
  function insert(target, node, anchor) {
      target.insertBefore(node, anchor || null);
  }
  function detach(node) {
      node.parentNode.removeChild(node);
  }
  function destroy_each(iterations, detaching) {
      for (let i = 0; i < iterations.length; i += 1) {
          if (iterations[i])
              iterations[i].d(detaching);
      }
  }
  function element(name) {
      return document.createElement(name);
  }
  function svg_element(name) {
      return document.createElementNS('http://www.w3.org/2000/svg', name);
  }
  function text(data) {
      return document.createTextNode(data);
  }
  function space() {
      return text(' ');
  }
  function empty() {
      return text('');
  }
  function listen(node, event, handler, options) {
      node.addEventListener(event, handler, options);
      return () => node.removeEventListener(event, handler, options);
  }
  function prevent_default(fn) {
      return function (event) {
          event.preventDefault();
          // @ts-ignore
          return fn.call(this, event);
      };
  }
  function attr(node, attribute, value) {
      if (value == null)
          node.removeAttribute(attribute);
      else
          node.setAttribute(attribute, value);
  }
  function set_attributes(node, attributes) {
      for (const key in attributes) {
          if (key === 'style') {
              node.style.cssText = attributes[key];
          }
          else if (key in node) {
              node[key] = attributes[key];
          }
          else {
              attr(node, key, attributes[key]);
          }
      }
  }
  function children(element) {
      return Array.from(element.childNodes);
  }
  function set_data(text, data) {
      data = '' + data;
      if (text.data !== data)
          text.data = data;
  }
  function set_input_value(input, value) {
      if (value != null || input.value) {
          input.value = value;
      }
  }
  function set_style(node, key, value, important) {
      node.style.setProperty(key, value, important ? 'important' : '');
  }
  function select_option(select, value) {
      for (let i = 0; i < select.options.length; i += 1) {
          const option = select.options[i];
          if (option.__value === value) {
              option.selected = true;
              return;
          }
      }
  }
  function select_value(select) {
      const selected_option = select.querySelector(':checked') || select.options[0];
      return selected_option && selected_option.__value;
  }
  function add_resize_listener(element, fn) {
      if (getComputedStyle(element).position === 'static') {
          element.style.position = 'relative';
      }
      const object = document.createElement('object');
      object.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
      object.type = 'text/html';
      object.tabIndex = -1;
      let win;
      object.onload = () => {
          win = object.contentDocument.defaultView;
          win.addEventListener('resize', fn);
      };
      if (/Trident/.test(navigator.userAgent)) {
          element.appendChild(object);
          object.data = 'about:blank';
      }
      else {
          object.data = 'about:blank';
          element.appendChild(object);
      }
      return {
          cancel: () => {
              win && win.removeEventListener && win.removeEventListener('resize', fn);
              element.removeChild(object);
          }
      };
  }
  function toggle_class(element, name, toggle) {
      element.classList[toggle ? 'add' : 'remove'](name);
  }
  function custom_event(type, detail) {
      const e = document.createEvent('CustomEvent');
      e.initCustomEvent(type, false, false, detail);
      return e;
  }
  class HtmlTag {
      constructor(html, anchor = null) {
          this.e = element('div');
          this.a = anchor;
          this.u(html);
      }
      m(target, anchor = null) {
          for (let i = 0; i < this.n.length; i += 1) {
              insert(target, this.n[i], anchor);
          }
          this.t = target;
      }
      u(html) {
          this.e.innerHTML = html;
          this.n = Array.from(this.e.childNodes);
      }
      p(html) {
          this.d();
          this.u(html);
          this.m(this.t, this.a);
      }
      d() {
          this.n.forEach(detach);
      }
  }

  let current_component;
  function set_current_component(component) {
      current_component = component;
  }
  function get_current_component() {
      if (!current_component)
          throw new Error(`Function called outside component initialization`);
      return current_component;
  }
  function onMount(fn) {
      get_current_component().$$.on_mount.push(fn);
  }
  function afterUpdate(fn) {
      get_current_component().$$.after_update.push(fn);
  }
  function createEventDispatcher() {
      const component = current_component;
      return (type, detail) => {
          const callbacks = component.$$.callbacks[type];
          if (callbacks) {
              // TODO are there situations where events could be dispatched
              // in a server (non-DOM) environment?
              const event = custom_event(type, detail);
              callbacks.slice().forEach(fn => {
                  fn.call(component, event);
              });
          }
      };
  }

  const dirty_components = [];
  const binding_callbacks = [];
  const render_callbacks = [];
  const flush_callbacks = [];
  const resolved_promise = Promise.resolve();
  let update_scheduled = false;
  function schedule_update() {
      if (!update_scheduled) {
          update_scheduled = true;
          resolved_promise.then(flush);
      }
  }
  function tick() {
      schedule_update();
      return resolved_promise;
  }
  function add_render_callback(fn) {
      render_callbacks.push(fn);
  }
  function add_flush_callback(fn) {
      flush_callbacks.push(fn);
  }
  function flush() {
      const seen_callbacks = new Set();
      do {
          // first, call beforeUpdate functions
          // and update components
          while (dirty_components.length) {
              const component = dirty_components.shift();
              set_current_component(component);
              update(component.$$);
          }
          while (binding_callbacks.length)
              binding_callbacks.pop()();
          // then, once components are updated, call
          // afterUpdate functions. This may cause
          // subsequent updates...
          for (let i = 0; i < render_callbacks.length; i += 1) {
              const callback = render_callbacks[i];
              if (!seen_callbacks.has(callback)) {
                  callback();
                  // ...so guard against infinite loops
                  seen_callbacks.add(callback);
              }
          }
          render_callbacks.length = 0;
      } while (dirty_components.length);
      while (flush_callbacks.length) {
          flush_callbacks.pop()();
      }
      update_scheduled = false;
  }
  function update($$) {
      if ($$.fragment) {
          $$.update($$.dirty);
          run_all($$.before_update);
          $$.fragment.p($$.dirty, $$.ctx);
          $$.dirty = null;
          $$.after_update.forEach(add_render_callback);
      }
  }
  const outroing = new Set();
  let outros;
  function group_outros() {
      outros = {
          r: 0,
          c: [],
          p: outros // parent group
      };
  }
  function check_outros() {
      if (!outros.r) {
          run_all(outros.c);
      }
      outros = outros.p;
  }
  function transition_in(block, local) {
      if (block && block.i) {
          outroing.delete(block);
          block.i(local);
      }
  }
  function transition_out(block, local, detach, callback) {
      if (block && block.o) {
          if (outroing.has(block))
              return;
          outroing.add(block);
          outros.c.push(() => {
              outroing.delete(block);
              if (callback) {
                  if (detach)
                      block.d(1);
                  callback();
              }
          });
          block.o(local);
      }
  }

  function handle_promise(promise, info) {
      const token = info.token = {};
      function update(type, index, key, value) {
          if (info.token !== token)
              return;
          info.resolved = key && { [key]: value };
          const child_ctx = assign(assign({}, info.ctx), info.resolved);
          const block = type && (info.current = type)(child_ctx);
          if (info.block) {
              if (info.blocks) {
                  info.blocks.forEach((block, i) => {
                      if (i !== index && block) {
                          group_outros();
                          transition_out(block, 1, 1, () => {
                              info.blocks[i] = null;
                          });
                          check_outros();
                      }
                  });
              }
              else {
                  info.block.d(1);
              }
              block.c();
              transition_in(block, 1);
              block.m(info.mount(), info.anchor);
              flush();
          }
          info.block = block;
          if (info.blocks)
              info.blocks[index] = block;
      }
      if (is_promise(promise)) {
          const current_component = get_current_component();
          promise.then(value => {
              set_current_component(current_component);
              update(info.then, 1, info.value, value);
              set_current_component(null);
          }, error => {
              set_current_component(current_component);
              update(info.catch, 2, info.error, error);
              set_current_component(null);
          });
          // if we previously had a then/catch block, destroy it
          if (info.current !== info.pending) {
              update(info.pending, 0);
              return true;
          }
      }
      else {
          if (info.current !== info.then) {
              update(info.then, 1, info.value, promise);
              return true;
          }
          info.resolved = { [info.value]: promise };
      }
  }

  const globals = (typeof window !== 'undefined' ? window : global);

  function get_spread_update(levels, updates) {
      const update = {};
      const to_null_out = {};
      const accounted_for = { $$scope: 1 };
      let i = levels.length;
      while (i--) {
          const o = levels[i];
          const n = updates[i];
          if (n) {
              for (const key in o) {
                  if (!(key in n))
                      to_null_out[key] = 1;
              }
              for (const key in n) {
                  if (!accounted_for[key]) {
                      update[key] = n[key];
                      accounted_for[key] = 1;
                  }
              }
              levels[i] = n;
          }
          else {
              for (const key in o) {
                  accounted_for[key] = 1;
              }
          }
      }
      for (const key in to_null_out) {
          if (!(key in update))
              update[key] = undefined;
      }
      return update;
  }
  function get_spread_object(spread_props) {
      return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
  }

  function bind(component, name, callback) {
      if (component.$$.props.indexOf(name) === -1)
          return;
      component.$$.bound[name] = callback;
      callback(component.$$.ctx[name]);
  }
  function mount_component(component, target, anchor) {
      const { fragment, on_mount, on_destroy, after_update } = component.$$;
      fragment.m(target, anchor);
      // onMount happens before the initial afterUpdate
      add_render_callback(() => {
          const new_on_destroy = on_mount.map(run).filter(is_function);
          if (on_destroy) {
              on_destroy.push(...new_on_destroy);
          }
          else {
              // Edge case - component was destroyed immediately,
              // most likely as a result of a binding initialising
              run_all(new_on_destroy);
          }
          component.$$.on_mount = [];
      });
      after_update.forEach(add_render_callback);
  }
  function destroy_component(component, detaching) {
      if (component.$$.fragment) {
          run_all(component.$$.on_destroy);
          component.$$.fragment.d(detaching);
          // TODO null out other refs, including component.$$ (but need to
          // preserve final state?)
          component.$$.on_destroy = component.$$.fragment = null;
          component.$$.ctx = {};
      }
  }
  function make_dirty(component, key) {
      if (!component.$$.dirty) {
          dirty_components.push(component);
          schedule_update();
          component.$$.dirty = blank_object();
      }
      component.$$.dirty[key] = true;
  }
  function init(component, options, instance, create_fragment, not_equal, prop_names) {
      const parent_component = current_component;
      set_current_component(component);
      const props = options.props || {};
      const $$ = component.$$ = {
          fragment: null,
          ctx: null,
          // state
          props: prop_names,
          update: noop,
          not_equal,
          bound: blank_object(),
          // lifecycle
          on_mount: [],
          on_destroy: [],
          before_update: [],
          after_update: [],
          context: new Map(parent_component ? parent_component.$$.context : []),
          // everything else
          callbacks: blank_object(),
          dirty: null
      };
      let ready = false;
      $$.ctx = instance
          ? instance(component, props, (key, ret, value = ret) => {
              if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                  if ($$.bound[key])
                      $$.bound[key](value);
                  if (ready)
                      make_dirty(component, key);
              }
              return ret;
          })
          : props;
      $$.update();
      ready = true;
      run_all($$.before_update);
      $$.fragment = create_fragment($$.ctx);
      if (options.target) {
          if (options.hydrate) {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              $$.fragment.l(children(options.target));
          }
          else {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              $$.fragment.c();
          }
          if (options.intro)
              transition_in(component.$$.fragment);
          mount_component(component, options.target, options.anchor);
          flush();
      }
      set_current_component(parent_component);
  }
  class SvelteComponent {
      $destroy() {
          destroy_component(this, 1);
          this.$destroy = noop;
      }
      $on(type, callback) {
          const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
          callbacks.push(callback);
          return () => {
              const index = callbacks.indexOf(callback);
              if (index !== -1)
                  callbacks.splice(index, 1);
          };
      }
      $set() {
          // overridden by instance, if it has props
      }
  }

  const subscriber_queue = [];
  /**
   * Create a `Writable` store that allows both updating and reading by subscription.
   * @param {*=}value initial value
   * @param {StartStopNotifier=}start start and stop notifications for subscriptions
   */
  function writable(value, start = noop) {
      let stop;
      const subscribers = [];
      function set(new_value) {
          if (safe_not_equal(value, new_value)) {
              value = new_value;
              if (stop) { // store is ready
                  const run_queue = !subscriber_queue.length;
                  for (let i = 0; i < subscribers.length; i += 1) {
                      const s = subscribers[i];
                      s[1]();
                      subscriber_queue.push(s, value);
                  }
                  if (run_queue) {
                      for (let i = 0; i < subscriber_queue.length; i += 2) {
                          subscriber_queue[i][0](subscriber_queue[i + 1]);
                      }
                      subscriber_queue.length = 0;
                  }
              }
          }
      }
      function update(fn) {
          set(fn(value));
      }
      function subscribe(run, invalidate = noop) {
          const subscriber = [run, invalidate];
          subscribers.push(subscriber);
          if (subscribers.length === 1) {
              stop = start(set) || noop;
          }
          run(value);
          return () => {
              const index = subscribers.indexOf(subscriber);
              if (index !== -1) {
                  subscribers.splice(index, 1);
              }
              if (subscribers.length === 0) {
                  stop();
                  stop = null;
              }
          };
      }
      return { set, update, subscribe };
  }

  const urlHash = writable("");
  const conversion = writable("");
  const interval = writable("month");
  const showCharts = writable(true);
  const activeChart = writable({});
  const chartMode = writable("treemap");
  const chartCurrency = writable("");
  const favaAPIValidator = object({
      accountURL: string,
      accounts: array(string),
      baseURL: string,
      currencies: array(string),
      documentTitle: string,
      errors: number,
      favaOptions: object({
          "auto-reload": boolean,
          "currency-column": number,
          interval: string,
          locale: union(string, constant(null)),
      }),
      incognito: boolean,
      links: array(string),
      options: object({
          commodities: array(string),
          documents: array(string),
          operating_currency: array(string),
      }),
      pageTitle: string,
      payees: array(string),
      tags: array(string),
      years: array(number),
  });
  const favaAPI = favaAPIValidator({
      accountURL: "",
      accounts: [],
      baseURL: "",
      currencies: [],
      documentTitle: "",
      errors: 0,
      favaOptions: {
          "auto-reload": false,
          "currency-column": 80,
          interval: "month",
          locale: null,
      },
      incognito: false,
      links: [],
      pageTitle: "",
      payees: [],
      options: {
          commodities: [],
          documents: [],
          operating_currency: [],
      },
      tags: [],
      years: [],
  });
  const filters = writable({
      time: "",
      filter: "",
      account: "",
  });
  const urlSyncedParams = [
      "account",
      "charts",
      "conversion",
      "filter",
      "interval",
      "time",
  ];
  function closeOverlay() {
      if (window.location.hash) {
          window.history.pushState({}, "", "#");
      }
      urlHash.set("");
  }

  /**
   * Select a single element.
   */
  function select(expr, con = document) {
      return con.querySelector(expr);
  }
  /**
   * Select multiple elements (and convert NodeList to Array).
   */
  function selectAll(expr, con = document) {
      return Array.from(con.querySelectorAll(expr));
  }
  function getScriptTagJSON(selector) {
      const el = select(selector);
      if (!el) {
          return null;
      }
      return JSON.parse(el.innerHTML);
  }
  let translations;
  /**
   * Translate the given string.
   */
  function _(text) {
      if (translations === undefined) {
          translations = record(string)(getScriptTagJSON("#translations"));
      }
      return translations[text] || text;
  }
  /**
   * Execute the callback of the event of given type is fired on something
   * matching selector.
   */
  function delegate(element, type, selector, callback) {
      if (!element)
          return;
      element.addEventListener(type, event => {
          let { target } = event;
          if (!target || !(target instanceof Node))
              return;
          if (!(target instanceof Element)) {
              target = target.parentNode;
          }
          if (target instanceof Element) {
              const closest = target.closest(selector);
              if (closest) {
                  callback(event, closest);
              }
          }
      });
  }
  /**
   * Bind an event to element, only run the callback once.
   */
  function once(element, event, callback) {
      function runOnce(ev) {
          element.removeEventListener(event, runOnce);
          callback.apply(element, [ev]);
      }
      element.addEventListener(event, runOnce);
  }
  function ready() {
      return new Promise(resolve => {
          if (document.readyState !== "loading") {
              resolve();
          }
          else {
              document.addEventListener("DOMContentLoaded", resolve);
          }
      });
  }
  /**
   * Handles JSON content for a Promise returned by fetch, also handling an HTTP
   * error status.
   */
  function handleJSON(response) {
      if (!response.ok) {
          return Promise.reject(response.statusText);
      }
      return response.json().then(data => {
          if (!data.success) {
              return Promise.reject(data.error);
          }
          return data;
      });
  }
  /**
   * Handles text content for a Promise returned by fetch, also handling an HTTP
   * error status.
   */
  function handleText(response) {
      if (!response.ok) {
          return Promise.reject(response.statusText);
      }
      return response.text();
  }
  function fetch(input, init = {}) {
      const defaults = {
          credentials: "same-origin",
      };
      return window.fetch(input, Object.assign(defaults, init));
  }
  const validateAPIResponse = object({ data: unknown });
  /**
   * Fetch an API endpoint and convert the JSON data to an object.
   * @param endpoint - the endpoint to fetch
   * @param params - a string to append as params or an object.
   */
  async function fetchAPI(endpoint, params) {
      let url = `${favaAPI.baseURL}api/${endpoint}/`;
      if (params) {
          const urlParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) => {
              urlParams.set(key, value);
          });
          url += `?${urlParams.toString()}`;
      }
      const responseData = await fetch(url).then(handleJSON);
      return validateAPIResponse(responseData).data;
  }
  const putAPIValidators = {
      add_entries: string,
      format_source: string,
      source: string,
  };
  /**
   * Fetch an API endpoint and convert the JSON data to an object.
   * @param endpoint - the endpoint to fetch
   * @param params - a string to append as params or an object.
   */
  async function putAPI(endpoint, body) {
      const res = await fetch(`${favaAPI.baseURL}api/${endpoint}/`, {
          method: "PUT",
          headers: {
              "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
      }).then(handleJSON);
      // @ts-ignore
      return putAPIValidators[endpoint](validateAPIResponse(res).data);
  }
  /**
   * Fuzzy match a pattern against a string.
   *
   * Returns true if all characters of `pattern` can be found in order in
   * `string`. For lowercase characters in `pattern` match both lower and upper
   * case, for uppercase only an exact match counts.
   */
  function fuzzytest(pattern, text) {
      let pindex = 0;
      for (let index = 0; index < text.length; index += 1) {
          const char = text[index];
          const search = pattern[pindex];
          if (char === search || char.toLowerCase() === search) {
              pindex += 1;
          }
      }
      return pindex === pattern.length;
  }
  /**
   * Wrap fuzzy matched characters.
   *
   * Wrap all occurences of characters of `pattern` (in order) in `string` in
   * <span> tags.
   */
  function fuzzywrap(pattern, text) {
      let pindex = 0;
      const result = [];
      for (let index = 0; index < text.length; index += 1) {
          const char = text[index];
          const search = pattern[pindex];
          if (char === search || char.toLowerCase() === search) {
              result.push(`<span>${char}</span>`);
              pindex += 1;
          }
          else {
              result.push(char);
          }
      }
      return result.join("");
  }

  // Minimal event handler
  class Events {
      constructor() {
          this.events = {};
      }
      on(event, callback) {
          this.events[event] = this.events[event] || [];
          this.events[event].push(callback);
      }
      once(event, callback) {
          const runOnce = (arg) => {
              this.remove(event, runOnce);
              callback(arg);
          };
          this.on(event, runOnce);
      }
      remove(event, callback) {
          if (!this.events[event].length)
              return;
          this.events[event] = this.events[event].filter(c => c !== callback);
      }
      trigger(event, arg) {
          if (!this.events[event]) {
              return;
          }
          this.events[event].forEach(callback => {
              callback(arg);
          });
      }
  }
  // This global event handler is used by separate parts of the UI to
  // communicate.
  const e = new Events();

  /*
   * Show a notification containing the given `msg` text and having class `cls`.
   * The notification is automatically removed after 5 seconds and on click
   * `callback` is called.
   *
   * @param {string} msg - The message to diplay
   * @param {string} cls - The message type.
   * @param {function} callback - The callback to execute on click..
   */
  function notify(msg, cls = "info", callback) {
      const notification = document.createElement("li");
      notification.classList.add(cls);
      notification.appendChild(document.createTextNode(msg));
      const notificationList = select("#notifications");
      if (!notificationList)
          throw new Error();
      notificationList.append(notification);
      notification.addEventListener("click", () => {
          notification.remove();
          if (callback) {
              callback();
          }
      });
      setTimeout(() => {
          notification.remove();
      }, 5000);
  }
  delegate(select("#notifications"), "click", "li", (event, closest) => {
      closest.remove();
  });

  // Sorting of tables and the journal.
  function parseNumber(num) {
      const cleaned = num.replace(/[^\-?0-9.]/g, "");
      const n = parseFloat(cleaned);
      return Number.isNaN(n) ? 0 : n;
  }
  function stringSorter(A, B) {
      const a = A.toLowerCase();
      const b = B.toLowerCase();
      if (a === b)
          return 0;
      if (a < b)
          return -1;
      return 1;
  }
  function numSorter(a, b) {
      return parseNumber(a) - parseNumber(b);
  }
  function getValue(el) {
      return el.getAttribute("data-sort-value") || el.textContent || el.innerText;
  }
  function sortElements(parent, elements, selector, order, type) {
      const sorter = type === "num" ? numSorter : stringSorter;
      function sortFunction(a, b) {
          return ((order === "asc" ? 1 : -1) *
              sorter(getValue(selector(a)), getValue(selector(b))));
      }
      const fragment = document.createDocumentFragment();
      elements.sort(sortFunction).forEach(el => {
          fragment.appendChild(el);
      });
      parent.appendChild(fragment);
  }
  function getSortOrder(headerElement) {
      if (!headerElement.getAttribute("data-order")) {
          return headerElement.getAttribute("data-sort-default") === "desc"
              ? "desc"
              : "asc";
      }
      return headerElement.getAttribute("data-order") === "asc" ? "desc" : "asc";
  }
  function sortableJournal(ol) {
      const head = select(".head", ol);
      if (!head)
          return;
      const headers = selectAll("span[data-sort]", head);
      head.addEventListener("click", event => {
          const header = event.target.closest("span");
          if (!header || !header.getAttribute("data-sort")) {
              return;
          }
          const order = getSortOrder(header);
          const type = header.getAttribute("data-sort");
          const headerClass = header.classList[0];
          // update sort order
          headers.forEach(el => {
              el.removeAttribute("data-order");
          });
          header.setAttribute("data-order", order);
          sortElements(ol, [].slice.call(ol.children, 1), function selector(li) {
              return li.querySelector(`.${headerClass}`);
          }, order, type);
      });
  }
  function sortableTable(table) {
      const head = table.tHead;
      const body = table.tBodies.item(0);
      if (!head || !body)
          return;
      const headers = selectAll("th[data-sort]", head);
      head.addEventListener("click", event => {
          const header = event.target.closest("th");
          if (!header || !header.getAttribute("data-sort")) {
              return;
          }
          const order = getSortOrder(header);
          const type = header.getAttribute("data-sort");
          const index = headers.indexOf(header);
          // update sort order
          headers.forEach(el => {
              el.removeAttribute("data-order");
          });
          header.setAttribute("data-order", order);
          sortElements(body, selectAll("tr", body), function selector(tr) {
              return tr.cells.item(index);
          }, order, type);
      });
  }
  function initSort() {
      selectAll("table.sortable").forEach(el => {
          sortableTable(el);
      });
      selectAll("ol.journal").forEach(el => {
          sortableJournal(el);
      });
  }
  e.on("page-loaded", () => {
      initSort();
  });

  // Routing
  class Router {
      constructor() {
          this.state = {
              hash: window.location.hash,
              pathname: window.location.pathname,
              search: window.location.search,
          };
      }
      // This should be called once when the page has been loaded. Initializes the
      // router and takes over clicking on links.
      init() {
          urlHash.set(window.location.hash.slice(1));
          this.updateState();
          window.addEventListener("popstate", () => {
              urlHash.set(window.location.hash.slice(1));
              if (window.location.hash !== this.state.hash &&
                  window.location.pathname === this.state.pathname &&
                  window.location.search === this.state.search) {
                  this.updateState();
              }
              else if (window.location.pathname !== this.state.pathname ||
                  window.location.search !== this.state.search) {
                  this.loadURL(window.location.href, false);
              }
          });
          this.takeOverLinks();
      }
      // Go to URL. If load is `true`, load the page at URL, otherwise only update
      // the current state.
      navigate(url, load = true) {
          if (load) {
              this.loadURL(url);
          }
          else {
              window.history.pushState(null, "", url);
              this.updateState();
          }
      }
      /*
       * Replace <article> contents with the page at `url`.
       *
       * If `historyState` is false, do not create a history state and do not
       * scroll to top.
       */
      async loadURL(url, historyState = true) {
          const state = { interrupt: false };
          e.trigger("navigate", state);
          if (state.interrupt) {
              return;
          }
          const getUrl = new URL(url);
          getUrl.searchParams.set("partial", "true");
          const svg = select(".fava-icon");
          if (svg)
              svg.classList.add("loading");
          try {
              const content = await fetch(getUrl.toString()).then(handleText);
              if (historyState) {
                  window.history.pushState(null, "", url);
                  window.scroll(0, 0);
              }
              this.updateState();
              const article = select("article");
              if (article)
                  article.innerHTML = content;
              e.trigger("page-loaded");
              urlHash.set(window.location.hash.slice(1));
          }
          catch (error) {
              notify(`Loading ${url} failed.`, "error");
          }
          finally {
              if (svg)
                  svg.classList.remove("loading");
          }
      }
      /*
       * Update the routers state object.
       *
       * The state object is used to distinguish between the user navigating the
       * browser history or the hash changing.
       */
      updateState() {
          this.state = {
              hash: window.location.hash,
              pathname: window.location.pathname,
              search: window.location.search,
          };
      }
      /*
       * Intercept all clicks on links (<a>) and .navigate() to the link instead.
       *
       * Doesn't intercept if
       *  - a button different from the main button is used,
       *  - a modifier key is pressed,
       *  - the link starts with a hash '#', or
       *  - the link has a `data-remote` attribute.
       */
      takeOverLinks() {
          delegate(document, "click", "a", (event, link) => {
              if ((link.getAttribute("href") || "").charAt(0) === "#" ||
                  link.host !== window.location.host ||
                  link.hasAttribute("data-remote") ||
                  link.protocol.indexOf("http") !== 0 ||
                  event.defaultPrevented) {
                  return;
              }
              // update sidebar links
              if (link.closest("aside")) {
                  const newURL = new URL(link.href);
                  const oldParams = new URL(window.location.href).searchParams;
                  for (const name of urlSyncedParams) {
                      const value = oldParams.get(name);
                      if (value) {
                          newURL.searchParams.set(name, value);
                      }
                      else {
                          newURL.searchParams.delete(name);
                      }
                  }
                  link.href = newURL.toString();
              }
              if (event.button !== 0 ||
                  event.altKey ||
                  event.ctrlKey ||
                  event.metaKey ||
                  event.shiftKey) {
                  return;
              }
              event.preventDefault();
              this.navigate(link.href);
          });
      }
      /*
       * Reload the page.
       */
      reload() {
          this.loadURL(window.location.href, false);
      }
  }
  const router = new Router();
  e.on("form-submit-query", (form) => {
      // @ts-ignore
      const queryString = form.elements.query_string.value.trim();
      if (queryString === "") {
          return;
      }
      const url = new URL(window.location.toString());
      url.searchParams.set("query_string", queryString);
      const pageURL = url.toString();
      url.searchParams.set("result_only", "true");
      fetch(url.toString())
          .then(handleText)
          .then((data) => {
          selectAll(".queryresults-wrapper").forEach(element => {
              element.classList.add("toggled");
          });
          select("#query-container").insertAdjacentHTML("afterbegin", data);
          initSort();
          window.history.replaceState(null, "", pageURL);
      });
  });
  e.on("page-init", () => {
      select("#reload-page").addEventListener("click", () => {
          router.reload();
      });
      const params = new URL(window.location.href).searchParams;
      filters.set({
          time: params.get("time") || "",
          filter: params.get("filter") || "",
          account: params.get("account") || "",
      });
      filters.subscribe(fs => {
          const newURL = new URL(window.location.href);
          for (const name of Object.keys(fs)) {
              const value = fs[name];
              if (value) {
                  newURL.searchParams.set(name, value);
              }
              else {
                  newURL.searchParams.delete(name);
              }
          }
          const url = newURL.toString();
          if (url !== window.location.href) {
              router.navigate(url);
          }
      });
      function syncStoreValueToUrl(store, name, defaultValue, shouldLoad) {
          let value;
          if (typeof defaultValue === "boolean") {
              // @ts-ignore
              value = params.get(name) !== "false" && defaultValue;
          }
          else {
              // @ts-ignore
              value = params.get(name) || defaultValue;
          }
          store.set(value);
          store.subscribe((val) => {
              const newURL = new URL(window.location.href);
              newURL.searchParams.set(name, val.toString());
              if (val === defaultValue) {
                  newURL.searchParams.delete(name);
              }
              const url = newURL.toString();
              if (url !== window.location.href) {
                  router.navigate(url, shouldLoad);
              }
          });
      }
      // Set initial values from URL and update URL on store changes
      syncStoreValueToUrl(interval, "interval", favaAPI.favaOptions.interval, true);
      syncStoreValueToUrl(conversion, "conversion", "at_cost", true);
      syncStoreValueToUrl(showCharts, "charts", true, false);
  });

  function count(node) {
    var sum = 0,
        children = node.children,
        i = children && children.length;
    if (!i) sum = 1;
    else while (--i >= 0) sum += children[i].value;
    node.value = sum;
  }

  function node_count() {
    return this.eachAfter(count);
  }

  function node_each(callback) {
    var node = this, current, next = [node], children, i, n;
    do {
      current = next.reverse(), next = [];
      while (node = current.pop()) {
        callback(node), children = node.children;
        if (children) for (i = 0, n = children.length; i < n; ++i) {
          next.push(children[i]);
        }
      }
    } while (next.length);
    return this;
  }

  function node_eachBefore(callback) {
    var node = this, nodes = [node], children, i;
    while (node = nodes.pop()) {
      callback(node), children = node.children;
      if (children) for (i = children.length - 1; i >= 0; --i) {
        nodes.push(children[i]);
      }
    }
    return this;
  }

  function node_eachAfter(callback) {
    var node = this, nodes = [node], next = [], children, i, n;
    while (node = nodes.pop()) {
      next.push(node), children = node.children;
      if (children) for (i = 0, n = children.length; i < n; ++i) {
        nodes.push(children[i]);
      }
    }
    while (node = next.pop()) {
      callback(node);
    }
    return this;
  }

  function node_sum(value) {
    return this.eachAfter(function(node) {
      var sum = +value(node.data) || 0,
          children = node.children,
          i = children && children.length;
      while (--i >= 0) sum += children[i].value;
      node.value = sum;
    });
  }

  function node_sort(compare) {
    return this.eachBefore(function(node) {
      if (node.children) {
        node.children.sort(compare);
      }
    });
  }

  function node_path(end) {
    var start = this,
        ancestor = leastCommonAncestor(start, end),
        nodes = [start];
    while (start !== ancestor) {
      start = start.parent;
      nodes.push(start);
    }
    var k = nodes.length;
    while (end !== ancestor) {
      nodes.splice(k, 0, end);
      end = end.parent;
    }
    return nodes;
  }

  function leastCommonAncestor(a, b) {
    if (a === b) return a;
    var aNodes = a.ancestors(),
        bNodes = b.ancestors(),
        c = null;
    a = aNodes.pop();
    b = bNodes.pop();
    while (a === b) {
      c = a;
      a = aNodes.pop();
      b = bNodes.pop();
    }
    return c;
  }

  function node_ancestors() {
    var node = this, nodes = [node];
    while (node = node.parent) {
      nodes.push(node);
    }
    return nodes;
  }

  function node_descendants() {
    var nodes = [];
    this.each(function(node) {
      nodes.push(node);
    });
    return nodes;
  }

  function node_leaves() {
    var leaves = [];
    this.eachBefore(function(node) {
      if (!node.children) {
        leaves.push(node);
      }
    });
    return leaves;
  }

  function node_links() {
    var root = this, links = [];
    root.each(function(node) {
      if (node !== root) { // Don’t include the root’s parent, if any.
        links.push({source: node.parent, target: node});
      }
    });
    return links;
  }

  function hierarchy(data, children) {
    var root = new Node$1(data),
        valued = +data.value && (root.value = data.value),
        node,
        nodes = [root],
        child,
        childs,
        i,
        n;

    if (children == null) children = defaultChildren;

    while (node = nodes.pop()) {
      if (valued) node.value = +node.data.value;
      if ((childs = children(node.data)) && (n = childs.length)) {
        node.children = new Array(n);
        for (i = n - 1; i >= 0; --i) {
          nodes.push(child = node.children[i] = new Node$1(childs[i]));
          child.parent = node;
          child.depth = node.depth + 1;
        }
      }
    }

    return root.eachBefore(computeHeight);
  }

  function node_copy() {
    return hierarchy(this).eachBefore(copyData);
  }

  function defaultChildren(d) {
    return d.children;
  }

  function copyData(node) {
    node.data = node.data.data;
  }

  function computeHeight(node) {
    var height = 0;
    do node.height = height;
    while ((node = node.parent) && (node.height < ++height));
  }

  function Node$1(data) {
    this.data = data;
    this.depth =
    this.height = 0;
    this.parent = null;
  }

  Node$1.prototype = hierarchy.prototype = {
    constructor: Node$1,
    count: node_count,
    each: node_each,
    eachAfter: node_eachAfter,
    eachBefore: node_eachBefore,
    sum: node_sum,
    sort: node_sort,
    path: node_path,
    ancestors: node_ancestors,
    descendants: node_descendants,
    leaves: node_leaves,
    links: node_links,
    copy: node_copy
  };

  function required(f) {
    if (typeof f !== "function") throw new Error;
    return f;
  }

  function constantZero() {
    return 0;
  }

  function constant$1(x) {
    return function() {
      return x;
    };
  }

  function roundNode(node) {
    node.x0 = Math.round(node.x0);
    node.y0 = Math.round(node.y0);
    node.x1 = Math.round(node.x1);
    node.y1 = Math.round(node.y1);
  }

  function treemapDice(parent, x0, y0, x1, y1) {
    var nodes = parent.children,
        node,
        i = -1,
        n = nodes.length,
        k = parent.value && (x1 - x0) / parent.value;

    while (++i < n) {
      node = nodes[i], node.y0 = y0, node.y1 = y1;
      node.x0 = x0, node.x1 = x0 += node.value * k;
    }
  }

  function partition() {
    var dx = 1,
        dy = 1,
        padding = 0,
        round = false;

    function partition(root) {
      var n = root.height + 1;
      root.x0 =
      root.y0 = padding;
      root.x1 = dx;
      root.y1 = dy / n;
      root.eachBefore(positionNode(dy, n));
      if (round) root.eachBefore(roundNode);
      return root;
    }

    function positionNode(dy, n) {
      return function(node) {
        if (node.children) {
          treemapDice(node, node.x0, dy * (node.depth + 1) / n, node.x1, dy * (node.depth + 2) / n);
        }
        var x0 = node.x0,
            y0 = node.y0,
            x1 = node.x1 - padding,
            y1 = node.y1 - padding;
        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
        node.x0 = x0;
        node.y0 = y0;
        node.x1 = x1;
        node.y1 = y1;
      };
    }

    partition.round = function(x) {
      return arguments.length ? (round = !!x, partition) : round;
    };

    partition.size = function(x) {
      return arguments.length ? (dx = +x[0], dy = +x[1], partition) : [dx, dy];
    };

    partition.padding = function(x) {
      return arguments.length ? (padding = +x, partition) : padding;
    };

    return partition;
  }

  function treemapSlice(parent, x0, y0, x1, y1) {
    var nodes = parent.children,
        node,
        i = -1,
        n = nodes.length,
        k = parent.value && (y1 - y0) / parent.value;

    while (++i < n) {
      node = nodes[i], node.x0 = x0, node.x1 = x1;
      node.y0 = y0, node.y1 = y0 += node.value * k;
    }
  }

  var phi = (1 + Math.sqrt(5)) / 2;

  function squarifyRatio(ratio, parent, x0, y0, x1, y1) {
    var rows = [],
        nodes = parent.children,
        row,
        nodeValue,
        i0 = 0,
        i1 = 0,
        n = nodes.length,
        dx, dy,
        value = parent.value,
        sumValue,
        minValue,
        maxValue,
        newRatio,
        minRatio,
        alpha,
        beta;

    while (i0 < n) {
      dx = x1 - x0, dy = y1 - y0;

      // Find the next non-empty node.
      do sumValue = nodes[i1++].value; while (!sumValue && i1 < n);
      minValue = maxValue = sumValue;
      alpha = Math.max(dy / dx, dx / dy) / (value * ratio);
      beta = sumValue * sumValue * alpha;
      minRatio = Math.max(maxValue / beta, beta / minValue);

      // Keep adding nodes while the aspect ratio maintains or improves.
      for (; i1 < n; ++i1) {
        sumValue += nodeValue = nodes[i1].value;
        if (nodeValue < minValue) minValue = nodeValue;
        if (nodeValue > maxValue) maxValue = nodeValue;
        beta = sumValue * sumValue * alpha;
        newRatio = Math.max(maxValue / beta, beta / minValue);
        if (newRatio > minRatio) { sumValue -= nodeValue; break; }
        minRatio = newRatio;
      }

      // Position and record the row orientation.
      rows.push(row = {value: sumValue, dice: dx < dy, children: nodes.slice(i0, i1)});
      if (row.dice) treemapDice(row, x0, y0, x1, value ? y0 += dy * sumValue / value : y1);
      else treemapSlice(row, x0, y0, value ? x0 += dx * sumValue / value : x1, y1);
      value -= sumValue, i0 = i1;
    }

    return rows;
  }

  var squarify = (function custom(ratio) {

    function squarify(parent, x0, y0, x1, y1) {
      squarifyRatio(ratio, parent, x0, y0, x1, y1);
    }

    squarify.ratio = function(x) {
      return custom((x = +x) > 1 ? x : 1);
    };

    return squarify;
  })(phi);

  function treemap() {
    var tile = squarify,
        round = false,
        dx = 1,
        dy = 1,
        paddingStack = [0],
        paddingInner = constantZero,
        paddingTop = constantZero,
        paddingRight = constantZero,
        paddingBottom = constantZero,
        paddingLeft = constantZero;

    function treemap(root) {
      root.x0 =
      root.y0 = 0;
      root.x1 = dx;
      root.y1 = dy;
      root.eachBefore(positionNode);
      paddingStack = [0];
      if (round) root.eachBefore(roundNode);
      return root;
    }

    function positionNode(node) {
      var p = paddingStack[node.depth],
          x0 = node.x0 + p,
          y0 = node.y0 + p,
          x1 = node.x1 - p,
          y1 = node.y1 - p;
      if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
      if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
      node.x0 = x0;
      node.y0 = y0;
      node.x1 = x1;
      node.y1 = y1;
      if (node.children) {
        p = paddingStack[node.depth + 1] = paddingInner(node) / 2;
        x0 += paddingLeft(node) - p;
        y0 += paddingTop(node) - p;
        x1 -= paddingRight(node) - p;
        y1 -= paddingBottom(node) - p;
        if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
        if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
        tile(node, x0, y0, x1, y1);
      }
    }

    treemap.round = function(x) {
      return arguments.length ? (round = !!x, treemap) : round;
    };

    treemap.size = function(x) {
      return arguments.length ? (dx = +x[0], dy = +x[1], treemap) : [dx, dy];
    };

    treemap.tile = function(x) {
      return arguments.length ? (tile = required(x), treemap) : tile;
    };

    treemap.padding = function(x) {
      return arguments.length ? treemap.paddingInner(x).paddingOuter(x) : treemap.paddingInner();
    };

    treemap.paddingInner = function(x) {
      return arguments.length ? (paddingInner = typeof x === "function" ? x : constant$1(+x), treemap) : paddingInner;
    };

    treemap.paddingOuter = function(x) {
      return arguments.length ? treemap.paddingTop(x).paddingRight(x).paddingBottom(x).paddingLeft(x) : treemap.paddingTop();
    };

    treemap.paddingTop = function(x) {
      return arguments.length ? (paddingTop = typeof x === "function" ? x : constant$1(+x), treemap) : paddingTop;
    };

    treemap.paddingRight = function(x) {
      return arguments.length ? (paddingRight = typeof x === "function" ? x : constant$1(+x), treemap) : paddingRight;
    };

    treemap.paddingBottom = function(x) {
      return arguments.length ? (paddingBottom = typeof x === "function" ? x : constant$1(+x), treemap) : paddingBottom;
    };

    treemap.paddingLeft = function(x) {
      return arguments.length ? (paddingLeft = typeof x === "function" ? x : constant$1(+x), treemap) : paddingLeft;
    };

    return treemap;
  }

  var xhtml = "http://www.w3.org/1999/xhtml";

  var namespaces = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: xhtml,
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };

  function namespace(name) {
    var prefix = name += "", i = prefix.indexOf(":");
    if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
    return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name;
  }

  function creatorInherit(name) {
    return function() {
      var document = this.ownerDocument,
          uri = this.namespaceURI;
      return uri === xhtml && document.documentElement.namespaceURI === xhtml
          ? document.createElement(name)
          : document.createElementNS(uri, name);
    };
  }

  function creatorFixed(fullname) {
    return function() {
      return this.ownerDocument.createElementNS(fullname.space, fullname.local);
    };
  }

  function creator(name) {
    var fullname = namespace(name);
    return (fullname.local
        ? creatorFixed
        : creatorInherit)(fullname);
  }

  function none() {}

  function selector(selector) {
    return selector == null ? none : function() {
      return this.querySelector(selector);
    };
  }

  function selection_select(select) {
    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function empty$1() {
    return [];
  }

  function selectorAll(selector) {
    return selector == null ? empty$1 : function() {
      return this.querySelectorAll(selector);
    };
  }

  function selection_selectAll(select) {
    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          subgroups.push(select.call(node, node.__data__, i, group));
          parents.push(node);
        }
      }
    }

    return new Selection(subgroups, parents);
  }

  function matcher(selector) {
    return function() {
      return this.matches(selector);
    };
  }

  function selection_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Selection(subgroups, this._parents);
  }

  function sparse(update) {
    return new Array(update.length);
  }

  function selection_enter() {
    return new Selection(this._enter || this._groups.map(sparse), this._parents);
  }

  function EnterNode(parent, datum) {
    this.ownerDocument = parent.ownerDocument;
    this.namespaceURI = parent.namespaceURI;
    this._next = null;
    this._parent = parent;
    this.__data__ = datum;
  }

  EnterNode.prototype = {
    constructor: EnterNode,
    appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
    insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
    querySelector: function(selector) { return this._parent.querySelector(selector); },
    querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
  };

  function constant$2(x) {
    return function() {
      return x;
    };
  }

  var keyPrefix = "$"; // Protect against keys like “__proto__”.

  function bindIndex(parent, group, enter, update, exit, data) {
    var i = 0,
        node,
        groupLength = group.length,
        dataLength = data.length;

    // Put any non-null nodes that fit into update.
    // Put any null nodes into enter.
    // Put any remaining data into enter.
    for (; i < dataLength; ++i) {
      if (node = group[i]) {
        node.__data__ = data[i];
        update[i] = node;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Put any non-null nodes that don’t fit into exit.
    for (; i < groupLength; ++i) {
      if (node = group[i]) {
        exit[i] = node;
      }
    }
  }

  function bindKey(parent, group, enter, update, exit, data, key) {
    var i,
        node,
        nodeByKeyValue = {},
        groupLength = group.length,
        dataLength = data.length,
        keyValues = new Array(groupLength),
        keyValue;

    // Compute the key for each node.
    // If multiple nodes have the same key, the duplicates are added to exit.
    for (i = 0; i < groupLength; ++i) {
      if (node = group[i]) {
        keyValues[i] = keyValue = keyPrefix + key.call(node, node.__data__, i, group);
        if (keyValue in nodeByKeyValue) {
          exit[i] = node;
        } else {
          nodeByKeyValue[keyValue] = node;
        }
      }
    }

    // Compute the key for each datum.
    // If there a node associated with this key, join and add it to update.
    // If there is not (or the key is a duplicate), add it to enter.
    for (i = 0; i < dataLength; ++i) {
      keyValue = keyPrefix + key.call(parent, data[i], i, data);
      if (node = nodeByKeyValue[keyValue]) {
        update[i] = node;
        node.__data__ = data[i];
        nodeByKeyValue[keyValue] = null;
      } else {
        enter[i] = new EnterNode(parent, data[i]);
      }
    }

    // Add any remaining nodes that were not bound to data to exit.
    for (i = 0; i < groupLength; ++i) {
      if ((node = group[i]) && (nodeByKeyValue[keyValues[i]] === node)) {
        exit[i] = node;
      }
    }
  }

  function selection_data(value, key) {
    if (!value) {
      data = new Array(this.size()), j = -1;
      this.each(function(d) { data[++j] = d; });
      return data;
    }

    var bind = key ? bindKey : bindIndex,
        parents = this._parents,
        groups = this._groups;

    if (typeof value !== "function") value = constant$2(value);

    for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
      var parent = parents[j],
          group = groups[j],
          groupLength = group.length,
          data = value.call(parent, parent && parent.__data__, j, parents),
          dataLength = data.length,
          enterGroup = enter[j] = new Array(dataLength),
          updateGroup = update[j] = new Array(dataLength),
          exitGroup = exit[j] = new Array(groupLength);

      bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

      // Now connect the enter nodes to their following update node, such that
      // appendChild can insert the materialized enter node before this node,
      // rather than at the end of the parent node.
      for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
        if (previous = enterGroup[i0]) {
          if (i0 >= i1) i1 = i0 + 1;
          while (!(next = updateGroup[i1]) && ++i1 < dataLength);
          previous._next = next || null;
        }
      }
    }

    update = new Selection(update, parents);
    update._enter = enter;
    update._exit = exit;
    return update;
  }

  function selection_exit() {
    return new Selection(this._exit || this._groups.map(sparse), this._parents);
  }

  function selection_join(onenter, onupdate, onexit) {
    var enter = this.enter(), update = this, exit = this.exit();
    enter = typeof onenter === "function" ? onenter(enter) : enter.append(onenter + "");
    if (onupdate != null) update = onupdate(update);
    if (onexit == null) exit.remove(); else onexit(exit);
    return enter && update ? enter.merge(update).order() : update;
  }

  function selection_merge(selection) {

    for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Selection(merges, this._parents);
  }

  function selection_order() {

    for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
      for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
        if (node = group[i]) {
          if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }

    return this;
  }

  function selection_sort(compare) {
    if (!compare) compare = ascending;

    function compareNode(a, b) {
      return a && b ? compare(a.__data__, b.__data__) : !a - !b;
    }

    for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          sortgroup[i] = node;
        }
      }
      sortgroup.sort(compareNode);
    }

    return new Selection(sortgroups, this._parents).order();
  }

  function ascending(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function selection_call() {
    var callback = arguments[0];
    arguments[0] = this;
    callback.apply(null, arguments);
    return this;
  }

  function selection_nodes() {
    var nodes = new Array(this.size()), i = -1;
    this.each(function() { nodes[++i] = this; });
    return nodes;
  }

  function selection_node() {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
        var node = group[i];
        if (node) return node;
      }
    }

    return null;
  }

  function selection_size() {
    var size = 0;
    this.each(function() { ++size; });
    return size;
  }

  function selection_empty() {
    return !this.node();
  }

  function selection_each(callback) {

    for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
        if (node = group[i]) callback.call(node, node.__data__, i, group);
      }
    }

    return this;
  }

  function attrRemove(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant(name, value) {
    return function() {
      this.setAttribute(name, value);
    };
  }

  function attrConstantNS(fullname, value) {
    return function() {
      this.setAttributeNS(fullname.space, fullname.local, value);
    };
  }

  function attrFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttribute(name);
      else this.setAttribute(name, v);
    };
  }

  function attrFunctionNS(fullname, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
      else this.setAttributeNS(fullname.space, fullname.local, v);
    };
  }

  function selection_attr(name, value) {
    var fullname = namespace(name);

    if (arguments.length < 2) {
      var node = this.node();
      return fullname.local
          ? node.getAttributeNS(fullname.space, fullname.local)
          : node.getAttribute(fullname);
    }

    return this.each((value == null
        ? (fullname.local ? attrRemoveNS : attrRemove) : (typeof value === "function"
        ? (fullname.local ? attrFunctionNS : attrFunction)
        : (fullname.local ? attrConstantNS : attrConstant)))(fullname, value));
  }

  function defaultView(node) {
    return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
        || (node.document && node) // node is a Window
        || node.defaultView; // node is a Document
  }

  function styleRemove(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant(name, value, priority) {
    return function() {
      this.style.setProperty(name, value, priority);
    };
  }

  function styleFunction(name, value, priority) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) this.style.removeProperty(name);
      else this.style.setProperty(name, v, priority);
    };
  }

  function selection_style(name, value, priority) {
    return arguments.length > 1
        ? this.each((value == null
              ? styleRemove : typeof value === "function"
              ? styleFunction
              : styleConstant)(name, value, priority == null ? "" : priority))
        : styleValue(this.node(), name);
  }

  function styleValue(node, name) {
    return node.style.getPropertyValue(name)
        || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
  }

  function propertyRemove(name) {
    return function() {
      delete this[name];
    };
  }

  function propertyConstant(name, value) {
    return function() {
      this[name] = value;
    };
  }

  function propertyFunction(name, value) {
    return function() {
      var v = value.apply(this, arguments);
      if (v == null) delete this[name];
      else this[name] = v;
    };
  }

  function selection_property(name, value) {
    return arguments.length > 1
        ? this.each((value == null
            ? propertyRemove : typeof value === "function"
            ? propertyFunction
            : propertyConstant)(name, value))
        : this.node()[name];
  }

  function classArray(string) {
    return string.trim().split(/^|\s+/);
  }

  function classList(node) {
    return node.classList || new ClassList(node);
  }

  function ClassList(node) {
    this._node = node;
    this._names = classArray(node.getAttribute("class") || "");
  }

  ClassList.prototype = {
    add: function(name) {
      var i = this._names.indexOf(name);
      if (i < 0) {
        this._names.push(name);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    remove: function(name) {
      var i = this._names.indexOf(name);
      if (i >= 0) {
        this._names.splice(i, 1);
        this._node.setAttribute("class", this._names.join(" "));
      }
    },
    contains: function(name) {
      return this._names.indexOf(name) >= 0;
    }
  };

  function classedAdd(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.add(names[i]);
  }

  function classedRemove(node, names) {
    var list = classList(node), i = -1, n = names.length;
    while (++i < n) list.remove(names[i]);
  }

  function classedTrue(names) {
    return function() {
      classedAdd(this, names);
    };
  }

  function classedFalse(names) {
    return function() {
      classedRemove(this, names);
    };
  }

  function classedFunction(names, value) {
    return function() {
      (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
    };
  }

  function selection_classed(name, value) {
    var names = classArray(name + "");

    if (arguments.length < 2) {
      var list = classList(this.node()), i = -1, n = names.length;
      while (++i < n) if (!list.contains(names[i])) return false;
      return true;
    }

    return this.each((typeof value === "function"
        ? classedFunction : value
        ? classedTrue
        : classedFalse)(names, value));
  }

  function textRemove() {
    this.textContent = "";
  }

  function textConstant(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    };
  }

  function selection_text(value) {
    return arguments.length
        ? this.each(value == null
            ? textRemove : (typeof value === "function"
            ? textFunction
            : textConstant)(value))
        : this.node().textContent;
  }

  function htmlRemove() {
    this.innerHTML = "";
  }

  function htmlConstant(value) {
    return function() {
      this.innerHTML = value;
    };
  }

  function htmlFunction(value) {
    return function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    };
  }

  function selection_html(value) {
    return arguments.length
        ? this.each(value == null
            ? htmlRemove : (typeof value === "function"
            ? htmlFunction
            : htmlConstant)(value))
        : this.node().innerHTML;
  }

  function raise() {
    if (this.nextSibling) this.parentNode.appendChild(this);
  }

  function selection_raise() {
    return this.each(raise);
  }

  function lower() {
    if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
  }

  function selection_lower() {
    return this.each(lower);
  }

  function selection_append(name) {
    var create = typeof name === "function" ? name : creator(name);
    return this.select(function() {
      return this.appendChild(create.apply(this, arguments));
    });
  }

  function constantNull() {
    return null;
  }

  function selection_insert(name, before) {
    var create = typeof name === "function" ? name : creator(name),
        select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
    return this.select(function() {
      return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
    });
  }

  function remove() {
    var parent = this.parentNode;
    if (parent) parent.removeChild(this);
  }

  function selection_remove() {
    return this.each(remove);
  }

  function selection_cloneShallow() {
    return this.parentNode.insertBefore(this.cloneNode(false), this.nextSibling);
  }

  function selection_cloneDeep() {
    return this.parentNode.insertBefore(this.cloneNode(true), this.nextSibling);
  }

  function selection_clone(deep) {
    return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
  }

  function selection_datum(value) {
    return arguments.length
        ? this.property("__data__", value)
        : this.node().__data__;
  }

  var filterEvents = {};

  var event = null;

  if (typeof document !== "undefined") {
    var element$1 = document.documentElement;
    if (!("onmouseenter" in element$1)) {
      filterEvents = {mouseenter: "mouseover", mouseleave: "mouseout"};
    }
  }

  function filterContextListener(listener, index, group) {
    listener = contextListener(listener, index, group);
    return function(event) {
      var related = event.relatedTarget;
      if (!related || (related !== this && !(related.compareDocumentPosition(this) & 8))) {
        listener.call(this, event);
      }
    };
  }

  function contextListener(listener, index, group) {
    return function(event1) {
      var event0 = event; // Events can be reentrant (e.g., focus).
      event = event1;
      try {
        listener.call(this, this.__data__, index, group);
      } finally {
        event = event0;
      }
    };
  }

  function parseTypenames(typenames) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      return {type: t, name: name};
    });
  }

  function onRemove(typename) {
    return function() {
      var on = this.__on;
      if (!on) return;
      for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
        if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
        } else {
          on[++i] = o;
        }
      }
      if (++i) on.length = i;
      else delete this.__on;
    };
  }

  function onAdd(typename, value, capture) {
    var wrap = filterEvents.hasOwnProperty(typename.type) ? filterContextListener : contextListener;
    return function(d, i, group) {
      var on = this.__on, o, listener = wrap(value, i, group);
      if (on) for (var j = 0, m = on.length; j < m; ++j) {
        if ((o = on[j]).type === typename.type && o.name === typename.name) {
          this.removeEventListener(o.type, o.listener, o.capture);
          this.addEventListener(o.type, o.listener = listener, o.capture = capture);
          o.value = value;
          return;
        }
      }
      this.addEventListener(typename.type, listener, capture);
      o = {type: typename.type, name: typename.name, value: value, listener: listener, capture: capture};
      if (!on) this.__on = [o];
      else on.push(o);
    };
  }

  function selection_on(typename, value, capture) {
    var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

    if (arguments.length < 2) {
      var on = this.node().__on;
      if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
        for (i = 0, o = on[j]; i < n; ++i) {
          if ((t = typenames[i]).type === o.type && t.name === o.name) {
            return o.value;
          }
        }
      }
      return;
    }

    on = value ? onAdd : onRemove;
    if (capture == null) capture = false;
    for (i = 0; i < n; ++i) this.each(on(typenames[i], value, capture));
    return this;
  }

  function dispatchEvent(node, type, params) {
    var window = defaultView(node),
        event = window.CustomEvent;

    if (typeof event === "function") {
      event = new event(type, params);
    } else {
      event = window.document.createEvent("Event");
      if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
      else event.initEvent(type, false, false);
    }

    node.dispatchEvent(event);
  }

  function dispatchConstant(type, params) {
    return function() {
      return dispatchEvent(this, type, params);
    };
  }

  function dispatchFunction(type, params) {
    return function() {
      return dispatchEvent(this, type, params.apply(this, arguments));
    };
  }

  function selection_dispatch(type, params) {
    return this.each((typeof params === "function"
        ? dispatchFunction
        : dispatchConstant)(type, params));
  }

  var root = [null];

  function Selection(groups, parents) {
    this._groups = groups;
    this._parents = parents;
  }

  function selection() {
    return new Selection([[document.documentElement]], root);
  }

  Selection.prototype = selection.prototype = {
    constructor: Selection,
    select: selection_select,
    selectAll: selection_selectAll,
    filter: selection_filter,
    data: selection_data,
    enter: selection_enter,
    exit: selection_exit,
    join: selection_join,
    merge: selection_merge,
    order: selection_order,
    sort: selection_sort,
    call: selection_call,
    nodes: selection_nodes,
    node: selection_node,
    size: selection_size,
    empty: selection_empty,
    each: selection_each,
    attr: selection_attr,
    style: selection_style,
    property: selection_property,
    classed: selection_classed,
    text: selection_text,
    html: selection_html,
    raise: selection_raise,
    lower: selection_lower,
    append: selection_append,
    insert: selection_insert,
    remove: selection_remove,
    clone: selection_clone,
    datum: selection_datum,
    on: selection_on,
    dispatch: selection_dispatch
  };

  function select$1(selector) {
    return typeof selector === "string"
        ? new Selection([[document.querySelector(selector)]], [document.documentElement])
        : new Selection([[selector]], root);
  }

  function clientPoint(node, event) {
    var svg = node.ownerSVGElement || node;

    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }

    var rect = node.getBoundingClientRect();
    return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
  }

  var noop$1 = {value: function() {}};

  function dispatch() {
    for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
      if (!(t = arguments[i] + "") || (t in _)) throw new Error("illegal type: " + t);
      _[t] = [];
    }
    return new Dispatch(_);
  }

  function Dispatch(_) {
    this._ = _;
  }

  function parseTypenames$1(typenames, types) {
    return typenames.trim().split(/^|\s+/).map(function(t) {
      var name = "", i = t.indexOf(".");
      if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
      if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
      return {type: t, name: name};
    });
  }

  Dispatch.prototype = dispatch.prototype = {
    constructor: Dispatch,
    on: function(typename, callback) {
      var _ = this._,
          T = parseTypenames$1(typename + "", _),
          t,
          i = -1,
          n = T.length;

      // If no callback was specified, return the callback of the given type and name.
      if (arguments.length < 2) {
        while (++i < n) if ((t = (typename = T[i]).type) && (t = get(_[t], typename.name))) return t;
        return;
      }

      // If a type was specified, set the callback for the given type and name.
      // Otherwise, if a null callback was specified, remove callbacks of the given name.
      if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
      while (++i < n) {
        if (t = (typename = T[i]).type) _[t] = set(_[t], typename.name, callback);
        else if (callback == null) for (t in _) _[t] = set(_[t], typename.name, null);
      }

      return this;
    },
    copy: function() {
      var copy = {}, _ = this._;
      for (var t in _) copy[t] = _[t].slice();
      return new Dispatch(copy);
    },
    call: function(type, that) {
      if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    },
    apply: function(type, that, args) {
      if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
      for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
    }
  };

  function get(type, name) {
    for (var i = 0, n = type.length, c; i < n; ++i) {
      if ((c = type[i]).name === name) {
        return c.value;
      }
    }
  }

  function set(type, name, callback) {
    for (var i = 0, n = type.length; i < n; ++i) {
      if (type[i].name === name) {
        type[i] = noop$1, type = type.slice(0, i).concat(type.slice(i + 1));
        break;
      }
    }
    if (callback != null) type.push({name: name, value: callback});
    return type;
  }

  var frame = 0, // is an animation frame pending?
      timeout = 0, // is a timeout pending?
      interval$1 = 0, // are any timers active?
      pokeDelay = 1000, // how frequently we check for clock skew
      taskHead,
      taskTail,
      clockLast = 0,
      clockNow = 0,
      clockSkew = 0,
      clock = typeof performance === "object" && performance.now ? performance : Date,
      setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

  function now() {
    return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
  }

  function clearNow() {
    clockNow = 0;
  }

  function Timer() {
    this._call =
    this._time =
    this._next = null;
  }

  Timer.prototype = timer.prototype = {
    constructor: Timer,
    restart: function(callback, delay, time) {
      if (typeof callback !== "function") throw new TypeError("callback is not a function");
      time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
      if (!this._next && taskTail !== this) {
        if (taskTail) taskTail._next = this;
        else taskHead = this;
        taskTail = this;
      }
      this._call = callback;
      this._time = time;
      sleep();
    },
    stop: function() {
      if (this._call) {
        this._call = null;
        this._time = Infinity;
        sleep();
      }
    }
  };

  function timer(callback, delay, time) {
    var t = new Timer;
    t.restart(callback, delay, time);
    return t;
  }

  function timerFlush() {
    now(); // Get the current time, if not already set.
    ++frame; // Pretend we’ve set an alarm, if we haven’t already.
    var t = taskHead, e;
    while (t) {
      if ((e = clockNow - t._time) >= 0) t._call.call(null, e);
      t = t._next;
    }
    --frame;
  }

  function wake() {
    clockNow = (clockLast = clock.now()) + clockSkew;
    frame = timeout = 0;
    try {
      timerFlush();
    } finally {
      frame = 0;
      nap();
      clockNow = 0;
    }
  }

  function poke() {
    var now = clock.now(), delay = now - clockLast;
    if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
  }

  function nap() {
    var t0, t1 = taskHead, t2, time = Infinity;
    while (t1) {
      if (t1._call) {
        if (time > t1._time) time = t1._time;
        t0 = t1, t1 = t1._next;
      } else {
        t2 = t1._next, t1._next = null;
        t1 = t0 ? t0._next = t2 : taskHead = t2;
      }
    }
    taskTail = t0;
    sleep(time);
  }

  function sleep(time) {
    if (frame) return; // Soonest alarm already set, or will be.
    if (timeout) timeout = clearTimeout(timeout);
    var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
    if (delay > 24) {
      if (time < Infinity) timeout = setTimeout(wake, time - clock.now() - clockSkew);
      if (interval$1) interval$1 = clearInterval(interval$1);
    } else {
      if (!interval$1) clockLast = clock.now(), interval$1 = setInterval(poke, pokeDelay);
      frame = 1, setFrame(wake);
    }
  }

  function timeout$1(callback, delay, time) {
    var t = new Timer;
    delay = delay == null ? 0 : +delay;
    t.restart(function(elapsed) {
      t.stop();
      callback(elapsed + delay);
    }, delay, time);
    return t;
  }

  var emptyOn = dispatch("start", "end", "cancel", "interrupt");
  var emptyTween = [];

  var CREATED = 0;
  var SCHEDULED = 1;
  var STARTING = 2;
  var STARTED = 3;
  var RUNNING = 4;
  var ENDING = 5;
  var ENDED = 6;

  function schedule(node, name, id, index, group, timing) {
    var schedules = node.__transition;
    if (!schedules) node.__transition = {};
    else if (id in schedules) return;
    create(node, id, {
      name: name,
      index: index, // For context during callback.
      group: group, // For context during callback.
      on: emptyOn,
      tween: emptyTween,
      time: timing.time,
      delay: timing.delay,
      duration: timing.duration,
      ease: timing.ease,
      timer: null,
      state: CREATED
    });
  }

  function init$1(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > CREATED) throw new Error("too late; already scheduled");
    return schedule;
  }

  function set$1(node, id) {
    var schedule = get$1(node, id);
    if (schedule.state > STARTED) throw new Error("too late; already running");
    return schedule;
  }

  function get$1(node, id) {
    var schedule = node.__transition;
    if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
    return schedule;
  }

  function create(node, id, self) {
    var schedules = node.__transition,
        tween;

    // Initialize the self timer when the transition is created.
    // Note the actual delay is not known until the first callback!
    schedules[id] = self;
    self.timer = timer(schedule, 0, self.time);

    function schedule(elapsed) {
      self.state = SCHEDULED;
      self.timer.restart(start, self.delay, self.time);

      // If the elapsed delay is less than our first sleep, start immediately.
      if (self.delay <= elapsed) start(elapsed - self.delay);
    }

    function start(elapsed) {
      var i, j, n, o;

      // If the state is not SCHEDULED, then we previously errored on start.
      if (self.state !== SCHEDULED) return stop();

      for (i in schedules) {
        o = schedules[i];
        if (o.name !== self.name) continue;

        // While this element already has a starting transition during this frame,
        // defer starting an interrupting transition until that transition has a
        // chance to tick (and possibly end); see d3/d3-transition#54!
        if (o.state === STARTED) return timeout$1(start);

        // Interrupt the active transition, if any.
        if (o.state === RUNNING) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("interrupt", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }

        // Cancel any pre-empted transitions.
        else if (+i < id) {
          o.state = ENDED;
          o.timer.stop();
          o.on.call("cancel", node, node.__data__, o.index, o.group);
          delete schedules[i];
        }
      }

      // Defer the first tick to end of the current frame; see d3/d3#1576.
      // Note the transition may be canceled after start and before the first tick!
      // Note this must be scheduled before the start event; see d3/d3-transition#16!
      // Assuming this is successful, subsequent callbacks go straight to tick.
      timeout$1(function() {
        if (self.state === STARTED) {
          self.state = RUNNING;
          self.timer.restart(tick, self.delay, self.time);
          tick(elapsed);
        }
      });

      // Dispatch the start event.
      // Note this must be done before the tween are initialized.
      self.state = STARTING;
      self.on.call("start", node, node.__data__, self.index, self.group);
      if (self.state !== STARTING) return; // interrupted
      self.state = STARTED;

      // Initialize the tween, deleting null tween.
      tween = new Array(n = self.tween.length);
      for (i = 0, j = -1; i < n; ++i) {
        if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
          tween[++j] = o;
        }
      }
      tween.length = j + 1;
    }

    function tick(elapsed) {
      var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
          i = -1,
          n = tween.length;

      while (++i < n) {
        tween[i].call(node, t);
      }

      // Dispatch the end event.
      if (self.state === ENDING) {
        self.on.call("end", node, node.__data__, self.index, self.group);
        stop();
      }
    }

    function stop() {
      self.state = ENDED;
      self.timer.stop();
      delete schedules[id];
      for (var i in schedules) return; // eslint-disable-line no-unused-vars
      delete node.__transition;
    }
  }

  function interrupt(node, name) {
    var schedules = node.__transition,
        schedule,
        active,
        empty = true,
        i;

    if (!schedules) return;

    name = name == null ? null : name + "";

    for (i in schedules) {
      if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
      active = schedule.state > STARTING && schedule.state < ENDING;
      schedule.state = ENDED;
      schedule.timer.stop();
      schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
      delete schedules[i];
    }

    if (empty) delete node.__transition;
  }

  function selection_interrupt(name) {
    return this.each(function() {
      interrupt(this, name);
    });
  }

  function define(constructor, factory, prototype) {
    constructor.prototype = factory.prototype = prototype;
    prototype.constructor = constructor;
  }

  function extend(parent, definition) {
    var prototype = Object.create(parent.prototype);
    for (var key in definition) prototype[key] = definition[key];
    return prototype;
  }

  function Color() {}

  var darker = 0.7;
  var brighter = 1 / darker;

  var reI = "\\s*([+-]?\\d+)\\s*",
      reN = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)\\s*",
      reP = "\\s*([+-]?\\d*\\.?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
      reHex3 = /^#([0-9a-f]{3})$/,
      reHex6 = /^#([0-9a-f]{6})$/,
      reRgbInteger = new RegExp("^rgb\\(" + [reI, reI, reI] + "\\)$"),
      reRgbPercent = new RegExp("^rgb\\(" + [reP, reP, reP] + "\\)$"),
      reRgbaInteger = new RegExp("^rgba\\(" + [reI, reI, reI, reN] + "\\)$"),
      reRgbaPercent = new RegExp("^rgba\\(" + [reP, reP, reP, reN] + "\\)$"),
      reHslPercent = new RegExp("^hsl\\(" + [reN, reP, reP] + "\\)$"),
      reHslaPercent = new RegExp("^hsla\\(" + [reN, reP, reP, reN] + "\\)$");

  var named = {
    aliceblue: 0xf0f8ff,
    antiquewhite: 0xfaebd7,
    aqua: 0x00ffff,
    aquamarine: 0x7fffd4,
    azure: 0xf0ffff,
    beige: 0xf5f5dc,
    bisque: 0xffe4c4,
    black: 0x000000,
    blanchedalmond: 0xffebcd,
    blue: 0x0000ff,
    blueviolet: 0x8a2be2,
    brown: 0xa52a2a,
    burlywood: 0xdeb887,
    cadetblue: 0x5f9ea0,
    chartreuse: 0x7fff00,
    chocolate: 0xd2691e,
    coral: 0xff7f50,
    cornflowerblue: 0x6495ed,
    cornsilk: 0xfff8dc,
    crimson: 0xdc143c,
    cyan: 0x00ffff,
    darkblue: 0x00008b,
    darkcyan: 0x008b8b,
    darkgoldenrod: 0xb8860b,
    darkgray: 0xa9a9a9,
    darkgreen: 0x006400,
    darkgrey: 0xa9a9a9,
    darkkhaki: 0xbdb76b,
    darkmagenta: 0x8b008b,
    darkolivegreen: 0x556b2f,
    darkorange: 0xff8c00,
    darkorchid: 0x9932cc,
    darkred: 0x8b0000,
    darksalmon: 0xe9967a,
    darkseagreen: 0x8fbc8f,
    darkslateblue: 0x483d8b,
    darkslategray: 0x2f4f4f,
    darkslategrey: 0x2f4f4f,
    darkturquoise: 0x00ced1,
    darkviolet: 0x9400d3,
    deeppink: 0xff1493,
    deepskyblue: 0x00bfff,
    dimgray: 0x696969,
    dimgrey: 0x696969,
    dodgerblue: 0x1e90ff,
    firebrick: 0xb22222,
    floralwhite: 0xfffaf0,
    forestgreen: 0x228b22,
    fuchsia: 0xff00ff,
    gainsboro: 0xdcdcdc,
    ghostwhite: 0xf8f8ff,
    gold: 0xffd700,
    goldenrod: 0xdaa520,
    gray: 0x808080,
    green: 0x008000,
    greenyellow: 0xadff2f,
    grey: 0x808080,
    honeydew: 0xf0fff0,
    hotpink: 0xff69b4,
    indianred: 0xcd5c5c,
    indigo: 0x4b0082,
    ivory: 0xfffff0,
    khaki: 0xf0e68c,
    lavender: 0xe6e6fa,
    lavenderblush: 0xfff0f5,
    lawngreen: 0x7cfc00,
    lemonchiffon: 0xfffacd,
    lightblue: 0xadd8e6,
    lightcoral: 0xf08080,
    lightcyan: 0xe0ffff,
    lightgoldenrodyellow: 0xfafad2,
    lightgray: 0xd3d3d3,
    lightgreen: 0x90ee90,
    lightgrey: 0xd3d3d3,
    lightpink: 0xffb6c1,
    lightsalmon: 0xffa07a,
    lightseagreen: 0x20b2aa,
    lightskyblue: 0x87cefa,
    lightslategray: 0x778899,
    lightslategrey: 0x778899,
    lightsteelblue: 0xb0c4de,
    lightyellow: 0xffffe0,
    lime: 0x00ff00,
    limegreen: 0x32cd32,
    linen: 0xfaf0e6,
    magenta: 0xff00ff,
    maroon: 0x800000,
    mediumaquamarine: 0x66cdaa,
    mediumblue: 0x0000cd,
    mediumorchid: 0xba55d3,
    mediumpurple: 0x9370db,
    mediumseagreen: 0x3cb371,
    mediumslateblue: 0x7b68ee,
    mediumspringgreen: 0x00fa9a,
    mediumturquoise: 0x48d1cc,
    mediumvioletred: 0xc71585,
    midnightblue: 0x191970,
    mintcream: 0xf5fffa,
    mistyrose: 0xffe4e1,
    moccasin: 0xffe4b5,
    navajowhite: 0xffdead,
    navy: 0x000080,
    oldlace: 0xfdf5e6,
    olive: 0x808000,
    olivedrab: 0x6b8e23,
    orange: 0xffa500,
    orangered: 0xff4500,
    orchid: 0xda70d6,
    palegoldenrod: 0xeee8aa,
    palegreen: 0x98fb98,
    paleturquoise: 0xafeeee,
    palevioletred: 0xdb7093,
    papayawhip: 0xffefd5,
    peachpuff: 0xffdab9,
    peru: 0xcd853f,
    pink: 0xffc0cb,
    plum: 0xdda0dd,
    powderblue: 0xb0e0e6,
    purple: 0x800080,
    rebeccapurple: 0x663399,
    red: 0xff0000,
    rosybrown: 0xbc8f8f,
    royalblue: 0x4169e1,
    saddlebrown: 0x8b4513,
    salmon: 0xfa8072,
    sandybrown: 0xf4a460,
    seagreen: 0x2e8b57,
    seashell: 0xfff5ee,
    sienna: 0xa0522d,
    silver: 0xc0c0c0,
    skyblue: 0x87ceeb,
    slateblue: 0x6a5acd,
    slategray: 0x708090,
    slategrey: 0x708090,
    snow: 0xfffafa,
    springgreen: 0x00ff7f,
    steelblue: 0x4682b4,
    tan: 0xd2b48c,
    teal: 0x008080,
    thistle: 0xd8bfd8,
    tomato: 0xff6347,
    turquoise: 0x40e0d0,
    violet: 0xee82ee,
    wheat: 0xf5deb3,
    white: 0xffffff,
    whitesmoke: 0xf5f5f5,
    yellow: 0xffff00,
    yellowgreen: 0x9acd32
  };

  define(Color, color, {
    copy: function(channels) {
      return Object.assign(new this.constructor, this, channels);
    },
    displayable: function() {
      return this.rgb().displayable();
    },
    hex: color_formatHex, // Deprecated! Use color.formatHex.
    formatHex: color_formatHex,
    formatHsl: color_formatHsl,
    formatRgb: color_formatRgb,
    toString: color_formatRgb
  });

  function color_formatHex() {
    return this.rgb().formatHex();
  }

  function color_formatHsl() {
    return hslConvert(this).formatHsl();
  }

  function color_formatRgb() {
    return this.rgb().formatRgb();
  }

  function color(format) {
    var m;
    format = (format + "").trim().toLowerCase();
    return (m = reHex3.exec(format)) ? (m = parseInt(m[1], 16), new Rgb((m >> 8 & 0xf) | (m >> 4 & 0x0f0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1)) // #f00
        : (m = reHex6.exec(format)) ? rgbn(parseInt(m[1], 16)) // #ff0000
        : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
        : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
        : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
        : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
        : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
        : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
        : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
        : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
        : null;
  }

  function rgbn(n) {
    return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
  }

  function rgba(r, g, b, a) {
    if (a <= 0) r = g = b = NaN;
    return new Rgb(r, g, b, a);
  }

  function rgbConvert(o) {
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Rgb;
    o = o.rgb();
    return new Rgb(o.r, o.g, o.b, o.opacity);
  }

  function rgb(r, g, b, opacity) {
    return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
  }

  function Rgb(r, g, b, opacity) {
    this.r = +r;
    this.g = +g;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Rgb, rgb, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
    },
    rgb: function() {
      return this;
    },
    displayable: function() {
      return (-0.5 <= this.r && this.r < 255.5)
          && (-0.5 <= this.g && this.g < 255.5)
          && (-0.5 <= this.b && this.b < 255.5)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    hex: rgb_formatHex, // Deprecated! Use color.formatHex.
    formatHex: rgb_formatHex,
    formatRgb: rgb_formatRgb,
    toString: rgb_formatRgb
  }));

  function rgb_formatHex() {
    return "#" + hex(this.r) + hex(this.g) + hex(this.b);
  }

  function rgb_formatRgb() {
    var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
    return (a === 1 ? "rgb(" : "rgba(")
        + Math.max(0, Math.min(255, Math.round(this.r) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.g) || 0)) + ", "
        + Math.max(0, Math.min(255, Math.round(this.b) || 0))
        + (a === 1 ? ")" : ", " + a + ")");
  }

  function hex(value) {
    value = Math.max(0, Math.min(255, Math.round(value) || 0));
    return (value < 16 ? "0" : "") + value.toString(16);
  }

  function hsla(h, s, l, a) {
    if (a <= 0) h = s = l = NaN;
    else if (l <= 0 || l >= 1) h = s = NaN;
    else if (s <= 0) h = NaN;
    return new Hsl(h, s, l, a);
  }

  function hslConvert(o) {
    if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Color)) o = color(o);
    if (!o) return new Hsl;
    if (o instanceof Hsl) return o;
    o = o.rgb();
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        min = Math.min(r, g, b),
        max = Math.max(r, g, b),
        h = NaN,
        s = max - min,
        l = (max + min) / 2;
    if (s) {
      if (r === max) h = (g - b) / s + (g < b) * 6;
      else if (g === max) h = (b - r) / s + 2;
      else h = (r - g) / s + 4;
      s /= l < 0.5 ? max + min : 2 - max - min;
      h *= 60;
    } else {
      s = l > 0 && l < 1 ? 0 : h;
    }
    return new Hsl(h, s, l, o.opacity);
  }

  function hsl(h, s, l, opacity) {
    return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
  }

  function Hsl(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Hsl, hsl, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Hsl(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = this.h % 360 + (this.h < 0) * 360,
          s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
          l = this.l,
          m2 = l + (l < 0.5 ? l : 1 - l) * s,
          m1 = 2 * l - m2;
      return new Rgb(
        hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
        hsl2rgb(h, m1, m2),
        hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
        this.opacity
      );
    },
    displayable: function() {
      return (0 <= this.s && this.s <= 1 || isNaN(this.s))
          && (0 <= this.l && this.l <= 1)
          && (0 <= this.opacity && this.opacity <= 1);
    },
    formatHsl: function() {
      var a = this.opacity; a = isNaN(a) ? 1 : Math.max(0, Math.min(1, a));
      return (a === 1 ? "hsl(" : "hsla(")
          + (this.h || 0) + ", "
          + (this.s || 0) * 100 + "%, "
          + (this.l || 0) * 100 + "%"
          + (a === 1 ? ")" : ", " + a + ")");
    }
  }));

  /* From FvD 13.37, CSS Color Module Level 3 */
  function hsl2rgb(h, m1, m2) {
    return (h < 60 ? m1 + (m2 - m1) * h / 60
        : h < 180 ? m2
        : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
        : m1) * 255;
  }

  var deg2rad = Math.PI / 180;
  var rad2deg = 180 / Math.PI;

  // https://observablehq.com/@mbostock/lab-and-rgb
  var K = 18,
      Xn = 0.96422,
      Yn = 1,
      Zn = 0.82521,
      t0 = 4 / 29,
      t1 = 6 / 29,
      t2 = 3 * t1 * t1,
      t3 = t1 * t1 * t1;

  function labConvert(o) {
    if (o instanceof Lab) return new Lab(o.l, o.a, o.b, o.opacity);
    if (o instanceof Hcl) return hcl2lab(o);
    if (!(o instanceof Rgb)) o = rgbConvert(o);
    var r = rgb2lrgb(o.r),
        g = rgb2lrgb(o.g),
        b = rgb2lrgb(o.b),
        y = xyz2lab((0.2225045 * r + 0.7168786 * g + 0.0606169 * b) / Yn), x, z;
    if (r === g && g === b) x = z = y; else {
      x = xyz2lab((0.4360747 * r + 0.3850649 * g + 0.1430804 * b) / Xn);
      z = xyz2lab((0.0139322 * r + 0.0971045 * g + 0.7141733 * b) / Zn);
    }
    return new Lab(116 * y - 16, 500 * (x - y), 200 * (y - z), o.opacity);
  }

  function lab(l, a, b, opacity) {
    return arguments.length === 1 ? labConvert(l) : new Lab(l, a, b, opacity == null ? 1 : opacity);
  }

  function Lab(l, a, b, opacity) {
    this.l = +l;
    this.a = +a;
    this.b = +b;
    this.opacity = +opacity;
  }

  define(Lab, lab, extend(Color, {
    brighter: function(k) {
      return new Lab(this.l + K * (k == null ? 1 : k), this.a, this.b, this.opacity);
    },
    darker: function(k) {
      return new Lab(this.l - K * (k == null ? 1 : k), this.a, this.b, this.opacity);
    },
    rgb: function() {
      var y = (this.l + 16) / 116,
          x = isNaN(this.a) ? y : y + this.a / 500,
          z = isNaN(this.b) ? y : y - this.b / 200;
      x = Xn * lab2xyz(x);
      y = Yn * lab2xyz(y);
      z = Zn * lab2xyz(z);
      return new Rgb(
        lrgb2rgb( 3.1338561 * x - 1.6168667 * y - 0.4906146 * z),
        lrgb2rgb(-0.9787684 * x + 1.9161415 * y + 0.0334540 * z),
        lrgb2rgb( 0.0719453 * x - 0.2289914 * y + 1.4052427 * z),
        this.opacity
      );
    }
  }));

  function xyz2lab(t) {
    return t > t3 ? Math.pow(t, 1 / 3) : t / t2 + t0;
  }

  function lab2xyz(t) {
    return t > t1 ? t * t * t : t2 * (t - t0);
  }

  function lrgb2rgb(x) {
    return 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  }

  function rgb2lrgb(x) {
    return (x /= 255) <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }

  function hclConvert(o) {
    if (o instanceof Hcl) return new Hcl(o.h, o.c, o.l, o.opacity);
    if (!(o instanceof Lab)) o = labConvert(o);
    if (o.a === 0 && o.b === 0) return new Hcl(NaN, 0 < o.l && o.l < 100 ? 0 : NaN, o.l, o.opacity);
    var h = Math.atan2(o.b, o.a) * rad2deg;
    return new Hcl(h < 0 ? h + 360 : h, Math.sqrt(o.a * o.a + o.b * o.b), o.l, o.opacity);
  }

  function hcl(h, c, l, opacity) {
    return arguments.length === 1 ? hclConvert(h) : new Hcl(h, c, l, opacity == null ? 1 : opacity);
  }

  function Hcl(h, c, l, opacity) {
    this.h = +h;
    this.c = +c;
    this.l = +l;
    this.opacity = +opacity;
  }

  function hcl2lab(o) {
    if (isNaN(o.h)) return new Lab(o.l, 0, 0, o.opacity);
    var h = o.h * deg2rad;
    return new Lab(o.l, Math.cos(h) * o.c, Math.sin(h) * o.c, o.opacity);
  }

  define(Hcl, hcl, extend(Color, {
    brighter: function(k) {
      return new Hcl(this.h, this.c, this.l + K * (k == null ? 1 : k), this.opacity);
    },
    darker: function(k) {
      return new Hcl(this.h, this.c, this.l - K * (k == null ? 1 : k), this.opacity);
    },
    rgb: function() {
      return hcl2lab(this).rgb();
    }
  }));

  var A = -0.14861,
      B = +1.78277,
      C = -0.29227,
      D = -0.90649,
      E = +1.97294,
      ED = E * D,
      EB = E * B,
      BC_DA = B * C - D * A;

  function cubehelixConvert(o) {
    if (o instanceof Cubehelix) return new Cubehelix(o.h, o.s, o.l, o.opacity);
    if (!(o instanceof Rgb)) o = rgbConvert(o);
    var r = o.r / 255,
        g = o.g / 255,
        b = o.b / 255,
        l = (BC_DA * b + ED * r - EB * g) / (BC_DA + ED - EB),
        bl = b - l,
        k = (E * (g - l) - C * bl) / D,
        s = Math.sqrt(k * k + bl * bl) / (E * l * (1 - l)), // NaN if l=0 or l=1
        h = s ? Math.atan2(k, bl) * rad2deg - 120 : NaN;
    return new Cubehelix(h < 0 ? h + 360 : h, s, l, o.opacity);
  }

  function cubehelix(h, s, l, opacity) {
    return arguments.length === 1 ? cubehelixConvert(h) : new Cubehelix(h, s, l, opacity == null ? 1 : opacity);
  }

  function Cubehelix(h, s, l, opacity) {
    this.h = +h;
    this.s = +s;
    this.l = +l;
    this.opacity = +opacity;
  }

  define(Cubehelix, cubehelix, extend(Color, {
    brighter: function(k) {
      k = k == null ? brighter : Math.pow(brighter, k);
      return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
    },
    darker: function(k) {
      k = k == null ? darker : Math.pow(darker, k);
      return new Cubehelix(this.h, this.s, this.l * k, this.opacity);
    },
    rgb: function() {
      var h = isNaN(this.h) ? 0 : (this.h + 120) * deg2rad,
          l = +this.l,
          a = isNaN(this.s) ? 0 : this.s * l * (1 - l),
          cosh = Math.cos(h),
          sinh = Math.sin(h);
      return new Rgb(
        255 * (l + a * (A * cosh + B * sinh)),
        255 * (l + a * (C * cosh + D * sinh)),
        255 * (l + a * (E * cosh)),
        this.opacity
      );
    }
  }));

  function constant$3(x) {
    return function() {
      return x;
    };
  }

  function linear(a, d) {
    return function(t) {
      return a + t * d;
    };
  }

  function exponential(a, b, y) {
    return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
      return Math.pow(a + t * b, y);
    };
  }

  function gamma(y) {
    return (y = +y) === 1 ? nogamma : function(a, b) {
      return b - a ? exponential(a, b, y) : constant$3(isNaN(a) ? b : a);
    };
  }

  function nogamma(a, b) {
    var d = b - a;
    return d ? linear(a, d) : constant$3(isNaN(a) ? b : a);
  }

  var interpolateRgb = (function rgbGamma(y) {
    var color = gamma(y);

    function rgb$1(start, end) {
      var r = color((start = rgb(start)).r, (end = rgb(end)).r),
          g = color(start.g, end.g),
          b = color(start.b, end.b),
          opacity = nogamma(start.opacity, end.opacity);
      return function(t) {
        start.r = r(t);
        start.g = g(t);
        start.b = b(t);
        start.opacity = opacity(t);
        return start + "";
      };
    }

    rgb$1.gamma = rgbGamma;

    return rgb$1;
  })(1);

  function array$1(a, b) {
    var nb = b ? b.length : 0,
        na = a ? Math.min(nb, a.length) : 0,
        x = new Array(na),
        c = new Array(nb),
        i;

    for (i = 0; i < na; ++i) x[i] = interpolateValue(a[i], b[i]);
    for (; i < nb; ++i) c[i] = b[i];

    return function(t) {
      for (i = 0; i < na; ++i) c[i] = x[i](t);
      return c;
    };
  }

  function date$1(a, b) {
    var d = new Date;
    return a = +a, b -= a, function(t) {
      return d.setTime(a + b * t), d;
    };
  }

  function interpolateNumber(a, b) {
    return a = +a, b -= a, function(t) {
      return a + b * t;
    };
  }

  function object$1(a, b) {
    var i = {},
        c = {},
        k;

    if (a === null || typeof a !== "object") a = {};
    if (b === null || typeof b !== "object") b = {};

    for (k in b) {
      if (k in a) {
        i[k] = interpolateValue(a[k], b[k]);
      } else {
        c[k] = b[k];
      }
    }

    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }

  var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
      reB = new RegExp(reA.source, "g");

  function zero(b) {
    return function() {
      return b;
    };
  }

  function one(b) {
    return function(t) {
      return b(t) + "";
    };
  }

  function interpolateString(a, b) {
    var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
        am, // current match in a
        bm, // current match in b
        bs, // string preceding current number in b, if any
        i = -1, // index in s
        s = [], // string constants and placeholders
        q = []; // number interpolators

    // Coerce inputs to strings.
    a = a + "", b = b + "";

    // Interpolate pairs of numbers in a & b.
    while ((am = reA.exec(a))
        && (bm = reB.exec(b))) {
      if ((bs = bm.index) > bi) { // a string precedes the next number in b
        bs = b.slice(bi, bs);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }
      if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
        if (s[i]) s[i] += bm; // coalesce with previous string
        else s[++i] = bm;
      } else { // interpolate non-matching numbers
        s[++i] = null;
        q.push({i: i, x: interpolateNumber(am, bm)});
      }
      bi = reB.lastIndex;
    }

    // Add remains of b.
    if (bi < b.length) {
      bs = b.slice(bi);
      if (s[i]) s[i] += bs; // coalesce with previous string
      else s[++i] = bs;
    }

    // Special optimization for only a single match.
    // Otherwise, interpolate each of the numbers and rejoin the string.
    return s.length < 2 ? (q[0]
        ? one(q[0].x)
        : zero(b))
        : (b = q.length, function(t) {
            for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
            return s.join("");
          });
  }

  function interpolateValue(a, b) {
    var t = typeof b, c;
    return b == null || t === "boolean" ? constant$3(b)
        : (t === "number" ? interpolateNumber
        : t === "string" ? ((c = color(b)) ? (b = c, interpolateRgb) : interpolateString)
        : b instanceof color ? interpolateRgb
        : b instanceof Date ? date$1
        : Array.isArray(b) ? array$1
        : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object$1
        : interpolateNumber)(a, b);
  }

  function interpolateRound(a, b) {
    return a = +a, b -= a, function(t) {
      return Math.round(a + b * t);
    };
  }

  var degrees = 180 / Math.PI;

  var identity = {
    translateX: 0,
    translateY: 0,
    rotate: 0,
    skewX: 0,
    scaleX: 1,
    scaleY: 1
  };

  function decompose(a, b, c, d, e, f) {
    var scaleX, scaleY, skewX;
    if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
    if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
    if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
    if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
    return {
      translateX: e,
      translateY: f,
      rotate: Math.atan2(b, a) * degrees,
      skewX: Math.atan(skewX) * degrees,
      scaleX: scaleX,
      scaleY: scaleY
    };
  }

  var cssNode,
      cssRoot,
      cssView,
      svgNode;

  function parseCss(value) {
    if (value === "none") return identity;
    if (!cssNode) cssNode = document.createElement("DIV"), cssRoot = document.documentElement, cssView = document.defaultView;
    cssNode.style.transform = value;
    value = cssView.getComputedStyle(cssRoot.appendChild(cssNode), null).getPropertyValue("transform");
    cssRoot.removeChild(cssNode);
    value = value.slice(7, -1).split(",");
    return decompose(+value[0], +value[1], +value[2], +value[3], +value[4], +value[5]);
  }

  function parseSvg(value) {
    if (value == null) return identity;
    if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgNode.setAttribute("transform", value);
    if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
    value = value.matrix;
    return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
  }

  function interpolateTransform(parse, pxComma, pxParen, degParen) {

    function pop(s) {
      return s.length ? s.pop() + " " : "";
    }

    function translate(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push("translate(", null, pxComma, null, pxParen);
        q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
      } else if (xb || yb) {
        s.push("translate(" + xb + pxComma + yb + pxParen);
      }
    }

    function rotate(a, b, s, q) {
      if (a !== b) {
        if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
        q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
      } else if (b) {
        s.push(pop(s) + "rotate(" + b + degParen);
      }
    }

    function skewX(a, b, s, q) {
      if (a !== b) {
        q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
      } else if (b) {
        s.push(pop(s) + "skewX(" + b + degParen);
      }
    }

    function scale(xa, ya, xb, yb, s, q) {
      if (xa !== xb || ya !== yb) {
        var i = s.push(pop(s) + "scale(", null, ",", null, ")");
        q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
      } else if (xb !== 1 || yb !== 1) {
        s.push(pop(s) + "scale(" + xb + "," + yb + ")");
      }
    }

    return function(a, b) {
      var s = [], // string constants and placeholders
          q = []; // number interpolators
      a = parse(a), b = parse(b);
      translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
      rotate(a.rotate, b.rotate, s, q);
      skewX(a.skewX, b.skewX, s, q);
      scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
      a = b = null; // gc
      return function(t) {
        var i = -1, n = q.length, o;
        while (++i < n) s[(o = q[i]).i] = o.x(t);
        return s.join("");
      };
    };
  }

  var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
  var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

  function tweenRemove(id, name) {
    var tween0, tween1;
    return function() {
      var schedule = set$1(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = tween0 = tween;
        for (var i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1 = tween1.slice();
            tween1.splice(i, 1);
            break;
          }
        }
      }

      schedule.tween = tween1;
    };
  }

  function tweenFunction(id, name, value) {
    var tween0, tween1;
    if (typeof value !== "function") throw new Error;
    return function() {
      var schedule = set$1(this, id),
          tween = schedule.tween;

      // If this node shared tween with the previous node,
      // just assign the updated shared tween and we’re done!
      // Otherwise, copy-on-write.
      if (tween !== tween0) {
        tween1 = (tween0 = tween).slice();
        for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
          if (tween1[i].name === name) {
            tween1[i] = t;
            break;
          }
        }
        if (i === n) tween1.push(t);
      }

      schedule.tween = tween1;
    };
  }

  function transition_tween(name, value) {
    var id = this._id;

    name += "";

    if (arguments.length < 2) {
      var tween = get$1(this.node(), id).tween;
      for (var i = 0, n = tween.length, t; i < n; ++i) {
        if ((t = tween[i]).name === name) {
          return t.value;
        }
      }
      return null;
    }

    return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
  }

  function tweenValue(transition, name, value) {
    var id = transition._id;

    transition.each(function() {
      var schedule = set$1(this, id);
      (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
    });

    return function(node) {
      return get$1(node, id).value[name];
    };
  }

  function interpolate(a, b) {
    var c;
    return (typeof b === "number" ? interpolateNumber
        : b instanceof color ? interpolateRgb
        : (c = color(b)) ? (b = c, interpolateRgb)
        : interpolateString)(a, b);
  }

  function attrRemove$1(name) {
    return function() {
      this.removeAttribute(name);
    };
  }

  function attrRemoveNS$1(fullname) {
    return function() {
      this.removeAttributeNS(fullname.space, fullname.local);
    };
  }

  function attrConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttribute(name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrConstantNS$1(fullname, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = this.getAttributeNS(fullname.space, fullname.local);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function attrFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttribute(name);
      string0 = this.getAttribute(name);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function attrFunctionNS$1(fullname, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0, value1 = value(this), string1;
      if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
      string0 = this.getAttributeNS(fullname.space, fullname.local);
      string1 = value1 + "";
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function transition_attr(name, value) {
    var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
    return this.attrTween(name, typeof value === "function"
        ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)(fullname, i, tweenValue(this, "attr." + name, value))
        : value == null ? (fullname.local ? attrRemoveNS$1 : attrRemove$1)(fullname)
        : (fullname.local ? attrConstantNS$1 : attrConstant$1)(fullname, i, value));
  }

  function attrInterpolate(name, i) {
    return function(t) {
      this.setAttribute(name, i(t));
    };
  }

  function attrInterpolateNS(fullname, i) {
    return function(t) {
      this.setAttributeNS(fullname.space, fullname.local, i(t));
    };
  }

  function attrTweenNS(fullname, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function attrTween(name, value) {
    var t0, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
      return t0;
    }
    tween._value = value;
    return tween;
  }

  function transition_attrTween(name, value) {
    var key = "attr." + name;
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    var fullname = namespace(name);
    return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
  }

  function delayFunction(id, value) {
    return function() {
      init$1(this, id).delay = +value.apply(this, arguments);
    };
  }

  function delayConstant(id, value) {
    return value = +value, function() {
      init$1(this, id).delay = value;
    };
  }

  function transition_delay(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? delayFunction
            : delayConstant)(id, value))
        : get$1(this.node(), id).delay;
  }

  function durationFunction(id, value) {
    return function() {
      set$1(this, id).duration = +value.apply(this, arguments);
    };
  }

  function durationConstant(id, value) {
    return value = +value, function() {
      set$1(this, id).duration = value;
    };
  }

  function transition_duration(value) {
    var id = this._id;

    return arguments.length
        ? this.each((typeof value === "function"
            ? durationFunction
            : durationConstant)(id, value))
        : get$1(this.node(), id).duration;
  }

  function easeConstant(id, value) {
    if (typeof value !== "function") throw new Error;
    return function() {
      set$1(this, id).ease = value;
    };
  }

  function transition_ease(value) {
    var id = this._id;

    return arguments.length
        ? this.each(easeConstant(id, value))
        : get$1(this.node(), id).ease;
  }

  function transition_filter(match) {
    if (typeof match !== "function") match = matcher(match);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
        if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
          subgroup.push(node);
        }
      }
    }

    return new Transition(subgroups, this._parents, this._name, this._id);
  }

  function transition_merge(transition) {
    if (transition._id !== this._id) throw new Error;

    for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
      for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
        if (node = group0[i] || group1[i]) {
          merge[i] = node;
        }
      }
    }

    for (; j < m0; ++j) {
      merges[j] = groups0[j];
    }

    return new Transition(merges, this._parents, this._name, this._id);
  }

  function start(name) {
    return (name + "").trim().split(/^|\s+/).every(function(t) {
      var i = t.indexOf(".");
      if (i >= 0) t = t.slice(0, i);
      return !t || t === "start";
    });
  }

  function onFunction(id, name, listener) {
    var on0, on1, sit = start(name) ? init$1 : set$1;
    return function() {
      var schedule = sit(this, id),
          on = schedule.on;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

      schedule.on = on1;
    };
  }

  function transition_on(name, listener) {
    var id = this._id;

    return arguments.length < 2
        ? get$1(this.node(), id).on.on(name)
        : this.each(onFunction(id, name, listener));
  }

  function removeFunction(id) {
    return function() {
      var parent = this.parentNode;
      for (var i in this.__transition) if (+i !== id) return;
      if (parent) parent.removeChild(this);
    };
  }

  function transition_remove() {
    return this.on("end.remove", removeFunction(this._id));
  }

  function transition_select(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selector(select);

    for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
        if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          subgroup[i] = subnode;
          schedule(subgroup[i], name, id, i, subgroup, get$1(node, id));
        }
      }
    }

    return new Transition(subgroups, this._parents, name, id);
  }

  function transition_selectAll(select) {
    var name = this._name,
        id = this._id;

    if (typeof select !== "function") select = selectorAll(select);

    for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          for (var children = select.call(node, node.__data__, i, group), child, inherit = get$1(node, id), k = 0, l = children.length; k < l; ++k) {
            if (child = children[k]) {
              schedule(child, name, id, k, children, inherit);
            }
          }
          subgroups.push(children);
          parents.push(node);
        }
      }
    }

    return new Transition(subgroups, parents, name, id);
  }

  var Selection$1 = selection.prototype.constructor;

  function transition_selection() {
    return new Selection$1(this._groups, this._parents);
  }

  function styleNull(name, interpolate) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue(this, name),
          string1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, string10 = string1);
    };
  }

  function styleRemove$1(name) {
    return function() {
      this.style.removeProperty(name);
    };
  }

  function styleConstant$1(name, interpolate, value1) {
    var string00,
        string1 = value1 + "",
        interpolate0;
    return function() {
      var string0 = styleValue(this, name);
      return string0 === string1 ? null
          : string0 === string00 ? interpolate0
          : interpolate0 = interpolate(string00 = string0, value1);
    };
  }

  function styleFunction$1(name, interpolate, value) {
    var string00,
        string10,
        interpolate0;
    return function() {
      var string0 = styleValue(this, name),
          value1 = value(this),
          string1 = value1 + "";
      if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
      return string0 === string1 ? null
          : string0 === string00 && string1 === string10 ? interpolate0
          : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
    };
  }

  function styleMaybeRemove(id, name) {
    var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
    return function() {
      var schedule = set$1(this, id),
          on = schedule.on,
          listener = schedule.value[key] == null ? remove || (remove = styleRemove$1(name)) : undefined;

      // If this node shared a dispatch with the previous node,
      // just assign the updated shared dispatch and we’re done!
      // Otherwise, copy-on-write.
      if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

      schedule.on = on1;
    };
  }

  function transition_style(name, value, priority) {
    var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
    return value == null ? this
        .styleTween(name, styleNull(name, i))
        .on("end.style." + name, styleRemove$1(name))
      : typeof value === "function" ? this
        .styleTween(name, styleFunction$1(name, i, tweenValue(this, "style." + name, value)))
        .each(styleMaybeRemove(this._id, name))
      : this
        .styleTween(name, styleConstant$1(name, i, value), priority)
        .on("end.style." + name, null);
  }

  function styleInterpolate(name, i, priority) {
    return function(t) {
      this.style.setProperty(name, i(t), priority);
    };
  }

  function styleTween(name, value, priority) {
    var t, i0;
    function tween() {
      var i = value.apply(this, arguments);
      if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
      return t;
    }
    tween._value = value;
    return tween;
  }

  function transition_styleTween(name, value, priority) {
    var key = "style." + (name += "");
    if (arguments.length < 2) return (key = this.tween(key)) && key._value;
    if (value == null) return this.tween(key, null);
    if (typeof value !== "function") throw new Error;
    return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
  }

  function textConstant$1(value) {
    return function() {
      this.textContent = value;
    };
  }

  function textFunction$1(value) {
    return function() {
      var value1 = value(this);
      this.textContent = value1 == null ? "" : value1;
    };
  }

  function transition_text(value) {
    return this.tween("text", typeof value === "function"
        ? textFunction$1(tweenValue(this, "text", value))
        : textConstant$1(value == null ? "" : value + ""));
  }

  function transition_transition() {
    var name = this._name,
        id0 = this._id,
        id1 = newId();

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          var inherit = get$1(node, id0);
          schedule(node, name, id1, i, group, {
            time: inherit.time + inherit.delay + inherit.duration,
            delay: 0,
            duration: inherit.duration,
            ease: inherit.ease
          });
        }
      }
    }

    return new Transition(groups, this._parents, name, id1);
  }

  function transition_end() {
    var on0, on1, that = this, id = that._id, size = that.size();
    return new Promise(function(resolve, reject) {
      var cancel = {value: reject},
          end = {value: function() { if (--size === 0) resolve(); }};

      that.each(function() {
        var schedule = set$1(this, id),
            on = schedule.on;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0) {
          on1 = (on0 = on).copy();
          on1._.cancel.push(cancel);
          on1._.interrupt.push(cancel);
          on1._.end.push(end);
        }

        schedule.on = on1;
      });
    });
  }

  var id = 0;

  function Transition(groups, parents, name, id) {
    this._groups = groups;
    this._parents = parents;
    this._name = name;
    this._id = id;
  }

  function transition(name) {
    return selection().transition(name);
  }

  function newId() {
    return ++id;
  }

  var selection_prototype = selection.prototype;

  Transition.prototype = transition.prototype = {
    constructor: Transition,
    select: transition_select,
    selectAll: transition_selectAll,
    filter: transition_filter,
    merge: transition_merge,
    selection: transition_selection,
    transition: transition_transition,
    call: selection_prototype.call,
    nodes: selection_prototype.nodes,
    node: selection_prototype.node,
    size: selection_prototype.size,
    empty: selection_prototype.empty,
    each: selection_prototype.each,
    on: transition_on,
    attr: transition_attr,
    attrTween: transition_attrTween,
    style: transition_style,
    styleTween: transition_styleTween,
    text: transition_text,
    remove: transition_remove,
    tween: transition_tween,
    delay: transition_delay,
    duration: transition_duration,
    ease: transition_ease,
    end: transition_end
  };

  function cubicInOut(t) {
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  }

  var defaultTiming = {
    time: null, // Set on use.
    delay: 0,
    duration: 250,
    ease: cubicInOut
  };

  function inherit(node, id) {
    var timing;
    while (!(timing = node.__transition) || !(timing = timing[id])) {
      if (!(node = node.parentNode)) {
        return defaultTiming.time = now(), defaultTiming;
      }
    }
    return timing;
  }

  function selection_transition(name) {
    var id,
        timing;

    if (name instanceof Transition) {
      id = name._id, name = name._name;
    } else {
      id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
    }

    for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
      for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
        if (node = group[i]) {
          schedule(node, name, id, i, group, timing || inherit(node, id));
        }
      }
    }

    return new Transition(groups, this._parents, name, id);
  }

  selection.prototype.interrupt = selection_interrupt;
  selection.prototype.transition = selection_transition;

  // Computes the decimal coefficient and exponent of the specified number x with
  // significant digits p, where x is positive and p is in [1, 21] or undefined.
  // For example, formatDecimal(1.23) returns ["123", 0].
  function formatDecimal(x, p) {
    if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
    var i, coefficient = x.slice(0, i);

    // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
    // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
    return [
      coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
      +x.slice(i + 1)
    ];
  }

  function exponent(x) {
    return x = formatDecimal(Math.abs(x)), x ? x[1] : NaN;
  }

  function formatGroup(grouping, thousands) {
    return function(value, width) {
      var i = value.length,
          t = [],
          j = 0,
          g = grouping[0],
          length = 0;

      while (i > 0 && g > 0) {
        if (length + g + 1 > width) g = Math.max(1, width - length);
        t.push(value.substring(i -= g, i + g));
        if ((length += g + 1) > width) break;
        g = grouping[j = (j + 1) % grouping.length];
      }

      return t.reverse().join(thousands);
    };
  }

  function formatNumerals(numerals) {
    return function(value) {
      return value.replace(/[0-9]/g, function(i) {
        return numerals[+i];
      });
    };
  }

  // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
  var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

  function formatSpecifier(specifier) {
    if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
    var match;
    return new FormatSpecifier({
      fill: match[1],
      align: match[2],
      sign: match[3],
      symbol: match[4],
      zero: match[5],
      width: match[6],
      comma: match[7],
      precision: match[8] && match[8].slice(1),
      trim: match[9],
      type: match[10]
    });
  }

  formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

  function FormatSpecifier(specifier) {
    this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
    this.align = specifier.align === undefined ? ">" : specifier.align + "";
    this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
    this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
    this.zero = !!specifier.zero;
    this.width = specifier.width === undefined ? undefined : +specifier.width;
    this.comma = !!specifier.comma;
    this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
    this.trim = !!specifier.trim;
    this.type = specifier.type === undefined ? "" : specifier.type + "";
  }

  FormatSpecifier.prototype.toString = function() {
    return this.fill
        + this.align
        + this.sign
        + this.symbol
        + (this.zero ? "0" : "")
        + (this.width === undefined ? "" : Math.max(1, this.width | 0))
        + (this.comma ? "," : "")
        + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
        + (this.trim ? "~" : "")
        + this.type;
  };

  // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
  function formatTrim(s) {
    out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
      switch (s[i]) {
        case ".": i0 = i1 = i; break;
        case "0": if (i0 === 0) i0 = i; i1 = i; break;
        default: if (i0 > 0) { if (!+s[i]) break out; i0 = 0; } break;
      }
    }
    return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
  }

  var prefixExponent;

  function formatPrefixAuto(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1],
        i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
        n = coefficient.length;
    return i === n ? coefficient
        : i > n ? coefficient + new Array(i - n + 1).join("0")
        : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
        : "0." + new Array(1 - i).join("0") + formatDecimal(x, Math.max(0, p + i - 1))[0]; // less than 1y!
  }

  function formatRounded(x, p) {
    var d = formatDecimal(x, p);
    if (!d) return x + "";
    var coefficient = d[0],
        exponent = d[1];
    return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
        : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
        : coefficient + new Array(exponent - coefficient.length + 2).join("0");
  }

  var formatTypes = {
    "%": function(x, p) { return (x * 100).toFixed(p); },
    "b": function(x) { return Math.round(x).toString(2); },
    "c": function(x) { return x + ""; },
    "d": function(x) { return Math.round(x).toString(10); },
    "e": function(x, p) { return x.toExponential(p); },
    "f": function(x, p) { return x.toFixed(p); },
    "g": function(x, p) { return x.toPrecision(p); },
    "o": function(x) { return Math.round(x).toString(8); },
    "p": function(x, p) { return formatRounded(x * 100, p); },
    "r": formatRounded,
    "s": formatPrefixAuto,
    "X": function(x) { return Math.round(x).toString(16).toUpperCase(); },
    "x": function(x) { return Math.round(x).toString(16); }
  };

  function identity$1(x) {
    return x;
  }

  var map = Array.prototype.map,
      prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

  function formatLocale(locale) {
    var group = locale.grouping === undefined || locale.thousands === undefined ? identity$1 : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
        currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
        currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
        decimal = locale.decimal === undefined ? "." : locale.decimal + "",
        numerals = locale.numerals === undefined ? identity$1 : formatNumerals(map.call(locale.numerals, String)),
        percent = locale.percent === undefined ? "%" : locale.percent + "",
        minus = locale.minus === undefined ? "-" : locale.minus + "",
        nan = locale.nan === undefined ? "NaN" : locale.nan + "";

    function newFormat(specifier) {
      specifier = formatSpecifier(specifier);

      var fill = specifier.fill,
          align = specifier.align,
          sign = specifier.sign,
          symbol = specifier.symbol,
          zero = specifier.zero,
          width = specifier.width,
          comma = specifier.comma,
          precision = specifier.precision,
          trim = specifier.trim,
          type = specifier.type;

      // The "n" type is an alias for ",g".
      if (type === "n") comma = true, type = "g";

      // The "" type, and any invalid type, is an alias for ".12~g".
      else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

      // If zero fill is specified, padding goes after sign and before digits.
      if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

      // Compute the prefix and suffix.
      // For SI-prefix, the suffix is lazily computed.
      var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
          suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

      // What format function should we use?
      // Is this an integer type?
      // Can this type generate exponential notation?
      var formatType = formatTypes[type],
          maybeSuffix = /[defgprs%]/.test(type);

      // Set the default precision if not specified,
      // or clamp the specified precision to the supported range.
      // For significant precision, it must be in [1, 21].
      // For fixed precision, it must be in [0, 20].
      precision = precision === undefined ? 6
          : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
          : Math.max(0, Math.min(20, precision));

      function format(value) {
        var valuePrefix = prefix,
            valueSuffix = suffix,
            i, n, c;

        if (type === "c") {
          valueSuffix = formatType(value) + valueSuffix;
          value = "";
        } else {
          value = +value;

          // Perform the initial formatting.
          var valueNegative = value < 0;
          value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

          // Trim insignificant zeros.
          if (trim) value = formatTrim(value);

          // If a negative value rounds to zero during formatting, treat as positive.
          if (valueNegative && +value === 0) valueNegative = false;

          // Compute the prefix and suffix.
          valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;

          valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

          // Break the formatted value into the integer “value” part that can be
          // grouped, and fractional or exponential “suffix” part that is not.
          if (maybeSuffix) {
            i = -1, n = value.length;
            while (++i < n) {
              if (c = value.charCodeAt(i), 48 > c || c > 57) {
                valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                value = value.slice(0, i);
                break;
              }
            }
          }
        }

        // If the fill character is not "0", grouping is applied before padding.
        if (comma && !zero) value = group(value, Infinity);

        // Compute the padding.
        var length = valuePrefix.length + value.length + valueSuffix.length,
            padding = length < width ? new Array(width - length + 1).join(fill) : "";

        // If the fill character is "0", grouping is applied after padding.
        if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

        // Reconstruct the final output based on the desired alignment.
        switch (align) {
          case "<": value = valuePrefix + value + valueSuffix + padding; break;
          case "=": value = valuePrefix + padding + value + valueSuffix; break;
          case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
          default: value = padding + valuePrefix + value + valueSuffix; break;
        }

        return numerals(value);
      }

      format.toString = function() {
        return specifier + "";
      };

      return format;
    }

    function formatPrefix(specifier, value) {
      var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
          e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
          k = Math.pow(10, -e),
          prefix = prefixes[8 + e / 3];
      return function(value) {
        return f(k * value) + prefix;
      };
    }

    return {
      format: newFormat,
      formatPrefix: formatPrefix
    };
  }

  var locale;
  var format;
  var formatPrefix;

  defaultLocale({
    decimal: ".",
    thousands: ",",
    grouping: [3],
    currency: ["$", ""],
    minus: "-"
  });

  function defaultLocale(definition) {
    locale = formatLocale(definition);
    format = locale.format;
    formatPrefix = locale.formatPrefix;
    return locale;
  }

  function precisionFixed(step) {
    return Math.max(0, -exponent(Math.abs(step)));
  }

  function precisionPrefix(step, value) {
    return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
  }

  function precisionRound(step, max) {
    step = Math.abs(step), max = Math.abs(max) - step;
    return Math.max(0, exponent(max) - exponent(step)) + 1;
  }

  var t0$1 = new Date,
      t1$1 = new Date;

  function newInterval(floori, offseti, count, field) {

    function interval(date) {
      return floori(date = new Date(+date)), date;
    }

    interval.floor = interval;

    interval.ceil = function(date) {
      return floori(date = new Date(date - 1)), offseti(date, 1), floori(date), date;
    };

    interval.round = function(date) {
      var d0 = interval(date),
          d1 = interval.ceil(date);
      return date - d0 < d1 - date ? d0 : d1;
    };

    interval.offset = function(date, step) {
      return offseti(date = new Date(+date), step == null ? 1 : Math.floor(step)), date;
    };

    interval.range = function(start, stop, step) {
      var range = [], previous;
      start = interval.ceil(start);
      step = step == null ? 1 : Math.floor(step);
      if (!(start < stop) || !(step > 0)) return range; // also handles Invalid Date
      do range.push(previous = new Date(+start)), offseti(start, step), floori(start);
      while (previous < start && start < stop);
      return range;
    };

    interval.filter = function(test) {
      return newInterval(function(date) {
        if (date >= date) while (floori(date), !test(date)) date.setTime(date - 1);
      }, function(date, step) {
        if (date >= date) {
          if (step < 0) while (++step <= 0) {
            while (offseti(date, -1), !test(date)) {} // eslint-disable-line no-empty
          } else while (--step >= 0) {
            while (offseti(date, +1), !test(date)) {} // eslint-disable-line no-empty
          }
        }
      });
    };

    if (count) {
      interval.count = function(start, end) {
        t0$1.setTime(+start), t1$1.setTime(+end);
        floori(t0$1), floori(t1$1);
        return Math.floor(count(t0$1, t1$1));
      };

      interval.every = function(step) {
        step = Math.floor(step);
        return !isFinite(step) || !(step > 0) ? null
            : !(step > 1) ? interval
            : interval.filter(field
                ? function(d) { return field(d) % step === 0; }
                : function(d) { return interval.count(0, d) % step === 0; });
      };
    }

    return interval;
  }

  var millisecond = newInterval(function() {
    // noop
  }, function(date, step) {
    date.setTime(+date + step);
  }, function(start, end) {
    return end - start;
  });

  // An optimized implementation for this simple case.
  millisecond.every = function(k) {
    k = Math.floor(k);
    if (!isFinite(k) || !(k > 0)) return null;
    if (!(k > 1)) return millisecond;
    return newInterval(function(date) {
      date.setTime(Math.floor(date / k) * k);
    }, function(date, step) {
      date.setTime(+date + step * k);
    }, function(start, end) {
      return (end - start) / k;
    });
  };

  var durationSecond = 1e3;
  var durationMinute = 6e4;
  var durationHour = 36e5;
  var durationDay = 864e5;
  var durationWeek = 6048e5;

  var second = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds());
  }, function(date, step) {
    date.setTime(+date + step * durationSecond);
  }, function(start, end) {
    return (end - start) / durationSecond;
  }, function(date) {
    return date.getUTCSeconds();
  });

  var minute = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond);
  }, function(date, step) {
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getMinutes();
  });

  var hour = newInterval(function(date) {
    date.setTime(date - date.getMilliseconds() - date.getSeconds() * durationSecond - date.getMinutes() * durationMinute);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getHours();
  });

  var day = newInterval(function(date) {
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setDate(date.getDate() + step);
  }, function(start, end) {
    return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationDay;
  }, function(date) {
    return date.getDate() - 1;
  });

  function weekday(i) {
    return newInterval(function(date) {
      date.setDate(date.getDate() - (date.getDay() + 7 - i) % 7);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setDate(date.getDate() + step * 7);
    }, function(start, end) {
      return (end - start - (end.getTimezoneOffset() - start.getTimezoneOffset()) * durationMinute) / durationWeek;
    });
  }

  var sunday = weekday(0);
  var monday = weekday(1);
  var tuesday = weekday(2);
  var wednesday = weekday(3);
  var thursday = weekday(4);
  var friday = weekday(5);
  var saturday = weekday(6);

  var month = newInterval(function(date) {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setMonth(date.getMonth() + step);
  }, function(start, end) {
    return end.getMonth() - start.getMonth() + (end.getFullYear() - start.getFullYear()) * 12;
  }, function(date) {
    return date.getMonth();
  });

  var year = newInterval(function(date) {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setFullYear(date.getFullYear() + step);
  }, function(start, end) {
    return end.getFullYear() - start.getFullYear();
  }, function(date) {
    return date.getFullYear();
  });

  // An optimized implementation for this simple case.
  year.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setFullYear(Math.floor(date.getFullYear() / k) * k);
      date.setMonth(0, 1);
      date.setHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setFullYear(date.getFullYear() + step * k);
    });
  };

  var utcMinute = newInterval(function(date) {
    date.setUTCSeconds(0, 0);
  }, function(date, step) {
    date.setTime(+date + step * durationMinute);
  }, function(start, end) {
    return (end - start) / durationMinute;
  }, function(date) {
    return date.getUTCMinutes();
  });

  var utcHour = newInterval(function(date) {
    date.setUTCMinutes(0, 0, 0);
  }, function(date, step) {
    date.setTime(+date + step * durationHour);
  }, function(start, end) {
    return (end - start) / durationHour;
  }, function(date) {
    return date.getUTCHours();
  });

  var utcDay = newInterval(function(date) {
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCDate(date.getUTCDate() + step);
  }, function(start, end) {
    return (end - start) / durationDay;
  }, function(date) {
    return date.getUTCDate() - 1;
  });

  function utcWeekday(i) {
    return newInterval(function(date) {
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 7 - i) % 7);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCDate(date.getUTCDate() + step * 7);
    }, function(start, end) {
      return (end - start) / durationWeek;
    });
  }

  var utcSunday = utcWeekday(0);
  var utcMonday = utcWeekday(1);
  var utcTuesday = utcWeekday(2);
  var utcWednesday = utcWeekday(3);
  var utcThursday = utcWeekday(4);
  var utcFriday = utcWeekday(5);
  var utcSaturday = utcWeekday(6);

  var utcMonth = newInterval(function(date) {
    date.setUTCDate(1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCMonth(date.getUTCMonth() + step);
  }, function(start, end) {
    return end.getUTCMonth() - start.getUTCMonth() + (end.getUTCFullYear() - start.getUTCFullYear()) * 12;
  }, function(date) {
    return date.getUTCMonth();
  });

  var utcYear = newInterval(function(date) {
    date.setUTCMonth(0, 1);
    date.setUTCHours(0, 0, 0, 0);
  }, function(date, step) {
    date.setUTCFullYear(date.getUTCFullYear() + step);
  }, function(start, end) {
    return end.getUTCFullYear() - start.getUTCFullYear();
  }, function(date) {
    return date.getUTCFullYear();
  });

  // An optimized implementation for this simple case.
  utcYear.every = function(k) {
    return !isFinite(k = Math.floor(k)) || !(k > 0) ? null : newInterval(function(date) {
      date.setUTCFullYear(Math.floor(date.getUTCFullYear() / k) * k);
      date.setUTCMonth(0, 1);
      date.setUTCHours(0, 0, 0, 0);
    }, function(date, step) {
      date.setUTCFullYear(date.getUTCFullYear() + step * k);
    });
  };

  function localDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(-1, d.m, d.d, d.H, d.M, d.S, d.L);
      date.setFullYear(d.y);
      return date;
    }
    return new Date(d.y, d.m, d.d, d.H, d.M, d.S, d.L);
  }

  function utcDate(d) {
    if (0 <= d.y && d.y < 100) {
      var date = new Date(Date.UTC(-1, d.m, d.d, d.H, d.M, d.S, d.L));
      date.setUTCFullYear(d.y);
      return date;
    }
    return new Date(Date.UTC(d.y, d.m, d.d, d.H, d.M, d.S, d.L));
  }

  function newYear(y) {
    return {y: y, m: 0, d: 1, H: 0, M: 0, S: 0, L: 0};
  }

  function formatLocale$1(locale) {
    var locale_dateTime = locale.dateTime,
        locale_date = locale.date,
        locale_time = locale.time,
        locale_periods = locale.periods,
        locale_weekdays = locale.days,
        locale_shortWeekdays = locale.shortDays,
        locale_months = locale.months,
        locale_shortMonths = locale.shortMonths;

    var periodRe = formatRe(locale_periods),
        periodLookup = formatLookup(locale_periods),
        weekdayRe = formatRe(locale_weekdays),
        weekdayLookup = formatLookup(locale_weekdays),
        shortWeekdayRe = formatRe(locale_shortWeekdays),
        shortWeekdayLookup = formatLookup(locale_shortWeekdays),
        monthRe = formatRe(locale_months),
        monthLookup = formatLookup(locale_months),
        shortMonthRe = formatRe(locale_shortMonths),
        shortMonthLookup = formatLookup(locale_shortMonths);

    var formats = {
      "a": formatShortWeekday,
      "A": formatWeekday,
      "b": formatShortMonth,
      "B": formatMonth,
      "c": null,
      "d": formatDayOfMonth,
      "e": formatDayOfMonth,
      "f": formatMicroseconds,
      "H": formatHour24,
      "I": formatHour12,
      "j": formatDayOfYear,
      "L": formatMilliseconds,
      "m": formatMonthNumber,
      "M": formatMinutes,
      "p": formatPeriod,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatSeconds,
      "u": formatWeekdayNumberMonday,
      "U": formatWeekNumberSunday,
      "V": formatWeekNumberISO,
      "w": formatWeekdayNumberSunday,
      "W": formatWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatYear,
      "Y": formatFullYear,
      "Z": formatZone,
      "%": formatLiteralPercent
    };

    var utcFormats = {
      "a": formatUTCShortWeekday,
      "A": formatUTCWeekday,
      "b": formatUTCShortMonth,
      "B": formatUTCMonth,
      "c": null,
      "d": formatUTCDayOfMonth,
      "e": formatUTCDayOfMonth,
      "f": formatUTCMicroseconds,
      "H": formatUTCHour24,
      "I": formatUTCHour12,
      "j": formatUTCDayOfYear,
      "L": formatUTCMilliseconds,
      "m": formatUTCMonthNumber,
      "M": formatUTCMinutes,
      "p": formatUTCPeriod,
      "Q": formatUnixTimestamp,
      "s": formatUnixTimestampSeconds,
      "S": formatUTCSeconds,
      "u": formatUTCWeekdayNumberMonday,
      "U": formatUTCWeekNumberSunday,
      "V": formatUTCWeekNumberISO,
      "w": formatUTCWeekdayNumberSunday,
      "W": formatUTCWeekNumberMonday,
      "x": null,
      "X": null,
      "y": formatUTCYear,
      "Y": formatUTCFullYear,
      "Z": formatUTCZone,
      "%": formatLiteralPercent
    };

    var parses = {
      "a": parseShortWeekday,
      "A": parseWeekday,
      "b": parseShortMonth,
      "B": parseMonth,
      "c": parseLocaleDateTime,
      "d": parseDayOfMonth,
      "e": parseDayOfMonth,
      "f": parseMicroseconds,
      "H": parseHour24,
      "I": parseHour24,
      "j": parseDayOfYear,
      "L": parseMilliseconds,
      "m": parseMonthNumber,
      "M": parseMinutes,
      "p": parsePeriod,
      "Q": parseUnixTimestamp,
      "s": parseUnixTimestampSeconds,
      "S": parseSeconds,
      "u": parseWeekdayNumberMonday,
      "U": parseWeekNumberSunday,
      "V": parseWeekNumberISO,
      "w": parseWeekdayNumberSunday,
      "W": parseWeekNumberMonday,
      "x": parseLocaleDate,
      "X": parseLocaleTime,
      "y": parseYear,
      "Y": parseFullYear,
      "Z": parseZone,
      "%": parseLiteralPercent
    };

    // These recursive directive definitions must be deferred.
    formats.x = newFormat(locale_date, formats);
    formats.X = newFormat(locale_time, formats);
    formats.c = newFormat(locale_dateTime, formats);
    utcFormats.x = newFormat(locale_date, utcFormats);
    utcFormats.X = newFormat(locale_time, utcFormats);
    utcFormats.c = newFormat(locale_dateTime, utcFormats);

    function newFormat(specifier, formats) {
      return function(date) {
        var string = [],
            i = -1,
            j = 0,
            n = specifier.length,
            c,
            pad,
            format;

        if (!(date instanceof Date)) date = new Date(+date);

        while (++i < n) {
          if (specifier.charCodeAt(i) === 37) {
            string.push(specifier.slice(j, i));
            if ((pad = pads[c = specifier.charAt(++i)]) != null) c = specifier.charAt(++i);
            else pad = c === "e" ? " " : "0";
            if (format = formats[c]) c = format(date, pad);
            string.push(c);
            j = i + 1;
          }
        }

        string.push(specifier.slice(j, i));
        return string.join("");
      };
    }

    function newParse(specifier, newDate) {
      return function(string) {
        var d = newYear(1900),
            i = parseSpecifier(d, specifier, string += "", 0),
            week, day$1;
        if (i != string.length) return null;

        // If a UNIX timestamp is specified, return it.
        if ("Q" in d) return new Date(d.Q);

        // The am-pm flag is 0 for AM, and 1 for PM.
        if ("p" in d) d.H = d.H % 12 + d.p * 12;

        // Convert day-of-week and week-of-year to day-of-year.
        if ("V" in d) {
          if (d.V < 1 || d.V > 53) return null;
          if (!("w" in d)) d.w = 1;
          if ("Z" in d) {
            week = utcDate(newYear(d.y)), day$1 = week.getUTCDay();
            week = day$1 > 4 || day$1 === 0 ? utcMonday.ceil(week) : utcMonday(week);
            week = utcDay.offset(week, (d.V - 1) * 7);
            d.y = week.getUTCFullYear();
            d.m = week.getUTCMonth();
            d.d = week.getUTCDate() + (d.w + 6) % 7;
          } else {
            week = newDate(newYear(d.y)), day$1 = week.getDay();
            week = day$1 > 4 || day$1 === 0 ? monday.ceil(week) : monday(week);
            week = day.offset(week, (d.V - 1) * 7);
            d.y = week.getFullYear();
            d.m = week.getMonth();
            d.d = week.getDate() + (d.w + 6) % 7;
          }
        } else if ("W" in d || "U" in d) {
          if (!("w" in d)) d.w = "u" in d ? d.u % 7 : "W" in d ? 1 : 0;
          day$1 = "Z" in d ? utcDate(newYear(d.y)).getUTCDay() : newDate(newYear(d.y)).getDay();
          d.m = 0;
          d.d = "W" in d ? (d.w + 6) % 7 + d.W * 7 - (day$1 + 5) % 7 : d.w + d.U * 7 - (day$1 + 6) % 7;
        }

        // If a time zone is specified, all fields are interpreted as UTC and then
        // offset according to the specified time zone.
        if ("Z" in d) {
          d.H += d.Z / 100 | 0;
          d.M += d.Z % 100;
          return utcDate(d);
        }

        // Otherwise, all fields are in local time.
        return newDate(d);
      };
    }

    function parseSpecifier(d, specifier, string, j) {
      var i = 0,
          n = specifier.length,
          m = string.length,
          c,
          parse;

      while (i < n) {
        if (j >= m) return -1;
        c = specifier.charCodeAt(i++);
        if (c === 37) {
          c = specifier.charAt(i++);
          parse = parses[c in pads ? specifier.charAt(i++) : c];
          if (!parse || ((j = parse(d, string, j)) < 0)) return -1;
        } else if (c != string.charCodeAt(j++)) {
          return -1;
        }
      }

      return j;
    }

    function parsePeriod(d, string, i) {
      var n = periodRe.exec(string.slice(i));
      return n ? (d.p = periodLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortWeekday(d, string, i) {
      var n = shortWeekdayRe.exec(string.slice(i));
      return n ? (d.w = shortWeekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseWeekday(d, string, i) {
      var n = weekdayRe.exec(string.slice(i));
      return n ? (d.w = weekdayLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseShortMonth(d, string, i) {
      var n = shortMonthRe.exec(string.slice(i));
      return n ? (d.m = shortMonthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseMonth(d, string, i) {
      var n = monthRe.exec(string.slice(i));
      return n ? (d.m = monthLookup[n[0].toLowerCase()], i + n[0].length) : -1;
    }

    function parseLocaleDateTime(d, string, i) {
      return parseSpecifier(d, locale_dateTime, string, i);
    }

    function parseLocaleDate(d, string, i) {
      return parseSpecifier(d, locale_date, string, i);
    }

    function parseLocaleTime(d, string, i) {
      return parseSpecifier(d, locale_time, string, i);
    }

    function formatShortWeekday(d) {
      return locale_shortWeekdays[d.getDay()];
    }

    function formatWeekday(d) {
      return locale_weekdays[d.getDay()];
    }

    function formatShortMonth(d) {
      return locale_shortMonths[d.getMonth()];
    }

    function formatMonth(d) {
      return locale_months[d.getMonth()];
    }

    function formatPeriod(d) {
      return locale_periods[+(d.getHours() >= 12)];
    }

    function formatUTCShortWeekday(d) {
      return locale_shortWeekdays[d.getUTCDay()];
    }

    function formatUTCWeekday(d) {
      return locale_weekdays[d.getUTCDay()];
    }

    function formatUTCShortMonth(d) {
      return locale_shortMonths[d.getUTCMonth()];
    }

    function formatUTCMonth(d) {
      return locale_months[d.getUTCMonth()];
    }

    function formatUTCPeriod(d) {
      return locale_periods[+(d.getUTCHours() >= 12)];
    }

    return {
      format: function(specifier) {
        var f = newFormat(specifier += "", formats);
        f.toString = function() { return specifier; };
        return f;
      },
      parse: function(specifier) {
        var p = newParse(specifier += "", localDate);
        p.toString = function() { return specifier; };
        return p;
      },
      utcFormat: function(specifier) {
        var f = newFormat(specifier += "", utcFormats);
        f.toString = function() { return specifier; };
        return f;
      },
      utcParse: function(specifier) {
        var p = newParse(specifier, utcDate);
        p.toString = function() { return specifier; };
        return p;
      }
    };
  }

  var pads = {"-": "", "_": " ", "0": "0"},
      numberRe = /^\s*\d+/, // note: ignores next directive
      percentRe = /^%/,
      requoteRe = /[\\^$*+?|[\]().{}]/g;

  function pad(value, fill, width) {
    var sign = value < 0 ? "-" : "",
        string = (sign ? -value : value) + "",
        length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }

  function requote(s) {
    return s.replace(requoteRe, "\\$&");
  }

  function formatRe(names) {
    return new RegExp("^(?:" + names.map(requote).join("|") + ")", "i");
  }

  function formatLookup(names) {
    var map = {}, i = -1, n = names.length;
    while (++i < n) map[names[i].toLowerCase()] = i;
    return map;
  }

  function parseWeekdayNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.w = +n[0], i + n[0].length) : -1;
  }

  function parseWeekdayNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 1));
    return n ? (d.u = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberSunday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.U = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberISO(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.V = +n[0], i + n[0].length) : -1;
  }

  function parseWeekNumberMonday(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.W = +n[0], i + n[0].length) : -1;
  }

  function parseFullYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 4));
    return n ? (d.y = +n[0], i + n[0].length) : -1;
  }

  function parseYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.y = +n[0] + (+n[0] > 68 ? 1900 : 2000), i + n[0].length) : -1;
  }

  function parseZone(d, string, i) {
    var n = /^(Z)|([+-]\d\d)(?::?(\d\d))?/.exec(string.slice(i, i + 6));
    return n ? (d.Z = n[1] ? 0 : -(n[2] + (n[3] || "00")), i + n[0].length) : -1;
  }

  function parseMonthNumber(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.m = n[0] - 1, i + n[0].length) : -1;
  }

  function parseDayOfMonth(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.d = +n[0], i + n[0].length) : -1;
  }

  function parseDayOfYear(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.m = 0, d.d = +n[0], i + n[0].length) : -1;
  }

  function parseHour24(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.H = +n[0], i + n[0].length) : -1;
  }

  function parseMinutes(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.M = +n[0], i + n[0].length) : -1;
  }

  function parseSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 2));
    return n ? (d.S = +n[0], i + n[0].length) : -1;
  }

  function parseMilliseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 3));
    return n ? (d.L = +n[0], i + n[0].length) : -1;
  }

  function parseMicroseconds(d, string, i) {
    var n = numberRe.exec(string.slice(i, i + 6));
    return n ? (d.L = Math.floor(n[0] / 1000), i + n[0].length) : -1;
  }

  function parseLiteralPercent(d, string, i) {
    var n = percentRe.exec(string.slice(i, i + 1));
    return n ? i + n[0].length : -1;
  }

  function parseUnixTimestamp(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.Q = +n[0], i + n[0].length) : -1;
  }

  function parseUnixTimestampSeconds(d, string, i) {
    var n = numberRe.exec(string.slice(i));
    return n ? (d.Q = (+n[0]) * 1000, i + n[0].length) : -1;
  }

  function formatDayOfMonth(d, p) {
    return pad(d.getDate(), p, 2);
  }

  function formatHour24(d, p) {
    return pad(d.getHours(), p, 2);
  }

  function formatHour12(d, p) {
    return pad(d.getHours() % 12 || 12, p, 2);
  }

  function formatDayOfYear(d, p) {
    return pad(1 + day.count(year(d), d), p, 3);
  }

  function formatMilliseconds(d, p) {
    return pad(d.getMilliseconds(), p, 3);
  }

  function formatMicroseconds(d, p) {
    return formatMilliseconds(d, p) + "000";
  }

  function formatMonthNumber(d, p) {
    return pad(d.getMonth() + 1, p, 2);
  }

  function formatMinutes(d, p) {
    return pad(d.getMinutes(), p, 2);
  }

  function formatSeconds(d, p) {
    return pad(d.getSeconds(), p, 2);
  }

  function formatWeekdayNumberMonday(d) {
    var day = d.getDay();
    return day === 0 ? 7 : day;
  }

  function formatWeekNumberSunday(d, p) {
    return pad(sunday.count(year(d), d), p, 2);
  }

  function formatWeekNumberISO(d, p) {
    var day = d.getDay();
    d = (day >= 4 || day === 0) ? thursday(d) : thursday.ceil(d);
    return pad(thursday.count(year(d), d) + (year(d).getDay() === 4), p, 2);
  }

  function formatWeekdayNumberSunday(d) {
    return d.getDay();
  }

  function formatWeekNumberMonday(d, p) {
    return pad(monday.count(year(d), d), p, 2);
  }

  function formatYear(d, p) {
    return pad(d.getFullYear() % 100, p, 2);
  }

  function formatFullYear(d, p) {
    return pad(d.getFullYear() % 10000, p, 4);
  }

  function formatZone(d) {
    var z = d.getTimezoneOffset();
    return (z > 0 ? "-" : (z *= -1, "+"))
        + pad(z / 60 | 0, "0", 2)
        + pad(z % 60, "0", 2);
  }

  function formatUTCDayOfMonth(d, p) {
    return pad(d.getUTCDate(), p, 2);
  }

  function formatUTCHour24(d, p) {
    return pad(d.getUTCHours(), p, 2);
  }

  function formatUTCHour12(d, p) {
    return pad(d.getUTCHours() % 12 || 12, p, 2);
  }

  function formatUTCDayOfYear(d, p) {
    return pad(1 + utcDay.count(utcYear(d), d), p, 3);
  }

  function formatUTCMilliseconds(d, p) {
    return pad(d.getUTCMilliseconds(), p, 3);
  }

  function formatUTCMicroseconds(d, p) {
    return formatUTCMilliseconds(d, p) + "000";
  }

  function formatUTCMonthNumber(d, p) {
    return pad(d.getUTCMonth() + 1, p, 2);
  }

  function formatUTCMinutes(d, p) {
    return pad(d.getUTCMinutes(), p, 2);
  }

  function formatUTCSeconds(d, p) {
    return pad(d.getUTCSeconds(), p, 2);
  }

  function formatUTCWeekdayNumberMonday(d) {
    var dow = d.getUTCDay();
    return dow === 0 ? 7 : dow;
  }

  function formatUTCWeekNumberSunday(d, p) {
    return pad(utcSunday.count(utcYear(d), d), p, 2);
  }

  function formatUTCWeekNumberISO(d, p) {
    var day = d.getUTCDay();
    d = (day >= 4 || day === 0) ? utcThursday(d) : utcThursday.ceil(d);
    return pad(utcThursday.count(utcYear(d), d) + (utcYear(d).getUTCDay() === 4), p, 2);
  }

  function formatUTCWeekdayNumberSunday(d) {
    return d.getUTCDay();
  }

  function formatUTCWeekNumberMonday(d, p) {
    return pad(utcMonday.count(utcYear(d), d), p, 2);
  }

  function formatUTCYear(d, p) {
    return pad(d.getUTCFullYear() % 100, p, 2);
  }

  function formatUTCFullYear(d, p) {
    return pad(d.getUTCFullYear() % 10000, p, 4);
  }

  function formatUTCZone() {
    return "+0000";
  }

  function formatLiteralPercent() {
    return "%";
  }

  function formatUnixTimestamp(d) {
    return +d;
  }

  function formatUnixTimestampSeconds(d) {
    return Math.floor(+d / 1000);
  }

  var locale$1;
  var timeFormat;
  var timeParse;
  var utcFormat;
  var utcParse;

  defaultLocale$1({
    dateTime: "%x, %X",
    date: "%-m/%-d/%Y",
    time: "%-I:%M:%S %p",
    periods: ["AM", "PM"],
    days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    shortDays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    shortMonths: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  });

  function defaultLocale$1(definition) {
    locale$1 = formatLocale$1(definition);
    timeFormat = locale$1.format;
    timeParse = locale$1.parse;
    utcFormat = locale$1.utcFormat;
    utcParse = locale$1.utcParse;
    return locale$1;
  }

  var isoSpecifier = "%Y-%m-%dT%H:%M:%S.%LZ";

  function formatIsoNative(date) {
    return date.toISOString();
  }

  var formatIso = Date.prototype.toISOString
      ? formatIsoNative
      : utcFormat(isoSpecifier);

  function parseIsoNative(string) {
    var date = new Date(string);
    return isNaN(date) ? null : date;
  }

  var parseIso = +new Date("2000-01-01T00:00:00.000Z")
      ? parseIsoNative
      : utcParse(isoSpecifier);

  // Helper functions to format numbers and dates.
  let formatter;
  let incognito;
  e.on("page-init", () => {
      const { locale } = favaAPI.favaOptions;
      if (locale) {
          formatter = new Intl.NumberFormat(locale.replace("_", "-")).format;
      }
      else {
          formatter = format(".2f");
      }
      if (favaAPI.incognito) {
          incognito = num => num.replace(/[0-9]/g, "X");
      }
      else {
          incognito = num => num;
      }
  });
  function formatCurrency(number) {
      return incognito(formatter(number));
  }
  const formatterPer = format(".2f");
  function formatPercentage(number) {
      return `${formatterPer(Math.abs(number) * 100)}%`;
  }
  const formatterShort = format(".2s");
  function formatCurrencyShort(number) {
      return incognito(formatterShort(number));
  }
  const dateFormat = {
      year: utcFormat("%Y"),
      quarter(date) {
          return `${date.getUTCFullYear()}Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
      },
      month: utcFormat("%b %Y"),
      week: utcFormat("%YW%W"),
      day: utcFormat("%Y-%m-%d"),
  };
  const timeFilterDateFormat = {
      year: utcFormat("%Y"),
      quarter(date) {
          return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) +
            1}`;
      },
      month: utcFormat("%Y-%m"),
      week: utcFormat("%Y-W%W"),
      day: utcFormat("%Y-%m-%d"),
  };
  // eslint-disable-next-line import/no-mutable-exports
  let currentDateFormat = dateFormat.month;
  interval.subscribe(intervalValue => {
      currentDateFormat = dateFormat[intervalValue];
  });
  // eslint-disable-next-line import/no-mutable-exports
  let currentTimeFilterDateFormat = timeFilterDateFormat.month;
  interval.subscribe(intervalValue => {
      currentTimeFilterDateFormat = timeFilterDateFormat[intervalValue];
  });

  function ascending$1(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  }

  function bisector(compare) {
    if (compare.length === 1) compare = ascendingComparator(compare);
    return {
      left: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) < 0) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (lo == null) lo = 0;
        if (hi == null) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (compare(a[mid], x) > 0) hi = mid;
          else lo = mid + 1;
        }
        return lo;
      }
    };
  }

  function ascendingComparator(f) {
    return function(d, x) {
      return ascending$1(f(d), x);
    };
  }

  var ascendingBisect = bisector(ascending$1);
  var bisectRight = ascendingBisect.right;

  function extent(values, valueof) {
    let min;
    let max;
    if (valueof === undefined) {
      for (const value of values) {
        if (value != null) {
          if (min === undefined) {
            if (value >= value) min = max = value;
          } else {
            if (min > value) min = value;
            if (max < value) max = value;
          }
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null) {
          if (min === undefined) {
            if (value >= value) min = max = value;
          } else {
            if (min > value) min = value;
            if (max < value) max = value;
          }
        }
      }
    }
    return [min, max];
  }

  function sequence(start, stop, step) {
    start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

    var i = -1,
        n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
        range = new Array(n);

    while (++i < n) {
      range[i] = start + i * step;
    }

    return range;
  }

  var e10 = Math.sqrt(50),
      e5 = Math.sqrt(10),
      e2 = Math.sqrt(2);

  function ticks(start, stop, count) {
    var reverse,
        i = -1,
        n,
        ticks,
        step;

    stop = +stop, start = +start, count = +count;
    if (start === stop && count > 0) return [start];
    if (reverse = stop < start) n = start, start = stop, stop = n;
    if ((step = tickIncrement(start, stop, count)) === 0 || !isFinite(step)) return [];

    if (step > 0) {
      start = Math.ceil(start / step);
      stop = Math.floor(stop / step);
      ticks = new Array(n = Math.ceil(stop - start + 1));
      while (++i < n) ticks[i] = (start + i) * step;
    } else {
      start = Math.floor(start * step);
      stop = Math.ceil(stop * step);
      ticks = new Array(n = Math.ceil(start - stop + 1));
      while (++i < n) ticks[i] = (start - i) / step;
    }

    if (reverse) ticks.reverse();

    return ticks;
  }

  function tickIncrement(start, stop, count) {
    var step = (stop - start) / Math.max(0, count),
        power = Math.floor(Math.log(step) / Math.LN10),
        error = step / Math.pow(10, power);
    return power >= 0
        ? (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1) * Math.pow(10, power)
        : -Math.pow(10, -power) / (error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1);
  }

  function tickStep(start, stop, count) {
    var step0 = Math.abs(stop - start) / Math.max(0, count),
        step1 = Math.pow(10, Math.floor(Math.log(step0) / Math.LN10)),
        error = step0 / step1;
    if (error >= e10) step1 *= 10;
    else if (error >= e5) step1 *= 5;
    else if (error >= e2) step1 *= 2;
    return stop < start ? -step1 : step1;
  }

  function max(values, valueof) {
    let max;
    if (valueof === undefined) {
      for (const value of values) {
        if (value != null
            && (max < value || (max === undefined && value >= value))) {
          max = value;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null
            && (max < value || (max === undefined && value >= value))) {
          max = value;
        }
      }
    }
    return max;
  }

  function* flatten(arrays) {
    for (const array of arrays) {
      yield* array;
    }
  }

  function merge(arrays) {
    return Array.from(flatten(arrays));
  }

  function min(values, valueof) {
    let min;
    if (valueof === undefined) {
      for (const value of values) {
        if (value != null
            && (min > value || (min === undefined && value >= value))) {
          min = value;
        }
      }
    } else {
      let index = -1;
      for (let value of values) {
        if ((value = valueof(value, ++index, values)) != null
            && (min > value || (min === undefined && value >= value))) {
          min = value;
        }
      }
    }
    return min;
  }

  var slice = Array.prototype.slice;

  function identity$2(x) {
    return x;
  }

  var top = 1,
      right = 2,
      bottom = 3,
      left = 4,
      epsilon = 1e-6;

  function translateX(x) {
    return "translate(" + (x + 0.5) + ",0)";
  }

  function translateY(y) {
    return "translate(0," + (y + 0.5) + ")";
  }

  function number$1(scale) {
    return function(d) {
      return +scale(d);
    };
  }

  function center(scale) {
    var offset = Math.max(0, scale.bandwidth() - 1) / 2; // Adjust for 0.5px offset.
    if (scale.round()) offset = Math.round(offset);
    return function(d) {
      return +scale(d) + offset;
    };
  }

  function entering() {
    return !this.__axis;
  }

  function axis(orient, scale) {
    var tickArguments = [],
        tickValues = null,
        tickFormat = null,
        tickSizeInner = 6,
        tickSizeOuter = 6,
        tickPadding = 3,
        k = orient === top || orient === left ? -1 : 1,
        x = orient === left || orient === right ? "x" : "y",
        transform = orient === top || orient === bottom ? translateX : translateY;

    function axis(context) {
      var values = tickValues == null ? (scale.ticks ? scale.ticks.apply(scale, tickArguments) : scale.domain()) : tickValues,
          format = tickFormat == null ? (scale.tickFormat ? scale.tickFormat.apply(scale, tickArguments) : identity$2) : tickFormat,
          spacing = Math.max(tickSizeInner, 0) + tickPadding,
          range = scale.range(),
          range0 = +range[0] + 0.5,
          range1 = +range[range.length - 1] + 0.5,
          position = (scale.bandwidth ? center : number$1)(scale.copy()),
          selection = context.selection ? context.selection() : context,
          path = selection.selectAll(".domain").data([null]),
          tick = selection.selectAll(".tick").data(values, scale).order(),
          tickExit = tick.exit(),
          tickEnter = tick.enter().append("g").attr("class", "tick"),
          line = tick.select("line"),
          text = tick.select("text");

      path = path.merge(path.enter().insert("path", ".tick")
          .attr("class", "domain")
          .attr("stroke", "currentColor"));

      tick = tick.merge(tickEnter);

      line = line.merge(tickEnter.append("line")
          .attr("stroke", "currentColor")
          .attr(x + "2", k * tickSizeInner));

      text = text.merge(tickEnter.append("text")
          .attr("fill", "currentColor")
          .attr(x, k * spacing)
          .attr("dy", orient === top ? "0em" : orient === bottom ? "0.71em" : "0.32em"));

      if (context !== selection) {
        path = path.transition(context);
        tick = tick.transition(context);
        line = line.transition(context);
        text = text.transition(context);

        tickExit = tickExit.transition(context)
            .attr("opacity", epsilon)
            .attr("transform", function(d) { return isFinite(d = position(d)) ? transform(d) : this.getAttribute("transform"); });

        tickEnter
            .attr("opacity", epsilon)
            .attr("transform", function(d) { var p = this.parentNode.__axis; return transform(p && isFinite(p = p(d)) ? p : position(d)); });
      }

      tickExit.remove();

      path
          .attr("d", orient === left || orient == right
              ? (tickSizeOuter ? "M" + k * tickSizeOuter + "," + range0 + "H0.5V" + range1 + "H" + k * tickSizeOuter : "M0.5," + range0 + "V" + range1)
              : (tickSizeOuter ? "M" + range0 + "," + k * tickSizeOuter + "V0.5H" + range1 + "V" + k * tickSizeOuter : "M" + range0 + ",0.5H" + range1));

      tick
          .attr("opacity", 1)
          .attr("transform", function(d) { return transform(position(d)); });

      line
          .attr(x + "2", k * tickSizeInner);

      text
          .attr(x, k * spacing)
          .text(format);

      selection.filter(entering)
          .attr("fill", "none")
          .attr("font-size", 10)
          .attr("font-family", "sans-serif")
          .attr("text-anchor", orient === right ? "start" : orient === left ? "end" : "middle");

      selection
          .each(function() { this.__axis = position; });
    }

    axis.scale = function(_) {
      return arguments.length ? (scale = _, axis) : scale;
    };

    axis.ticks = function() {
      return tickArguments = slice.call(arguments), axis;
    };

    axis.tickArguments = function(_) {
      return arguments.length ? (tickArguments = _ == null ? [] : slice.call(_), axis) : tickArguments.slice();
    };

    axis.tickValues = function(_) {
      return arguments.length ? (tickValues = _ == null ? null : slice.call(_), axis) : tickValues && tickValues.slice();
    };

    axis.tickFormat = function(_) {
      return arguments.length ? (tickFormat = _, axis) : tickFormat;
    };

    axis.tickSize = function(_) {
      return arguments.length ? (tickSizeInner = tickSizeOuter = +_, axis) : tickSizeInner;
    };

    axis.tickSizeInner = function(_) {
      return arguments.length ? (tickSizeInner = +_, axis) : tickSizeInner;
    };

    axis.tickSizeOuter = function(_) {
      return arguments.length ? (tickSizeOuter = +_, axis) : tickSizeOuter;
    };

    axis.tickPadding = function(_) {
      return arguments.length ? (tickPadding = +_, axis) : tickPadding;
    };

    return axis;
  }

  function axisBottom(scale) {
    return axis(bottom, scale);
  }

  function axisLeft(scale) {
    return axis(left, scale);
  }

  function initRange(domain, range) {
    switch (arguments.length) {
      case 0: break;
      case 1: this.range(domain); break;
      default: this.range(range).domain(domain); break;
    }
    return this;
  }

  const implicit = Symbol("implicit");

  function ordinal() {
    var index = new Map(),
        domain = [],
        range = [],
        unknown = implicit;

    function scale(d) {
      var key = d + "", i = index.get(key);
      if (!i) {
        if (unknown !== implicit) return unknown;
        index.set(key, i = domain.push(d));
      }
      return range[(i - 1) % range.length];
    }

    scale.domain = function(_) {
      if (!arguments.length) return domain.slice();
      domain = [], index = new Map();
      for (const value of _) {
        const key = value + "";
        if (index.has(key)) continue;
        index.set(key, domain.push(value));
      }
      return scale;
    };

    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), scale) : range.slice();
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    scale.copy = function() {
      return ordinal(domain, range).unknown(unknown);
    };

    initRange.apply(scale, arguments);

    return scale;
  }

  function band() {
    var scale = ordinal().unknown(undefined),
        domain = scale.domain,
        ordinalRange = scale.range,
        r0 = 0,
        r1 = 1,
        step,
        bandwidth,
        round = false,
        paddingInner = 0,
        paddingOuter = 0,
        align = 0.5;

    delete scale.unknown;

    function rescale() {
      var n = domain().length,
          reverse = r1 < r0,
          start = reverse ? r1 : r0,
          stop = reverse ? r0 : r1;
      step = (stop - start) / Math.max(1, n - paddingInner + paddingOuter * 2);
      if (round) step = Math.floor(step);
      start += (stop - start - step * (n - paddingInner)) * align;
      bandwidth = step * (1 - paddingInner);
      if (round) start = Math.round(start), bandwidth = Math.round(bandwidth);
      var values = sequence(n).map(function(i) { return start + step * i; });
      return ordinalRange(reverse ? values.reverse() : values);
    }

    scale.domain = function(_) {
      return arguments.length ? (domain(_), rescale()) : domain();
    };

    scale.range = function(_) {
      return arguments.length ? ([r0, r1] = _, r0 = +r0, r1 = +r1, rescale()) : [r0, r1];
    };

    scale.rangeRound = function(_) {
      return [r0, r1] = _, r0 = +r0, r1 = +r1, round = true, rescale();
    };

    scale.bandwidth = function() {
      return bandwidth;
    };

    scale.step = function() {
      return step;
    };

    scale.round = function(_) {
      return arguments.length ? (round = !!_, rescale()) : round;
    };

    scale.padding = function(_) {
      return arguments.length ? (paddingInner = Math.min(1, paddingOuter = +_), rescale()) : paddingInner;
    };

    scale.paddingInner = function(_) {
      return arguments.length ? (paddingInner = Math.min(1, _), rescale()) : paddingInner;
    };

    scale.paddingOuter = function(_) {
      return arguments.length ? (paddingOuter = +_, rescale()) : paddingOuter;
    };

    scale.align = function(_) {
      return arguments.length ? (align = Math.max(0, Math.min(1, _)), rescale()) : align;
    };

    scale.copy = function() {
      return band(domain(), [r0, r1])
          .round(round)
          .paddingInner(paddingInner)
          .paddingOuter(paddingOuter)
          .align(align);
    };

    return initRange.apply(rescale(), arguments);
  }

  function pointish(scale) {
    var copy = scale.copy;

    scale.padding = scale.paddingOuter;
    delete scale.paddingInner;
    delete scale.paddingOuter;

    scale.copy = function() {
      return pointish(copy());
    };

    return scale;
  }

  function point() {
    return pointish(band.apply(null, arguments).paddingInner(1));
  }

  function constant$4(x) {
    return function() {
      return x;
    };
  }

  function number$2(x) {
    return +x;
  }

  var unit = [0, 1];

  function identity$3(x) {
    return x;
  }

  function normalize(a, b) {
    return (b -= (a = +a))
        ? function(x) { return (x - a) / b; }
        : constant$4(isNaN(b) ? NaN : 0.5);
  }

  function clamper(a, b) {
    var t;
    if (a > b) t = a, a = b, b = t;
    return function(x) { return Math.max(a, Math.min(b, x)); };
  }

  // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
  // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
  function bimap(domain, range, interpolate) {
    var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
    if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
    else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
    return function(x) { return r0(d0(x)); };
  }

  function polymap(domain, range, interpolate) {
    var j = Math.min(domain.length, range.length) - 1,
        d = new Array(j),
        r = new Array(j),
        i = -1;

    // Reverse descending domains.
    if (domain[j] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }

    while (++i < j) {
      d[i] = normalize(domain[i], domain[i + 1]);
      r[i] = interpolate(range[i], range[i + 1]);
    }

    return function(x) {
      var i = bisectRight(domain, x, 1, j) - 1;
      return r[i](d[i](x));
    };
  }

  function copy(source, target) {
    return target
        .domain(source.domain())
        .range(source.range())
        .interpolate(source.interpolate())
        .clamp(source.clamp())
        .unknown(source.unknown());
  }

  function transformer() {
    var domain = unit,
        range = unit,
        interpolate = interpolateValue,
        transform,
        untransform,
        unknown,
        clamp = identity$3,
        piecewise,
        output,
        input;

    function rescale() {
      var n = Math.min(domain.length, range.length);
      if (clamp !== identity$3) clamp = clamper(domain[0], domain[n - 1]);
      piecewise = n > 2 ? polymap : bimap;
      output = input = null;
      return scale;
    }

    function scale(x) {
      return isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate)))(transform(clamp(x)));
    }

    scale.invert = function(y) {
      return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
    };

    scale.domain = function(_) {
      return arguments.length ? (domain = Array.from(_, number$2), rescale()) : domain.slice();
    };

    scale.range = function(_) {
      return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
    };

    scale.rangeRound = function(_) {
      return range = Array.from(_), interpolate = interpolateRound, rescale();
    };

    scale.clamp = function(_) {
      return arguments.length ? (clamp = _ ? true : identity$3, rescale()) : clamp !== identity$3;
    };

    scale.interpolate = function(_) {
      return arguments.length ? (interpolate = _, rescale()) : interpolate;
    };

    scale.unknown = function(_) {
      return arguments.length ? (unknown = _, scale) : unknown;
    };

    return function(t, u) {
      transform = t, untransform = u;
      return rescale();
    };
  }

  function continuous() {
    return transformer()(identity$3, identity$3);
  }

  function tickFormat(start, stop, count, specifier) {
    var step = tickStep(start, stop, count),
        precision;
    specifier = formatSpecifier(specifier == null ? ",f" : specifier);
    switch (specifier.type) {
      case "s": {
        var value = Math.max(Math.abs(start), Math.abs(stop));
        if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
        return formatPrefix(specifier, value);
      }
      case "":
      case "e":
      case "g":
      case "p":
      case "r": {
        if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
        break;
      }
      case "f":
      case "%": {
        if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
        break;
      }
    }
    return format(specifier);
  }

  function linearish(scale) {
    var domain = scale.domain;

    scale.ticks = function(count) {
      var d = domain();
      return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
    };

    scale.tickFormat = function(count, specifier) {
      var d = domain();
      return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
    };

    scale.nice = function(count) {
      if (count == null) count = 10;

      var d = domain(),
          i0 = 0,
          i1 = d.length - 1,
          start = d[i0],
          stop = d[i1],
          step;

      if (stop < start) {
        step = start, start = stop, stop = step;
        step = i0, i0 = i1, i1 = step;
      }

      step = tickIncrement(start, stop, count);

      if (step > 0) {
        start = Math.floor(start / step) * step;
        stop = Math.ceil(stop / step) * step;
        step = tickIncrement(start, stop, count);
      } else if (step < 0) {
        start = Math.ceil(start * step) / step;
        stop = Math.floor(stop * step) / step;
        step = tickIncrement(start, stop, count);
      }

      if (step > 0) {
        d[i0] = Math.floor(start / step) * step;
        d[i1] = Math.ceil(stop / step) * step;
        domain(d);
      } else if (step < 0) {
        d[i0] = Math.ceil(start * step) / step;
        d[i1] = Math.floor(stop * step) / step;
        domain(d);
      }

      return scale;
    };

    return scale;
  }

  function linear$1() {
    var scale = continuous();

    scale.copy = function() {
      return copy(scale, linear$1());
    };

    initRange.apply(scale, arguments);

    return linearish(scale);
  }

  function nice(domain, interval) {
    domain = domain.slice();

    var i0 = 0,
        i1 = domain.length - 1,
        x0 = domain[i0],
        x1 = domain[i1],
        t;

    if (x1 < x0) {
      t = i0, i0 = i1, i1 = t;
      t = x0, x0 = x1, x1 = t;
    }

    domain[i0] = interval.floor(x0);
    domain[i1] = interval.ceil(x1);
    return domain;
  }

  function transformPow(exponent) {
    return function(x) {
      return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
    };
  }

  function transformSqrt(x) {
    return x < 0 ? -Math.sqrt(-x) : Math.sqrt(x);
  }

  function transformSquare(x) {
    return x < 0 ? -x * x : x * x;
  }

  function powish(transform) {
    var scale = transform(identity$3, identity$3),
        exponent = 1;

    function rescale() {
      return exponent === 1 ? transform(identity$3, identity$3)
          : exponent === 0.5 ? transform(transformSqrt, transformSquare)
          : transform(transformPow(exponent), transformPow(1 / exponent));
    }

    scale.exponent = function(_) {
      return arguments.length ? (exponent = +_, rescale()) : exponent;
    };

    return linearish(scale);
  }

  function pow() {
    var scale = powish(transformer());

    scale.copy = function() {
      return copy(scale, pow()).exponent(scale.exponent());
    };

    initRange.apply(scale, arguments);

    return scale;
  }

  function sqrt() {
    return pow.apply(null, arguments).exponent(0.5);
  }

  var durationSecond$1 = 1000,
      durationMinute$1 = durationSecond$1 * 60,
      durationHour$1 = durationMinute$1 * 60,
      durationDay$1 = durationHour$1 * 24,
      durationWeek$1 = durationDay$1 * 7,
      durationMonth = durationDay$1 * 30,
      durationYear = durationDay$1 * 365;

  function date$2(t) {
    return new Date(t);
  }

  function number$3(t) {
    return t instanceof Date ? +t : +new Date(+t);
  }

  function calendar(year, month, week, day, hour, minute, second, millisecond, format) {
    var scale = continuous(),
        invert = scale.invert,
        domain = scale.domain;

    var formatMillisecond = format(".%L"),
        formatSecond = format(":%S"),
        formatMinute = format("%I:%M"),
        formatHour = format("%I %p"),
        formatDay = format("%a %d"),
        formatWeek = format("%b %d"),
        formatMonth = format("%B"),
        formatYear = format("%Y");

    var tickIntervals = [
      [second,  1,      durationSecond$1],
      [second,  5,  5 * durationSecond$1],
      [second, 15, 15 * durationSecond$1],
      [second, 30, 30 * durationSecond$1],
      [minute,  1,      durationMinute$1],
      [minute,  5,  5 * durationMinute$1],
      [minute, 15, 15 * durationMinute$1],
      [minute, 30, 30 * durationMinute$1],
      [  hour,  1,      durationHour$1  ],
      [  hour,  3,  3 * durationHour$1  ],
      [  hour,  6,  6 * durationHour$1  ],
      [  hour, 12, 12 * durationHour$1  ],
      [   day,  1,      durationDay$1   ],
      [   day,  2,  2 * durationDay$1   ],
      [  week,  1,      durationWeek$1  ],
      [ month,  1,      durationMonth ],
      [ month,  3,  3 * durationMonth ],
      [  year,  1,      durationYear  ]
    ];

    function tickFormat(date) {
      return (second(date) < date ? formatMillisecond
          : minute(date) < date ? formatSecond
          : hour(date) < date ? formatMinute
          : day(date) < date ? formatHour
          : month(date) < date ? (week(date) < date ? formatDay : formatWeek)
          : year(date) < date ? formatMonth
          : formatYear)(date);
    }

    function tickInterval(interval, start, stop) {
      if (interval == null) interval = 10;

      // If a desired tick count is specified, pick a reasonable tick interval
      // based on the extent of the domain and a rough estimate of tick size.
      // Otherwise, assume interval is already a time interval and use it.
      if (typeof interval === "number") {
        var target = Math.abs(stop - start) / interval,
            i = bisector(function(i) { return i[2]; }).right(tickIntervals, target),
            step;
        if (i === tickIntervals.length) {
          step = tickStep(start / durationYear, stop / durationYear, interval);
          interval = year;
        } else if (i) {
          i = tickIntervals[target / tickIntervals[i - 1][2] < tickIntervals[i][2] / target ? i - 1 : i];
          step = i[1];
          interval = i[0];
        } else {
          step = Math.max(tickStep(start, stop, interval), 1);
          interval = millisecond;
        }
        return interval.every(step);
      }

      return interval;
    }

    scale.invert = function(y) {
      return new Date(invert(y));
    };

    scale.domain = function(_) {
      return arguments.length ? domain(Array.from(_, number$3)) : domain().map(date$2);
    };

    scale.ticks = function(interval) {
      var d = domain(),
          t0 = d[0],
          t1 = d[d.length - 1],
          r = t1 < t0,
          t;
      if (r) t = t0, t0 = t1, t1 = t;
      t = tickInterval(interval, t0, t1);
      t = t ? t.range(t0, t1 + 1) : []; // inclusive stop
      return r ? t.reverse() : t;
    };

    scale.tickFormat = function(count, specifier) {
      return specifier == null ? tickFormat : format(specifier);
    };

    scale.nice = function(interval) {
      var d = domain();
      return (interval = tickInterval(interval, d[0], d[d.length - 1]))
          ? domain(nice(d, interval))
          : scale;
    };

    scale.copy = function() {
      return copy(scale, calendar(year, month, week, day, hour, minute, second, millisecond, format));
    };

    return scale;
  }

  function scaleUtc() {
    return initRange.apply(calendar(utcYear, utcMonth, utcSunday, utcDay, utcHour, utcMinute, second, millisecond, utcFormat).domain([Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2)]), arguments);
  }

  /* The base class for all charts.
   *
   * Provides the following methods:
   *
   * - setHeight(num): set the height of the chart, accounting for margins.
   * - setWidth(num): set the width of the chart, accounting for margins.
   * - set(property, value): set the given property of the chart class to value.
   *
   * Charts should implement the following methods:
   *
   *  - constructor(svg): Initialise the chart, prepare for drawing it to the
   *    given <svg> (which is a d3-selection).
   *  - draw(data): Draw the chart for the given data.
   *  - update(): Update the chart (after resize, toggling, etc)
   */
  class BaseChart {
      constructor(svg) {
          svg.setAttribute("class", "");
          svg.innerHTML = "";
          this.svg = svg;
          this.margin = {
              top: 10,
              right: 10,
              bottom: 30,
              left: 40,
          };
          this.outerHeight = 300;
          this.height = this.outerHeight - this.margin.top - this.margin.bottom;
          this.outerWidth = 500;
          this.width = this.outerWidth - this.margin.left - this.margin.right;
      }
      setHeight(d) {
          this.svg.setAttribute("height", `${d}`);
          this.outerHeight = d;
          this.height = d - this.margin.top - this.margin.bottom;
          return this;
      }
      setWidth(d) {
          this.svg.setAttribute("width", `${d}`);
          this.outerWidth = d;
          this.width = d - this.margin.left - this.margin.right;
          return this;
      }
      set(property, value) {
          this[property] = value;
          return this;
      }
  }

  const NO_MARGINS = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
  };
  function setTimeFilter(date) {
      filters.update(fs => {
          fs.time = currentTimeFilterDateFormat(date);
          return fs;
      });
  }
  /*
   * Generate an array of colors.
   *
   * Uses the HCL color space in an attempt to generate colours that are
   * to be perceived to be of the same brightness.
   */
  function hclColorRange(count, chroma = 45, lightness = 70) {
      const offset = 270;
      const delta = 360 / count;
      const colors = [...Array(count).keys()].map(index => {
          const hue = (index * delta + offset) % 360;
          return hcl(hue, chroma, lightness);
      });
      return colors;
  }
  const colors10 = hclColorRange(10).map(c => c.toString());
  const colors15 = hclColorRange(15, 30, 80).map(c => c.toString());
  /*
   * The color scales for the charts.
   *
   * The scales for treemap and sunburst charts will be initialised with all
   * accounts on page init and currencies with all commodities.
   */
  const scales = {
      treemap: ordinal(colors15),
      sunburst: ordinal(colors10),
      currencies: ordinal(colors10),
      scatterplot: ordinal(colors10),
  };

  const tooltip = select$1(document.body)
      .append("div")
      .attr("class", "tooltip");
  // Add a tooltip to the given selection.
  function addTooltip(selection, tooltipText) {
      selection
          .on("mouseenter", (d) => {
          tooltip.style("opacity", 1).html(tooltipText(d));
      })
          .on("mousemove", () => {
          tooltip
              .style("left", `${event.pageX}px`)
              .style("top", `${event.pageY - 15}px`);
      })
          .on("mouseleave", () => {
          tooltip.style("opacity", 0);
      });
  }
  e.on("page-loaded", () => {
      tooltip.style("opacity", 0);
  });

  const maxColumnWidth = 100;
  class BarChart extends BaseChart {
      constructor(svg) {
          super(svg);
          this.x0 = band().padding(0.1);
          this.x1 = band();
          this.y = linear$1();
          this.xAxis = axisBottom(this.x0).tickSizeOuter(0);
          this.yAxis = axisLeft(this.y).tickFormat(formatCurrencyShort);
          this.svg.setAttribute("class", "barchart");
          this.canvas = select$1(this.svg)
              .classed("barchart", true)
              .append("g");
          this.xAxisSelection = this.canvas.append("g").attr("class", "x axis");
          this.yAxisSelection = this.canvas.append("g").attr("class", "y axis");
          this.groups = this.canvas.selectAll(".group");
          this.groupboxes = this.groups.append("rect");
          this.axisgroupboxes = this.groups.append("rect");
          this.bars = this.groups.selectAll(".bar");
          this.budgets = this.groups.selectAll(".budget");
      }
      draw(data) {
          this.x0.domain(data.map(d => d.label));
          this.x1.domain(data[0].values.map(d => d.name));
          this.y.domain([
              Math.min(0, min(data, d => min(d.values, x => x.value)) || 0),
              Math.max(0, max(data, d => max(d.values, x => x.value)) || 0),
          ]);
          this.groups = this.canvas
              .selectAll(".group")
              .data(data)
              .enter()
              .append("g")
              .attr("class", "group")
              .call(addTooltip, this.tooltipText);
          this.groupboxes = this.groups.append("rect").attr("class", "group-box");
          this.axisgroupboxes = this.groups
              .append("rect")
              .on("click", d => {
              setTimeFilter(d.date);
          })
              .attr("class", "axis-group-box");
          this.bars = this.groups
              .selectAll(".bar")
              .data(d => d.values)
              .enter()
              .append("rect")
              .attr("class", "bar")
              .style("fill", d => scales.currencies(d.name));
          this.budgets = this.groups
              .selectAll(".budget")
              .data(d => d.values)
              .enter()
              .append("rect")
              .attr("class", "budget");
          this.update();
          return this;
      }
      update() {
          const screenWidth = this.width;
          const maxWidth = this.groups.size() * maxColumnWidth;
          const offset = this.margin.left + Math.max(0, screenWidth - maxWidth) / 2;
          this.width = Math.min(screenWidth, maxWidth);
          this.setHeight(250);
          this.y.range([this.height, 0]);
          this.x0.range([0, this.width]);
          this.x1.range([0, this.x0.bandwidth()]);
          this.canvas.attr("transform", `translate(${offset},${this.margin.top})`);
          this.yAxis.tickSize(-this.width);
          this.xAxisSelection.attr("transform", `translate(0,${this.height})`);
          this.xAxis.tickValues(this.filterTicks(this.x0.domain()));
          this.xAxisSelection.call(this.xAxis);
          this.yAxisSelection.call(this.yAxis);
          this.groups.attr("transform", d => `translate(${this.x0(d.label)},0)`);
          this.groupboxes
              .attr("width", this.x0.bandwidth())
              .attr("height", this.height);
          this.axisgroupboxes
              .attr("width", this.x0.bandwidth())
              .attr("height", this.margin.bottom)
              .attr("transform", `translate(0,${this.height})`);
          this.budgets
              .attr("width", this.x1.bandwidth())
              .attr("x", d => this.x1(d.name) || 0)
              .attr("y", d => this.y(Math.max(0, d.budget)))
              .attr("height", d => Math.abs(this.y(d.budget) - this.y(0)));
          this.bars
              .attr("width", this.x1.bandwidth())
              .attr("x", d => this.x1(d.name) || 0)
              .attr("y", d => this.y(Math.max(0, d.value)))
              .attr("height", d => Math.abs(this.y(d.value) - this.y(0)));
          this.legend = {
              domain: this.x1.domain(),
              scale: scales.currencies,
          };
      }
      filterTicks(domain) {
          const labelsCount = this.width / 70;
          if (domain.length <= labelsCount) {
              return domain;
          }
          const showIndices = Math.ceil(domain.length / labelsCount);
          return domain.filter((d, i) => i % showIndices === 0);
      }
  }

  var pi = Math.PI,
      tau = 2 * pi,
      epsilon$1 = 1e-6,
      tauEpsilon = tau - epsilon$1;

  function Path() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null; // end of current subpath
    this._ = "";
  }

  function path() {
    return new Path;
  }

  Path.prototype = path.prototype = {
    constructor: Path,
    moveTo: function(x, y) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y);
    },
    closePath: function() {
      if (this._x1 !== null) {
        this._x1 = this._x0, this._y1 = this._y0;
        this._ += "Z";
      }
    },
    lineTo: function(x, y) {
      this._ += "L" + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    quadraticCurveTo: function(x1, y1, x, y) {
      this._ += "Q" + (+x1) + "," + (+y1) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    bezierCurveTo: function(x1, y1, x2, y2, x, y) {
      this._ += "C" + (+x1) + "," + (+y1) + "," + (+x2) + "," + (+y2) + "," + (this._x1 = +x) + "," + (this._y1 = +y);
    },
    arcTo: function(x1, y1, x2, y2, r) {
      x1 = +x1, y1 = +y1, x2 = +x2, y2 = +y2, r = +r;
      var x0 = this._x1,
          y0 = this._y1,
          x21 = x2 - x1,
          y21 = y2 - y1,
          x01 = x0 - x1,
          y01 = y0 - y1,
          l01_2 = x01 * x01 + y01 * y01;

      // Is the radius negative? Error.
      if (r < 0) throw new Error("negative radius: " + r);

      // Is this path empty? Move to (x1,y1).
      if (this._x1 === null) {
        this._ += "M" + (this._x1 = x1) + "," + (this._y1 = y1);
      }

      // Or, is (x1,y1) coincident with (x0,y0)? Do nothing.
      else if (!(l01_2 > epsilon$1));

      // Or, are (x0,y0), (x1,y1) and (x2,y2) collinear?
      // Equivalently, is (x1,y1) coincident with (x2,y2)?
      // Or, is the radius zero? Line to (x1,y1).
      else if (!(Math.abs(y01 * x21 - y21 * x01) > epsilon$1) || !r) {
        this._ += "L" + (this._x1 = x1) + "," + (this._y1 = y1);
      }

      // Otherwise, draw an arc!
      else {
        var x20 = x2 - x0,
            y20 = y2 - y0,
            l21_2 = x21 * x21 + y21 * y21,
            l20_2 = x20 * x20 + y20 * y20,
            l21 = Math.sqrt(l21_2),
            l01 = Math.sqrt(l01_2),
            l = r * Math.tan((pi - Math.acos((l21_2 + l01_2 - l20_2) / (2 * l21 * l01))) / 2),
            t01 = l / l01,
            t21 = l / l21;

        // If the start tangent is not coincident with (x0,y0), line to.
        if (Math.abs(t01 - 1) > epsilon$1) {
          this._ += "L" + (x1 + t01 * x01) + "," + (y1 + t01 * y01);
        }

        this._ += "A" + r + "," + r + ",0,0," + (+(y01 * x20 > x01 * y20)) + "," + (this._x1 = x1 + t21 * x21) + "," + (this._y1 = y1 + t21 * y21);
      }
    },
    arc: function(x, y, r, a0, a1, ccw) {
      x = +x, y = +y, r = +r;
      var dx = r * Math.cos(a0),
          dy = r * Math.sin(a0),
          x0 = x + dx,
          y0 = y + dy,
          cw = 1 ^ ccw,
          da = ccw ? a0 - a1 : a1 - a0;

      // Is the radius negative? Error.
      if (r < 0) throw new Error("negative radius: " + r);

      // Is this path empty? Move to (x0,y0).
      if (this._x1 === null) {
        this._ += "M" + x0 + "," + y0;
      }

      // Or, is (x0,y0) not coincident with the previous point? Line to (x0,y0).
      else if (Math.abs(this._x1 - x0) > epsilon$1 || Math.abs(this._y1 - y0) > epsilon$1) {
        this._ += "L" + x0 + "," + y0;
      }

      // Is this arc empty? We’re done.
      if (!r) return;

      // Does the angle go the wrong way? Flip the direction.
      if (da < 0) da = da % tau + tau;

      // Is this a complete circle? Draw two arcs to complete the circle.
      if (da > tauEpsilon) {
        this._ += "A" + r + "," + r + ",0,1," + cw + "," + (x - dx) + "," + (y - dy) + "A" + r + "," + r + ",0,1," + cw + "," + (this._x1 = x0) + "," + (this._y1 = y0);
      }

      // Is this arc non-empty? Draw an arc!
      else if (da > epsilon$1) {
        this._ += "A" + r + "," + r + ",0," + (+(da >= pi)) + "," + cw + "," + (this._x1 = x + r * Math.cos(a1)) + "," + (this._y1 = y + r * Math.sin(a1));
      }
    },
    rect: function(x, y, w, h) {
      this._ += "M" + (this._x0 = this._x1 = +x) + "," + (this._y0 = this._y1 = +y) + "h" + (+w) + "v" + (+h) + "h" + (-w) + "Z";
    },
    toString: function() {
      return this._;
    }
  };

  function constant$5(x) {
    return function constant() {
      return x;
    };
  }

  var abs = Math.abs;
  var atan2 = Math.atan2;
  var cos = Math.cos;
  var max$1 = Math.max;
  var min$1 = Math.min;
  var sin = Math.sin;
  var sqrt$1 = Math.sqrt;

  var epsilon$2 = 1e-12;
  var pi$1 = Math.PI;
  var halfPi = pi$1 / 2;
  var tau$1 = 2 * pi$1;

  function acos(x) {
    return x > 1 ? 0 : x < -1 ? pi$1 : Math.acos(x);
  }

  function asin(x) {
    return x >= 1 ? halfPi : x <= -1 ? -halfPi : Math.asin(x);
  }

  function arcInnerRadius(d) {
    return d.innerRadius;
  }

  function arcOuterRadius(d) {
    return d.outerRadius;
  }

  function arcStartAngle(d) {
    return d.startAngle;
  }

  function arcEndAngle(d) {
    return d.endAngle;
  }

  function arcPadAngle(d) {
    return d && d.padAngle; // Note: optional!
  }

  function intersect(x0, y0, x1, y1, x2, y2, x3, y3) {
    var x10 = x1 - x0, y10 = y1 - y0,
        x32 = x3 - x2, y32 = y3 - y2,
        t = y32 * x10 - x32 * y10;
    if (t * t < epsilon$2) return;
    t = (x32 * (y0 - y2) - y32 * (x0 - x2)) / t;
    return [x0 + t * x10, y0 + t * y10];
  }

  // Compute perpendicular offset line of length rc.
  // http://mathworld.wolfram.com/Circle-LineIntersection.html
  function cornerTangents(x0, y0, x1, y1, r1, rc, cw) {
    var x01 = x0 - x1,
        y01 = y0 - y1,
        lo = (cw ? rc : -rc) / sqrt$1(x01 * x01 + y01 * y01),
        ox = lo * y01,
        oy = -lo * x01,
        x11 = x0 + ox,
        y11 = y0 + oy,
        x10 = x1 + ox,
        y10 = y1 + oy,
        x00 = (x11 + x10) / 2,
        y00 = (y11 + y10) / 2,
        dx = x10 - x11,
        dy = y10 - y11,
        d2 = dx * dx + dy * dy,
        r = r1 - rc,
        D = x11 * y10 - x10 * y11,
        d = (dy < 0 ? -1 : 1) * sqrt$1(max$1(0, r * r * d2 - D * D)),
        cx0 = (D * dy - dx * d) / d2,
        cy0 = (-D * dx - dy * d) / d2,
        cx1 = (D * dy + dx * d) / d2,
        cy1 = (-D * dx + dy * d) / d2,
        dx0 = cx0 - x00,
        dy0 = cy0 - y00,
        dx1 = cx1 - x00,
        dy1 = cy1 - y00;

    // Pick the closer of the two intersection points.
    // TODO Is there a faster way to determine which intersection to use?
    if (dx0 * dx0 + dy0 * dy0 > dx1 * dx1 + dy1 * dy1) cx0 = cx1, cy0 = cy1;

    return {
      cx: cx0,
      cy: cy0,
      x01: -ox,
      y01: -oy,
      x11: cx0 * (r1 / r - 1),
      y11: cy0 * (r1 / r - 1)
    };
  }

  function arc() {
    var innerRadius = arcInnerRadius,
        outerRadius = arcOuterRadius,
        cornerRadius = constant$5(0),
        padRadius = null,
        startAngle = arcStartAngle,
        endAngle = arcEndAngle,
        padAngle = arcPadAngle,
        context = null;

    function arc() {
      var buffer,
          r,
          r0 = +innerRadius.apply(this, arguments),
          r1 = +outerRadius.apply(this, arguments),
          a0 = startAngle.apply(this, arguments) - halfPi,
          a1 = endAngle.apply(this, arguments) - halfPi,
          da = abs(a1 - a0),
          cw = a1 > a0;

      if (!context) context = buffer = path();

      // Ensure that the outer radius is always larger than the inner radius.
      if (r1 < r0) r = r1, r1 = r0, r0 = r;

      // Is it a point?
      if (!(r1 > epsilon$2)) context.moveTo(0, 0);

      // Or is it a circle or annulus?
      else if (da > tau$1 - epsilon$2) {
        context.moveTo(r1 * cos(a0), r1 * sin(a0));
        context.arc(0, 0, r1, a0, a1, !cw);
        if (r0 > epsilon$2) {
          context.moveTo(r0 * cos(a1), r0 * sin(a1));
          context.arc(0, 0, r0, a1, a0, cw);
        }
      }

      // Or is it a circular or annular sector?
      else {
        var a01 = a0,
            a11 = a1,
            a00 = a0,
            a10 = a1,
            da0 = da,
            da1 = da,
            ap = padAngle.apply(this, arguments) / 2,
            rp = (ap > epsilon$2) && (padRadius ? +padRadius.apply(this, arguments) : sqrt$1(r0 * r0 + r1 * r1)),
            rc = min$1(abs(r1 - r0) / 2, +cornerRadius.apply(this, arguments)),
            rc0 = rc,
            rc1 = rc,
            t0,
            t1;

        // Apply padding? Note that since r1 ≥ r0, da1 ≥ da0.
        if (rp > epsilon$2) {
          var p0 = asin(rp / r0 * sin(ap)),
              p1 = asin(rp / r1 * sin(ap));
          if ((da0 -= p0 * 2) > epsilon$2) p0 *= (cw ? 1 : -1), a00 += p0, a10 -= p0;
          else da0 = 0, a00 = a10 = (a0 + a1) / 2;
          if ((da1 -= p1 * 2) > epsilon$2) p1 *= (cw ? 1 : -1), a01 += p1, a11 -= p1;
          else da1 = 0, a01 = a11 = (a0 + a1) / 2;
        }

        var x01 = r1 * cos(a01),
            y01 = r1 * sin(a01),
            x10 = r0 * cos(a10),
            y10 = r0 * sin(a10);

        // Apply rounded corners?
        if (rc > epsilon$2) {
          var x11 = r1 * cos(a11),
              y11 = r1 * sin(a11),
              x00 = r0 * cos(a00),
              y00 = r0 * sin(a00),
              oc;

          // Restrict the corner radius according to the sector angle.
          if (da < pi$1 && (oc = intersect(x01, y01, x00, y00, x11, y11, x10, y10))) {
            var ax = x01 - oc[0],
                ay = y01 - oc[1],
                bx = x11 - oc[0],
                by = y11 - oc[1],
                kc = 1 / sin(acos((ax * bx + ay * by) / (sqrt$1(ax * ax + ay * ay) * sqrt$1(bx * bx + by * by))) / 2),
                lc = sqrt$1(oc[0] * oc[0] + oc[1] * oc[1]);
            rc0 = min$1(rc, (r0 - lc) / (kc - 1));
            rc1 = min$1(rc, (r1 - lc) / (kc + 1));
          }
        }

        // Is the sector collapsed to a line?
        if (!(da1 > epsilon$2)) context.moveTo(x01, y01);

        // Does the sector’s outer ring have rounded corners?
        else if (rc1 > epsilon$2) {
          t0 = cornerTangents(x00, y00, x01, y01, r1, rc1, cw);
          t1 = cornerTangents(x11, y11, x10, y10, r1, rc1, cw);

          context.moveTo(t0.cx + t0.x01, t0.cy + t0.y01);

          // Have the corners merged?
          if (rc1 < rc) context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);

          // Otherwise, draw the two corners and the ring.
          else {
            context.arc(t0.cx, t0.cy, rc1, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
            context.arc(0, 0, r1, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), !cw);
            context.arc(t1.cx, t1.cy, rc1, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
          }
        }

        // Or is the outer ring just a circular arc?
        else context.moveTo(x01, y01), context.arc(0, 0, r1, a01, a11, !cw);

        // Is there no inner ring, and it’s a circular sector?
        // Or perhaps it’s an annular sector collapsed due to padding?
        if (!(r0 > epsilon$2) || !(da0 > epsilon$2)) context.lineTo(x10, y10);

        // Does the sector’s inner ring (or point) have rounded corners?
        else if (rc0 > epsilon$2) {
          t0 = cornerTangents(x10, y10, x11, y11, r0, -rc0, cw);
          t1 = cornerTangents(x01, y01, x00, y00, r0, -rc0, cw);

          context.lineTo(t0.cx + t0.x01, t0.cy + t0.y01);

          // Have the corners merged?
          if (rc0 < rc) context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t1.y01, t1.x01), !cw);

          // Otherwise, draw the two corners and the ring.
          else {
            context.arc(t0.cx, t0.cy, rc0, atan2(t0.y01, t0.x01), atan2(t0.y11, t0.x11), !cw);
            context.arc(0, 0, r0, atan2(t0.cy + t0.y11, t0.cx + t0.x11), atan2(t1.cy + t1.y11, t1.cx + t1.x11), cw);
            context.arc(t1.cx, t1.cy, rc0, atan2(t1.y11, t1.x11), atan2(t1.y01, t1.x01), !cw);
          }
        }

        // Or is the inner ring just a circular arc?
        else context.arc(0, 0, r0, a10, a00, cw);
      }

      context.closePath();

      if (buffer) return context = null, buffer + "" || null;
    }

    arc.centroid = function() {
      var r = (+innerRadius.apply(this, arguments) + +outerRadius.apply(this, arguments)) / 2,
          a = (+startAngle.apply(this, arguments) + +endAngle.apply(this, arguments)) / 2 - pi$1 / 2;
      return [cos(a) * r, sin(a) * r];
    };

    arc.innerRadius = function(_) {
      return arguments.length ? (innerRadius = typeof _ === "function" ? _ : constant$5(+_), arc) : innerRadius;
    };

    arc.outerRadius = function(_) {
      return arguments.length ? (outerRadius = typeof _ === "function" ? _ : constant$5(+_), arc) : outerRadius;
    };

    arc.cornerRadius = function(_) {
      return arguments.length ? (cornerRadius = typeof _ === "function" ? _ : constant$5(+_), arc) : cornerRadius;
    };

    arc.padRadius = function(_) {
      return arguments.length ? (padRadius = _ == null ? null : typeof _ === "function" ? _ : constant$5(+_), arc) : padRadius;
    };

    arc.startAngle = function(_) {
      return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant$5(+_), arc) : startAngle;
    };

    arc.endAngle = function(_) {
      return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant$5(+_), arc) : endAngle;
    };

    arc.padAngle = function(_) {
      return arguments.length ? (padAngle = typeof _ === "function" ? _ : constant$5(+_), arc) : padAngle;
    };

    arc.context = function(_) {
      return arguments.length ? ((context = _ == null ? null : _), arc) : context;
    };

    return arc;
  }

  function Linear(context) {
    this._context = context;
  }

  Linear.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._point = 0;
    },
    lineEnd: function() {
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      x = +x, y = +y;
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; // proceed
        default: this._context.lineTo(x, y); break;
      }
    }
  };

  function curveLinear(context) {
    return new Linear(context);
  }

  function x(p) {
    return p[0];
  }

  function y(p) {
    return p[1];
  }

  function line() {
    var x$1 = x,
        y$1 = y,
        defined = constant$5(true),
        context = null,
        curve = curveLinear,
        output = null;

    function line(data) {
      var i,
          n = data.length,
          d,
          defined0 = false,
          buffer;

      if (context == null) output = curve(buffer = path());

      for (i = 0; i <= n; ++i) {
        if (!(i < n && defined(d = data[i], i, data)) === defined0) {
          if (defined0 = !defined0) output.lineStart();
          else output.lineEnd();
        }
        if (defined0) output.point(+x$1(d, i, data), +y$1(d, i, data));
      }

      if (buffer) return output = null, buffer + "" || null;
    }

    line.x = function(_) {
      return arguments.length ? (x$1 = typeof _ === "function" ? _ : constant$5(+_), line) : x$1;
    };

    line.y = function(_) {
      return arguments.length ? (y$1 = typeof _ === "function" ? _ : constant$5(+_), line) : y$1;
    };

    line.defined = function(_) {
      return arguments.length ? (defined = typeof _ === "function" ? _ : constant$5(!!_), line) : defined;
    };

    line.curve = function(_) {
      return arguments.length ? (curve = _, context != null && (output = curve(context)), line) : curve;
    };

    line.context = function(_) {
      return arguments.length ? (_ == null ? context = output = null : output = curve(context = _), line) : context;
    };

    return line;
  }

  function sign(x) {
    return x < 0 ? -1 : 1;
  }

  // Calculate the slopes of the tangents (Hermite-type interpolation) based on
  // the following paper: Steffen, M. 1990. A Simple Method for Monotonic
  // Interpolation in One Dimension. Astronomy and Astrophysics, Vol. 239, NO.
  // NOV(II), P. 443, 1990.
  function slope3(that, x2, y2) {
    var h0 = that._x1 - that._x0,
        h1 = x2 - that._x1,
        s0 = (that._y1 - that._y0) / (h0 || h1 < 0 && -0),
        s1 = (y2 - that._y1) / (h1 || h0 < 0 && -0),
        p = (s0 * h1 + s1 * h0) / (h0 + h1);
    return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
  }

  // Calculate a one-sided slope.
  function slope2(that, t) {
    var h = that._x1 - that._x0;
    return h ? (3 * (that._y1 - that._y0) / h - t) / 2 : t;
  }

  // According to https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Representations
  // "you can express cubic Hermite interpolation in terms of cubic Bézier curves
  // with respect to the four values p0, p0 + m0 / 3, p1 - m1 / 3, p1".
  function point$1(that, t0, t1) {
    var x0 = that._x0,
        y0 = that._y0,
        x1 = that._x1,
        y1 = that._y1,
        dx = (x1 - x0) / 3;
    that._context.bezierCurveTo(x0 + dx, y0 + dx * t0, x1 - dx, y1 - dx * t1, x1, y1);
  }

  function MonotoneX(context) {
    this._context = context;
  }

  MonotoneX.prototype = {
    areaStart: function() {
      this._line = 0;
    },
    areaEnd: function() {
      this._line = NaN;
    },
    lineStart: function() {
      this._x0 = this._x1 =
      this._y0 = this._y1 =
      this._t0 = NaN;
      this._point = 0;
    },
    lineEnd: function() {
      switch (this._point) {
        case 2: this._context.lineTo(this._x1, this._y1); break;
        case 3: point$1(this, this._t0, slope2(this, this._t0)); break;
      }
      if (this._line || (this._line !== 0 && this._point === 1)) this._context.closePath();
      this._line = 1 - this._line;
    },
    point: function(x, y) {
      var t1 = NaN;

      x = +x, y = +y;
      if (x === this._x1 && y === this._y1) return; // Ignore coincident points.
      switch (this._point) {
        case 0: this._point = 1; this._line ? this._context.lineTo(x, y) : this._context.moveTo(x, y); break;
        case 1: this._point = 2; break;
        case 2: this._point = 3; point$1(this, slope2(this, t1 = slope3(this, x, y)), t1); break;
        default: point$1(this, this._t0, t1 = slope3(this, x, y)); break;
      }

      this._x0 = this._x1, this._x1 = x;
      this._y0 = this._y1, this._y1 = y;
      this._t0 = t1;
    }
  };

  function MonotoneY(context) {
    this._context = new ReflectContext(context);
  }

  (MonotoneY.prototype = Object.create(MonotoneX.prototype)).point = function(x, y) {
    MonotoneX.prototype.point.call(this, y, x);
  };

  function ReflectContext(context) {
    this._context = context;
  }

  ReflectContext.prototype = {
    moveTo: function(x, y) { this._context.moveTo(y, x); },
    closePath: function() { this._context.closePath(); },
    lineTo: function(x, y) { this._context.lineTo(y, x); },
    bezierCurveTo: function(x1, y1, x2, y2, x, y) { this._context.bezierCurveTo(y1, x1, y2, x2, y, x); }
  };

  function tree_add(d) {
    var x = +this._x.call(null, d),
        y = +this._y.call(null, d);
    return add(this.cover(x, y), x, y, d);
  }

  function add(tree, x, y, d) {
    if (isNaN(x) || isNaN(y)) return tree; // ignore invalid points

    var parent,
        node = tree._root,
        leaf = {data: d},
        x0 = tree._x0,
        y0 = tree._y0,
        x1 = tree._x1,
        y1 = tree._y1,
        xm,
        ym,
        xp,
        yp,
        right,
        bottom,
        i,
        j;

    // If the tree is empty, initialize the root as a leaf.
    if (!node) return tree._root = leaf, tree;

    // Find the existing leaf for the new point, or add it.
    while (node.length) {
      if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
      if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
      if (parent = node, !(node = node[i = bottom << 1 | right])) return parent[i] = leaf, tree;
    }

    // Is the new point is exactly coincident with the existing point?
    xp = +tree._x.call(null, node.data);
    yp = +tree._y.call(null, node.data);
    if (x === xp && y === yp) return leaf.next = node, parent ? parent[i] = leaf : tree._root = leaf, tree;

    // Otherwise, split the leaf node until the old and new point are separated.
    do {
      parent = parent ? parent[i] = new Array(4) : tree._root = new Array(4);
      if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
      if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
    } while ((i = bottom << 1 | right) === (j = (yp >= ym) << 1 | (xp >= xm)));
    return parent[j] = node, parent[i] = leaf, tree;
  }

  function addAll(data) {
    var d, i, n = data.length,
        x,
        y,
        xz = new Array(n),
        yz = new Array(n),
        x0 = Infinity,
        y0 = Infinity,
        x1 = -Infinity,
        y1 = -Infinity;

    // Compute the points and their extent.
    for (i = 0; i < n; ++i) {
      if (isNaN(x = +this._x.call(null, d = data[i])) || isNaN(y = +this._y.call(null, d))) continue;
      xz[i] = x;
      yz[i] = y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }

    // If there were no (valid) points, abort.
    if (x0 > x1 || y0 > y1) return this;

    // Expand the tree to cover the new points.
    this.cover(x0, y0).cover(x1, y1);

    // Add the new points.
    for (i = 0; i < n; ++i) {
      add(this, xz[i], yz[i], data[i]);
    }

    return this;
  }

  function tree_cover(x, y) {
    if (isNaN(x = +x) || isNaN(y = +y)) return this; // ignore invalid points

    var x0 = this._x0,
        y0 = this._y0,
        x1 = this._x1,
        y1 = this._y1;

    // If the quadtree has no extent, initialize them.
    // Integer extent are necessary so that if we later double the extent,
    // the existing quadrant boundaries don’t change due to floating point error!
    if (isNaN(x0)) {
      x1 = (x0 = Math.floor(x)) + 1;
      y1 = (y0 = Math.floor(y)) + 1;
    }

    // Otherwise, double repeatedly to cover.
    else {
      var z = x1 - x0,
          node = this._root,
          parent,
          i;

      while (x0 > x || x >= x1 || y0 > y || y >= y1) {
        i = (y < y0) << 1 | (x < x0);
        parent = new Array(4), parent[i] = node, node = parent, z *= 2;
        switch (i) {
          case 0: x1 = x0 + z, y1 = y0 + z; break;
          case 1: x0 = x1 - z, y1 = y0 + z; break;
          case 2: x1 = x0 + z, y0 = y1 - z; break;
          case 3: x0 = x1 - z, y0 = y1 - z; break;
        }
      }

      if (this._root && this._root.length) this._root = node;
    }

    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x1;
    this._y1 = y1;
    return this;
  }

  function tree_data() {
    var data = [];
    this.visit(function(node) {
      if (!node.length) do data.push(node.data); while (node = node.next)
    });
    return data;
  }

  function tree_extent(_) {
    return arguments.length
        ? this.cover(+_[0][0], +_[0][1]).cover(+_[1][0], +_[1][1])
        : isNaN(this._x0) ? undefined : [[this._x0, this._y0], [this._x1, this._y1]];
  }

  function Quad(node, x0, y0, x1, y1) {
    this.node = node;
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
  }

  function tree_find(x, y, radius) {
    var data,
        x0 = this._x0,
        y0 = this._y0,
        x1,
        y1,
        x2,
        y2,
        x3 = this._x1,
        y3 = this._y1,
        quads = [],
        node = this._root,
        q,
        i;

    if (node) quads.push(new Quad(node, x0, y0, x3, y3));
    if (radius == null) radius = Infinity;
    else {
      x0 = x - radius, y0 = y - radius;
      x3 = x + radius, y3 = y + radius;
      radius *= radius;
    }

    while (q = quads.pop()) {

      // Stop searching if this quadrant can’t contain a closer node.
      if (!(node = q.node)
          || (x1 = q.x0) > x3
          || (y1 = q.y0) > y3
          || (x2 = q.x1) < x0
          || (y2 = q.y1) < y0) continue;

      // Bisect the current quadrant.
      if (node.length) {
        var xm = (x1 + x2) / 2,
            ym = (y1 + y2) / 2;

        quads.push(
          new Quad(node[3], xm, ym, x2, y2),
          new Quad(node[2], x1, ym, xm, y2),
          new Quad(node[1], xm, y1, x2, ym),
          new Quad(node[0], x1, y1, xm, ym)
        );

        // Visit the closest quadrant first.
        if (i = (y >= ym) << 1 | (x >= xm)) {
          q = quads[quads.length - 1];
          quads[quads.length - 1] = quads[quads.length - 1 - i];
          quads[quads.length - 1 - i] = q;
        }
      }

      // Visit this point. (Visiting coincident points isn’t necessary!)
      else {
        var dx = x - +this._x.call(null, node.data),
            dy = y - +this._y.call(null, node.data),
            d2 = dx * dx + dy * dy;
        if (d2 < radius) {
          var d = Math.sqrt(radius = d2);
          x0 = x - d, y0 = y - d;
          x3 = x + d, y3 = y + d;
          data = node.data;
        }
      }
    }

    return data;
  }

  function tree_remove(d) {
    if (isNaN(x = +this._x.call(null, d)) || isNaN(y = +this._y.call(null, d))) return this; // ignore invalid points

    var parent,
        node = this._root,
        retainer,
        previous,
        next,
        x0 = this._x0,
        y0 = this._y0,
        x1 = this._x1,
        y1 = this._y1,
        x,
        y,
        xm,
        ym,
        right,
        bottom,
        i,
        j;

    // If the tree is empty, initialize the root as a leaf.
    if (!node) return this;

    // Find the leaf node for the point.
    // While descending, also retain the deepest parent with a non-removed sibling.
    if (node.length) while (true) {
      if (right = x >= (xm = (x0 + x1) / 2)) x0 = xm; else x1 = xm;
      if (bottom = y >= (ym = (y0 + y1) / 2)) y0 = ym; else y1 = ym;
      if (!(parent = node, node = node[i = bottom << 1 | right])) return this;
      if (!node.length) break;
      if (parent[(i + 1) & 3] || parent[(i + 2) & 3] || parent[(i + 3) & 3]) retainer = parent, j = i;
    }

    // Find the point to remove.
    while (node.data !== d) if (!(previous = node, node = node.next)) return this;
    if (next = node.next) delete node.next;

    // If there are multiple coincident points, remove just the point.
    if (previous) return (next ? previous.next = next : delete previous.next), this;

    // If this is the root point, remove it.
    if (!parent) return this._root = next, this;

    // Remove this leaf.
    next ? parent[i] = next : delete parent[i];

    // If the parent now contains exactly one leaf, collapse superfluous parents.
    if ((node = parent[0] || parent[1] || parent[2] || parent[3])
        && node === (parent[3] || parent[2] || parent[1] || parent[0])
        && !node.length) {
      if (retainer) retainer[j] = node;
      else this._root = node;
    }

    return this;
  }

  function removeAll(data) {
    for (var i = 0, n = data.length; i < n; ++i) this.remove(data[i]);
    return this;
  }

  function tree_root() {
    return this._root;
  }

  function tree_size() {
    var size = 0;
    this.visit(function(node) {
      if (!node.length) do ++size; while (node = node.next)
    });
    return size;
  }

  function tree_visit(callback) {
    var quads = [], q, node = this._root, child, x0, y0, x1, y1;
    if (node) quads.push(new Quad(node, this._x0, this._y0, this._x1, this._y1));
    while (q = quads.pop()) {
      if (!callback(node = q.node, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1) && node.length) {
        var xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
        if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
        if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
        if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
        if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
      }
    }
    return this;
  }

  function tree_visitAfter(callback) {
    var quads = [], next = [], q;
    if (this._root) quads.push(new Quad(this._root, this._x0, this._y0, this._x1, this._y1));
    while (q = quads.pop()) {
      var node = q.node;
      if (node.length) {
        var child, x0 = q.x0, y0 = q.y0, x1 = q.x1, y1 = q.y1, xm = (x0 + x1) / 2, ym = (y0 + y1) / 2;
        if (child = node[0]) quads.push(new Quad(child, x0, y0, xm, ym));
        if (child = node[1]) quads.push(new Quad(child, xm, y0, x1, ym));
        if (child = node[2]) quads.push(new Quad(child, x0, ym, xm, y1));
        if (child = node[3]) quads.push(new Quad(child, xm, ym, x1, y1));
      }
      next.push(q);
    }
    while (q = next.pop()) {
      callback(q.node, q.x0, q.y0, q.x1, q.y1);
    }
    return this;
  }

  function defaultX(d) {
    return d[0];
  }

  function tree_x(_) {
    return arguments.length ? (this._x = _, this) : this._x;
  }

  function defaultY(d) {
    return d[1];
  }

  function tree_y(_) {
    return arguments.length ? (this._y = _, this) : this._y;
  }

  function quadtree(nodes, x, y) {
    var tree = new Quadtree(x == null ? defaultX : x, y == null ? defaultY : y, NaN, NaN, NaN, NaN);
    return nodes == null ? tree : tree.addAll(nodes);
  }

  function Quadtree(x, y, x0, y0, x1, y1) {
    this._x = x;
    this._y = y;
    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x1;
    this._y1 = y1;
    this._root = undefined;
  }

  function leaf_copy(leaf) {
    var copy = {data: leaf.data}, next = copy;
    while (leaf = leaf.next) next = next.next = {data: leaf.data};
    return copy;
  }

  var treeProto = quadtree.prototype = Quadtree.prototype;

  treeProto.copy = function() {
    var copy = new Quadtree(this._x, this._y, this._x0, this._y0, this._x1, this._y1),
        node = this._root,
        nodes,
        child;

    if (!node) return copy;

    if (!node.length) return copy._root = leaf_copy(node), copy;

    nodes = [{source: node, target: copy._root = new Array(4)}];
    while (node = nodes.pop()) {
      for (var i = 0; i < 4; ++i) {
        if (child = node.source[i]) {
          if (child.length) nodes.push({source: child, target: node.target[i] = new Array(4)});
          else node.target[i] = leaf_copy(child);
        }
      }
    }

    return copy;
  };

  treeProto.add = tree_add;
  treeProto.addAll = addAll;
  treeProto.cover = tree_cover;
  treeProto.data = tree_data;
  treeProto.extent = tree_extent;
  treeProto.find = tree_find;
  treeProto.remove = tree_remove;
  treeProto.removeAll = removeAll;
  treeProto.root = tree_root;
  treeProto.size = tree_size;
  treeProto.visit = tree_visit;
  treeProto.visitAfter = tree_visitAfter;
  treeProto.x = tree_x;
  treeProto.y = tree_y;

  class LineChart extends BaseChart {
      constructor(svg) {
          super(svg);
          this.data = [];
          this.x = scaleUtc();
          this.y = linear$1();
          this.xAxis = axisBottom(this.x).tickSizeOuter(0);
          this.yAxis = axisLeft(this.y)
              .tickPadding(6)
              .tickFormat(formatCurrencyShort);
          this.line = line()
              .x(d => this.x(d.date))
              .y(d => this.y(d.value));
          this.canvas = select$1(this.svg)
              .classed("linechart", true)
              .append("g");
          this.xAxisSelection = this.canvas.append("g").attr("class", "x axis");
          this.yAxisSelection = this.canvas.append("g").attr("class", "y axis");
          this.quadtree = quadtree();
          this.lines = this.canvas.selectAll(".line");
          // @ts-ignore
          this.dots = this.canvas.selectAll("g.dot").selectAll("circle");
      }
      draw(data) {
          this.data = data;
          this.x.domain([
              min(this.data, s => s.values[0].date) || 0,
              max(this.data, s => s.values[s.values.length - 1].date) || 0,
          ]);
          // Span y-axis as max minus min value plus 5 percent margin
          const minDataValue = min(this.data, d => min(d.values, x => x.value));
          const maxDataValue = max(this.data, d => max(d.values, x => x.value));
          if (minDataValue && maxDataValue) {
              this.y.domain([
                  minDataValue - (maxDataValue - minDataValue) * 0.05,
                  maxDataValue + (maxDataValue - minDataValue) * 0.05,
              ]);
          }
          this.lines = this.canvas
              .selectAll(".line")
              .data(data)
              .enter()
              .append("path")
              .attr("class", "line")
              .style("stroke", d => scales.currencies(d.name));
          this.dots = this.canvas
              .selectAll("g.dot")
              .data(data)
              .enter()
              .append("g")
              .attr("class", "dot")
              .selectAll("circle")
              .data(d => d.values)
              .enter()
              .append("circle")
              .attr("r", 3)
              .style("fill", d => scales.currencies(d.name));
          const canvasNode = this.canvas.node();
          this.canvas
              .on("mousemove", () => {
              const matrix = canvasNode.getScreenCTM();
              const d = this.quadtree.find(...clientPoint(canvasNode, event));
              if (this.tooltipText && matrix && d) {
                  tooltip
                      .style("opacity", 1)
                      .html(this.tooltipText(d))
                      .style("left", `${window.scrollX + this.x(d.date) + matrix.e}px`)
                      .style("top", `${window.scrollY + this.y(d.value) + matrix.f - 15}px`);
              }
              else {
                  tooltip.style("opacity", 0);
              }
          })
              .on("mouseleave", () => {
              tooltip.style("opacity", 0);
          });
          this.update();
          return this;
      }
      update() {
          this.setHeight(250);
          this.y.range([this.height, 0]);
          this.x.range([0, this.width]);
          this.canvas.attr("transform", `translate(${this.margin.left},${this.margin.top})`);
          this.yAxis.tickSize(-this.width);
          this.xAxisSelection.attr("transform", `translate(0,${this.height})`);
          this.xAxisSelection.call(this.xAxis);
          this.yAxisSelection.call(this.yAxis);
          this.dots.attr("cx", d => this.x(d.date)).attr("cy", d => this.y(d.value));
          this.lines.attr("d", d => this.line(d.values));
          this.quadtree = quadtree(merge(this.data.map(d => d.values)), d => this.x(d.date), d => this.y(d.value));
          this.legend = {
              domain: this.data.map(d => d.name),
              scale: scales.currencies,
          };
      }
  }

  class ScatterPlot extends BaseChart {
      constructor(svg) {
          super(svg);
          this.canvas = select$1(this.svg)
              .classed("scatterplot", true)
              .append("g");
          this.margin.left = 70;
          this.x = scaleUtc();
          this.y = point().padding(1);
          this.xAxis = axisBottom(this.x).tickSizeOuter(0);
          this.yAxis = axisLeft(this.y)
              .tickPadding(6)
              .tickFormat(d => d);
          this.data = [];
          this.quadtree = quadtree();
          this.xAxisSelection = this.canvas.append("g").attr("class", "x axis");
          this.yAxisSelection = this.canvas.append("g").attr("class", "y axis");
          this.dots = this.canvas.selectAll(".dot");
      }
      draw(data) {
          this.data = data;
          // @ts-ignore
          this.x.domain(extent(data, d => d.date));
          this.y.domain(data.map(d => d.type));
          this.dots = this.canvas
              .selectAll(".dot")
              .data(this.data)
              .enter()
              .append("circle")
              .attr("class", "dot")
              .attr("r", 5)
              .style("fill", d => scales.scatterplot(d.type));
          const canvasNode = this.canvas.node();
          this.canvas
              .on("mousemove", () => {
              const matrix = canvasNode.getScreenCTM();
              if (!matrix)
                  return;
              const d = this.quadtree.find(...clientPoint(canvasNode, event));
              if (d) {
                  tooltip
                      .style("opacity", 1)
                      .html(this.tooltipText(d))
                      .style("left", `${window.scrollX + this.x(d.date) + matrix.e}px`)
                      .style("top", `${window.scrollY + this.y(d.type) + matrix.f - 15}px`);
              }
              else {
                  tooltip.style("opacity", 0);
              }
          })
              .on("mouseleave", () => {
              tooltip.style("opacity", 0);
          });
          this.update();
          return this;
      }
      // eslint-disable-next-line class-methods-use-this
      tooltipText(d) {
          return `${d.description}<em>${dateFormat.day(d.date)}</em>`;
      }
      update() {
          this.setHeight(250);
          this.y.range([this.height, 0]);
          this.x.range([0, this.width]);
          this.canvas.attr("transform", `translate(${this.margin.left},${this.margin.top})`);
          this.yAxis.tickSize(-this.width);
          this.xAxisSelection.attr("transform", `translate(0,${this.height})`);
          this.xAxisSelection.call(this.xAxis);
          this.yAxisSelection.call(this.yAxis);
          this.dots.attr("cx", d => this.x(d.date)).attr("cy", d => this.y(d.type));
          this.quadtree = quadtree(this.data, d => this.x(d.date), d => this.y(d.type));
      }
  }

  function addInternalNodesAsLeaves(node) {
      if (node.children) {
          node.children.forEach(o => {
              addInternalNodesAsLeaves(o);
          });
          if (node.children.length) {
              const copy = Object.assign({}, node);
              copy.children = null;
              copy.dummy = true;
              node.children.push(copy);
              node.balance = {};
          }
      }
  }
  // Turn the elements in the selection (assuming they have a .account attribute)
  // into links to the account page.
  function makeAccountLink(selection) {
      selection.on("click", d => {
          window.location.href = favaAPI.accountURL.replace("REPLACEME", d.data.account);
          event.stopPropagation();
      });
  }
  class TreeMapChart extends BaseChart {
      constructor(svg) {
          super(svg);
          this.treemap = treemap().paddingInner(2);
          this.margin = NO_MARGINS;
          this.canvas = select$1(svg).classed("treemap", true);
          this.cells = this.canvas.selectAll("g");
          this.labels = this.cells.append("text");
      }
      draw(data) {
          this.root = this.treemap(data);
          this.cells = this.canvas
              .selectAll("g")
              .data(this.root.leaves())
              .enter()
              .append("g")
              .call(addTooltip, this.tooltipText);
          this.cells.append("rect").attr("fill", d => {
              const node = d.data.dummy ? d.parent : d;
              if (node.parent === this.root || !node.parent) {
                  return scales.treemap(node.data.account);
              }
              return scales.treemap(node.parent.data.account);
          });
          this.labels = this.cells
              .append("text")
              .attr("dy", ".5em")
              .attr("text-anchor", "middle")
              .text(d => d.data.account.split(":").pop() || "")
              .style("opacity", 0)
              .call(makeAccountLink);
          this.update();
          return this;
      }
      update() {
          this.setHeight(Math.min(this.width / 2.5, 400));
          if (!this.root)
              return;
          this.treemap.size([this.width, this.height]);
          this.treemap(this.root);
          function labelOpacity(d) {
              const length = this.getComputedTextLength();
              return d.x1 - d.x0 > length + 4 && d.y1 - d.y0 > 14 ? 1 : 0;
          }
          this.cells.attr("transform", d => `translate(${d.x0},${d.y0})`);
          this.cells
              .select("rect")
              .attr("width", d => d.x1 - d.x0)
              .attr("height", d => d.y1 - d.y0);
          this.labels
              .attr("x", d => (d.x1 - d.x0) / 2)
              .attr("y", d => (d.y1 - d.y0) / 2)
              .style("opacity", labelOpacity);
      }
  }
  class SunburstChart extends BaseChart {
      constructor(svg) {
          super(svg);
          this.margin = NO_MARGINS;
          this.x = linear$1().range([0, 2 * Math.PI]);
          this.y = sqrt();
          this.partition = partition();
          this.arc = arc()
              .startAngle(d => this.x(d.x0))
              .endAngle(d => this.x(d.x1))
              .innerRadius(d => this.y(d.y0))
              .outerRadius(d => this.y(d.y1));
          this.canvas = select$1(this.svg)
              .attr("class", "sunburst")
              .append("g")
              .on("mouseleave", () => this.mouseLeave());
          // Bounding circle underneath the sunburst
          this.boundingCircle = this.canvas.append("circle").style("opacity", 0);
          this.accountLabel = this.canvas
              .append("text")
              .attr("class", "account")
              .attr("text-anchor", "middle");
          this.balanceLabel = this.canvas
              .append("text")
              .attr("class", "balance")
              .attr("dy", "1.2em")
              .attr("text-anchor", "middle");
          this.paths = this.canvas.selectAll("path");
      }
      draw(data) {
          this.root = this.partition(data);
          this.paths = this.canvas
              .selectAll("path")
              .data(this.root.descendants())
              .enter()
              .filter(d => !d.data.dummy && !!d.depth)
              .append("path")
              .attr("fill-rule", "evenodd")
              .style("fill", d => scales.sunburst(d.data.account))
              .on("mouseover", d => this.mouseOver(d))
              .call(makeAccountLink);
          this.update();
          this.setLabel(this.root);
          return this;
      }
      update() {
          this.canvas.attr("transform", `translate(${this.width / 2 + this.margin.left},${this.height / 2 +
            this.margin.top})`);
          const radius = Math.min(this.width, this.height) / 2;
          this.boundingCircle.attr("r", radius);
          this.y.range([0, radius]);
          this.paths.attr("d", this.arc);
      }
      setLabel(d) {
          if (this.labelText) {
              this.balanceLabel.text(this.labelText(d));
          }
          this.accountLabel
              .datum(d)
              .text(d.data.account)
              .call(makeAccountLink);
      }
      // Fade all but the current sequence
      mouseOver(d) {
          this.setLabel(d);
          // @ts-ignore
          this.paths.interrupt();
          // Only highlight segments that are ancestors of the current segment.
          this.paths
              .style("opacity", 0.5)
              // check if d.account starts with node.account
              .filter(node => d.data.account.lastIndexOf(node.data.account, 0) === 0)
              .style("opacity", 1);
      }
      // Restore everything to full opacity when moving off the visualization.
      mouseLeave() {
          this.paths
              // @ts-ignore
              .transition()
              .duration(1000)
              .style("opacity", 1);
          if (this.root) {
              this.setLabel(this.root);
          }
      }
  }
  class SunburstChartContainer extends BaseChart {
      constructor(svg) {
          super(svg);
          this.svg.setAttribute("class", "sunburst");
          this.sunbursts = [];
          this.canvases = [];
          this.margin = NO_MARGINS;
          this.currencies = [];
          this.setHeight(500);
      }
      draw(data) {
          this.currencies = Object.keys(data);
          this.currencies.forEach((currency, i) => {
              const canvas = select$1(this.svg)
                  .append("g")
                  .attr("transform", `translate(${(this.width * i) / this.currencies.length},0)`);
              const totalBalance = data[currency].value || 1;
              const sunburst = new SunburstChart(canvas.node())
                  .setWidth(this.width / this.currencies.length)
                  .setHeight(500)
                  .set("labelText", d => {
                  const balance = d.data.balance_children[currency] || 0;
                  return `${formatCurrency(balance)} ${currency} (${formatPercentage(balance / totalBalance)})`;
              })
                  .draw(data[currency]);
              this.canvases.push(canvas);
              this.sunbursts.push(sunburst);
          });
          return this;
      }
      update() {
          this.sunbursts.forEach((singleChart, i) => {
              singleChart
                  .setWidth(this.width / this.currencies.length)
                  .setHeight(500)
                  .update();
              this.canvases[i].attr("transform", `translate(${(this.width * i) / this.currencies.length},0)`);
          });
      }
  }
  class HierarchyContainer extends BaseChart {
      constructor(svg) {
          super(svg);
          this.canvas = select$1(this.svg).append("g");
          this.has_mode_setting = true;
          this.margin = NO_MARGINS;
          this.currencies = [];
          this.currency = "";
          this.mode = "treemap";
      }
      draw(data) {
          this.data = data;
          this.currencies = Object.keys(data);
          this.canvas.html("");
          if (this.currencies.length === 0) {
              this.canvas
                  .append("text")
                  .text("Chart is empty.")
                  .attr("text-anchor", "middle")
                  .attr("x", this.width / 2)
                  .attr("y", 160 / 2);
          }
          else if (this.mode === "treemap") {
              if (!this.currency)
                  this.currency = this.currencies[0];
              const totalBalance = data[this.currency].value || 1;
              const currentChart = new TreeMapChart(this.canvas.node())
                  .setWidth(this.width)
                  .set("tooltipText", d => {
                  const balance = d.data.balance[this.currency];
                  return `${formatCurrency(balance)} ${this.currency} (${formatPercentage(balance / totalBalance)})<em>${d.data.account}</em>`;
              })
                  .draw(data[this.currency]);
              this.setHeight(currentChart.outerHeight);
              this.currentChart = currentChart;
              this.has_currency_setting = true;
          }
          else {
              this.currentChart = new SunburstChartContainer(this.canvas.node())
                  .setWidth(this.width)
                  .draw(data);
              this.setHeight(this.currentChart.outerHeight);
              this.has_currency_setting = false;
          }
          return this;
      }
      update() {
          if (!this.data)
              return;
          this.draw(this.data);
          if (this.currentChart) {
              this.currentChart.setWidth(this.outerWidth).update();
          }
      }
  }

  /**
   * This module contains the main code to render Fava's charts.
   *
   * The charts heavily use d3 libraries.
   */
  /**
   * The list of operating currencies, adding in the current conversion currency.
   */
  let operatingCurrenciesWithConversion = [];
  conversion.subscribe(conversionValue => {
      if (!conversionValue ||
          ["at_cost", "at_value", "units"].includes(conversionValue) ||
          favaAPI.options.operating_currency.includes(conversionValue)) {
          operatingCurrenciesWithConversion = favaAPI.options.operating_currency;
      }
      else {
          operatingCurrenciesWithConversion = [
              ...favaAPI.options.operating_currency,
              conversionValue,
          ];
      }
  });
  e.on("page-init", () => {
      const { accounts, options } = favaAPI;
      scales.treemap.domain(accounts);
      scales.sunburst.domain(accounts);
      options.operating_currency.sort();
      options.commodities.sort();
      scales.currencies.domain([
          ...options.operating_currency,
          ...options.commodities,
      ]);
  });
  const parsers = {
      balances(json) {
          const series = {};
          const parsedData = array(object({
              date,
              balance: record(number),
          }))(json);
          parsedData.forEach(({ date: date_, balance }) => {
              Object.entries(balance).forEach(([currency, value]) => {
                  const currencySeries = series[currency] || {
                      name: currency,
                      values: [],
                  };
                  currencySeries.values.push({
                      name: currency,
                      date: date_,
                      value,
                  });
                  series[currency] = currencySeries;
              });
          });
          return {
              data: Object.values(series),
              renderer: (svg) => new LineChart(svg).set("tooltipText", d => `${formatCurrency(d.value)} ${d.name}<em>${dateFormat.day(d.date)}</em>`),
          };
      },
      commodities(json, label) {
          const parsedData = object({
              quote: string,
              base: string,
              prices: array(tuple([date, number])),
          })(json);
          if (!parsedData.prices.length)
              return null;
          const renderer = (svg) => new LineChart(svg).set("tooltipText", d => `1 ${parsedData.base} = ${formatCurrency(d.value)} ${parsedData.quote}<em>${dateFormat.day(d.date)}</em>`);
          return {
              data: [
                  {
                      name: label,
                      values: parsedData.prices.map(d => ({
                          name: label,
                          date: d[0],
                          value: d[1],
                      })),
                  },
              ],
              renderer,
          };
      },
      bar(json) {
          const jsonData = array(object({ date, budgets: record(number), balance: record(number) }))(json);
          const data = jsonData.map(d => ({
              values: operatingCurrenciesWithConversion.map(name => ({
                  name,
                  value: d.balance[name] || 0,
                  budget: d.budgets[name] || 0,
              })),
              date: d.date,
              label: currentDateFormat(d.date),
          }));
          const renderer = (svg) => new BarChart(svg).set("tooltipText", d => {
              let text = "";
              d.values.forEach(a => {
                  text += `${formatCurrency(a.value)} ${a.name}`;
                  if (a.budget) {
                      text += ` / ${formatCurrency(a.budget)} ${a.name}`;
                  }
                  text += "<br>";
              });
              text += `<em>${d.label}</em>`;
              return text;
          });
          return { data, renderer };
      },
      scatterplot(json) {
          const parser = array(object({
              type: string,
              date,
              description: string,
          }));
          return {
              data: parser(json),
              renderer: (svg) => new ScatterPlot(svg),
          };
      },
  };
  function parseChartData() {
      const chartData = array(object({
          label: string,
          type: string,
          data: unknown,
      }))(getScriptTagJSON("#chart-data"));
      const result = [];
      chartData.forEach(chart => {
          switch (chart.type) {
              case "balances":
              case "bar":
              case "commodities":
              case "scatterplot": {
                  // eslint-disable-next-line
                  const res = parsers[chart.type](chart.data, chart.label);
                  if (res) {
                      result.push({
                          name: chart.label,
                          data: res.data,
                          renderer: res.renderer,
                      });
                  }
                  break;
              }
              case "hierarchy": {
                  const hierarchyValidator = object({
                      account: string,
                      balance: record(number),
                      balance_children: record(number),
                      children: lazy(() => array(hierarchyValidator)),
                  });
                  const validator = object({
                      root: hierarchyValidator,
                      modifier: number,
                  });
                  const chartData_ = validator(chart.data);
                  const { root } = chartData_;
                  addInternalNodesAsLeaves(root);
                  const data = {};
                  operatingCurrenciesWithConversion.forEach(currency => {
                      const currencyHierarchy = hierarchy(root)
                          .sum(d => d.balance[currency] * chartData_.modifier)
                          .sort((a, b) => (b.value || 0) - (a.value || 0));
                      if (currencyHierarchy.value !== 0) {
                          data[currency] = currencyHierarchy;
                      }
                  });
                  const renderer = (svg) => new HierarchyContainer(svg);
                  if (renderer) {
                      result.push({
                          name: chart.label,
                          data,
                          renderer,
                      });
                  }
                  break;
              }
              default:
                  break;
          }
      });
      return result;
  }

  // Copy the given text to the clipboard.
  function copyToClipboard(text) {
      if (!text)
          return;
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.top = "0";
      textarea.style.left = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
          document.execCommand("copy");
      }
      catch (err) {
          console.error("Unable to copy", err); // eslint-disable-line no-console
      }
      textarea.remove();
  }
  e.on("page-loaded", () => {
      selectAll(".status-indicator").forEach(indicator => {
          indicator.addEventListener("click", () => {
              copyToClipboard(indicator.getAttribute("data-clipboard-text"));
          });
      });
      const copyBalances = select("#copy-balances");
      if (copyBalances) {
          copyBalances.addEventListener("click", () => {
              copyToClipboard(copyBalances.getAttribute("data-clipboard-text"));
          });
      }
  });

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  function createCommonjsModule(fn, module) {
  	return module = { exports: {} }, fn(module, module.exports), module.exports;
  }

  var codemirror = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  // This is CodeMirror (https://codemirror.net), a code editor
  // implemented in JavaScript on top of the browser's DOM.
  //
  // You can find some technical background for some of the code below
  // at http://marijnhaverbeke.nl/blog/#cm-internals .

  (function (global, factory) {
     module.exports = factory() ;
  }(commonjsGlobal, (function () {
    // Kludges for bugs and behavior differences that can't be feature
    // detected are enabled based on userAgent etc sniffing.
    var userAgent = navigator.userAgent;
    var platform = navigator.platform;

    var gecko = /gecko\/\d/i.test(userAgent);
    var ie_upto10 = /MSIE \d/.test(userAgent);
    var ie_11up = /Trident\/(?:[7-9]|\d{2,})\..*rv:(\d+)/.exec(userAgent);
    var edge = /Edge\/(\d+)/.exec(userAgent);
    var ie = ie_upto10 || ie_11up || edge;
    var ie_version = ie && (ie_upto10 ? document.documentMode || 6 : +(edge || ie_11up)[1]);
    var webkit = !edge && /WebKit\//.test(userAgent);
    var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(userAgent);
    var chrome = !edge && /Chrome\//.test(userAgent);
    var presto = /Opera\//.test(userAgent);
    var safari = /Apple Computer/.test(navigator.vendor);
    var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(userAgent);
    var phantom = /PhantomJS/.test(userAgent);

    var ios = !edge && /AppleWebKit/.test(userAgent) && /Mobile\/\w+/.test(userAgent);
    var android = /Android/.test(userAgent);
    // This is woefully incomplete. Suggestions for alternative methods welcome.
    var mobile = ios || android || /webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(userAgent);
    var mac = ios || /Mac/.test(platform);
    var chromeOS = /\bCrOS\b/.test(userAgent);
    var windows = /win/i.test(platform);

    var presto_version = presto && userAgent.match(/Version\/(\d*\.\d*)/);
    if (presto_version) { presto_version = Number(presto_version[1]); }
    if (presto_version && presto_version >= 15) { presto = false; webkit = true; }
    // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
    var flipCtrlCmd = mac && (qtwebkit || presto && (presto_version == null || presto_version < 12.11));
    var captureRightClick = gecko || (ie && ie_version >= 9);

    function classTest(cls) { return new RegExp("(^|\\s)" + cls + "(?:$|\\s)\\s*") }

    var rmClass = function(node, cls) {
      var current = node.className;
      var match = classTest(cls).exec(current);
      if (match) {
        var after = current.slice(match.index + match[0].length);
        node.className = current.slice(0, match.index) + (after ? match[1] + after : "");
      }
    };

    function removeChildren(e) {
      for (var count = e.childNodes.length; count > 0; --count)
        { e.removeChild(e.firstChild); }
      return e
    }

    function removeChildrenAndAdd(parent, e) {
      return removeChildren(parent).appendChild(e)
    }

    function elt(tag, content, className, style) {
      var e = document.createElement(tag);
      if (className) { e.className = className; }
      if (style) { e.style.cssText = style; }
      if (typeof content == "string") { e.appendChild(document.createTextNode(content)); }
      else if (content) { for (var i = 0; i < content.length; ++i) { e.appendChild(content[i]); } }
      return e
    }
    // wrapper for elt, which removes the elt from the accessibility tree
    function eltP(tag, content, className, style) {
      var e = elt(tag, content, className, style);
      e.setAttribute("role", "presentation");
      return e
    }

    var range;
    if (document.createRange) { range = function(node, start, end, endNode) {
      var r = document.createRange();
      r.setEnd(endNode || node, end);
      r.setStart(node, start);
      return r
    }; }
    else { range = function(node, start, end) {
      var r = document.body.createTextRange();
      try { r.moveToElementText(node.parentNode); }
      catch(e) { return r }
      r.collapse(true);
      r.moveEnd("character", end);
      r.moveStart("character", start);
      return r
    }; }

    function contains(parent, child) {
      if (child.nodeType == 3) // Android browser always returns false when child is a textnode
        { child = child.parentNode; }
      if (parent.contains)
        { return parent.contains(child) }
      do {
        if (child.nodeType == 11) { child = child.host; }
        if (child == parent) { return true }
      } while (child = child.parentNode)
    }

    function activeElt() {
      // IE and Edge may throw an "Unspecified Error" when accessing document.activeElement.
      // IE < 10 will throw when accessed while the page is loading or in an iframe.
      // IE > 9 and Edge will throw when accessed in an iframe if document.body is unavailable.
      var activeElement;
      try {
        activeElement = document.activeElement;
      } catch(e) {
        activeElement = document.body || null;
      }
      while (activeElement && activeElement.shadowRoot && activeElement.shadowRoot.activeElement)
        { activeElement = activeElement.shadowRoot.activeElement; }
      return activeElement
    }

    function addClass(node, cls) {
      var current = node.className;
      if (!classTest(cls).test(current)) { node.className += (current ? " " : "") + cls; }
    }
    function joinClasses(a, b) {
      var as = a.split(" ");
      for (var i = 0; i < as.length; i++)
        { if (as[i] && !classTest(as[i]).test(b)) { b += " " + as[i]; } }
      return b
    }

    var selectInput = function(node) { node.select(); };
    if (ios) // Mobile Safari apparently has a bug where select() is broken.
      { selectInput = function(node) { node.selectionStart = 0; node.selectionEnd = node.value.length; }; }
    else if (ie) // Suppress mysterious IE10 errors
      { selectInput = function(node) { try { node.select(); } catch(_e) {} }; }

    function bind(f) {
      var args = Array.prototype.slice.call(arguments, 1);
      return function(){return f.apply(null, args)}
    }

    function copyObj(obj, target, overwrite) {
      if (!target) { target = {}; }
      for (var prop in obj)
        { if (obj.hasOwnProperty(prop) && (overwrite !== false || !target.hasOwnProperty(prop)))
          { target[prop] = obj[prop]; } }
      return target
    }

    // Counts the column offset in a string, taking tabs into account.
    // Used mostly to find indentation.
    function countColumn(string, end, tabSize, startIndex, startValue) {
      if (end == null) {
        end = string.search(/[^\s\u00a0]/);
        if (end == -1) { end = string.length; }
      }
      for (var i = startIndex || 0, n = startValue || 0;;) {
        var nextTab = string.indexOf("\t", i);
        if (nextTab < 0 || nextTab >= end)
          { return n + (end - i) }
        n += nextTab - i;
        n += tabSize - (n % tabSize);
        i = nextTab + 1;
      }
    }

    var Delayed = function() {this.id = null;};
    Delayed.prototype.set = function (ms, f) {
      clearTimeout(this.id);
      this.id = setTimeout(f, ms);
    };

    function indexOf(array, elt) {
      for (var i = 0; i < array.length; ++i)
        { if (array[i] == elt) { return i } }
      return -1
    }

    // Number of pixels added to scroller and sizer to hide scrollbar
    var scrollerGap = 30;

    // Returned or thrown by various protocols to signal 'I'm not
    // handling this'.
    var Pass = {toString: function(){return "CodeMirror.Pass"}};

    // Reused option objects for setSelection & friends
    var sel_dontScroll = {scroll: false}, sel_mouse = {origin: "*mouse"}, sel_move = {origin: "+move"};

    // The inverse of countColumn -- find the offset that corresponds to
    // a particular column.
    function findColumn(string, goal, tabSize) {
      for (var pos = 0, col = 0;;) {
        var nextTab = string.indexOf("\t", pos);
        if (nextTab == -1) { nextTab = string.length; }
        var skipped = nextTab - pos;
        if (nextTab == string.length || col + skipped >= goal)
          { return pos + Math.min(skipped, goal - col) }
        col += nextTab - pos;
        col += tabSize - (col % tabSize);
        pos = nextTab + 1;
        if (col >= goal) { return pos }
      }
    }

    var spaceStrs = [""];
    function spaceStr(n) {
      while (spaceStrs.length <= n)
        { spaceStrs.push(lst(spaceStrs) + " "); }
      return spaceStrs[n]
    }

    function lst(arr) { return arr[arr.length-1] }

    function map(array, f) {
      var out = [];
      for (var i = 0; i < array.length; i++) { out[i] = f(array[i], i); }
      return out
    }

    function insertSorted(array, value, score) {
      var pos = 0, priority = score(value);
      while (pos < array.length && score(array[pos]) <= priority) { pos++; }
      array.splice(pos, 0, value);
    }

    function nothing() {}

    function createObj(base, props) {
      var inst;
      if (Object.create) {
        inst = Object.create(base);
      } else {
        nothing.prototype = base;
        inst = new nothing();
      }
      if (props) { copyObj(props, inst); }
      return inst
    }

    var nonASCIISingleCaseWordChar = /[\u00df\u0587\u0590-\u05f4\u0600-\u06ff\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc\uac00-\ud7af]/;
    function isWordCharBasic(ch) {
      return /\w/.test(ch) || ch > "\x80" &&
        (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch))
    }
    function isWordChar(ch, helper) {
      if (!helper) { return isWordCharBasic(ch) }
      if (helper.source.indexOf("\\w") > -1 && isWordCharBasic(ch)) { return true }
      return helper.test(ch)
    }

    function isEmpty(obj) {
      for (var n in obj) { if (obj.hasOwnProperty(n) && obj[n]) { return false } }
      return true
    }

    // Extending unicode characters. A series of a non-extending char +
    // any number of extending chars is treated as a single unit as far
    // as editing and measuring is concerned. This is not fully correct,
    // since some scripts/fonts/browsers also treat other configurations
    // of code points as a group.
    var extendingChars = /[\u0300-\u036f\u0483-\u0489\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u065e\u0670\u06d6-\u06dc\u06de-\u06e4\u06e7\u06e8\u06ea-\u06ed\u0711\u0730-\u074a\u07a6-\u07b0\u07eb-\u07f3\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0900-\u0902\u093c\u0941-\u0948\u094d\u0951-\u0955\u0962\u0963\u0981\u09bc\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0a01\u0a02\u0a3c\u0a41\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a70\u0a71\u0a75\u0a81\u0a82\u0abc\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3\u0b01\u0b3c\u0b3e\u0b3f\u0b41-\u0b44\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b82\u0bbe\u0bc0\u0bcd\u0bd7\u0c3e-\u0c40\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0cbc\u0cbf\u0cc2\u0cc6\u0ccc\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0d3e\u0d41-\u0d44\u0d4d\u0d57\u0d62\u0d63\u0dca\u0dcf\u0dd2-\u0dd4\u0dd6\u0ddf\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0f18\u0f19\u0f35\u0f37\u0f39\u0f71-\u0f7e\u0f80-\u0f84\u0f86\u0f87\u0f90-\u0f97\u0f99-\u0fbc\u0fc6\u102d-\u1030\u1032-\u1037\u1039\u103a\u103d\u103e\u1058\u1059\u105e-\u1060\u1071-\u1074\u1082\u1085\u1086\u108d\u109d\u135f\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b7-\u17bd\u17c6\u17c9-\u17d3\u17dd\u180b-\u180d\u18a9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193b\u1a17\u1a18\u1a56\u1a58-\u1a5e\u1a60\u1a62\u1a65-\u1a6c\u1a73-\u1a7c\u1a7f\u1b00-\u1b03\u1b34\u1b36-\u1b3a\u1b3c\u1b42\u1b6b-\u1b73\u1b80\u1b81\u1ba2-\u1ba5\u1ba8\u1ba9\u1c2c-\u1c33\u1c36\u1c37\u1cd0-\u1cd2\u1cd4-\u1ce0\u1ce2-\u1ce8\u1ced\u1dc0-\u1de6\u1dfd-\u1dff\u200c\u200d\u20d0-\u20f0\u2cef-\u2cf1\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua66f-\ua672\ua67c\ua67d\ua6f0\ua6f1\ua802\ua806\ua80b\ua825\ua826\ua8c4\ua8e0-\ua8f1\ua926-\ua92d\ua947-\ua951\ua980-\ua982\ua9b3\ua9b6-\ua9b9\ua9bc\uaa29-\uaa2e\uaa31\uaa32\uaa35\uaa36\uaa43\uaa4c\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uabe5\uabe8\uabed\udc00-\udfff\ufb1e\ufe00-\ufe0f\ufe20-\ufe26\uff9e\uff9f]/;
    function isExtendingChar(ch) { return ch.charCodeAt(0) >= 768 && extendingChars.test(ch) }

    // Returns a number from the range [`0`; `str.length`] unless `pos` is outside that range.
    function skipExtendingChars(str, pos, dir) {
      while ((dir < 0 ? pos > 0 : pos < str.length) && isExtendingChar(str.charAt(pos))) { pos += dir; }
      return pos
    }

    // Returns the value from the range [`from`; `to`] that satisfies
    // `pred` and is closest to `from`. Assumes that at least `to`
    // satisfies `pred`. Supports `from` being greater than `to`.
    function findFirst(pred, from, to) {
      // At any point we are certain `to` satisfies `pred`, don't know
      // whether `from` does.
      var dir = from > to ? -1 : 1;
      for (;;) {
        if (from == to) { return from }
        var midF = (from + to) / 2, mid = dir < 0 ? Math.ceil(midF) : Math.floor(midF);
        if (mid == from) { return pred(mid) ? from : to }
        if (pred(mid)) { to = mid; }
        else { from = mid + dir; }
      }
    }

    // BIDI HELPERS

    function iterateBidiSections(order, from, to, f) {
      if (!order) { return f(from, to, "ltr", 0) }
      var found = false;
      for (var i = 0; i < order.length; ++i) {
        var part = order[i];
        if (part.from < to && part.to > from || from == to && part.to == from) {
          f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr", i);
          found = true;
        }
      }
      if (!found) { f(from, to, "ltr"); }
    }

    var bidiOther = null;
    function getBidiPartAt(order, ch, sticky) {
      var found;
      bidiOther = null;
      for (var i = 0; i < order.length; ++i) {
        var cur = order[i];
        if (cur.from < ch && cur.to > ch) { return i }
        if (cur.to == ch) {
          if (cur.from != cur.to && sticky == "before") { found = i; }
          else { bidiOther = i; }
        }
        if (cur.from == ch) {
          if (cur.from != cur.to && sticky != "before") { found = i; }
          else { bidiOther = i; }
        }
      }
      return found != null ? found : bidiOther
    }

    // Bidirectional ordering algorithm
    // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
    // that this (partially) implements.

    // One-char codes used for character types:
    // L (L):   Left-to-Right
    // R (R):   Right-to-Left
    // r (AL):  Right-to-Left Arabic
    // 1 (EN):  European Number
    // + (ES):  European Number Separator
    // % (ET):  European Number Terminator
    // n (AN):  Arabic Number
    // , (CS):  Common Number Separator
    // m (NSM): Non-Spacing Mark
    // b (BN):  Boundary Neutral
    // s (B):   Paragraph Separator
    // t (S):   Segment Separator
    // w (WS):  Whitespace
    // N (ON):  Other Neutrals

    // Returns null if characters are ordered as they appear
    // (left-to-right), or an array of sections ({from, to, level}
    // objects) in the order in which they occur visually.
    var bidiOrdering = (function() {
      // Character types for codepoints 0 to 0xff
      var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLN";
      // Character types for codepoints 0x600 to 0x6f9
      var arabicTypes = "nnnnnnNNr%%r,rNNmmmmmmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmmmnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmnNmmmmmmrrmmNmmmmrr1111111111";
      function charType(code) {
        if (code <= 0xf7) { return lowTypes.charAt(code) }
        else if (0x590 <= code && code <= 0x5f4) { return "R" }
        else if (0x600 <= code && code <= 0x6f9) { return arabicTypes.charAt(code - 0x600) }
        else if (0x6ee <= code && code <= 0x8ac) { return "r" }
        else if (0x2000 <= code && code <= 0x200b) { return "w" }
        else if (code == 0x200c) { return "b" }
        else { return "L" }
      }

      var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
      var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;

      function BidiSpan(level, from, to) {
        this.level = level;
        this.from = from; this.to = to;
      }

      return function(str, direction) {
        var outerType = direction == "ltr" ? "L" : "R";

        if (str.length == 0 || direction == "ltr" && !bidiRE.test(str)) { return false }
        var len = str.length, types = [];
        for (var i = 0; i < len; ++i)
          { types.push(charType(str.charCodeAt(i))); }

        // W1. Examine each non-spacing mark (NSM) in the level run, and
        // change the type of the NSM to the type of the previous
        // character. If the NSM is at the start of the level run, it will
        // get the type of sor.
        for (var i$1 = 0, prev = outerType; i$1 < len; ++i$1) {
          var type = types[i$1];
          if (type == "m") { types[i$1] = prev; }
          else { prev = type; }
        }

        // W2. Search backwards from each instance of a European number
        // until the first strong type (R, L, AL, or sor) is found. If an
        // AL is found, change the type of the European number to Arabic
        // number.
        // W3. Change all ALs to R.
        for (var i$2 = 0, cur = outerType; i$2 < len; ++i$2) {
          var type$1 = types[i$2];
          if (type$1 == "1" && cur == "r") { types[i$2] = "n"; }
          else if (isStrong.test(type$1)) { cur = type$1; if (type$1 == "r") { types[i$2] = "R"; } }
        }

        // W4. A single European separator between two European numbers
        // changes to a European number. A single common separator between
        // two numbers of the same type changes to that type.
        for (var i$3 = 1, prev$1 = types[0]; i$3 < len - 1; ++i$3) {
          var type$2 = types[i$3];
          if (type$2 == "+" && prev$1 == "1" && types[i$3+1] == "1") { types[i$3] = "1"; }
          else if (type$2 == "," && prev$1 == types[i$3+1] &&
                   (prev$1 == "1" || prev$1 == "n")) { types[i$3] = prev$1; }
          prev$1 = type$2;
        }

        // W5. A sequence of European terminators adjacent to European
        // numbers changes to all European numbers.
        // W6. Otherwise, separators and terminators change to Other
        // Neutral.
        for (var i$4 = 0; i$4 < len; ++i$4) {
          var type$3 = types[i$4];
          if (type$3 == ",") { types[i$4] = "N"; }
          else if (type$3 == "%") {
            var end = (void 0);
            for (end = i$4 + 1; end < len && types[end] == "%"; ++end) {}
            var replace = (i$4 && types[i$4-1] == "!") || (end < len && types[end] == "1") ? "1" : "N";
            for (var j = i$4; j < end; ++j) { types[j] = replace; }
            i$4 = end - 1;
          }
        }

        // W7. Search backwards from each instance of a European number
        // until the first strong type (R, L, or sor) is found. If an L is
        // found, then change the type of the European number to L.
        for (var i$5 = 0, cur$1 = outerType; i$5 < len; ++i$5) {
          var type$4 = types[i$5];
          if (cur$1 == "L" && type$4 == "1") { types[i$5] = "L"; }
          else if (isStrong.test(type$4)) { cur$1 = type$4; }
        }

        // N1. A sequence of neutrals takes the direction of the
        // surrounding strong text if the text on both sides has the same
        // direction. European and Arabic numbers act as if they were R in
        // terms of their influence on neutrals. Start-of-level-run (sor)
        // and end-of-level-run (eor) are used at level run boundaries.
        // N2. Any remaining neutrals take the embedding direction.
        for (var i$6 = 0; i$6 < len; ++i$6) {
          if (isNeutral.test(types[i$6])) {
            var end$1 = (void 0);
            for (end$1 = i$6 + 1; end$1 < len && isNeutral.test(types[end$1]); ++end$1) {}
            var before = (i$6 ? types[i$6-1] : outerType) == "L";
            var after = (end$1 < len ? types[end$1] : outerType) == "L";
            var replace$1 = before == after ? (before ? "L" : "R") : outerType;
            for (var j$1 = i$6; j$1 < end$1; ++j$1) { types[j$1] = replace$1; }
            i$6 = end$1 - 1;
          }
        }

        // Here we depart from the documented algorithm, in order to avoid
        // building up an actual levels array. Since there are only three
        // levels (0, 1, 2) in an implementation that doesn't take
        // explicit embedding into account, we can build up the order on
        // the fly, without following the level-based algorithm.
        var order = [], m;
        for (var i$7 = 0; i$7 < len;) {
          if (countsAsLeft.test(types[i$7])) {
            var start = i$7;
            for (++i$7; i$7 < len && countsAsLeft.test(types[i$7]); ++i$7) {}
            order.push(new BidiSpan(0, start, i$7));
          } else {
            var pos = i$7, at = order.length;
            for (++i$7; i$7 < len && types[i$7] != "L"; ++i$7) {}
            for (var j$2 = pos; j$2 < i$7;) {
              if (countsAsNum.test(types[j$2])) {
                if (pos < j$2) { order.splice(at, 0, new BidiSpan(1, pos, j$2)); }
                var nstart = j$2;
                for (++j$2; j$2 < i$7 && countsAsNum.test(types[j$2]); ++j$2) {}
                order.splice(at, 0, new BidiSpan(2, nstart, j$2));
                pos = j$2;
              } else { ++j$2; }
            }
            if (pos < i$7) { order.splice(at, 0, new BidiSpan(1, pos, i$7)); }
          }
        }
        if (direction == "ltr") {
          if (order[0].level == 1 && (m = str.match(/^\s+/))) {
            order[0].from = m[0].length;
            order.unshift(new BidiSpan(0, 0, m[0].length));
          }
          if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
            lst(order).to -= m[0].length;
            order.push(new BidiSpan(0, len - m[0].length, len));
          }
        }

        return direction == "rtl" ? order.reverse() : order
      }
    })();

    // Get the bidi ordering for the given line (and cache it). Returns
    // false for lines that are fully left-to-right, and an array of
    // BidiSpan objects otherwise.
    function getOrder(line, direction) {
      var order = line.order;
      if (order == null) { order = line.order = bidiOrdering(line.text, direction); }
      return order
    }

    // EVENT HANDLING

    // Lightweight event framework. on/off also work on DOM nodes,
    // registering native DOM handlers.

    var noHandlers = [];

    var on = function(emitter, type, f) {
      if (emitter.addEventListener) {
        emitter.addEventListener(type, f, false);
      } else if (emitter.attachEvent) {
        emitter.attachEvent("on" + type, f);
      } else {
        var map$$1 = emitter._handlers || (emitter._handlers = {});
        map$$1[type] = (map$$1[type] || noHandlers).concat(f);
      }
    };

    function getHandlers(emitter, type) {
      return emitter._handlers && emitter._handlers[type] || noHandlers
    }

    function off(emitter, type, f) {
      if (emitter.removeEventListener) {
        emitter.removeEventListener(type, f, false);
      } else if (emitter.detachEvent) {
        emitter.detachEvent("on" + type, f);
      } else {
        var map$$1 = emitter._handlers, arr = map$$1 && map$$1[type];
        if (arr) {
          var index = indexOf(arr, f);
          if (index > -1)
            { map$$1[type] = arr.slice(0, index).concat(arr.slice(index + 1)); }
        }
      }
    }

    function signal(emitter, type /*, values...*/) {
      var handlers = getHandlers(emitter, type);
      if (!handlers.length) { return }
      var args = Array.prototype.slice.call(arguments, 2);
      for (var i = 0; i < handlers.length; ++i) { handlers[i].apply(null, args); }
    }

    // The DOM events that CodeMirror handles can be overridden by
    // registering a (non-DOM) handler on the editor for the event name,
    // and preventDefault-ing the event in that handler.
    function signalDOMEvent(cm, e, override) {
      if (typeof e == "string")
        { e = {type: e, preventDefault: function() { this.defaultPrevented = true; }}; }
      signal(cm, override || e.type, cm, e);
      return e_defaultPrevented(e) || e.codemirrorIgnore
    }

    function signalCursorActivity(cm) {
      var arr = cm._handlers && cm._handlers.cursorActivity;
      if (!arr) { return }
      var set = cm.curOp.cursorActivityHandlers || (cm.curOp.cursorActivityHandlers = []);
      for (var i = 0; i < arr.length; ++i) { if (indexOf(set, arr[i]) == -1)
        { set.push(arr[i]); } }
    }

    function hasHandler(emitter, type) {
      return getHandlers(emitter, type).length > 0
    }

    // Add on and off methods to a constructor's prototype, to make
    // registering events on such objects more convenient.
    function eventMixin(ctor) {
      ctor.prototype.on = function(type, f) {on(this, type, f);};
      ctor.prototype.off = function(type, f) {off(this, type, f);};
    }

    // Due to the fact that we still support jurassic IE versions, some
    // compatibility wrappers are needed.

    function e_preventDefault(e) {
      if (e.preventDefault) { e.preventDefault(); }
      else { e.returnValue = false; }
    }
    function e_stopPropagation(e) {
      if (e.stopPropagation) { e.stopPropagation(); }
      else { e.cancelBubble = true; }
    }
    function e_defaultPrevented(e) {
      return e.defaultPrevented != null ? e.defaultPrevented : e.returnValue == false
    }
    function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}

    function e_target(e) {return e.target || e.srcElement}
    function e_button(e) {
      var b = e.which;
      if (b == null) {
        if (e.button & 1) { b = 1; }
        else if (e.button & 2) { b = 3; }
        else if (e.button & 4) { b = 2; }
      }
      if (mac && e.ctrlKey && b == 1) { b = 3; }
      return b
    }

    // Detect drag-and-drop
    var dragAndDrop = function() {
      // There is *some* kind of drag-and-drop support in IE6-8, but I
      // couldn't get it to work yet.
      if (ie && ie_version < 9) { return false }
      var div = elt('div');
      return "draggable" in div || "dragDrop" in div
    }();

    var zwspSupported;
    function zeroWidthElement(measure) {
      if (zwspSupported == null) {
        var test = elt("span", "\u200b");
        removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
        if (measure.firstChild.offsetHeight != 0)
          { zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !(ie && ie_version < 8); }
      }
      var node = zwspSupported ? elt("span", "\u200b") :
        elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
      node.setAttribute("cm-text", "");
      return node
    }

    // Feature-detect IE's crummy client rect reporting for bidi text
    var badBidiRects;
    function hasBadBidiRects(measure) {
      if (badBidiRects != null) { return badBidiRects }
      var txt = removeChildrenAndAdd(measure, document.createTextNode("A\u062eA"));
      var r0 = range(txt, 0, 1).getBoundingClientRect();
      var r1 = range(txt, 1, 2).getBoundingClientRect();
      removeChildren(measure);
      if (!r0 || r0.left == r0.right) { return false } // Safari returns null in some cases (#2780)
      return badBidiRects = (r1.right - r0.right < 3)
    }

    // See if "".split is the broken IE version, if so, provide an
    // alternative way to split lines.
    var splitLinesAuto = "\n\nb".split(/\n/).length != 3 ? function (string) {
      var pos = 0, result = [], l = string.length;
      while (pos <= l) {
        var nl = string.indexOf("\n", pos);
        if (nl == -1) { nl = string.length; }
        var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
        var rt = line.indexOf("\r");
        if (rt != -1) {
          result.push(line.slice(0, rt));
          pos += rt + 1;
        } else {
          result.push(line);
          pos = nl + 1;
        }
      }
      return result
    } : function (string) { return string.split(/\r\n?|\n/); };

    var hasSelection = window.getSelection ? function (te) {
      try { return te.selectionStart != te.selectionEnd }
      catch(e) { return false }
    } : function (te) {
      var range$$1;
      try {range$$1 = te.ownerDocument.selection.createRange();}
      catch(e) {}
      if (!range$$1 || range$$1.parentElement() != te) { return false }
      return range$$1.compareEndPoints("StartToEnd", range$$1) != 0
    };

    var hasCopyEvent = (function () {
      var e = elt("div");
      if ("oncopy" in e) { return true }
      e.setAttribute("oncopy", "return;");
      return typeof e.oncopy == "function"
    })();

    var badZoomedRects = null;
    function hasBadZoomedRects(measure) {
      if (badZoomedRects != null) { return badZoomedRects }
      var node = removeChildrenAndAdd(measure, elt("span", "x"));
      var normal = node.getBoundingClientRect();
      var fromRange = range(node, 0, 1).getBoundingClientRect();
      return badZoomedRects = Math.abs(normal.left - fromRange.left) > 1
    }

    // Known modes, by name and by MIME
    var modes = {}, mimeModes = {};

    // Extra arguments are stored as the mode's dependencies, which is
    // used by (legacy) mechanisms like loadmode.js to automatically
    // load a mode. (Preferred mechanism is the require/define calls.)
    function defineMode(name, mode) {
      if (arguments.length > 2)
        { mode.dependencies = Array.prototype.slice.call(arguments, 2); }
      modes[name] = mode;
    }

    function defineMIME(mime, spec) {
      mimeModes[mime] = spec;
    }

    // Given a MIME type, a {name, ...options} config object, or a name
    // string, return a mode config object.
    function resolveMode(spec) {
      if (typeof spec == "string" && mimeModes.hasOwnProperty(spec)) {
        spec = mimeModes[spec];
      } else if (spec && typeof spec.name == "string" && mimeModes.hasOwnProperty(spec.name)) {
        var found = mimeModes[spec.name];
        if (typeof found == "string") { found = {name: found}; }
        spec = createObj(found, spec);
        spec.name = found.name;
      } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec)) {
        return resolveMode("application/xml")
      } else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+json$/.test(spec)) {
        return resolveMode("application/json")
      }
      if (typeof spec == "string") { return {name: spec} }
      else { return spec || {name: "null"} }
    }

    // Given a mode spec (anything that resolveMode accepts), find and
    // initialize an actual mode object.
    function getMode(options, spec) {
      spec = resolveMode(spec);
      var mfactory = modes[spec.name];
      if (!mfactory) { return getMode(options, "text/plain") }
      var modeObj = mfactory(options, spec);
      if (modeExtensions.hasOwnProperty(spec.name)) {
        var exts = modeExtensions[spec.name];
        for (var prop in exts) {
          if (!exts.hasOwnProperty(prop)) { continue }
          if (modeObj.hasOwnProperty(prop)) { modeObj["_" + prop] = modeObj[prop]; }
          modeObj[prop] = exts[prop];
        }
      }
      modeObj.name = spec.name;
      if (spec.helperType) { modeObj.helperType = spec.helperType; }
      if (spec.modeProps) { for (var prop$1 in spec.modeProps)
        { modeObj[prop$1] = spec.modeProps[prop$1]; } }

      return modeObj
    }

    // This can be used to attach properties to mode objects from
    // outside the actual mode definition.
    var modeExtensions = {};
    function extendMode(mode, properties) {
      var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
      copyObj(properties, exts);
    }

    function copyState(mode, state) {
      if (state === true) { return state }
      if (mode.copyState) { return mode.copyState(state) }
      var nstate = {};
      for (var n in state) {
        var val = state[n];
        if (val instanceof Array) { val = val.concat([]); }
        nstate[n] = val;
      }
      return nstate
    }

    // Given a mode and a state (for that mode), find the inner mode and
    // state at the position that the state refers to.
    function innerMode(mode, state) {
      var info;
      while (mode.innerMode) {
        info = mode.innerMode(state);
        if (!info || info.mode == mode) { break }
        state = info.state;
        mode = info.mode;
      }
      return info || {mode: mode, state: state}
    }

    function startState(mode, a1, a2) {
      return mode.startState ? mode.startState(a1, a2) : true
    }

    // STRING STREAM

    // Fed to the mode parsers, provides helper functions to make
    // parsers more succinct.

    var StringStream = function(string, tabSize, lineOracle) {
      this.pos = this.start = 0;
      this.string = string;
      this.tabSize = tabSize || 8;
      this.lastColumnPos = this.lastColumnValue = 0;
      this.lineStart = 0;
      this.lineOracle = lineOracle;
    };

    StringStream.prototype.eol = function () {return this.pos >= this.string.length};
    StringStream.prototype.sol = function () {return this.pos == this.lineStart};
    StringStream.prototype.peek = function () {return this.string.charAt(this.pos) || undefined};
    StringStream.prototype.next = function () {
      if (this.pos < this.string.length)
        { return this.string.charAt(this.pos++) }
    };
    StringStream.prototype.eat = function (match) {
      var ch = this.string.charAt(this.pos);
      var ok;
      if (typeof match == "string") { ok = ch == match; }
      else { ok = ch && (match.test ? match.test(ch) : match(ch)); }
      if (ok) {++this.pos; return ch}
    };
    StringStream.prototype.eatWhile = function (match) {
      var start = this.pos;
      while (this.eat(match)){}
      return this.pos > start
    };
    StringStream.prototype.eatSpace = function () {
        var this$1 = this;

      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) { ++this$1.pos; }
      return this.pos > start
    };
    StringStream.prototype.skipToEnd = function () {this.pos = this.string.length;};
    StringStream.prototype.skipTo = function (ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {this.pos = found; return true}
    };
    StringStream.prototype.backUp = function (n) {this.pos -= n;};
    StringStream.prototype.column = function () {
      if (this.lastColumnPos < this.start) {
        this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
        this.lastColumnPos = this.start;
      }
      return this.lastColumnValue - (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
    };
    StringStream.prototype.indentation = function () {
      return countColumn(this.string, null, this.tabSize) -
        (this.lineStart ? countColumn(this.string, this.lineStart, this.tabSize) : 0)
    };
    StringStream.prototype.match = function (pattern, consume, caseInsensitive) {
      if (typeof pattern == "string") {
        var cased = function (str) { return caseInsensitive ? str.toLowerCase() : str; };
        var substr = this.string.substr(this.pos, pattern.length);
        if (cased(substr) == cased(pattern)) {
          if (consume !== false) { this.pos += pattern.length; }
          return true
        }
      } else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && match.index > 0) { return null }
        if (match && consume !== false) { this.pos += match[0].length; }
        return match
      }
    };
    StringStream.prototype.current = function (){return this.string.slice(this.start, this.pos)};
    StringStream.prototype.hideFirstChars = function (n, inner) {
      this.lineStart += n;
      try { return inner() }
      finally { this.lineStart -= n; }
    };
    StringStream.prototype.lookAhead = function (n) {
      var oracle = this.lineOracle;
      return oracle && oracle.lookAhead(n)
    };
    StringStream.prototype.baseToken = function () {
      var oracle = this.lineOracle;
      return oracle && oracle.baseToken(this.pos)
    };

    // Find the line object corresponding to the given line number.
    function getLine(doc, n) {
      n -= doc.first;
      if (n < 0 || n >= doc.size) { throw new Error("There is no line " + (n + doc.first) + " in the document.") }
      var chunk = doc;
      while (!chunk.lines) {
        for (var i = 0;; ++i) {
          var child = chunk.children[i], sz = child.chunkSize();
          if (n < sz) { chunk = child; break }
          n -= sz;
        }
      }
      return chunk.lines[n]
    }

    // Get the part of a document between two positions, as an array of
    // strings.
    function getBetween(doc, start, end) {
      var out = [], n = start.line;
      doc.iter(start.line, end.line + 1, function (line) {
        var text = line.text;
        if (n == end.line) { text = text.slice(0, end.ch); }
        if (n == start.line) { text = text.slice(start.ch); }
        out.push(text);
        ++n;
      });
      return out
    }
    // Get the lines between from and to, as array of strings.
    function getLines(doc, from, to) {
      var out = [];
      doc.iter(from, to, function (line) { out.push(line.text); }); // iter aborts when callback returns truthy value
      return out
    }

    // Update the height of a line, propagating the height change
    // upwards to parent nodes.
    function updateLineHeight(line, height) {
      var diff = height - line.height;
      if (diff) { for (var n = line; n; n = n.parent) { n.height += diff; } }
    }

    // Given a line object, find its line number by walking up through
    // its parent links.
    function lineNo(line) {
      if (line.parent == null) { return null }
      var cur = line.parent, no = indexOf(cur.lines, line);
      for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
        for (var i = 0;; ++i) {
          if (chunk.children[i] == cur) { break }
          no += chunk.children[i].chunkSize();
        }
      }
      return no + cur.first
    }

    // Find the line at the given vertical position, using the height
    // information in the document tree.
    function lineAtHeight(chunk, h) {
      var n = chunk.first;
      outer: do {
        for (var i$1 = 0; i$1 < chunk.children.length; ++i$1) {
          var child = chunk.children[i$1], ch = child.height;
          if (h < ch) { chunk = child; continue outer }
          h -= ch;
          n += child.chunkSize();
        }
        return n
      } while (!chunk.lines)
      var i = 0;
      for (; i < chunk.lines.length; ++i) {
        var line = chunk.lines[i], lh = line.height;
        if (h < lh) { break }
        h -= lh;
      }
      return n + i
    }

    function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size}

    function lineNumberFor(options, i) {
      return String(options.lineNumberFormatter(i + options.firstLineNumber))
    }

    // A Pos instance represents a position within the text.
    function Pos(line, ch, sticky) {
      if ( sticky === void 0 ) sticky = null;

      if (!(this instanceof Pos)) { return new Pos(line, ch, sticky) }
      this.line = line;
      this.ch = ch;
      this.sticky = sticky;
    }

    // Compare two positions, return 0 if they are the same, a negative
    // number when a is less, and a positive number otherwise.
    function cmp(a, b) { return a.line - b.line || a.ch - b.ch }

    function equalCursorPos(a, b) { return a.sticky == b.sticky && cmp(a, b) == 0 }

    function copyPos(x) {return Pos(x.line, x.ch)}
    function maxPos(a, b) { return cmp(a, b) < 0 ? b : a }
    function minPos(a, b) { return cmp(a, b) < 0 ? a : b }

    // Most of the external API clips given positions to make sure they
    // actually exist within the document.
    function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1))}
    function clipPos(doc, pos) {
      if (pos.line < doc.first) { return Pos(doc.first, 0) }
      var last = doc.first + doc.size - 1;
      if (pos.line > last) { return Pos(last, getLine(doc, last).text.length) }
      return clipToLen(pos, getLine(doc, pos.line).text.length)
    }
    function clipToLen(pos, linelen) {
      var ch = pos.ch;
      if (ch == null || ch > linelen) { return Pos(pos.line, linelen) }
      else if (ch < 0) { return Pos(pos.line, 0) }
      else { return pos }
    }
    function clipPosArray(doc, array) {
      var out = [];
      for (var i = 0; i < array.length; i++) { out[i] = clipPos(doc, array[i]); }
      return out
    }

    var SavedContext = function(state, lookAhead) {
      this.state = state;
      this.lookAhead = lookAhead;
    };

    var Context = function(doc, state, line, lookAhead) {
      this.state = state;
      this.doc = doc;
      this.line = line;
      this.maxLookAhead = lookAhead || 0;
      this.baseTokens = null;
      this.baseTokenPos = 1;
    };

    Context.prototype.lookAhead = function (n) {
      var line = this.doc.getLine(this.line + n);
      if (line != null && n > this.maxLookAhead) { this.maxLookAhead = n; }
      return line
    };

    Context.prototype.baseToken = function (n) {
        var this$1 = this;

      if (!this.baseTokens) { return null }
      while (this.baseTokens[this.baseTokenPos] <= n)
        { this$1.baseTokenPos += 2; }
      var type = this.baseTokens[this.baseTokenPos + 1];
      return {type: type && type.replace(/( |^)overlay .*/, ""),
              size: this.baseTokens[this.baseTokenPos] - n}
    };

    Context.prototype.nextLine = function () {
      this.line++;
      if (this.maxLookAhead > 0) { this.maxLookAhead--; }
    };

    Context.fromSaved = function (doc, saved, line) {
      if (saved instanceof SavedContext)
        { return new Context(doc, copyState(doc.mode, saved.state), line, saved.lookAhead) }
      else
        { return new Context(doc, copyState(doc.mode, saved), line) }
    };

    Context.prototype.save = function (copy) {
      var state = copy !== false ? copyState(this.doc.mode, this.state) : this.state;
      return this.maxLookAhead > 0 ? new SavedContext(state, this.maxLookAhead) : state
    };


    // Compute a style array (an array starting with a mode generation
    // -- for invalidation -- followed by pairs of end positions and
    // style strings), which is used to highlight the tokens on the
    // line.
    function highlightLine(cm, line, context, forceToEnd) {
      // A styles array always starts with a number identifying the
      // mode/overlays that it is based on (for easy invalidation).
      var st = [cm.state.modeGen], lineClasses = {};
      // Compute the base array of styles
      runMode(cm, line.text, cm.doc.mode, context, function (end, style) { return st.push(end, style); },
              lineClasses, forceToEnd);
      var state = context.state;

      // Run overlays, adjust style array.
      var loop = function ( o ) {
        context.baseTokens = st;
        var overlay = cm.state.overlays[o], i = 1, at = 0;
        context.state = true;
        runMode(cm, line.text, overlay.mode, context, function (end, style) {
          var start = i;
          // Ensure there's a token end at the current position, and that i points at it
          while (at < end) {
            var i_end = st[i];
            if (i_end > end)
              { st.splice(i, 1, end, st[i+1], i_end); }
            i += 2;
            at = Math.min(end, i_end);
          }
          if (!style) { return }
          if (overlay.opaque) {
            st.splice(start, i - start, end, "overlay " + style);
            i = start + 2;
          } else {
            for (; start < i; start += 2) {
              var cur = st[start+1];
              st[start+1] = (cur ? cur + " " : "") + "overlay " + style;
            }
          }
        }, lineClasses);
        context.state = state;
        context.baseTokens = null;
        context.baseTokenPos = 1;
      };

      for (var o = 0; o < cm.state.overlays.length; ++o) loop( o );

      return {styles: st, classes: lineClasses.bgClass || lineClasses.textClass ? lineClasses : null}
    }

    function getLineStyles(cm, line, updateFrontier) {
      if (!line.styles || line.styles[0] != cm.state.modeGen) {
        var context = getContextBefore(cm, lineNo(line));
        var resetState = line.text.length > cm.options.maxHighlightLength && copyState(cm.doc.mode, context.state);
        var result = highlightLine(cm, line, context);
        if (resetState) { context.state = resetState; }
        line.stateAfter = context.save(!resetState);
        line.styles = result.styles;
        if (result.classes) { line.styleClasses = result.classes; }
        else if (line.styleClasses) { line.styleClasses = null; }
        if (updateFrontier === cm.doc.highlightFrontier)
          { cm.doc.modeFrontier = Math.max(cm.doc.modeFrontier, ++cm.doc.highlightFrontier); }
      }
      return line.styles
    }

    function getContextBefore(cm, n, precise) {
      var doc = cm.doc, display = cm.display;
      if (!doc.mode.startState) { return new Context(doc, true, n) }
      var start = findStartLine(cm, n, precise);
      var saved = start > doc.first && getLine(doc, start - 1).stateAfter;
      var context = saved ? Context.fromSaved(doc, saved, start) : new Context(doc, startState(doc.mode), start);

      doc.iter(start, n, function (line) {
        processLine(cm, line.text, context);
        var pos = context.line;
        line.stateAfter = pos == n - 1 || pos % 5 == 0 || pos >= display.viewFrom && pos < display.viewTo ? context.save() : null;
        context.nextLine();
      });
      if (precise) { doc.modeFrontier = context.line; }
      return context
    }

    // Lightweight form of highlight -- proceed over this line and
    // update state, but don't save a style array. Used for lines that
    // aren't currently visible.
    function processLine(cm, text, context, startAt) {
      var mode = cm.doc.mode;
      var stream = new StringStream(text, cm.options.tabSize, context);
      stream.start = stream.pos = startAt || 0;
      if (text == "") { callBlankLine(mode, context.state); }
      while (!stream.eol()) {
        readToken(mode, stream, context.state);
        stream.start = stream.pos;
      }
    }

    function callBlankLine(mode, state) {
      if (mode.blankLine) { return mode.blankLine(state) }
      if (!mode.innerMode) { return }
      var inner = innerMode(mode, state);
      if (inner.mode.blankLine) { return inner.mode.blankLine(inner.state) }
    }

    function readToken(mode, stream, state, inner) {
      for (var i = 0; i < 10; i++) {
        if (inner) { inner[0] = innerMode(mode, state).mode; }
        var style = mode.token(stream, state);
        if (stream.pos > stream.start) { return style }
      }
      throw new Error("Mode " + mode.name + " failed to advance stream.")
    }

    var Token = function(stream, type, state) {
      this.start = stream.start; this.end = stream.pos;
      this.string = stream.current();
      this.type = type || null;
      this.state = state;
    };

    // Utility for getTokenAt and getLineTokens
    function takeToken(cm, pos, precise, asArray) {
      var doc = cm.doc, mode = doc.mode, style;
      pos = clipPos(doc, pos);
      var line = getLine(doc, pos.line), context = getContextBefore(cm, pos.line, precise);
      var stream = new StringStream(line.text, cm.options.tabSize, context), tokens;
      if (asArray) { tokens = []; }
      while ((asArray || stream.pos < pos.ch) && !stream.eol()) {
        stream.start = stream.pos;
        style = readToken(mode, stream, context.state);
        if (asArray) { tokens.push(new Token(stream, style, copyState(doc.mode, context.state))); }
      }
      return asArray ? tokens : new Token(stream, style, context.state)
    }

    function extractLineClasses(type, output) {
      if (type) { for (;;) {
        var lineClass = type.match(/(?:^|\s+)line-(background-)?(\S+)/);
        if (!lineClass) { break }
        type = type.slice(0, lineClass.index) + type.slice(lineClass.index + lineClass[0].length);
        var prop = lineClass[1] ? "bgClass" : "textClass";
        if (output[prop] == null)
          { output[prop] = lineClass[2]; }
        else if (!(new RegExp("(?:^|\s)" + lineClass[2] + "(?:$|\s)")).test(output[prop]))
          { output[prop] += " " + lineClass[2]; }
      } }
      return type
    }

    // Run the given mode's parser over a line, calling f for each token.
    function runMode(cm, text, mode, context, f, lineClasses, forceToEnd) {
      var flattenSpans = mode.flattenSpans;
      if (flattenSpans == null) { flattenSpans = cm.options.flattenSpans; }
      var curStart = 0, curStyle = null;
      var stream = new StringStream(text, cm.options.tabSize, context), style;
      var inner = cm.options.addModeClass && [null];
      if (text == "") { extractLineClasses(callBlankLine(mode, context.state), lineClasses); }
      while (!stream.eol()) {
        if (stream.pos > cm.options.maxHighlightLength) {
          flattenSpans = false;
          if (forceToEnd) { processLine(cm, text, context, stream.pos); }
          stream.pos = text.length;
          style = null;
        } else {
          style = extractLineClasses(readToken(mode, stream, context.state, inner), lineClasses);
        }
        if (inner) {
          var mName = inner[0].name;
          if (mName) { style = "m-" + (style ? mName + " " + style : mName); }
        }
        if (!flattenSpans || curStyle != style) {
          while (curStart < stream.start) {
            curStart = Math.min(stream.start, curStart + 5000);
            f(curStart, curStyle);
          }
          curStyle = style;
        }
        stream.start = stream.pos;
      }
      while (curStart < stream.pos) {
        // Webkit seems to refuse to render text nodes longer than 57444
        // characters, and returns inaccurate measurements in nodes
        // starting around 5000 chars.
        var pos = Math.min(stream.pos, curStart + 5000);
        f(pos, curStyle);
        curStart = pos;
      }
    }

    // Finds the line to start with when starting a parse. Tries to
    // find a line with a stateAfter, so that it can start with a
    // valid state. If that fails, it returns the line with the
    // smallest indentation, which tends to need the least context to
    // parse correctly.
    function findStartLine(cm, n, precise) {
      var minindent, minline, doc = cm.doc;
      var lim = precise ? -1 : n - (cm.doc.mode.innerMode ? 1000 : 100);
      for (var search = n; search > lim; --search) {
        if (search <= doc.first) { return doc.first }
        var line = getLine(doc, search - 1), after = line.stateAfter;
        if (after && (!precise || search + (after instanceof SavedContext ? after.lookAhead : 0) <= doc.modeFrontier))
          { return search }
        var indented = countColumn(line.text, null, cm.options.tabSize);
        if (minline == null || minindent > indented) {
          minline = search - 1;
          minindent = indented;
        }
      }
      return minline
    }

    function retreatFrontier(doc, n) {
      doc.modeFrontier = Math.min(doc.modeFrontier, n);
      if (doc.highlightFrontier < n - 10) { return }
      var start = doc.first;
      for (var line = n - 1; line > start; line--) {
        var saved = getLine(doc, line).stateAfter;
        // change is on 3
        // state on line 1 looked ahead 2 -- so saw 3
        // test 1 + 2 < 3 should cover this
        if (saved && (!(saved instanceof SavedContext) || line + saved.lookAhead < n)) {
          start = line + 1;
          break
        }
      }
      doc.highlightFrontier = Math.min(doc.highlightFrontier, start);
    }

    // Optimize some code when these features are not used.
    var sawReadOnlySpans = false, sawCollapsedSpans = false;

    function seeReadOnlySpans() {
      sawReadOnlySpans = true;
    }

    function seeCollapsedSpans() {
      sawCollapsedSpans = true;
    }

    // TEXTMARKER SPANS

    function MarkedSpan(marker, from, to) {
      this.marker = marker;
      this.from = from; this.to = to;
    }

    // Search an array of spans for a span matching the given marker.
    function getMarkedSpanFor(spans, marker) {
      if (spans) { for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if (span.marker == marker) { return span }
      } }
    }
    // Remove a span from an array, returning undefined if no spans are
    // left (we don't store arrays for lines without spans).
    function removeMarkedSpan(spans, span) {
      var r;
      for (var i = 0; i < spans.length; ++i)
        { if (spans[i] != span) { (r || (r = [])).push(spans[i]); } }
      return r
    }
    // Add a span to a line.
    function addMarkedSpan(line, span) {
      line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
      span.marker.attachLine(line);
    }

    // Used for the algorithm that adjusts markers for a change in the
    // document. These functions cut an array of spans at a given
    // character position, returning an array of remaining chunks (or
    // undefined if nothing remains).
    function markedSpansBefore(old, startCh, isInsert) {
      var nw;
      if (old) { for (var i = 0; i < old.length; ++i) {
        var span = old[i], marker = span.marker;
        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
        if (startsBefore || span.from == startCh && marker.type == "bookmark" && (!isInsert || !span.marker.insertLeft)) {
          var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh)
          ;(nw || (nw = [])).push(new MarkedSpan(marker, span.from, endsAfter ? null : span.to));
        }
      } }
      return nw
    }
    function markedSpansAfter(old, endCh, isInsert) {
      var nw;
      if (old) { for (var i = 0; i < old.length; ++i) {
        var span = old[i], marker = span.marker;
        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
        if (endsAfter || span.from == endCh && marker.type == "bookmark" && (!isInsert || span.marker.insertLeft)) {
          var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh)
          ;(nw || (nw = [])).push(new MarkedSpan(marker, startsBefore ? null : span.from - endCh,
                                                span.to == null ? null : span.to - endCh));
        }
      } }
      return nw
    }

    // Given a change object, compute the new set of marker spans that
    // cover the line in which the change took place. Removes spans
    // entirely within the change, reconnects spans belonging to the
    // same marker that appear on both sides of the change, and cuts off
    // spans partially within the change. Returns an array of span
    // arrays with one element for each line in (after) the change.
    function stretchSpansOverChange(doc, change) {
      if (change.full) { return null }
      var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
      var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
      if (!oldFirst && !oldLast) { return null }

      var startCh = change.from.ch, endCh = change.to.ch, isInsert = cmp(change.from, change.to) == 0;
      // Get the spans that 'stick out' on both sides
      var first = markedSpansBefore(oldFirst, startCh, isInsert);
      var last = markedSpansAfter(oldLast, endCh, isInsert);

      // Next, merge those two ends
      var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
      if (first) {
        // Fix up .to properties of first
        for (var i = 0; i < first.length; ++i) {
          var span = first[i];
          if (span.to == null) {
            var found = getMarkedSpanFor(last, span.marker);
            if (!found) { span.to = startCh; }
            else if (sameLine) { span.to = found.to == null ? null : found.to + offset; }
          }
        }
      }
      if (last) {
        // Fix up .from in last (or move them into first in case of sameLine)
        for (var i$1 = 0; i$1 < last.length; ++i$1) {
          var span$1 = last[i$1];
          if (span$1.to != null) { span$1.to += offset; }
          if (span$1.from == null) {
            var found$1 = getMarkedSpanFor(first, span$1.marker);
            if (!found$1) {
              span$1.from = offset;
              if (sameLine) { (first || (first = [])).push(span$1); }
            }
          } else {
            span$1.from += offset;
            if (sameLine) { (first || (first = [])).push(span$1); }
          }
        }
      }
      // Make sure we didn't create any zero-length spans
      if (first) { first = clearEmptySpans(first); }
      if (last && last != first) { last = clearEmptySpans(last); }

      var newMarkers = [first];
      if (!sameLine) {
        // Fill gap with whole-line-spans
        var gap = change.text.length - 2, gapMarkers;
        if (gap > 0 && first)
          { for (var i$2 = 0; i$2 < first.length; ++i$2)
            { if (first[i$2].to == null)
              { (gapMarkers || (gapMarkers = [])).push(new MarkedSpan(first[i$2].marker, null, null)); } } }
        for (var i$3 = 0; i$3 < gap; ++i$3)
          { newMarkers.push(gapMarkers); }
        newMarkers.push(last);
      }
      return newMarkers
    }

    // Remove spans that are empty and don't have a clearWhenEmpty
    // option of false.
    function clearEmptySpans(spans) {
      for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if (span.from != null && span.from == span.to && span.marker.clearWhenEmpty !== false)
          { spans.splice(i--, 1); }
      }
      if (!spans.length) { return null }
      return spans
    }

    // Used to 'clip' out readOnly ranges when making a change.
    function removeReadOnlyRanges(doc, from, to) {
      var markers = null;
      doc.iter(from.line, to.line + 1, function (line) {
        if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
          var mark = line.markedSpans[i].marker;
          if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
            { (markers || (markers = [])).push(mark); }
        } }
      });
      if (!markers) { return null }
      var parts = [{from: from, to: to}];
      for (var i = 0; i < markers.length; ++i) {
        var mk = markers[i], m = mk.find(0);
        for (var j = 0; j < parts.length; ++j) {
          var p = parts[j];
          if (cmp(p.to, m.from) < 0 || cmp(p.from, m.to) > 0) { continue }
          var newParts = [j, 1], dfrom = cmp(p.from, m.from), dto = cmp(p.to, m.to);
          if (dfrom < 0 || !mk.inclusiveLeft && !dfrom)
            { newParts.push({from: p.from, to: m.from}); }
          if (dto > 0 || !mk.inclusiveRight && !dto)
            { newParts.push({from: m.to, to: p.to}); }
          parts.splice.apply(parts, newParts);
          j += newParts.length - 3;
        }
      }
      return parts
    }

    // Connect or disconnect spans from a line.
    function detachMarkedSpans(line) {
      var spans = line.markedSpans;
      if (!spans) { return }
      for (var i = 0; i < spans.length; ++i)
        { spans[i].marker.detachLine(line); }
      line.markedSpans = null;
    }
    function attachMarkedSpans(line, spans) {
      if (!spans) { return }
      for (var i = 0; i < spans.length; ++i)
        { spans[i].marker.attachLine(line); }
      line.markedSpans = spans;
    }

    // Helpers used when computing which overlapping collapsed span
    // counts as the larger one.
    function extraLeft(marker) { return marker.inclusiveLeft ? -1 : 0 }
    function extraRight(marker) { return marker.inclusiveRight ? 1 : 0 }

    // Returns a number indicating which of two overlapping collapsed
    // spans is larger (and thus includes the other). Falls back to
    // comparing ids when the spans cover exactly the same range.
    function compareCollapsedMarkers(a, b) {
      var lenDiff = a.lines.length - b.lines.length;
      if (lenDiff != 0) { return lenDiff }
      var aPos = a.find(), bPos = b.find();
      var fromCmp = cmp(aPos.from, bPos.from) || extraLeft(a) - extraLeft(b);
      if (fromCmp) { return -fromCmp }
      var toCmp = cmp(aPos.to, bPos.to) || extraRight(a) - extraRight(b);
      if (toCmp) { return toCmp }
      return b.id - a.id
    }

    // Find out whether a line ends or starts in a collapsed span. If
    // so, return the marker for that span.
    function collapsedSpanAtSide(line, start) {
      var sps = sawCollapsedSpans && line.markedSpans, found;
      if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
        sp = sps[i];
        if (sp.marker.collapsed && (start ? sp.from : sp.to) == null &&
            (!found || compareCollapsedMarkers(found, sp.marker) < 0))
          { found = sp.marker; }
      } }
      return found
    }
    function collapsedSpanAtStart(line) { return collapsedSpanAtSide(line, true) }
    function collapsedSpanAtEnd(line) { return collapsedSpanAtSide(line, false) }

    function collapsedSpanAround(line, ch) {
      var sps = sawCollapsedSpans && line.markedSpans, found;
      if (sps) { for (var i = 0; i < sps.length; ++i) {
        var sp = sps[i];
        if (sp.marker.collapsed && (sp.from == null || sp.from < ch) && (sp.to == null || sp.to > ch) &&
            (!found || compareCollapsedMarkers(found, sp.marker) < 0)) { found = sp.marker; }
      } }
      return found
    }

    // Test whether there exists a collapsed span that partially
    // overlaps (covers the start or end, but not both) of a new span.
    // Such overlap is not allowed.
    function conflictingCollapsedRange(doc, lineNo$$1, from, to, marker) {
      var line = getLine(doc, lineNo$$1);
      var sps = sawCollapsedSpans && line.markedSpans;
      if (sps) { for (var i = 0; i < sps.length; ++i) {
        var sp = sps[i];
        if (!sp.marker.collapsed) { continue }
        var found = sp.marker.find(0);
        var fromCmp = cmp(found.from, from) || extraLeft(sp.marker) - extraLeft(marker);
        var toCmp = cmp(found.to, to) || extraRight(sp.marker) - extraRight(marker);
        if (fromCmp >= 0 && toCmp <= 0 || fromCmp <= 0 && toCmp >= 0) { continue }
        if (fromCmp <= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.to, from) >= 0 : cmp(found.to, from) > 0) ||
            fromCmp >= 0 && (sp.marker.inclusiveRight && marker.inclusiveLeft ? cmp(found.from, to) <= 0 : cmp(found.from, to) < 0))
          { return true }
      } }
    }

    // A visual line is a line as drawn on the screen. Folding, for
    // example, can cause multiple logical lines to appear on the same
    // visual line. This finds the start of the visual line that the
    // given line is part of (usually that is the line itself).
    function visualLine(line) {
      var merged;
      while (merged = collapsedSpanAtStart(line))
        { line = merged.find(-1, true).line; }
      return line
    }

    function visualLineEnd(line) {
      var merged;
      while (merged = collapsedSpanAtEnd(line))
        { line = merged.find(1, true).line; }
      return line
    }

    // Returns an array of logical lines that continue the visual line
    // started by the argument, or undefined if there are no such lines.
    function visualLineContinued(line) {
      var merged, lines;
      while (merged = collapsedSpanAtEnd(line)) {
        line = merged.find(1, true).line
        ;(lines || (lines = [])).push(line);
      }
      return lines
    }

    // Get the line number of the start of the visual line that the
    // given line number is part of.
    function visualLineNo(doc, lineN) {
      var line = getLine(doc, lineN), vis = visualLine(line);
      if (line == vis) { return lineN }
      return lineNo(vis)
    }

    // Get the line number of the start of the next visual line after
    // the given line.
    function visualLineEndNo(doc, lineN) {
      if (lineN > doc.lastLine()) { return lineN }
      var line = getLine(doc, lineN), merged;
      if (!lineIsHidden(doc, line)) { return lineN }
      while (merged = collapsedSpanAtEnd(line))
        { line = merged.find(1, true).line; }
      return lineNo(line) + 1
    }

    // Compute whether a line is hidden. Lines count as hidden when they
    // are part of a visual line that starts with another line, or when
    // they are entirely covered by collapsed, non-widget span.
    function lineIsHidden(doc, line) {
      var sps = sawCollapsedSpans && line.markedSpans;
      if (sps) { for (var sp = (void 0), i = 0; i < sps.length; ++i) {
        sp = sps[i];
        if (!sp.marker.collapsed) { continue }
        if (sp.from == null) { return true }
        if (sp.marker.widgetNode) { continue }
        if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
          { return true }
      } }
    }
    function lineIsHiddenInner(doc, line, span) {
      if (span.to == null) {
        var end = span.marker.find(1, true);
        return lineIsHiddenInner(doc, end.line, getMarkedSpanFor(end.line.markedSpans, span.marker))
      }
      if (span.marker.inclusiveRight && span.to == line.text.length)
        { return true }
      for (var sp = (void 0), i = 0; i < line.markedSpans.length; ++i) {
        sp = line.markedSpans[i];
        if (sp.marker.collapsed && !sp.marker.widgetNode && sp.from == span.to &&
            (sp.to == null || sp.to != span.from) &&
            (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
            lineIsHiddenInner(doc, line, sp)) { return true }
      }
    }

    // Find the height above the given line.
    function heightAtLine(lineObj) {
      lineObj = visualLine(lineObj);

      var h = 0, chunk = lineObj.parent;
      for (var i = 0; i < chunk.lines.length; ++i) {
        var line = chunk.lines[i];
        if (line == lineObj) { break }
        else { h += line.height; }
      }
      for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
        for (var i$1 = 0; i$1 < p.children.length; ++i$1) {
          var cur = p.children[i$1];
          if (cur == chunk) { break }
          else { h += cur.height; }
        }
      }
      return h
    }

    // Compute the character length of a line, taking into account
    // collapsed ranges (see markText) that might hide parts, and join
    // other lines onto it.
    function lineLength(line) {
      if (line.height == 0) { return 0 }
      var len = line.text.length, merged, cur = line;
      while (merged = collapsedSpanAtStart(cur)) {
        var found = merged.find(0, true);
        cur = found.from.line;
        len += found.from.ch - found.to.ch;
      }
      cur = line;
      while (merged = collapsedSpanAtEnd(cur)) {
        var found$1 = merged.find(0, true);
        len -= cur.text.length - found$1.from.ch;
        cur = found$1.to.line;
        len += cur.text.length - found$1.to.ch;
      }
      return len
    }

    // Find the longest line in the document.
    function findMaxLine(cm) {
      var d = cm.display, doc = cm.doc;
      d.maxLine = getLine(doc, doc.first);
      d.maxLineLength = lineLength(d.maxLine);
      d.maxLineChanged = true;
      doc.iter(function (line) {
        var len = lineLength(line);
        if (len > d.maxLineLength) {
          d.maxLineLength = len;
          d.maxLine = line;
        }
      });
    }

    // LINE DATA STRUCTURE

    // Line objects. These hold state related to a line, including
    // highlighting info (the styles array).
    var Line = function(text, markedSpans, estimateHeight) {
      this.text = text;
      attachMarkedSpans(this, markedSpans);
      this.height = estimateHeight ? estimateHeight(this) : 1;
    };

    Line.prototype.lineNo = function () { return lineNo(this) };
    eventMixin(Line);

    // Change the content (text, markers) of a line. Automatically
    // invalidates cached information and tries to re-estimate the
    // line's height.
    function updateLine(line, text, markedSpans, estimateHeight) {
      line.text = text;
      if (line.stateAfter) { line.stateAfter = null; }
      if (line.styles) { line.styles = null; }
      if (line.order != null) { line.order = null; }
      detachMarkedSpans(line);
      attachMarkedSpans(line, markedSpans);
      var estHeight = estimateHeight ? estimateHeight(line) : 1;
      if (estHeight != line.height) { updateLineHeight(line, estHeight); }
    }

    // Detach a line from the document tree and its markers.
    function cleanUpLine(line) {
      line.parent = null;
      detachMarkedSpans(line);
    }

    // Convert a style as returned by a mode (either null, or a string
    // containing one or more styles) to a CSS style. This is cached,
    // and also looks for line-wide styles.
    var styleToClassCache = {}, styleToClassCacheWithMode = {};
    function interpretTokenStyle(style, options) {
      if (!style || /^\s*$/.test(style)) { return null }
      var cache = options.addModeClass ? styleToClassCacheWithMode : styleToClassCache;
      return cache[style] ||
        (cache[style] = style.replace(/\S+/g, "cm-$&"))
    }

    // Render the DOM representation of the text of a line. Also builds
    // up a 'line map', which points at the DOM nodes that represent
    // specific stretches of text, and is used by the measuring code.
    // The returned object contains the DOM node, this map, and
    // information about line-wide styles that were set by the mode.
    function buildLineContent(cm, lineView) {
      // The padding-right forces the element to have a 'border', which
      // is needed on Webkit to be able to get line-level bounding
      // rectangles for it (in measureChar).
      var content = eltP("span", null, null, webkit ? "padding-right: .1px" : null);
      var builder = {pre: eltP("pre", [content], "CodeMirror-line"), content: content,
                     col: 0, pos: 0, cm: cm,
                     trailingSpace: false,
                     splitSpaces: cm.getOption("lineWrapping")};
      lineView.measure = {};

      // Iterate over the logical lines that make up this visual line.
      for (var i = 0; i <= (lineView.rest ? lineView.rest.length : 0); i++) {
        var line = i ? lineView.rest[i - 1] : lineView.line, order = (void 0);
        builder.pos = 0;
        builder.addToken = buildToken;
        // Optionally wire in some hacks into the token-rendering
        // algorithm, to deal with browser quirks.
        if (hasBadBidiRects(cm.display.measure) && (order = getOrder(line, cm.doc.direction)))
          { builder.addToken = buildTokenBadBidi(builder.addToken, order); }
        builder.map = [];
        var allowFrontierUpdate = lineView != cm.display.externalMeasured && lineNo(line);
        insertLineContent(line, builder, getLineStyles(cm, line, allowFrontierUpdate));
        if (line.styleClasses) {
          if (line.styleClasses.bgClass)
            { builder.bgClass = joinClasses(line.styleClasses.bgClass, builder.bgClass || ""); }
          if (line.styleClasses.textClass)
            { builder.textClass = joinClasses(line.styleClasses.textClass, builder.textClass || ""); }
        }

        // Ensure at least a single node is present, for measuring.
        if (builder.map.length == 0)
          { builder.map.push(0, 0, builder.content.appendChild(zeroWidthElement(cm.display.measure))); }

        // Store the map and a cache object for the current logical line
        if (i == 0) {
          lineView.measure.map = builder.map;
          lineView.measure.cache = {};
        } else {
    (lineView.measure.maps || (lineView.measure.maps = [])).push(builder.map)
          ;(lineView.measure.caches || (lineView.measure.caches = [])).push({});
        }
      }

      // See issue #2901
      if (webkit) {
        var last = builder.content.lastChild;
        if (/\bcm-tab\b/.test(last.className) || (last.querySelector && last.querySelector(".cm-tab")))
          { builder.content.className = "cm-tab-wrap-hack"; }
      }

      signal(cm, "renderLine", cm, lineView.line, builder.pre);
      if (builder.pre.className)
        { builder.textClass = joinClasses(builder.pre.className, builder.textClass || ""); }

      return builder
    }

    function defaultSpecialCharPlaceholder(ch) {
      var token = elt("span", "\u2022", "cm-invalidchar");
      token.title = "\\u" + ch.charCodeAt(0).toString(16);
      token.setAttribute("aria-label", token.title);
      return token
    }

    // Build up the DOM representation for a single token, and add it to
    // the line map. Takes care to render special characters separately.
    function buildToken(builder, text, style, startStyle, endStyle, css, attributes) {
      if (!text) { return }
      var displayText = builder.splitSpaces ? splitSpaces(text, builder.trailingSpace) : text;
      var special = builder.cm.state.specialChars, mustWrap = false;
      var content;
      if (!special.test(text)) {
        builder.col += text.length;
        content = document.createTextNode(displayText);
        builder.map.push(builder.pos, builder.pos + text.length, content);
        if (ie && ie_version < 9) { mustWrap = true; }
        builder.pos += text.length;
      } else {
        content = document.createDocumentFragment();
        var pos = 0;
        while (true) {
          special.lastIndex = pos;
          var m = special.exec(text);
          var skipped = m ? m.index - pos : text.length - pos;
          if (skipped) {
            var txt = document.createTextNode(displayText.slice(pos, pos + skipped));
            if (ie && ie_version < 9) { content.appendChild(elt("span", [txt])); }
            else { content.appendChild(txt); }
            builder.map.push(builder.pos, builder.pos + skipped, txt);
            builder.col += skipped;
            builder.pos += skipped;
          }
          if (!m) { break }
          pos += skipped + 1;
          var txt$1 = (void 0);
          if (m[0] == "\t") {
            var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
            txt$1 = content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
            txt$1.setAttribute("role", "presentation");
            txt$1.setAttribute("cm-text", "\t");
            builder.col += tabWidth;
          } else if (m[0] == "\r" || m[0] == "\n") {
            txt$1 = content.appendChild(elt("span", m[0] == "\r" ? "\u240d" : "\u2424", "cm-invalidchar"));
            txt$1.setAttribute("cm-text", m[0]);
            builder.col += 1;
          } else {
            txt$1 = builder.cm.options.specialCharPlaceholder(m[0]);
            txt$1.setAttribute("cm-text", m[0]);
            if (ie && ie_version < 9) { content.appendChild(elt("span", [txt$1])); }
            else { content.appendChild(txt$1); }
            builder.col += 1;
          }
          builder.map.push(builder.pos, builder.pos + 1, txt$1);
          builder.pos++;
        }
      }
      builder.trailingSpace = displayText.charCodeAt(text.length - 1) == 32;
      if (style || startStyle || endStyle || mustWrap || css) {
        var fullStyle = style || "";
        if (startStyle) { fullStyle += startStyle; }
        if (endStyle) { fullStyle += endStyle; }
        var token = elt("span", [content], fullStyle, css);
        if (attributes) {
          for (var attr in attributes) { if (attributes.hasOwnProperty(attr) && attr != "style" && attr != "class")
            { token.setAttribute(attr, attributes[attr]); } }
        }
        return builder.content.appendChild(token)
      }
      builder.content.appendChild(content);
    }

    // Change some spaces to NBSP to prevent the browser from collapsing
    // trailing spaces at the end of a line when rendering text (issue #1362).
    function splitSpaces(text, trailingBefore) {
      if (text.length > 1 && !/  /.test(text)) { return text }
      var spaceBefore = trailingBefore, result = "";
      for (var i = 0; i < text.length; i++) {
        var ch = text.charAt(i);
        if (ch == " " && spaceBefore && (i == text.length - 1 || text.charCodeAt(i + 1) == 32))
          { ch = "\u00a0"; }
        result += ch;
        spaceBefore = ch == " ";
      }
      return result
    }

    // Work around nonsense dimensions being reported for stretches of
    // right-to-left text.
    function buildTokenBadBidi(inner, order) {
      return function (builder, text, style, startStyle, endStyle, css, attributes) {
        style = style ? style + " cm-force-border" : "cm-force-border";
        var start = builder.pos, end = start + text.length;
        for (;;) {
          // Find the part that overlaps with the start of this text
          var part = (void 0);
          for (var i = 0; i < order.length; i++) {
            part = order[i];
            if (part.to > start && part.from <= start) { break }
          }
          if (part.to >= end) { return inner(builder, text, style, startStyle, endStyle, css, attributes) }
          inner(builder, text.slice(0, part.to - start), style, startStyle, null, css, attributes);
          startStyle = null;
          text = text.slice(part.to - start);
          start = part.to;
        }
      }
    }

    function buildCollapsedSpan(builder, size, marker, ignoreWidget) {
      var widget = !ignoreWidget && marker.widgetNode;
      if (widget) { builder.map.push(builder.pos, builder.pos + size, widget); }
      if (!ignoreWidget && builder.cm.display.input.needsContentAttribute) {
        if (!widget)
          { widget = builder.content.appendChild(document.createElement("span")); }
        widget.setAttribute("cm-marker", marker.id);
      }
      if (widget) {
        builder.cm.display.input.setUneditable(widget);
        builder.content.appendChild(widget);
      }
      builder.pos += size;
      builder.trailingSpace = false;
    }

    // Outputs a number of spans to make up a line, taking highlighting
    // and marked text into account.
    function insertLineContent(line, builder, styles) {
      var spans = line.markedSpans, allText = line.text, at = 0;
      if (!spans) {
        for (var i$1 = 1; i$1 < styles.length; i$1+=2)
          { builder.addToken(builder, allText.slice(at, at = styles[i$1]), interpretTokenStyle(styles[i$1+1], builder.cm.options)); }
        return
      }

      var len = allText.length, pos = 0, i = 1, text = "", style, css;
      var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, collapsed, attributes;
      for (;;) {
        if (nextChange == pos) { // Update current marker set
          spanStyle = spanEndStyle = spanStartStyle = css = "";
          attributes = null;
          collapsed = null; nextChange = Infinity;
          var foundBookmarks = [], endStyles = (void 0);
          for (var j = 0; j < spans.length; ++j) {
            var sp = spans[j], m = sp.marker;
            if (m.type == "bookmark" && sp.from == pos && m.widgetNode) {
              foundBookmarks.push(m);
            } else if (sp.from <= pos && (sp.to == null || sp.to > pos || m.collapsed && sp.to == pos && sp.from == pos)) {
              if (sp.to != null && sp.to != pos && nextChange > sp.to) {
                nextChange = sp.to;
                spanEndStyle = "";
              }
              if (m.className) { spanStyle += " " + m.className; }
              if (m.css) { css = (css ? css + ";" : "") + m.css; }
              if (m.startStyle && sp.from == pos) { spanStartStyle += " " + m.startStyle; }
              if (m.endStyle && sp.to == nextChange) { (endStyles || (endStyles = [])).push(m.endStyle, sp.to); }
              // support for the old title property
              // https://github.com/codemirror/CodeMirror/pull/5673
              if (m.title) { (attributes || (attributes = {})).title = m.title; }
              if (m.attributes) {
                for (var attr in m.attributes)
                  { (attributes || (attributes = {}))[attr] = m.attributes[attr]; }
              }
              if (m.collapsed && (!collapsed || compareCollapsedMarkers(collapsed.marker, m) < 0))
                { collapsed = sp; }
            } else if (sp.from > pos && nextChange > sp.from) {
              nextChange = sp.from;
            }
          }
          if (endStyles) { for (var j$1 = 0; j$1 < endStyles.length; j$1 += 2)
            { if (endStyles[j$1 + 1] == nextChange) { spanEndStyle += " " + endStyles[j$1]; } } }

          if (!collapsed || collapsed.from == pos) { for (var j$2 = 0; j$2 < foundBookmarks.length; ++j$2)
            { buildCollapsedSpan(builder, 0, foundBookmarks[j$2]); } }
          if (collapsed && (collapsed.from || 0) == pos) {
            buildCollapsedSpan(builder, (collapsed.to == null ? len + 1 : collapsed.to) - pos,
                               collapsed.marker, collapsed.from == null);
            if (collapsed.to == null) { return }
            if (collapsed.to == pos) { collapsed = false; }
          }
        }
        if (pos >= len) { break }

        var upto = Math.min(len, nextChange);
        while (true) {
          if (text) {
            var end = pos + text.length;
            if (!collapsed) {
              var tokenText = end > upto ? text.slice(0, upto - pos) : text;
              builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                               spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "", css, attributes);
            }
            if (end >= upto) {text = text.slice(upto - pos); pos = upto; break}
            pos = end;
            spanStartStyle = "";
          }
          text = allText.slice(at, at = styles[i++]);
          style = interpretTokenStyle(styles[i++], builder.cm.options);
        }
      }
    }


    // These objects are used to represent the visible (currently drawn)
    // part of the document. A LineView may correspond to multiple
    // logical lines, if those are connected by collapsed ranges.
    function LineView(doc, line, lineN) {
      // The starting line
      this.line = line;
      // Continuing lines, if any
      this.rest = visualLineContinued(line);
      // Number of logical lines in this visual line
      this.size = this.rest ? lineNo(lst(this.rest)) - lineN + 1 : 1;
      this.node = this.text = null;
      this.hidden = lineIsHidden(doc, line);
    }

    // Create a range of LineView objects for the given lines.
    function buildViewArray(cm, from, to) {
      var array = [], nextPos;
      for (var pos = from; pos < to; pos = nextPos) {
        var view = new LineView(cm.doc, getLine(cm.doc, pos), pos);
        nextPos = pos + view.size;
        array.push(view);
      }
      return array
    }

    var operationGroup = null;

    function pushOperation(op) {
      if (operationGroup) {
        operationGroup.ops.push(op);
      } else {
        op.ownsGroup = operationGroup = {
          ops: [op],
          delayedCallbacks: []
        };
      }
    }

    function fireCallbacksForOps(group) {
      // Calls delayed callbacks and cursorActivity handlers until no
      // new ones appear
      var callbacks = group.delayedCallbacks, i = 0;
      do {
        for (; i < callbacks.length; i++)
          { callbacks[i].call(null); }
        for (var j = 0; j < group.ops.length; j++) {
          var op = group.ops[j];
          if (op.cursorActivityHandlers)
            { while (op.cursorActivityCalled < op.cursorActivityHandlers.length)
              { op.cursorActivityHandlers[op.cursorActivityCalled++].call(null, op.cm); } }
        }
      } while (i < callbacks.length)
    }

    function finishOperation(op, endCb) {
      var group = op.ownsGroup;
      if (!group) { return }

      try { fireCallbacksForOps(group); }
      finally {
        operationGroup = null;
        endCb(group);
      }
    }

    var orphanDelayedCallbacks = null;

    // Often, we want to signal events at a point where we are in the
    // middle of some work, but don't want the handler to start calling
    // other methods on the editor, which might be in an inconsistent
    // state or simply not expect any other events to happen.
    // signalLater looks whether there are any handlers, and schedules
    // them to be executed when the last operation ends, or, if no
    // operation is active, when a timeout fires.
    function signalLater(emitter, type /*, values...*/) {
      var arr = getHandlers(emitter, type);
      if (!arr.length) { return }
      var args = Array.prototype.slice.call(arguments, 2), list;
      if (operationGroup) {
        list = operationGroup.delayedCallbacks;
      } else if (orphanDelayedCallbacks) {
        list = orphanDelayedCallbacks;
      } else {
        list = orphanDelayedCallbacks = [];
        setTimeout(fireOrphanDelayed, 0);
      }
      var loop = function ( i ) {
        list.push(function () { return arr[i].apply(null, args); });
      };

      for (var i = 0; i < arr.length; ++i)
        loop( i );
    }

    function fireOrphanDelayed() {
      var delayed = orphanDelayedCallbacks;
      orphanDelayedCallbacks = null;
      for (var i = 0; i < delayed.length; ++i) { delayed[i](); }
    }

    // When an aspect of a line changes, a string is added to
    // lineView.changes. This updates the relevant part of the line's
    // DOM structure.
    function updateLineForChanges(cm, lineView, lineN, dims) {
      for (var j = 0; j < lineView.changes.length; j++) {
        var type = lineView.changes[j];
        if (type == "text") { updateLineText(cm, lineView); }
        else if (type == "gutter") { updateLineGutter(cm, lineView, lineN, dims); }
        else if (type == "class") { updateLineClasses(cm, lineView); }
        else if (type == "widget") { updateLineWidgets(cm, lineView, dims); }
      }
      lineView.changes = null;
    }

    // Lines with gutter elements, widgets or a background class need to
    // be wrapped, and have the extra elements added to the wrapper div
    function ensureLineWrapped(lineView) {
      if (lineView.node == lineView.text) {
        lineView.node = elt("div", null, null, "position: relative");
        if (lineView.text.parentNode)
          { lineView.text.parentNode.replaceChild(lineView.node, lineView.text); }
        lineView.node.appendChild(lineView.text);
        if (ie && ie_version < 8) { lineView.node.style.zIndex = 2; }
      }
      return lineView.node
    }

    function updateLineBackground(cm, lineView) {
      var cls = lineView.bgClass ? lineView.bgClass + " " + (lineView.line.bgClass || "") : lineView.line.bgClass;
      if (cls) { cls += " CodeMirror-linebackground"; }
      if (lineView.background) {
        if (cls) { lineView.background.className = cls; }
        else { lineView.background.parentNode.removeChild(lineView.background); lineView.background = null; }
      } else if (cls) {
        var wrap = ensureLineWrapped(lineView);
        lineView.background = wrap.insertBefore(elt("div", null, cls), wrap.firstChild);
        cm.display.input.setUneditable(lineView.background);
      }
    }

    // Wrapper around buildLineContent which will reuse the structure
    // in display.externalMeasured when possible.
    function getLineContent(cm, lineView) {
      var ext = cm.display.externalMeasured;
      if (ext && ext.line == lineView.line) {
        cm.display.externalMeasured = null;
        lineView.measure = ext.measure;
        return ext.built
      }
      return buildLineContent(cm, lineView)
    }

    // Redraw the line's text. Interacts with the background and text
    // classes because the mode may output tokens that influence these
    // classes.
    function updateLineText(cm, lineView) {
      var cls = lineView.text.className;
      var built = getLineContent(cm, lineView);
      if (lineView.text == lineView.node) { lineView.node = built.pre; }
      lineView.text.parentNode.replaceChild(built.pre, lineView.text);
      lineView.text = built.pre;
      if (built.bgClass != lineView.bgClass || built.textClass != lineView.textClass) {
        lineView.bgClass = built.bgClass;
        lineView.textClass = built.textClass;
        updateLineClasses(cm, lineView);
      } else if (cls) {
        lineView.text.className = cls;
      }
    }

    function updateLineClasses(cm, lineView) {
      updateLineBackground(cm, lineView);
      if (lineView.line.wrapClass)
        { ensureLineWrapped(lineView).className = lineView.line.wrapClass; }
      else if (lineView.node != lineView.text)
        { lineView.node.className = ""; }
      var textClass = lineView.textClass ? lineView.textClass + " " + (lineView.line.textClass || "") : lineView.line.textClass;
      lineView.text.className = textClass || "";
    }

    function updateLineGutter(cm, lineView, lineN, dims) {
      if (lineView.gutter) {
        lineView.node.removeChild(lineView.gutter);
        lineView.gutter = null;
      }
      if (lineView.gutterBackground) {
        lineView.node.removeChild(lineView.gutterBackground);
        lineView.gutterBackground = null;
      }
      if (lineView.line.gutterClass) {
        var wrap = ensureLineWrapped(lineView);
        lineView.gutterBackground = elt("div", null, "CodeMirror-gutter-background " + lineView.line.gutterClass,
                                        ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px; width: " + (dims.gutterTotalWidth) + "px"));
        cm.display.input.setUneditable(lineView.gutterBackground);
        wrap.insertBefore(lineView.gutterBackground, lineView.text);
      }
      var markers = lineView.line.gutterMarkers;
      if (cm.options.lineNumbers || markers) {
        var wrap$1 = ensureLineWrapped(lineView);
        var gutterWrap = lineView.gutter = elt("div", null, "CodeMirror-gutter-wrapper", ("left: " + (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"));
        cm.display.input.setUneditable(gutterWrap);
        wrap$1.insertBefore(gutterWrap, lineView.text);
        if (lineView.line.gutterClass)
          { gutterWrap.className += " " + lineView.line.gutterClass; }
        if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
          { lineView.lineNumber = gutterWrap.appendChild(
            elt("div", lineNumberFor(cm.options, lineN),
                "CodeMirror-linenumber CodeMirror-gutter-elt",
                ("left: " + (dims.gutterLeft["CodeMirror-linenumbers"]) + "px; width: " + (cm.display.lineNumInnerWidth) + "px"))); }
        if (markers) { for (var k = 0; k < cm.display.gutterSpecs.length; ++k) {
          var id = cm.display.gutterSpecs[k].className, found = markers.hasOwnProperty(id) && markers[id];
          if (found)
            { gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt",
                                       ("left: " + (dims.gutterLeft[id]) + "px; width: " + (dims.gutterWidth[id]) + "px"))); }
        } }
      }
    }

    function updateLineWidgets(cm, lineView, dims) {
      if (lineView.alignable) { lineView.alignable = null; }
      for (var node = lineView.node.firstChild, next = (void 0); node; node = next) {
        next = node.nextSibling;
        if (node.className == "CodeMirror-linewidget")
          { lineView.node.removeChild(node); }
      }
      insertLineWidgets(cm, lineView, dims);
    }

    // Build a line's DOM representation from scratch
    function buildLineElement(cm, lineView, lineN, dims) {
      var built = getLineContent(cm, lineView);
      lineView.text = lineView.node = built.pre;
      if (built.bgClass) { lineView.bgClass = built.bgClass; }
      if (built.textClass) { lineView.textClass = built.textClass; }

      updateLineClasses(cm, lineView);
      updateLineGutter(cm, lineView, lineN, dims);
      insertLineWidgets(cm, lineView, dims);
      return lineView.node
    }

    // A lineView may contain multiple logical lines (when merged by
    // collapsed spans). The widgets for all of them need to be drawn.
    function insertLineWidgets(cm, lineView, dims) {
      insertLineWidgetsFor(cm, lineView.line, lineView, dims, true);
      if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
        { insertLineWidgetsFor(cm, lineView.rest[i], lineView, dims, false); } }
    }

    function insertLineWidgetsFor(cm, line, lineView, dims, allowAbove) {
      if (!line.widgets) { return }
      var wrap = ensureLineWrapped(lineView);
      for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
        var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
        if (!widget.handleMouseEvents) { node.setAttribute("cm-ignore-events", "true"); }
        positionLineWidget(widget, node, lineView, dims);
        cm.display.input.setUneditable(node);
        if (allowAbove && widget.above)
          { wrap.insertBefore(node, lineView.gutter || lineView.text); }
        else
          { wrap.appendChild(node); }
        signalLater(widget, "redraw");
      }
    }

    function positionLineWidget(widget, node, lineView, dims) {
      if (widget.noHScroll) {
    (lineView.alignable || (lineView.alignable = [])).push(node);
        var width = dims.wrapperWidth;
        node.style.left = dims.fixedPos + "px";
        if (!widget.coverGutter) {
          width -= dims.gutterTotalWidth;
          node.style.paddingLeft = dims.gutterTotalWidth + "px";
        }
        node.style.width = width + "px";
      }
      if (widget.coverGutter) {
        node.style.zIndex = 5;
        node.style.position = "relative";
        if (!widget.noHScroll) { node.style.marginLeft = -dims.gutterTotalWidth + "px"; }
      }
    }

    function widgetHeight(widget) {
      if (widget.height != null) { return widget.height }
      var cm = widget.doc.cm;
      if (!cm) { return 0 }
      if (!contains(document.body, widget.node)) {
        var parentStyle = "position: relative;";
        if (widget.coverGutter)
          { parentStyle += "margin-left: -" + cm.display.gutters.offsetWidth + "px;"; }
        if (widget.noHScroll)
          { parentStyle += "width: " + cm.display.wrapper.clientWidth + "px;"; }
        removeChildrenAndAdd(cm.display.measure, elt("div", [widget.node], null, parentStyle));
      }
      return widget.height = widget.node.parentNode.offsetHeight
    }

    // Return true when the given mouse event happened in a widget
    function eventInWidget(display, e) {
      for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
        if (!n || (n.nodeType == 1 && n.getAttribute("cm-ignore-events") == "true") ||
            (n.parentNode == display.sizer && n != display.mover))
          { return true }
      }
    }

    // POSITION MEASUREMENT

    function paddingTop(display) {return display.lineSpace.offsetTop}
    function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight}
    function paddingH(display) {
      if (display.cachedPaddingH) { return display.cachedPaddingH }
      var e = removeChildrenAndAdd(display.measure, elt("pre", "x", "CodeMirror-line-like"));
      var style = window.getComputedStyle ? window.getComputedStyle(e) : e.currentStyle;
      var data = {left: parseInt(style.paddingLeft), right: parseInt(style.paddingRight)};
      if (!isNaN(data.left) && !isNaN(data.right)) { display.cachedPaddingH = data; }
      return data
    }

    function scrollGap(cm) { return scrollerGap - cm.display.nativeBarWidth }
    function displayWidth(cm) {
      return cm.display.scroller.clientWidth - scrollGap(cm) - cm.display.barWidth
    }
    function displayHeight(cm) {
      return cm.display.scroller.clientHeight - scrollGap(cm) - cm.display.barHeight
    }

    // Ensure the lineView.wrapping.heights array is populated. This is
    // an array of bottom offsets for the lines that make up a drawn
    // line. When lineWrapping is on, there might be more than one
    // height.
    function ensureLineHeights(cm, lineView, rect) {
      var wrapping = cm.options.lineWrapping;
      var curWidth = wrapping && displayWidth(cm);
      if (!lineView.measure.heights || wrapping && lineView.measure.width != curWidth) {
        var heights = lineView.measure.heights = [];
        if (wrapping) {
          lineView.measure.width = curWidth;
          var rects = lineView.text.firstChild.getClientRects();
          for (var i = 0; i < rects.length - 1; i++) {
            var cur = rects[i], next = rects[i + 1];
            if (Math.abs(cur.bottom - next.bottom) > 2)
              { heights.push((cur.bottom + next.top) / 2 - rect.top); }
          }
        }
        heights.push(rect.bottom - rect.top);
      }
    }

    // Find a line map (mapping character offsets to text nodes) and a
    // measurement cache for the given line number. (A line view might
    // contain multiple lines when collapsed ranges are present.)
    function mapFromLineView(lineView, line, lineN) {
      if (lineView.line == line)
        { return {map: lineView.measure.map, cache: lineView.measure.cache} }
      for (var i = 0; i < lineView.rest.length; i++)
        { if (lineView.rest[i] == line)
          { return {map: lineView.measure.maps[i], cache: lineView.measure.caches[i]} } }
      for (var i$1 = 0; i$1 < lineView.rest.length; i$1++)
        { if (lineNo(lineView.rest[i$1]) > lineN)
          { return {map: lineView.measure.maps[i$1], cache: lineView.measure.caches[i$1], before: true} } }
    }

    // Render a line into the hidden node display.externalMeasured. Used
    // when measurement is needed for a line that's not in the viewport.
    function updateExternalMeasurement(cm, line) {
      line = visualLine(line);
      var lineN = lineNo(line);
      var view = cm.display.externalMeasured = new LineView(cm.doc, line, lineN);
      view.lineN = lineN;
      var built = view.built = buildLineContent(cm, view);
      view.text = built.pre;
      removeChildrenAndAdd(cm.display.lineMeasure, built.pre);
      return view
    }

    // Get a {top, bottom, left, right} box (in line-local coordinates)
    // for a given character.
    function measureChar(cm, line, ch, bias) {
      return measureCharPrepared(cm, prepareMeasureForLine(cm, line), ch, bias)
    }

    // Find a line view that corresponds to the given line number.
    function findViewForLine(cm, lineN) {
      if (lineN >= cm.display.viewFrom && lineN < cm.display.viewTo)
        { return cm.display.view[findViewIndex(cm, lineN)] }
      var ext = cm.display.externalMeasured;
      if (ext && lineN >= ext.lineN && lineN < ext.lineN + ext.size)
        { return ext }
    }

    // Measurement can be split in two steps, the set-up work that
    // applies to the whole line, and the measurement of the actual
    // character. Functions like coordsChar, that need to do a lot of
    // measurements in a row, can thus ensure that the set-up work is
    // only done once.
    function prepareMeasureForLine(cm, line) {
      var lineN = lineNo(line);
      var view = findViewForLine(cm, lineN);
      if (view && !view.text) {
        view = null;
      } else if (view && view.changes) {
        updateLineForChanges(cm, view, lineN, getDimensions(cm));
        cm.curOp.forceUpdate = true;
      }
      if (!view)
        { view = updateExternalMeasurement(cm, line); }

      var info = mapFromLineView(view, line, lineN);
      return {
        line: line, view: view, rect: null,
        map: info.map, cache: info.cache, before: info.before,
        hasHeights: false
      }
    }

    // Given a prepared measurement object, measures the position of an
    // actual character (or fetches it from the cache).
    function measureCharPrepared(cm, prepared, ch, bias, varHeight) {
      if (prepared.before) { ch = -1; }
      var key = ch + (bias || ""), found;
      if (prepared.cache.hasOwnProperty(key)) {
        found = prepared.cache[key];
      } else {
        if (!prepared.rect)
          { prepared.rect = prepared.view.text.getBoundingClientRect(); }
        if (!prepared.hasHeights) {
          ensureLineHeights(cm, prepared.view, prepared.rect);
          prepared.hasHeights = true;
        }
        found = measureCharInner(cm, prepared, ch, bias);
        if (!found.bogus) { prepared.cache[key] = found; }
      }
      return {left: found.left, right: found.right,
              top: varHeight ? found.rtop : found.top,
              bottom: varHeight ? found.rbottom : found.bottom}
    }

    var nullRect = {left: 0, right: 0, top: 0, bottom: 0};

    function nodeAndOffsetInLineMap(map$$1, ch, bias) {
      var node, start, end, collapse, mStart, mEnd;
      // First, search the line map for the text node corresponding to,
      // or closest to, the target character.
      for (var i = 0; i < map$$1.length; i += 3) {
        mStart = map$$1[i];
        mEnd = map$$1[i + 1];
        if (ch < mStart) {
          start = 0; end = 1;
          collapse = "left";
        } else if (ch < mEnd) {
          start = ch - mStart;
          end = start + 1;
        } else if (i == map$$1.length - 3 || ch == mEnd && map$$1[i + 3] > ch) {
          end = mEnd - mStart;
          start = end - 1;
          if (ch >= mEnd) { collapse = "right"; }
        }
        if (start != null) {
          node = map$$1[i + 2];
          if (mStart == mEnd && bias == (node.insertLeft ? "left" : "right"))
            { collapse = bias; }
          if (bias == "left" && start == 0)
            { while (i && map$$1[i - 2] == map$$1[i - 3] && map$$1[i - 1].insertLeft) {
              node = map$$1[(i -= 3) + 2];
              collapse = "left";
            } }
          if (bias == "right" && start == mEnd - mStart)
            { while (i < map$$1.length - 3 && map$$1[i + 3] == map$$1[i + 4] && !map$$1[i + 5].insertLeft) {
              node = map$$1[(i += 3) + 2];
              collapse = "right";
            } }
          break
        }
      }
      return {node: node, start: start, end: end, collapse: collapse, coverStart: mStart, coverEnd: mEnd}
    }

    function getUsefulRect(rects, bias) {
      var rect = nullRect;
      if (bias == "left") { for (var i = 0; i < rects.length; i++) {
        if ((rect = rects[i]).left != rect.right) { break }
      } } else { for (var i$1 = rects.length - 1; i$1 >= 0; i$1--) {
        if ((rect = rects[i$1]).left != rect.right) { break }
      } }
      return rect
    }

    function measureCharInner(cm, prepared, ch, bias) {
      var place = nodeAndOffsetInLineMap(prepared.map, ch, bias);
      var node = place.node, start = place.start, end = place.end, collapse = place.collapse;

      var rect;
      if (node.nodeType == 3) { // If it is a text node, use a range to retrieve the coordinates.
        for (var i$1 = 0; i$1 < 4; i$1++) { // Retry a maximum of 4 times when nonsense rectangles are returned
          while (start && isExtendingChar(prepared.line.text.charAt(place.coverStart + start))) { --start; }
          while (place.coverStart + end < place.coverEnd && isExtendingChar(prepared.line.text.charAt(place.coverStart + end))) { ++end; }
          if (ie && ie_version < 9 && start == 0 && end == place.coverEnd - place.coverStart)
            { rect = node.parentNode.getBoundingClientRect(); }
          else
            { rect = getUsefulRect(range(node, start, end).getClientRects(), bias); }
          if (rect.left || rect.right || start == 0) { break }
          end = start;
          start = start - 1;
          collapse = "right";
        }
        if (ie && ie_version < 11) { rect = maybeUpdateRectForZooming(cm.display.measure, rect); }
      } else { // If it is a widget, simply get the box for the whole widget.
        if (start > 0) { collapse = bias = "right"; }
        var rects;
        if (cm.options.lineWrapping && (rects = node.getClientRects()).length > 1)
          { rect = rects[bias == "right" ? rects.length - 1 : 0]; }
        else
          { rect = node.getBoundingClientRect(); }
      }
      if (ie && ie_version < 9 && !start && (!rect || !rect.left && !rect.right)) {
        var rSpan = node.parentNode.getClientRects()[0];
        if (rSpan)
          { rect = {left: rSpan.left, right: rSpan.left + charWidth(cm.display), top: rSpan.top, bottom: rSpan.bottom}; }
        else
          { rect = nullRect; }
      }

      var rtop = rect.top - prepared.rect.top, rbot = rect.bottom - prepared.rect.top;
      var mid = (rtop + rbot) / 2;
      var heights = prepared.view.measure.heights;
      var i = 0;
      for (; i < heights.length - 1; i++)
        { if (mid < heights[i]) { break } }
      var top = i ? heights[i - 1] : 0, bot = heights[i];
      var result = {left: (collapse == "right" ? rect.right : rect.left) - prepared.rect.left,
                    right: (collapse == "left" ? rect.left : rect.right) - prepared.rect.left,
                    top: top, bottom: bot};
      if (!rect.left && !rect.right) { result.bogus = true; }
      if (!cm.options.singleCursorHeightPerLine) { result.rtop = rtop; result.rbottom = rbot; }

      return result
    }

    // Work around problem with bounding client rects on ranges being
    // returned incorrectly when zoomed on IE10 and below.
    function maybeUpdateRectForZooming(measure, rect) {
      if (!window.screen || screen.logicalXDPI == null ||
          screen.logicalXDPI == screen.deviceXDPI || !hasBadZoomedRects(measure))
        { return rect }
      var scaleX = screen.logicalXDPI / screen.deviceXDPI;
      var scaleY = screen.logicalYDPI / screen.deviceYDPI;
      return {left: rect.left * scaleX, right: rect.right * scaleX,
              top: rect.top * scaleY, bottom: rect.bottom * scaleY}
    }

    function clearLineMeasurementCacheFor(lineView) {
      if (lineView.measure) {
        lineView.measure.cache = {};
        lineView.measure.heights = null;
        if (lineView.rest) { for (var i = 0; i < lineView.rest.length; i++)
          { lineView.measure.caches[i] = {}; } }
      }
    }

    function clearLineMeasurementCache(cm) {
      cm.display.externalMeasure = null;
      removeChildren(cm.display.lineMeasure);
      for (var i = 0; i < cm.display.view.length; i++)
        { clearLineMeasurementCacheFor(cm.display.view[i]); }
    }

    function clearCaches(cm) {
      clearLineMeasurementCache(cm);
      cm.display.cachedCharWidth = cm.display.cachedTextHeight = cm.display.cachedPaddingH = null;
      if (!cm.options.lineWrapping) { cm.display.maxLineChanged = true; }
      cm.display.lineNumChars = null;
    }

    function pageScrollX() {
      // Work around https://bugs.chromium.org/p/chromium/issues/detail?id=489206
      // which causes page_Offset and bounding client rects to use
      // different reference viewports and invalidate our calculations.
      if (chrome && android) { return -(document.body.getBoundingClientRect().left - parseInt(getComputedStyle(document.body).marginLeft)) }
      return window.pageXOffset || (document.documentElement || document.body).scrollLeft
    }
    function pageScrollY() {
      if (chrome && android) { return -(document.body.getBoundingClientRect().top - parseInt(getComputedStyle(document.body).marginTop)) }
      return window.pageYOffset || (document.documentElement || document.body).scrollTop
    }

    function widgetTopHeight(lineObj) {
      var height = 0;
      if (lineObj.widgets) { for (var i = 0; i < lineObj.widgets.length; ++i) { if (lineObj.widgets[i].above)
        { height += widgetHeight(lineObj.widgets[i]); } } }
      return height
    }

    // Converts a {top, bottom, left, right} box from line-local
    // coordinates into another coordinate system. Context may be one of
    // "line", "div" (display.lineDiv), "local"./null (editor), "window",
    // or "page".
    function intoCoordSystem(cm, lineObj, rect, context, includeWidgets) {
      if (!includeWidgets) {
        var height = widgetTopHeight(lineObj);
        rect.top += height; rect.bottom += height;
      }
      if (context == "line") { return rect }
      if (!context) { context = "local"; }
      var yOff = heightAtLine(lineObj);
      if (context == "local") { yOff += paddingTop(cm.display); }
      else { yOff -= cm.display.viewOffset; }
      if (context == "page" || context == "window") {
        var lOff = cm.display.lineSpace.getBoundingClientRect();
        yOff += lOff.top + (context == "window" ? 0 : pageScrollY());
        var xOff = lOff.left + (context == "window" ? 0 : pageScrollX());
        rect.left += xOff; rect.right += xOff;
      }
      rect.top += yOff; rect.bottom += yOff;
      return rect
    }

    // Coverts a box from "div" coords to another coordinate system.
    // Context may be "window", "page", "div", or "local"./null.
    function fromCoordSystem(cm, coords, context) {
      if (context == "div") { return coords }
      var left = coords.left, top = coords.top;
      // First move into "page" coordinate system
      if (context == "page") {
        left -= pageScrollX();
        top -= pageScrollY();
      } else if (context == "local" || !context) {
        var localBox = cm.display.sizer.getBoundingClientRect();
        left += localBox.left;
        top += localBox.top;
      }

      var lineSpaceBox = cm.display.lineSpace.getBoundingClientRect();
      return {left: left - lineSpaceBox.left, top: top - lineSpaceBox.top}
    }

    function charCoords(cm, pos, context, lineObj, bias) {
      if (!lineObj) { lineObj = getLine(cm.doc, pos.line); }
      return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch, bias), context)
    }

    // Returns a box for a given cursor position, which may have an
    // 'other' property containing the position of the secondary cursor
    // on a bidi boundary.
    // A cursor Pos(line, char, "before") is on the same visual line as `char - 1`
    // and after `char - 1` in writing order of `char - 1`
    // A cursor Pos(line, char, "after") is on the same visual line as `char`
    // and before `char` in writing order of `char`
    // Examples (upper-case letters are RTL, lower-case are LTR):
    //     Pos(0, 1, ...)
    //     before   after
    // ab     a|b     a|b
    // aB     a|B     aB|
    // Ab     |Ab     A|b
    // AB     B|A     B|A
    // Every position after the last character on a line is considered to stick
    // to the last character on the line.
    function cursorCoords(cm, pos, context, lineObj, preparedMeasure, varHeight) {
      lineObj = lineObj || getLine(cm.doc, pos.line);
      if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
      function get(ch, right) {
        var m = measureCharPrepared(cm, preparedMeasure, ch, right ? "right" : "left", varHeight);
        if (right) { m.left = m.right; } else { m.right = m.left; }
        return intoCoordSystem(cm, lineObj, m, context)
      }
      var order = getOrder(lineObj, cm.doc.direction), ch = pos.ch, sticky = pos.sticky;
      if (ch >= lineObj.text.length) {
        ch = lineObj.text.length;
        sticky = "before";
      } else if (ch <= 0) {
        ch = 0;
        sticky = "after";
      }
      if (!order) { return get(sticky == "before" ? ch - 1 : ch, sticky == "before") }

      function getBidi(ch, partPos, invert) {
        var part = order[partPos], right = part.level == 1;
        return get(invert ? ch - 1 : ch, right != invert)
      }
      var partPos = getBidiPartAt(order, ch, sticky);
      var other = bidiOther;
      var val = getBidi(ch, partPos, sticky == "before");
      if (other != null) { val.other = getBidi(ch, other, sticky != "before"); }
      return val
    }

    // Used to cheaply estimate the coordinates for a position. Used for
    // intermediate scroll updates.
    function estimateCoords(cm, pos) {
      var left = 0;
      pos = clipPos(cm.doc, pos);
      if (!cm.options.lineWrapping) { left = charWidth(cm.display) * pos.ch; }
      var lineObj = getLine(cm.doc, pos.line);
      var top = heightAtLine(lineObj) + paddingTop(cm.display);
      return {left: left, right: left, top: top, bottom: top + lineObj.height}
    }

    // Positions returned by coordsChar contain some extra information.
    // xRel is the relative x position of the input coordinates compared
    // to the found position (so xRel > 0 means the coordinates are to
    // the right of the character position, for example). When outside
    // is true, that means the coordinates lie outside the line's
    // vertical range.
    function PosWithInfo(line, ch, sticky, outside, xRel) {
      var pos = Pos(line, ch, sticky);
      pos.xRel = xRel;
      if (outside) { pos.outside = outside; }
      return pos
    }

    // Compute the character position closest to the given coordinates.
    // Input must be lineSpace-local ("div" coordinate system).
    function coordsChar(cm, x, y) {
      var doc = cm.doc;
      y += cm.display.viewOffset;
      if (y < 0) { return PosWithInfo(doc.first, 0, null, -1, -1) }
      var lineN = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
      if (lineN > last)
        { return PosWithInfo(doc.first + doc.size - 1, getLine(doc, last).text.length, null, 1, 1) }
      if (x < 0) { x = 0; }

      var lineObj = getLine(doc, lineN);
      for (;;) {
        var found = coordsCharInner(cm, lineObj, lineN, x, y);
        var collapsed = collapsedSpanAround(lineObj, found.ch + (found.xRel > 0 || found.outside > 0 ? 1 : 0));
        if (!collapsed) { return found }
        var rangeEnd = collapsed.find(1);
        if (rangeEnd.line == lineN) { return rangeEnd }
        lineObj = getLine(doc, lineN = rangeEnd.line);
      }
    }

    function wrappedLineExtent(cm, lineObj, preparedMeasure, y) {
      y -= widgetTopHeight(lineObj);
      var end = lineObj.text.length;
      var begin = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch - 1).bottom <= y; }, end, 0);
      end = findFirst(function (ch) { return measureCharPrepared(cm, preparedMeasure, ch).top > y; }, begin, end);
      return {begin: begin, end: end}
    }

    function wrappedLineExtentChar(cm, lineObj, preparedMeasure, target) {
      if (!preparedMeasure) { preparedMeasure = prepareMeasureForLine(cm, lineObj); }
      var targetTop = intoCoordSystem(cm, lineObj, measureCharPrepared(cm, preparedMeasure, target), "line").top;
      return wrappedLineExtent(cm, lineObj, preparedMeasure, targetTop)
    }

    // Returns true if the given side of a box is after the given
    // coordinates, in top-to-bottom, left-to-right order.
    function boxIsAfter(box, x, y, left) {
      return box.bottom <= y ? false : box.top > y ? true : (left ? box.left : box.right) > x
    }

    function coordsCharInner(cm, lineObj, lineNo$$1, x, y) {
      // Move y into line-local coordinate space
      y -= heightAtLine(lineObj);
      var preparedMeasure = prepareMeasureForLine(cm, lineObj);
      // When directly calling `measureCharPrepared`, we have to adjust
      // for the widgets at this line.
      var widgetHeight$$1 = widgetTopHeight(lineObj);
      var begin = 0, end = lineObj.text.length, ltr = true;

      var order = getOrder(lineObj, cm.doc.direction);
      // If the line isn't plain left-to-right text, first figure out
      // which bidi section the coordinates fall into.
      if (order) {
        var part = (cm.options.lineWrapping ? coordsBidiPartWrapped : coordsBidiPart)
                     (cm, lineObj, lineNo$$1, preparedMeasure, order, x, y);
        ltr = part.level != 1;
        // The awkward -1 offsets are needed because findFirst (called
        // on these below) will treat its first bound as inclusive,
        // second as exclusive, but we want to actually address the
        // characters in the part's range
        begin = ltr ? part.from : part.to - 1;
        end = ltr ? part.to : part.from - 1;
      }

      // A binary search to find the first character whose bounding box
      // starts after the coordinates. If we run across any whose box wrap
      // the coordinates, store that.
      var chAround = null, boxAround = null;
      var ch = findFirst(function (ch) {
        var box = measureCharPrepared(cm, preparedMeasure, ch);
        box.top += widgetHeight$$1; box.bottom += widgetHeight$$1;
        if (!boxIsAfter(box, x, y, false)) { return false }
        if (box.top <= y && box.left <= x) {
          chAround = ch;
          boxAround = box;
        }
        return true
      }, begin, end);

      var baseX, sticky, outside = false;
      // If a box around the coordinates was found, use that
      if (boxAround) {
        // Distinguish coordinates nearer to the left or right side of the box
        var atLeft = x - boxAround.left < boxAround.right - x, atStart = atLeft == ltr;
        ch = chAround + (atStart ? 0 : 1);
        sticky = atStart ? "after" : "before";
        baseX = atLeft ? boxAround.left : boxAround.right;
      } else {
        // (Adjust for extended bound, if necessary.)
        if (!ltr && (ch == end || ch == begin)) { ch++; }
        // To determine which side to associate with, get the box to the
        // left of the character and compare it's vertical position to the
        // coordinates
        sticky = ch == 0 ? "after" : ch == lineObj.text.length ? "before" :
          (measureCharPrepared(cm, preparedMeasure, ch - (ltr ? 1 : 0)).bottom + widgetHeight$$1 <= y) == ltr ?
          "after" : "before";
        // Now get accurate coordinates for this place, in order to get a
        // base X position
        var coords = cursorCoords(cm, Pos(lineNo$$1, ch, sticky), "line", lineObj, preparedMeasure);
        baseX = coords.left;
        outside = y < coords.top ? -1 : y >= coords.bottom ? 1 : 0;
      }

      ch = skipExtendingChars(lineObj.text, ch, 1);
      return PosWithInfo(lineNo$$1, ch, sticky, outside, x - baseX)
    }

    function coordsBidiPart(cm, lineObj, lineNo$$1, preparedMeasure, order, x, y) {
      // Bidi parts are sorted left-to-right, and in a non-line-wrapping
      // situation, we can take this ordering to correspond to the visual
      // ordering. This finds the first part whose end is after the given
      // coordinates.
      var index = findFirst(function (i) {
        var part = order[i], ltr = part.level != 1;
        return boxIsAfter(cursorCoords(cm, Pos(lineNo$$1, ltr ? part.to : part.from, ltr ? "before" : "after"),
                                       "line", lineObj, preparedMeasure), x, y, true)
      }, 0, order.length - 1);
      var part = order[index];
      // If this isn't the first part, the part's start is also after
      // the coordinates, and the coordinates aren't on the same line as
      // that start, move one part back.
      if (index > 0) {
        var ltr = part.level != 1;
        var start = cursorCoords(cm, Pos(lineNo$$1, ltr ? part.from : part.to, ltr ? "after" : "before"),
                                 "line", lineObj, preparedMeasure);
        if (boxIsAfter(start, x, y, true) && start.top > y)
          { part = order[index - 1]; }
      }
      return part
    }

    function coordsBidiPartWrapped(cm, lineObj, _lineNo, preparedMeasure, order, x, y) {
      // In a wrapped line, rtl text on wrapping boundaries can do things
      // that don't correspond to the ordering in our `order` array at
      // all, so a binary search doesn't work, and we want to return a
      // part that only spans one line so that the binary search in
      // coordsCharInner is safe. As such, we first find the extent of the
      // wrapped line, and then do a flat search in which we discard any
      // spans that aren't on the line.
      var ref = wrappedLineExtent(cm, lineObj, preparedMeasure, y);
      var begin = ref.begin;
      var end = ref.end;
      if (/\s/.test(lineObj.text.charAt(end - 1))) { end--; }
      var part = null, closestDist = null;
      for (var i = 0; i < order.length; i++) {
        var p = order[i];
        if (p.from >= end || p.to <= begin) { continue }
        var ltr = p.level != 1;
        var endX = measureCharPrepared(cm, preparedMeasure, ltr ? Math.min(end, p.to) - 1 : Math.max(begin, p.from)).right;
        // Weigh against spans ending before this, so that they are only
        // picked if nothing ends after
        var dist = endX < x ? x - endX + 1e9 : endX - x;
        if (!part || closestDist > dist) {
          part = p;
          closestDist = dist;
        }
      }
      if (!part) { part = order[order.length - 1]; }
      // Clip the part to the wrapped line.
      if (part.from < begin) { part = {from: begin, to: part.to, level: part.level}; }
      if (part.to > end) { part = {from: part.from, to: end, level: part.level}; }
      return part
    }

    var measureText;
    // Compute the default text height.
    function textHeight(display) {
      if (display.cachedTextHeight != null) { return display.cachedTextHeight }
      if (measureText == null) {
        measureText = elt("pre", null, "CodeMirror-line-like");
        // Measure a bunch of lines, for browsers that compute
        // fractional heights.
        for (var i = 0; i < 49; ++i) {
          measureText.appendChild(document.createTextNode("x"));
          measureText.appendChild(elt("br"));
        }
        measureText.appendChild(document.createTextNode("x"));
      }
      removeChildrenAndAdd(display.measure, measureText);
      var height = measureText.offsetHeight / 50;
      if (height > 3) { display.cachedTextHeight = height; }
      removeChildren(display.measure);
      return height || 1
    }

    // Compute the default character width.
    function charWidth(display) {
      if (display.cachedCharWidth != null) { return display.cachedCharWidth }
      var anchor = elt("span", "xxxxxxxxxx");
      var pre = elt("pre", [anchor], "CodeMirror-line-like");
      removeChildrenAndAdd(display.measure, pre);
      var rect = anchor.getBoundingClientRect(), width = (rect.right - rect.left) / 10;
      if (width > 2) { display.cachedCharWidth = width; }
      return width || 10
    }

    // Do a bulk-read of the DOM positions and sizes needed to draw the
    // view, so that we don't interleave reading and writing to the DOM.
    function getDimensions(cm) {
      var d = cm.display, left = {}, width = {};
      var gutterLeft = d.gutters.clientLeft;
      for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
        var id = cm.display.gutterSpecs[i].className;
        left[id] = n.offsetLeft + n.clientLeft + gutterLeft;
        width[id] = n.clientWidth;
      }
      return {fixedPos: compensateForHScroll(d),
              gutterTotalWidth: d.gutters.offsetWidth,
              gutterLeft: left,
              gutterWidth: width,
              wrapperWidth: d.wrapper.clientWidth}
    }

    // Computes display.scroller.scrollLeft + display.gutters.offsetWidth,
    // but using getBoundingClientRect to get a sub-pixel-accurate
    // result.
    function compensateForHScroll(display) {
      return display.scroller.getBoundingClientRect().left - display.sizer.getBoundingClientRect().left
    }

    // Returns a function that estimates the height of a line, to use as
    // first approximation until the line becomes visible (and is thus
    // properly measurable).
    function estimateHeight(cm) {
      var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
      var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
      return function (line) {
        if (lineIsHidden(cm.doc, line)) { return 0 }

        var widgetsHeight = 0;
        if (line.widgets) { for (var i = 0; i < line.widgets.length; i++) {
          if (line.widgets[i].height) { widgetsHeight += line.widgets[i].height; }
        } }

        if (wrapping)
          { return widgetsHeight + (Math.ceil(line.text.length / perLine) || 1) * th }
        else
          { return widgetsHeight + th }
      }
    }

    function estimateLineHeights(cm) {
      var doc = cm.doc, est = estimateHeight(cm);
      doc.iter(function (line) {
        var estHeight = est(line);
        if (estHeight != line.height) { updateLineHeight(line, estHeight); }
      });
    }

    // Given a mouse event, find the corresponding position. If liberal
    // is false, it checks whether a gutter or scrollbar was clicked,
    // and returns null if it was. forRect is used by rectangular
    // selections, and tries to estimate a character position even for
    // coordinates beyond the right of the text.
    function posFromMouse(cm, e, liberal, forRect) {
      var display = cm.display;
      if (!liberal && e_target(e).getAttribute("cm-not-content") == "true") { return null }

      var x, y, space = display.lineSpace.getBoundingClientRect();
      // Fails unpredictably on IE[67] when mouse is dragged around quickly.
      try { x = e.clientX - space.left; y = e.clientY - space.top; }
      catch (e) { return null }
      var coords = coordsChar(cm, x, y), line;
      if (forRect && coords.xRel == 1 && (line = getLine(cm.doc, coords.line).text).length == coords.ch) {
        var colDiff = countColumn(line, line.length, cm.options.tabSize) - line.length;
        coords = Pos(coords.line, Math.max(0, Math.round((x - paddingH(cm.display).left) / charWidth(cm.display)) - colDiff));
      }
      return coords
    }

    // Find the view element corresponding to a given line. Return null
    // when the line isn't visible.
    function findViewIndex(cm, n) {
      if (n >= cm.display.viewTo) { return null }
      n -= cm.display.viewFrom;
      if (n < 0) { return null }
      var view = cm.display.view;
      for (var i = 0; i < view.length; i++) {
        n -= view[i].size;
        if (n < 0) { return i }
      }
    }

    // Updates the display.view data structure for a given change to the
    // document. From and to are in pre-change coordinates. Lendiff is
    // the amount of lines added or subtracted by the change. This is
    // used for changes that span multiple lines, or change the way
    // lines are divided into visual lines. regLineChange (below)
    // registers single-line changes.
    function regChange(cm, from, to, lendiff) {
      if (from == null) { from = cm.doc.first; }
      if (to == null) { to = cm.doc.first + cm.doc.size; }
      if (!lendiff) { lendiff = 0; }

      var display = cm.display;
      if (lendiff && to < display.viewTo &&
          (display.updateLineNumbers == null || display.updateLineNumbers > from))
        { display.updateLineNumbers = from; }

      cm.curOp.viewChanged = true;

      if (from >= display.viewTo) { // Change after
        if (sawCollapsedSpans && visualLineNo(cm.doc, from) < display.viewTo)
          { resetView(cm); }
      } else if (to <= display.viewFrom) { // Change before
        if (sawCollapsedSpans && visualLineEndNo(cm.doc, to + lendiff) > display.viewFrom) {
          resetView(cm);
        } else {
          display.viewFrom += lendiff;
          display.viewTo += lendiff;
        }
      } else if (from <= display.viewFrom && to >= display.viewTo) { // Full overlap
        resetView(cm);
      } else if (from <= display.viewFrom) { // Top overlap
        var cut = viewCuttingPoint(cm, to, to + lendiff, 1);
        if (cut) {
          display.view = display.view.slice(cut.index);
          display.viewFrom = cut.lineN;
          display.viewTo += lendiff;
        } else {
          resetView(cm);
        }
      } else if (to >= display.viewTo) { // Bottom overlap
        var cut$1 = viewCuttingPoint(cm, from, from, -1);
        if (cut$1) {
          display.view = display.view.slice(0, cut$1.index);
          display.viewTo = cut$1.lineN;
        } else {
          resetView(cm);
        }
      } else { // Gap in the middle
        var cutTop = viewCuttingPoint(cm, from, from, -1);
        var cutBot = viewCuttingPoint(cm, to, to + lendiff, 1);
        if (cutTop && cutBot) {
          display.view = display.view.slice(0, cutTop.index)
            .concat(buildViewArray(cm, cutTop.lineN, cutBot.lineN))
            .concat(display.view.slice(cutBot.index));
          display.viewTo += lendiff;
        } else {
          resetView(cm);
        }
      }

      var ext = display.externalMeasured;
      if (ext) {
        if (to < ext.lineN)
          { ext.lineN += lendiff; }
        else if (from < ext.lineN + ext.size)
          { display.externalMeasured = null; }
      }
    }

    // Register a change to a single line. Type must be one of "text",
    // "gutter", "class", "widget"
    function regLineChange(cm, line, type) {
      cm.curOp.viewChanged = true;
      var display = cm.display, ext = cm.display.externalMeasured;
      if (ext && line >= ext.lineN && line < ext.lineN + ext.size)
        { display.externalMeasured = null; }

      if (line < display.viewFrom || line >= display.viewTo) { return }
      var lineView = display.view[findViewIndex(cm, line)];
      if (lineView.node == null) { return }
      var arr = lineView.changes || (lineView.changes = []);
      if (indexOf(arr, type) == -1) { arr.push(type); }
    }

    // Clear the view.
    function resetView(cm) {
      cm.display.viewFrom = cm.display.viewTo = cm.doc.first;
      cm.display.view = [];
      cm.display.viewOffset = 0;
    }

    function viewCuttingPoint(cm, oldN, newN, dir) {
      var index = findViewIndex(cm, oldN), diff, view = cm.display.view;
      if (!sawCollapsedSpans || newN == cm.doc.first + cm.doc.size)
        { return {index: index, lineN: newN} }
      var n = cm.display.viewFrom;
      for (var i = 0; i < index; i++)
        { n += view[i].size; }
      if (n != oldN) {
        if (dir > 0) {
          if (index == view.length - 1) { return null }
          diff = (n + view[index].size) - oldN;
          index++;
        } else {
          diff = n - oldN;
        }
        oldN += diff; newN += diff;
      }
      while (visualLineNo(cm.doc, newN) != newN) {
        if (index == (dir < 0 ? 0 : view.length - 1)) { return null }
        newN += dir * view[index - (dir < 0 ? 1 : 0)].size;
        index += dir;
      }
      return {index: index, lineN: newN}
    }

    // Force the view to cover a given range, adding empty view element
    // or clipping off existing ones as needed.
    function adjustView(cm, from, to) {
      var display = cm.display, view = display.view;
      if (view.length == 0 || from >= display.viewTo || to <= display.viewFrom) {
        display.view = buildViewArray(cm, from, to);
        display.viewFrom = from;
      } else {
        if (display.viewFrom > from)
          { display.view = buildViewArray(cm, from, display.viewFrom).concat(display.view); }
        else if (display.viewFrom < from)
          { display.view = display.view.slice(findViewIndex(cm, from)); }
        display.viewFrom = from;
        if (display.viewTo < to)
          { display.view = display.view.concat(buildViewArray(cm, display.viewTo, to)); }
        else if (display.viewTo > to)
          { display.view = display.view.slice(0, findViewIndex(cm, to)); }
      }
      display.viewTo = to;
    }

    // Count the number of lines in the view whose DOM representation is
    // out of date (or nonexistent).
    function countDirtyView(cm) {
      var view = cm.display.view, dirty = 0;
      for (var i = 0; i < view.length; i++) {
        var lineView = view[i];
        if (!lineView.hidden && (!lineView.node || lineView.changes)) { ++dirty; }
      }
      return dirty
    }

    function updateSelection(cm) {
      cm.display.input.showSelection(cm.display.input.prepareSelection());
    }

    function prepareSelection(cm, primary) {
      if ( primary === void 0 ) primary = true;

      var doc = cm.doc, result = {};
      var curFragment = result.cursors = document.createDocumentFragment();
      var selFragment = result.selection = document.createDocumentFragment();

      for (var i = 0; i < doc.sel.ranges.length; i++) {
        if (!primary && i == doc.sel.primIndex) { continue }
        var range$$1 = doc.sel.ranges[i];
        if (range$$1.from().line >= cm.display.viewTo || range$$1.to().line < cm.display.viewFrom) { continue }
        var collapsed = range$$1.empty();
        if (collapsed || cm.options.showCursorWhenSelecting)
          { drawSelectionCursor(cm, range$$1.head, curFragment); }
        if (!collapsed)
          { drawSelectionRange(cm, range$$1, selFragment); }
      }
      return result
    }

    // Draws a cursor for the given range
    function drawSelectionCursor(cm, head, output) {
      var pos = cursorCoords(cm, head, "div", null, null, !cm.options.singleCursorHeightPerLine);

      var cursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor"));
      cursor.style.left = pos.left + "px";
      cursor.style.top = pos.top + "px";
      cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";

      if (pos.other) {
        // Secondary cursor, shown when on a 'jump' in bi-directional text
        var otherCursor = output.appendChild(elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor"));
        otherCursor.style.display = "";
        otherCursor.style.left = pos.other.left + "px";
        otherCursor.style.top = pos.other.top + "px";
        otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
      }
    }

    function cmpCoords(a, b) { return a.top - b.top || a.left - b.left }

    // Draws the given range as a highlighted selection
    function drawSelectionRange(cm, range$$1, output) {
      var display = cm.display, doc = cm.doc;
      var fragment = document.createDocumentFragment();
      var padding = paddingH(cm.display), leftSide = padding.left;
      var rightSide = Math.max(display.sizerWidth, displayWidth(cm) - display.sizer.offsetLeft) - padding.right;
      var docLTR = doc.direction == "ltr";

      function add(left, top, width, bottom) {
        if (top < 0) { top = 0; }
        top = Math.round(top);
        bottom = Math.round(bottom);
        fragment.appendChild(elt("div", null, "CodeMirror-selected", ("position: absolute; left: " + left + "px;\n                             top: " + top + "px; width: " + (width == null ? rightSide - left : width) + "px;\n                             height: " + (bottom - top) + "px")));
      }

      function drawForLine(line, fromArg, toArg) {
        var lineObj = getLine(doc, line);
        var lineLen = lineObj.text.length;
        var start, end;
        function coords(ch, bias) {
          return charCoords(cm, Pos(line, ch), "div", lineObj, bias)
        }

        function wrapX(pos, dir, side) {
          var extent = wrappedLineExtentChar(cm, lineObj, null, pos);
          var prop = (dir == "ltr") == (side == "after") ? "left" : "right";
          var ch = side == "after" ? extent.begin : extent.end - (/\s/.test(lineObj.text.charAt(extent.end - 1)) ? 2 : 1);
          return coords(ch, prop)[prop]
        }

        var order = getOrder(lineObj, doc.direction);
        iterateBidiSections(order, fromArg || 0, toArg == null ? lineLen : toArg, function (from, to, dir, i) {
          var ltr = dir == "ltr";
          var fromPos = coords(from, ltr ? "left" : "right");
          var toPos = coords(to - 1, ltr ? "right" : "left");

          var openStart = fromArg == null && from == 0, openEnd = toArg == null && to == lineLen;
          var first = i == 0, last = !order || i == order.length - 1;
          if (toPos.top - fromPos.top <= 3) { // Single line
            var openLeft = (docLTR ? openStart : openEnd) && first;
            var openRight = (docLTR ? openEnd : openStart) && last;
            var left = openLeft ? leftSide : (ltr ? fromPos : toPos).left;
            var right = openRight ? rightSide : (ltr ? toPos : fromPos).right;
            add(left, fromPos.top, right - left, fromPos.bottom);
          } else { // Multiple lines
            var topLeft, topRight, botLeft, botRight;
            if (ltr) {
              topLeft = docLTR && openStart && first ? leftSide : fromPos.left;
              topRight = docLTR ? rightSide : wrapX(from, dir, "before");
              botLeft = docLTR ? leftSide : wrapX(to, dir, "after");
              botRight = docLTR && openEnd && last ? rightSide : toPos.right;
            } else {
              topLeft = !docLTR ? leftSide : wrapX(from, dir, "before");
              topRight = !docLTR && openStart && first ? rightSide : fromPos.right;
              botLeft = !docLTR && openEnd && last ? leftSide : toPos.left;
              botRight = !docLTR ? rightSide : wrapX(to, dir, "after");
            }
            add(topLeft, fromPos.top, topRight - topLeft, fromPos.bottom);
            if (fromPos.bottom < toPos.top) { add(leftSide, fromPos.bottom, null, toPos.top); }
            add(botLeft, toPos.top, botRight - botLeft, toPos.bottom);
          }

          if (!start || cmpCoords(fromPos, start) < 0) { start = fromPos; }
          if (cmpCoords(toPos, start) < 0) { start = toPos; }
          if (!end || cmpCoords(fromPos, end) < 0) { end = fromPos; }
          if (cmpCoords(toPos, end) < 0) { end = toPos; }
        });
        return {start: start, end: end}
      }

      var sFrom = range$$1.from(), sTo = range$$1.to();
      if (sFrom.line == sTo.line) {
        drawForLine(sFrom.line, sFrom.ch, sTo.ch);
      } else {
        var fromLine = getLine(doc, sFrom.line), toLine = getLine(doc, sTo.line);
        var singleVLine = visualLine(fromLine) == visualLine(toLine);
        var leftEnd = drawForLine(sFrom.line, sFrom.ch, singleVLine ? fromLine.text.length + 1 : null).end;
        var rightStart = drawForLine(sTo.line, singleVLine ? 0 : null, sTo.ch).start;
        if (singleVLine) {
          if (leftEnd.top < rightStart.top - 2) {
            add(leftEnd.right, leftEnd.top, null, leftEnd.bottom);
            add(leftSide, rightStart.top, rightStart.left, rightStart.bottom);
          } else {
            add(leftEnd.right, leftEnd.top, rightStart.left - leftEnd.right, leftEnd.bottom);
          }
        }
        if (leftEnd.bottom < rightStart.top)
          { add(leftSide, leftEnd.bottom, null, rightStart.top); }
      }

      output.appendChild(fragment);
    }

    // Cursor-blinking
    function restartBlink(cm) {
      if (!cm.state.focused) { return }
      var display = cm.display;
      clearInterval(display.blinker);
      var on = true;
      display.cursorDiv.style.visibility = "";
      if (cm.options.cursorBlinkRate > 0)
        { display.blinker = setInterval(function () { return display.cursorDiv.style.visibility = (on = !on) ? "" : "hidden"; },
          cm.options.cursorBlinkRate); }
      else if (cm.options.cursorBlinkRate < 0)
        { display.cursorDiv.style.visibility = "hidden"; }
    }

    function ensureFocus(cm) {
      if (!cm.state.focused) { cm.display.input.focus(); onFocus(cm); }
    }

    function delayBlurEvent(cm) {
      cm.state.delayingBlurEvent = true;
      setTimeout(function () { if (cm.state.delayingBlurEvent) {
        cm.state.delayingBlurEvent = false;
        onBlur(cm);
      } }, 100);
    }

    function onFocus(cm, e) {
      if (cm.state.delayingBlurEvent) { cm.state.delayingBlurEvent = false; }

      if (cm.options.readOnly == "nocursor") { return }
      if (!cm.state.focused) {
        signal(cm, "focus", cm, e);
        cm.state.focused = true;
        addClass(cm.display.wrapper, "CodeMirror-focused");
        // This test prevents this from firing when a context
        // menu is closed (since the input reset would kill the
        // select-all detection hack)
        if (!cm.curOp && cm.display.selForContextMenu != cm.doc.sel) {
          cm.display.input.reset();
          if (webkit) { setTimeout(function () { return cm.display.input.reset(true); }, 20); } // Issue #1730
        }
        cm.display.input.receivedFocus();
      }
      restartBlink(cm);
    }
    function onBlur(cm, e) {
      if (cm.state.delayingBlurEvent) { return }

      if (cm.state.focused) {
        signal(cm, "blur", cm, e);
        cm.state.focused = false;
        rmClass(cm.display.wrapper, "CodeMirror-focused");
      }
      clearInterval(cm.display.blinker);
      setTimeout(function () { if (!cm.state.focused) { cm.display.shift = false; } }, 150);
    }

    // Read the actual heights of the rendered lines, and update their
    // stored heights to match.
    function updateHeightsInViewport(cm) {
      var display = cm.display;
      var prevBottom = display.lineDiv.offsetTop;
      for (var i = 0; i < display.view.length; i++) {
        var cur = display.view[i], wrapping = cm.options.lineWrapping;
        var height = (void 0), width = 0;
        if (cur.hidden) { continue }
        if (ie && ie_version < 8) {
          var bot = cur.node.offsetTop + cur.node.offsetHeight;
          height = bot - prevBottom;
          prevBottom = bot;
        } else {
          var box = cur.node.getBoundingClientRect();
          height = box.bottom - box.top;
          // Check that lines don't extend past the right of the current
          // editor width
          if (!wrapping && cur.text.firstChild)
            { width = cur.text.firstChild.getBoundingClientRect().right - box.left - 1; }
        }
        var diff = cur.line.height - height;
        if (diff > .005 || diff < -.005) {
          updateLineHeight(cur.line, height);
          updateWidgetHeight(cur.line);
          if (cur.rest) { for (var j = 0; j < cur.rest.length; j++)
            { updateWidgetHeight(cur.rest[j]); } }
        }
        if (width > cm.display.sizerWidth) {
          var chWidth = Math.ceil(width / charWidth(cm.display));
          if (chWidth > cm.display.maxLineLength) {
            cm.display.maxLineLength = chWidth;
            cm.display.maxLine = cur.line;
            cm.display.maxLineChanged = true;
          }
        }
      }
    }

    // Read and store the height of line widgets associated with the
    // given line.
    function updateWidgetHeight(line) {
      if (line.widgets) { for (var i = 0; i < line.widgets.length; ++i) {
        var w = line.widgets[i], parent = w.node.parentNode;
        if (parent) { w.height = parent.offsetHeight; }
      } }
    }

    // Compute the lines that are visible in a given viewport (defaults
    // the the current scroll position). viewport may contain top,
    // height, and ensure (see op.scrollToPos) properties.
    function visibleLines(display, doc, viewport) {
      var top = viewport && viewport.top != null ? Math.max(0, viewport.top) : display.scroller.scrollTop;
      top = Math.floor(top - paddingTop(display));
      var bottom = viewport && viewport.bottom != null ? viewport.bottom : top + display.wrapper.clientHeight;

      var from = lineAtHeight(doc, top), to = lineAtHeight(doc, bottom);
      // Ensure is a {from: {line, ch}, to: {line, ch}} object, and
      // forces those lines into the viewport (if possible).
      if (viewport && viewport.ensure) {
        var ensureFrom = viewport.ensure.from.line, ensureTo = viewport.ensure.to.line;
        if (ensureFrom < from) {
          from = ensureFrom;
          to = lineAtHeight(doc, heightAtLine(getLine(doc, ensureFrom)) + display.wrapper.clientHeight);
        } else if (Math.min(ensureTo, doc.lastLine()) >= to) {
          from = lineAtHeight(doc, heightAtLine(getLine(doc, ensureTo)) - display.wrapper.clientHeight);
          to = ensureTo;
        }
      }
      return {from: from, to: Math.max(to, from + 1)}
    }

    // SCROLLING THINGS INTO VIEW

    // If an editor sits on the top or bottom of the window, partially
    // scrolled out of view, this ensures that the cursor is visible.
    function maybeScrollWindow(cm, rect) {
      if (signalDOMEvent(cm, "scrollCursorIntoView")) { return }

      var display = cm.display, box = display.sizer.getBoundingClientRect(), doScroll = null;
      if (rect.top + box.top < 0) { doScroll = true; }
      else if (rect.bottom + box.top > (window.innerHeight || document.documentElement.clientHeight)) { doScroll = false; }
      if (doScroll != null && !phantom) {
        var scrollNode = elt("div", "\u200b", null, ("position: absolute;\n                         top: " + (rect.top - display.viewOffset - paddingTop(cm.display)) + "px;\n                         height: " + (rect.bottom - rect.top + scrollGap(cm) + display.barHeight) + "px;\n                         left: " + (rect.left) + "px; width: " + (Math.max(2, rect.right - rect.left)) + "px;"));
        cm.display.lineSpace.appendChild(scrollNode);
        scrollNode.scrollIntoView(doScroll);
        cm.display.lineSpace.removeChild(scrollNode);
      }
    }

    // Scroll a given position into view (immediately), verifying that
    // it actually became visible (as line heights are accurately
    // measured, the position of something may 'drift' during drawing).
    function scrollPosIntoView(cm, pos, end, margin) {
      if (margin == null) { margin = 0; }
      var rect;
      if (!cm.options.lineWrapping && pos == end) {
        // Set pos and end to the cursor positions around the character pos sticks to
        // If pos.sticky == "before", that is around pos.ch - 1, otherwise around pos.ch
        // If pos == Pos(_, 0, "before"), pos and end are unchanged
        pos = pos.ch ? Pos(pos.line, pos.sticky == "before" ? pos.ch - 1 : pos.ch, "after") : pos;
        end = pos.sticky == "before" ? Pos(pos.line, pos.ch + 1, "before") : pos;
      }
      for (var limit = 0; limit < 5; limit++) {
        var changed = false;
        var coords = cursorCoords(cm, pos);
        var endCoords = !end || end == pos ? coords : cursorCoords(cm, end);
        rect = {left: Math.min(coords.left, endCoords.left),
                top: Math.min(coords.top, endCoords.top) - margin,
                right: Math.max(coords.left, endCoords.left),
                bottom: Math.max(coords.bottom, endCoords.bottom) + margin};
        var scrollPos = calculateScrollPos(cm, rect);
        var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
        if (scrollPos.scrollTop != null) {
          updateScrollTop(cm, scrollPos.scrollTop);
          if (Math.abs(cm.doc.scrollTop - startTop) > 1) { changed = true; }
        }
        if (scrollPos.scrollLeft != null) {
          setScrollLeft(cm, scrollPos.scrollLeft);
          if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) { changed = true; }
        }
        if (!changed) { break }
      }
      return rect
    }

    // Scroll a given set of coordinates into view (immediately).
    function scrollIntoView(cm, rect) {
      var scrollPos = calculateScrollPos(cm, rect);
      if (scrollPos.scrollTop != null) { updateScrollTop(cm, scrollPos.scrollTop); }
      if (scrollPos.scrollLeft != null) { setScrollLeft(cm, scrollPos.scrollLeft); }
    }

    // Calculate a new scroll position needed to scroll the given
    // rectangle into view. Returns an object with scrollTop and
    // scrollLeft properties. When these are undefined, the
    // vertical/horizontal position does not need to be adjusted.
    function calculateScrollPos(cm, rect) {
      var display = cm.display, snapMargin = textHeight(cm.display);
      if (rect.top < 0) { rect.top = 0; }
      var screentop = cm.curOp && cm.curOp.scrollTop != null ? cm.curOp.scrollTop : display.scroller.scrollTop;
      var screen = displayHeight(cm), result = {};
      if (rect.bottom - rect.top > screen) { rect.bottom = rect.top + screen; }
      var docBottom = cm.doc.height + paddingVert(display);
      var atTop = rect.top < snapMargin, atBottom = rect.bottom > docBottom - snapMargin;
      if (rect.top < screentop) {
        result.scrollTop = atTop ? 0 : rect.top;
      } else if (rect.bottom > screentop + screen) {
        var newTop = Math.min(rect.top, (atBottom ? docBottom : rect.bottom) - screen);
        if (newTop != screentop) { result.scrollTop = newTop; }
      }

      var screenleft = cm.curOp && cm.curOp.scrollLeft != null ? cm.curOp.scrollLeft : display.scroller.scrollLeft;
      var screenw = displayWidth(cm) - (cm.options.fixedGutter ? display.gutters.offsetWidth : 0);
      var tooWide = rect.right - rect.left > screenw;
      if (tooWide) { rect.right = rect.left + screenw; }
      if (rect.left < 10)
        { result.scrollLeft = 0; }
      else if (rect.left < screenleft)
        { result.scrollLeft = Math.max(0, rect.left - (tooWide ? 0 : 10)); }
      else if (rect.right > screenw + screenleft - 3)
        { result.scrollLeft = rect.right + (tooWide ? 0 : 10) - screenw; }
      return result
    }

    // Store a relative adjustment to the scroll position in the current
    // operation (to be applied when the operation finishes).
    function addToScrollTop(cm, top) {
      if (top == null) { return }
      resolveScrollToPos(cm);
      cm.curOp.scrollTop = (cm.curOp.scrollTop == null ? cm.doc.scrollTop : cm.curOp.scrollTop) + top;
    }

    // Make sure that at the end of the operation the current cursor is
    // shown.
    function ensureCursorVisible(cm) {
      resolveScrollToPos(cm);
      var cur = cm.getCursor();
      cm.curOp.scrollToPos = {from: cur, to: cur, margin: cm.options.cursorScrollMargin};
    }

    function scrollToCoords(cm, x, y) {
      if (x != null || y != null) { resolveScrollToPos(cm); }
      if (x != null) { cm.curOp.scrollLeft = x; }
      if (y != null) { cm.curOp.scrollTop = y; }
    }

    function scrollToRange(cm, range$$1) {
      resolveScrollToPos(cm);
      cm.curOp.scrollToPos = range$$1;
    }

    // When an operation has its scrollToPos property set, and another
    // scroll action is applied before the end of the operation, this
    // 'simulates' scrolling that position into view in a cheap way, so
    // that the effect of intermediate scroll commands is not ignored.
    function resolveScrollToPos(cm) {
      var range$$1 = cm.curOp.scrollToPos;
      if (range$$1) {
        cm.curOp.scrollToPos = null;
        var from = estimateCoords(cm, range$$1.from), to = estimateCoords(cm, range$$1.to);
        scrollToCoordsRange(cm, from, to, range$$1.margin);
      }
    }

    function scrollToCoordsRange(cm, from, to, margin) {
      var sPos = calculateScrollPos(cm, {
        left: Math.min(from.left, to.left),
        top: Math.min(from.top, to.top) - margin,
        right: Math.max(from.right, to.right),
        bottom: Math.max(from.bottom, to.bottom) + margin
      });
      scrollToCoords(cm, sPos.scrollLeft, sPos.scrollTop);
    }

    // Sync the scrollable area and scrollbars, ensure the viewport
    // covers the visible area.
    function updateScrollTop(cm, val) {
      if (Math.abs(cm.doc.scrollTop - val) < 2) { return }
      if (!gecko) { updateDisplaySimple(cm, {top: val}); }
      setScrollTop(cm, val, true);
      if (gecko) { updateDisplaySimple(cm); }
      startWorker(cm, 100);
    }

    function setScrollTop(cm, val, forceScroll) {
      val = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight, val);
      if (cm.display.scroller.scrollTop == val && !forceScroll) { return }
      cm.doc.scrollTop = val;
      cm.display.scrollbars.setScrollTop(val);
      if (cm.display.scroller.scrollTop != val) { cm.display.scroller.scrollTop = val; }
    }

    // Sync scroller and scrollbar, ensure the gutter elements are
    // aligned.
    function setScrollLeft(cm, val, isScroller, forceScroll) {
      val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
      if ((isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) && !forceScroll) { return }
      cm.doc.scrollLeft = val;
      alignHorizontally(cm);
      if (cm.display.scroller.scrollLeft != val) { cm.display.scroller.scrollLeft = val; }
      cm.display.scrollbars.setScrollLeft(val);
    }

    // SCROLLBARS

    // Prepare DOM reads needed to update the scrollbars. Done in one
    // shot to minimize update/measure roundtrips.
    function measureForScrollbars(cm) {
      var d = cm.display, gutterW = d.gutters.offsetWidth;
      var docH = Math.round(cm.doc.height + paddingVert(cm.display));
      return {
        clientHeight: d.scroller.clientHeight,
        viewHeight: d.wrapper.clientHeight,
        scrollWidth: d.scroller.scrollWidth, clientWidth: d.scroller.clientWidth,
        viewWidth: d.wrapper.clientWidth,
        barLeft: cm.options.fixedGutter ? gutterW : 0,
        docHeight: docH,
        scrollHeight: docH + scrollGap(cm) + d.barHeight,
        nativeBarWidth: d.nativeBarWidth,
        gutterWidth: gutterW
      }
    }

    var NativeScrollbars = function(place, scroll, cm) {
      this.cm = cm;
      var vert = this.vert = elt("div", [elt("div", null, null, "min-width: 1px")], "CodeMirror-vscrollbar");
      var horiz = this.horiz = elt("div", [elt("div", null, null, "height: 100%; min-height: 1px")], "CodeMirror-hscrollbar");
      vert.tabIndex = horiz.tabIndex = -1;
      place(vert); place(horiz);

      on(vert, "scroll", function () {
        if (vert.clientHeight) { scroll(vert.scrollTop, "vertical"); }
      });
      on(horiz, "scroll", function () {
        if (horiz.clientWidth) { scroll(horiz.scrollLeft, "horizontal"); }
      });

      this.checkedZeroWidth = false;
      // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
      if (ie && ie_version < 8) { this.horiz.style.minHeight = this.vert.style.minWidth = "18px"; }
    };

    NativeScrollbars.prototype.update = function (measure) {
      var needsH = measure.scrollWidth > measure.clientWidth + 1;
      var needsV = measure.scrollHeight > measure.clientHeight + 1;
      var sWidth = measure.nativeBarWidth;

      if (needsV) {
        this.vert.style.display = "block";
        this.vert.style.bottom = needsH ? sWidth + "px" : "0";
        var totalHeight = measure.viewHeight - (needsH ? sWidth : 0);
        // A bug in IE8 can cause this value to be negative, so guard it.
        this.vert.firstChild.style.height =
          Math.max(0, measure.scrollHeight - measure.clientHeight + totalHeight) + "px";
      } else {
        this.vert.style.display = "";
        this.vert.firstChild.style.height = "0";
      }

      if (needsH) {
        this.horiz.style.display = "block";
        this.horiz.style.right = needsV ? sWidth + "px" : "0";
        this.horiz.style.left = measure.barLeft + "px";
        var totalWidth = measure.viewWidth - measure.barLeft - (needsV ? sWidth : 0);
        this.horiz.firstChild.style.width =
          Math.max(0, measure.scrollWidth - measure.clientWidth + totalWidth) + "px";
      } else {
        this.horiz.style.display = "";
        this.horiz.firstChild.style.width = "0";
      }

      if (!this.checkedZeroWidth && measure.clientHeight > 0) {
        if (sWidth == 0) { this.zeroWidthHack(); }
        this.checkedZeroWidth = true;
      }

      return {right: needsV ? sWidth : 0, bottom: needsH ? sWidth : 0}
    };

    NativeScrollbars.prototype.setScrollLeft = function (pos) {
      if (this.horiz.scrollLeft != pos) { this.horiz.scrollLeft = pos; }
      if (this.disableHoriz) { this.enableZeroWidthBar(this.horiz, this.disableHoriz, "horiz"); }
    };

    NativeScrollbars.prototype.setScrollTop = function (pos) {
      if (this.vert.scrollTop != pos) { this.vert.scrollTop = pos; }
      if (this.disableVert) { this.enableZeroWidthBar(this.vert, this.disableVert, "vert"); }
    };

    NativeScrollbars.prototype.zeroWidthHack = function () {
      var w = mac && !mac_geMountainLion ? "12px" : "18px";
      this.horiz.style.height = this.vert.style.width = w;
      this.horiz.style.pointerEvents = this.vert.style.pointerEvents = "none";
      this.disableHoriz = new Delayed;
      this.disableVert = new Delayed;
    };

    NativeScrollbars.prototype.enableZeroWidthBar = function (bar, delay, type) {
      bar.style.pointerEvents = "auto";
      function maybeDisable() {
        // To find out whether the scrollbar is still visible, we
        // check whether the element under the pixel in the bottom
        // right corner of the scrollbar box is the scrollbar box
        // itself (when the bar is still visible) or its filler child
        // (when the bar is hidden). If it is still visible, we keep
        // it enabled, if it's hidden, we disable pointer events.
        var box = bar.getBoundingClientRect();
        var elt$$1 = type == "vert" ? document.elementFromPoint(box.right - 1, (box.top + box.bottom) / 2)
            : document.elementFromPoint((box.right + box.left) / 2, box.bottom - 1);
        if (elt$$1 != bar) { bar.style.pointerEvents = "none"; }
        else { delay.set(1000, maybeDisable); }
      }
      delay.set(1000, maybeDisable);
    };

    NativeScrollbars.prototype.clear = function () {
      var parent = this.horiz.parentNode;
      parent.removeChild(this.horiz);
      parent.removeChild(this.vert);
    };

    var NullScrollbars = function () {};

    NullScrollbars.prototype.update = function () { return {bottom: 0, right: 0} };
    NullScrollbars.prototype.setScrollLeft = function () {};
    NullScrollbars.prototype.setScrollTop = function () {};
    NullScrollbars.prototype.clear = function () {};

    function updateScrollbars(cm, measure) {
      if (!measure) { measure = measureForScrollbars(cm); }
      var startWidth = cm.display.barWidth, startHeight = cm.display.barHeight;
      updateScrollbarsInner(cm, measure);
      for (var i = 0; i < 4 && startWidth != cm.display.barWidth || startHeight != cm.display.barHeight; i++) {
        if (startWidth != cm.display.barWidth && cm.options.lineWrapping)
          { updateHeightsInViewport(cm); }
        updateScrollbarsInner(cm, measureForScrollbars(cm));
        startWidth = cm.display.barWidth; startHeight = cm.display.barHeight;
      }
    }

    // Re-synchronize the fake scrollbars with the actual size of the
    // content.
    function updateScrollbarsInner(cm, measure) {
      var d = cm.display;
      var sizes = d.scrollbars.update(measure);

      d.sizer.style.paddingRight = (d.barWidth = sizes.right) + "px";
      d.sizer.style.paddingBottom = (d.barHeight = sizes.bottom) + "px";
      d.heightForcer.style.borderBottom = sizes.bottom + "px solid transparent";

      if (sizes.right && sizes.bottom) {
        d.scrollbarFiller.style.display = "block";
        d.scrollbarFiller.style.height = sizes.bottom + "px";
        d.scrollbarFiller.style.width = sizes.right + "px";
      } else { d.scrollbarFiller.style.display = ""; }
      if (sizes.bottom && cm.options.coverGutterNextToScrollbar && cm.options.fixedGutter) {
        d.gutterFiller.style.display = "block";
        d.gutterFiller.style.height = sizes.bottom + "px";
        d.gutterFiller.style.width = measure.gutterWidth + "px";
      } else { d.gutterFiller.style.display = ""; }
    }

    var scrollbarModel = {"native": NativeScrollbars, "null": NullScrollbars};

    function initScrollbars(cm) {
      if (cm.display.scrollbars) {
        cm.display.scrollbars.clear();
        if (cm.display.scrollbars.addClass)
          { rmClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
      }

      cm.display.scrollbars = new scrollbarModel[cm.options.scrollbarStyle](function (node) {
        cm.display.wrapper.insertBefore(node, cm.display.scrollbarFiller);
        // Prevent clicks in the scrollbars from killing focus
        on(node, "mousedown", function () {
          if (cm.state.focused) { setTimeout(function () { return cm.display.input.focus(); }, 0); }
        });
        node.setAttribute("cm-not-content", "true");
      }, function (pos, axis) {
        if (axis == "horizontal") { setScrollLeft(cm, pos); }
        else { updateScrollTop(cm, pos); }
      }, cm);
      if (cm.display.scrollbars.addClass)
        { addClass(cm.display.wrapper, cm.display.scrollbars.addClass); }
    }

    // Operations are used to wrap a series of changes to the editor
    // state in such a way that each change won't have to update the
    // cursor and display (which would be awkward, slow, and
    // error-prone). Instead, display updates are batched and then all
    // combined and executed at once.

    var nextOpId = 0;
    // Start a new operation.
    function startOperation(cm) {
      cm.curOp = {
        cm: cm,
        viewChanged: false,      // Flag that indicates that lines might need to be redrawn
        startHeight: cm.doc.height, // Used to detect need to update scrollbar
        forceUpdate: false,      // Used to force a redraw
        updateInput: 0,       // Whether to reset the input textarea
        typing: false,           // Whether this reset should be careful to leave existing text (for compositing)
        changeObjs: null,        // Accumulated changes, for firing change events
        cursorActivityHandlers: null, // Set of handlers to fire cursorActivity on
        cursorActivityCalled: 0, // Tracks which cursorActivity handlers have been called already
        selectionChanged: false, // Whether the selection needs to be redrawn
        updateMaxLine: false,    // Set when the widest line needs to be determined anew
        scrollLeft: null, scrollTop: null, // Intermediate scroll position, not pushed to DOM yet
        scrollToPos: null,       // Used to scroll to a specific position
        focus: false,
        id: ++nextOpId           // Unique ID
      };
      pushOperation(cm.curOp);
    }

    // Finish an operation, updating the display and signalling delayed events
    function endOperation(cm) {
      var op = cm.curOp;
      if (op) { finishOperation(op, function (group) {
        for (var i = 0; i < group.ops.length; i++)
          { group.ops[i].cm.curOp = null; }
        endOperations(group);
      }); }
    }

    // The DOM updates done when an operation finishes are batched so
    // that the minimum number of relayouts are required.
    function endOperations(group) {
      var ops = group.ops;
      for (var i = 0; i < ops.length; i++) // Read DOM
        { endOperation_R1(ops[i]); }
      for (var i$1 = 0; i$1 < ops.length; i$1++) // Write DOM (maybe)
        { endOperation_W1(ops[i$1]); }
      for (var i$2 = 0; i$2 < ops.length; i$2++) // Read DOM
        { endOperation_R2(ops[i$2]); }
      for (var i$3 = 0; i$3 < ops.length; i$3++) // Write DOM (maybe)
        { endOperation_W2(ops[i$3]); }
      for (var i$4 = 0; i$4 < ops.length; i$4++) // Read DOM
        { endOperation_finish(ops[i$4]); }
    }

    function endOperation_R1(op) {
      var cm = op.cm, display = cm.display;
      maybeClipScrollbars(cm);
      if (op.updateMaxLine) { findMaxLine(cm); }

      op.mustUpdate = op.viewChanged || op.forceUpdate || op.scrollTop != null ||
        op.scrollToPos && (op.scrollToPos.from.line < display.viewFrom ||
                           op.scrollToPos.to.line >= display.viewTo) ||
        display.maxLineChanged && cm.options.lineWrapping;
      op.update = op.mustUpdate &&
        new DisplayUpdate(cm, op.mustUpdate && {top: op.scrollTop, ensure: op.scrollToPos}, op.forceUpdate);
    }

    function endOperation_W1(op) {
      op.updatedDisplay = op.mustUpdate && updateDisplayIfNeeded(op.cm, op.update);
    }

    function endOperation_R2(op) {
      var cm = op.cm, display = cm.display;
      if (op.updatedDisplay) { updateHeightsInViewport(cm); }

      op.barMeasure = measureForScrollbars(cm);

      // If the max line changed since it was last measured, measure it,
      // and ensure the document's width matches it.
      // updateDisplay_W2 will use these properties to do the actual resizing
      if (display.maxLineChanged && !cm.options.lineWrapping) {
        op.adjustWidthTo = measureChar(cm, display.maxLine, display.maxLine.text.length).left + 3;
        cm.display.sizerWidth = op.adjustWidthTo;
        op.barMeasure.scrollWidth =
          Math.max(display.scroller.clientWidth, display.sizer.offsetLeft + op.adjustWidthTo + scrollGap(cm) + cm.display.barWidth);
        op.maxScrollLeft = Math.max(0, display.sizer.offsetLeft + op.adjustWidthTo - displayWidth(cm));
      }

      if (op.updatedDisplay || op.selectionChanged)
        { op.preparedSelection = display.input.prepareSelection(); }
    }

    function endOperation_W2(op) {
      var cm = op.cm;

      if (op.adjustWidthTo != null) {
        cm.display.sizer.style.minWidth = op.adjustWidthTo + "px";
        if (op.maxScrollLeft < cm.doc.scrollLeft)
          { setScrollLeft(cm, Math.min(cm.display.scroller.scrollLeft, op.maxScrollLeft), true); }
        cm.display.maxLineChanged = false;
      }

      var takeFocus = op.focus && op.focus == activeElt();
      if (op.preparedSelection)
        { cm.display.input.showSelection(op.preparedSelection, takeFocus); }
      if (op.updatedDisplay || op.startHeight != cm.doc.height)
        { updateScrollbars(cm, op.barMeasure); }
      if (op.updatedDisplay)
        { setDocumentHeight(cm, op.barMeasure); }

      if (op.selectionChanged) { restartBlink(cm); }

      if (cm.state.focused && op.updateInput)
        { cm.display.input.reset(op.typing); }
      if (takeFocus) { ensureFocus(op.cm); }
    }

    function endOperation_finish(op) {
      var cm = op.cm, display = cm.display, doc = cm.doc;

      if (op.updatedDisplay) { postUpdateDisplay(cm, op.update); }

      // Abort mouse wheel delta measurement, when scrolling explicitly
      if (display.wheelStartX != null && (op.scrollTop != null || op.scrollLeft != null || op.scrollToPos))
        { display.wheelStartX = display.wheelStartY = null; }

      // Propagate the scroll position to the actual DOM scroller
      if (op.scrollTop != null) { setScrollTop(cm, op.scrollTop, op.forceScroll); }

      if (op.scrollLeft != null) { setScrollLeft(cm, op.scrollLeft, true, true); }
      // If we need to scroll a specific position into view, do so.
      if (op.scrollToPos) {
        var rect = scrollPosIntoView(cm, clipPos(doc, op.scrollToPos.from),
                                     clipPos(doc, op.scrollToPos.to), op.scrollToPos.margin);
        maybeScrollWindow(cm, rect);
      }

      // Fire events for markers that are hidden/unidden by editing or
      // undoing
      var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
      if (hidden) { for (var i = 0; i < hidden.length; ++i)
        { if (!hidden[i].lines.length) { signal(hidden[i], "hide"); } } }
      if (unhidden) { for (var i$1 = 0; i$1 < unhidden.length; ++i$1)
        { if (unhidden[i$1].lines.length) { signal(unhidden[i$1], "unhide"); } } }

      if (display.wrapper.offsetHeight)
        { doc.scrollTop = cm.display.scroller.scrollTop; }

      // Fire change events, and delayed event handlers
      if (op.changeObjs)
        { signal(cm, "changes", cm, op.changeObjs); }
      if (op.update)
        { op.update.finish(); }
    }

    // Run the given function in an operation
    function runInOp(cm, f) {
      if (cm.curOp) { return f() }
      startOperation(cm);
      try { return f() }
      finally { endOperation(cm); }
    }
    // Wraps a function in an operation. Returns the wrapped function.
    function operation(cm, f) {
      return function() {
        if (cm.curOp) { return f.apply(cm, arguments) }
        startOperation(cm);
        try { return f.apply(cm, arguments) }
        finally { endOperation(cm); }
      }
    }
    // Used to add methods to editor and doc instances, wrapping them in
    // operations.
    function methodOp(f) {
      return function() {
        if (this.curOp) { return f.apply(this, arguments) }
        startOperation(this);
        try { return f.apply(this, arguments) }
        finally { endOperation(this); }
      }
    }
    function docMethodOp(f) {
      return function() {
        var cm = this.cm;
        if (!cm || cm.curOp) { return f.apply(this, arguments) }
        startOperation(cm);
        try { return f.apply(this, arguments) }
        finally { endOperation(cm); }
      }
    }

    // HIGHLIGHT WORKER

    function startWorker(cm, time) {
      if (cm.doc.highlightFrontier < cm.display.viewTo)
        { cm.state.highlight.set(time, bind(highlightWorker, cm)); }
    }

    function highlightWorker(cm) {
      var doc = cm.doc;
      if (doc.highlightFrontier >= cm.display.viewTo) { return }
      var end = +new Date + cm.options.workTime;
      var context = getContextBefore(cm, doc.highlightFrontier);
      var changedLines = [];

      doc.iter(context.line, Math.min(doc.first + doc.size, cm.display.viewTo + 500), function (line) {
        if (context.line >= cm.display.viewFrom) { // Visible
          var oldStyles = line.styles;
          var resetState = line.text.length > cm.options.maxHighlightLength ? copyState(doc.mode, context.state) : null;
          var highlighted = highlightLine(cm, line, context, true);
          if (resetState) { context.state = resetState; }
          line.styles = highlighted.styles;
          var oldCls = line.styleClasses, newCls = highlighted.classes;
          if (newCls) { line.styleClasses = newCls; }
          else if (oldCls) { line.styleClasses = null; }
          var ischange = !oldStyles || oldStyles.length != line.styles.length ||
            oldCls != newCls && (!oldCls || !newCls || oldCls.bgClass != newCls.bgClass || oldCls.textClass != newCls.textClass);
          for (var i = 0; !ischange && i < oldStyles.length; ++i) { ischange = oldStyles[i] != line.styles[i]; }
          if (ischange) { changedLines.push(context.line); }
          line.stateAfter = context.save();
          context.nextLine();
        } else {
          if (line.text.length <= cm.options.maxHighlightLength)
            { processLine(cm, line.text, context); }
          line.stateAfter = context.line % 5 == 0 ? context.save() : null;
          context.nextLine();
        }
        if (+new Date > end) {
          startWorker(cm, cm.options.workDelay);
          return true
        }
      });
      doc.highlightFrontier = context.line;
      doc.modeFrontier = Math.max(doc.modeFrontier, context.line);
      if (changedLines.length) { runInOp(cm, function () {
        for (var i = 0; i < changedLines.length; i++)
          { regLineChange(cm, changedLines[i], "text"); }
      }); }
    }

    // DISPLAY DRAWING

    var DisplayUpdate = function(cm, viewport, force) {
      var display = cm.display;

      this.viewport = viewport;
      // Store some values that we'll need later (but don't want to force a relayout for)
      this.visible = visibleLines(display, cm.doc, viewport);
      this.editorIsHidden = !display.wrapper.offsetWidth;
      this.wrapperHeight = display.wrapper.clientHeight;
      this.wrapperWidth = display.wrapper.clientWidth;
      this.oldDisplayWidth = displayWidth(cm);
      this.force = force;
      this.dims = getDimensions(cm);
      this.events = [];
    };

    DisplayUpdate.prototype.signal = function (emitter, type) {
      if (hasHandler(emitter, type))
        { this.events.push(arguments); }
    };
    DisplayUpdate.prototype.finish = function () {
        var this$1 = this;

      for (var i = 0; i < this.events.length; i++)
        { signal.apply(null, this$1.events[i]); }
    };

    function maybeClipScrollbars(cm) {
      var display = cm.display;
      if (!display.scrollbarsClipped && display.scroller.offsetWidth) {
        display.nativeBarWidth = display.scroller.offsetWidth - display.scroller.clientWidth;
        display.heightForcer.style.height = scrollGap(cm) + "px";
        display.sizer.style.marginBottom = -display.nativeBarWidth + "px";
        display.sizer.style.borderRightWidth = scrollGap(cm) + "px";
        display.scrollbarsClipped = true;
      }
    }

    function selectionSnapshot(cm) {
      if (cm.hasFocus()) { return null }
      var active = activeElt();
      if (!active || !contains(cm.display.lineDiv, active)) { return null }
      var result = {activeElt: active};
      if (window.getSelection) {
        var sel = window.getSelection();
        if (sel.anchorNode && sel.extend && contains(cm.display.lineDiv, sel.anchorNode)) {
          result.anchorNode = sel.anchorNode;
          result.anchorOffset = sel.anchorOffset;
          result.focusNode = sel.focusNode;
          result.focusOffset = sel.focusOffset;
        }
      }
      return result
    }

    function restoreSelection(snapshot) {
      if (!snapshot || !snapshot.activeElt || snapshot.activeElt == activeElt()) { return }
      snapshot.activeElt.focus();
      if (snapshot.anchorNode && contains(document.body, snapshot.anchorNode) && contains(document.body, snapshot.focusNode)) {
        var sel = window.getSelection(), range$$1 = document.createRange();
        range$$1.setEnd(snapshot.anchorNode, snapshot.anchorOffset);
        range$$1.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range$$1);
        sel.extend(snapshot.focusNode, snapshot.focusOffset);
      }
    }

    // Does the actual updating of the line display. Bails out
    // (returning false) when there is nothing to be done and forced is
    // false.
    function updateDisplayIfNeeded(cm, update) {
      var display = cm.display, doc = cm.doc;

      if (update.editorIsHidden) {
        resetView(cm);
        return false
      }

      // Bail out if the visible area is already rendered and nothing changed.
      if (!update.force &&
          update.visible.from >= display.viewFrom && update.visible.to <= display.viewTo &&
          (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo) &&
          display.renderedView == display.view && countDirtyView(cm) == 0)
        { return false }

      if (maybeUpdateLineNumberWidth(cm)) {
        resetView(cm);
        update.dims = getDimensions(cm);
      }

      // Compute a suitable new viewport (from & to)
      var end = doc.first + doc.size;
      var from = Math.max(update.visible.from - cm.options.viewportMargin, doc.first);
      var to = Math.min(end, update.visible.to + cm.options.viewportMargin);
      if (display.viewFrom < from && from - display.viewFrom < 20) { from = Math.max(doc.first, display.viewFrom); }
      if (display.viewTo > to && display.viewTo - to < 20) { to = Math.min(end, display.viewTo); }
      if (sawCollapsedSpans) {
        from = visualLineNo(cm.doc, from);
        to = visualLineEndNo(cm.doc, to);
      }

      var different = from != display.viewFrom || to != display.viewTo ||
        display.lastWrapHeight != update.wrapperHeight || display.lastWrapWidth != update.wrapperWidth;
      adjustView(cm, from, to);

      display.viewOffset = heightAtLine(getLine(cm.doc, display.viewFrom));
      // Position the mover div to align with the current scroll position
      cm.display.mover.style.top = display.viewOffset + "px";

      var toUpdate = countDirtyView(cm);
      if (!different && toUpdate == 0 && !update.force && display.renderedView == display.view &&
          (display.updateLineNumbers == null || display.updateLineNumbers >= display.viewTo))
        { return false }

      // For big changes, we hide the enclosing element during the
      // update, since that speeds up the operations on most browsers.
      var selSnapshot = selectionSnapshot(cm);
      if (toUpdate > 4) { display.lineDiv.style.display = "none"; }
      patchDisplay(cm, display.updateLineNumbers, update.dims);
      if (toUpdate > 4) { display.lineDiv.style.display = ""; }
      display.renderedView = display.view;
      // There might have been a widget with a focused element that got
      // hidden or updated, if so re-focus it.
      restoreSelection(selSnapshot);

      // Prevent selection and cursors from interfering with the scroll
      // width and height.
      removeChildren(display.cursorDiv);
      removeChildren(display.selectionDiv);
      display.gutters.style.height = display.sizer.style.minHeight = 0;

      if (different) {
        display.lastWrapHeight = update.wrapperHeight;
        display.lastWrapWidth = update.wrapperWidth;
        startWorker(cm, 400);
      }

      display.updateLineNumbers = null;

      return true
    }

    function postUpdateDisplay(cm, update) {
      var viewport = update.viewport;

      for (var first = true;; first = false) {
        if (!first || !cm.options.lineWrapping || update.oldDisplayWidth == displayWidth(cm)) {
          // Clip forced viewport to actual scrollable area.
          if (viewport && viewport.top != null)
            { viewport = {top: Math.min(cm.doc.height + paddingVert(cm.display) - displayHeight(cm), viewport.top)}; }
          // Updated line heights might result in the drawn area not
          // actually covering the viewport. Keep looping until it does.
          update.visible = visibleLines(cm.display, cm.doc, viewport);
          if (update.visible.from >= cm.display.viewFrom && update.visible.to <= cm.display.viewTo)
            { break }
        }
        if (!updateDisplayIfNeeded(cm, update)) { break }
        updateHeightsInViewport(cm);
        var barMeasure = measureForScrollbars(cm);
        updateSelection(cm);
        updateScrollbars(cm, barMeasure);
        setDocumentHeight(cm, barMeasure);
        update.force = false;
      }

      update.signal(cm, "update", cm);
      if (cm.display.viewFrom != cm.display.reportedViewFrom || cm.display.viewTo != cm.display.reportedViewTo) {
        update.signal(cm, "viewportChange", cm, cm.display.viewFrom, cm.display.viewTo);
        cm.display.reportedViewFrom = cm.display.viewFrom; cm.display.reportedViewTo = cm.display.viewTo;
      }
    }

    function updateDisplaySimple(cm, viewport) {
      var update = new DisplayUpdate(cm, viewport);
      if (updateDisplayIfNeeded(cm, update)) {
        updateHeightsInViewport(cm);
        postUpdateDisplay(cm, update);
        var barMeasure = measureForScrollbars(cm);
        updateSelection(cm);
        updateScrollbars(cm, barMeasure);
        setDocumentHeight(cm, barMeasure);
        update.finish();
      }
    }

    // Sync the actual display DOM structure with display.view, removing
    // nodes for lines that are no longer in view, and creating the ones
    // that are not there yet, and updating the ones that are out of
    // date.
    function patchDisplay(cm, updateNumbersFrom, dims) {
      var display = cm.display, lineNumbers = cm.options.lineNumbers;
      var container = display.lineDiv, cur = container.firstChild;

      function rm(node) {
        var next = node.nextSibling;
        // Works around a throw-scroll bug in OS X Webkit
        if (webkit && mac && cm.display.currentWheelTarget == node)
          { node.style.display = "none"; }
        else
          { node.parentNode.removeChild(node); }
        return next
      }

      var view = display.view, lineN = display.viewFrom;
      // Loop over the elements in the view, syncing cur (the DOM nodes
      // in display.lineDiv) with the view as we go.
      for (var i = 0; i < view.length; i++) {
        var lineView = view[i];
        if (lineView.hidden) ; else if (!lineView.node || lineView.node.parentNode != container) { // Not drawn yet
          var node = buildLineElement(cm, lineView, lineN, dims);
          container.insertBefore(node, cur);
        } else { // Already drawn
          while (cur != lineView.node) { cur = rm(cur); }
          var updateNumber = lineNumbers && updateNumbersFrom != null &&
            updateNumbersFrom <= lineN && lineView.lineNumber;
          if (lineView.changes) {
            if (indexOf(lineView.changes, "gutter") > -1) { updateNumber = false; }
            updateLineForChanges(cm, lineView, lineN, dims);
          }
          if (updateNumber) {
            removeChildren(lineView.lineNumber);
            lineView.lineNumber.appendChild(document.createTextNode(lineNumberFor(cm.options, lineN)));
          }
          cur = lineView.node.nextSibling;
        }
        lineN += lineView.size;
      }
      while (cur) { cur = rm(cur); }
    }

    function updateGutterSpace(display) {
      var width = display.gutters.offsetWidth;
      display.sizer.style.marginLeft = width + "px";
    }

    function setDocumentHeight(cm, measure) {
      cm.display.sizer.style.minHeight = measure.docHeight + "px";
      cm.display.heightForcer.style.top = measure.docHeight + "px";
      cm.display.gutters.style.height = (measure.docHeight + cm.display.barHeight + scrollGap(cm)) + "px";
    }

    // Re-align line numbers and gutter marks to compensate for
    // horizontal scrolling.
    function alignHorizontally(cm) {
      var display = cm.display, view = display.view;
      if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) { return }
      var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
      var gutterW = display.gutters.offsetWidth, left = comp + "px";
      for (var i = 0; i < view.length; i++) { if (!view[i].hidden) {
        if (cm.options.fixedGutter) {
          if (view[i].gutter)
            { view[i].gutter.style.left = left; }
          if (view[i].gutterBackground)
            { view[i].gutterBackground.style.left = left; }
        }
        var align = view[i].alignable;
        if (align) { for (var j = 0; j < align.length; j++)
          { align[j].style.left = left; } }
      } }
      if (cm.options.fixedGutter)
        { display.gutters.style.left = (comp + gutterW) + "px"; }
    }

    // Used to ensure that the line number gutter is still the right
    // size for the current document size. Returns true when an update
    // is needed.
    function maybeUpdateLineNumberWidth(cm) {
      if (!cm.options.lineNumbers) { return false }
      var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
      if (last.length != display.lineNumChars) {
        var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                                   "CodeMirror-linenumber CodeMirror-gutter-elt"));
        var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
        display.lineGutter.style.width = "";
        display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding) + 1;
        display.lineNumWidth = display.lineNumInnerWidth + padding;
        display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
        display.lineGutter.style.width = display.lineNumWidth + "px";
        updateGutterSpace(cm.display);
        return true
      }
      return false
    }

    function getGutters(gutters, lineNumbers) {
      var result = [], sawLineNumbers = false;
      for (var i = 0; i < gutters.length; i++) {
        var name = gutters[i], style = null;
        if (typeof name != "string") { style = name.style; name = name.className; }
        if (name == "CodeMirror-linenumbers") {
          if (!lineNumbers) { continue }
          else { sawLineNumbers = true; }
        }
        result.push({className: name, style: style});
      }
      if (lineNumbers && !sawLineNumbers) { result.push({className: "CodeMirror-linenumbers", style: null}); }
      return result
    }

    // Rebuild the gutter elements, ensure the margin to the left of the
    // code matches their width.
    function renderGutters(display) {
      var gutters = display.gutters, specs = display.gutterSpecs;
      removeChildren(gutters);
      display.lineGutter = null;
      for (var i = 0; i < specs.length; ++i) {
        var ref = specs[i];
        var className = ref.className;
        var style = ref.style;
        var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + className));
        if (style) { gElt.style.cssText = style; }
        if (className == "CodeMirror-linenumbers") {
          display.lineGutter = gElt;
          gElt.style.width = (display.lineNumWidth || 1) + "px";
        }
      }
      gutters.style.display = specs.length ? "" : "none";
      updateGutterSpace(display);
    }

    function updateGutters(cm) {
      renderGutters(cm.display);
      regChange(cm);
      alignHorizontally(cm);
    }

    // The display handles the DOM integration, both for input reading
    // and content drawing. It holds references to DOM nodes and
    // display-related state.

    function Display(place, doc, input, options) {
      var d = this;
      this.input = input;

      // Covers bottom-right square when both scrollbars are present.
      d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
      d.scrollbarFiller.setAttribute("cm-not-content", "true");
      // Covers bottom of gutter when coverGutterNextToScrollbar is on
      // and h scrollbar is present.
      d.gutterFiller = elt("div", null, "CodeMirror-gutter-filler");
      d.gutterFiller.setAttribute("cm-not-content", "true");
      // Will contain the actual code, positioned to cover the viewport.
      d.lineDiv = eltP("div", null, "CodeMirror-code");
      // Elements are added to these to represent selection and cursors.
      d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
      d.cursorDiv = elt("div", null, "CodeMirror-cursors");
      // A visibility: hidden element used to find the size of things.
      d.measure = elt("div", null, "CodeMirror-measure");
      // When lines outside of the viewport are measured, they are drawn in this.
      d.lineMeasure = elt("div", null, "CodeMirror-measure");
      // Wraps everything that needs to exist inside the vertically-padded coordinate system
      d.lineSpace = eltP("div", [d.measure, d.lineMeasure, d.selectionDiv, d.cursorDiv, d.lineDiv],
                        null, "position: relative; outline: none");
      var lines = eltP("div", [d.lineSpace], "CodeMirror-lines");
      // Moved around its parent to cover visible view.
      d.mover = elt("div", [lines], null, "position: relative");
      // Set to the height of the document, allowing scrolling.
      d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
      d.sizerWidth = null;
      // Behavior of elts with overflow: auto and padding is
      // inconsistent across browsers. This is used to ensure the
      // scrollable area is big enough.
      d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerGap + "px; width: 1px;");
      // Will contain the gutters, if any.
      d.gutters = elt("div", null, "CodeMirror-gutters");
      d.lineGutter = null;
      // Actual scrollable element.
      d.scroller = elt("div", [d.sizer, d.heightForcer, d.gutters], "CodeMirror-scroll");
      d.scroller.setAttribute("tabIndex", "-1");
      // The element in which the editor lives.
      d.wrapper = elt("div", [d.scrollbarFiller, d.gutterFiller, d.scroller], "CodeMirror");

      // Work around IE7 z-index bug (not perfect, hence IE7 not really being supported)
      if (ie && ie_version < 8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
      if (!webkit && !(gecko && mobile)) { d.scroller.draggable = true; }

      if (place) {
        if (place.appendChild) { place.appendChild(d.wrapper); }
        else { place(d.wrapper); }
      }

      // Current rendered range (may be bigger than the view window).
      d.viewFrom = d.viewTo = doc.first;
      d.reportedViewFrom = d.reportedViewTo = doc.first;
      // Information about the rendered lines.
      d.view = [];
      d.renderedView = null;
      // Holds info about a single rendered line when it was rendered
      // for measurement, while not in view.
      d.externalMeasured = null;
      // Empty space (in pixels) above the view
      d.viewOffset = 0;
      d.lastWrapHeight = d.lastWrapWidth = 0;
      d.updateLineNumbers = null;

      d.nativeBarWidth = d.barHeight = d.barWidth = 0;
      d.scrollbarsClipped = false;

      // Used to only resize the line number gutter when necessary (when
      // the amount of lines crosses a boundary that makes its width change)
      d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
      // Set to true when a non-horizontal-scrolling line widget is
      // added. As an optimization, line widget aligning is skipped when
      // this is false.
      d.alignWidgets = false;

      d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;

      // Tracks the maximum line length so that the horizontal scrollbar
      // can be kept static when scrolling.
      d.maxLine = null;
      d.maxLineLength = 0;
      d.maxLineChanged = false;

      // Used for measuring wheel scrolling granularity
      d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

      // True when shift is held down.
      d.shift = false;

      // Used to track whether anything happened since the context menu
      // was opened.
      d.selForContextMenu = null;

      d.activeTouch = null;

      d.gutterSpecs = getGutters(options.gutters, options.lineNumbers);
      renderGutters(d);

      input.init(d);
    }

    // Since the delta values reported on mouse wheel events are
    // unstandardized between browsers and even browser versions, and
    // generally horribly unpredictable, this code starts by measuring
    // the scroll effect that the first few mouse wheel events have,
    // and, from that, detects the way it can convert deltas to pixel
    // offsets afterwards.
    //
    // The reason we want to know the amount a wheel event will scroll
    // is that it gives us a chance to update the display before the
    // actual scrolling happens, reducing flickering.

    var wheelSamples = 0, wheelPixelsPerUnit = null;
    // Fill in a browser-detected starting value on browsers where we
    // know one. These don't have to be accurate -- the result of them
    // being wrong would just be a slight flicker on the first wheel
    // scroll (if it is large enough).
    if (ie) { wheelPixelsPerUnit = -.53; }
    else if (gecko) { wheelPixelsPerUnit = 15; }
    else if (chrome) { wheelPixelsPerUnit = -.7; }
    else if (safari) { wheelPixelsPerUnit = -1/3; }

    function wheelEventDelta(e) {
      var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
      if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) { dx = e.detail; }
      if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) { dy = e.detail; }
      else if (dy == null) { dy = e.wheelDelta; }
      return {x: dx, y: dy}
    }
    function wheelEventPixels(e) {
      var delta = wheelEventDelta(e);
      delta.x *= wheelPixelsPerUnit;
      delta.y *= wheelPixelsPerUnit;
      return delta
    }

    function onScrollWheel(cm, e) {
      var delta = wheelEventDelta(e), dx = delta.x, dy = delta.y;

      var display = cm.display, scroll = display.scroller;
      // Quit if there's nothing to scroll here
      var canScrollX = scroll.scrollWidth > scroll.clientWidth;
      var canScrollY = scroll.scrollHeight > scroll.clientHeight;
      if (!(dx && canScrollX || dy && canScrollY)) { return }

      // Webkit browsers on OS X abort momentum scrolls when the target
      // of the scroll event is removed from the scrollable element.
      // This hack (see related code in patchDisplay) makes sure the
      // element is kept around.
      if (dy && mac && webkit) {
        outer: for (var cur = e.target, view = display.view; cur != scroll; cur = cur.parentNode) {
          for (var i = 0; i < view.length; i++) {
            if (view[i].node == cur) {
              cm.display.currentWheelTarget = cur;
              break outer
            }
          }
        }
      }

      // On some browsers, horizontal scrolling will cause redraws to
      // happen before the gutter has been realigned, causing it to
      // wriggle around in a most unseemly way. When we have an
      // estimated pixels/delta value, we just handle horizontal
      // scrolling entirely here. It'll be slightly off from native, but
      // better than glitching out.
      if (dx && !gecko && !presto && wheelPixelsPerUnit != null) {
        if (dy && canScrollY)
          { updateScrollTop(cm, Math.max(0, scroll.scrollTop + dy * wheelPixelsPerUnit)); }
        setScrollLeft(cm, Math.max(0, scroll.scrollLeft + dx * wheelPixelsPerUnit));
        // Only prevent default scrolling if vertical scrolling is
        // actually possible. Otherwise, it causes vertical scroll
        // jitter on OSX trackpads when deltaX is small and deltaY
        // is large (issue #3579)
        if (!dy || (dy && canScrollY))
          { e_preventDefault(e); }
        display.wheelStartX = null; // Abort measurement, if in progress
        return
      }

      // 'Project' the visible viewport to cover the area that is being
      // scrolled into view (if we know enough to estimate it).
      if (dy && wheelPixelsPerUnit != null) {
        var pixels = dy * wheelPixelsPerUnit;
        var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
        if (pixels < 0) { top = Math.max(0, top + pixels - 50); }
        else { bot = Math.min(cm.doc.height, bot + pixels + 50); }
        updateDisplaySimple(cm, {top: top, bottom: bot});
      }

      if (wheelSamples < 20) {
        if (display.wheelStartX == null) {
          display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
          display.wheelDX = dx; display.wheelDY = dy;
          setTimeout(function () {
            if (display.wheelStartX == null) { return }
            var movedX = scroll.scrollLeft - display.wheelStartX;
            var movedY = scroll.scrollTop - display.wheelStartY;
            var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
              (movedX && display.wheelDX && movedX / display.wheelDX);
            display.wheelStartX = display.wheelStartY = null;
            if (!sample) { return }
            wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
            ++wheelSamples;
          }, 200);
        } else {
          display.wheelDX += dx; display.wheelDY += dy;
        }
      }
    }

    // Selection objects are immutable. A new one is created every time
    // the selection changes. A selection is one or more non-overlapping
    // (and non-touching) ranges, sorted, and an integer that indicates
    // which one is the primary selection (the one that's scrolled into
    // view, that getCursor returns, etc).
    var Selection = function(ranges, primIndex) {
      this.ranges = ranges;
      this.primIndex = primIndex;
    };

    Selection.prototype.primary = function () { return this.ranges[this.primIndex] };

    Selection.prototype.equals = function (other) {
        var this$1 = this;

      if (other == this) { return true }
      if (other.primIndex != this.primIndex || other.ranges.length != this.ranges.length) { return false }
      for (var i = 0; i < this.ranges.length; i++) {
        var here = this$1.ranges[i], there = other.ranges[i];
        if (!equalCursorPos(here.anchor, there.anchor) || !equalCursorPos(here.head, there.head)) { return false }
      }
      return true
    };

    Selection.prototype.deepCopy = function () {
        var this$1 = this;

      var out = [];
      for (var i = 0; i < this.ranges.length; i++)
        { out[i] = new Range(copyPos(this$1.ranges[i].anchor), copyPos(this$1.ranges[i].head)); }
      return new Selection(out, this.primIndex)
    };

    Selection.prototype.somethingSelected = function () {
        var this$1 = this;

      for (var i = 0; i < this.ranges.length; i++)
        { if (!this$1.ranges[i].empty()) { return true } }
      return false
    };

    Selection.prototype.contains = function (pos, end) {
        var this$1 = this;

      if (!end) { end = pos; }
      for (var i = 0; i < this.ranges.length; i++) {
        var range = this$1.ranges[i];
        if (cmp(end, range.from()) >= 0 && cmp(pos, range.to()) <= 0)
          { return i }
      }
      return -1
    };

    var Range = function(anchor, head) {
      this.anchor = anchor; this.head = head;
    };

    Range.prototype.from = function () { return minPos(this.anchor, this.head) };
    Range.prototype.to = function () { return maxPos(this.anchor, this.head) };
    Range.prototype.empty = function () { return this.head.line == this.anchor.line && this.head.ch == this.anchor.ch };

    // Take an unsorted, potentially overlapping set of ranges, and
    // build a selection out of it. 'Consumes' ranges array (modifying
    // it).
    function normalizeSelection(cm, ranges, primIndex) {
      var mayTouch = cm && cm.options.selectionsMayTouch;
      var prim = ranges[primIndex];
      ranges.sort(function (a, b) { return cmp(a.from(), b.from()); });
      primIndex = indexOf(ranges, prim);
      for (var i = 1; i < ranges.length; i++) {
        var cur = ranges[i], prev = ranges[i - 1];
        var diff = cmp(prev.to(), cur.from());
        if (mayTouch && !cur.empty() ? diff > 0 : diff >= 0) {
          var from = minPos(prev.from(), cur.from()), to = maxPos(prev.to(), cur.to());
          var inv = prev.empty() ? cur.from() == cur.head : prev.from() == prev.head;
          if (i <= primIndex) { --primIndex; }
          ranges.splice(--i, 2, new Range(inv ? to : from, inv ? from : to));
        }
      }
      return new Selection(ranges, primIndex)
    }

    function simpleSelection(anchor, head) {
      return new Selection([new Range(anchor, head || anchor)], 0)
    }

    // Compute the position of the end of a change (its 'to' property
    // refers to the pre-change end).
    function changeEnd(change) {
      if (!change.text) { return change.to }
      return Pos(change.from.line + change.text.length - 1,
                 lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0))
    }

    // Adjust a position to refer to the post-change position of the
    // same text, or the end of the change if the change covers it.
    function adjustForChange(pos, change) {
      if (cmp(pos, change.from) < 0) { return pos }
      if (cmp(pos, change.to) <= 0) { return changeEnd(change) }

      var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
      if (pos.line == change.to.line) { ch += changeEnd(change).ch - change.to.ch; }
      return Pos(line, ch)
    }

    function computeSelAfterChange(doc, change) {
      var out = [];
      for (var i = 0; i < doc.sel.ranges.length; i++) {
        var range = doc.sel.ranges[i];
        out.push(new Range(adjustForChange(range.anchor, change),
                           adjustForChange(range.head, change)));
      }
      return normalizeSelection(doc.cm, out, doc.sel.primIndex)
    }

    function offsetPos(pos, old, nw) {
      if (pos.line == old.line)
        { return Pos(nw.line, pos.ch - old.ch + nw.ch) }
      else
        { return Pos(nw.line + (pos.line - old.line), pos.ch) }
    }

    // Used by replaceSelections to allow moving the selection to the
    // start or around the replaced test. Hint may be "start" or "around".
    function computeReplacedSel(doc, changes, hint) {
      var out = [];
      var oldPrev = Pos(doc.first, 0), newPrev = oldPrev;
      for (var i = 0; i < changes.length; i++) {
        var change = changes[i];
        var from = offsetPos(change.from, oldPrev, newPrev);
        var to = offsetPos(changeEnd(change), oldPrev, newPrev);
        oldPrev = change.to;
        newPrev = to;
        if (hint == "around") {
          var range = doc.sel.ranges[i], inv = cmp(range.head, range.anchor) < 0;
          out[i] = new Range(inv ? to : from, inv ? from : to);
        } else {
          out[i] = new Range(from, from);
        }
      }
      return new Selection(out, doc.sel.primIndex)
    }

    // Used to get the editor into a consistent state again when options change.

    function loadMode(cm) {
      cm.doc.mode = getMode(cm.options, cm.doc.modeOption);
      resetModeState(cm);
    }

    function resetModeState(cm) {
      cm.doc.iter(function (line) {
        if (line.stateAfter) { line.stateAfter = null; }
        if (line.styles) { line.styles = null; }
      });
      cm.doc.modeFrontier = cm.doc.highlightFrontier = cm.doc.first;
      startWorker(cm, 100);
      cm.state.modeGen++;
      if (cm.curOp) { regChange(cm); }
    }

    // DOCUMENT DATA STRUCTURE

    // By default, updates that start and end at the beginning of a line
    // are treated specially, in order to make the association of line
    // widgets and marker elements with the text behave more intuitive.
    function isWholeLineUpdate(doc, change) {
      return change.from.ch == 0 && change.to.ch == 0 && lst(change.text) == "" &&
        (!doc.cm || doc.cm.options.wholeLineUpdateBefore)
    }

    // Perform a change on the document data structure.
    function updateDoc(doc, change, markedSpans, estimateHeight$$1) {
      function spansFor(n) {return markedSpans ? markedSpans[n] : null}
      function update(line, text, spans) {
        updateLine(line, text, spans, estimateHeight$$1);
        signalLater(line, "change", line, change);
      }
      function linesFor(start, end) {
        var result = [];
        for (var i = start; i < end; ++i)
          { result.push(new Line(text[i], spansFor(i), estimateHeight$$1)); }
        return result
      }

      var from = change.from, to = change.to, text = change.text;
      var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
      var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

      // Adjust the line structure
      if (change.full) {
        doc.insert(0, linesFor(0, text.length));
        doc.remove(text.length, doc.size - text.length);
      } else if (isWholeLineUpdate(doc, change)) {
        // This is a whole-line replace. Treated specially to make
        // sure line objects move the way they are supposed to.
        var added = linesFor(0, text.length - 1);
        update(lastLine, lastLine.text, lastSpans);
        if (nlines) { doc.remove(from.line, nlines); }
        if (added.length) { doc.insert(from.line, added); }
      } else if (firstLine == lastLine) {
        if (text.length == 1) {
          update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
        } else {
          var added$1 = linesFor(1, text.length - 1);
          added$1.push(new Line(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight$$1));
          update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
          doc.insert(from.line + 1, added$1);
        }
      } else if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
        doc.remove(from.line + 1, nlines);
      } else {
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
        update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
        var added$2 = linesFor(1, text.length - 1);
        if (nlines > 1) { doc.remove(from.line + 1, nlines - 1); }
        doc.insert(from.line + 1, added$2);
      }

      signalLater(doc, "change", doc, change);
    }

    // Call f for all linked documents.
    function linkedDocs(doc, f, sharedHistOnly) {
      function propagate(doc, skip, sharedHist) {
        if (doc.linked) { for (var i = 0; i < doc.linked.length; ++i) {
          var rel = doc.linked[i];
          if (rel.doc == skip) { continue }
          var shared = sharedHist && rel.sharedHist;
          if (sharedHistOnly && !shared) { continue }
          f(rel.doc, shared);
          propagate(rel.doc, doc, shared);
        } }
      }
      propagate(doc, null, true);
    }

    // Attach a document to an editor.
    function attachDoc(cm, doc) {
      if (doc.cm) { throw new Error("This document is already in use.") }
      cm.doc = doc;
      doc.cm = cm;
      estimateLineHeights(cm);
      loadMode(cm);
      setDirectionClass(cm);
      if (!cm.options.lineWrapping) { findMaxLine(cm); }
      cm.options.mode = doc.modeOption;
      regChange(cm);
    }

    function setDirectionClass(cm) {
    (cm.doc.direction == "rtl" ? addClass : rmClass)(cm.display.lineDiv, "CodeMirror-rtl");
    }

    function directionChanged(cm) {
      runInOp(cm, function () {
        setDirectionClass(cm);
        regChange(cm);
      });
    }

    function History(startGen) {
      // Arrays of change events and selections. Doing something adds an
      // event to done and clears undo. Undoing moves events from done
      // to undone, redoing moves them in the other direction.
      this.done = []; this.undone = [];
      this.undoDepth = Infinity;
      // Used to track when changes can be merged into a single undo
      // event
      this.lastModTime = this.lastSelTime = 0;
      this.lastOp = this.lastSelOp = null;
      this.lastOrigin = this.lastSelOrigin = null;
      // Used by the isClean() method
      this.generation = this.maxGeneration = startGen || 1;
    }

    // Create a history change event from an updateDoc-style change
    // object.
    function historyChangeFromChange(doc, change) {
      var histChange = {from: copyPos(change.from), to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
      attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
      linkedDocs(doc, function (doc) { return attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1); }, true);
      return histChange
    }

    // Pop all selection events off the end of a history array. Stop at
    // a change event.
    function clearSelectionEvents(array) {
      while (array.length) {
        var last = lst(array);
        if (last.ranges) { array.pop(); }
        else { break }
      }
    }

    // Find the top change event in the history. Pop off selection
    // events that are in the way.
    function lastChangeEvent(hist, force) {
      if (force) {
        clearSelectionEvents(hist.done);
        return lst(hist.done)
      } else if (hist.done.length && !lst(hist.done).ranges) {
        return lst(hist.done)
      } else if (hist.done.length > 1 && !hist.done[hist.done.length - 2].ranges) {
        hist.done.pop();
        return lst(hist.done)
      }
    }

    // Register a change in the history. Merges changes that are within
    // a single operation, or are close together with an origin that
    // allows merging (starting with "+") into a single event.
    function addChangeToHistory(doc, change, selAfter, opId) {
      var hist = doc.history;
      hist.undone.length = 0;
      var time = +new Date, cur;
      var last;

      if ((hist.lastOp == opId ||
           hist.lastOrigin == change.origin && change.origin &&
           ((change.origin.charAt(0) == "+" && hist.lastModTime > time - (doc.cm ? doc.cm.options.historyEventDelay : 500)) ||
            change.origin.charAt(0) == "*")) &&
          (cur = lastChangeEvent(hist, hist.lastOp == opId))) {
        // Merge this change into the last event
        last = lst(cur.changes);
        if (cmp(change.from, change.to) == 0 && cmp(change.from, last.to) == 0) {
          // Optimized case for simple insertion -- don't want to add
          // new changesets for every character typed
          last.to = changeEnd(change);
        } else {
          // Add new sub-event
          cur.changes.push(historyChangeFromChange(doc, change));
        }
      } else {
        // Can not be merged, start a new event.
        var before = lst(hist.done);
        if (!before || !before.ranges)
          { pushSelectionToHistory(doc.sel, hist.done); }
        cur = {changes: [historyChangeFromChange(doc, change)],
               generation: hist.generation};
        hist.done.push(cur);
        while (hist.done.length > hist.undoDepth) {
          hist.done.shift();
          if (!hist.done[0].ranges) { hist.done.shift(); }
        }
      }
      hist.done.push(selAfter);
      hist.generation = ++hist.maxGeneration;
      hist.lastModTime = hist.lastSelTime = time;
      hist.lastOp = hist.lastSelOp = opId;
      hist.lastOrigin = hist.lastSelOrigin = change.origin;

      if (!last) { signal(doc, "historyAdded"); }
    }

    function selectionEventCanBeMerged(doc, origin, prev, sel) {
      var ch = origin.charAt(0);
      return ch == "*" ||
        ch == "+" &&
        prev.ranges.length == sel.ranges.length &&
        prev.somethingSelected() == sel.somethingSelected() &&
        new Date - doc.history.lastSelTime <= (doc.cm ? doc.cm.options.historyEventDelay : 500)
    }

    // Called whenever the selection changes, sets the new selection as
    // the pending selection in the history, and pushes the old pending
    // selection into the 'done' array when it was significantly
    // different (in number of selected ranges, emptiness, or time).
    function addSelectionToHistory(doc, sel, opId, options) {
      var hist = doc.history, origin = options && options.origin;

      // A new event is started when the previous origin does not match
      // the current, or the origins don't allow matching. Origins
      // starting with * are always merged, those starting with + are
      // merged when similar and close together in time.
      if (opId == hist.lastSelOp ||
          (origin && hist.lastSelOrigin == origin &&
           (hist.lastModTime == hist.lastSelTime && hist.lastOrigin == origin ||
            selectionEventCanBeMerged(doc, origin, lst(hist.done), sel))))
        { hist.done[hist.done.length - 1] = sel; }
      else
        { pushSelectionToHistory(sel, hist.done); }

      hist.lastSelTime = +new Date;
      hist.lastSelOrigin = origin;
      hist.lastSelOp = opId;
      if (options && options.clearRedo !== false)
        { clearSelectionEvents(hist.undone); }
    }

    function pushSelectionToHistory(sel, dest) {
      var top = lst(dest);
      if (!(top && top.ranges && top.equals(sel)))
        { dest.push(sel); }
    }

    // Used to store marked span information in the history.
    function attachLocalSpans(doc, change, from, to) {
      var existing = change["spans_" + doc.id], n = 0;
      doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function (line) {
        if (line.markedSpans)
          { (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans; }
        ++n;
      });
    }

    // When un/re-doing restores text containing marked spans, those
    // that have been explicitly cleared should not be restored.
    function removeClearedSpans(spans) {
      if (!spans) { return null }
      var out;
      for (var i = 0; i < spans.length; ++i) {
        if (spans[i].marker.explicitlyCleared) { if (!out) { out = spans.slice(0, i); } }
        else if (out) { out.push(spans[i]); }
      }
      return !out ? spans : out.length ? out : null
    }

    // Retrieve and filter the old marked spans stored in a change event.
    function getOldSpans(doc, change) {
      var found = change["spans_" + doc.id];
      if (!found) { return null }
      var nw = [];
      for (var i = 0; i < change.text.length; ++i)
        { nw.push(removeClearedSpans(found[i])); }
      return nw
    }

    // Used for un/re-doing changes from the history. Combines the
    // result of computing the existing spans with the set of spans that
    // existed in the history (so that deleting around a span and then
    // undoing brings back the span).
    function mergeOldSpans(doc, change) {
      var old = getOldSpans(doc, change);
      var stretched = stretchSpansOverChange(doc, change);
      if (!old) { return stretched }
      if (!stretched) { return old }

      for (var i = 0; i < old.length; ++i) {
        var oldCur = old[i], stretchCur = stretched[i];
        if (oldCur && stretchCur) {
          spans: for (var j = 0; j < stretchCur.length; ++j) {
            var span = stretchCur[j];
            for (var k = 0; k < oldCur.length; ++k)
              { if (oldCur[k].marker == span.marker) { continue spans } }
            oldCur.push(span);
          }
        } else if (stretchCur) {
          old[i] = stretchCur;
        }
      }
      return old
    }

    // Used both to provide a JSON-safe object in .getHistory, and, when
    // detaching a document, to split the history in two
    function copyHistoryArray(events, newGroup, instantiateSel) {
      var copy = [];
      for (var i = 0; i < events.length; ++i) {
        var event = events[i];
        if (event.ranges) {
          copy.push(instantiateSel ? Selection.prototype.deepCopy.call(event) : event);
          continue
        }
        var changes = event.changes, newChanges = [];
        copy.push({changes: newChanges});
        for (var j = 0; j < changes.length; ++j) {
          var change = changes[j], m = (void 0);
          newChanges.push({from: change.from, to: change.to, text: change.text});
          if (newGroup) { for (var prop in change) { if (m = prop.match(/^spans_(\d+)$/)) {
            if (indexOf(newGroup, Number(m[1])) > -1) {
              lst(newChanges)[prop] = change[prop];
              delete change[prop];
            }
          } } }
        }
      }
      return copy
    }

    // The 'scroll' parameter given to many of these indicated whether
    // the new cursor position should be scrolled into view after
    // modifying the selection.

    // If shift is held or the extend flag is set, extends a range to
    // include a given position (and optionally a second position).
    // Otherwise, simply returns the range between the given positions.
    // Used for cursor motion and such.
    function extendRange(range, head, other, extend) {
      if (extend) {
        var anchor = range.anchor;
        if (other) {
          var posBefore = cmp(head, anchor) < 0;
          if (posBefore != (cmp(other, anchor) < 0)) {
            anchor = head;
            head = other;
          } else if (posBefore != (cmp(head, other) < 0)) {
            head = other;
          }
        }
        return new Range(anchor, head)
      } else {
        return new Range(other || head, head)
      }
    }

    // Extend the primary selection range, discard the rest.
    function extendSelection(doc, head, other, options, extend) {
      if (extend == null) { extend = doc.cm && (doc.cm.display.shift || doc.extend); }
      setSelection(doc, new Selection([extendRange(doc.sel.primary(), head, other, extend)], 0), options);
    }

    // Extend all selections (pos is an array of selections with length
    // equal the number of selections)
    function extendSelections(doc, heads, options) {
      var out = [];
      var extend = doc.cm && (doc.cm.display.shift || doc.extend);
      for (var i = 0; i < doc.sel.ranges.length; i++)
        { out[i] = extendRange(doc.sel.ranges[i], heads[i], null, extend); }
      var newSel = normalizeSelection(doc.cm, out, doc.sel.primIndex);
      setSelection(doc, newSel, options);
    }

    // Updates a single range in the selection.
    function replaceOneSelection(doc, i, range, options) {
      var ranges = doc.sel.ranges.slice(0);
      ranges[i] = range;
      setSelection(doc, normalizeSelection(doc.cm, ranges, doc.sel.primIndex), options);
    }

    // Reset the selection to a single range.
    function setSimpleSelection(doc, anchor, head, options) {
      setSelection(doc, simpleSelection(anchor, head), options);
    }

    // Give beforeSelectionChange handlers a change to influence a
    // selection update.
    function filterSelectionChange(doc, sel, options) {
      var obj = {
        ranges: sel.ranges,
        update: function(ranges) {
          var this$1 = this;

          this.ranges = [];
          for (var i = 0; i < ranges.length; i++)
            { this$1.ranges[i] = new Range(clipPos(doc, ranges[i].anchor),
                                       clipPos(doc, ranges[i].head)); }
        },
        origin: options && options.origin
      };
      signal(doc, "beforeSelectionChange", doc, obj);
      if (doc.cm) { signal(doc.cm, "beforeSelectionChange", doc.cm, obj); }
      if (obj.ranges != sel.ranges) { return normalizeSelection(doc.cm, obj.ranges, obj.ranges.length - 1) }
      else { return sel }
    }

    function setSelectionReplaceHistory(doc, sel, options) {
      var done = doc.history.done, last = lst(done);
      if (last && last.ranges) {
        done[done.length - 1] = sel;
        setSelectionNoUndo(doc, sel, options);
      } else {
        setSelection(doc, sel, options);
      }
    }

    // Set a new selection.
    function setSelection(doc, sel, options) {
      setSelectionNoUndo(doc, sel, options);
      addSelectionToHistory(doc, doc.sel, doc.cm ? doc.cm.curOp.id : NaN, options);
    }

    function setSelectionNoUndo(doc, sel, options) {
      if (hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange"))
        { sel = filterSelectionChange(doc, sel, options); }

      var bias = options && options.bias ||
        (cmp(sel.primary().head, doc.sel.primary().head) < 0 ? -1 : 1);
      setSelectionInner(doc, skipAtomicInSelection(doc, sel, bias, true));

      if (!(options && options.scroll === false) && doc.cm)
        { ensureCursorVisible(doc.cm); }
    }

    function setSelectionInner(doc, sel) {
      if (sel.equals(doc.sel)) { return }

      doc.sel = sel;

      if (doc.cm) {
        doc.cm.curOp.updateInput = 1;
        doc.cm.curOp.selectionChanged = true;
        signalCursorActivity(doc.cm);
      }
      signalLater(doc, "cursorActivity", doc);
    }

    // Verify that the selection does not partially select any atomic
    // marked ranges.
    function reCheckSelection(doc) {
      setSelectionInner(doc, skipAtomicInSelection(doc, doc.sel, null, false));
    }

    // Return a selection that does not partially select any atomic
    // ranges.
    function skipAtomicInSelection(doc, sel, bias, mayClear) {
      var out;
      for (var i = 0; i < sel.ranges.length; i++) {
        var range = sel.ranges[i];
        var old = sel.ranges.length == doc.sel.ranges.length && doc.sel.ranges[i];
        var newAnchor = skipAtomic(doc, range.anchor, old && old.anchor, bias, mayClear);
        var newHead = skipAtomic(doc, range.head, old && old.head, bias, mayClear);
        if (out || newAnchor != range.anchor || newHead != range.head) {
          if (!out) { out = sel.ranges.slice(0, i); }
          out[i] = new Range(newAnchor, newHead);
        }
      }
      return out ? normalizeSelection(doc.cm, out, sel.primIndex) : sel
    }

    function skipAtomicInner(doc, pos, oldPos, dir, mayClear) {
      var line = getLine(doc, pos.line);
      if (line.markedSpans) { for (var i = 0; i < line.markedSpans.length; ++i) {
        var sp = line.markedSpans[i], m = sp.marker;

        // Determine if we should prevent the cursor being placed to the left/right of an atomic marker
        // Historically this was determined using the inclusiveLeft/Right option, but the new way to control it
        // is with selectLeft/Right
        var preventCursorLeft = ("selectLeft" in m) ? !m.selectLeft : m.inclusiveLeft;
        var preventCursorRight = ("selectRight" in m) ? !m.selectRight : m.inclusiveRight;

        if ((sp.from == null || (preventCursorLeft ? sp.from <= pos.ch : sp.from < pos.ch)) &&
            (sp.to == null || (preventCursorRight ? sp.to >= pos.ch : sp.to > pos.ch))) {
          if (mayClear) {
            signal(m, "beforeCursorEnter");
            if (m.explicitlyCleared) {
              if (!line.markedSpans) { break }
              else {--i; continue}
            }
          }
          if (!m.atomic) { continue }

          if (oldPos) {
            var near = m.find(dir < 0 ? 1 : -1), diff = (void 0);
            if (dir < 0 ? preventCursorRight : preventCursorLeft)
              { near = movePos(doc, near, -dir, near && near.line == pos.line ? line : null); }
            if (near && near.line == pos.line && (diff = cmp(near, oldPos)) && (dir < 0 ? diff < 0 : diff > 0))
              { return skipAtomicInner(doc, near, pos, dir, mayClear) }
          }

          var far = m.find(dir < 0 ? -1 : 1);
          if (dir < 0 ? preventCursorLeft : preventCursorRight)
            { far = movePos(doc, far, dir, far.line == pos.line ? line : null); }
          return far ? skipAtomicInner(doc, far, pos, dir, mayClear) : null
        }
      } }
      return pos
    }

    // Ensure a given position is not inside an atomic range.
    function skipAtomic(doc, pos, oldPos, bias, mayClear) {
      var dir = bias || 1;
      var found = skipAtomicInner(doc, pos, oldPos, dir, mayClear) ||
          (!mayClear && skipAtomicInner(doc, pos, oldPos, dir, true)) ||
          skipAtomicInner(doc, pos, oldPos, -dir, mayClear) ||
          (!mayClear && skipAtomicInner(doc, pos, oldPos, -dir, true));
      if (!found) {
        doc.cantEdit = true;
        return Pos(doc.first, 0)
      }
      return found
    }

    function movePos(doc, pos, dir, line) {
      if (dir < 0 && pos.ch == 0) {
        if (pos.line > doc.first) { return clipPos(doc, Pos(pos.line - 1)) }
        else { return null }
      } else if (dir > 0 && pos.ch == (line || getLine(doc, pos.line)).text.length) {
        if (pos.line < doc.first + doc.size - 1) { return Pos(pos.line + 1, 0) }
        else { return null }
      } else {
        return new Pos(pos.line, pos.ch + dir)
      }
    }

    function selectAll(cm) {
      cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()), sel_dontScroll);
    }

    // UPDATING

    // Allow "beforeChange" event handlers to influence a change
    function filterChange(doc, change, update) {
      var obj = {
        canceled: false,
        from: change.from,
        to: change.to,
        text: change.text,
        origin: change.origin,
        cancel: function () { return obj.canceled = true; }
      };
      if (update) { obj.update = function (from, to, text, origin) {
        if (from) { obj.from = clipPos(doc, from); }
        if (to) { obj.to = clipPos(doc, to); }
        if (text) { obj.text = text; }
        if (origin !== undefined) { obj.origin = origin; }
      }; }
      signal(doc, "beforeChange", doc, obj);
      if (doc.cm) { signal(doc.cm, "beforeChange", doc.cm, obj); }

      if (obj.canceled) {
        if (doc.cm) { doc.cm.curOp.updateInput = 2; }
        return null
      }
      return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin}
    }

    // Apply a change to a document, and add it to the document's
    // history, and propagating it to all linked documents.
    function makeChange(doc, change, ignoreReadOnly) {
      if (doc.cm) {
        if (!doc.cm.curOp) { return operation(doc.cm, makeChange)(doc, change, ignoreReadOnly) }
        if (doc.cm.state.suppressEdits) { return }
      }

      if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
        change = filterChange(doc, change, true);
        if (!change) { return }
      }

      // Possibly split or suppress the update based on the presence
      // of read-only spans in its range.
      var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
      if (split) {
        for (var i = split.length - 1; i >= 0; --i)
          { makeChangeInner(doc, {from: split[i].from, to: split[i].to, text: i ? [""] : change.text, origin: change.origin}); }
      } else {
        makeChangeInner(doc, change);
      }
    }

    function makeChangeInner(doc, change) {
      if (change.text.length == 1 && change.text[0] == "" && cmp(change.from, change.to) == 0) { return }
      var selAfter = computeSelAfterChange(doc, change);
      addChangeToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

      makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
      var rebased = [];

      linkedDocs(doc, function (doc, sharedHist) {
        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
          rebaseHist(doc.history, change);
          rebased.push(doc.history);
        }
        makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
      });
    }

    // Revert a change stored in a document's history.
    function makeChangeFromHistory(doc, type, allowSelectionOnly) {
      var suppress = doc.cm && doc.cm.state.suppressEdits;
      if (suppress && !allowSelectionOnly) { return }

      var hist = doc.history, event, selAfter = doc.sel;
      var source = type == "undo" ? hist.done : hist.undone, dest = type == "undo" ? hist.undone : hist.done;

      // Verify that there is a useable event (so that ctrl-z won't
      // needlessly clear selection events)
      var i = 0;
      for (; i < source.length; i++) {
        event = source[i];
        if (allowSelectionOnly ? event.ranges && !event.equals(doc.sel) : !event.ranges)
          { break }
      }
      if (i == source.length) { return }
      hist.lastOrigin = hist.lastSelOrigin = null;

      for (;;) {
        event = source.pop();
        if (event.ranges) {
          pushSelectionToHistory(event, dest);
          if (allowSelectionOnly && !event.equals(doc.sel)) {
            setSelection(doc, event, {clearRedo: false});
            return
          }
          selAfter = event;
        } else if (suppress) {
          source.push(event);
          return
        } else { break }
      }

      // Build up a reverse change object to add to the opposite history
      // stack (redo when undoing, and vice versa).
      var antiChanges = [];
      pushSelectionToHistory(selAfter, dest);
      dest.push({changes: antiChanges, generation: hist.generation});
      hist.generation = event.generation || ++hist.maxGeneration;

      var filter = hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange");

      var loop = function ( i ) {
        var change = event.changes[i];
        change.origin = type;
        if (filter && !filterChange(doc, change, false)) {
          source.length = 0;
          return {}
        }

        antiChanges.push(historyChangeFromChange(doc, change));

        var after = i ? computeSelAfterChange(doc, change) : lst(source);
        makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
        if (!i && doc.cm) { doc.cm.scrollIntoView({from: change.from, to: changeEnd(change)}); }
        var rebased = [];

        // Propagate to the linked documents
        linkedDocs(doc, function (doc, sharedHist) {
          if (!sharedHist && indexOf(rebased, doc.history) == -1) {
            rebaseHist(doc.history, change);
            rebased.push(doc.history);
          }
          makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
        });
      };

      for (var i$1 = event.changes.length - 1; i$1 >= 0; --i$1) {
        var returned = loop( i$1 );

        if ( returned ) return returned.v;
      }
    }

    // Sub-views need their line numbers shifted when text is added
    // above or below them in the parent document.
    function shiftDoc(doc, distance) {
      if (distance == 0) { return }
      doc.first += distance;
      doc.sel = new Selection(map(doc.sel.ranges, function (range) { return new Range(
        Pos(range.anchor.line + distance, range.anchor.ch),
        Pos(range.head.line + distance, range.head.ch)
      ); }), doc.sel.primIndex);
      if (doc.cm) {
        regChange(doc.cm, doc.first, doc.first - distance, distance);
        for (var d = doc.cm.display, l = d.viewFrom; l < d.viewTo; l++)
          { regLineChange(doc.cm, l, "gutter"); }
      }
    }

    // More lower-level change function, handling only a single document
    // (not linked ones).
    function makeChangeSingleDoc(doc, change, selAfter, spans) {
      if (doc.cm && !doc.cm.curOp)
        { return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans) }

      if (change.to.line < doc.first) {
        shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
        return
      }
      if (change.from.line > doc.lastLine()) { return }

      // Clip the change to the size of this doc
      if (change.from.line < doc.first) {
        var shift = change.text.length - 1 - (doc.first - change.from.line);
        shiftDoc(doc, shift);
        change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
                  text: [lst(change.text)], origin: change.origin};
      }
      var last = doc.lastLine();
      if (change.to.line > last) {
        change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
                  text: [change.text[0]], origin: change.origin};
      }

      change.removed = getBetween(doc, change.from, change.to);

      if (!selAfter) { selAfter = computeSelAfterChange(doc, change); }
      if (doc.cm) { makeChangeSingleDocInEditor(doc.cm, change, spans); }
      else { updateDoc(doc, change, spans); }
      setSelectionNoUndo(doc, selAfter, sel_dontScroll);

      if (doc.cantEdit && skipAtomic(doc, Pos(doc.firstLine(), 0)))
        { doc.cantEdit = false; }
    }

    // Handle the interaction of a change to a document with the editor
    // that this document is part of.
    function makeChangeSingleDocInEditor(cm, change, spans) {
      var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

      var recomputeMaxLength = false, checkWidthStart = from.line;
      if (!cm.options.lineWrapping) {
        checkWidthStart = lineNo(visualLine(getLine(doc, from.line)));
        doc.iter(checkWidthStart, to.line + 1, function (line) {
          if (line == display.maxLine) {
            recomputeMaxLength = true;
            return true
          }
        });
      }

      if (doc.sel.contains(change.from, change.to) > -1)
        { signalCursorActivity(cm); }

      updateDoc(doc, change, spans, estimateHeight(cm));

      if (!cm.options.lineWrapping) {
        doc.iter(checkWidthStart, from.line + change.text.length, function (line) {
          var len = lineLength(line);
          if (len > display.maxLineLength) {
            display.maxLine = line;
            display.maxLineLength = len;
            display.maxLineChanged = true;
            recomputeMaxLength = false;
          }
        });
        if (recomputeMaxLength) { cm.curOp.updateMaxLine = true; }
      }

      retreatFrontier(doc, from.line);
      startWorker(cm, 400);

      var lendiff = change.text.length - (to.line - from.line) - 1;
      // Remember that these lines changed, for updating the display
      if (change.full)
        { regChange(cm); }
      else if (from.line == to.line && change.text.length == 1 && !isWholeLineUpdate(cm.doc, change))
        { regLineChange(cm, from.line, "text"); }
      else
        { regChange(cm, from.line, to.line + 1, lendiff); }

      var changesHandler = hasHandler(cm, "changes"), changeHandler = hasHandler(cm, "change");
      if (changeHandler || changesHandler) {
        var obj = {
          from: from, to: to,
          text: change.text,
          removed: change.removed,
          origin: change.origin
        };
        if (changeHandler) { signalLater(cm, "change", cm, obj); }
        if (changesHandler) { (cm.curOp.changeObjs || (cm.curOp.changeObjs = [])).push(obj); }
      }
      cm.display.selForContextMenu = null;
    }

    function replaceRange(doc, code, from, to, origin) {
      var assign;

      if (!to) { to = from; }
      if (cmp(to, from) < 0) { (assign = [to, from], from = assign[0], to = assign[1]); }
      if (typeof code == "string") { code = doc.splitLines(code); }
      makeChange(doc, {from: from, to: to, text: code, origin: origin});
    }

    // Rebasing/resetting history to deal with externally-sourced changes

    function rebaseHistSelSingle(pos, from, to, diff) {
      if (to < pos.line) {
        pos.line += diff;
      } else if (from < pos.line) {
        pos.line = from;
        pos.ch = 0;
      }
    }

    // Tries to rebase an array of history events given a change in the
    // document. If the change touches the same lines as the event, the
    // event, and everything 'behind' it, is discarded. If the change is
    // before the event, the event's positions are updated. Uses a
    // copy-on-write scheme for the positions, to avoid having to
    // reallocate them all on every rebase, but also avoid problems with
    // shared position objects being unsafely updated.
    function rebaseHistArray(array, from, to, diff) {
      for (var i = 0; i < array.length; ++i) {
        var sub = array[i], ok = true;
        if (sub.ranges) {
          if (!sub.copied) { sub = array[i] = sub.deepCopy(); sub.copied = true; }
          for (var j = 0; j < sub.ranges.length; j++) {
            rebaseHistSelSingle(sub.ranges[j].anchor, from, to, diff);
            rebaseHistSelSingle(sub.ranges[j].head, from, to, diff);
          }
          continue
        }
        for (var j$1 = 0; j$1 < sub.changes.length; ++j$1) {
          var cur = sub.changes[j$1];
          if (to < cur.from.line) {
            cur.from = Pos(cur.from.line + diff, cur.from.ch);
            cur.to = Pos(cur.to.line + diff, cur.to.ch);
          } else if (from <= cur.to.line) {
            ok = false;
            break
          }
        }
        if (!ok) {
          array.splice(0, i + 1);
          i = 0;
        }
      }
    }

    function rebaseHist(hist, change) {
      var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
      rebaseHistArray(hist.done, from, to, diff);
      rebaseHistArray(hist.undone, from, to, diff);
    }

    // Utility for applying a change to a line by handle or number,
    // returning the number and optionally registering the line as
    // changed.
    function changeLine(doc, handle, changeType, op) {
      var no = handle, line = handle;
      if (typeof handle == "number") { line = getLine(doc, clipLine(doc, handle)); }
      else { no = lineNo(handle); }
      if (no == null) { return null }
      if (op(line, no) && doc.cm) { regLineChange(doc.cm, no, changeType); }
      return line
    }

    // The document is represented as a BTree consisting of leaves, with
    // chunk of lines in them, and branches, with up to ten leaves or
    // other branch nodes below them. The top node is always a branch
    // node, and is the document object itself (meaning it has
    // additional methods and properties).
    //
    // All nodes have parent links. The tree is used both to go from
    // line numbers to line objects, and to go from objects to numbers.
    // It also indexes by height, and is used to convert between height
    // and line object, and to find the total height of the document.
    //
    // See also http://marijnhaverbeke.nl/blog/codemirror-line-tree.html

    function LeafChunk(lines) {
      var this$1 = this;

      this.lines = lines;
      this.parent = null;
      var height = 0;
      for (var i = 0; i < lines.length; ++i) {
        lines[i].parent = this$1;
        height += lines[i].height;
      }
      this.height = height;
    }

    LeafChunk.prototype = {
      chunkSize: function() { return this.lines.length },

      // Remove the n lines at offset 'at'.
      removeInner: function(at, n) {
        var this$1 = this;

        for (var i = at, e = at + n; i < e; ++i) {
          var line = this$1.lines[i];
          this$1.height -= line.height;
          cleanUpLine(line);
          signalLater(line, "delete");
        }
        this.lines.splice(at, n);
      },

      // Helper used to collapse a small branch into a single leaf.
      collapse: function(lines) {
        lines.push.apply(lines, this.lines);
      },

      // Insert the given array of lines at offset 'at', count them as
      // having the given height.
      insertInner: function(at, lines, height) {
        var this$1 = this;

        this.height += height;
        this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
        for (var i = 0; i < lines.length; ++i) { lines[i].parent = this$1; }
      },

      // Used to iterate over a part of the tree.
      iterN: function(at, n, op) {
        var this$1 = this;

        for (var e = at + n; at < e; ++at)
          { if (op(this$1.lines[at])) { return true } }
      }
    };

    function BranchChunk(children) {
      var this$1 = this;

      this.children = children;
      var size = 0, height = 0;
      for (var i = 0; i < children.length; ++i) {
        var ch = children[i];
        size += ch.chunkSize(); height += ch.height;
        ch.parent = this$1;
      }
      this.size = size;
      this.height = height;
      this.parent = null;
    }

    BranchChunk.prototype = {
      chunkSize: function() { return this.size },

      removeInner: function(at, n) {
        var this$1 = this;

        this.size -= n;
        for (var i = 0; i < this.children.length; ++i) {
          var child = this$1.children[i], sz = child.chunkSize();
          if (at < sz) {
            var rm = Math.min(n, sz - at), oldHeight = child.height;
            child.removeInner(at, rm);
            this$1.height -= oldHeight - child.height;
            if (sz == rm) { this$1.children.splice(i--, 1); child.parent = null; }
            if ((n -= rm) == 0) { break }
            at = 0;
          } else { at -= sz; }
        }
        // If the result is smaller than 25 lines, ensure that it is a
        // single leaf node.
        if (this.size - n < 25 &&
            (this.children.length > 1 || !(this.children[0] instanceof LeafChunk))) {
          var lines = [];
          this.collapse(lines);
          this.children = [new LeafChunk(lines)];
          this.children[0].parent = this;
        }
      },

      collapse: function(lines) {
        var this$1 = this;

        for (var i = 0; i < this.children.length; ++i) { this$1.children[i].collapse(lines); }
      },

      insertInner: function(at, lines, height) {
        var this$1 = this;

        this.size += lines.length;
        this.height += height;
        for (var i = 0; i < this.children.length; ++i) {
          var child = this$1.children[i], sz = child.chunkSize();
          if (at <= sz) {
            child.insertInner(at, lines, height);
            if (child.lines && child.lines.length > 50) {
              // To avoid memory thrashing when child.lines is huge (e.g. first view of a large file), it's never spliced.
              // Instead, small slices are taken. They're taken in order because sequential memory accesses are fastest.
              var remaining = child.lines.length % 25 + 25;
              for (var pos = remaining; pos < child.lines.length;) {
                var leaf = new LeafChunk(child.lines.slice(pos, pos += 25));
                child.height -= leaf.height;
                this$1.children.splice(++i, 0, leaf);
                leaf.parent = this$1;
              }
              child.lines = child.lines.slice(0, remaining);
              this$1.maybeSpill();
            }
            break
          }
          at -= sz;
        }
      },

      // When a node has grown, check whether it should be split.
      maybeSpill: function() {
        if (this.children.length <= 10) { return }
        var me = this;
        do {
          var spilled = me.children.splice(me.children.length - 5, 5);
          var sibling = new BranchChunk(spilled);
          if (!me.parent) { // Become the parent node
            var copy = new BranchChunk(me.children);
            copy.parent = me;
            me.children = [copy, sibling];
            me = copy;
         } else {
            me.size -= sibling.size;
            me.height -= sibling.height;
            var myIndex = indexOf(me.parent.children, me);
            me.parent.children.splice(myIndex + 1, 0, sibling);
          }
          sibling.parent = me.parent;
        } while (me.children.length > 10)
        me.parent.maybeSpill();
      },

      iterN: function(at, n, op) {
        var this$1 = this;

        for (var i = 0; i < this.children.length; ++i) {
          var child = this$1.children[i], sz = child.chunkSize();
          if (at < sz) {
            var used = Math.min(n, sz - at);
            if (child.iterN(at, used, op)) { return true }
            if ((n -= used) == 0) { break }
            at = 0;
          } else { at -= sz; }
        }
      }
    };

    // Line widgets are block elements displayed above or below a line.

    var LineWidget = function(doc, node, options) {
      var this$1 = this;

      if (options) { for (var opt in options) { if (options.hasOwnProperty(opt))
        { this$1[opt] = options[opt]; } } }
      this.doc = doc;
      this.node = node;
    };

    LineWidget.prototype.clear = function () {
        var this$1 = this;

      var cm = this.doc.cm, ws = this.line.widgets, line = this.line, no = lineNo(line);
      if (no == null || !ws) { return }
      for (var i = 0; i < ws.length; ++i) { if (ws[i] == this$1) { ws.splice(i--, 1); } }
      if (!ws.length) { line.widgets = null; }
      var height = widgetHeight(this);
      updateLineHeight(line, Math.max(0, line.height - height));
      if (cm) {
        runInOp(cm, function () {
          adjustScrollWhenAboveVisible(cm, line, -height);
          regLineChange(cm, no, "widget");
        });
        signalLater(cm, "lineWidgetCleared", cm, this, no);
      }
    };

    LineWidget.prototype.changed = function () {
        var this$1 = this;

      var oldH = this.height, cm = this.doc.cm, line = this.line;
      this.height = null;
      var diff = widgetHeight(this) - oldH;
      if (!diff) { return }
      if (!lineIsHidden(this.doc, line)) { updateLineHeight(line, line.height + diff); }
      if (cm) {
        runInOp(cm, function () {
          cm.curOp.forceUpdate = true;
          adjustScrollWhenAboveVisible(cm, line, diff);
          signalLater(cm, "lineWidgetChanged", cm, this$1, lineNo(line));
        });
      }
    };
    eventMixin(LineWidget);

    function adjustScrollWhenAboveVisible(cm, line, diff) {
      if (heightAtLine(line) < ((cm.curOp && cm.curOp.scrollTop) || cm.doc.scrollTop))
        { addToScrollTop(cm, diff); }
    }

    function addLineWidget(doc, handle, node, options) {
      var widget = new LineWidget(doc, node, options);
      var cm = doc.cm;
      if (cm && widget.noHScroll) { cm.display.alignWidgets = true; }
      changeLine(doc, handle, "widget", function (line) {
        var widgets = line.widgets || (line.widgets = []);
        if (widget.insertAt == null) { widgets.push(widget); }
        else { widgets.splice(Math.min(widgets.length - 1, Math.max(0, widget.insertAt)), 0, widget); }
        widget.line = line;
        if (cm && !lineIsHidden(doc, line)) {
          var aboveVisible = heightAtLine(line) < doc.scrollTop;
          updateLineHeight(line, line.height + widgetHeight(widget));
          if (aboveVisible) { addToScrollTop(cm, widget.height); }
          cm.curOp.forceUpdate = true;
        }
        return true
      });
      if (cm) { signalLater(cm, "lineWidgetAdded", cm, widget, typeof handle == "number" ? handle : lineNo(handle)); }
      return widget
    }

    // TEXTMARKERS

    // Created with markText and setBookmark methods. A TextMarker is a
    // handle that can be used to clear or find a marked position in the
    // document. Line objects hold arrays (markedSpans) containing
    // {from, to, marker} object pointing to such marker objects, and
    // indicating that such a marker is present on that line. Multiple
    // lines may point to the same marker when it spans across lines.
    // The spans will have null for their from/to properties when the
    // marker continues beyond the start/end of the line. Markers have
    // links back to the lines they currently touch.

    // Collapsed markers have unique ids, in order to be able to order
    // them, which is needed for uniquely determining an outer marker
    // when they overlap (they may nest, but not partially overlap).
    var nextMarkerId = 0;

    var TextMarker = function(doc, type) {
      this.lines = [];
      this.type = type;
      this.doc = doc;
      this.id = ++nextMarkerId;
    };

    // Clear the marker.
    TextMarker.prototype.clear = function () {
        var this$1 = this;

      if (this.explicitlyCleared) { return }
      var cm = this.doc.cm, withOp = cm && !cm.curOp;
      if (withOp) { startOperation(cm); }
      if (hasHandler(this, "clear")) {
        var found = this.find();
        if (found) { signalLater(this, "clear", found.from, found.to); }
      }
      var min = null, max = null;
      for (var i = 0; i < this.lines.length; ++i) {
        var line = this$1.lines[i];
        var span = getMarkedSpanFor(line.markedSpans, this$1);
        if (cm && !this$1.collapsed) { regLineChange(cm, lineNo(line), "text"); }
        else if (cm) {
          if (span.to != null) { max = lineNo(line); }
          if (span.from != null) { min = lineNo(line); }
        }
        line.markedSpans = removeMarkedSpan(line.markedSpans, span);
        if (span.from == null && this$1.collapsed && !lineIsHidden(this$1.doc, line) && cm)
          { updateLineHeight(line, textHeight(cm.display)); }
      }
      if (cm && this.collapsed && !cm.options.lineWrapping) { for (var i$1 = 0; i$1 < this.lines.length; ++i$1) {
        var visual = visualLine(this$1.lines[i$1]), len = lineLength(visual);
        if (len > cm.display.maxLineLength) {
          cm.display.maxLine = visual;
          cm.display.maxLineLength = len;
          cm.display.maxLineChanged = true;
        }
      } }

      if (min != null && cm && this.collapsed) { regChange(cm, min, max + 1); }
      this.lines.length = 0;
      this.explicitlyCleared = true;
      if (this.atomic && this.doc.cantEdit) {
        this.doc.cantEdit = false;
        if (cm) { reCheckSelection(cm.doc); }
      }
      if (cm) { signalLater(cm, "markerCleared", cm, this, min, max); }
      if (withOp) { endOperation(cm); }
      if (this.parent) { this.parent.clear(); }
    };

    // Find the position of the marker in the document. Returns a {from,
    // to} object by default. Side can be passed to get a specific side
    // -- 0 (both), -1 (left), or 1 (right). When lineObj is true, the
    // Pos objects returned contain a line object, rather than a line
    // number (used to prevent looking up the same line twice).
    TextMarker.prototype.find = function (side, lineObj) {
        var this$1 = this;

      if (side == null && this.type == "bookmark") { side = 1; }
      var from, to;
      for (var i = 0; i < this.lines.length; ++i) {
        var line = this$1.lines[i];
        var span = getMarkedSpanFor(line.markedSpans, this$1);
        if (span.from != null) {
          from = Pos(lineObj ? line : lineNo(line), span.from);
          if (side == -1) { return from }
        }
        if (span.to != null) {
          to = Pos(lineObj ? line : lineNo(line), span.to);
          if (side == 1) { return to }
        }
      }
      return from && {from: from, to: to}
    };

    // Signals that the marker's widget changed, and surrounding layout
    // should be recomputed.
    TextMarker.prototype.changed = function () {
        var this$1 = this;

      var pos = this.find(-1, true), widget = this, cm = this.doc.cm;
      if (!pos || !cm) { return }
      runInOp(cm, function () {
        var line = pos.line, lineN = lineNo(pos.line);
        var view = findViewForLine(cm, lineN);
        if (view) {
          clearLineMeasurementCacheFor(view);
          cm.curOp.selectionChanged = cm.curOp.forceUpdate = true;
        }
        cm.curOp.updateMaxLine = true;
        if (!lineIsHidden(widget.doc, line) && widget.height != null) {
          var oldHeight = widget.height;
          widget.height = null;
          var dHeight = widgetHeight(widget) - oldHeight;
          if (dHeight)
            { updateLineHeight(line, line.height + dHeight); }
        }
        signalLater(cm, "markerChanged", cm, this$1);
      });
    };

    TextMarker.prototype.attachLine = function (line) {
      if (!this.lines.length && this.doc.cm) {
        var op = this.doc.cm.curOp;
        if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
          { (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this); }
      }
      this.lines.push(line);
    };

    TextMarker.prototype.detachLine = function (line) {
      this.lines.splice(indexOf(this.lines, line), 1);
      if (!this.lines.length && this.doc.cm) {
        var op = this.doc.cm.curOp
        ;(op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
      }
    };
    eventMixin(TextMarker);

    // Create a marker, wire it up to the right lines, and
    function markText(doc, from, to, options, type) {
      // Shared markers (across linked documents) are handled separately
      // (markTextShared will call out to this again, once per
      // document).
      if (options && options.shared) { return markTextShared(doc, from, to, options, type) }
      // Ensure we are in an operation.
      if (doc.cm && !doc.cm.curOp) { return operation(doc.cm, markText)(doc, from, to, options, type) }

      var marker = new TextMarker(doc, type), diff = cmp(from, to);
      if (options) { copyObj(options, marker, false); }
      // Don't connect empty markers unless clearWhenEmpty is false
      if (diff > 0 || diff == 0 && marker.clearWhenEmpty !== false)
        { return marker }
      if (marker.replacedWith) {
        // Showing up as a widget implies collapsed (widget replaces text)
        marker.collapsed = true;
        marker.widgetNode = eltP("span", [marker.replacedWith], "CodeMirror-widget");
        if (!options.handleMouseEvents) { marker.widgetNode.setAttribute("cm-ignore-events", "true"); }
        if (options.insertLeft) { marker.widgetNode.insertLeft = true; }
      }
      if (marker.collapsed) {
        if (conflictingCollapsedRange(doc, from.line, from, to, marker) ||
            from.line != to.line && conflictingCollapsedRange(doc, to.line, from, to, marker))
          { throw new Error("Inserting collapsed marker partially overlapping an existing one") }
        seeCollapsedSpans();
      }

      if (marker.addToHistory)
        { addChangeToHistory(doc, {from: from, to: to, origin: "markText"}, doc.sel, NaN); }

      var curLine = from.line, cm = doc.cm, updateMaxLine;
      doc.iter(curLine, to.line + 1, function (line) {
        if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(line) == cm.display.maxLine)
          { updateMaxLine = true; }
        if (marker.collapsed && curLine != from.line) { updateLineHeight(line, 0); }
        addMarkedSpan(line, new MarkedSpan(marker,
                                           curLine == from.line ? from.ch : null,
                                           curLine == to.line ? to.ch : null));
        ++curLine;
      });
      // lineIsHidden depends on the presence of the spans, so needs a second pass
      if (marker.collapsed) { doc.iter(from.line, to.line + 1, function (line) {
        if (lineIsHidden(doc, line)) { updateLineHeight(line, 0); }
      }); }

      if (marker.clearOnEnter) { on(marker, "beforeCursorEnter", function () { return marker.clear(); }); }

      if (marker.readOnly) {
        seeReadOnlySpans();
        if (doc.history.done.length || doc.history.undone.length)
          { doc.clearHistory(); }
      }
      if (marker.collapsed) {
        marker.id = ++nextMarkerId;
        marker.atomic = true;
      }
      if (cm) {
        // Sync editor state
        if (updateMaxLine) { cm.curOp.updateMaxLine = true; }
        if (marker.collapsed)
          { regChange(cm, from.line, to.line + 1); }
        else if (marker.className || marker.startStyle || marker.endStyle || marker.css ||
                 marker.attributes || marker.title)
          { for (var i = from.line; i <= to.line; i++) { regLineChange(cm, i, "text"); } }
        if (marker.atomic) { reCheckSelection(cm.doc); }
        signalLater(cm, "markerAdded", cm, marker);
      }
      return marker
    }

    // SHARED TEXTMARKERS

    // A shared marker spans multiple linked documents. It is
    // implemented as a meta-marker-object controlling multiple normal
    // markers.
    var SharedTextMarker = function(markers, primary) {
      var this$1 = this;

      this.markers = markers;
      this.primary = primary;
      for (var i = 0; i < markers.length; ++i)
        { markers[i].parent = this$1; }
    };

    SharedTextMarker.prototype.clear = function () {
        var this$1 = this;

      if (this.explicitlyCleared) { return }
      this.explicitlyCleared = true;
      for (var i = 0; i < this.markers.length; ++i)
        { this$1.markers[i].clear(); }
      signalLater(this, "clear");
    };

    SharedTextMarker.prototype.find = function (side, lineObj) {
      return this.primary.find(side, lineObj)
    };
    eventMixin(SharedTextMarker);

    function markTextShared(doc, from, to, options, type) {
      options = copyObj(options);
      options.shared = false;
      var markers = [markText(doc, from, to, options, type)], primary = markers[0];
      var widget = options.widgetNode;
      linkedDocs(doc, function (doc) {
        if (widget) { options.widgetNode = widget.cloneNode(true); }
        markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
        for (var i = 0; i < doc.linked.length; ++i)
          { if (doc.linked[i].isParent) { return } }
        primary = lst(markers);
      });
      return new SharedTextMarker(markers, primary)
    }

    function findSharedMarkers(doc) {
      return doc.findMarks(Pos(doc.first, 0), doc.clipPos(Pos(doc.lastLine())), function (m) { return m.parent; })
    }

    function copySharedMarkers(doc, markers) {
      for (var i = 0; i < markers.length; i++) {
        var marker = markers[i], pos = marker.find();
        var mFrom = doc.clipPos(pos.from), mTo = doc.clipPos(pos.to);
        if (cmp(mFrom, mTo)) {
          var subMark = markText(doc, mFrom, mTo, marker.primary, marker.primary.type);
          marker.markers.push(subMark);
          subMark.parent = marker;
        }
      }
    }

    function detachSharedMarkers(markers) {
      var loop = function ( i ) {
        var marker = markers[i], linked = [marker.primary.doc];
        linkedDocs(marker.primary.doc, function (d) { return linked.push(d); });
        for (var j = 0; j < marker.markers.length; j++) {
          var subMarker = marker.markers[j];
          if (indexOf(linked, subMarker.doc) == -1) {
            subMarker.parent = null;
            marker.markers.splice(j--, 1);
          }
        }
      };

      for (var i = 0; i < markers.length; i++) loop( i );
    }

    var nextDocId = 0;
    var Doc = function(text, mode, firstLine, lineSep, direction) {
      if (!(this instanceof Doc)) { return new Doc(text, mode, firstLine, lineSep, direction) }
      if (firstLine == null) { firstLine = 0; }

      BranchChunk.call(this, [new LeafChunk([new Line("", null)])]);
      this.first = firstLine;
      this.scrollTop = this.scrollLeft = 0;
      this.cantEdit = false;
      this.cleanGeneration = 1;
      this.modeFrontier = this.highlightFrontier = firstLine;
      var start = Pos(firstLine, 0);
      this.sel = simpleSelection(start);
      this.history = new History(null);
      this.id = ++nextDocId;
      this.modeOption = mode;
      this.lineSep = lineSep;
      this.direction = (direction == "rtl") ? "rtl" : "ltr";
      this.extend = false;

      if (typeof text == "string") { text = this.splitLines(text); }
      updateDoc(this, {from: start, to: start, text: text});
      setSelection(this, simpleSelection(start), sel_dontScroll);
    };

    Doc.prototype = createObj(BranchChunk.prototype, {
      constructor: Doc,
      // Iterate over the document. Supports two forms -- with only one
      // argument, it calls that for each line in the document. With
      // three, it iterates over the range given by the first two (with
      // the second being non-inclusive).
      iter: function(from, to, op) {
        if (op) { this.iterN(from - this.first, to - from, op); }
        else { this.iterN(this.first, this.first + this.size, from); }
      },

      // Non-public interface for adding and removing lines.
      insert: function(at, lines) {
        var height = 0;
        for (var i = 0; i < lines.length; ++i) { height += lines[i].height; }
        this.insertInner(at - this.first, lines, height);
      },
      remove: function(at, n) { this.removeInner(at - this.first, n); },

      // From here, the methods are part of the public interface. Most
      // are also available from CodeMirror (editor) instances.

      getValue: function(lineSep) {
        var lines = getLines(this, this.first, this.first + this.size);
        if (lineSep === false) { return lines }
        return lines.join(lineSep || this.lineSeparator())
      },
      setValue: docMethodOp(function(code) {
        var top = Pos(this.first, 0), last = this.first + this.size - 1;
        makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                          text: this.splitLines(code), origin: "setValue", full: true}, true);
        if (this.cm) { scrollToCoords(this.cm, 0, 0); }
        setSelection(this, simpleSelection(top), sel_dontScroll);
      }),
      replaceRange: function(code, from, to, origin) {
        from = clipPos(this, from);
        to = to ? clipPos(this, to) : from;
        replaceRange(this, code, from, to, origin);
      },
      getRange: function(from, to, lineSep) {
        var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
        if (lineSep === false) { return lines }
        return lines.join(lineSep || this.lineSeparator())
      },

      getLine: function(line) {var l = this.getLineHandle(line); return l && l.text},

      getLineHandle: function(line) {if (isLine(this, line)) { return getLine(this, line) }},
      getLineNumber: function(line) {return lineNo(line)},

      getLineHandleVisualStart: function(line) {
        if (typeof line == "number") { line = getLine(this, line); }
        return visualLine(line)
      },

      lineCount: function() {return this.size},
      firstLine: function() {return this.first},
      lastLine: function() {return this.first + this.size - 1},

      clipPos: function(pos) {return clipPos(this, pos)},

      getCursor: function(start) {
        var range$$1 = this.sel.primary(), pos;
        if (start == null || start == "head") { pos = range$$1.head; }
        else if (start == "anchor") { pos = range$$1.anchor; }
        else if (start == "end" || start == "to" || start === false) { pos = range$$1.to(); }
        else { pos = range$$1.from(); }
        return pos
      },
      listSelections: function() { return this.sel.ranges },
      somethingSelected: function() {return this.sel.somethingSelected()},

      setCursor: docMethodOp(function(line, ch, options) {
        setSimpleSelection(this, clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line), null, options);
      }),
      setSelection: docMethodOp(function(anchor, head, options) {
        setSimpleSelection(this, clipPos(this, anchor), clipPos(this, head || anchor), options);
      }),
      extendSelection: docMethodOp(function(head, other, options) {
        extendSelection(this, clipPos(this, head), other && clipPos(this, other), options);
      }),
      extendSelections: docMethodOp(function(heads, options) {
        extendSelections(this, clipPosArray(this, heads), options);
      }),
      extendSelectionsBy: docMethodOp(function(f, options) {
        var heads = map(this.sel.ranges, f);
        extendSelections(this, clipPosArray(this, heads), options);
      }),
      setSelections: docMethodOp(function(ranges, primary, options) {
        var this$1 = this;

        if (!ranges.length) { return }
        var out = [];
        for (var i = 0; i < ranges.length; i++)
          { out[i] = new Range(clipPos(this$1, ranges[i].anchor),
                             clipPos(this$1, ranges[i].head)); }
        if (primary == null) { primary = Math.min(ranges.length - 1, this.sel.primIndex); }
        setSelection(this, normalizeSelection(this.cm, out, primary), options);
      }),
      addSelection: docMethodOp(function(anchor, head, options) {
        var ranges = this.sel.ranges.slice(0);
        ranges.push(new Range(clipPos(this, anchor), clipPos(this, head || anchor)));
        setSelection(this, normalizeSelection(this.cm, ranges, ranges.length - 1), options);
      }),

      getSelection: function(lineSep) {
        var this$1 = this;

        var ranges = this.sel.ranges, lines;
        for (var i = 0; i < ranges.length; i++) {
          var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
          lines = lines ? lines.concat(sel) : sel;
        }
        if (lineSep === false) { return lines }
        else { return lines.join(lineSep || this.lineSeparator()) }
      },
      getSelections: function(lineSep) {
        var this$1 = this;

        var parts = [], ranges = this.sel.ranges;
        for (var i = 0; i < ranges.length; i++) {
          var sel = getBetween(this$1, ranges[i].from(), ranges[i].to());
          if (lineSep !== false) { sel = sel.join(lineSep || this$1.lineSeparator()); }
          parts[i] = sel;
        }
        return parts
      },
      replaceSelection: function(code, collapse, origin) {
        var dup = [];
        for (var i = 0; i < this.sel.ranges.length; i++)
          { dup[i] = code; }
        this.replaceSelections(dup, collapse, origin || "+input");
      },
      replaceSelections: docMethodOp(function(code, collapse, origin) {
        var this$1 = this;

        var changes = [], sel = this.sel;
        for (var i = 0; i < sel.ranges.length; i++) {
          var range$$1 = sel.ranges[i];
          changes[i] = {from: range$$1.from(), to: range$$1.to(), text: this$1.splitLines(code[i]), origin: origin};
        }
        var newSel = collapse && collapse != "end" && computeReplacedSel(this, changes, collapse);
        for (var i$1 = changes.length - 1; i$1 >= 0; i$1--)
          { makeChange(this$1, changes[i$1]); }
        if (newSel) { setSelectionReplaceHistory(this, newSel); }
        else if (this.cm) { ensureCursorVisible(this.cm); }
      }),
      undo: docMethodOp(function() {makeChangeFromHistory(this, "undo");}),
      redo: docMethodOp(function() {makeChangeFromHistory(this, "redo");}),
      undoSelection: docMethodOp(function() {makeChangeFromHistory(this, "undo", true);}),
      redoSelection: docMethodOp(function() {makeChangeFromHistory(this, "redo", true);}),

      setExtending: function(val) {this.extend = val;},
      getExtending: function() {return this.extend},

      historySize: function() {
        var hist = this.history, done = 0, undone = 0;
        for (var i = 0; i < hist.done.length; i++) { if (!hist.done[i].ranges) { ++done; } }
        for (var i$1 = 0; i$1 < hist.undone.length; i$1++) { if (!hist.undone[i$1].ranges) { ++undone; } }
        return {undo: done, redo: undone}
      },
      clearHistory: function() {this.history = new History(this.history.maxGeneration);},

      markClean: function() {
        this.cleanGeneration = this.changeGeneration(true);
      },
      changeGeneration: function(forceSplit) {
        if (forceSplit)
          { this.history.lastOp = this.history.lastSelOp = this.history.lastOrigin = null; }
        return this.history.generation
      },
      isClean: function (gen) {
        return this.history.generation == (gen || this.cleanGeneration)
      },

      getHistory: function() {
        return {done: copyHistoryArray(this.history.done),
                undone: copyHistoryArray(this.history.undone)}
      },
      setHistory: function(histData) {
        var hist = this.history = new History(this.history.maxGeneration);
        hist.done = copyHistoryArray(histData.done.slice(0), null, true);
        hist.undone = copyHistoryArray(histData.undone.slice(0), null, true);
      },

      setGutterMarker: docMethodOp(function(line, gutterID, value) {
        return changeLine(this, line, "gutter", function (line) {
          var markers = line.gutterMarkers || (line.gutterMarkers = {});
          markers[gutterID] = value;
          if (!value && isEmpty(markers)) { line.gutterMarkers = null; }
          return true
        })
      }),

      clearGutter: docMethodOp(function(gutterID) {
        var this$1 = this;

        this.iter(function (line) {
          if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
            changeLine(this$1, line, "gutter", function () {
              line.gutterMarkers[gutterID] = null;
              if (isEmpty(line.gutterMarkers)) { line.gutterMarkers = null; }
              return true
            });
          }
        });
      }),

      lineInfo: function(line) {
        var n;
        if (typeof line == "number") {
          if (!isLine(this, line)) { return null }
          n = line;
          line = getLine(this, line);
          if (!line) { return null }
        } else {
          n = lineNo(line);
          if (n == null) { return null }
        }
        return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
                textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
                widgets: line.widgets}
      },

      addLineClass: docMethodOp(function(handle, where, cls) {
        return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
          var prop = where == "text" ? "textClass"
                   : where == "background" ? "bgClass"
                   : where == "gutter" ? "gutterClass" : "wrapClass";
          if (!line[prop]) { line[prop] = cls; }
          else if (classTest(cls).test(line[prop])) { return false }
          else { line[prop] += " " + cls; }
          return true
        })
      }),
      removeLineClass: docMethodOp(function(handle, where, cls) {
        return changeLine(this, handle, where == "gutter" ? "gutter" : "class", function (line) {
          var prop = where == "text" ? "textClass"
                   : where == "background" ? "bgClass"
                   : where == "gutter" ? "gutterClass" : "wrapClass";
          var cur = line[prop];
          if (!cur) { return false }
          else if (cls == null) { line[prop] = null; }
          else {
            var found = cur.match(classTest(cls));
            if (!found) { return false }
            var end = found.index + found[0].length;
            line[prop] = cur.slice(0, found.index) + (!found.index || end == cur.length ? "" : " ") + cur.slice(end) || null;
          }
          return true
        })
      }),

      addLineWidget: docMethodOp(function(handle, node, options) {
        return addLineWidget(this, handle, node, options)
      }),
      removeLineWidget: function(widget) { widget.clear(); },

      markText: function(from, to, options) {
        return markText(this, clipPos(this, from), clipPos(this, to), options, options && options.type || "range")
      },
      setBookmark: function(pos, options) {
        var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                        insertLeft: options && options.insertLeft,
                        clearWhenEmpty: false, shared: options && options.shared,
                        handleMouseEvents: options && options.handleMouseEvents};
        pos = clipPos(this, pos);
        return markText(this, pos, pos, realOpts, "bookmark")
      },
      findMarksAt: function(pos) {
        pos = clipPos(this, pos);
        var markers = [], spans = getLine(this, pos.line).markedSpans;
        if (spans) { for (var i = 0; i < spans.length; ++i) {
          var span = spans[i];
          if ((span.from == null || span.from <= pos.ch) &&
              (span.to == null || span.to >= pos.ch))
            { markers.push(span.marker.parent || span.marker); }
        } }
        return markers
      },
      findMarks: function(from, to, filter) {
        from = clipPos(this, from); to = clipPos(this, to);
        var found = [], lineNo$$1 = from.line;
        this.iter(from.line, to.line + 1, function (line) {
          var spans = line.markedSpans;
          if (spans) { for (var i = 0; i < spans.length; i++) {
            var span = spans[i];
            if (!(span.to != null && lineNo$$1 == from.line && from.ch >= span.to ||
                  span.from == null && lineNo$$1 != from.line ||
                  span.from != null && lineNo$$1 == to.line && span.from >= to.ch) &&
                (!filter || filter(span.marker)))
              { found.push(span.marker.parent || span.marker); }
          } }
          ++lineNo$$1;
        });
        return found
      },
      getAllMarks: function() {
        var markers = [];
        this.iter(function (line) {
          var sps = line.markedSpans;
          if (sps) { for (var i = 0; i < sps.length; ++i)
            { if (sps[i].from != null) { markers.push(sps[i].marker); } } }
        });
        return markers
      },

      posFromIndex: function(off) {
        var ch, lineNo$$1 = this.first, sepSize = this.lineSeparator().length;
        this.iter(function (line) {
          var sz = line.text.length + sepSize;
          if (sz > off) { ch = off; return true }
          off -= sz;
          ++lineNo$$1;
        });
        return clipPos(this, Pos(lineNo$$1, ch))
      },
      indexFromPos: function (coords) {
        coords = clipPos(this, coords);
        var index = coords.ch;
        if (coords.line < this.first || coords.ch < 0) { return 0 }
        var sepSize = this.lineSeparator().length;
        this.iter(this.first, coords.line, function (line) { // iter aborts when callback returns a truthy value
          index += line.text.length + sepSize;
        });
        return index
      },

      copy: function(copyHistory) {
        var doc = new Doc(getLines(this, this.first, this.first + this.size),
                          this.modeOption, this.first, this.lineSep, this.direction);
        doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
        doc.sel = this.sel;
        doc.extend = false;
        if (copyHistory) {
          doc.history.undoDepth = this.history.undoDepth;
          doc.setHistory(this.getHistory());
        }
        return doc
      },

      linkedDoc: function(options) {
        if (!options) { options = {}; }
        var from = this.first, to = this.first + this.size;
        if (options.from != null && options.from > from) { from = options.from; }
        if (options.to != null && options.to < to) { to = options.to; }
        var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from, this.lineSep, this.direction);
        if (options.sharedHist) { copy.history = this.history
        ; }(this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
        copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
        copySharedMarkers(copy, findSharedMarkers(this));
        return copy
      },
      unlinkDoc: function(other) {
        var this$1 = this;

        if (other instanceof CodeMirror) { other = other.doc; }
        if (this.linked) { for (var i = 0; i < this.linked.length; ++i) {
          var link = this$1.linked[i];
          if (link.doc != other) { continue }
          this$1.linked.splice(i, 1);
          other.unlinkDoc(this$1);
          detachSharedMarkers(findSharedMarkers(this$1));
          break
        } }
        // If the histories were shared, split them again
        if (other.history == this.history) {
          var splitIds = [other.id];
          linkedDocs(other, function (doc) { return splitIds.push(doc.id); }, true);
          other.history = new History(null);
          other.history.done = copyHistoryArray(this.history.done, splitIds);
          other.history.undone = copyHistoryArray(this.history.undone, splitIds);
        }
      },
      iterLinkedDocs: function(f) {linkedDocs(this, f);},

      getMode: function() {return this.mode},
      getEditor: function() {return this.cm},

      splitLines: function(str) {
        if (this.lineSep) { return str.split(this.lineSep) }
        return splitLinesAuto(str)
      },
      lineSeparator: function() { return this.lineSep || "\n" },

      setDirection: docMethodOp(function (dir) {
        if (dir != "rtl") { dir = "ltr"; }
        if (dir == this.direction) { return }
        this.direction = dir;
        this.iter(function (line) { return line.order = null; });
        if (this.cm) { directionChanged(this.cm); }
      })
    });

    // Public alias.
    Doc.prototype.eachLine = Doc.prototype.iter;

    // Kludge to work around strange IE behavior where it'll sometimes
    // re-fire a series of drag-related events right after the drop (#1551)
    var lastDrop = 0;

    function onDrop(e) {
      var cm = this;
      clearDragCursor(cm);
      if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e))
        { return }
      e_preventDefault(e);
      if (ie) { lastDrop = +new Date; }
      var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
      if (!pos || cm.isReadOnly()) { return }
      // Might be a file drop, in which case we simply extract the text
      // and insert it.
      if (files && files.length && window.FileReader && window.File) {
        var n = files.length, text = Array(n), read = 0;
        var loadFile = function (file, i) {
          if (cm.options.allowDropFileTypes &&
              indexOf(cm.options.allowDropFileTypes, file.type) == -1)
            { return }

          var reader = new FileReader;
          reader.onload = operation(cm, function () {
            var content = reader.result;
            if (/[\x00-\x08\x0e-\x1f]{2}/.test(content)) { content = ""; }
            text[i] = content;
            if (++read == n) {
              pos = clipPos(cm.doc, pos);
              var change = {from: pos, to: pos,
                            text: cm.doc.splitLines(text.join(cm.doc.lineSeparator())),
                            origin: "paste"};
              makeChange(cm.doc, change);
              setSelectionReplaceHistory(cm.doc, simpleSelection(pos, changeEnd(change)));
            }
          });
          reader.readAsText(file);
        };
        for (var i = 0; i < n; ++i) { loadFile(files[i], i); }
      } else { // Normal drop
        // Don't do a replace if the drop happened inside of the selected text.
        if (cm.state.draggingText && cm.doc.sel.contains(pos) > -1) {
          cm.state.draggingText(e);
          // Ensure the editor is re-focused
          setTimeout(function () { return cm.display.input.focus(); }, 20);
          return
        }
        try {
          var text$1 = e.dataTransfer.getData("Text");
          if (text$1) {
            var selected;
            if (cm.state.draggingText && !cm.state.draggingText.copy)
              { selected = cm.listSelections(); }
            setSelectionNoUndo(cm.doc, simpleSelection(pos, pos));
            if (selected) { for (var i$1 = 0; i$1 < selected.length; ++i$1)
              { replaceRange(cm.doc, "", selected[i$1].anchor, selected[i$1].head, "drag"); } }
            cm.replaceSelection(text$1, "around", "paste");
            cm.display.input.focus();
          }
        }
        catch(e){}
      }
    }

    function onDragStart(cm, e) {
      if (ie && (!cm.state.draggingText || +new Date - lastDrop < 100)) { e_stop(e); return }
      if (signalDOMEvent(cm, e) || eventInWidget(cm.display, e)) { return }

      e.dataTransfer.setData("Text", cm.getSelection());
      e.dataTransfer.effectAllowed = "copyMove";

      // Use dummy image instead of default browsers image.
      // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
      if (e.dataTransfer.setDragImage && !safari) {
        var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
        img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
        if (presto) {
          img.width = img.height = 1;
          cm.display.wrapper.appendChild(img);
          // Force a relayout, or Opera won't use our image for some obscure reason
          img._top = img.offsetTop;
        }
        e.dataTransfer.setDragImage(img, 0, 0);
        if (presto) { img.parentNode.removeChild(img); }
      }
    }

    function onDragOver(cm, e) {
      var pos = posFromMouse(cm, e);
      if (!pos) { return }
      var frag = document.createDocumentFragment();
      drawSelectionCursor(cm, pos, frag);
      if (!cm.display.dragCursor) {
        cm.display.dragCursor = elt("div", null, "CodeMirror-cursors CodeMirror-dragcursors");
        cm.display.lineSpace.insertBefore(cm.display.dragCursor, cm.display.cursorDiv);
      }
      removeChildrenAndAdd(cm.display.dragCursor, frag);
    }

    function clearDragCursor(cm) {
      if (cm.display.dragCursor) {
        cm.display.lineSpace.removeChild(cm.display.dragCursor);
        cm.display.dragCursor = null;
      }
    }

    // These must be handled carefully, because naively registering a
    // handler for each editor will cause the editors to never be
    // garbage collected.

    function forEachCodeMirror(f) {
      if (!document.getElementsByClassName) { return }
      var byClass = document.getElementsByClassName("CodeMirror"), editors = [];
      for (var i = 0; i < byClass.length; i++) {
        var cm = byClass[i].CodeMirror;
        if (cm) { editors.push(cm); }
      }
      if (editors.length) { editors[0].operation(function () {
        for (var i = 0; i < editors.length; i++) { f(editors[i]); }
      }); }
    }

    var globalsRegistered = false;
    function ensureGlobalHandlers() {
      if (globalsRegistered) { return }
      registerGlobalHandlers();
      globalsRegistered = true;
    }
    function registerGlobalHandlers() {
      // When the window resizes, we need to refresh active editors.
      var resizeTimer;
      on(window, "resize", function () {
        if (resizeTimer == null) { resizeTimer = setTimeout(function () {
          resizeTimer = null;
          forEachCodeMirror(onResize);
        }, 100); }
      });
      // When the window loses focus, we want to show the editor as blurred
      on(window, "blur", function () { return forEachCodeMirror(onBlur); });
    }
    // Called when the window resizes
    function onResize(cm) {
      var d = cm.display;
      // Might be a text scaling operation, clear size caches.
      d.cachedCharWidth = d.cachedTextHeight = d.cachedPaddingH = null;
      d.scrollbarsClipped = false;
      cm.setSize();
    }

    var keyNames = {
      3: "Pause", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
      19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
      36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
      46: "Delete", 59: ";", 61: "=", 91: "Mod", 92: "Mod", 93: "Mod",
      106: "*", 107: "=", 109: "-", 110: ".", 111: "/", 145: "ScrollLock",
      173: "-", 186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
      221: "]", 222: "'", 63232: "Up", 63233: "Down", 63234: "Left", 63235: "Right", 63272: "Delete",
      63273: "Home", 63275: "End", 63276: "PageUp", 63277: "PageDown", 63302: "Insert"
    };

    // Number keys
    for (var i = 0; i < 10; i++) { keyNames[i + 48] = keyNames[i + 96] = String(i); }
    // Alphabetic keys
    for (var i$1 = 65; i$1 <= 90; i$1++) { keyNames[i$1] = String.fromCharCode(i$1); }
    // Function keys
    for (var i$2 = 1; i$2 <= 12; i$2++) { keyNames[i$2 + 111] = keyNames[i$2 + 63235] = "F" + i$2; }

    var keyMap = {};

    keyMap.basic = {
      "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
      "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
      "Delete": "delCharAfter", "Backspace": "delCharBefore", "Shift-Backspace": "delCharBefore",
      "Tab": "defaultTab", "Shift-Tab": "indentAuto",
      "Enter": "newlineAndIndent", "Insert": "toggleOverwrite",
      "Esc": "singleSelection"
    };
    // Note that the save and find-related commands aren't defined by
    // default. User code or addons can define them. Unknown commands
    // are simply ignored.
    keyMap.pcDefault = {
      "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
      "Ctrl-Home": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Up": "goLineUp", "Ctrl-Down": "goLineDown",
      "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
      "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
      "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
      "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
      "Ctrl-U": "undoSelection", "Shift-Ctrl-U": "redoSelection", "Alt-U": "redoSelection",
      "fallthrough": "basic"
    };
    // Very basic readline/emacs-style bindings, which are standard on Mac.
    keyMap.emacsy = {
      "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
      "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
      "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
      "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars",
      "Ctrl-O": "openLine"
    };
    keyMap.macDefault = {
      "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
      "Cmd-Home": "goDocStart", "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
      "Alt-Right": "goGroupRight", "Cmd-Left": "goLineLeft", "Cmd-Right": "goLineRight", "Alt-Backspace": "delGroupBefore",
      "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
      "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
      "Cmd-[": "indentLess", "Cmd-]": "indentMore", "Cmd-Backspace": "delWrappedLineLeft", "Cmd-Delete": "delWrappedLineRight",
      "Cmd-U": "undoSelection", "Shift-Cmd-U": "redoSelection", "Ctrl-Up": "goDocStart", "Ctrl-Down": "goDocEnd",
      "fallthrough": ["basic", "emacsy"]
    };
    keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;

    // KEYMAP DISPATCH

    function normalizeKeyName(name) {
      var parts = name.split(/-(?!$)/);
      name = parts[parts.length - 1];
      var alt, ctrl, shift, cmd;
      for (var i = 0; i < parts.length - 1; i++) {
        var mod = parts[i];
        if (/^(cmd|meta|m)$/i.test(mod)) { cmd = true; }
        else if (/^a(lt)?$/i.test(mod)) { alt = true; }
        else if (/^(c|ctrl|control)$/i.test(mod)) { ctrl = true; }
        else if (/^s(hift)?$/i.test(mod)) { shift = true; }
        else { throw new Error("Unrecognized modifier name: " + mod) }
      }
      if (alt) { name = "Alt-" + name; }
      if (ctrl) { name = "Ctrl-" + name; }
      if (cmd) { name = "Cmd-" + name; }
      if (shift) { name = "Shift-" + name; }
      return name
    }

    // This is a kludge to keep keymaps mostly working as raw objects
    // (backwards compatibility) while at the same time support features
    // like normalization and multi-stroke key bindings. It compiles a
    // new normalized keymap, and then updates the old object to reflect
    // this.
    function normalizeKeyMap(keymap) {
      var copy = {};
      for (var keyname in keymap) { if (keymap.hasOwnProperty(keyname)) {
        var value = keymap[keyname];
        if (/^(name|fallthrough|(de|at)tach)$/.test(keyname)) { continue }
        if (value == "...") { delete keymap[keyname]; continue }

        var keys = map(keyname.split(" "), normalizeKeyName);
        for (var i = 0; i < keys.length; i++) {
          var val = (void 0), name = (void 0);
          if (i == keys.length - 1) {
            name = keys.join(" ");
            val = value;
          } else {
            name = keys.slice(0, i + 1).join(" ");
            val = "...";
          }
          var prev = copy[name];
          if (!prev) { copy[name] = val; }
          else if (prev != val) { throw new Error("Inconsistent bindings for " + name) }
        }
        delete keymap[keyname];
      } }
      for (var prop in copy) { keymap[prop] = copy[prop]; }
      return keymap
    }

    function lookupKey(key, map$$1, handle, context) {
      map$$1 = getKeyMap(map$$1);
      var found = map$$1.call ? map$$1.call(key, context) : map$$1[key];
      if (found === false) { return "nothing" }
      if (found === "...") { return "multi" }
      if (found != null && handle(found)) { return "handled" }

      if (map$$1.fallthrough) {
        if (Object.prototype.toString.call(map$$1.fallthrough) != "[object Array]")
          { return lookupKey(key, map$$1.fallthrough, handle, context) }
        for (var i = 0; i < map$$1.fallthrough.length; i++) {
          var result = lookupKey(key, map$$1.fallthrough[i], handle, context);
          if (result) { return result }
        }
      }
    }

    // Modifier key presses don't count as 'real' key presses for the
    // purpose of keymap fallthrough.
    function isModifierKey(value) {
      var name = typeof value == "string" ? value : keyNames[value.keyCode];
      return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod"
    }

    function addModifierNames(name, event, noShift) {
      var base = name;
      if (event.altKey && base != "Alt") { name = "Alt-" + name; }
      if ((flipCtrlCmd ? event.metaKey : event.ctrlKey) && base != "Ctrl") { name = "Ctrl-" + name; }
      if ((flipCtrlCmd ? event.ctrlKey : event.metaKey) && base != "Cmd") { name = "Cmd-" + name; }
      if (!noShift && event.shiftKey && base != "Shift") { name = "Shift-" + name; }
      return name
    }

    // Look up the name of a key as indicated by an event object.
    function keyName(event, noShift) {
      if (presto && event.keyCode == 34 && event["char"]) { return false }
      var name = keyNames[event.keyCode];
      if (name == null || event.altGraphKey) { return false }
      // Ctrl-ScrollLock has keyCode 3, same as Ctrl-Pause,
      // so we'll use event.code when available (Chrome 48+, FF 38+, Safari 10.1+)
      if (event.keyCode == 3 && event.code) { name = event.code; }
      return addModifierNames(name, event, noShift)
    }

    function getKeyMap(val) {
      return typeof val == "string" ? keyMap[val] : val
    }

    // Helper for deleting text near the selection(s), used to implement
    // backspace, delete, and similar functionality.
    function deleteNearSelection(cm, compute) {
      var ranges = cm.doc.sel.ranges, kill = [];
      // Build up a set of ranges to kill first, merging overlapping
      // ranges.
      for (var i = 0; i < ranges.length; i++) {
        var toKill = compute(ranges[i]);
        while (kill.length && cmp(toKill.from, lst(kill).to) <= 0) {
          var replaced = kill.pop();
          if (cmp(replaced.from, toKill.from) < 0) {
            toKill.from = replaced.from;
            break
          }
        }
        kill.push(toKill);
      }
      // Next, remove those actual ranges.
      runInOp(cm, function () {
        for (var i = kill.length - 1; i >= 0; i--)
          { replaceRange(cm.doc, "", kill[i].from, kill[i].to, "+delete"); }
        ensureCursorVisible(cm);
      });
    }

    function moveCharLogically(line, ch, dir) {
      var target = skipExtendingChars(line.text, ch + dir, dir);
      return target < 0 || target > line.text.length ? null : target
    }

    function moveLogically(line, start, dir) {
      var ch = moveCharLogically(line, start.ch, dir);
      return ch == null ? null : new Pos(start.line, ch, dir < 0 ? "after" : "before")
    }

    function endOfLine(visually, cm, lineObj, lineNo, dir) {
      if (visually) {
        var order = getOrder(lineObj, cm.doc.direction);
        if (order) {
          var part = dir < 0 ? lst(order) : order[0];
          var moveInStorageOrder = (dir < 0) == (part.level == 1);
          var sticky = moveInStorageOrder ? "after" : "before";
          var ch;
          // With a wrapped rtl chunk (possibly spanning multiple bidi parts),
          // it could be that the last bidi part is not on the last visual line,
          // since visual lines contain content order-consecutive chunks.
          // Thus, in rtl, we are looking for the first (content-order) character
          // in the rtl chunk that is on the last line (that is, the same line
          // as the last (content-order) character).
          if (part.level > 0 || cm.doc.direction == "rtl") {
            var prep = prepareMeasureForLine(cm, lineObj);
            ch = dir < 0 ? lineObj.text.length - 1 : 0;
            var targetTop = measureCharPrepared(cm, prep, ch).top;
            ch = findFirst(function (ch) { return measureCharPrepared(cm, prep, ch).top == targetTop; }, (dir < 0) == (part.level == 1) ? part.from : part.to - 1, ch);
            if (sticky == "before") { ch = moveCharLogically(lineObj, ch, 1); }
          } else { ch = dir < 0 ? part.to : part.from; }
          return new Pos(lineNo, ch, sticky)
        }
      }
      return new Pos(lineNo, dir < 0 ? lineObj.text.length : 0, dir < 0 ? "before" : "after")
    }

    function moveVisually(cm, line, start, dir) {
      var bidi = getOrder(line, cm.doc.direction);
      if (!bidi) { return moveLogically(line, start, dir) }
      if (start.ch >= line.text.length) {
        start.ch = line.text.length;
        start.sticky = "before";
      } else if (start.ch <= 0) {
        start.ch = 0;
        start.sticky = "after";
      }
      var partPos = getBidiPartAt(bidi, start.ch, start.sticky), part = bidi[partPos];
      if (cm.doc.direction == "ltr" && part.level % 2 == 0 && (dir > 0 ? part.to > start.ch : part.from < start.ch)) {
        // Case 1: We move within an ltr part in an ltr editor. Even with wrapped lines,
        // nothing interesting happens.
        return moveLogically(line, start, dir)
      }

      var mv = function (pos, dir) { return moveCharLogically(line, pos instanceof Pos ? pos.ch : pos, dir); };
      var prep;
      var getWrappedLineExtent = function (ch) {
        if (!cm.options.lineWrapping) { return {begin: 0, end: line.text.length} }
        prep = prep || prepareMeasureForLine(cm, line);
        return wrappedLineExtentChar(cm, line, prep, ch)
      };
      var wrappedLineExtent = getWrappedLineExtent(start.sticky == "before" ? mv(start, -1) : start.ch);

      if (cm.doc.direction == "rtl" || part.level == 1) {
        var moveInStorageOrder = (part.level == 1) == (dir < 0);
        var ch = mv(start, moveInStorageOrder ? 1 : -1);
        if (ch != null && (!moveInStorageOrder ? ch >= part.from && ch >= wrappedLineExtent.begin : ch <= part.to && ch <= wrappedLineExtent.end)) {
          // Case 2: We move within an rtl part or in an rtl editor on the same visual line
          var sticky = moveInStorageOrder ? "before" : "after";
          return new Pos(start.line, ch, sticky)
        }
      }

      // Case 3: Could not move within this bidi part in this visual line, so leave
      // the current bidi part

      var searchInVisualLine = function (partPos, dir, wrappedLineExtent) {
        var getRes = function (ch, moveInStorageOrder) { return moveInStorageOrder
          ? new Pos(start.line, mv(ch, 1), "before")
          : new Pos(start.line, ch, "after"); };

        for (; partPos >= 0 && partPos < bidi.length; partPos += dir) {
          var part = bidi[partPos];
          var moveInStorageOrder = (dir > 0) == (part.level != 1);
          var ch = moveInStorageOrder ? wrappedLineExtent.begin : mv(wrappedLineExtent.end, -1);
          if (part.from <= ch && ch < part.to) { return getRes(ch, moveInStorageOrder) }
          ch = moveInStorageOrder ? part.from : mv(part.to, -1);
          if (wrappedLineExtent.begin <= ch && ch < wrappedLineExtent.end) { return getRes(ch, moveInStorageOrder) }
        }
      };

      // Case 3a: Look for other bidi parts on the same visual line
      var res = searchInVisualLine(partPos + dir, dir, wrappedLineExtent);
      if (res) { return res }

      // Case 3b: Look for other bidi parts on the next visual line
      var nextCh = dir > 0 ? wrappedLineExtent.end : mv(wrappedLineExtent.begin, -1);
      if (nextCh != null && !(dir > 0 && nextCh == line.text.length)) {
        res = searchInVisualLine(dir > 0 ? 0 : bidi.length - 1, dir, getWrappedLineExtent(nextCh));
        if (res) { return res }
      }

      // Case 4: Nowhere to move
      return null
    }

    // Commands are parameter-less actions that can be performed on an
    // editor, mostly used for keybindings.
    var commands = {
      selectAll: selectAll,
      singleSelection: function (cm) { return cm.setSelection(cm.getCursor("anchor"), cm.getCursor("head"), sel_dontScroll); },
      killLine: function (cm) { return deleteNearSelection(cm, function (range) {
        if (range.empty()) {
          var len = getLine(cm.doc, range.head.line).text.length;
          if (range.head.ch == len && range.head.line < cm.lastLine())
            { return {from: range.head, to: Pos(range.head.line + 1, 0)} }
          else
            { return {from: range.head, to: Pos(range.head.line, len)} }
        } else {
          return {from: range.from(), to: range.to()}
        }
      }); },
      deleteLine: function (cm) { return deleteNearSelection(cm, function (range) { return ({
        from: Pos(range.from().line, 0),
        to: clipPos(cm.doc, Pos(range.to().line + 1, 0))
      }); }); },
      delLineLeft: function (cm) { return deleteNearSelection(cm, function (range) { return ({
        from: Pos(range.from().line, 0), to: range.from()
      }); }); },
      delWrappedLineLeft: function (cm) { return deleteNearSelection(cm, function (range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var leftPos = cm.coordsChar({left: 0, top: top}, "div");
        return {from: leftPos, to: range.from()}
      }); },
      delWrappedLineRight: function (cm) { return deleteNearSelection(cm, function (range) {
        var top = cm.charCoords(range.head, "div").top + 5;
        var rightPos = cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div");
        return {from: range.from(), to: rightPos }
      }); },
      undo: function (cm) { return cm.undo(); },
      redo: function (cm) { return cm.redo(); },
      undoSelection: function (cm) { return cm.undoSelection(); },
      redoSelection: function (cm) { return cm.redoSelection(); },
      goDocStart: function (cm) { return cm.extendSelection(Pos(cm.firstLine(), 0)); },
      goDocEnd: function (cm) { return cm.extendSelection(Pos(cm.lastLine())); },
      goLineStart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStart(cm, range.head.line); },
        {origin: "+move", bias: 1}
      ); },
      goLineStartSmart: function (cm) { return cm.extendSelectionsBy(function (range) { return lineStartSmart(cm, range.head); },
        {origin: "+move", bias: 1}
      ); },
      goLineEnd: function (cm) { return cm.extendSelectionsBy(function (range) { return lineEnd(cm, range.head.line); },
        {origin: "+move", bias: -1}
      ); },
      goLineRight: function (cm) { return cm.extendSelectionsBy(function (range) {
        var top = cm.cursorCoords(range.head, "div").top + 5;
        return cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div")
      }, sel_move); },
      goLineLeft: function (cm) { return cm.extendSelectionsBy(function (range) {
        var top = cm.cursorCoords(range.head, "div").top + 5;
        return cm.coordsChar({left: 0, top: top}, "div")
      }, sel_move); },
      goLineLeftSmart: function (cm) { return cm.extendSelectionsBy(function (range) {
        var top = cm.cursorCoords(range.head, "div").top + 5;
        var pos = cm.coordsChar({left: 0, top: top}, "div");
        if (pos.ch < cm.getLine(pos.line).search(/\S/)) { return lineStartSmart(cm, range.head) }
        return pos
      }, sel_move); },
      goLineUp: function (cm) { return cm.moveV(-1, "line"); },
      goLineDown: function (cm) { return cm.moveV(1, "line"); },
      goPageUp: function (cm) { return cm.moveV(-1, "page"); },
      goPageDown: function (cm) { return cm.moveV(1, "page"); },
      goCharLeft: function (cm) { return cm.moveH(-1, "char"); },
      goCharRight: function (cm) { return cm.moveH(1, "char"); },
      goColumnLeft: function (cm) { return cm.moveH(-1, "column"); },
      goColumnRight: function (cm) { return cm.moveH(1, "column"); },
      goWordLeft: function (cm) { return cm.moveH(-1, "word"); },
      goGroupRight: function (cm) { return cm.moveH(1, "group"); },
      goGroupLeft: function (cm) { return cm.moveH(-1, "group"); },
      goWordRight: function (cm) { return cm.moveH(1, "word"); },
      delCharBefore: function (cm) { return cm.deleteH(-1, "char"); },
      delCharAfter: function (cm) { return cm.deleteH(1, "char"); },
      delWordBefore: function (cm) { return cm.deleteH(-1, "word"); },
      delWordAfter: function (cm) { return cm.deleteH(1, "word"); },
      delGroupBefore: function (cm) { return cm.deleteH(-1, "group"); },
      delGroupAfter: function (cm) { return cm.deleteH(1, "group"); },
      indentAuto: function (cm) { return cm.indentSelection("smart"); },
      indentMore: function (cm) { return cm.indentSelection("add"); },
      indentLess: function (cm) { return cm.indentSelection("subtract"); },
      insertTab: function (cm) { return cm.replaceSelection("\t"); },
      insertSoftTab: function (cm) {
        var spaces = [], ranges = cm.listSelections(), tabSize = cm.options.tabSize;
        for (var i = 0; i < ranges.length; i++) {
          var pos = ranges[i].from();
          var col = countColumn(cm.getLine(pos.line), pos.ch, tabSize);
          spaces.push(spaceStr(tabSize - col % tabSize));
        }
        cm.replaceSelections(spaces);
      },
      defaultTab: function (cm) {
        if (cm.somethingSelected()) { cm.indentSelection("add"); }
        else { cm.execCommand("insertTab"); }
      },
      // Swap the two chars left and right of each selection's head.
      // Move cursor behind the two swapped characters afterwards.
      //
      // Doesn't consider line feeds a character.
      // Doesn't scan more than one line above to find a character.
      // Doesn't do anything on an empty line.
      // Doesn't do anything with non-empty selections.
      transposeChars: function (cm) { return runInOp(cm, function () {
        var ranges = cm.listSelections(), newSel = [];
        for (var i = 0; i < ranges.length; i++) {
          if (!ranges[i].empty()) { continue }
          var cur = ranges[i].head, line = getLine(cm.doc, cur.line).text;
          if (line) {
            if (cur.ch == line.length) { cur = new Pos(cur.line, cur.ch - 1); }
            if (cur.ch > 0) {
              cur = new Pos(cur.line, cur.ch + 1);
              cm.replaceRange(line.charAt(cur.ch - 1) + line.charAt(cur.ch - 2),
                              Pos(cur.line, cur.ch - 2), cur, "+transpose");
            } else if (cur.line > cm.doc.first) {
              var prev = getLine(cm.doc, cur.line - 1).text;
              if (prev) {
                cur = new Pos(cur.line, 1);
                cm.replaceRange(line.charAt(0) + cm.doc.lineSeparator() +
                                prev.charAt(prev.length - 1),
                                Pos(cur.line - 1, prev.length - 1), cur, "+transpose");
              }
            }
          }
          newSel.push(new Range(cur, cur));
        }
        cm.setSelections(newSel);
      }); },
      newlineAndIndent: function (cm) { return runInOp(cm, function () {
        var sels = cm.listSelections();
        for (var i = sels.length - 1; i >= 0; i--)
          { cm.replaceRange(cm.doc.lineSeparator(), sels[i].anchor, sels[i].head, "+input"); }
        sels = cm.listSelections();
        for (var i$1 = 0; i$1 < sels.length; i$1++)
          { cm.indentLine(sels[i$1].from().line, null, true); }
        ensureCursorVisible(cm);
      }); },
      openLine: function (cm) { return cm.replaceSelection("\n", "start"); },
      toggleOverwrite: function (cm) { return cm.toggleOverwrite(); }
    };


    function lineStart(cm, lineN) {
      var line = getLine(cm.doc, lineN);
      var visual = visualLine(line);
      if (visual != line) { lineN = lineNo(visual); }
      return endOfLine(true, cm, visual, lineN, 1)
    }
    function lineEnd(cm, lineN) {
      var line = getLine(cm.doc, lineN);
      var visual = visualLineEnd(line);
      if (visual != line) { lineN = lineNo(visual); }
      return endOfLine(true, cm, line, lineN, -1)
    }
    function lineStartSmart(cm, pos) {
      var start = lineStart(cm, pos.line);
      var line = getLine(cm.doc, start.line);
      var order = getOrder(line, cm.doc.direction);
      if (!order || order[0].level == 0) {
        var firstNonWS = Math.max(0, line.text.search(/\S/));
        var inWS = pos.line == start.line && pos.ch <= firstNonWS && pos.ch;
        return Pos(start.line, inWS ? 0 : firstNonWS, start.sticky)
      }
      return start
    }

    // Run a handler that was bound to a key.
    function doHandleBinding(cm, bound, dropShift) {
      if (typeof bound == "string") {
        bound = commands[bound];
        if (!bound) { return false }
      }
      // Ensure previous input has been read, so that the handler sees a
      // consistent view of the document
      cm.display.input.ensurePolled();
      var prevShift = cm.display.shift, done = false;
      try {
        if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
        if (dropShift) { cm.display.shift = false; }
        done = bound(cm) != Pass;
      } finally {
        cm.display.shift = prevShift;
        cm.state.suppressEdits = false;
      }
      return done
    }

    function lookupKeyForEditor(cm, name, handle) {
      for (var i = 0; i < cm.state.keyMaps.length; i++) {
        var result = lookupKey(name, cm.state.keyMaps[i], handle, cm);
        if (result) { return result }
      }
      return (cm.options.extraKeys && lookupKey(name, cm.options.extraKeys, handle, cm))
        || lookupKey(name, cm.options.keyMap, handle, cm)
    }

    // Note that, despite the name, this function is also used to check
    // for bound mouse clicks.

    var stopSeq = new Delayed;

    function dispatchKey(cm, name, e, handle) {
      var seq = cm.state.keySeq;
      if (seq) {
        if (isModifierKey(name)) { return "handled" }
        if (/\'$/.test(name))
          { cm.state.keySeq = null; }
        else
          { stopSeq.set(50, function () {
            if (cm.state.keySeq == seq) {
              cm.state.keySeq = null;
              cm.display.input.reset();
            }
          }); }
        if (dispatchKeyInner(cm, seq + " " + name, e, handle)) { return true }
      }
      return dispatchKeyInner(cm, name, e, handle)
    }

    function dispatchKeyInner(cm, name, e, handle) {
      var result = lookupKeyForEditor(cm, name, handle);

      if (result == "multi")
        { cm.state.keySeq = name; }
      if (result == "handled")
        { signalLater(cm, "keyHandled", cm, name, e); }

      if (result == "handled" || result == "multi") {
        e_preventDefault(e);
        restartBlink(cm);
      }

      return !!result
    }

    // Handle a key from the keydown event.
    function handleKeyBinding(cm, e) {
      var name = keyName(e, true);
      if (!name) { return false }

      if (e.shiftKey && !cm.state.keySeq) {
        // First try to resolve full name (including 'Shift-'). Failing
        // that, see if there is a cursor-motion command (starting with
        // 'go') bound to the keyname without 'Shift-'.
        return dispatchKey(cm, "Shift-" + name, e, function (b) { return doHandleBinding(cm, b, true); })
            || dispatchKey(cm, name, e, function (b) {
                 if (typeof b == "string" ? /^go[A-Z]/.test(b) : b.motion)
                   { return doHandleBinding(cm, b) }
               })
      } else {
        return dispatchKey(cm, name, e, function (b) { return doHandleBinding(cm, b); })
      }
    }

    // Handle a key from the keypress event
    function handleCharBinding(cm, e, ch) {
      return dispatchKey(cm, "'" + ch + "'", e, function (b) { return doHandleBinding(cm, b, true); })
    }

    var lastStoppedKey = null;
    function onKeyDown(e) {
      var cm = this;
      cm.curOp.focus = activeElt();
      if (signalDOMEvent(cm, e)) { return }
      // IE does strange things with escape.
      if (ie && ie_version < 11 && e.keyCode == 27) { e.returnValue = false; }
      var code = e.keyCode;
      cm.display.shift = code == 16 || e.shiftKey;
      var handled = handleKeyBinding(cm, e);
      if (presto) {
        lastStoppedKey = handled ? code : null;
        // Opera has no cut event... we try to at least catch the key combo
        if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
          { cm.replaceSelection("", null, "cut"); }
      }

      // Turn mouse into crosshair when Alt is held on Mac.
      if (code == 18 && !/\bCodeMirror-crosshair\b/.test(cm.display.lineDiv.className))
        { showCrossHair(cm); }
    }

    function showCrossHair(cm) {
      var lineDiv = cm.display.lineDiv;
      addClass(lineDiv, "CodeMirror-crosshair");

      function up(e) {
        if (e.keyCode == 18 || !e.altKey) {
          rmClass(lineDiv, "CodeMirror-crosshair");
          off(document, "keyup", up);
          off(document, "mouseover", up);
        }
      }
      on(document, "keyup", up);
      on(document, "mouseover", up);
    }

    function onKeyUp(e) {
      if (e.keyCode == 16) { this.doc.sel.shift = false; }
      signalDOMEvent(this, e);
    }

    function onKeyPress(e) {
      var cm = this;
      if (eventInWidget(cm.display, e) || signalDOMEvent(cm, e) || e.ctrlKey && !e.altKey || mac && e.metaKey) { return }
      var keyCode = e.keyCode, charCode = e.charCode;
      if (presto && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return}
      if ((presto && (!e.which || e.which < 10)) && handleKeyBinding(cm, e)) { return }
      var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
      // Some browsers fire keypress events for backspace
      if (ch == "\x08") { return }
      if (handleCharBinding(cm, e, ch)) { return }
      cm.display.input.onKeyPress(e);
    }

    var DOUBLECLICK_DELAY = 400;

    var PastClick = function(time, pos, button) {
      this.time = time;
      this.pos = pos;
      this.button = button;
    };

    PastClick.prototype.compare = function (time, pos, button) {
      return this.time + DOUBLECLICK_DELAY > time &&
        cmp(pos, this.pos) == 0 && button == this.button
    };

    var lastClick, lastDoubleClick;
    function clickRepeat(pos, button) {
      var now = +new Date;
      if (lastDoubleClick && lastDoubleClick.compare(now, pos, button)) {
        lastClick = lastDoubleClick = null;
        return "triple"
      } else if (lastClick && lastClick.compare(now, pos, button)) {
        lastDoubleClick = new PastClick(now, pos, button);
        lastClick = null;
        return "double"
      } else {
        lastClick = new PastClick(now, pos, button);
        lastDoubleClick = null;
        return "single"
      }
    }

    // A mouse down can be a single click, double click, triple click,
    // start of selection drag, start of text drag, new cursor
    // (ctrl-click), rectangle drag (alt-drag), or xwin
    // middle-click-paste. Or it might be a click on something we should
    // not interfere with, such as a scrollbar or widget.
    function onMouseDown(e) {
      var cm = this, display = cm.display;
      if (signalDOMEvent(cm, e) || display.activeTouch && display.input.supportsTouch()) { return }
      display.input.ensurePolled();
      display.shift = e.shiftKey;

      if (eventInWidget(display, e)) {
        if (!webkit) {
          // Briefly turn off draggability, to allow widgets to do
          // normal dragging things.
          display.scroller.draggable = false;
          setTimeout(function () { return display.scroller.draggable = true; }, 100);
        }
        return
      }
      if (clickInGutter(cm, e)) { return }
      var pos = posFromMouse(cm, e), button = e_button(e), repeat = pos ? clickRepeat(pos, button) : "single";
      window.focus();

      // #3261: make sure, that we're not starting a second selection
      if (button == 1 && cm.state.selectingText)
        { cm.state.selectingText(e); }

      if (pos && handleMappedButton(cm, button, pos, repeat, e)) { return }

      if (button == 1) {
        if (pos) { leftButtonDown(cm, pos, repeat, e); }
        else if (e_target(e) == display.scroller) { e_preventDefault(e); }
      } else if (button == 2) {
        if (pos) { extendSelection(cm.doc, pos); }
        setTimeout(function () { return display.input.focus(); }, 20);
      } else if (button == 3) {
        if (captureRightClick) { cm.display.input.onContextMenu(e); }
        else { delayBlurEvent(cm); }
      }
    }

    function handleMappedButton(cm, button, pos, repeat, event) {
      var name = "Click";
      if (repeat == "double") { name = "Double" + name; }
      else if (repeat == "triple") { name = "Triple" + name; }
      name = (button == 1 ? "Left" : button == 2 ? "Middle" : "Right") + name;

      return dispatchKey(cm,  addModifierNames(name, event), event, function (bound) {
        if (typeof bound == "string") { bound = commands[bound]; }
        if (!bound) { return false }
        var done = false;
        try {
          if (cm.isReadOnly()) { cm.state.suppressEdits = true; }
          done = bound(cm, pos) != Pass;
        } finally {
          cm.state.suppressEdits = false;
        }
        return done
      })
    }

    function configureMouse(cm, repeat, event) {
      var option = cm.getOption("configureMouse");
      var value = option ? option(cm, repeat, event) : {};
      if (value.unit == null) {
        var rect = chromeOS ? event.shiftKey && event.metaKey : event.altKey;
        value.unit = rect ? "rectangle" : repeat == "single" ? "char" : repeat == "double" ? "word" : "line";
      }
      if (value.extend == null || cm.doc.extend) { value.extend = cm.doc.extend || event.shiftKey; }
      if (value.addNew == null) { value.addNew = mac ? event.metaKey : event.ctrlKey; }
      if (value.moveOnDrag == null) { value.moveOnDrag = !(mac ? event.altKey : event.ctrlKey); }
      return value
    }

    function leftButtonDown(cm, pos, repeat, event) {
      if (ie) { setTimeout(bind(ensureFocus, cm), 0); }
      else { cm.curOp.focus = activeElt(); }

      var behavior = configureMouse(cm, repeat, event);

      var sel = cm.doc.sel, contained;
      if (cm.options.dragDrop && dragAndDrop && !cm.isReadOnly() &&
          repeat == "single" && (contained = sel.contains(pos)) > -1 &&
          (cmp((contained = sel.ranges[contained]).from(), pos) < 0 || pos.xRel > 0) &&
          (cmp(contained.to(), pos) > 0 || pos.xRel < 0))
        { leftButtonStartDrag(cm, event, pos, behavior); }
      else
        { leftButtonSelect(cm, event, pos, behavior); }
    }

    // Start a text drag. When it ends, see if any dragging actually
    // happen, and treat as a click if it didn't.
    function leftButtonStartDrag(cm, event, pos, behavior) {
      var display = cm.display, moved = false;
      var dragEnd = operation(cm, function (e) {
        if (webkit) { display.scroller.draggable = false; }
        cm.state.draggingText = false;
        off(display.wrapper.ownerDocument, "mouseup", dragEnd);
        off(display.wrapper.ownerDocument, "mousemove", mouseMove);
        off(display.scroller, "dragstart", dragStart);
        off(display.scroller, "drop", dragEnd);
        if (!moved) {
          e_preventDefault(e);
          if (!behavior.addNew)
            { extendSelection(cm.doc, pos, null, null, behavior.extend); }
          // Work around unexplainable focus problem in IE9 (#2127) and Chrome (#3081)
          if (webkit || ie && ie_version == 9)
            { setTimeout(function () {display.wrapper.ownerDocument.body.focus(); display.input.focus();}, 20); }
          else
            { display.input.focus(); }
        }
      });
      var mouseMove = function(e2) {
        moved = moved || Math.abs(event.clientX - e2.clientX) + Math.abs(event.clientY - e2.clientY) >= 10;
      };
      var dragStart = function () { return moved = true; };
      // Let the drag handler handle this.
      if (webkit) { display.scroller.draggable = true; }
      cm.state.draggingText = dragEnd;
      dragEnd.copy = !behavior.moveOnDrag;
      // IE's approach to draggable
      if (display.scroller.dragDrop) { display.scroller.dragDrop(); }
      on(display.wrapper.ownerDocument, "mouseup", dragEnd);
      on(display.wrapper.ownerDocument, "mousemove", mouseMove);
      on(display.scroller, "dragstart", dragStart);
      on(display.scroller, "drop", dragEnd);

      delayBlurEvent(cm);
      setTimeout(function () { return display.input.focus(); }, 20);
    }

    function rangeForUnit(cm, pos, unit) {
      if (unit == "char") { return new Range(pos, pos) }
      if (unit == "word") { return cm.findWordAt(pos) }
      if (unit == "line") { return new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))) }
      var result = unit(cm, pos);
      return new Range(result.from, result.to)
    }

    // Normal selection, as opposed to text dragging.
    function leftButtonSelect(cm, event, start, behavior) {
      var display = cm.display, doc = cm.doc;
      e_preventDefault(event);

      var ourRange, ourIndex, startSel = doc.sel, ranges = startSel.ranges;
      if (behavior.addNew && !behavior.extend) {
        ourIndex = doc.sel.contains(start);
        if (ourIndex > -1)
          { ourRange = ranges[ourIndex]; }
        else
          { ourRange = new Range(start, start); }
      } else {
        ourRange = doc.sel.primary();
        ourIndex = doc.sel.primIndex;
      }

      if (behavior.unit == "rectangle") {
        if (!behavior.addNew) { ourRange = new Range(start, start); }
        start = posFromMouse(cm, event, true, true);
        ourIndex = -1;
      } else {
        var range$$1 = rangeForUnit(cm, start, behavior.unit);
        if (behavior.extend)
          { ourRange = extendRange(ourRange, range$$1.anchor, range$$1.head, behavior.extend); }
        else
          { ourRange = range$$1; }
      }

      if (!behavior.addNew) {
        ourIndex = 0;
        setSelection(doc, new Selection([ourRange], 0), sel_mouse);
        startSel = doc.sel;
      } else if (ourIndex == -1) {
        ourIndex = ranges.length;
        setSelection(doc, normalizeSelection(cm, ranges.concat([ourRange]), ourIndex),
                     {scroll: false, origin: "*mouse"});
      } else if (ranges.length > 1 && ranges[ourIndex].empty() && behavior.unit == "char" && !behavior.extend) {
        setSelection(doc, normalizeSelection(cm, ranges.slice(0, ourIndex).concat(ranges.slice(ourIndex + 1)), 0),
                     {scroll: false, origin: "*mouse"});
        startSel = doc.sel;
      } else {
        replaceOneSelection(doc, ourIndex, ourRange, sel_mouse);
      }

      var lastPos = start;
      function extendTo(pos) {
        if (cmp(lastPos, pos) == 0) { return }
        lastPos = pos;

        if (behavior.unit == "rectangle") {
          var ranges = [], tabSize = cm.options.tabSize;
          var startCol = countColumn(getLine(doc, start.line).text, start.ch, tabSize);
          var posCol = countColumn(getLine(doc, pos.line).text, pos.ch, tabSize);
          var left = Math.min(startCol, posCol), right = Math.max(startCol, posCol);
          for (var line = Math.min(start.line, pos.line), end = Math.min(cm.lastLine(), Math.max(start.line, pos.line));
               line <= end; line++) {
            var text = getLine(doc, line).text, leftPos = findColumn(text, left, tabSize);
            if (left == right)
              { ranges.push(new Range(Pos(line, leftPos), Pos(line, leftPos))); }
            else if (text.length > leftPos)
              { ranges.push(new Range(Pos(line, leftPos), Pos(line, findColumn(text, right, tabSize)))); }
          }
          if (!ranges.length) { ranges.push(new Range(start, start)); }
          setSelection(doc, normalizeSelection(cm, startSel.ranges.slice(0, ourIndex).concat(ranges), ourIndex),
                       {origin: "*mouse", scroll: false});
          cm.scrollIntoView(pos);
        } else {
          var oldRange = ourRange;
          var range$$1 = rangeForUnit(cm, pos, behavior.unit);
          var anchor = oldRange.anchor, head;
          if (cmp(range$$1.anchor, anchor) > 0) {
            head = range$$1.head;
            anchor = minPos(oldRange.from(), range$$1.anchor);
          } else {
            head = range$$1.anchor;
            anchor = maxPos(oldRange.to(), range$$1.head);
          }
          var ranges$1 = startSel.ranges.slice(0);
          ranges$1[ourIndex] = bidiSimplify(cm, new Range(clipPos(doc, anchor), head));
          setSelection(doc, normalizeSelection(cm, ranges$1, ourIndex), sel_mouse);
        }
      }

      var editorSize = display.wrapper.getBoundingClientRect();
      // Used to ensure timeout re-tries don't fire when another extend
      // happened in the meantime (clearTimeout isn't reliable -- at
      // least on Chrome, the timeouts still happen even when cleared,
      // if the clear happens after their scheduled firing time).
      var counter = 0;

      function extend(e) {
        var curCount = ++counter;
        var cur = posFromMouse(cm, e, true, behavior.unit == "rectangle");
        if (!cur) { return }
        if (cmp(cur, lastPos) != 0) {
          cm.curOp.focus = activeElt();
          extendTo(cur);
          var visible = visibleLines(display, doc);
          if (cur.line >= visible.to || cur.line < visible.from)
            { setTimeout(operation(cm, function () {if (counter == curCount) { extend(e); }}), 150); }
        } else {
          var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
          if (outside) { setTimeout(operation(cm, function () {
            if (counter != curCount) { return }
            display.scroller.scrollTop += outside;
            extend(e);
          }), 50); }
        }
      }

      function done(e) {
        cm.state.selectingText = false;
        counter = Infinity;
        // If e is null or undefined we interpret this as someone trying
        // to explicitly cancel the selection rather than the user
        // letting go of the mouse button.
        if (e) {
          e_preventDefault(e);
          display.input.focus();
        }
        off(display.wrapper.ownerDocument, "mousemove", move);
        off(display.wrapper.ownerDocument, "mouseup", up);
        doc.history.lastSelOrigin = null;
      }

      var move = operation(cm, function (e) {
        if (e.buttons === 0 || !e_button(e)) { done(e); }
        else { extend(e); }
      });
      var up = operation(cm, done);
      cm.state.selectingText = up;
      on(display.wrapper.ownerDocument, "mousemove", move);
      on(display.wrapper.ownerDocument, "mouseup", up);
    }

    // Used when mouse-selecting to adjust the anchor to the proper side
    // of a bidi jump depending on the visual position of the head.
    function bidiSimplify(cm, range$$1) {
      var anchor = range$$1.anchor;
      var head = range$$1.head;
      var anchorLine = getLine(cm.doc, anchor.line);
      if (cmp(anchor, head) == 0 && anchor.sticky == head.sticky) { return range$$1 }
      var order = getOrder(anchorLine);
      if (!order) { return range$$1 }
      var index = getBidiPartAt(order, anchor.ch, anchor.sticky), part = order[index];
      if (part.from != anchor.ch && part.to != anchor.ch) { return range$$1 }
      var boundary = index + ((part.from == anchor.ch) == (part.level != 1) ? 0 : 1);
      if (boundary == 0 || boundary == order.length) { return range$$1 }

      // Compute the relative visual position of the head compared to the
      // anchor (<0 is to the left, >0 to the right)
      var leftSide;
      if (head.line != anchor.line) {
        leftSide = (head.line - anchor.line) * (cm.doc.direction == "ltr" ? 1 : -1) > 0;
      } else {
        var headIndex = getBidiPartAt(order, head.ch, head.sticky);
        var dir = headIndex - index || (head.ch - anchor.ch) * (part.level == 1 ? -1 : 1);
        if (headIndex == boundary - 1 || headIndex == boundary)
          { leftSide = dir < 0; }
        else
          { leftSide = dir > 0; }
      }

      var usePart = order[boundary + (leftSide ? -1 : 0)];
      var from = leftSide == (usePart.level == 1);
      var ch = from ? usePart.from : usePart.to, sticky = from ? "after" : "before";
      return anchor.ch == ch && anchor.sticky == sticky ? range$$1 : new Range(new Pos(anchor.line, ch, sticky), head)
    }


    // Determines whether an event happened in the gutter, and fires the
    // handlers for the corresponding event.
    function gutterEvent(cm, e, type, prevent) {
      var mX, mY;
      if (e.touches) {
        mX = e.touches[0].clientX;
        mY = e.touches[0].clientY;
      } else {
        try { mX = e.clientX; mY = e.clientY; }
        catch(e) { return false }
      }
      if (mX >= Math.floor(cm.display.gutters.getBoundingClientRect().right)) { return false }
      if (prevent) { e_preventDefault(e); }

      var display = cm.display;
      var lineBox = display.lineDiv.getBoundingClientRect();

      if (mY > lineBox.bottom || !hasHandler(cm, type)) { return e_defaultPrevented(e) }
      mY -= lineBox.top - display.viewOffset;

      for (var i = 0; i < cm.display.gutterSpecs.length; ++i) {
        var g = display.gutters.childNodes[i];
        if (g && g.getBoundingClientRect().right >= mX) {
          var line = lineAtHeight(cm.doc, mY);
          var gutter = cm.display.gutterSpecs[i];
          signal(cm, type, cm, line, gutter.className, e);
          return e_defaultPrevented(e)
        }
      }
    }

    function clickInGutter(cm, e) {
      return gutterEvent(cm, e, "gutterClick", true)
    }

    // CONTEXT MENU HANDLING

    // To make the context menu work, we need to briefly unhide the
    // textarea (making it as unobtrusive as possible) to let the
    // right-click take effect on it.
    function onContextMenu(cm, e) {
      if (eventInWidget(cm.display, e) || contextMenuInGutter(cm, e)) { return }
      if (signalDOMEvent(cm, e, "contextmenu")) { return }
      if (!captureRightClick) { cm.display.input.onContextMenu(e); }
    }

    function contextMenuInGutter(cm, e) {
      if (!hasHandler(cm, "gutterContextMenu")) { return false }
      return gutterEvent(cm, e, "gutterContextMenu", false)
    }

    function themeChanged(cm) {
      cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
        cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
      clearCaches(cm);
    }

    var Init = {toString: function(){return "CodeMirror.Init"}};

    var defaults = {};
    var optionHandlers = {};

    function defineOptions(CodeMirror) {
      var optionHandlers = CodeMirror.optionHandlers;

      function option(name, deflt, handle, notOnInit) {
        CodeMirror.defaults[name] = deflt;
        if (handle) { optionHandlers[name] =
          notOnInit ? function (cm, val, old) {if (old != Init) { handle(cm, val, old); }} : handle; }
      }

      CodeMirror.defineOption = option;

      // Passed to option handlers when there is no old value.
      CodeMirror.Init = Init;

      // These two are, on init, called from the constructor because they
      // have to be initialized before the editor can start at all.
      option("value", "", function (cm, val) { return cm.setValue(val); }, true);
      option("mode", null, function (cm, val) {
        cm.doc.modeOption = val;
        loadMode(cm);
      }, true);

      option("indentUnit", 2, loadMode, true);
      option("indentWithTabs", false);
      option("smartIndent", true);
      option("tabSize", 4, function (cm) {
        resetModeState(cm);
        clearCaches(cm);
        regChange(cm);
      }, true);

      option("lineSeparator", null, function (cm, val) {
        cm.doc.lineSep = val;
        if (!val) { return }
        var newBreaks = [], lineNo = cm.doc.first;
        cm.doc.iter(function (line) {
          for (var pos = 0;;) {
            var found = line.text.indexOf(val, pos);
            if (found == -1) { break }
            pos = found + val.length;
            newBreaks.push(Pos(lineNo, found));
          }
          lineNo++;
        });
        for (var i = newBreaks.length - 1; i >= 0; i--)
          { replaceRange(cm.doc, val, newBreaks[i], Pos(newBreaks[i].line, newBreaks[i].ch + val.length)); }
      });
      option("specialChars", /[\u0000-\u001f\u007f-\u009f\u00ad\u061c\u200b-\u200f\u2028\u2029\ufeff\ufff9-\ufffc]/g, function (cm, val, old) {
        cm.state.specialChars = new RegExp(val.source + (val.test("\t") ? "" : "|\t"), "g");
        if (old != Init) { cm.refresh(); }
      });
      option("specialCharPlaceholder", defaultSpecialCharPlaceholder, function (cm) { return cm.refresh(); }, true);
      option("electricChars", true);
      option("inputStyle", mobile ? "contenteditable" : "textarea", function () {
        throw new Error("inputStyle can not (yet) be changed in a running editor") // FIXME
      }, true);
      option("spellcheck", false, function (cm, val) { return cm.getInputField().spellcheck = val; }, true);
      option("autocorrect", false, function (cm, val) { return cm.getInputField().autocorrect = val; }, true);
      option("autocapitalize", false, function (cm, val) { return cm.getInputField().autocapitalize = val; }, true);
      option("rtlMoveVisually", !windows);
      option("wholeLineUpdateBefore", true);

      option("theme", "default", function (cm) {
        themeChanged(cm);
        updateGutters(cm);
      }, true);
      option("keyMap", "default", function (cm, val, old) {
        var next = getKeyMap(val);
        var prev = old != Init && getKeyMap(old);
        if (prev && prev.detach) { prev.detach(cm, next); }
        if (next.attach) { next.attach(cm, prev || null); }
      });
      option("extraKeys", null);
      option("configureMouse", null);

      option("lineWrapping", false, wrappingChanged, true);
      option("gutters", [], function (cm, val) {
        cm.display.gutterSpecs = getGutters(val, cm.options.lineNumbers);
        updateGutters(cm);
      }, true);
      option("fixedGutter", true, function (cm, val) {
        cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
        cm.refresh();
      }, true);
      option("coverGutterNextToScrollbar", false, function (cm) { return updateScrollbars(cm); }, true);
      option("scrollbarStyle", "native", function (cm) {
        initScrollbars(cm);
        updateScrollbars(cm);
        cm.display.scrollbars.setScrollTop(cm.doc.scrollTop);
        cm.display.scrollbars.setScrollLeft(cm.doc.scrollLeft);
      }, true);
      option("lineNumbers", false, function (cm, val) {
        cm.display.gutterSpecs = getGutters(cm.options.gutters, val);
        updateGutters(cm);
      }, true);
      option("firstLineNumber", 1, updateGutters, true);
      option("lineNumberFormatter", function (integer) { return integer; }, updateGutters, true);
      option("showCursorWhenSelecting", false, updateSelection, true);

      option("resetSelectionOnContextMenu", true);
      option("lineWiseCopyCut", true);
      option("pasteLinesPerSelection", true);
      option("selectionsMayTouch", false);

      option("readOnly", false, function (cm, val) {
        if (val == "nocursor") {
          onBlur(cm);
          cm.display.input.blur();
        }
        cm.display.input.readOnlyChanged(val);
      });
      option("disableInput", false, function (cm, val) {if (!val) { cm.display.input.reset(); }}, true);
      option("dragDrop", true, dragDropChanged);
      option("allowDropFileTypes", null);

      option("cursorBlinkRate", 530);
      option("cursorScrollMargin", 0);
      option("cursorHeight", 1, updateSelection, true);
      option("singleCursorHeightPerLine", true, updateSelection, true);
      option("workTime", 100);
      option("workDelay", 100);
      option("flattenSpans", true, resetModeState, true);
      option("addModeClass", false, resetModeState, true);
      option("pollInterval", 100);
      option("undoDepth", 200, function (cm, val) { return cm.doc.history.undoDepth = val; });
      option("historyEventDelay", 1250);
      option("viewportMargin", 10, function (cm) { return cm.refresh(); }, true);
      option("maxHighlightLength", 10000, resetModeState, true);
      option("moveInputWithCursor", true, function (cm, val) {
        if (!val) { cm.display.input.resetPosition(); }
      });

      option("tabindex", null, function (cm, val) { return cm.display.input.getField().tabIndex = val || ""; });
      option("autofocus", null);
      option("direction", "ltr", function (cm, val) { return cm.doc.setDirection(val); }, true);
      option("phrases", null);
    }

    function dragDropChanged(cm, value, old) {
      var wasOn = old && old != Init;
      if (!value != !wasOn) {
        var funcs = cm.display.dragFunctions;
        var toggle = value ? on : off;
        toggle(cm.display.scroller, "dragstart", funcs.start);
        toggle(cm.display.scroller, "dragenter", funcs.enter);
        toggle(cm.display.scroller, "dragover", funcs.over);
        toggle(cm.display.scroller, "dragleave", funcs.leave);
        toggle(cm.display.scroller, "drop", funcs.drop);
      }
    }

    function wrappingChanged(cm) {
      if (cm.options.lineWrapping) {
        addClass(cm.display.wrapper, "CodeMirror-wrap");
        cm.display.sizer.style.minWidth = "";
        cm.display.sizerWidth = null;
      } else {
        rmClass(cm.display.wrapper, "CodeMirror-wrap");
        findMaxLine(cm);
      }
      estimateLineHeights(cm);
      regChange(cm);
      clearCaches(cm);
      setTimeout(function () { return updateScrollbars(cm); }, 100);
    }

    // A CodeMirror instance represents an editor. This is the object
    // that user code is usually dealing with.

    function CodeMirror(place, options) {
      var this$1 = this;

      if (!(this instanceof CodeMirror)) { return new CodeMirror(place, options) }

      this.options = options = options ? copyObj(options) : {};
      // Determine effective options based on given values and defaults.
      copyObj(defaults, options, false);

      var doc = options.value;
      if (typeof doc == "string") { doc = new Doc(doc, options.mode, null, options.lineSeparator, options.direction); }
      else if (options.mode) { doc.modeOption = options.mode; }
      this.doc = doc;

      var input = new CodeMirror.inputStyles[options.inputStyle](this);
      var display = this.display = new Display(place, doc, input, options);
      display.wrapper.CodeMirror = this;
      themeChanged(this);
      if (options.lineWrapping)
        { this.display.wrapper.className += " CodeMirror-wrap"; }
      initScrollbars(this);

      this.state = {
        keyMaps: [],  // stores maps added by addKeyMap
        overlays: [], // highlighting overlays, as added by addOverlay
        modeGen: 0,   // bumped when mode/overlay changes, used to invalidate highlighting info
        overwrite: false,
        delayingBlurEvent: false,
        focused: false,
        suppressEdits: false, // used to disable editing during key handlers when in readOnly mode
        pasteIncoming: -1, cutIncoming: -1, // help recognize paste/cut edits in input.poll
        selectingText: false,
        draggingText: false,
        highlight: new Delayed(), // stores highlight worker timeout
        keySeq: null,  // Unfinished key sequence
        specialChars: null
      };

      if (options.autofocus && !mobile) { display.input.focus(); }

      // Override magic textarea content restore that IE sometimes does
      // on our hidden textarea on reload
      if (ie && ie_version < 11) { setTimeout(function () { return this$1.display.input.reset(true); }, 20); }

      registerEventHandlers(this);
      ensureGlobalHandlers();

      startOperation(this);
      this.curOp.forceUpdate = true;
      attachDoc(this, doc);

      if ((options.autofocus && !mobile) || this.hasFocus())
        { setTimeout(bind(onFocus, this), 20); }
      else
        { onBlur(this); }

      for (var opt in optionHandlers) { if (optionHandlers.hasOwnProperty(opt))
        { optionHandlers[opt](this$1, options[opt], Init); } }
      maybeUpdateLineNumberWidth(this);
      if (options.finishInit) { options.finishInit(this); }
      for (var i = 0; i < initHooks.length; ++i) { initHooks[i](this$1); }
      endOperation(this);
      // Suppress optimizelegibility in Webkit, since it breaks text
      // measuring on line wrapping boundaries.
      if (webkit && options.lineWrapping &&
          getComputedStyle(display.lineDiv).textRendering == "optimizelegibility")
        { display.lineDiv.style.textRendering = "auto"; }
    }

    // The default configuration options.
    CodeMirror.defaults = defaults;
    // Functions to run when options are changed.
    CodeMirror.optionHandlers = optionHandlers;

    // Attach the necessary event handlers when initializing the editor
    function registerEventHandlers(cm) {
      var d = cm.display;
      on(d.scroller, "mousedown", operation(cm, onMouseDown));
      // Older IE's will not fire a second mousedown for a double click
      if (ie && ie_version < 11)
        { on(d.scroller, "dblclick", operation(cm, function (e) {
          if (signalDOMEvent(cm, e)) { return }
          var pos = posFromMouse(cm, e);
          if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) { return }
          e_preventDefault(e);
          var word = cm.findWordAt(pos);
          extendSelection(cm.doc, word.anchor, word.head);
        })); }
      else
        { on(d.scroller, "dblclick", function (e) { return signalDOMEvent(cm, e) || e_preventDefault(e); }); }
      // Some browsers fire contextmenu *after* opening the menu, at
      // which point we can't mess with it anymore. Context menu is
      // handled in onMouseDown for these browsers.
      on(d.scroller, "contextmenu", function (e) { return onContextMenu(cm, e); });

      // Used to suppress mouse event handling when a touch happens
      var touchFinished, prevTouch = {end: 0};
      function finishTouch() {
        if (d.activeTouch) {
          touchFinished = setTimeout(function () { return d.activeTouch = null; }, 1000);
          prevTouch = d.activeTouch;
          prevTouch.end = +new Date;
        }
      }
      function isMouseLikeTouchEvent(e) {
        if (e.touches.length != 1) { return false }
        var touch = e.touches[0];
        return touch.radiusX <= 1 && touch.radiusY <= 1
      }
      function farAway(touch, other) {
        if (other.left == null) { return true }
        var dx = other.left - touch.left, dy = other.top - touch.top;
        return dx * dx + dy * dy > 20 * 20
      }
      on(d.scroller, "touchstart", function (e) {
        if (!signalDOMEvent(cm, e) && !isMouseLikeTouchEvent(e) && !clickInGutter(cm, e)) {
          d.input.ensurePolled();
          clearTimeout(touchFinished);
          var now = +new Date;
          d.activeTouch = {start: now, moved: false,
                           prev: now - prevTouch.end <= 300 ? prevTouch : null};
          if (e.touches.length == 1) {
            d.activeTouch.left = e.touches[0].pageX;
            d.activeTouch.top = e.touches[0].pageY;
          }
        }
      });
      on(d.scroller, "touchmove", function () {
        if (d.activeTouch) { d.activeTouch.moved = true; }
      });
      on(d.scroller, "touchend", function (e) {
        var touch = d.activeTouch;
        if (touch && !eventInWidget(d, e) && touch.left != null &&
            !touch.moved && new Date - touch.start < 300) {
          var pos = cm.coordsChar(d.activeTouch, "page"), range;
          if (!touch.prev || farAway(touch, touch.prev)) // Single tap
            { range = new Range(pos, pos); }
          else if (!touch.prev.prev || farAway(touch, touch.prev.prev)) // Double tap
            { range = cm.findWordAt(pos); }
          else // Triple tap
            { range = new Range(Pos(pos.line, 0), clipPos(cm.doc, Pos(pos.line + 1, 0))); }
          cm.setSelection(range.anchor, range.head);
          cm.focus();
          e_preventDefault(e);
        }
        finishTouch();
      });
      on(d.scroller, "touchcancel", finishTouch);

      // Sync scrolling between fake scrollbars and real scrollable
      // area, ensure viewport is updated when scrolling.
      on(d.scroller, "scroll", function () {
        if (d.scroller.clientHeight) {
          updateScrollTop(cm, d.scroller.scrollTop);
          setScrollLeft(cm, d.scroller.scrollLeft, true);
          signal(cm, "scroll", cm);
        }
      });

      // Listen to wheel events in order to try and update the viewport on time.
      on(d.scroller, "mousewheel", function (e) { return onScrollWheel(cm, e); });
      on(d.scroller, "DOMMouseScroll", function (e) { return onScrollWheel(cm, e); });

      // Prevent wrapper from ever scrolling
      on(d.wrapper, "scroll", function () { return d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

      d.dragFunctions = {
        enter: function (e) {if (!signalDOMEvent(cm, e)) { e_stop(e); }},
        over: function (e) {if (!signalDOMEvent(cm, e)) { onDragOver(cm, e); e_stop(e); }},
        start: function (e) { return onDragStart(cm, e); },
        drop: operation(cm, onDrop),
        leave: function (e) {if (!signalDOMEvent(cm, e)) { clearDragCursor(cm); }}
      };

      var inp = d.input.getField();
      on(inp, "keyup", function (e) { return onKeyUp.call(cm, e); });
      on(inp, "keydown", operation(cm, onKeyDown));
      on(inp, "keypress", operation(cm, onKeyPress));
      on(inp, "focus", function (e) { return onFocus(cm, e); });
      on(inp, "blur", function (e) { return onBlur(cm, e); });
    }

    var initHooks = [];
    CodeMirror.defineInitHook = function (f) { return initHooks.push(f); };

    // Indent the given line. The how parameter can be "smart",
    // "add"/null, "subtract", or "prev". When aggressive is false
    // (typically set to true for forced single-line indents), empty
    // lines are not indented, and places where the mode returns Pass
    // are left alone.
    function indentLine(cm, n, how, aggressive) {
      var doc = cm.doc, state;
      if (how == null) { how = "add"; }
      if (how == "smart") {
        // Fall back to "prev" when the mode doesn't have an indentation
        // method.
        if (!doc.mode.indent) { how = "prev"; }
        else { state = getContextBefore(cm, n).state; }
      }

      var tabSize = cm.options.tabSize;
      var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
      if (line.stateAfter) { line.stateAfter = null; }
      var curSpaceString = line.text.match(/^\s*/)[0], indentation;
      if (!aggressive && !/\S/.test(line.text)) {
        indentation = 0;
        how = "not";
      } else if (how == "smart") {
        indentation = doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
        if (indentation == Pass || indentation > 150) {
          if (!aggressive) { return }
          how = "prev";
        }
      }
      if (how == "prev") {
        if (n > doc.first) { indentation = countColumn(getLine(doc, n-1).text, null, tabSize); }
        else { indentation = 0; }
      } else if (how == "add") {
        indentation = curSpace + cm.options.indentUnit;
      } else if (how == "subtract") {
        indentation = curSpace - cm.options.indentUnit;
      } else if (typeof how == "number") {
        indentation = curSpace + how;
      }
      indentation = Math.max(0, indentation);

      var indentString = "", pos = 0;
      if (cm.options.indentWithTabs)
        { for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";} }
      if (pos < indentation) { indentString += spaceStr(indentation - pos); }

      if (indentString != curSpaceString) {
        replaceRange(doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
        line.stateAfter = null;
        return true
      } else {
        // Ensure that, if the cursor was in the whitespace at the start
        // of the line, it is moved to the end of that space.
        for (var i$1 = 0; i$1 < doc.sel.ranges.length; i$1++) {
          var range = doc.sel.ranges[i$1];
          if (range.head.line == n && range.head.ch < curSpaceString.length) {
            var pos$1 = Pos(n, curSpaceString.length);
            replaceOneSelection(doc, i$1, new Range(pos$1, pos$1));
            break
          }
        }
      }
    }

    // This will be set to a {lineWise: bool, text: [string]} object, so
    // that, when pasting, we know what kind of selections the copied
    // text was made out of.
    var lastCopied = null;

    function setLastCopied(newLastCopied) {
      lastCopied = newLastCopied;
    }

    function applyTextInput(cm, inserted, deleted, sel, origin) {
      var doc = cm.doc;
      cm.display.shift = false;
      if (!sel) { sel = doc.sel; }

      var recent = +new Date - 200;
      var paste = origin == "paste" || cm.state.pasteIncoming > recent;
      var textLines = splitLinesAuto(inserted), multiPaste = null;
      // When pasting N lines into N selections, insert one line per selection
      if (paste && sel.ranges.length > 1) {
        if (lastCopied && lastCopied.text.join("\n") == inserted) {
          if (sel.ranges.length % lastCopied.text.length == 0) {
            multiPaste = [];
            for (var i = 0; i < lastCopied.text.length; i++)
              { multiPaste.push(doc.splitLines(lastCopied.text[i])); }
          }
        } else if (textLines.length == sel.ranges.length && cm.options.pasteLinesPerSelection) {
          multiPaste = map(textLines, function (l) { return [l]; });
        }
      }

      var updateInput = cm.curOp.updateInput;
      // Normal behavior is to insert the new text into every selection
      for (var i$1 = sel.ranges.length - 1; i$1 >= 0; i$1--) {
        var range$$1 = sel.ranges[i$1];
        var from = range$$1.from(), to = range$$1.to();
        if (range$$1.empty()) {
          if (deleted && deleted > 0) // Handle deletion
            { from = Pos(from.line, from.ch - deleted); }
          else if (cm.state.overwrite && !paste) // Handle overwrite
            { to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + lst(textLines).length)); }
          else if (paste && lastCopied && lastCopied.lineWise && lastCopied.text.join("\n") == inserted)
            { from = to = Pos(from.line, 0); }
        }
        var changeEvent = {from: from, to: to, text: multiPaste ? multiPaste[i$1 % multiPaste.length] : textLines,
                           origin: origin || (paste ? "paste" : cm.state.cutIncoming > recent ? "cut" : "+input")};
        makeChange(cm.doc, changeEvent);
        signalLater(cm, "inputRead", cm, changeEvent);
      }
      if (inserted && !paste)
        { triggerElectric(cm, inserted); }

      ensureCursorVisible(cm);
      if (cm.curOp.updateInput < 2) { cm.curOp.updateInput = updateInput; }
      cm.curOp.typing = true;
      cm.state.pasteIncoming = cm.state.cutIncoming = -1;
    }

    function handlePaste(e, cm) {
      var pasted = e.clipboardData && e.clipboardData.getData("Text");
      if (pasted) {
        e.preventDefault();
        if (!cm.isReadOnly() && !cm.options.disableInput)
          { runInOp(cm, function () { return applyTextInput(cm, pasted, 0, null, "paste"); }); }
        return true
      }
    }

    function triggerElectric(cm, inserted) {
      // When an 'electric' character is inserted, immediately trigger a reindent
      if (!cm.options.electricChars || !cm.options.smartIndent) { return }
      var sel = cm.doc.sel;

      for (var i = sel.ranges.length - 1; i >= 0; i--) {
        var range$$1 = sel.ranges[i];
        if (range$$1.head.ch > 100 || (i && sel.ranges[i - 1].head.line == range$$1.head.line)) { continue }
        var mode = cm.getModeAt(range$$1.head);
        var indented = false;
        if (mode.electricChars) {
          for (var j = 0; j < mode.electricChars.length; j++)
            { if (inserted.indexOf(mode.electricChars.charAt(j)) > -1) {
              indented = indentLine(cm, range$$1.head.line, "smart");
              break
            } }
        } else if (mode.electricInput) {
          if (mode.electricInput.test(getLine(cm.doc, range$$1.head.line).text.slice(0, range$$1.head.ch)))
            { indented = indentLine(cm, range$$1.head.line, "smart"); }
        }
        if (indented) { signalLater(cm, "electricInput", cm, range$$1.head.line); }
      }
    }

    function copyableRanges(cm) {
      var text = [], ranges = [];
      for (var i = 0; i < cm.doc.sel.ranges.length; i++) {
        var line = cm.doc.sel.ranges[i].head.line;
        var lineRange = {anchor: Pos(line, 0), head: Pos(line + 1, 0)};
        ranges.push(lineRange);
        text.push(cm.getRange(lineRange.anchor, lineRange.head));
      }
      return {text: text, ranges: ranges}
    }

    function disableBrowserMagic(field, spellcheck, autocorrect, autocapitalize) {
      field.setAttribute("autocorrect", autocorrect ? "" : "off");
      field.setAttribute("autocapitalize", autocapitalize ? "" : "off");
      field.setAttribute("spellcheck", !!spellcheck);
    }

    function hiddenTextarea() {
      var te = elt("textarea", null, null, "position: absolute; bottom: -1em; padding: 0; width: 1px; height: 1em; outline: none");
      var div = elt("div", [te], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
      // The textarea is kept positioned near the cursor to prevent the
      // fact that it'll be scrolled into view on input from scrolling
      // our fake cursor out of view. On webkit, when wrap=off, paste is
      // very slow. So make the area wide instead.
      if (webkit) { te.style.width = "1000px"; }
      else { te.setAttribute("wrap", "off"); }
      // If border: 0; -- iOS fails to open keyboard (issue #1287)
      if (ios) { te.style.border = "1px solid black"; }
      disableBrowserMagic(te);
      return div
    }

    // The publicly visible API. Note that methodOp(f) means
    // 'wrap f in an operation, performed on its `this` parameter'.

    // This is not the complete set of editor methods. Most of the
    // methods defined on the Doc type are also injected into
    // CodeMirror.prototype, for backwards compatibility and
    // convenience.

    function addEditorMethods(CodeMirror) {
      var optionHandlers = CodeMirror.optionHandlers;

      var helpers = CodeMirror.helpers = {};

      CodeMirror.prototype = {
        constructor: CodeMirror,
        focus: function(){window.focus(); this.display.input.focus();},

        setOption: function(option, value) {
          var options = this.options, old = options[option];
          if (options[option] == value && option != "mode") { return }
          options[option] = value;
          if (optionHandlers.hasOwnProperty(option))
            { operation(this, optionHandlers[option])(this, value, old); }
          signal(this, "optionChange", this, option);
        },

        getOption: function(option) {return this.options[option]},
        getDoc: function() {return this.doc},

        addKeyMap: function(map$$1, bottom) {
          this.state.keyMaps[bottom ? "push" : "unshift"](getKeyMap(map$$1));
        },
        removeKeyMap: function(map$$1) {
          var maps = this.state.keyMaps;
          for (var i = 0; i < maps.length; ++i)
            { if (maps[i] == map$$1 || maps[i].name == map$$1) {
              maps.splice(i, 1);
              return true
            } }
        },

        addOverlay: methodOp(function(spec, options) {
          var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
          if (mode.startState) { throw new Error("Overlays may not be stateful.") }
          insertSorted(this.state.overlays,
                       {mode: mode, modeSpec: spec, opaque: options && options.opaque,
                        priority: (options && options.priority) || 0},
                       function (overlay) { return overlay.priority; });
          this.state.modeGen++;
          regChange(this);
        }),
        removeOverlay: methodOp(function(spec) {
          var this$1 = this;

          var overlays = this.state.overlays;
          for (var i = 0; i < overlays.length; ++i) {
            var cur = overlays[i].modeSpec;
            if (cur == spec || typeof spec == "string" && cur.name == spec) {
              overlays.splice(i, 1);
              this$1.state.modeGen++;
              regChange(this$1);
              return
            }
          }
        }),

        indentLine: methodOp(function(n, dir, aggressive) {
          if (typeof dir != "string" && typeof dir != "number") {
            if (dir == null) { dir = this.options.smartIndent ? "smart" : "prev"; }
            else { dir = dir ? "add" : "subtract"; }
          }
          if (isLine(this.doc, n)) { indentLine(this, n, dir, aggressive); }
        }),
        indentSelection: methodOp(function(how) {
          var this$1 = this;

          var ranges = this.doc.sel.ranges, end = -1;
          for (var i = 0; i < ranges.length; i++) {
            var range$$1 = ranges[i];
            if (!range$$1.empty()) {
              var from = range$$1.from(), to = range$$1.to();
              var start = Math.max(end, from.line);
              end = Math.min(this$1.lastLine(), to.line - (to.ch ? 0 : 1)) + 1;
              for (var j = start; j < end; ++j)
                { indentLine(this$1, j, how); }
              var newRanges = this$1.doc.sel.ranges;
              if (from.ch == 0 && ranges.length == newRanges.length && newRanges[i].from().ch > 0)
                { replaceOneSelection(this$1.doc, i, new Range(from, newRanges[i].to()), sel_dontScroll); }
            } else if (range$$1.head.line > end) {
              indentLine(this$1, range$$1.head.line, how, true);
              end = range$$1.head.line;
              if (i == this$1.doc.sel.primIndex) { ensureCursorVisible(this$1); }
            }
          }
        }),

        // Fetch the parser token for a given character. Useful for hacks
        // that want to inspect the mode state (say, for completion).
        getTokenAt: function(pos, precise) {
          return takeToken(this, pos, precise)
        },

        getLineTokens: function(line, precise) {
          return takeToken(this, Pos(line), precise, true)
        },

        getTokenTypeAt: function(pos) {
          pos = clipPos(this.doc, pos);
          var styles = getLineStyles(this, getLine(this.doc, pos.line));
          var before = 0, after = (styles.length - 1) / 2, ch = pos.ch;
          var type;
          if (ch == 0) { type = styles[2]; }
          else { for (;;) {
            var mid = (before + after) >> 1;
            if ((mid ? styles[mid * 2 - 1] : 0) >= ch) { after = mid; }
            else if (styles[mid * 2 + 1] < ch) { before = mid + 1; }
            else { type = styles[mid * 2 + 2]; break }
          } }
          var cut = type ? type.indexOf("overlay ") : -1;
          return cut < 0 ? type : cut == 0 ? null : type.slice(0, cut - 1)
        },

        getModeAt: function(pos) {
          var mode = this.doc.mode;
          if (!mode.innerMode) { return mode }
          return CodeMirror.innerMode(mode, this.getTokenAt(pos).state).mode
        },

        getHelper: function(pos, type) {
          return this.getHelpers(pos, type)[0]
        },

        getHelpers: function(pos, type) {
          var this$1 = this;

          var found = [];
          if (!helpers.hasOwnProperty(type)) { return found }
          var help = helpers[type], mode = this.getModeAt(pos);
          if (typeof mode[type] == "string") {
            if (help[mode[type]]) { found.push(help[mode[type]]); }
          } else if (mode[type]) {
            for (var i = 0; i < mode[type].length; i++) {
              var val = help[mode[type][i]];
              if (val) { found.push(val); }
            }
          } else if (mode.helperType && help[mode.helperType]) {
            found.push(help[mode.helperType]);
          } else if (help[mode.name]) {
            found.push(help[mode.name]);
          }
          for (var i$1 = 0; i$1 < help._global.length; i$1++) {
            var cur = help._global[i$1];
            if (cur.pred(mode, this$1) && indexOf(found, cur.val) == -1)
              { found.push(cur.val); }
          }
          return found
        },

        getStateAfter: function(line, precise) {
          var doc = this.doc;
          line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
          return getContextBefore(this, line + 1, precise).state
        },

        cursorCoords: function(start, mode) {
          var pos, range$$1 = this.doc.sel.primary();
          if (start == null) { pos = range$$1.head; }
          else if (typeof start == "object") { pos = clipPos(this.doc, start); }
          else { pos = start ? range$$1.from() : range$$1.to(); }
          return cursorCoords(this, pos, mode || "page")
        },

        charCoords: function(pos, mode) {
          return charCoords(this, clipPos(this.doc, pos), mode || "page")
        },

        coordsChar: function(coords, mode) {
          coords = fromCoordSystem(this, coords, mode || "page");
          return coordsChar(this, coords.left, coords.top)
        },

        lineAtHeight: function(height, mode) {
          height = fromCoordSystem(this, {top: height, left: 0}, mode || "page").top;
          return lineAtHeight(this.doc, height + this.display.viewOffset)
        },
        heightAtLine: function(line, mode, includeWidgets) {
          var end = false, lineObj;
          if (typeof line == "number") {
            var last = this.doc.first + this.doc.size - 1;
            if (line < this.doc.first) { line = this.doc.first; }
            else if (line > last) { line = last; end = true; }
            lineObj = getLine(this.doc, line);
          } else {
            lineObj = line;
          }
          return intoCoordSystem(this, lineObj, {top: 0, left: 0}, mode || "page", includeWidgets || end).top +
            (end ? this.doc.height - heightAtLine(lineObj) : 0)
        },

        defaultTextHeight: function() { return textHeight(this.display) },
        defaultCharWidth: function() { return charWidth(this.display) },

        getViewport: function() { return {from: this.display.viewFrom, to: this.display.viewTo}},

        addWidget: function(pos, node, scroll, vert, horiz) {
          var display = this.display;
          pos = cursorCoords(this, clipPos(this.doc, pos));
          var top = pos.bottom, left = pos.left;
          node.style.position = "absolute";
          node.setAttribute("cm-ignore-events", "true");
          this.display.input.setUneditable(node);
          display.sizer.appendChild(node);
          if (vert == "over") {
            top = pos.top;
          } else if (vert == "above" || vert == "near") {
            var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
            hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
            // Default to positioning above (if specified and possible); otherwise default to positioning below
            if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
              { top = pos.top - node.offsetHeight; }
            else if (pos.bottom + node.offsetHeight <= vspace)
              { top = pos.bottom; }
            if (left + node.offsetWidth > hspace)
              { left = hspace - node.offsetWidth; }
          }
          node.style.top = top + "px";
          node.style.left = node.style.right = "";
          if (horiz == "right") {
            left = display.sizer.clientWidth - node.offsetWidth;
            node.style.right = "0px";
          } else {
            if (horiz == "left") { left = 0; }
            else if (horiz == "middle") { left = (display.sizer.clientWidth - node.offsetWidth) / 2; }
            node.style.left = left + "px";
          }
          if (scroll)
            { scrollIntoView(this, {left: left, top: top, right: left + node.offsetWidth, bottom: top + node.offsetHeight}); }
        },

        triggerOnKeyDown: methodOp(onKeyDown),
        triggerOnKeyPress: methodOp(onKeyPress),
        triggerOnKeyUp: onKeyUp,
        triggerOnMouseDown: methodOp(onMouseDown),

        execCommand: function(cmd) {
          if (commands.hasOwnProperty(cmd))
            { return commands[cmd].call(null, this) }
        },

        triggerElectric: methodOp(function(text) { triggerElectric(this, text); }),

        findPosH: function(from, amount, unit, visually) {
          var this$1 = this;

          var dir = 1;
          if (amount < 0) { dir = -1; amount = -amount; }
          var cur = clipPos(this.doc, from);
          for (var i = 0; i < amount; ++i) {
            cur = findPosH(this$1.doc, cur, dir, unit, visually);
            if (cur.hitSide) { break }
          }
          return cur
        },

        moveH: methodOp(function(dir, unit) {
          var this$1 = this;

          this.extendSelectionsBy(function (range$$1) {
            if (this$1.display.shift || this$1.doc.extend || range$$1.empty())
              { return findPosH(this$1.doc, range$$1.head, dir, unit, this$1.options.rtlMoveVisually) }
            else
              { return dir < 0 ? range$$1.from() : range$$1.to() }
          }, sel_move);
        }),

        deleteH: methodOp(function(dir, unit) {
          var sel = this.doc.sel, doc = this.doc;
          if (sel.somethingSelected())
            { doc.replaceSelection("", null, "+delete"); }
          else
            { deleteNearSelection(this, function (range$$1) {
              var other = findPosH(doc, range$$1.head, dir, unit, false);
              return dir < 0 ? {from: other, to: range$$1.head} : {from: range$$1.head, to: other}
            }); }
        }),

        findPosV: function(from, amount, unit, goalColumn) {
          var this$1 = this;

          var dir = 1, x = goalColumn;
          if (amount < 0) { dir = -1; amount = -amount; }
          var cur = clipPos(this.doc, from);
          for (var i = 0; i < amount; ++i) {
            var coords = cursorCoords(this$1, cur, "div");
            if (x == null) { x = coords.left; }
            else { coords.left = x; }
            cur = findPosV(this$1, coords, dir, unit);
            if (cur.hitSide) { break }
          }
          return cur
        },

        moveV: methodOp(function(dir, unit) {
          var this$1 = this;

          var doc = this.doc, goals = [];
          var collapse = !this.display.shift && !doc.extend && doc.sel.somethingSelected();
          doc.extendSelectionsBy(function (range$$1) {
            if (collapse)
              { return dir < 0 ? range$$1.from() : range$$1.to() }
            var headPos = cursorCoords(this$1, range$$1.head, "div");
            if (range$$1.goalColumn != null) { headPos.left = range$$1.goalColumn; }
            goals.push(headPos.left);
            var pos = findPosV(this$1, headPos, dir, unit);
            if (unit == "page" && range$$1 == doc.sel.primary())
              { addToScrollTop(this$1, charCoords(this$1, pos, "div").top - headPos.top); }
            return pos
          }, sel_move);
          if (goals.length) { for (var i = 0; i < doc.sel.ranges.length; i++)
            { doc.sel.ranges[i].goalColumn = goals[i]; } }
        }),

        // Find the word at the given position (as returned by coordsChar).
        findWordAt: function(pos) {
          var doc = this.doc, line = getLine(doc, pos.line).text;
          var start = pos.ch, end = pos.ch;
          if (line) {
            var helper = this.getHelper(pos, "wordChars");
            if ((pos.sticky == "before" || end == line.length) && start) { --start; } else { ++end; }
            var startChar = line.charAt(start);
            var check = isWordChar(startChar, helper)
              ? function (ch) { return isWordChar(ch, helper); }
              : /\s/.test(startChar) ? function (ch) { return /\s/.test(ch); }
              : function (ch) { return (!/\s/.test(ch) && !isWordChar(ch)); };
            while (start > 0 && check(line.charAt(start - 1))) { --start; }
            while (end < line.length && check(line.charAt(end))) { ++end; }
          }
          return new Range(Pos(pos.line, start), Pos(pos.line, end))
        },

        toggleOverwrite: function(value) {
          if (value != null && value == this.state.overwrite) { return }
          if (this.state.overwrite = !this.state.overwrite)
            { addClass(this.display.cursorDiv, "CodeMirror-overwrite"); }
          else
            { rmClass(this.display.cursorDiv, "CodeMirror-overwrite"); }

          signal(this, "overwriteToggle", this, this.state.overwrite);
        },
        hasFocus: function() { return this.display.input.getField() == activeElt() },
        isReadOnly: function() { return !!(this.options.readOnly || this.doc.cantEdit) },

        scrollTo: methodOp(function (x, y) { scrollToCoords(this, x, y); }),
        getScrollInfo: function() {
          var scroller = this.display.scroller;
          return {left: scroller.scrollLeft, top: scroller.scrollTop,
                  height: scroller.scrollHeight - scrollGap(this) - this.display.barHeight,
                  width: scroller.scrollWidth - scrollGap(this) - this.display.barWidth,
                  clientHeight: displayHeight(this), clientWidth: displayWidth(this)}
        },

        scrollIntoView: methodOp(function(range$$1, margin) {
          if (range$$1 == null) {
            range$$1 = {from: this.doc.sel.primary().head, to: null};
            if (margin == null) { margin = this.options.cursorScrollMargin; }
          } else if (typeof range$$1 == "number") {
            range$$1 = {from: Pos(range$$1, 0), to: null};
          } else if (range$$1.from == null) {
            range$$1 = {from: range$$1, to: null};
          }
          if (!range$$1.to) { range$$1.to = range$$1.from; }
          range$$1.margin = margin || 0;

          if (range$$1.from.line != null) {
            scrollToRange(this, range$$1);
          } else {
            scrollToCoordsRange(this, range$$1.from, range$$1.to, range$$1.margin);
          }
        }),

        setSize: methodOp(function(width, height) {
          var this$1 = this;

          var interpret = function (val) { return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val; };
          if (width != null) { this.display.wrapper.style.width = interpret(width); }
          if (height != null) { this.display.wrapper.style.height = interpret(height); }
          if (this.options.lineWrapping) { clearLineMeasurementCache(this); }
          var lineNo$$1 = this.display.viewFrom;
          this.doc.iter(lineNo$$1, this.display.viewTo, function (line) {
            if (line.widgets) { for (var i = 0; i < line.widgets.length; i++)
              { if (line.widgets[i].noHScroll) { regLineChange(this$1, lineNo$$1, "widget"); break } } }
            ++lineNo$$1;
          });
          this.curOp.forceUpdate = true;
          signal(this, "refresh", this);
        }),

        operation: function(f){return runInOp(this, f)},
        startOperation: function(){return startOperation(this)},
        endOperation: function(){return endOperation(this)},

        refresh: methodOp(function() {
          var oldHeight = this.display.cachedTextHeight;
          regChange(this);
          this.curOp.forceUpdate = true;
          clearCaches(this);
          scrollToCoords(this, this.doc.scrollLeft, this.doc.scrollTop);
          updateGutterSpace(this.display);
          if (oldHeight == null || Math.abs(oldHeight - textHeight(this.display)) > .5)
            { estimateLineHeights(this); }
          signal(this, "refresh", this);
        }),

        swapDoc: methodOp(function(doc) {
          var old = this.doc;
          old.cm = null;
          // Cancel the current text selection if any (#5821)
          if (this.state.selectingText) { this.state.selectingText(); }
          attachDoc(this, doc);
          clearCaches(this);
          this.display.input.reset();
          scrollToCoords(this, doc.scrollLeft, doc.scrollTop);
          this.curOp.forceScroll = true;
          signalLater(this, "swapDoc", this, old);
          return old
        }),

        phrase: function(phraseText) {
          var phrases = this.options.phrases;
          return phrases && Object.prototype.hasOwnProperty.call(phrases, phraseText) ? phrases[phraseText] : phraseText
        },

        getInputField: function(){return this.display.input.getField()},
        getWrapperElement: function(){return this.display.wrapper},
        getScrollerElement: function(){return this.display.scroller},
        getGutterElement: function(){return this.display.gutters}
      };
      eventMixin(CodeMirror);

      CodeMirror.registerHelper = function(type, name, value) {
        if (!helpers.hasOwnProperty(type)) { helpers[type] = CodeMirror[type] = {_global: []}; }
        helpers[type][name] = value;
      };
      CodeMirror.registerGlobalHelper = function(type, name, predicate, value) {
        CodeMirror.registerHelper(type, name, value);
        helpers[type]._global.push({pred: predicate, val: value});
      };
    }

    // Used for horizontal relative motion. Dir is -1 or 1 (left or
    // right), unit can be "char", "column" (like char, but doesn't
    // cross line boundaries), "word" (across next word), or "group" (to
    // the start of next group of word or non-word-non-whitespace
    // chars). The visually param controls whether, in right-to-left
    // text, direction 1 means to move towards the next index in the
    // string, or towards the character to the right of the current
    // position. The resulting position will have a hitSide=true
    // property if it reached the end of the document.
    function findPosH(doc, pos, dir, unit, visually) {
      var oldPos = pos;
      var origDir = dir;
      var lineObj = getLine(doc, pos.line);
      function findNextLine() {
        var l = pos.line + dir;
        if (l < doc.first || l >= doc.first + doc.size) { return false }
        pos = new Pos(l, pos.ch, pos.sticky);
        return lineObj = getLine(doc, l)
      }
      function moveOnce(boundToLine) {
        var next;
        if (visually) {
          next = moveVisually(doc.cm, lineObj, pos, dir);
        } else {
          next = moveLogically(lineObj, pos, dir);
        }
        if (next == null) {
          if (!boundToLine && findNextLine())
            { pos = endOfLine(visually, doc.cm, lineObj, pos.line, dir); }
          else
            { return false }
        } else {
          pos = next;
        }
        return true
      }

      if (unit == "char") {
        moveOnce();
      } else if (unit == "column") {
        moveOnce(true);
      } else if (unit == "word" || unit == "group") {
        var sawType = null, group = unit == "group";
        var helper = doc.cm && doc.cm.getHelper(pos, "wordChars");
        for (var first = true;; first = false) {
          if (dir < 0 && !moveOnce(!first)) { break }
          var cur = lineObj.text.charAt(pos.ch) || "\n";
          var type = isWordChar(cur, helper) ? "w"
            : group && cur == "\n" ? "n"
            : !group || /\s/.test(cur) ? null
            : "p";
          if (group && !first && !type) { type = "s"; }
          if (sawType && sawType != type) {
            if (dir < 0) {dir = 1; moveOnce(); pos.sticky = "after";}
            break
          }

          if (type) { sawType = type; }
          if (dir > 0 && !moveOnce(!first)) { break }
        }
      }
      var result = skipAtomic(doc, pos, oldPos, origDir, true);
      if (equalCursorPos(oldPos, result)) { result.hitSide = true; }
      return result
    }

    // For relative vertical movement. Dir may be -1 or 1. Unit can be
    // "page" or "line". The resulting position will have a hitSide=true
    // property if it reached the end of the document.
    function findPosV(cm, pos, dir, unit) {
      var doc = cm.doc, x = pos.left, y;
      if (unit == "page") {
        var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
        var moveAmount = Math.max(pageSize - .5 * textHeight(cm.display), 3);
        y = (dir > 0 ? pos.bottom : pos.top) + dir * moveAmount;

      } else if (unit == "line") {
        y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
      }
      var target;
      for (;;) {
        target = coordsChar(cm, x, y);
        if (!target.outside) { break }
        if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break }
        y += dir * 5;
      }
      return target
    }

    // CONTENTEDITABLE INPUT STYLE

    var ContentEditableInput = function(cm) {
      this.cm = cm;
      this.lastAnchorNode = this.lastAnchorOffset = this.lastFocusNode = this.lastFocusOffset = null;
      this.polling = new Delayed();
      this.composing = null;
      this.gracePeriod = false;
      this.readDOMTimeout = null;
    };

    ContentEditableInput.prototype.init = function (display) {
        var this$1 = this;

      var input = this, cm = input.cm;
      var div = input.div = display.lineDiv;
      disableBrowserMagic(div, cm.options.spellcheck, cm.options.autocorrect, cm.options.autocapitalize);

      on(div, "paste", function (e) {
        if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }
        // IE doesn't fire input events, so we schedule a read for the pasted content in this way
        if (ie_version <= 11) { setTimeout(operation(cm, function () { return this$1.updateFromDOM(); }), 20); }
      });

      on(div, "compositionstart", function (e) {
        this$1.composing = {data: e.data, done: false};
      });
      on(div, "compositionupdate", function (e) {
        if (!this$1.composing) { this$1.composing = {data: e.data, done: false}; }
      });
      on(div, "compositionend", function (e) {
        if (this$1.composing) {
          if (e.data != this$1.composing.data) { this$1.readFromDOMSoon(); }
          this$1.composing.done = true;
        }
      });

      on(div, "touchstart", function () { return input.forceCompositionEnd(); });

      on(div, "input", function () {
        if (!this$1.composing) { this$1.readFromDOMSoon(); }
      });

      function onCopyCut(e) {
        if (signalDOMEvent(cm, e)) { return }
        if (cm.somethingSelected()) {
          setLastCopied({lineWise: false, text: cm.getSelections()});
          if (e.type == "cut") { cm.replaceSelection("", null, "cut"); }
        } else if (!cm.options.lineWiseCopyCut) {
          return
        } else {
          var ranges = copyableRanges(cm);
          setLastCopied({lineWise: true, text: ranges.text});
          if (e.type == "cut") {
            cm.operation(function () {
              cm.setSelections(ranges.ranges, 0, sel_dontScroll);
              cm.replaceSelection("", null, "cut");
            });
          }
        }
        if (e.clipboardData) {
          e.clipboardData.clearData();
          var content = lastCopied.text.join("\n");
          // iOS exposes the clipboard API, but seems to discard content inserted into it
          e.clipboardData.setData("Text", content);
          if (e.clipboardData.getData("Text") == content) {
            e.preventDefault();
            return
          }
        }
        // Old-fashioned briefly-focus-a-textarea hack
        var kludge = hiddenTextarea(), te = kludge.firstChild;
        cm.display.lineSpace.insertBefore(kludge, cm.display.lineSpace.firstChild);
        te.value = lastCopied.text.join("\n");
        var hadFocus = document.activeElement;
        selectInput(te);
        setTimeout(function () {
          cm.display.lineSpace.removeChild(kludge);
          hadFocus.focus();
          if (hadFocus == div) { input.showPrimarySelection(); }
        }, 50);
      }
      on(div, "copy", onCopyCut);
      on(div, "cut", onCopyCut);
    };

    ContentEditableInput.prototype.prepareSelection = function () {
      var result = prepareSelection(this.cm, false);
      result.focus = this.cm.state.focused;
      return result
    };

    ContentEditableInput.prototype.showSelection = function (info, takeFocus) {
      if (!info || !this.cm.display.view.length) { return }
      if (info.focus || takeFocus) { this.showPrimarySelection(); }
      this.showMultipleSelections(info);
    };

    ContentEditableInput.prototype.getSelection = function () {
      return this.cm.display.wrapper.ownerDocument.getSelection()
    };

    ContentEditableInput.prototype.showPrimarySelection = function () {
      var sel = this.getSelection(), cm = this.cm, prim = cm.doc.sel.primary();
      var from = prim.from(), to = prim.to();

      if (cm.display.viewTo == cm.display.viewFrom || from.line >= cm.display.viewTo || to.line < cm.display.viewFrom) {
        sel.removeAllRanges();
        return
      }

      var curAnchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
      var curFocus = domToPos(cm, sel.focusNode, sel.focusOffset);
      if (curAnchor && !curAnchor.bad && curFocus && !curFocus.bad &&
          cmp(minPos(curAnchor, curFocus), from) == 0 &&
          cmp(maxPos(curAnchor, curFocus), to) == 0)
        { return }

      var view = cm.display.view;
      var start = (from.line >= cm.display.viewFrom && posToDOM(cm, from)) ||
          {node: view[0].measure.map[2], offset: 0};
      var end = to.line < cm.display.viewTo && posToDOM(cm, to);
      if (!end) {
        var measure = view[view.length - 1].measure;
        var map$$1 = measure.maps ? measure.maps[measure.maps.length - 1] : measure.map;
        end = {node: map$$1[map$$1.length - 1], offset: map$$1[map$$1.length - 2] - map$$1[map$$1.length - 3]};
      }

      if (!start || !end) {
        sel.removeAllRanges();
        return
      }

      var old = sel.rangeCount && sel.getRangeAt(0), rng;
      try { rng = range(start.node, start.offset, end.offset, end.node); }
      catch(e) {} // Our model of the DOM might be outdated, in which case the range we try to set can be impossible
      if (rng) {
        if (!gecko && cm.state.focused) {
          sel.collapse(start.node, start.offset);
          if (!rng.collapsed) {
            sel.removeAllRanges();
            sel.addRange(rng);
          }
        } else {
          sel.removeAllRanges();
          sel.addRange(rng);
        }
        if (old && sel.anchorNode == null) { sel.addRange(old); }
        else if (gecko) { this.startGracePeriod(); }
      }
      this.rememberSelection();
    };

    ContentEditableInput.prototype.startGracePeriod = function () {
        var this$1 = this;

      clearTimeout(this.gracePeriod);
      this.gracePeriod = setTimeout(function () {
        this$1.gracePeriod = false;
        if (this$1.selectionChanged())
          { this$1.cm.operation(function () { return this$1.cm.curOp.selectionChanged = true; }); }
      }, 20);
    };

    ContentEditableInput.prototype.showMultipleSelections = function (info) {
      removeChildrenAndAdd(this.cm.display.cursorDiv, info.cursors);
      removeChildrenAndAdd(this.cm.display.selectionDiv, info.selection);
    };

    ContentEditableInput.prototype.rememberSelection = function () {
      var sel = this.getSelection();
      this.lastAnchorNode = sel.anchorNode; this.lastAnchorOffset = sel.anchorOffset;
      this.lastFocusNode = sel.focusNode; this.lastFocusOffset = sel.focusOffset;
    };

    ContentEditableInput.prototype.selectionInEditor = function () {
      var sel = this.getSelection();
      if (!sel.rangeCount) { return false }
      var node = sel.getRangeAt(0).commonAncestorContainer;
      return contains(this.div, node)
    };

    ContentEditableInput.prototype.focus = function () {
      if (this.cm.options.readOnly != "nocursor") {
        if (!this.selectionInEditor())
          { this.showSelection(this.prepareSelection(), true); }
        this.div.focus();
      }
    };
    ContentEditableInput.prototype.blur = function () { this.div.blur(); };
    ContentEditableInput.prototype.getField = function () { return this.div };

    ContentEditableInput.prototype.supportsTouch = function () { return true };

    ContentEditableInput.prototype.receivedFocus = function () {
      var input = this;
      if (this.selectionInEditor())
        { this.pollSelection(); }
      else
        { runInOp(this.cm, function () { return input.cm.curOp.selectionChanged = true; }); }

      function poll() {
        if (input.cm.state.focused) {
          input.pollSelection();
          input.polling.set(input.cm.options.pollInterval, poll);
        }
      }
      this.polling.set(this.cm.options.pollInterval, poll);
    };

    ContentEditableInput.prototype.selectionChanged = function () {
      var sel = this.getSelection();
      return sel.anchorNode != this.lastAnchorNode || sel.anchorOffset != this.lastAnchorOffset ||
        sel.focusNode != this.lastFocusNode || sel.focusOffset != this.lastFocusOffset
    };

    ContentEditableInput.prototype.pollSelection = function () {
      if (this.readDOMTimeout != null || this.gracePeriod || !this.selectionChanged()) { return }
      var sel = this.getSelection(), cm = this.cm;
      // On Android Chrome (version 56, at least), backspacing into an
      // uneditable block element will put the cursor in that element,
      // and then, because it's not editable, hide the virtual keyboard.
      // Because Android doesn't allow us to actually detect backspace
      // presses in a sane way, this code checks for when that happens
      // and simulates a backspace press in this case.
      if (android && chrome && this.cm.display.gutterSpecs.length && isInGutter(sel.anchorNode)) {
        this.cm.triggerOnKeyDown({type: "keydown", keyCode: 8, preventDefault: Math.abs});
        this.blur();
        this.focus();
        return
      }
      if (this.composing) { return }
      this.rememberSelection();
      var anchor = domToPos(cm, sel.anchorNode, sel.anchorOffset);
      var head = domToPos(cm, sel.focusNode, sel.focusOffset);
      if (anchor && head) { runInOp(cm, function () {
        setSelection(cm.doc, simpleSelection(anchor, head), sel_dontScroll);
        if (anchor.bad || head.bad) { cm.curOp.selectionChanged = true; }
      }); }
    };

    ContentEditableInput.prototype.pollContent = function () {
      if (this.readDOMTimeout != null) {
        clearTimeout(this.readDOMTimeout);
        this.readDOMTimeout = null;
      }

      var cm = this.cm, display = cm.display, sel = cm.doc.sel.primary();
      var from = sel.from(), to = sel.to();
      if (from.ch == 0 && from.line > cm.firstLine())
        { from = Pos(from.line - 1, getLine(cm.doc, from.line - 1).length); }
      if (to.ch == getLine(cm.doc, to.line).text.length && to.line < cm.lastLine())
        { to = Pos(to.line + 1, 0); }
      if (from.line < display.viewFrom || to.line > display.viewTo - 1) { return false }

      var fromIndex, fromLine, fromNode;
      if (from.line == display.viewFrom || (fromIndex = findViewIndex(cm, from.line)) == 0) {
        fromLine = lineNo(display.view[0].line);
        fromNode = display.view[0].node;
      } else {
        fromLine = lineNo(display.view[fromIndex].line);
        fromNode = display.view[fromIndex - 1].node.nextSibling;
      }
      var toIndex = findViewIndex(cm, to.line);
      var toLine, toNode;
      if (toIndex == display.view.length - 1) {
        toLine = display.viewTo - 1;
        toNode = display.lineDiv.lastChild;
      } else {
        toLine = lineNo(display.view[toIndex + 1].line) - 1;
        toNode = display.view[toIndex + 1].node.previousSibling;
      }

      if (!fromNode) { return false }
      var newText = cm.doc.splitLines(domTextBetween(cm, fromNode, toNode, fromLine, toLine));
      var oldText = getBetween(cm.doc, Pos(fromLine, 0), Pos(toLine, getLine(cm.doc, toLine).text.length));
      while (newText.length > 1 && oldText.length > 1) {
        if (lst(newText) == lst(oldText)) { newText.pop(); oldText.pop(); toLine--; }
        else if (newText[0] == oldText[0]) { newText.shift(); oldText.shift(); fromLine++; }
        else { break }
      }

      var cutFront = 0, cutEnd = 0;
      var newTop = newText[0], oldTop = oldText[0], maxCutFront = Math.min(newTop.length, oldTop.length);
      while (cutFront < maxCutFront && newTop.charCodeAt(cutFront) == oldTop.charCodeAt(cutFront))
        { ++cutFront; }
      var newBot = lst(newText), oldBot = lst(oldText);
      var maxCutEnd = Math.min(newBot.length - (newText.length == 1 ? cutFront : 0),
                               oldBot.length - (oldText.length == 1 ? cutFront : 0));
      while (cutEnd < maxCutEnd &&
             newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1))
        { ++cutEnd; }
      // Try to move start of change to start of selection if ambiguous
      if (newText.length == 1 && oldText.length == 1 && fromLine == from.line) {
        while (cutFront && cutFront > from.ch &&
               newBot.charCodeAt(newBot.length - cutEnd - 1) == oldBot.charCodeAt(oldBot.length - cutEnd - 1)) {
          cutFront--;
          cutEnd++;
        }
      }

      newText[newText.length - 1] = newBot.slice(0, newBot.length - cutEnd).replace(/^\u200b+/, "");
      newText[0] = newText[0].slice(cutFront).replace(/\u200b+$/, "");

      var chFrom = Pos(fromLine, cutFront);
      var chTo = Pos(toLine, oldText.length ? lst(oldText).length - cutEnd : 0);
      if (newText.length > 1 || newText[0] || cmp(chFrom, chTo)) {
        replaceRange(cm.doc, newText, chFrom, chTo, "+input");
        return true
      }
    };

    ContentEditableInput.prototype.ensurePolled = function () {
      this.forceCompositionEnd();
    };
    ContentEditableInput.prototype.reset = function () {
      this.forceCompositionEnd();
    };
    ContentEditableInput.prototype.forceCompositionEnd = function () {
      if (!this.composing) { return }
      clearTimeout(this.readDOMTimeout);
      this.composing = null;
      this.updateFromDOM();
      this.div.blur();
      this.div.focus();
    };
    ContentEditableInput.prototype.readFromDOMSoon = function () {
        var this$1 = this;

      if (this.readDOMTimeout != null) { return }
      this.readDOMTimeout = setTimeout(function () {
        this$1.readDOMTimeout = null;
        if (this$1.composing) {
          if (this$1.composing.done) { this$1.composing = null; }
          else { return }
        }
        this$1.updateFromDOM();
      }, 80);
    };

    ContentEditableInput.prototype.updateFromDOM = function () {
        var this$1 = this;

      if (this.cm.isReadOnly() || !this.pollContent())
        { runInOp(this.cm, function () { return regChange(this$1.cm); }); }
    };

    ContentEditableInput.prototype.setUneditable = function (node) {
      node.contentEditable = "false";
    };

    ContentEditableInput.prototype.onKeyPress = function (e) {
      if (e.charCode == 0 || this.composing) { return }
      e.preventDefault();
      if (!this.cm.isReadOnly())
        { operation(this.cm, applyTextInput)(this.cm, String.fromCharCode(e.charCode == null ? e.keyCode : e.charCode), 0); }
    };

    ContentEditableInput.prototype.readOnlyChanged = function (val) {
      this.div.contentEditable = String(val != "nocursor");
    };

    ContentEditableInput.prototype.onContextMenu = function () {};
    ContentEditableInput.prototype.resetPosition = function () {};

    ContentEditableInput.prototype.needsContentAttribute = true;

    function posToDOM(cm, pos) {
      var view = findViewForLine(cm, pos.line);
      if (!view || view.hidden) { return null }
      var line = getLine(cm.doc, pos.line);
      var info = mapFromLineView(view, line, pos.line);

      var order = getOrder(line, cm.doc.direction), side = "left";
      if (order) {
        var partPos = getBidiPartAt(order, pos.ch);
        side = partPos % 2 ? "right" : "left";
      }
      var result = nodeAndOffsetInLineMap(info.map, pos.ch, side);
      result.offset = result.collapse == "right" ? result.end : result.start;
      return result
    }

    function isInGutter(node) {
      for (var scan = node; scan; scan = scan.parentNode)
        { if (/CodeMirror-gutter-wrapper/.test(scan.className)) { return true } }
      return false
    }

    function badPos(pos, bad) { if (bad) { pos.bad = true; } return pos }

    function domTextBetween(cm, from, to, fromLine, toLine) {
      var text = "", closing = false, lineSep = cm.doc.lineSeparator(), extraLinebreak = false;
      function recognizeMarker(id) { return function (marker) { return marker.id == id; } }
      function close() {
        if (closing) {
          text += lineSep;
          if (extraLinebreak) { text += lineSep; }
          closing = extraLinebreak = false;
        }
      }
      function addText(str) {
        if (str) {
          close();
          text += str;
        }
      }
      function walk(node) {
        if (node.nodeType == 1) {
          var cmText = node.getAttribute("cm-text");
          if (cmText) {
            addText(cmText);
            return
          }
          var markerID = node.getAttribute("cm-marker"), range$$1;
          if (markerID) {
            var found = cm.findMarks(Pos(fromLine, 0), Pos(toLine + 1, 0), recognizeMarker(+markerID));
            if (found.length && (range$$1 = found[0].find(0)))
              { addText(getBetween(cm.doc, range$$1.from, range$$1.to).join(lineSep)); }
            return
          }
          if (node.getAttribute("contenteditable") == "false") { return }
          var isBlock = /^(pre|div|p|li|table|br)$/i.test(node.nodeName);
          if (!/^br$/i.test(node.nodeName) && node.textContent.length == 0) { return }

          if (isBlock) { close(); }
          for (var i = 0; i < node.childNodes.length; i++)
            { walk(node.childNodes[i]); }

          if (/^(pre|p)$/i.test(node.nodeName)) { extraLinebreak = true; }
          if (isBlock) { closing = true; }
        } else if (node.nodeType == 3) {
          addText(node.nodeValue.replace(/\u200b/g, "").replace(/\u00a0/g, " "));
        }
      }
      for (;;) {
        walk(from);
        if (from == to) { break }
        from = from.nextSibling;
        extraLinebreak = false;
      }
      return text
    }

    function domToPos(cm, node, offset) {
      var lineNode;
      if (node == cm.display.lineDiv) {
        lineNode = cm.display.lineDiv.childNodes[offset];
        if (!lineNode) { return badPos(cm.clipPos(Pos(cm.display.viewTo - 1)), true) }
        node = null; offset = 0;
      } else {
        for (lineNode = node;; lineNode = lineNode.parentNode) {
          if (!lineNode || lineNode == cm.display.lineDiv) { return null }
          if (lineNode.parentNode && lineNode.parentNode == cm.display.lineDiv) { break }
        }
      }
      for (var i = 0; i < cm.display.view.length; i++) {
        var lineView = cm.display.view[i];
        if (lineView.node == lineNode)
          { return locateNodeInLineView(lineView, node, offset) }
      }
    }

    function locateNodeInLineView(lineView, node, offset) {
      var wrapper = lineView.text.firstChild, bad = false;
      if (!node || !contains(wrapper, node)) { return badPos(Pos(lineNo(lineView.line), 0), true) }
      if (node == wrapper) {
        bad = true;
        node = wrapper.childNodes[offset];
        offset = 0;
        if (!node) {
          var line = lineView.rest ? lst(lineView.rest) : lineView.line;
          return badPos(Pos(lineNo(line), line.text.length), bad)
        }
      }

      var textNode = node.nodeType == 3 ? node : null, topNode = node;
      if (!textNode && node.childNodes.length == 1 && node.firstChild.nodeType == 3) {
        textNode = node.firstChild;
        if (offset) { offset = textNode.nodeValue.length; }
      }
      while (topNode.parentNode != wrapper) { topNode = topNode.parentNode; }
      var measure = lineView.measure, maps = measure.maps;

      function find(textNode, topNode, offset) {
        for (var i = -1; i < (maps ? maps.length : 0); i++) {
          var map$$1 = i < 0 ? measure.map : maps[i];
          for (var j = 0; j < map$$1.length; j += 3) {
            var curNode = map$$1[j + 2];
            if (curNode == textNode || curNode == topNode) {
              var line = lineNo(i < 0 ? lineView.line : lineView.rest[i]);
              var ch = map$$1[j] + offset;
              if (offset < 0 || curNode != textNode) { ch = map$$1[j + (offset ? 1 : 0)]; }
              return Pos(line, ch)
            }
          }
        }
      }
      var found = find(textNode, topNode, offset);
      if (found) { return badPos(found, bad) }

      // FIXME this is all really shaky. might handle the few cases it needs to handle, but likely to cause problems
      for (var after = topNode.nextSibling, dist = textNode ? textNode.nodeValue.length - offset : 0; after; after = after.nextSibling) {
        found = find(after, after.firstChild, 0);
        if (found)
          { return badPos(Pos(found.line, found.ch - dist), bad) }
        else
          { dist += after.textContent.length; }
      }
      for (var before = topNode.previousSibling, dist$1 = offset; before; before = before.previousSibling) {
        found = find(before, before.firstChild, -1);
        if (found)
          { return badPos(Pos(found.line, found.ch + dist$1), bad) }
        else
          { dist$1 += before.textContent.length; }
      }
    }

    // TEXTAREA INPUT STYLE

    var TextareaInput = function(cm) {
      this.cm = cm;
      // See input.poll and input.reset
      this.prevInput = "";

      // Flag that indicates whether we expect input to appear real soon
      // now (after some event like 'keypress' or 'input') and are
      // polling intensively.
      this.pollingFast = false;
      // Self-resetting timeout for the poller
      this.polling = new Delayed();
      // Used to work around IE issue with selection being forgotten when focus moves away from textarea
      this.hasSelection = false;
      this.composing = null;
    };

    TextareaInput.prototype.init = function (display) {
        var this$1 = this;

      var input = this, cm = this.cm;
      this.createField(display);
      var te = this.textarea;

      display.wrapper.insertBefore(this.wrapper, display.wrapper.firstChild);

      // Needed to hide big blue blinking cursor on Mobile Safari (doesn't seem to work in iOS 8 anymore)
      if (ios) { te.style.width = "0px"; }

      on(te, "input", function () {
        if (ie && ie_version >= 9 && this$1.hasSelection) { this$1.hasSelection = null; }
        input.poll();
      });

      on(te, "paste", function (e) {
        if (signalDOMEvent(cm, e) || handlePaste(e, cm)) { return }

        cm.state.pasteIncoming = +new Date;
        input.fastPoll();
      });

      function prepareCopyCut(e) {
        if (signalDOMEvent(cm, e)) { return }
        if (cm.somethingSelected()) {
          setLastCopied({lineWise: false, text: cm.getSelections()});
        } else if (!cm.options.lineWiseCopyCut) {
          return
        } else {
          var ranges = copyableRanges(cm);
          setLastCopied({lineWise: true, text: ranges.text});
          if (e.type == "cut") {
            cm.setSelections(ranges.ranges, null, sel_dontScroll);
          } else {
            input.prevInput = "";
            te.value = ranges.text.join("\n");
            selectInput(te);
          }
        }
        if (e.type == "cut") { cm.state.cutIncoming = +new Date; }
      }
      on(te, "cut", prepareCopyCut);
      on(te, "copy", prepareCopyCut);

      on(display.scroller, "paste", function (e) {
        if (eventInWidget(display, e) || signalDOMEvent(cm, e)) { return }
        if (!te.dispatchEvent) {
          cm.state.pasteIncoming = +new Date;
          input.focus();
          return
        }

        // Pass the `paste` event to the textarea so it's handled by its event listener.
        var event = new Event("paste");
        event.clipboardData = e.clipboardData;
        te.dispatchEvent(event);
      });

      // Prevent normal selection in the editor (we handle our own)
      on(display.lineSpace, "selectstart", function (e) {
        if (!eventInWidget(display, e)) { e_preventDefault(e); }
      });

      on(te, "compositionstart", function () {
        var start = cm.getCursor("from");
        if (input.composing) { input.composing.range.clear(); }
        input.composing = {
          start: start,
          range: cm.markText(start, cm.getCursor("to"), {className: "CodeMirror-composing"})
        };
      });
      on(te, "compositionend", function () {
        if (input.composing) {
          input.poll();
          input.composing.range.clear();
          input.composing = null;
        }
      });
    };

    TextareaInput.prototype.createField = function (_display) {
      // Wraps and hides input textarea
      this.wrapper = hiddenTextarea();
      // The semihidden textarea that is focused when the editor is
      // focused, and receives input.
      this.textarea = this.wrapper.firstChild;
    };

    TextareaInput.prototype.prepareSelection = function () {
      // Redraw the selection and/or cursor
      var cm = this.cm, display = cm.display, doc = cm.doc;
      var result = prepareSelection(cm);

      // Move the hidden textarea near the cursor to prevent scrolling artifacts
      if (cm.options.moveInputWithCursor) {
        var headPos = cursorCoords(cm, doc.sel.primary().head, "div");
        var wrapOff = display.wrapper.getBoundingClientRect(), lineOff = display.lineDiv.getBoundingClientRect();
        result.teTop = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                            headPos.top + lineOff.top - wrapOff.top));
        result.teLeft = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                             headPos.left + lineOff.left - wrapOff.left));
      }

      return result
    };

    TextareaInput.prototype.showSelection = function (drawn) {
      var cm = this.cm, display = cm.display;
      removeChildrenAndAdd(display.cursorDiv, drawn.cursors);
      removeChildrenAndAdd(display.selectionDiv, drawn.selection);
      if (drawn.teTop != null) {
        this.wrapper.style.top = drawn.teTop + "px";
        this.wrapper.style.left = drawn.teLeft + "px";
      }
    };

    // Reset the input to correspond to the selection (or to be empty,
    // when not typing and nothing is selected)
    TextareaInput.prototype.reset = function (typing) {
      if (this.contextMenuPending || this.composing) { return }
      var cm = this.cm;
      if (cm.somethingSelected()) {
        this.prevInput = "";
        var content = cm.getSelection();
        this.textarea.value = content;
        if (cm.state.focused) { selectInput(this.textarea); }
        if (ie && ie_version >= 9) { this.hasSelection = content; }
      } else if (!typing) {
        this.prevInput = this.textarea.value = "";
        if (ie && ie_version >= 9) { this.hasSelection = null; }
      }
    };

    TextareaInput.prototype.getField = function () { return this.textarea };

    TextareaInput.prototype.supportsTouch = function () { return false };

    TextareaInput.prototype.focus = function () {
      if (this.cm.options.readOnly != "nocursor" && (!mobile || activeElt() != this.textarea)) {
        try { this.textarea.focus(); }
        catch (e) {} // IE8 will throw if the textarea is display: none or not in DOM
      }
    };

    TextareaInput.prototype.blur = function () { this.textarea.blur(); };

    TextareaInput.prototype.resetPosition = function () {
      this.wrapper.style.top = this.wrapper.style.left = 0;
    };

    TextareaInput.prototype.receivedFocus = function () { this.slowPoll(); };

    // Poll for input changes, using the normal rate of polling. This
    // runs as long as the editor is focused.
    TextareaInput.prototype.slowPoll = function () {
        var this$1 = this;

      if (this.pollingFast) { return }
      this.polling.set(this.cm.options.pollInterval, function () {
        this$1.poll();
        if (this$1.cm.state.focused) { this$1.slowPoll(); }
      });
    };

    // When an event has just come in that is likely to add or change
    // something in the input textarea, we poll faster, to ensure that
    // the change appears on the screen quickly.
    TextareaInput.prototype.fastPoll = function () {
      var missed = false, input = this;
      input.pollingFast = true;
      function p() {
        var changed = input.poll();
        if (!changed && !missed) {missed = true; input.polling.set(60, p);}
        else {input.pollingFast = false; input.slowPoll();}
      }
      input.polling.set(20, p);
    };

    // Read input from the textarea, and update the document to match.
    // When something is selected, it is present in the textarea, and
    // selected (unless it is huge, in which case a placeholder is
    // used). When nothing is selected, the cursor sits after previously
    // seen text (can be empty), which is stored in prevInput (we must
    // not reset the textarea when typing, because that breaks IME).
    TextareaInput.prototype.poll = function () {
        var this$1 = this;

      var cm = this.cm, input = this.textarea, prevInput = this.prevInput;
      // Since this is called a *lot*, try to bail out as cheaply as
      // possible when it is clear that nothing happened. hasSelection
      // will be the case when there is a lot of text in the textarea,
      // in which case reading its value would be expensive.
      if (this.contextMenuPending || !cm.state.focused ||
          (hasSelection(input) && !prevInput && !this.composing) ||
          cm.isReadOnly() || cm.options.disableInput || cm.state.keySeq)
        { return false }

      var text = input.value;
      // If nothing changed, bail.
      if (text == prevInput && !cm.somethingSelected()) { return false }
      // Work around nonsensical selection resetting in IE9/10, and
      // inexplicable appearance of private area unicode characters on
      // some key combos in Mac (#2689).
      if (ie && ie_version >= 9 && this.hasSelection === text ||
          mac && /[\uf700-\uf7ff]/.test(text)) {
        cm.display.input.reset();
        return false
      }

      if (cm.doc.sel == cm.display.selForContextMenu) {
        var first = text.charCodeAt(0);
        if (first == 0x200b && !prevInput) { prevInput = "\u200b"; }
        if (first == 0x21da) { this.reset(); return this.cm.execCommand("undo") }
      }
      // Find the part of the input that is actually new
      var same = 0, l = Math.min(prevInput.length, text.length);
      while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) { ++same; }

      runInOp(cm, function () {
        applyTextInput(cm, text.slice(same), prevInput.length - same,
                       null, this$1.composing ? "*compose" : null);

        // Don't leave long text in the textarea, since it makes further polling slow
        if (text.length > 1000 || text.indexOf("\n") > -1) { input.value = this$1.prevInput = ""; }
        else { this$1.prevInput = text; }

        if (this$1.composing) {
          this$1.composing.range.clear();
          this$1.composing.range = cm.markText(this$1.composing.start, cm.getCursor("to"),
                                             {className: "CodeMirror-composing"});
        }
      });
      return true
    };

    TextareaInput.prototype.ensurePolled = function () {
      if (this.pollingFast && this.poll()) { this.pollingFast = false; }
    };

    TextareaInput.prototype.onKeyPress = function () {
      if (ie && ie_version >= 9) { this.hasSelection = null; }
      this.fastPoll();
    };

    TextareaInput.prototype.onContextMenu = function (e) {
      var input = this, cm = input.cm, display = cm.display, te = input.textarea;
      if (input.contextMenuPending) { input.contextMenuPending(); }
      var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
      if (!pos || presto) { return } // Opera is difficult.

      // Reset the current text selection only if the click is done outside of the selection
      // and 'resetSelectionOnContextMenu' option is true.
      var reset = cm.options.resetSelectionOnContextMenu;
      if (reset && cm.doc.sel.contains(pos) == -1)
        { operation(cm, setSelection)(cm.doc, simpleSelection(pos), sel_dontScroll); }

      var oldCSS = te.style.cssText, oldWrapperCSS = input.wrapper.style.cssText;
      var wrapperBox = input.wrapper.offsetParent.getBoundingClientRect();
      input.wrapper.style.cssText = "position: static";
      te.style.cssText = "position: absolute; width: 30px; height: 30px;\n      top: " + (e.clientY - wrapperBox.top - 5) + "px; left: " + (e.clientX - wrapperBox.left - 5) + "px;\n      z-index: 1000; background: " + (ie ? "rgba(255, 255, 255, .05)" : "transparent") + ";\n      outline: none; border-width: 0; outline: none; overflow: hidden; opacity: .05; filter: alpha(opacity=5);";
      var oldScrollY;
      if (webkit) { oldScrollY = window.scrollY; } // Work around Chrome issue (#2712)
      display.input.focus();
      if (webkit) { window.scrollTo(null, oldScrollY); }
      display.input.reset();
      // Adds "Select all" to context menu in FF
      if (!cm.somethingSelected()) { te.value = input.prevInput = " "; }
      input.contextMenuPending = rehide;
      display.selForContextMenu = cm.doc.sel;
      clearTimeout(display.detectingSelectAll);

      // Select-all will be greyed out if there's nothing to select, so
      // this adds a zero-width space so that we can later check whether
      // it got selected.
      function prepareSelectAllHack() {
        if (te.selectionStart != null) {
          var selected = cm.somethingSelected();
          var extval = "\u200b" + (selected ? te.value : "");
          te.value = "\u21da"; // Used to catch context-menu undo
          te.value = extval;
          input.prevInput = selected ? "" : "\u200b";
          te.selectionStart = 1; te.selectionEnd = extval.length;
          // Re-set this, in case some other handler touched the
          // selection in the meantime.
          display.selForContextMenu = cm.doc.sel;
        }
      }
      function rehide() {
        if (input.contextMenuPending != rehide) { return }
        input.contextMenuPending = false;
        input.wrapper.style.cssText = oldWrapperCSS;
        te.style.cssText = oldCSS;
        if (ie && ie_version < 9) { display.scrollbars.setScrollTop(display.scroller.scrollTop = scrollPos); }

        // Try to detect the user choosing select-all
        if (te.selectionStart != null) {
          if (!ie || (ie && ie_version < 9)) { prepareSelectAllHack(); }
          var i = 0, poll = function () {
            if (display.selForContextMenu == cm.doc.sel && te.selectionStart == 0 &&
                te.selectionEnd > 0 && input.prevInput == "\u200b") {
              operation(cm, selectAll)(cm);
            } else if (i++ < 10) {
              display.detectingSelectAll = setTimeout(poll, 500);
            } else {
              display.selForContextMenu = null;
              display.input.reset();
            }
          };
          display.detectingSelectAll = setTimeout(poll, 200);
        }
      }

      if (ie && ie_version >= 9) { prepareSelectAllHack(); }
      if (captureRightClick) {
        e_stop(e);
        var mouseup = function () {
          off(window, "mouseup", mouseup);
          setTimeout(rehide, 20);
        };
        on(window, "mouseup", mouseup);
      } else {
        setTimeout(rehide, 50);
      }
    };

    TextareaInput.prototype.readOnlyChanged = function (val) {
      if (!val) { this.reset(); }
      this.textarea.disabled = val == "nocursor";
    };

    TextareaInput.prototype.setUneditable = function () {};

    TextareaInput.prototype.needsContentAttribute = false;

    function fromTextArea(textarea, options) {
      options = options ? copyObj(options) : {};
      options.value = textarea.value;
      if (!options.tabindex && textarea.tabIndex)
        { options.tabindex = textarea.tabIndex; }
      if (!options.placeholder && textarea.placeholder)
        { options.placeholder = textarea.placeholder; }
      // Set autofocus to true if this textarea is focused, or if it has
      // autofocus and no other element is focused.
      if (options.autofocus == null) {
        var hasFocus = activeElt();
        options.autofocus = hasFocus == textarea ||
          textarea.getAttribute("autofocus") != null && hasFocus == document.body;
      }

      function save() {textarea.value = cm.getValue();}

      var realSubmit;
      if (textarea.form) {
        on(textarea.form, "submit", save);
        // Deplorable hack to make the submit method do the right thing.
        if (!options.leaveSubmitMethodAlone) {
          var form = textarea.form;
          realSubmit = form.submit;
          try {
            var wrappedSubmit = form.submit = function () {
              save();
              form.submit = realSubmit;
              form.submit();
              form.submit = wrappedSubmit;
            };
          } catch(e) {}
        }
      }

      options.finishInit = function (cm) {
        cm.save = save;
        cm.getTextArea = function () { return textarea; };
        cm.toTextArea = function () {
          cm.toTextArea = isNaN; // Prevent this from being ran twice
          save();
          textarea.parentNode.removeChild(cm.getWrapperElement());
          textarea.style.display = "";
          if (textarea.form) {
            off(textarea.form, "submit", save);
            if (!options.leaveSubmitMethodAlone && typeof textarea.form.submit == "function")
              { textarea.form.submit = realSubmit; }
          }
        };
      };

      textarea.style.display = "none";
      var cm = CodeMirror(function (node) { return textarea.parentNode.insertBefore(node, textarea.nextSibling); },
        options);
      return cm
    }

    function addLegacyProps(CodeMirror) {
      CodeMirror.off = off;
      CodeMirror.on = on;
      CodeMirror.wheelEventPixels = wheelEventPixels;
      CodeMirror.Doc = Doc;
      CodeMirror.splitLines = splitLinesAuto;
      CodeMirror.countColumn = countColumn;
      CodeMirror.findColumn = findColumn;
      CodeMirror.isWordChar = isWordCharBasic;
      CodeMirror.Pass = Pass;
      CodeMirror.signal = signal;
      CodeMirror.Line = Line;
      CodeMirror.changeEnd = changeEnd;
      CodeMirror.scrollbarModel = scrollbarModel;
      CodeMirror.Pos = Pos;
      CodeMirror.cmpPos = cmp;
      CodeMirror.modes = modes;
      CodeMirror.mimeModes = mimeModes;
      CodeMirror.resolveMode = resolveMode;
      CodeMirror.getMode = getMode;
      CodeMirror.modeExtensions = modeExtensions;
      CodeMirror.extendMode = extendMode;
      CodeMirror.copyState = copyState;
      CodeMirror.startState = startState;
      CodeMirror.innerMode = innerMode;
      CodeMirror.commands = commands;
      CodeMirror.keyMap = keyMap;
      CodeMirror.keyName = keyName;
      CodeMirror.isModifierKey = isModifierKey;
      CodeMirror.lookupKey = lookupKey;
      CodeMirror.normalizeKeyMap = normalizeKeyMap;
      CodeMirror.StringStream = StringStream;
      CodeMirror.SharedTextMarker = SharedTextMarker;
      CodeMirror.TextMarker = TextMarker;
      CodeMirror.LineWidget = LineWidget;
      CodeMirror.e_preventDefault = e_preventDefault;
      CodeMirror.e_stopPropagation = e_stopPropagation;
      CodeMirror.e_stop = e_stop;
      CodeMirror.addClass = addClass;
      CodeMirror.contains = contains;
      CodeMirror.rmClass = rmClass;
      CodeMirror.keyNames = keyNames;
    }

    // EDITOR CONSTRUCTOR

    defineOptions(CodeMirror);

    addEditorMethods(CodeMirror);

    // Set up methods on CodeMirror's prototype to redirect to the editor's document.
    var dontDelegate = "iter insert remove copy getEditor constructor".split(" ");
    for (var prop in Doc.prototype) { if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
      { CodeMirror.prototype[prop] = (function(method) {
        return function() {return method.apply(this.doc, arguments)}
      })(Doc.prototype[prop]); } }

    eventMixin(Doc);
    CodeMirror.inputStyles = {"textarea": TextareaInput, "contenteditable": ContentEditableInput};

    // Extra arguments are stored as the mode's dependencies, which is
    // used by (legacy) mechanisms like loadmode.js to automatically
    // load a mode. (Preferred mechanism is the require/define calls.)
    CodeMirror.defineMode = function(name/*, mode, …*/) {
      if (!CodeMirror.defaults.mode && name != "null") { CodeMirror.defaults.mode = name; }
      defineMode.apply(this, arguments);
    };

    CodeMirror.defineMIME = defineMIME;

    // Minimal default mode.
    CodeMirror.defineMode("null", function () { return ({token: function (stream) { return stream.skipToEnd(); }}); });
    CodeMirror.defineMIME("text/plain", "null");

    // EXTENSIONS

    CodeMirror.defineExtension = function (name, func) {
      CodeMirror.prototype[name] = func;
    };
    CodeMirror.defineDocExtension = function (name, func) {
      Doc.prototype[name] = func;
    };

    CodeMirror.fromTextArea = fromTextArea;

    addLegacyProps(CodeMirror);

    CodeMirror.version = "5.49.0";

    return CodeMirror;

  })));
  });

  var mousetrap = createCommonjsModule(function (module) {
  /*global define:false */
  /**
   * Copyright 2012-2017 Craig Campbell
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   * http://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   *
   * Mousetrap is a simple keyboard shortcut library for Javascript with
   * no external dependencies
   *
   * @version 1.6.3
   * @url craig.is/killing/mice
   */
  (function(window, document, undefined$1) {

      // Check if mousetrap is used inside browser, if not, return
      if (!window) {
          return;
      }

      /**
       * mapping of special keycodes to their corresponding keys
       *
       * everything in this dictionary cannot use keypress events
       * so it has to be here to map to the correct keycodes for
       * keyup/keydown events
       *
       * @type {Object}
       */
      var _MAP = {
          8: 'backspace',
          9: 'tab',
          13: 'enter',
          16: 'shift',
          17: 'ctrl',
          18: 'alt',
          20: 'capslock',
          27: 'esc',
          32: 'space',
          33: 'pageup',
          34: 'pagedown',
          35: 'end',
          36: 'home',
          37: 'left',
          38: 'up',
          39: 'right',
          40: 'down',
          45: 'ins',
          46: 'del',
          91: 'meta',
          93: 'meta',
          224: 'meta'
      };

      /**
       * mapping for special characters so they can support
       *
       * this dictionary is only used incase you want to bind a
       * keyup or keydown event to one of these keys
       *
       * @type {Object}
       */
      var _KEYCODE_MAP = {
          106: '*',
          107: '+',
          109: '-',
          110: '.',
          111 : '/',
          186: ';',
          187: '=',
          188: ',',
          189: '-',
          190: '.',
          191: '/',
          192: '`',
          219: '[',
          220: '\\',
          221: ']',
          222: '\''
      };

      /**
       * this is a mapping of keys that require shift on a US keypad
       * back to the non shift equivelents
       *
       * this is so you can use keyup events with these keys
       *
       * note that this will only work reliably on US keyboards
       *
       * @type {Object}
       */
      var _SHIFT_MAP = {
          '~': '`',
          '!': '1',
          '@': '2',
          '#': '3',
          '$': '4',
          '%': '5',
          '^': '6',
          '&': '7',
          '*': '8',
          '(': '9',
          ')': '0',
          '_': '-',
          '+': '=',
          ':': ';',
          '\"': '\'',
          '<': ',',
          '>': '.',
          '?': '/',
          '|': '\\'
      };

      /**
       * this is a list of special strings you can use to map
       * to modifier keys when you specify your keyboard shortcuts
       *
       * @type {Object}
       */
      var _SPECIAL_ALIASES = {
          'option': 'alt',
          'command': 'meta',
          'return': 'enter',
          'escape': 'esc',
          'plus': '+',
          'mod': /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'meta' : 'ctrl'
      };

      /**
       * variable to store the flipped version of _MAP from above
       * needed to check if we should use keypress or not when no action
       * is specified
       *
       * @type {Object|undefined}
       */
      var _REVERSE_MAP;

      /**
       * loop through the f keys, f1 to f19 and add them to the map
       * programatically
       */
      for (var i = 1; i < 20; ++i) {
          _MAP[111 + i] = 'f' + i;
      }

      /**
       * loop through to map numbers on the numeric keypad
       */
      for (i = 0; i <= 9; ++i) {

          // This needs to use a string cause otherwise since 0 is falsey
          // mousetrap will never fire for numpad 0 pressed as part of a keydown
          // event.
          //
          // @see https://github.com/ccampbell/mousetrap/pull/258
          _MAP[i + 96] = i.toString();
      }

      /**
       * cross browser add event method
       *
       * @param {Element|HTMLDocument} object
       * @param {string} type
       * @param {Function} callback
       * @returns void
       */
      function _addEvent(object, type, callback) {
          if (object.addEventListener) {
              object.addEventListener(type, callback, false);
              return;
          }

          object.attachEvent('on' + type, callback);
      }

      /**
       * takes the event and returns the key character
       *
       * @param {Event} e
       * @return {string}
       */
      function _characterFromEvent(e) {

          // for keypress events we should return the character as is
          if (e.type == 'keypress') {
              var character = String.fromCharCode(e.which);

              // if the shift key is not pressed then it is safe to assume
              // that we want the character to be lowercase.  this means if
              // you accidentally have caps lock on then your key bindings
              // will continue to work
              //
              // the only side effect that might not be desired is if you
              // bind something like 'A' cause you want to trigger an
              // event when capital A is pressed caps lock will no longer
              // trigger the event.  shift+a will though.
              if (!e.shiftKey) {
                  character = character.toLowerCase();
              }

              return character;
          }

          // for non keypress events the special maps are needed
          if (_MAP[e.which]) {
              return _MAP[e.which];
          }

          if (_KEYCODE_MAP[e.which]) {
              return _KEYCODE_MAP[e.which];
          }

          // if it is not in the special map

          // with keydown and keyup events the character seems to always
          // come in as an uppercase character whether you are pressing shift
          // or not.  we should make sure it is always lowercase for comparisons
          return String.fromCharCode(e.which).toLowerCase();
      }

      /**
       * checks if two arrays are equal
       *
       * @param {Array} modifiers1
       * @param {Array} modifiers2
       * @returns {boolean}
       */
      function _modifiersMatch(modifiers1, modifiers2) {
          return modifiers1.sort().join(',') === modifiers2.sort().join(',');
      }

      /**
       * takes a key event and figures out what the modifiers are
       *
       * @param {Event} e
       * @returns {Array}
       */
      function _eventModifiers(e) {
          var modifiers = [];

          if (e.shiftKey) {
              modifiers.push('shift');
          }

          if (e.altKey) {
              modifiers.push('alt');
          }

          if (e.ctrlKey) {
              modifiers.push('ctrl');
          }

          if (e.metaKey) {
              modifiers.push('meta');
          }

          return modifiers;
      }

      /**
       * prevents default for this event
       *
       * @param {Event} e
       * @returns void
       */
      function _preventDefault(e) {
          if (e.preventDefault) {
              e.preventDefault();
              return;
          }

          e.returnValue = false;
      }

      /**
       * stops propogation for this event
       *
       * @param {Event} e
       * @returns void
       */
      function _stopPropagation(e) {
          if (e.stopPropagation) {
              e.stopPropagation();
              return;
          }

          e.cancelBubble = true;
      }

      /**
       * determines if the keycode specified is a modifier key or not
       *
       * @param {string} key
       * @returns {boolean}
       */
      function _isModifier(key) {
          return key == 'shift' || key == 'ctrl' || key == 'alt' || key == 'meta';
      }

      /**
       * reverses the map lookup so that we can look for specific keys
       * to see what can and can't use keypress
       *
       * @return {Object}
       */
      function _getReverseMap() {
          if (!_REVERSE_MAP) {
              _REVERSE_MAP = {};
              for (var key in _MAP) {

                  // pull out the numeric keypad from here cause keypress should
                  // be able to detect the keys from the character
                  if (key > 95 && key < 112) {
                      continue;
                  }

                  if (_MAP.hasOwnProperty(key)) {
                      _REVERSE_MAP[_MAP[key]] = key;
                  }
              }
          }
          return _REVERSE_MAP;
      }

      /**
       * picks the best action based on the key combination
       *
       * @param {string} key - character for key
       * @param {Array} modifiers
       * @param {string=} action passed in
       */
      function _pickBestAction(key, modifiers, action) {

          // if no action was picked in we should try to pick the one
          // that we think would work best for this key
          if (!action) {
              action = _getReverseMap()[key] ? 'keydown' : 'keypress';
          }

          // modifier keys don't work as expected with keypress,
          // switch to keydown
          if (action == 'keypress' && modifiers.length) {
              action = 'keydown';
          }

          return action;
      }

      /**
       * Converts from a string key combination to an array
       *
       * @param  {string} combination like "command+shift+l"
       * @return {Array}
       */
      function _keysFromString(combination) {
          if (combination === '+') {
              return ['+'];
          }

          combination = combination.replace(/\+{2}/g, '+plus');
          return combination.split('+');
      }

      /**
       * Gets info for a specific key combination
       *
       * @param  {string} combination key combination ("command+s" or "a" or "*")
       * @param  {string=} action
       * @returns {Object}
       */
      function _getKeyInfo(combination, action) {
          var keys;
          var key;
          var i;
          var modifiers = [];

          // take the keys from this pattern and figure out what the actual
          // pattern is all about
          keys = _keysFromString(combination);

          for (i = 0; i < keys.length; ++i) {
              key = keys[i];

              // normalize key names
              if (_SPECIAL_ALIASES[key]) {
                  key = _SPECIAL_ALIASES[key];
              }

              // if this is not a keypress event then we should
              // be smart about using shift keys
              // this will only work for US keyboards however
              if (action && action != 'keypress' && _SHIFT_MAP[key]) {
                  key = _SHIFT_MAP[key];
                  modifiers.push('shift');
              }

              // if this key is a modifier then add it to the list of modifiers
              if (_isModifier(key)) {
                  modifiers.push(key);
              }
          }

          // depending on what the key combination is
          // we will try to pick the best event for it
          action = _pickBestAction(key, modifiers, action);

          return {
              key: key,
              modifiers: modifiers,
              action: action
          };
      }

      function _belongsTo(element, ancestor) {
          if (element === null || element === document) {
              return false;
          }

          if (element === ancestor) {
              return true;
          }

          return _belongsTo(element.parentNode, ancestor);
      }

      function Mousetrap(targetElement) {
          var self = this;

          targetElement = targetElement || document;

          if (!(self instanceof Mousetrap)) {
              return new Mousetrap(targetElement);
          }

          /**
           * element to attach key events to
           *
           * @type {Element}
           */
          self.target = targetElement;

          /**
           * a list of all the callbacks setup via Mousetrap.bind()
           *
           * @type {Object}
           */
          self._callbacks = {};

          /**
           * direct map of string combinations to callbacks used for trigger()
           *
           * @type {Object}
           */
          self._directMap = {};

          /**
           * keeps track of what level each sequence is at since multiple
           * sequences can start out with the same sequence
           *
           * @type {Object}
           */
          var _sequenceLevels = {};

          /**
           * variable to store the setTimeout call
           *
           * @type {null|number}
           */
          var _resetTimer;

          /**
           * temporary state where we will ignore the next keyup
           *
           * @type {boolean|string}
           */
          var _ignoreNextKeyup = false;

          /**
           * temporary state where we will ignore the next keypress
           *
           * @type {boolean}
           */
          var _ignoreNextKeypress = false;

          /**
           * are we currently inside of a sequence?
           * type of action ("keyup" or "keydown" or "keypress") or false
           *
           * @type {boolean|string}
           */
          var _nextExpectedAction = false;

          /**
           * resets all sequence counters except for the ones passed in
           *
           * @param {Object} doNotReset
           * @returns void
           */
          function _resetSequences(doNotReset) {
              doNotReset = doNotReset || {};

              var activeSequences = false,
                  key;

              for (key in _sequenceLevels) {
                  if (doNotReset[key]) {
                      activeSequences = true;
                      continue;
                  }
                  _sequenceLevels[key] = 0;
              }

              if (!activeSequences) {
                  _nextExpectedAction = false;
              }
          }

          /**
           * finds all callbacks that match based on the keycode, modifiers,
           * and action
           *
           * @param {string} character
           * @param {Array} modifiers
           * @param {Event|Object} e
           * @param {string=} sequenceName - name of the sequence we are looking for
           * @param {string=} combination
           * @param {number=} level
           * @returns {Array}
           */
          function _getMatches(character, modifiers, e, sequenceName, combination, level) {
              var i;
              var callback;
              var matches = [];
              var action = e.type;

              // if there are no events related to this keycode
              if (!self._callbacks[character]) {
                  return [];
              }

              // if a modifier key is coming up on its own we should allow it
              if (action == 'keyup' && _isModifier(character)) {
                  modifiers = [character];
              }

              // loop through all callbacks for the key that was pressed
              // and see if any of them match
              for (i = 0; i < self._callbacks[character].length; ++i) {
                  callback = self._callbacks[character][i];

                  // if a sequence name is not specified, but this is a sequence at
                  // the wrong level then move onto the next match
                  if (!sequenceName && callback.seq && _sequenceLevels[callback.seq] != callback.level) {
                      continue;
                  }

                  // if the action we are looking for doesn't match the action we got
                  // then we should keep going
                  if (action != callback.action) {
                      continue;
                  }

                  // if this is a keypress event and the meta key and control key
                  // are not pressed that means that we need to only look at the
                  // character, otherwise check the modifiers as well
                  //
                  // chrome will not fire a keypress if meta or control is down
                  // safari will fire a keypress if meta or meta+shift is down
                  // firefox will fire a keypress if meta or control is down
                  if ((action == 'keypress' && !e.metaKey && !e.ctrlKey) || _modifiersMatch(modifiers, callback.modifiers)) {

                      // when you bind a combination or sequence a second time it
                      // should overwrite the first one.  if a sequenceName or
                      // combination is specified in this call it does just that
                      //
                      // @todo make deleting its own method?
                      var deleteCombo = !sequenceName && callback.combo == combination;
                      var deleteSequence = sequenceName && callback.seq == sequenceName && callback.level == level;
                      if (deleteCombo || deleteSequence) {
                          self._callbacks[character].splice(i, 1);
                      }

                      matches.push(callback);
                  }
              }

              return matches;
          }

          /**
           * actually calls the callback function
           *
           * if your callback function returns false this will use the jquery
           * convention - prevent default and stop propogation on the event
           *
           * @param {Function} callback
           * @param {Event} e
           * @returns void
           */
          function _fireCallback(callback, e, combo, sequence) {

              // if this event should not happen stop here
              if (self.stopCallback(e, e.target || e.srcElement, combo, sequence)) {
                  return;
              }

              if (callback(e, combo) === false) {
                  _preventDefault(e);
                  _stopPropagation(e);
              }
          }

          /**
           * handles a character key event
           *
           * @param {string} character
           * @param {Array} modifiers
           * @param {Event} e
           * @returns void
           */
          self._handleKey = function(character, modifiers, e) {
              var callbacks = _getMatches(character, modifiers, e);
              var i;
              var doNotReset = {};
              var maxLevel = 0;
              var processedSequenceCallback = false;

              // Calculate the maxLevel for sequences so we can only execute the longest callback sequence
              for (i = 0; i < callbacks.length; ++i) {
                  if (callbacks[i].seq) {
                      maxLevel = Math.max(maxLevel, callbacks[i].level);
                  }
              }

              // loop through matching callbacks for this key event
              for (i = 0; i < callbacks.length; ++i) {

                  // fire for all sequence callbacks
                  // this is because if for example you have multiple sequences
                  // bound such as "g i" and "g t" they both need to fire the
                  // callback for matching g cause otherwise you can only ever
                  // match the first one
                  if (callbacks[i].seq) {

                      // only fire callbacks for the maxLevel to prevent
                      // subsequences from also firing
                      //
                      // for example 'a option b' should not cause 'option b' to fire
                      // even though 'option b' is part of the other sequence
                      //
                      // any sequences that do not match here will be discarded
                      // below by the _resetSequences call
                      if (callbacks[i].level != maxLevel) {
                          continue;
                      }

                      processedSequenceCallback = true;

                      // keep a list of which sequences were matches for later
                      doNotReset[callbacks[i].seq] = 1;
                      _fireCallback(callbacks[i].callback, e, callbacks[i].combo, callbacks[i].seq);
                      continue;
                  }

                  // if there were no sequence matches but we are still here
                  // that means this is a regular match so we should fire that
                  if (!processedSequenceCallback) {
                      _fireCallback(callbacks[i].callback, e, callbacks[i].combo);
                  }
              }

              // if the key you pressed matches the type of sequence without
              // being a modifier (ie "keyup" or "keypress") then we should
              // reset all sequences that were not matched by this event
              //
              // this is so, for example, if you have the sequence "h a t" and you
              // type "h e a r t" it does not match.  in this case the "e" will
              // cause the sequence to reset
              //
              // modifier keys are ignored because you can have a sequence
              // that contains modifiers such as "enter ctrl+space" and in most
              // cases the modifier key will be pressed before the next key
              //
              // also if you have a sequence such as "ctrl+b a" then pressing the
              // "b" key will trigger a "keypress" and a "keydown"
              //
              // the "keydown" is expected when there is a modifier, but the
              // "keypress" ends up matching the _nextExpectedAction since it occurs
              // after and that causes the sequence to reset
              //
              // we ignore keypresses in a sequence that directly follow a keydown
              // for the same character
              var ignoreThisKeypress = e.type == 'keypress' && _ignoreNextKeypress;
              if (e.type == _nextExpectedAction && !_isModifier(character) && !ignoreThisKeypress) {
                  _resetSequences(doNotReset);
              }

              _ignoreNextKeypress = processedSequenceCallback && e.type == 'keydown';
          };

          /**
           * handles a keydown event
           *
           * @param {Event} e
           * @returns void
           */
          function _handleKeyEvent(e) {

              // normalize e.which for key events
              // @see http://stackoverflow.com/questions/4285627/javascript-keycode-vs-charcode-utter-confusion
              if (typeof e.which !== 'number') {
                  e.which = e.keyCode;
              }

              var character = _characterFromEvent(e);

              // no character found then stop
              if (!character) {
                  return;
              }

              // need to use === for the character check because the character can be 0
              if (e.type == 'keyup' && _ignoreNextKeyup === character) {
                  _ignoreNextKeyup = false;
                  return;
              }

              self.handleKey(character, _eventModifiers(e), e);
          }

          /**
           * called to set a 1 second timeout on the specified sequence
           *
           * this is so after each key press in the sequence you have 1 second
           * to press the next key before you have to start over
           *
           * @returns void
           */
          function _resetSequenceTimer() {
              clearTimeout(_resetTimer);
              _resetTimer = setTimeout(_resetSequences, 1000);
          }

          /**
           * binds a key sequence to an event
           *
           * @param {string} combo - combo specified in bind call
           * @param {Array} keys
           * @param {Function} callback
           * @param {string=} action
           * @returns void
           */
          function _bindSequence(combo, keys, callback, action) {

              // start off by adding a sequence level record for this combination
              // and setting the level to 0
              _sequenceLevels[combo] = 0;

              /**
               * callback to increase the sequence level for this sequence and reset
               * all other sequences that were active
               *
               * @param {string} nextAction
               * @returns {Function}
               */
              function _increaseSequence(nextAction) {
                  return function() {
                      _nextExpectedAction = nextAction;
                      ++_sequenceLevels[combo];
                      _resetSequenceTimer();
                  };
              }

              /**
               * wraps the specified callback inside of another function in order
               * to reset all sequence counters as soon as this sequence is done
               *
               * @param {Event} e
               * @returns void
               */
              function _callbackAndReset(e) {
                  _fireCallback(callback, e, combo);

                  // we should ignore the next key up if the action is key down
                  // or keypress.  this is so if you finish a sequence and
                  // release the key the final key will not trigger a keyup
                  if (action !== 'keyup') {
                      _ignoreNextKeyup = _characterFromEvent(e);
                  }

                  // weird race condition if a sequence ends with the key
                  // another sequence begins with
                  setTimeout(_resetSequences, 10);
              }

              // loop through keys one at a time and bind the appropriate callback
              // function.  for any key leading up to the final one it should
              // increase the sequence. after the final, it should reset all sequences
              //
              // if an action is specified in the original bind call then that will
              // be used throughout.  otherwise we will pass the action that the
              // next key in the sequence should match.  this allows a sequence
              // to mix and match keypress and keydown events depending on which
              // ones are better suited to the key provided
              for (var i = 0; i < keys.length; ++i) {
                  var isFinal = i + 1 === keys.length;
                  var wrappedCallback = isFinal ? _callbackAndReset : _increaseSequence(action || _getKeyInfo(keys[i + 1]).action);
                  _bindSingle(keys[i], wrappedCallback, action, combo, i);
              }
          }

          /**
           * binds a single keyboard combination
           *
           * @param {string} combination
           * @param {Function} callback
           * @param {string=} action
           * @param {string=} sequenceName - name of sequence if part of sequence
           * @param {number=} level - what part of the sequence the command is
           * @returns void
           */
          function _bindSingle(combination, callback, action, sequenceName, level) {

              // store a direct mapped reference for use with Mousetrap.trigger
              self._directMap[combination + ':' + action] = callback;

              // make sure multiple spaces in a row become a single space
              combination = combination.replace(/\s+/g, ' ');

              var sequence = combination.split(' ');
              var info;

              // if this pattern is a sequence of keys then run through this method
              // to reprocess each pattern one key at a time
              if (sequence.length > 1) {
                  _bindSequence(combination, sequence, callback, action);
                  return;
              }

              info = _getKeyInfo(combination, action);

              // make sure to initialize array if this is the first time
              // a callback is added for this key
              self._callbacks[info.key] = self._callbacks[info.key] || [];

              // remove an existing match if there is one
              _getMatches(info.key, info.modifiers, {type: info.action}, sequenceName, combination, level);

              // add this call back to the array
              // if it is a sequence put it at the beginning
              // if not put it at the end
              //
              // this is important because the way these are processed expects
              // the sequence ones to come first
              self._callbacks[info.key][sequenceName ? 'unshift' : 'push']({
                  callback: callback,
                  modifiers: info.modifiers,
                  action: info.action,
                  seq: sequenceName,
                  level: level,
                  combo: combination
              });
          }

          /**
           * binds multiple combinations to the same callback
           *
           * @param {Array} combinations
           * @param {Function} callback
           * @param {string|undefined} action
           * @returns void
           */
          self._bindMultiple = function(combinations, callback, action) {
              for (var i = 0; i < combinations.length; ++i) {
                  _bindSingle(combinations[i], callback, action);
              }
          };

          // start!
          _addEvent(targetElement, 'keypress', _handleKeyEvent);
          _addEvent(targetElement, 'keydown', _handleKeyEvent);
          _addEvent(targetElement, 'keyup', _handleKeyEvent);
      }

      /**
       * binds an event to mousetrap
       *
       * can be a single key, a combination of keys separated with +,
       * an array of keys, or a sequence of keys separated by spaces
       *
       * be sure to list the modifier keys first to make sure that the
       * correct key ends up getting bound (the last key in the pattern)
       *
       * @param {string|Array} keys
       * @param {Function} callback
       * @param {string=} action - 'keypress', 'keydown', or 'keyup'
       * @returns void
       */
      Mousetrap.prototype.bind = function(keys, callback, action) {
          var self = this;
          keys = keys instanceof Array ? keys : [keys];
          self._bindMultiple.call(self, keys, callback, action);
          return self;
      };

      /**
       * unbinds an event to mousetrap
       *
       * the unbinding sets the callback function of the specified key combo
       * to an empty function and deletes the corresponding key in the
       * _directMap dict.
       *
       * TODO: actually remove this from the _callbacks dictionary instead
       * of binding an empty function
       *
       * the keycombo+action has to be exactly the same as
       * it was defined in the bind method
       *
       * @param {string|Array} keys
       * @param {string} action
       * @returns void
       */
      Mousetrap.prototype.unbind = function(keys, action) {
          var self = this;
          return self.bind.call(self, keys, function() {}, action);
      };

      /**
       * triggers an event that has already been bound
       *
       * @param {string} keys
       * @param {string=} action
       * @returns void
       */
      Mousetrap.prototype.trigger = function(keys, action) {
          var self = this;
          if (self._directMap[keys + ':' + action]) {
              self._directMap[keys + ':' + action]({}, keys);
          }
          return self;
      };

      /**
       * resets the library back to its initial state.  this is useful
       * if you want to clear out the current keyboard shortcuts and bind
       * new ones - for example if you switch to another page
       *
       * @returns void
       */
      Mousetrap.prototype.reset = function() {
          var self = this;
          self._callbacks = {};
          self._directMap = {};
          return self;
      };

      /**
       * should we stop this event before firing off callbacks
       *
       * @param {Event} e
       * @param {Element} element
       * @return {boolean}
       */
      Mousetrap.prototype.stopCallback = function(e, element) {
          var self = this;

          // if the element has the class "mousetrap" then no need to stop
          if ((' ' + element.className + ' ').indexOf(' mousetrap ') > -1) {
              return false;
          }

          if (_belongsTo(element, self.target)) {
              return false;
          }

          // Events originating from a shadow DOM are re-targetted and `e.target` is the shadow host,
          // not the initial event target in the shadow tree. Note that not all events cross the
          // shadow boundary.
          // For shadow trees with `mode: 'open'`, the initial event target is the first element in
          // the event’s composed path. For shadow trees with `mode: 'closed'`, the initial event
          // target cannot be obtained.
          if ('composedPath' in e && typeof e.composedPath === 'function') {
              // For open shadow trees, update `element` so that the following check works.
              var initialEventTarget = e.composedPath()[0];
              if (initialEventTarget !== e.target) {
                  element = initialEventTarget;
              }
          }

          // stop for input, select, and textarea
          return element.tagName == 'INPUT' || element.tagName == 'SELECT' || element.tagName == 'TEXTAREA' || element.isContentEditable;
      };

      /**
       * exposes _handleKey publicly so it can be overwritten by extensions
       */
      Mousetrap.prototype.handleKey = function() {
          var self = this;
          return self._handleKey.apply(self, arguments);
      };

      /**
       * allow custom key mappings
       */
      Mousetrap.addKeycodes = function(object) {
          for (var key in object) {
              if (object.hasOwnProperty(key)) {
                  _MAP[key] = object[key];
              }
          }
          _REVERSE_MAP = null;
      };

      /**
       * Init the global mousetrap functions
       *
       * This method is needed to allow the global mousetrap functions to work
       * now that mousetrap is a constructor function.
       */
      Mousetrap.init = function() {
          var documentMousetrap = Mousetrap(document);
          for (var method in documentMousetrap) {
              if (method.charAt(0) !== '_') {
                  Mousetrap[method] = (function(method) {
                      return function() {
                          return documentMousetrap[method].apply(documentMousetrap, arguments);
                      };
                  } (method));
              }
          }
      };

      Mousetrap.init();

      // expose mousetrap to the global object
      window.Mousetrap = Mousetrap;

      // expose as a common js module
      if ( module.exports) {
          module.exports = Mousetrap;
      }

      // expose mousetrap as an AMD module
      if (typeof undefined$1 === 'function' && undefined$1.amd) {
          undefined$1(function() {
              return Mousetrap;
          });
      }
  }) (typeof window !== 'undefined' ? window : null, typeof  window !== 'undefined' ? document : null);
  });

  var simple = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {

    CodeMirror.defineSimpleMode = function(name, states) {
      CodeMirror.defineMode(name, function(config) {
        return CodeMirror.simpleMode(config, states);
      });
    };

    CodeMirror.simpleMode = function(config, states) {
      ensureState(states, "start");
      var states_ = {}, meta = states.meta || {}, hasIndentation = false;
      for (var state in states) if (state != meta && states.hasOwnProperty(state)) {
        var list = states_[state] = [], orig = states[state];
        for (var i = 0; i < orig.length; i++) {
          var data = orig[i];
          list.push(new Rule(data, states));
          if (data.indent || data.dedent) hasIndentation = true;
        }
      }
      var mode = {
        startState: function() {
          return {state: "start", pending: null,
                  local: null, localState: null,
                  indent: hasIndentation ? [] : null};
        },
        copyState: function(state) {
          var s = {state: state.state, pending: state.pending,
                   local: state.local, localState: null,
                   indent: state.indent && state.indent.slice(0)};
          if (state.localState)
            s.localState = CodeMirror.copyState(state.local.mode, state.localState);
          if (state.stack)
            s.stack = state.stack.slice(0);
          for (var pers = state.persistentStates; pers; pers = pers.next)
            s.persistentStates = {mode: pers.mode,
                                  spec: pers.spec,
                                  state: pers.state == state.localState ? s.localState : CodeMirror.copyState(pers.mode, pers.state),
                                  next: s.persistentStates};
          return s;
        },
        token: tokenFunction(states_, config),
        innerMode: function(state) { return state.local && {mode: state.local.mode, state: state.localState}; },
        indent: indentFunction(states_, meta)
      };
      if (meta) for (var prop in meta) if (meta.hasOwnProperty(prop))
        mode[prop] = meta[prop];
      return mode;
    };

    function ensureState(states, name) {
      if (!states.hasOwnProperty(name))
        throw new Error("Undefined state " + name + " in simple mode");
    }

    function toRegex(val, caret) {
      if (!val) return /(?:)/;
      var flags = "";
      if (val instanceof RegExp) {
        if (val.ignoreCase) flags = "i";
        val = val.source;
      } else {
        val = String(val);
      }
      return new RegExp((caret === false ? "" : "^") + "(?:" + val + ")", flags);
    }

    function asToken(val) {
      if (!val) return null;
      if (val.apply) return val
      if (typeof val == "string") return val.replace(/\./g, " ");
      var result = [];
      for (var i = 0; i < val.length; i++)
        result.push(val[i] && val[i].replace(/\./g, " "));
      return result;
    }

    function Rule(data, states) {
      if (data.next || data.push) ensureState(states, data.next || data.push);
      this.regex = toRegex(data.regex);
      this.token = asToken(data.token);
      this.data = data;
    }

    function tokenFunction(states, config) {
      return function(stream, state) {
        if (state.pending) {
          var pend = state.pending.shift();
          if (state.pending.length == 0) state.pending = null;
          stream.pos += pend.text.length;
          return pend.token;
        }

        if (state.local) {
          if (state.local.end && stream.match(state.local.end)) {
            var tok = state.local.endToken || null;
            state.local = state.localState = null;
            return tok;
          } else {
            var tok = state.local.mode.token(stream, state.localState), m;
            if (state.local.endScan && (m = state.local.endScan.exec(stream.current())))
              stream.pos = stream.start + m.index;
            return tok;
          }
        }

        var curState = states[state.state];
        for (var i = 0; i < curState.length; i++) {
          var rule = curState[i];
          var matches = (!rule.data.sol || stream.sol()) && stream.match(rule.regex);
          if (matches) {
            if (rule.data.next) {
              state.state = rule.data.next;
            } else if (rule.data.push) {
              (state.stack || (state.stack = [])).push(state.state);
              state.state = rule.data.push;
            } else if (rule.data.pop && state.stack && state.stack.length) {
              state.state = state.stack.pop();
            }

            if (rule.data.mode)
              enterLocalMode(config, state, rule.data.mode, rule.token);
            if (rule.data.indent)
              state.indent.push(stream.indentation() + config.indentUnit);
            if (rule.data.dedent)
              state.indent.pop();
            var token = rule.token;
            if (token && token.apply) token = token(matches);
            if (matches.length > 2 && rule.token && typeof rule.token != "string") {
              state.pending = [];
              for (var j = 2; j < matches.length; j++)
                if (matches[j])
                  state.pending.push({text: matches[j], token: rule.token[j - 1]});
              stream.backUp(matches[0].length - (matches[1] ? matches[1].length : 0));
              return token[0];
            } else if (token && token.join) {
              return token[0];
            } else {
              return token;
            }
          }
        }
        stream.next();
        return null;
      };
    }

    function cmp(a, b) {
      if (a === b) return true;
      if (!a || typeof a != "object" || !b || typeof b != "object") return false;
      var props = 0;
      for (var prop in a) if (a.hasOwnProperty(prop)) {
        if (!b.hasOwnProperty(prop) || !cmp(a[prop], b[prop])) return false;
        props++;
      }
      for (var prop in b) if (b.hasOwnProperty(prop)) props--;
      return props == 0;
    }

    function enterLocalMode(config, state, spec, token) {
      var pers;
      if (spec.persistent) for (var p = state.persistentStates; p && !pers; p = p.next)
        if (spec.spec ? cmp(spec.spec, p.spec) : spec.mode == p.mode) pers = p;
      var mode = pers ? pers.mode : spec.mode || CodeMirror.getMode(config, spec.spec);
      var lState = pers ? pers.state : CodeMirror.startState(mode);
      if (spec.persistent && !pers)
        state.persistentStates = {mode: mode, spec: spec.spec, state: lState, next: state.persistentStates};

      state.localState = lState;
      state.local = {mode: mode,
                     end: spec.end && toRegex(spec.end),
                     endScan: spec.end && spec.forceEnd !== false && toRegex(spec.end, false),
                     endToken: token && token.join ? token[token.length - 1] : token};
    }

    function indexOf(val, arr) {
      for (var i = 0; i < arr.length; i++) if (arr[i] === val) return true;
    }

    function indentFunction(states, meta) {
      return function(state, textAfter, line) {
        if (state.local && state.local.mode.indent)
          return state.local.mode.indent(state.localState, textAfter, line);
        if (state.indent == null || state.local || meta.dontIndentStates && indexOf(state.state, meta.dontIndentStates) > -1)
          return CodeMirror.Pass;

        var pos = state.indent.length - 1, rules = states[state.state];
        scan: for (;;) {
          for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];
            if (rule.data.dedent && rule.data.dedentIfLineStart !== false) {
              var m = rule.regex.exec(textAfter);
              if (m && m[0]) {
                pos--;
                if (rule.next || rule.push) rules = states[rule.next || rule.push];
                textAfter = textAfter.slice(m[0].length);
                continue scan;
              }
            }
          }
          break;
        }
        return pos < 0 ? 0 : state.indent[pos];
      };
    }
  });
  });

  var dialog = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  // Open simple dialogs on top of an editor. Relies on dialog.css.

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {
    function dialogDiv(cm, template, bottom) {
      var wrap = cm.getWrapperElement();
      var dialog;
      dialog = wrap.appendChild(document.createElement("div"));
      if (bottom)
        dialog.className = "CodeMirror-dialog CodeMirror-dialog-bottom";
      else
        dialog.className = "CodeMirror-dialog CodeMirror-dialog-top";

      if (typeof template == "string") {
        dialog.innerHTML = template;
      } else { // Assuming it's a detached DOM element.
        dialog.appendChild(template);
      }
      CodeMirror.addClass(wrap, 'dialog-opened');
      return dialog;
    }

    function closeNotification(cm, newVal) {
      if (cm.state.currentNotificationClose)
        cm.state.currentNotificationClose();
      cm.state.currentNotificationClose = newVal;
    }

    CodeMirror.defineExtension("openDialog", function(template, callback, options) {
      if (!options) options = {};

      closeNotification(this, null);

      var dialog = dialogDiv(this, template, options.bottom);
      var closed = false, me = this;
      function close(newVal) {
        if (typeof newVal == 'string') {
          inp.value = newVal;
        } else {
          if (closed) return;
          closed = true;
          CodeMirror.rmClass(dialog.parentNode, 'dialog-opened');
          dialog.parentNode.removeChild(dialog);
          me.focus();

          if (options.onClose) options.onClose(dialog);
        }
      }

      var inp = dialog.getElementsByTagName("input")[0], button;
      if (inp) {
        inp.focus();

        if (options.value) {
          inp.value = options.value;
          if (options.selectValueOnOpen !== false) {
            inp.select();
          }
        }

        if (options.onInput)
          CodeMirror.on(inp, "input", function(e) { options.onInput(e, inp.value, close);});
        if (options.onKeyUp)
          CodeMirror.on(inp, "keyup", function(e) {options.onKeyUp(e, inp.value, close);});

        CodeMirror.on(inp, "keydown", function(e) {
          if (options && options.onKeyDown && options.onKeyDown(e, inp.value, close)) { return; }
          if (e.keyCode == 27 || (options.closeOnEnter !== false && e.keyCode == 13)) {
            inp.blur();
            CodeMirror.e_stop(e);
            close();
          }
          if (e.keyCode == 13) callback(inp.value, e);
        });

        if (options.closeOnBlur !== false) CodeMirror.on(inp, "blur", close);
      } else if (button = dialog.getElementsByTagName("button")[0]) {
        CodeMirror.on(button, "click", function() {
          close();
          me.focus();
        });

        if (options.closeOnBlur !== false) CodeMirror.on(button, "blur", close);

        button.focus();
      }
      return close;
    });

    CodeMirror.defineExtension("openConfirm", function(template, callbacks, options) {
      closeNotification(this, null);
      var dialog = dialogDiv(this, template, options && options.bottom);
      var buttons = dialog.getElementsByTagName("button");
      var closed = false, me = this, blurring = 1;
      function close() {
        if (closed) return;
        closed = true;
        CodeMirror.rmClass(dialog.parentNode, 'dialog-opened');
        dialog.parentNode.removeChild(dialog);
        me.focus();
      }
      buttons[0].focus();
      for (var i = 0; i < buttons.length; ++i) {
        var b = buttons[i];
        (function(callback) {
          CodeMirror.on(b, "click", function(e) {
            CodeMirror.e_preventDefault(e);
            close();
            if (callback) callback(me);
          });
        })(callbacks[i]);
        CodeMirror.on(b, "blur", function() {
          --blurring;
          setTimeout(function() { if (blurring <= 0) close(); }, 200);
        });
        CodeMirror.on(b, "focus", function() { ++blurring; });
      }
    });

    /*
     * openNotification
     * Opens a notification, that can be closed with an optional timer
     * (default 5000ms timer) and always closes on click.
     *
     * If a notification is opened while another is opened, it will close the
     * currently opened one and open the new one immediately.
     */
    CodeMirror.defineExtension("openNotification", function(template, options) {
      closeNotification(this, close);
      var dialog = dialogDiv(this, template, options && options.bottom);
      var closed = false, doneTimer;
      var duration = options && typeof options.duration !== "undefined" ? options.duration : 5000;

      function close() {
        if (closed) return;
        closed = true;
        clearTimeout(doneTimer);
        CodeMirror.rmClass(dialog.parentNode, 'dialog-opened');
        dialog.parentNode.removeChild(dialog);
      }

      CodeMirror.on(dialog, 'click', function(e) {
        CodeMirror.e_preventDefault(e);
        close();
      });

      if (duration)
        doneTimer = setTimeout(close, duration);

      return close;
    });
  });
  });

  var searchcursor = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {
    var Pos = CodeMirror.Pos;

    function regexpFlags(regexp) {
      var flags = regexp.flags;
      return flags != null ? flags : (regexp.ignoreCase ? "i" : "")
        + (regexp.global ? "g" : "")
        + (regexp.multiline ? "m" : "")
    }

    function ensureFlags(regexp, flags) {
      var current = regexpFlags(regexp), target = current;
      for (var i = 0; i < flags.length; i++) if (target.indexOf(flags.charAt(i)) == -1)
        target += flags.charAt(i);
      return current == target ? regexp : new RegExp(regexp.source, target)
    }

    function maybeMultiline(regexp) {
      return /\\s|\\n|\n|\\W|\\D|\[\^/.test(regexp.source)
    }

    function searchRegexpForward(doc, regexp, start) {
      regexp = ensureFlags(regexp, "g");
      for (var line = start.line, ch = start.ch, last = doc.lastLine(); line <= last; line++, ch = 0) {
        regexp.lastIndex = ch;
        var string = doc.getLine(line), match = regexp.exec(string);
        if (match)
          return {from: Pos(line, match.index),
                  to: Pos(line, match.index + match[0].length),
                  match: match}
      }
    }

    function searchRegexpForwardMultiline(doc, regexp, start) {
      if (!maybeMultiline(regexp)) return searchRegexpForward(doc, regexp, start)

      regexp = ensureFlags(regexp, "gm");
      var string, chunk = 1;
      for (var line = start.line, last = doc.lastLine(); line <= last;) {
        // This grows the search buffer in exponentially-sized chunks
        // between matches, so that nearby matches are fast and don't
        // require concatenating the whole document (in case we're
        // searching for something that has tons of matches), but at the
        // same time, the amount of retries is limited.
        for (var i = 0; i < chunk; i++) {
          if (line > last) break
          var curLine = doc.getLine(line++);
          string = string == null ? curLine : string + "\n" + curLine;
        }
        chunk = chunk * 2;
        regexp.lastIndex = start.ch;
        var match = regexp.exec(string);
        if (match) {
          var before = string.slice(0, match.index).split("\n"), inside = match[0].split("\n");
          var startLine = start.line + before.length - 1, startCh = before[before.length - 1].length;
          return {from: Pos(startLine, startCh),
                  to: Pos(startLine + inside.length - 1,
                          inside.length == 1 ? startCh + inside[0].length : inside[inside.length - 1].length),
                  match: match}
        }
      }
    }

    function lastMatchIn(string, regexp) {
      var cutOff = 0, match;
      for (;;) {
        regexp.lastIndex = cutOff;
        var newMatch = regexp.exec(string);
        if (!newMatch) return match
        match = newMatch;
        cutOff = match.index + (match[0].length || 1);
        if (cutOff == string.length) return match
      }
    }

    function searchRegexpBackward(doc, regexp, start) {
      regexp = ensureFlags(regexp, "g");
      for (var line = start.line, ch = start.ch, first = doc.firstLine(); line >= first; line--, ch = -1) {
        var string = doc.getLine(line);
        if (ch > -1) string = string.slice(0, ch);
        var match = lastMatchIn(string, regexp);
        if (match)
          return {from: Pos(line, match.index),
                  to: Pos(line, match.index + match[0].length),
                  match: match}
      }
    }

    function searchRegexpBackwardMultiline(doc, regexp, start) {
      regexp = ensureFlags(regexp, "gm");
      var string, chunk = 1;
      for (var line = start.line, first = doc.firstLine(); line >= first;) {
        for (var i = 0; i < chunk; i++) {
          var curLine = doc.getLine(line--);
          string = string == null ? curLine.slice(0, start.ch) : curLine + "\n" + string;
        }
        chunk *= 2;

        var match = lastMatchIn(string, regexp);
        if (match) {
          var before = string.slice(0, match.index).split("\n"), inside = match[0].split("\n");
          var startLine = line + before.length, startCh = before[before.length - 1].length;
          return {from: Pos(startLine, startCh),
                  to: Pos(startLine + inside.length - 1,
                          inside.length == 1 ? startCh + inside[0].length : inside[inside.length - 1].length),
                  match: match}
        }
      }
    }

    var doFold, noFold;
    if (String.prototype.normalize) {
      doFold = function(str) { return str.normalize("NFD").toLowerCase() };
      noFold = function(str) { return str.normalize("NFD") };
    } else {
      doFold = function(str) { return str.toLowerCase() };
      noFold = function(str) { return str };
    }

    // Maps a position in a case-folded line back to a position in the original line
    // (compensating for codepoints increasing in number during folding)
    function adjustPos(orig, folded, pos, foldFunc) {
      if (orig.length == folded.length) return pos
      for (var min = 0, max = pos + Math.max(0, orig.length - folded.length);;) {
        if (min == max) return min
        var mid = (min + max) >> 1;
        var len = foldFunc(orig.slice(0, mid)).length;
        if (len == pos) return mid
        else if (len > pos) max = mid;
        else min = mid + 1;
      }
    }

    function searchStringForward(doc, query, start, caseFold) {
      // Empty string would match anything and never progress, so we
      // define it to match nothing instead.
      if (!query.length) return null
      var fold = caseFold ? doFold : noFold;
      var lines = fold(query).split(/\r|\n\r?/);

      search: for (var line = start.line, ch = start.ch, last = doc.lastLine() + 1 - lines.length; line <= last; line++, ch = 0) {
        var orig = doc.getLine(line).slice(ch), string = fold(orig);
        if (lines.length == 1) {
          var found = string.indexOf(lines[0]);
          if (found == -1) continue search
          var start = adjustPos(orig, string, found, fold) + ch;
          return {from: Pos(line, adjustPos(orig, string, found, fold) + ch),
                  to: Pos(line, adjustPos(orig, string, found + lines[0].length, fold) + ch)}
        } else {
          var cutFrom = string.length - lines[0].length;
          if (string.slice(cutFrom) != lines[0]) continue search
          for (var i = 1; i < lines.length - 1; i++)
            if (fold(doc.getLine(line + i)) != lines[i]) continue search
          var end = doc.getLine(line + lines.length - 1), endString = fold(end), lastLine = lines[lines.length - 1];
          if (endString.slice(0, lastLine.length) != lastLine) continue search
          return {from: Pos(line, adjustPos(orig, string, cutFrom, fold) + ch),
                  to: Pos(line + lines.length - 1, adjustPos(end, endString, lastLine.length, fold))}
        }
      }
    }

    function searchStringBackward(doc, query, start, caseFold) {
      if (!query.length) return null
      var fold = caseFold ? doFold : noFold;
      var lines = fold(query).split(/\r|\n\r?/);

      search: for (var line = start.line, ch = start.ch, first = doc.firstLine() - 1 + lines.length; line >= first; line--, ch = -1) {
        var orig = doc.getLine(line);
        if (ch > -1) orig = orig.slice(0, ch);
        var string = fold(orig);
        if (lines.length == 1) {
          var found = string.lastIndexOf(lines[0]);
          if (found == -1) continue search
          return {from: Pos(line, adjustPos(orig, string, found, fold)),
                  to: Pos(line, adjustPos(orig, string, found + lines[0].length, fold))}
        } else {
          var lastLine = lines[lines.length - 1];
          if (string.slice(0, lastLine.length) != lastLine) continue search
          for (var i = 1, start = line - lines.length + 1; i < lines.length - 1; i++)
            if (fold(doc.getLine(start + i)) != lines[i]) continue search
          var top = doc.getLine(line + 1 - lines.length), topString = fold(top);
          if (topString.slice(topString.length - lines[0].length) != lines[0]) continue search
          return {from: Pos(line + 1 - lines.length, adjustPos(top, topString, top.length - lines[0].length, fold)),
                  to: Pos(line, adjustPos(orig, string, lastLine.length, fold))}
        }
      }
    }

    function SearchCursor(doc, query, pos, options) {
      this.atOccurrence = false;
      this.doc = doc;
      pos = pos ? doc.clipPos(pos) : Pos(0, 0);
      this.pos = {from: pos, to: pos};

      var caseFold;
      if (typeof options == "object") {
        caseFold = options.caseFold;
      } else { // Backwards compat for when caseFold was the 4th argument
        caseFold = options;
        options = null;
      }

      if (typeof query == "string") {
        if (caseFold == null) caseFold = false;
        this.matches = function(reverse, pos) {
          return (reverse ? searchStringBackward : searchStringForward)(doc, query, pos, caseFold)
        };
      } else {
        query = ensureFlags(query, "gm");
        if (!options || options.multiline !== false)
          this.matches = function(reverse, pos) {
            return (reverse ? searchRegexpBackwardMultiline : searchRegexpForwardMultiline)(doc, query, pos)
          };
        else
          this.matches = function(reverse, pos) {
            return (reverse ? searchRegexpBackward : searchRegexpForward)(doc, query, pos)
          };
      }
    }

    SearchCursor.prototype = {
      findNext: function() {return this.find(false)},
      findPrevious: function() {return this.find(true)},

      find: function(reverse) {
        var result = this.matches(reverse, this.doc.clipPos(reverse ? this.pos.from : this.pos.to));

        // Implements weird auto-growing behavior on null-matches for
        // backwards-compatiblity with the vim code (unfortunately)
        while (result && CodeMirror.cmpPos(result.from, result.to) == 0) {
          if (reverse) {
            if (result.from.ch) result.from = Pos(result.from.line, result.from.ch - 1);
            else if (result.from.line == this.doc.firstLine()) result = null;
            else result = this.matches(reverse, this.doc.clipPos(Pos(result.from.line - 1)));
          } else {
            if (result.to.ch < this.doc.getLine(result.to.line).length) result.to = Pos(result.to.line, result.to.ch + 1);
            else if (result.to.line == this.doc.lastLine()) result = null;
            else result = this.matches(reverse, Pos(result.to.line + 1, 0));
          }
        }

        if (result) {
          this.pos = result;
          this.atOccurrence = true;
          return this.pos.match || true
        } else {
          var end = Pos(reverse ? this.doc.firstLine() : this.doc.lastLine() + 1, 0);
          this.pos = {from: end, to: end};
          return this.atOccurrence = false
        }
      },

      from: function() {if (this.atOccurrence) return this.pos.from},
      to: function() {if (this.atOccurrence) return this.pos.to},

      replace: function(newText, origin) {
        if (!this.atOccurrence) return
        var lines = CodeMirror.splitLines(newText);
        this.doc.replaceRange(lines, this.pos.from, this.pos.to, origin);
        this.pos.to = Pos(this.pos.from.line + lines.length - 1,
                          lines[lines.length - 1].length + (lines.length == 1 ? this.pos.from.ch : 0));
      }
    };

    CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
      return new SearchCursor(this.doc, query, pos, caseFold)
    });
    CodeMirror.defineDocExtension("getSearchCursor", function(query, pos, caseFold) {
      return new SearchCursor(this, query, pos, caseFold)
    });

    CodeMirror.defineExtension("selectMatches", function(query, caseFold) {
      var ranges = [];
      var cur = this.getSearchCursor(query, this.getCursor("from"), caseFold);
      while (cur.findNext()) {
        if (CodeMirror.cmpPos(cur.to(), this.getCursor("to")) > 0) break
        ranges.push({anchor: cur.from(), head: cur.to()});
      }
      if (ranges.length)
        this.setSelections(ranges, 0);
    });
  });
  });

  var search = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  // Define search commands. Depends on dialog.js or another
  // implementation of the openDialog method.

  // Replace works a little oddly -- it will do the replace on the next
  // Ctrl-G (or whatever is bound to findNext) press. You prevent a
  // replace by making sure the match is no longer selected when hitting
  // Ctrl-G.

  (function(mod) {
    mod(codemirror, searchcursor, dialog);
  })(function(CodeMirror) {

    function searchOverlay(query, caseInsensitive) {
      if (typeof query == "string")
        query = new RegExp(query.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), caseInsensitive ? "gi" : "g");
      else if (!query.global)
        query = new RegExp(query.source, query.ignoreCase ? "gi" : "g");

      return {token: function(stream) {
        query.lastIndex = stream.pos;
        var match = query.exec(stream.string);
        if (match && match.index == stream.pos) {
          stream.pos += match[0].length || 1;
          return "searching";
        } else if (match) {
          stream.pos = match.index;
        } else {
          stream.skipToEnd();
        }
      }};
    }

    function SearchState() {
      this.posFrom = this.posTo = this.lastQuery = this.query = null;
      this.overlay = null;
    }

    function getSearchState(cm) {
      return cm.state.search || (cm.state.search = new SearchState());
    }

    function queryCaseInsensitive(query) {
      return typeof query == "string" && query == query.toLowerCase();
    }

    function getSearchCursor(cm, query, pos) {
      // Heuristic: if the query string is all lowercase, do a case insensitive search.
      return cm.getSearchCursor(query, pos, {caseFold: queryCaseInsensitive(query), multiline: true});
    }

    function persistentDialog(cm, text, deflt, onEnter, onKeyDown) {
      cm.openDialog(text, onEnter, {
        value: deflt,
        selectValueOnOpen: true,
        closeOnEnter: false,
        onClose: function() { clearSearch(cm); },
        onKeyDown: onKeyDown
      });
    }

    function dialog(cm, text, shortText, deflt, f) {
      if (cm.openDialog) cm.openDialog(text, f, {value: deflt, selectValueOnOpen: true});
      else f(prompt(shortText, deflt));
    }

    function confirmDialog(cm, text, shortText, fs) {
      if (cm.openConfirm) cm.openConfirm(text, fs);
      else if (confirm(shortText)) fs[0]();
    }

    function parseString(string) {
      return string.replace(/\\([nrt\\])/g, function(match, ch) {
        if (ch == "n") return "\n"
        if (ch == "r") return "\r"
        if (ch == "t") return "\t"
        if (ch == "\\") return "\\"
        return match
      })
    }

    function parseQuery(query) {
      var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
      if (isRE) {
        try { query = new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i"); }
        catch(e) {} // Not a regular expression after all, do a string search
      } else {
        query = parseString(query);
      }
      if (typeof query == "string" ? query == "" : query.test(""))
        query = /x^/;
      return query;
    }

    function startSearch(cm, state, query) {
      state.queryText = query;
      state.query = parseQuery(query);
      cm.removeOverlay(state.overlay, queryCaseInsensitive(state.query));
      state.overlay = searchOverlay(state.query, queryCaseInsensitive(state.query));
      cm.addOverlay(state.overlay);
      if (cm.showMatchesOnScrollbar) {
        if (state.annotate) { state.annotate.clear(); state.annotate = null; }
        state.annotate = cm.showMatchesOnScrollbar(state.query, queryCaseInsensitive(state.query));
      }
    }

    function doSearch(cm, rev, persistent, immediate) {
      var state = getSearchState(cm);
      if (state.query) return findNext(cm, rev);
      var q = cm.getSelection() || state.lastQuery;
      if (q instanceof RegExp && q.source == "x^") q = null;
      if (persistent && cm.openDialog) {
        var hiding = null;
        var searchNext = function(query, event) {
          CodeMirror.e_stop(event);
          if (!query) return;
          if (query != state.queryText) {
            startSearch(cm, state, query);
            state.posFrom = state.posTo = cm.getCursor();
          }
          if (hiding) hiding.style.opacity = 1;
          findNext(cm, event.shiftKey, function(_, to) {
            var dialog;
            if (to.line < 3 && document.querySelector &&
                (dialog = cm.display.wrapper.querySelector(".CodeMirror-dialog")) &&
                dialog.getBoundingClientRect().bottom - 4 > cm.cursorCoords(to, "window").top)
              (hiding = dialog).style.opacity = .4;
          });
        };
        persistentDialog(cm, getQueryDialog(cm), q, searchNext, function(event, query) {
          var keyName = CodeMirror.keyName(event);
          var extra = cm.getOption('extraKeys'), cmd = (extra && extra[keyName]) || CodeMirror.keyMap[cm.getOption("keyMap")][keyName];
          if (cmd == "findNext" || cmd == "findPrev" ||
            cmd == "findPersistentNext" || cmd == "findPersistentPrev") {
            CodeMirror.e_stop(event);
            startSearch(cm, getSearchState(cm), query);
            cm.execCommand(cmd);
          } else if (cmd == "find" || cmd == "findPersistent") {
            CodeMirror.e_stop(event);
            searchNext(query, event);
          }
        });
        if (immediate && q) {
          startSearch(cm, state, q);
          findNext(cm, rev);
        }
      } else {
        dialog(cm, getQueryDialog(cm), "Search for:", q, function(query) {
          if (query && !state.query) cm.operation(function() {
            startSearch(cm, state, query);
            state.posFrom = state.posTo = cm.getCursor();
            findNext(cm, rev);
          });
        });
      }
    }

    function findNext(cm, rev, callback) {cm.operation(function() {
      var state = getSearchState(cm);
      var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
      if (!cursor.find(rev)) {
        cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
        if (!cursor.find(rev)) return;
      }
      cm.setSelection(cursor.from(), cursor.to());
      cm.scrollIntoView({from: cursor.from(), to: cursor.to()}, 20);
      state.posFrom = cursor.from(); state.posTo = cursor.to();
      if (callback) callback(cursor.from(), cursor.to());
    });}

    function clearSearch(cm) {cm.operation(function() {
      var state = getSearchState(cm);
      state.lastQuery = state.query;
      if (!state.query) return;
      state.query = state.queryText = null;
      cm.removeOverlay(state.overlay);
      if (state.annotate) { state.annotate.clear(); state.annotate = null; }
    });}


    function getQueryDialog(cm)  {
      return '<span class="CodeMirror-search-label">' + cm.phrase("Search:") + '</span> <input type="text" style="width: 10em" class="CodeMirror-search-field"/> <span style="color: #888" class="CodeMirror-search-hint">' + cm.phrase("(Use /re/ syntax for regexp search)") + '</span>';
    }
    function getReplaceQueryDialog(cm) {
      return ' <input type="text" style="width: 10em" class="CodeMirror-search-field"/> <span style="color: #888" class="CodeMirror-search-hint">' + cm.phrase("(Use /re/ syntax for regexp search)") + '</span>';
    }
    function getReplacementQueryDialog(cm) {
      return '<span class="CodeMirror-search-label">' + cm.phrase("With:") + '</span> <input type="text" style="width: 10em" class="CodeMirror-search-field"/>';
    }
    function getDoReplaceConfirm(cm) {
      return '<span class="CodeMirror-search-label">' + cm.phrase("Replace?") + '</span> <button>' + cm.phrase("Yes") + '</button> <button>' + cm.phrase("No") + '</button> <button>' + cm.phrase("All") + '</button> <button>' + cm.phrase("Stop") + '</button> ';
    }

    function replaceAll(cm, query, text) {
      cm.operation(function() {
        for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
          if (typeof query != "string") {
            var match = cm.getRange(cursor.from(), cursor.to()).match(query);
            cursor.replace(text.replace(/\$(\d)/g, function(_, i) {return match[i];}));
          } else cursor.replace(text);
        }
      });
    }

    function replace(cm, all) {
      if (cm.getOption("readOnly")) return;
      var query = cm.getSelection() || getSearchState(cm).lastQuery;
      var dialogText = '<span class="CodeMirror-search-label">' + (all ? cm.phrase("Replace all:") : cm.phrase("Replace:")) + '</span>';
      dialog(cm, dialogText + getReplaceQueryDialog(cm), dialogText, query, function(query) {
        if (!query) return;
        query = parseQuery(query);
        dialog(cm, getReplacementQueryDialog(cm), cm.phrase("Replace with:"), "", function(text) {
          text = parseString(text);
          if (all) {
            replaceAll(cm, query, text);
          } else {
            clearSearch(cm);
            var cursor = getSearchCursor(cm, query, cm.getCursor("from"));
            var advance = function() {
              var start = cursor.from(), match;
              if (!(match = cursor.findNext())) {
                cursor = getSearchCursor(cm, query);
                if (!(match = cursor.findNext()) ||
                    (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
              }
              cm.setSelection(cursor.from(), cursor.to());
              cm.scrollIntoView({from: cursor.from(), to: cursor.to()});
              confirmDialog(cm, getDoReplaceConfirm(cm), cm.phrase("Replace?"),
                            [function() {doReplace(match);}, advance,
                             function() {replaceAll(cm, query, text);}]);
            };
            var doReplace = function(match) {
              cursor.replace(typeof query == "string" ? text :
                             text.replace(/\$(\d)/g, function(_, i) {return match[i];}));
              advance();
            };
            advance();
          }
        });
      });
    }

    CodeMirror.commands.find = function(cm) {clearSearch(cm); doSearch(cm);};
    CodeMirror.commands.findPersistent = function(cm) {clearSearch(cm); doSearch(cm, false, true);};
    CodeMirror.commands.findPersistentNext = function(cm) {doSearch(cm, false, true, true);};
    CodeMirror.commands.findPersistentPrev = function(cm) {doSearch(cm, true, true, true);};
    CodeMirror.commands.findNext = doSearch;
    CodeMirror.commands.findPrev = function(cm) {doSearch(cm, true);};
    CodeMirror.commands.clearSearch = clearSearch;
    CodeMirror.commands.replace = replace;
    CodeMirror.commands.replaceAll = function(cm) {replace(cm, true);};
  });
  });

  var rulers = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {

    CodeMirror.defineOption("rulers", false, function(cm, val) {
      if (cm.state.rulerDiv) {
        cm.state.rulerDiv.parentElement.removeChild(cm.state.rulerDiv);
        cm.state.rulerDiv = null;
        cm.off("refresh", drawRulers);
      }
      if (val && val.length) {
        cm.state.rulerDiv = cm.display.lineSpace.parentElement.insertBefore(document.createElement("div"), cm.display.lineSpace);
        cm.state.rulerDiv.className = "CodeMirror-rulers";
        drawRulers(cm);
        cm.on("refresh", drawRulers);
      }
    });

    function drawRulers(cm) {
      cm.state.rulerDiv.textContent = "";
      var val = cm.getOption("rulers");
      var cw = cm.defaultCharWidth();
      var left = cm.charCoords(CodeMirror.Pos(cm.firstLine(), 0), "div").left;
      cm.state.rulerDiv.style.minHeight = (cm.display.scroller.offsetHeight + 30) + "px";
      for (var i = 0; i < val.length; i++) {
        var elt = document.createElement("div");
        elt.className = "CodeMirror-ruler";
        var col, conf = val[i];
        if (typeof conf == "number") {
          col = conf;
        } else {
          col = conf.column;
          if (conf.className) elt.className += " " + conf.className;
          if (conf.color) elt.style.borderColor = conf.color;
          if (conf.lineStyle) elt.style.borderLeftStyle = conf.lineStyle;
          if (conf.width) elt.style.borderLeftWidth = conf.width;
        }
        elt.style.left = (left + col * cw) + "px";
        cm.state.rulerDiv.appendChild(elt);
      }
    }
  });
  });

  var trailingspace = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {
    CodeMirror.defineOption("showTrailingSpace", false, function(cm, val, prev) {
      if (prev == CodeMirror.Init) prev = false;
      if (prev && !val)
        cm.removeOverlay("trailingspace");
      else if (!prev && val)
        cm.addOverlay({
          token: function(stream) {
            for (var l = stream.string.length, i = l; i && /\s/.test(stream.string.charAt(i - 1)); --i) {}
            if (i > stream.pos) { stream.pos = i; return null; }
            stream.pos = l;
            return "trailingspace";
          },
          name: "trailingspace"
        });
    });
  });
  });

  var foldcode = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {

    function doFold(cm, pos, options, force) {
      if (options && options.call) {
        var finder = options;
        options = null;
      } else {
        var finder = getOption(cm, options, "rangeFinder");
      }
      if (typeof pos == "number") pos = CodeMirror.Pos(pos, 0);
      var minSize = getOption(cm, options, "minFoldSize");

      function getRange(allowFolded) {
        var range = finder(cm, pos);
        if (!range || range.to.line - range.from.line < minSize) return null;
        var marks = cm.findMarksAt(range.from);
        for (var i = 0; i < marks.length; ++i) {
          if (marks[i].__isFold && force !== "fold") {
            if (!allowFolded) return null;
            range.cleared = true;
            marks[i].clear();
          }
        }
        return range;
      }

      var range = getRange(true);
      if (getOption(cm, options, "scanUp")) while (!range && pos.line > cm.firstLine()) {
        pos = CodeMirror.Pos(pos.line - 1, 0);
        range = getRange(false);
      }
      if (!range || range.cleared || force === "unfold") return;

      var myWidget = makeWidget(cm, options);
      CodeMirror.on(myWidget, "mousedown", function(e) {
        myRange.clear();
        CodeMirror.e_preventDefault(e);
      });
      var myRange = cm.markText(range.from, range.to, {
        replacedWith: myWidget,
        clearOnEnter: getOption(cm, options, "clearOnEnter"),
        __isFold: true
      });
      myRange.on("clear", function(from, to) {
        CodeMirror.signal(cm, "unfold", cm, from, to);
      });
      CodeMirror.signal(cm, "fold", cm, range.from, range.to);
    }

    function makeWidget(cm, options) {
      var widget = getOption(cm, options, "widget");
      if (typeof widget == "string") {
        var text = document.createTextNode(widget);
        widget = document.createElement("span");
        widget.appendChild(text);
        widget.className = "CodeMirror-foldmarker";
      } else if (widget) {
        widget = widget.cloneNode(true);
      }
      return widget;
    }

    // Clumsy backwards-compatible interface
    CodeMirror.newFoldFunction = function(rangeFinder, widget) {
      return function(cm, pos) { doFold(cm, pos, {rangeFinder: rangeFinder, widget: widget}); };
    };

    // New-style interface
    CodeMirror.defineExtension("foldCode", function(pos, options, force) {
      doFold(this, pos, options, force);
    });

    CodeMirror.defineExtension("isFolded", function(pos) {
      var marks = this.findMarksAt(pos);
      for (var i = 0; i < marks.length; ++i)
        if (marks[i].__isFold) return true;
    });

    CodeMirror.commands.toggleFold = function(cm) {
      cm.foldCode(cm.getCursor());
    };
    CodeMirror.commands.fold = function(cm) {
      cm.foldCode(cm.getCursor(), null, "fold");
    };
    CodeMirror.commands.unfold = function(cm) {
      cm.foldCode(cm.getCursor(), null, "unfold");
    };
    CodeMirror.commands.foldAll = function(cm) {
      cm.operation(function() {
        for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
          cm.foldCode(CodeMirror.Pos(i, 0), null, "fold");
      });
    };
    CodeMirror.commands.unfoldAll = function(cm) {
      cm.operation(function() {
        for (var i = cm.firstLine(), e = cm.lastLine(); i <= e; i++)
          cm.foldCode(CodeMirror.Pos(i, 0), null, "unfold");
      });
    };

    CodeMirror.registerHelper("fold", "combine", function() {
      var funcs = Array.prototype.slice.call(arguments, 0);
      return function(cm, start) {
        for (var i = 0; i < funcs.length; ++i) {
          var found = funcs[i](cm, start);
          if (found) return found;
        }
      };
    });

    CodeMirror.registerHelper("fold", "auto", function(cm, start) {
      var helpers = cm.getHelpers(start, "fold");
      for (var i = 0; i < helpers.length; i++) {
        var cur = helpers[i](cm, start);
        if (cur) return cur;
      }
    });

    var defaultOptions = {
      rangeFinder: CodeMirror.fold.auto,
      widget: "\u2194",
      minFoldSize: 0,
      scanUp: false,
      clearOnEnter: true
    };

    CodeMirror.defineOption("foldOptions", null);

    function getOption(cm, options, name) {
      if (options && options[name] !== undefined)
        return options[name];
      var editorOptions = cm.options.foldOptions;
      if (editorOptions && editorOptions[name] !== undefined)
        return editorOptions[name];
      return defaultOptions[name];
    }

    CodeMirror.defineExtension("foldOption", function(options, name) {
      return getOption(this, options, name);
    });
  });
  });

  var foldgutter = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror, foldcode);
  })(function(CodeMirror) {

    CodeMirror.defineOption("foldGutter", false, function(cm, val, old) {
      if (old && old != CodeMirror.Init) {
        cm.clearGutter(cm.state.foldGutter.options.gutter);
        cm.state.foldGutter = null;
        cm.off("gutterClick", onGutterClick);
        cm.off("changes", onChange);
        cm.off("viewportChange", onViewportChange);
        cm.off("fold", onFold);
        cm.off("unfold", onFold);
        cm.off("swapDoc", onChange);
      }
      if (val) {
        cm.state.foldGutter = new State(parseOptions(val));
        updateInViewport(cm);
        cm.on("gutterClick", onGutterClick);
        cm.on("changes", onChange);
        cm.on("viewportChange", onViewportChange);
        cm.on("fold", onFold);
        cm.on("unfold", onFold);
        cm.on("swapDoc", onChange);
      }
    });

    var Pos = CodeMirror.Pos;

    function State(options) {
      this.options = options;
      this.from = this.to = 0;
    }

    function parseOptions(opts) {
      if (opts === true) opts = {};
      if (opts.gutter == null) opts.gutter = "CodeMirror-foldgutter";
      if (opts.indicatorOpen == null) opts.indicatorOpen = "CodeMirror-foldgutter-open";
      if (opts.indicatorFolded == null) opts.indicatorFolded = "CodeMirror-foldgutter-folded";
      return opts;
    }

    function isFolded(cm, line) {
      var marks = cm.findMarks(Pos(line, 0), Pos(line + 1, 0));
      for (var i = 0; i < marks.length; ++i) {
        if (marks[i].__isFold) {
          var fromPos = marks[i].find(-1);
          if (fromPos && fromPos.line === line)
            return marks[i];
        }
      }
    }

    function marker(spec) {
      if (typeof spec == "string") {
        var elt = document.createElement("div");
        elt.className = spec + " CodeMirror-guttermarker-subtle";
        return elt;
      } else {
        return spec.cloneNode(true);
      }
    }

    function updateFoldInfo(cm, from, to) {
      var opts = cm.state.foldGutter.options, cur = from;
      var minSize = cm.foldOption(opts, "minFoldSize");
      var func = cm.foldOption(opts, "rangeFinder");
      cm.eachLine(from, to, function(line) {
        var mark = null;
        if (isFolded(cm, cur)) {
          mark = marker(opts.indicatorFolded);
        } else {
          var pos = Pos(cur, 0);
          var range = func && func(cm, pos);
          if (range && range.to.line - range.from.line >= minSize)
            mark = marker(opts.indicatorOpen);
        }
        cm.setGutterMarker(line, opts.gutter, mark);
        ++cur;
      });
    }

    function updateInViewport(cm) {
      var vp = cm.getViewport(), state = cm.state.foldGutter;
      if (!state) return;
      cm.operation(function() {
        updateFoldInfo(cm, vp.from, vp.to);
      });
      state.from = vp.from; state.to = vp.to;
    }

    function onGutterClick(cm, line, gutter) {
      var state = cm.state.foldGutter;
      if (!state) return;
      var opts = state.options;
      if (gutter != opts.gutter) return;
      var folded = isFolded(cm, line);
      if (folded) folded.clear();
      else cm.foldCode(Pos(line, 0), opts);
    }

    function onChange(cm) {
      var state = cm.state.foldGutter;
      if (!state) return;
      var opts = state.options;
      state.from = state.to = 0;
      clearTimeout(state.changeUpdate);
      state.changeUpdate = setTimeout(function() { updateInViewport(cm); }, opts.foldOnChangeTimeSpan || 600);
    }

    function onViewportChange(cm) {
      var state = cm.state.foldGutter;
      if (!state) return;
      var opts = state.options;
      clearTimeout(state.changeUpdate);
      state.changeUpdate = setTimeout(function() {
        var vp = cm.getViewport();
        if (state.from == state.to || vp.from - state.to > 20 || state.from - vp.to > 20) {
          updateInViewport(cm);
        } else {
          cm.operation(function() {
            if (vp.from < state.from) {
              updateFoldInfo(cm, vp.from, state.from);
              state.from = vp.from;
            }
            if (vp.to > state.to) {
              updateFoldInfo(cm, state.to, vp.to);
              state.to = vp.to;
            }
          });
        }
      }, opts.updateViewportTimeSpan || 400);
    }

    function onFold(cm, from) {
      var state = cm.state.foldGutter;
      if (!state) return;
      var line = from.line;
      if (line >= state.from && line < state.to)
        updateFoldInfo(cm, line, line + 1);
    }
  });
  });

  var showHint = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {

    var HINT_ELEMENT_CLASS        = "CodeMirror-hint";
    var ACTIVE_HINT_ELEMENT_CLASS = "CodeMirror-hint-active";

    // This is the old interface, kept around for now to stay
    // backwards-compatible.
    CodeMirror.showHint = function(cm, getHints, options) {
      if (!getHints) return cm.showHint(options);
      if (options && options.async) getHints.async = true;
      var newOpts = {hint: getHints};
      if (options) for (var prop in options) newOpts[prop] = options[prop];
      return cm.showHint(newOpts);
    };

    CodeMirror.defineExtension("showHint", function(options) {
      options = parseOptions(this, this.getCursor("start"), options);
      var selections = this.listSelections();
      if (selections.length > 1) return;
      // By default, don't allow completion when something is selected.
      // A hint function can have a `supportsSelection` property to
      // indicate that it can handle selections.
      if (this.somethingSelected()) {
        if (!options.hint.supportsSelection) return;
        // Don't try with cross-line selections
        for (var i = 0; i < selections.length; i++)
          if (selections[i].head.line != selections[i].anchor.line) return;
      }

      if (this.state.completionActive) this.state.completionActive.close();
      var completion = this.state.completionActive = new Completion(this, options);
      if (!completion.options.hint) return;

      CodeMirror.signal(this, "startCompletion", this);
      completion.update(true);
    });

    CodeMirror.defineExtension("closeHint", function() {
      if (this.state.completionActive) this.state.completionActive.close();
    });

    function Completion(cm, options) {
      this.cm = cm;
      this.options = options;
      this.widget = null;
      this.debounce = 0;
      this.tick = 0;
      this.startPos = this.cm.getCursor("start");
      this.startLen = this.cm.getLine(this.startPos.line).length - this.cm.getSelection().length;

      var self = this;
      cm.on("cursorActivity", this.activityFunc = function() { self.cursorActivity(); });
    }

    var requestAnimationFrame = window.requestAnimationFrame || function(fn) {
      return setTimeout(fn, 1000/60);
    };
    var cancelAnimationFrame = window.cancelAnimationFrame || clearTimeout;

    Completion.prototype = {
      close: function() {
        if (!this.active()) return;
        this.cm.state.completionActive = null;
        this.tick = null;
        this.cm.off("cursorActivity", this.activityFunc);

        if (this.widget && this.data) CodeMirror.signal(this.data, "close");
        if (this.widget) this.widget.close();
        CodeMirror.signal(this.cm, "endCompletion", this.cm);
      },

      active: function() {
        return this.cm.state.completionActive == this;
      },

      pick: function(data, i) {
        var completion = data.list[i];
        if (completion.hint) completion.hint(this.cm, data, completion);
        else this.cm.replaceRange(getText(completion), completion.from || data.from,
                                  completion.to || data.to, "complete");
        CodeMirror.signal(data, "pick", completion);
        this.close();
      },

      cursorActivity: function() {
        if (this.debounce) {
          cancelAnimationFrame(this.debounce);
          this.debounce = 0;
        }

        var pos = this.cm.getCursor(), line = this.cm.getLine(pos.line);
        if (pos.line != this.startPos.line || line.length - pos.ch != this.startLen - this.startPos.ch ||
            pos.ch < this.startPos.ch || this.cm.somethingSelected() ||
            (!pos.ch || this.options.closeCharacters.test(line.charAt(pos.ch - 1)))) {
          this.close();
        } else {
          var self = this;
          this.debounce = requestAnimationFrame(function() {self.update();});
          if (this.widget) this.widget.disable();
        }
      },

      update: function(first) {
        if (this.tick == null) return
        var self = this, myTick = ++this.tick;
        fetchHints(this.options.hint, this.cm, this.options, function(data) {
          if (self.tick == myTick) self.finishUpdate(data, first);
        });
      },

      finishUpdate: function(data, first) {
        if (this.data) CodeMirror.signal(this.data, "update");

        var picked = (this.widget && this.widget.picked) || (first && this.options.completeSingle);
        if (this.widget) this.widget.close();

        this.data = data;

        if (data && data.list.length) {
          if (picked && data.list.length == 1) {
            this.pick(data, 0);
          } else {
            this.widget = new Widget(this, data);
            CodeMirror.signal(data, "shown");
          }
        }
      }
    };

    function parseOptions(cm, pos, options) {
      var editor = cm.options.hintOptions;
      var out = {};
      for (var prop in defaultOptions) out[prop] = defaultOptions[prop];
      if (editor) for (var prop in editor)
        if (editor[prop] !== undefined) out[prop] = editor[prop];
      if (options) for (var prop in options)
        if (options[prop] !== undefined) out[prop] = options[prop];
      if (out.hint.resolve) out.hint = out.hint.resolve(cm, pos);
      return out;
    }

    function getText(completion) {
      if (typeof completion == "string") return completion;
      else return completion.text;
    }

    function buildKeyMap(completion, handle) {
      var baseMap = {
        Up: function() {handle.moveFocus(-1);},
        Down: function() {handle.moveFocus(1);},
        PageUp: function() {handle.moveFocus(-handle.menuSize() + 1, true);},
        PageDown: function() {handle.moveFocus(handle.menuSize() - 1, true);},
        Home: function() {handle.setFocus(0);},
        End: function() {handle.setFocus(handle.length - 1);},
        Enter: handle.pick,
        Tab: handle.pick,
        Esc: handle.close
      };

      var mac = /Mac/.test(navigator.platform);

      if (mac) {
        baseMap["Ctrl-P"] = function() {handle.moveFocus(-1);};
        baseMap["Ctrl-N"] = function() {handle.moveFocus(1);};
      }

      var custom = completion.options.customKeys;
      var ourMap = custom ? {} : baseMap;
      function addBinding(key, val) {
        var bound;
        if (typeof val != "string")
          bound = function(cm) { return val(cm, handle); };
        // This mechanism is deprecated
        else if (baseMap.hasOwnProperty(val))
          bound = baseMap[val];
        else
          bound = val;
        ourMap[key] = bound;
      }
      if (custom)
        for (var key in custom) if (custom.hasOwnProperty(key))
          addBinding(key, custom[key]);
      var extra = completion.options.extraKeys;
      if (extra)
        for (var key in extra) if (extra.hasOwnProperty(key))
          addBinding(key, extra[key]);
      return ourMap;
    }

    function getHintElement(hintsElement, el) {
      while (el && el != hintsElement) {
        if (el.nodeName.toUpperCase() === "LI" && el.parentNode == hintsElement) return el;
        el = el.parentNode;
      }
    }

    function Widget(completion, data) {
      this.completion = completion;
      this.data = data;
      this.picked = false;
      var widget = this, cm = completion.cm;
      var ownerDocument = cm.getInputField().ownerDocument;
      var parentWindow = ownerDocument.defaultView || ownerDocument.parentWindow;

      var hints = this.hints = ownerDocument.createElement("ul");
      var theme = completion.cm.options.theme;
      hints.className = "CodeMirror-hints " + theme;
      this.selectedHint = data.selectedHint || 0;

      var completions = data.list;
      for (var i = 0; i < completions.length; ++i) {
        var elt = hints.appendChild(ownerDocument.createElement("li")), cur = completions[i];
        var className = HINT_ELEMENT_CLASS + (i != this.selectedHint ? "" : " " + ACTIVE_HINT_ELEMENT_CLASS);
        if (cur.className != null) className = cur.className + " " + className;
        elt.className = className;
        if (cur.render) cur.render(elt, data, cur);
        else elt.appendChild(ownerDocument.createTextNode(cur.displayText || getText(cur)));
        elt.hintId = i;
      }

      var container = completion.options.container || ownerDocument.body;
      var pos = cm.cursorCoords(completion.options.alignWithWord ? data.from : null);
      var left = pos.left, top = pos.bottom, below = true;
      var offsetLeft = 0, offsetTop = 0;
      if (container !== ownerDocument.body) {
        // We offset the cursor position because left and top are relative to the offsetParent's top left corner.
        var isContainerPositioned = ['absolute', 'relative', 'fixed'].indexOf(parentWindow.getComputedStyle(container).position) !== -1;
        var offsetParent = isContainerPositioned ? container : container.offsetParent;
        var offsetParentPosition = offsetParent.getBoundingClientRect();
        var bodyPosition = ownerDocument.body.getBoundingClientRect();
        offsetLeft = (offsetParentPosition.left - bodyPosition.left - offsetParent.scrollLeft);
        offsetTop = (offsetParentPosition.top - bodyPosition.top - offsetParent.scrollTop);
      }
      hints.style.left = (left - offsetLeft) + "px";
      hints.style.top = (top - offsetTop) + "px";

      // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
      var winW = parentWindow.innerWidth || Math.max(ownerDocument.body.offsetWidth, ownerDocument.documentElement.offsetWidth);
      var winH = parentWindow.innerHeight || Math.max(ownerDocument.body.offsetHeight, ownerDocument.documentElement.offsetHeight);
      container.appendChild(hints);
      var box = hints.getBoundingClientRect(), overlapY = box.bottom - winH;
      var scrolls = hints.scrollHeight > hints.clientHeight + 1;
      var startScroll = cm.getScrollInfo();

      if (overlapY > 0) {
        var height = box.bottom - box.top, curTop = pos.top - (pos.bottom - box.top);
        if (curTop - height > 0) { // Fits above cursor
          hints.style.top = (top = pos.top - height - offsetTop) + "px";
          below = false;
        } else if (height > winH) {
          hints.style.height = (winH - 5) + "px";
          hints.style.top = (top = pos.bottom - box.top - offsetTop) + "px";
          var cursor = cm.getCursor();
          if (data.from.ch != cursor.ch) {
            pos = cm.cursorCoords(cursor);
            hints.style.left = (left = pos.left - offsetLeft) + "px";
            box = hints.getBoundingClientRect();
          }
        }
      }
      var overlapX = box.right - winW;
      if (overlapX > 0) {
        if (box.right - box.left > winW) {
          hints.style.width = (winW - 5) + "px";
          overlapX -= (box.right - box.left) - winW;
        }
        hints.style.left = (left = pos.left - overlapX - offsetLeft) + "px";
      }
      if (scrolls) for (var node = hints.firstChild; node; node = node.nextSibling)
        node.style.paddingRight = cm.display.nativeBarWidth + "px";

      cm.addKeyMap(this.keyMap = buildKeyMap(completion, {
        moveFocus: function(n, avoidWrap) { widget.changeActive(widget.selectedHint + n, avoidWrap); },
        setFocus: function(n) { widget.changeActive(n); },
        menuSize: function() { return widget.screenAmount(); },
        length: completions.length,
        close: function() { completion.close(); },
        pick: function() { widget.pick(); },
        data: data
      }));

      if (completion.options.closeOnUnfocus) {
        var closingOnBlur;
        cm.on("blur", this.onBlur = function() { closingOnBlur = setTimeout(function() { completion.close(); }, 100); });
        cm.on("focus", this.onFocus = function() { clearTimeout(closingOnBlur); });
      }

      cm.on("scroll", this.onScroll = function() {
        var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
        var newTop = top + startScroll.top - curScroll.top;
        var point = newTop - (parentWindow.pageYOffset || (ownerDocument.documentElement || ownerDocument.body).scrollTop);
        if (!below) point += hints.offsetHeight;
        if (point <= editor.top || point >= editor.bottom) return completion.close();
        hints.style.top = newTop + "px";
        hints.style.left = (left + startScroll.left - curScroll.left) + "px";
      });

      CodeMirror.on(hints, "dblclick", function(e) {
        var t = getHintElement(hints, e.target || e.srcElement);
        if (t && t.hintId != null) {widget.changeActive(t.hintId); widget.pick();}
      });

      CodeMirror.on(hints, "click", function(e) {
        var t = getHintElement(hints, e.target || e.srcElement);
        if (t && t.hintId != null) {
          widget.changeActive(t.hintId);
          if (completion.options.completeOnSingleClick) widget.pick();
        }
      });

      CodeMirror.on(hints, "mousedown", function() {
        setTimeout(function(){cm.focus();}, 20);
      });

      CodeMirror.signal(data, "select", completions[this.selectedHint], hints.childNodes[this.selectedHint]);
      return true;
    }

    Widget.prototype = {
      close: function() {
        if (this.completion.widget != this) return;
        this.completion.widget = null;
        this.hints.parentNode.removeChild(this.hints);
        this.completion.cm.removeKeyMap(this.keyMap);

        var cm = this.completion.cm;
        if (this.completion.options.closeOnUnfocus) {
          cm.off("blur", this.onBlur);
          cm.off("focus", this.onFocus);
        }
        cm.off("scroll", this.onScroll);
      },

      disable: function() {
        this.completion.cm.removeKeyMap(this.keyMap);
        var widget = this;
        this.keyMap = {Enter: function() { widget.picked = true; }};
        this.completion.cm.addKeyMap(this.keyMap);
      },

      pick: function() {
        this.completion.pick(this.data, this.selectedHint);
      },

      changeActive: function(i, avoidWrap) {
        if (i >= this.data.list.length)
          i = avoidWrap ? this.data.list.length - 1 : 0;
        else if (i < 0)
          i = avoidWrap ? 0  : this.data.list.length - 1;
        if (this.selectedHint == i) return;
        var node = this.hints.childNodes[this.selectedHint];
        if (node) node.className = node.className.replace(" " + ACTIVE_HINT_ELEMENT_CLASS, "");
        node = this.hints.childNodes[this.selectedHint = i];
        node.className += " " + ACTIVE_HINT_ELEMENT_CLASS;
        if (node.offsetTop < this.hints.scrollTop)
          this.hints.scrollTop = node.offsetTop - 3;
        else if (node.offsetTop + node.offsetHeight > this.hints.scrollTop + this.hints.clientHeight)
          this.hints.scrollTop = node.offsetTop + node.offsetHeight - this.hints.clientHeight + 3;
        CodeMirror.signal(this.data, "select", this.data.list[this.selectedHint], node);
      },

      screenAmount: function() {
        return Math.floor(this.hints.clientHeight / this.hints.firstChild.offsetHeight) || 1;
      }
    };

    function applicableHelpers(cm, helpers) {
      if (!cm.somethingSelected()) return helpers
      var result = [];
      for (var i = 0; i < helpers.length; i++)
        if (helpers[i].supportsSelection) result.push(helpers[i]);
      return result
    }

    function fetchHints(hint, cm, options, callback) {
      if (hint.async) {
        hint(cm, callback, options);
      } else {
        var result = hint(cm, options);
        if (result && result.then) result.then(callback);
        else callback(result);
      }
    }

    function resolveAutoHints(cm, pos) {
      var helpers = cm.getHelpers(pos, "hint"), words;
      if (helpers.length) {
        var resolved = function(cm, callback, options) {
          var app = applicableHelpers(cm, helpers);
          function run(i) {
            if (i == app.length) return callback(null)
            fetchHints(app[i], cm, options, function(result) {
              if (result && result.list.length > 0) callback(result);
              else run(i + 1);
            });
          }
          run(0);
        };
        resolved.async = true;
        resolved.supportsSelection = true;
        return resolved
      } else if (words = cm.getHelper(cm.getCursor(), "hintWords")) {
        return function(cm) { return CodeMirror.hint.fromList(cm, {words: words}) }
      } else if (CodeMirror.hint.anyword) {
        return function(cm, options) { return CodeMirror.hint.anyword(cm, options) }
      } else {
        return function() {}
      }
    }

    CodeMirror.registerHelper("hint", "auto", {
      resolve: resolveAutoHints
    });

    CodeMirror.registerHelper("hint", "fromList", function(cm, options) {
      var cur = cm.getCursor(), token = cm.getTokenAt(cur);
      var term, from = CodeMirror.Pos(cur.line, token.start), to = cur;
      if (token.start < cur.ch && /\w/.test(token.string.charAt(cur.ch - token.start - 1))) {
        term = token.string.substr(0, cur.ch - token.start);
      } else {
        term = "";
        from = cur;
      }
      var found = [];
      for (var i = 0; i < options.words.length; i++) {
        var word = options.words[i];
        if (word.slice(0, term.length) == term)
          found.push(word);
      }

      if (found.length) return {list: found, from: from, to: to};
    });

    CodeMirror.commands.autocomplete = CodeMirror.showHint;

    var defaultOptions = {
      hint: CodeMirror.hint.auto,
      completeSingle: true,
      alignWithWord: true,
      closeCharacters: /[\s()\[\]{};:>,]/,
      closeOnUnfocus: true,
      completeOnSingleClick: true,
      container: null,
      customKeys: null,
      extraKeys: null
    };

    CodeMirror.defineOption("hintOptions", null);
  });
  });

  var comment = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {

    var noOptions = {};
    var nonWS = /[^\s\u00a0]/;
    var Pos = CodeMirror.Pos;

    function firstNonWS(str) {
      var found = str.search(nonWS);
      return found == -1 ? 0 : found;
    }

    CodeMirror.commands.toggleComment = function(cm) {
      cm.toggleComment();
    };

    CodeMirror.defineExtension("toggleComment", function(options) {
      if (!options) options = noOptions;
      var cm = this;
      var minLine = Infinity, ranges = this.listSelections(), mode = null;
      for (var i = ranges.length - 1; i >= 0; i--) {
        var from = ranges[i].from(), to = ranges[i].to();
        if (from.line >= minLine) continue;
        if (to.line >= minLine) to = Pos(minLine, 0);
        minLine = from.line;
        if (mode == null) {
          if (cm.uncomment(from, to, options)) mode = "un";
          else { cm.lineComment(from, to, options); mode = "line"; }
        } else if (mode == "un") {
          cm.uncomment(from, to, options);
        } else {
          cm.lineComment(from, to, options);
        }
      }
    });

    // Rough heuristic to try and detect lines that are part of multi-line string
    function probablyInsideString(cm, pos, line) {
      return /\bstring\b/.test(cm.getTokenTypeAt(Pos(pos.line, 0))) && !/^[\'\"\`]/.test(line)
    }

    function getMode(cm, pos) {
      var mode = cm.getMode();
      return mode.useInnerComments === false || !mode.innerMode ? mode : cm.getModeAt(pos)
    }

    CodeMirror.defineExtension("lineComment", function(from, to, options) {
      if (!options) options = noOptions;
      var self = this, mode = getMode(self, from);
      var firstLine = self.getLine(from.line);
      if (firstLine == null || probablyInsideString(self, from, firstLine)) return;

      var commentString = options.lineComment || mode.lineComment;
      if (!commentString) {
        if (options.blockCommentStart || mode.blockCommentStart) {
          options.fullLines = true;
          self.blockComment(from, to, options);
        }
        return;
      }

      var end = Math.min(to.ch != 0 || to.line == from.line ? to.line + 1 : to.line, self.lastLine() + 1);
      var pad = options.padding == null ? " " : options.padding;
      var blankLines = options.commentBlankLines || from.line == to.line;

      self.operation(function() {
        if (options.indent) {
          var baseString = null;
          for (var i = from.line; i < end; ++i) {
            var line = self.getLine(i);
            var whitespace = line.slice(0, firstNonWS(line));
            if (baseString == null || baseString.length > whitespace.length) {
              baseString = whitespace;
            }
          }
          for (var i = from.line; i < end; ++i) {
            var line = self.getLine(i), cut = baseString.length;
            if (!blankLines && !nonWS.test(line)) continue;
            if (line.slice(0, cut) != baseString) cut = firstNonWS(line);
            self.replaceRange(baseString + commentString + pad, Pos(i, 0), Pos(i, cut));
          }
        } else {
          for (var i = from.line; i < end; ++i) {
            if (blankLines || nonWS.test(self.getLine(i)))
              self.replaceRange(commentString + pad, Pos(i, 0));
          }
        }
      });
    });

    CodeMirror.defineExtension("blockComment", function(from, to, options) {
      if (!options) options = noOptions;
      var self = this, mode = getMode(self, from);
      var startString = options.blockCommentStart || mode.blockCommentStart;
      var endString = options.blockCommentEnd || mode.blockCommentEnd;
      if (!startString || !endString) {
        if ((options.lineComment || mode.lineComment) && options.fullLines != false)
          self.lineComment(from, to, options);
        return;
      }
      if (/\bcomment\b/.test(self.getTokenTypeAt(Pos(from.line, 0)))) return

      var end = Math.min(to.line, self.lastLine());
      if (end != from.line && to.ch == 0 && nonWS.test(self.getLine(end))) --end;

      var pad = options.padding == null ? " " : options.padding;
      if (from.line > end) return;

      self.operation(function() {
        if (options.fullLines != false) {
          var lastLineHasText = nonWS.test(self.getLine(end));
          self.replaceRange(pad + endString, Pos(end));
          self.replaceRange(startString + pad, Pos(from.line, 0));
          var lead = options.blockCommentLead || mode.blockCommentLead;
          if (lead != null) for (var i = from.line + 1; i <= end; ++i)
            if (i != end || lastLineHasText)
              self.replaceRange(lead + pad, Pos(i, 0));
        } else {
          self.replaceRange(endString, to);
          self.replaceRange(startString, from);
        }
      });
    });

    CodeMirror.defineExtension("uncomment", function(from, to, options) {
      if (!options) options = noOptions;
      var self = this, mode = getMode(self, from);
      var end = Math.min(to.ch != 0 || to.line == from.line ? to.line : to.line - 1, self.lastLine()), start = Math.min(from.line, end);

      // Try finding line comments
      var lineString = options.lineComment || mode.lineComment, lines = [];
      var pad = options.padding == null ? " " : options.padding, didSomething;
      lineComment: {
        if (!lineString) break lineComment;
        for (var i = start; i <= end; ++i) {
          var line = self.getLine(i);
          var found = line.indexOf(lineString);
          if (found > -1 && !/comment/.test(self.getTokenTypeAt(Pos(i, found + 1)))) found = -1;
          if (found == -1 && nonWS.test(line)) break lineComment;
          if (found > -1 && nonWS.test(line.slice(0, found))) break lineComment;
          lines.push(line);
        }
        self.operation(function() {
          for (var i = start; i <= end; ++i) {
            var line = lines[i - start];
            var pos = line.indexOf(lineString), endPos = pos + lineString.length;
            if (pos < 0) continue;
            if (line.slice(endPos, endPos + pad.length) == pad) endPos += pad.length;
            didSomething = true;
            self.replaceRange("", Pos(i, pos), Pos(i, endPos));
          }
        });
        if (didSomething) return true;
      }

      // Try block comments
      var startString = options.blockCommentStart || mode.blockCommentStart;
      var endString = options.blockCommentEnd || mode.blockCommentEnd;
      if (!startString || !endString) return false;
      var lead = options.blockCommentLead || mode.blockCommentLead;
      var startLine = self.getLine(start), open = startLine.indexOf(startString);
      if (open == -1) return false
      var endLine = end == start ? startLine : self.getLine(end);
      var close = endLine.indexOf(endString, end == start ? open + startString.length : 0);
      var insideStart = Pos(start, open + 1), insideEnd = Pos(end, close + 1);
      if (close == -1 ||
          !/comment/.test(self.getTokenTypeAt(insideStart)) ||
          !/comment/.test(self.getTokenTypeAt(insideEnd)) ||
          self.getRange(insideStart, insideEnd, "\n").indexOf(endString) > -1)
        return false;

      // Avoid killing block comments completely outside the selection.
      // Positions of the last startString before the start of the selection, and the first endString after it.
      var lastStart = startLine.lastIndexOf(startString, from.ch);
      var firstEnd = lastStart == -1 ? -1 : startLine.slice(0, from.ch).indexOf(endString, lastStart + startString.length);
      if (lastStart != -1 && firstEnd != -1 && firstEnd + endString.length != from.ch) return false;
      // Positions of the first endString after the end of the selection, and the last startString before it.
      firstEnd = endLine.indexOf(endString, to.ch);
      var almostLastStart = endLine.slice(to.ch).lastIndexOf(startString, firstEnd - to.ch);
      lastStart = (firstEnd == -1 || almostLastStart == -1) ? -1 : to.ch + almostLastStart;
      if (firstEnd != -1 && lastStart != -1 && lastStart != to.ch) return false;

      self.operation(function() {
        self.replaceRange("", Pos(end, close - (pad && endLine.slice(close - pad.length, close) == pad ? pad.length : 0)),
                          Pos(end, close + endString.length));
        var openEnd = open + startString.length;
        if (pad && startLine.slice(openEnd, openEnd + pad.length) == pad) openEnd += pad.length;
        self.replaceRange("", Pos(start, open), Pos(start, openEnd));
        if (lead) for (var i = start + 1; i <= end; ++i) {
          var line = self.getLine(i), found = line.indexOf(lead);
          if (found == -1 || nonWS.test(line.slice(0, found))) continue;
          var foundEnd = found + lead.length;
          if (pad && line.slice(foundEnd, foundEnd + pad.length) == pad) foundEnd += pad.length;
          self.replaceRange("", Pos(i, found), Pos(i, foundEnd));
        }
      });
      return true;
    });
  });
  });

  var placeholder = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {
    CodeMirror.defineOption("placeholder", "", function(cm, val, old) {
      var prev = old && old != CodeMirror.Init;
      if (val && !prev) {
        cm.on("blur", onBlur);
        cm.on("change", onChange);
        cm.on("swapDoc", onChange);
        onChange(cm);
      } else if (!val && prev) {
        cm.off("blur", onBlur);
        cm.off("change", onChange);
        cm.off("swapDoc", onChange);
        clearPlaceholder(cm);
        var wrapper = cm.getWrapperElement();
        wrapper.className = wrapper.className.replace(" CodeMirror-empty", "");
      }

      if (val && !cm.hasFocus()) onBlur(cm);
    });

    function clearPlaceholder(cm) {
      if (cm.state.placeholder) {
        cm.state.placeholder.parentNode.removeChild(cm.state.placeholder);
        cm.state.placeholder = null;
      }
    }
    function setPlaceholder(cm) {
      clearPlaceholder(cm);
      var elt = cm.state.placeholder = document.createElement("pre");
      elt.style.cssText = "height: 0; overflow: visible";
      elt.style.direction = cm.getOption("direction");
      elt.className = "CodeMirror-placeholder CodeMirror-line-like";
      var placeHolder = cm.getOption("placeholder");
      if (typeof placeHolder == "string") placeHolder = document.createTextNode(placeHolder);
      elt.appendChild(placeHolder);
      cm.display.lineSpace.insertBefore(elt, cm.display.lineSpace.firstChild);
    }

    function onBlur(cm) {
      if (isEmpty(cm)) setPlaceholder(cm);
    }
    function onChange(cm) {
      var wrapper = cm.getWrapperElement(), empty = isEmpty(cm);
      wrapper.className = wrapper.className.replace(" CodeMirror-empty", "") + (empty ? " CodeMirror-empty" : "");

      if (empty) setPlaceholder(cm);
      else clearPlaceholder(cm);
    }

    function isEmpty(cm) {
      return (cm.lineCount() === 1) && (cm.getLine(0) === "");
    }
  });
  });

  var activeLine = createCommonjsModule(function (module, exports) {
  // CodeMirror, copyright (c) by Marijn Haverbeke and others
  // Distributed under an MIT license: https://codemirror.net/LICENSE

  (function(mod) {
    mod(codemirror);
  })(function(CodeMirror) {
    var WRAP_CLASS = "CodeMirror-activeline";
    var BACK_CLASS = "CodeMirror-activeline-background";
    var GUTT_CLASS = "CodeMirror-activeline-gutter";

    CodeMirror.defineOption("styleActiveLine", false, function(cm, val, old) {
      var prev = old == CodeMirror.Init ? false : old;
      if (val == prev) return
      if (prev) {
        cm.off("beforeSelectionChange", selectionChange);
        clearActiveLines(cm);
        delete cm.state.activeLines;
      }
      if (val) {
        cm.state.activeLines = [];
        updateActiveLines(cm, cm.listSelections());
        cm.on("beforeSelectionChange", selectionChange);
      }
    });

    function clearActiveLines(cm) {
      for (var i = 0; i < cm.state.activeLines.length; i++) {
        cm.removeLineClass(cm.state.activeLines[i], "wrap", WRAP_CLASS);
        cm.removeLineClass(cm.state.activeLines[i], "background", BACK_CLASS);
        cm.removeLineClass(cm.state.activeLines[i], "gutter", GUTT_CLASS);
      }
    }

    function sameArray(a, b) {
      if (a.length != b.length) return false;
      for (var i = 0; i < a.length; i++)
        if (a[i] != b[i]) return false;
      return true;
    }

    function updateActiveLines(cm, ranges) {
      var active = [];
      for (var i = 0; i < ranges.length; i++) {
        var range = ranges[i];
        var option = cm.getOption("styleActiveLine");
        if (typeof option == "object" && option.nonEmpty ? range.anchor.line != range.head.line : !range.empty())
          continue
        var line = cm.getLineHandleVisualStart(range.head.line);
        if (active[active.length - 1] != line) active.push(line);
      }
      if (sameArray(cm.state.activeLines, active)) return;
      cm.operation(function() {
        clearActiveLines(cm);
        for (var i = 0; i < active.length; i++) {
          cm.addLineClass(active[i], "wrap", WRAP_CLASS);
          cm.addLineClass(active[i], "background", BACK_CLASS);
          cm.addLineClass(active[i], "gutter", GUTT_CLASS);
        }
        cm.state.activeLines = active;
      });
    }

    function selectionChange(cm, sel) {
      updateActiveLines(cm, sel.ranges);
    }
  });
  });

  codemirror.registerHelper("fold", "beancount", (cm, start) => {
      const maxDepth = 100;
      function headerLevel(lineNo) {
          const line = cm.getDoc().getLine(lineNo);
          const match = line && line.match(/^\*+/);
          if (match) {
              return match[0].length;
          }
          return maxDepth;
      }
      const level = headerLevel(start.line);
      if (level === maxDepth) {
          return undefined;
      }
      const doc = cm.getDoc();
      const lastLineNo = doc.lastLine();
      let end = start.line;
      while (end < lastLineNo) {
          if (headerLevel(end + 1) <= level) {
              break;
          }
          end += 1;
      }
      return {
          from: new codemirror.Pos(start.line, doc.getLine(start.line).length),
          to: new codemirror.Pos(end, doc.getLine(end).length),
      };
  });

  function getCurrentWord(cursor, line) {
      return line.slice(0, cursor.ch).match(/(\S*)$/)[0];
  }
  function fuzzyMatch(cursor, currentWord, completions) {
      const search = currentWord.toLowerCase();
      return {
          list: completions.filter(completion => fuzzytest(search, completion)),
          from: new codemirror.Pos(cursor.line, cursor.ch - currentWord.length),
          to: cursor,
      };
  }

  const completionSources = {
      undatedDirectives: ["option", "plugin", "include"],
      datedDirectives: [
          "open",
          "close",
          "commodity",
          "balance",
          "pad",
          "note",
          "document",
          "price",
          "event",
          "query",
      ],
  };
  const directiveCompletions = {
      open: ["accounts", "currencies"],
      close: ["accounts"],
      commodity: ["currencies"],
      balance: ["accounts", null, "currencies"],
      pad: ["accounts", "accounts"],
      note: ["accounts"],
      document: ["accounts"],
      price: ["currencies", null, "currencies"],
  };
  codemirror.registerHelper("hint", "beancount", (cm) => {
      const doc = cm.getDoc();
      const cursor = doc.getCursor();
      const line = doc.getLine(cursor.line);
      const token = cm.getTokenAt(cursor);
      const currentCharacter = line[cursor.ch - 1];
      const currentWord = getCurrentWord(cursor, line);
      // If '#' or '^' has just been typed, there won't be a tag or link token yet
      if (currentCharacter === "#" || currentCharacter === "^") {
          const list = currentCharacter === "#" ? favaAPI.tags : favaAPI.links;
          return {
              list,
              from: cursor,
              to: cursor,
          };
      }
      if (token.type === "tag" || token.type === "link") {
          const list = token.type === "tag" ? favaAPI.tags : favaAPI.links;
          return {
              list: list.filter(d => d.startsWith(currentWord.slice(1))),
              from: new codemirror.Pos(cursor.line, token.start + 1),
              to: new codemirror.Pos(cursor.line, token.end),
          };
      }
      // directives at the start of the line
      if (currentWord === line && line.length > 0) {
          return {
              list: completionSources.undatedDirectives.filter(d => d.startsWith(currentWord)),
              from: new codemirror.Pos(cursor.line, 0),
              to: cursor,
          };
      }
      const lineTokens = cm.getLineTokens(cursor.line);
      if (lineTokens.length > 0) {
          const startCurrentWord = cursor.ch - currentWord.length;
          const previousTokens = lineTokens.filter(d => d.end <= startCurrentWord);
          // complete accounts for indented lines
          if (lineTokens[0].type === "whitespace") {
              if (previousTokens.length === 1) {
                  return fuzzyMatch(cursor, currentWord, favaAPI.accounts);
              }
          }
          // dated directives
          if (lineTokens[0].type === "date") {
              // date whitespace -> complete directives
              if (previousTokens.length === 2) {
                  return {
                      list: completionSources.datedDirectives.filter(d => d.startsWith(currentWord)),
                      from: new codemirror.Pos(cursor.line, cursor.ch - currentWord.length),
                      to: cursor,
                  };
              }
              // Ignore negative sign from previousTokens
              const tokenLength = previousTokens.filter(t => t.type != null).length;
              if (tokenLength % 2 === 0) {
                  const directiveType = previousTokens[2].string;
                  if (directiveType in directiveCompletions) {
                      const complType = directiveCompletions[directiveType][tokenLength / 2 - 2];
                      if (complType) {
                          return fuzzyMatch(cursor, currentWord, favaAPI[complType]);
                      }
                  }
              }
          }
      }
      return {
          list: [],
      };
  });

  /* eslint-disable no-useless-escape */
  // The rules should mirror `parser/lexel.l` in beancount
  // @ts-ignore
  codemirror.defineSimpleMode("beancount", {
      start: [
          {
              regex: /\*.*/,
              token: "comment section",
              sol: true,
          },
          {
              regex: /[#*;].*/,
              token: "comment",
              sol: true,
          },
          {
              regex: /;.*/,
              token: "comment",
          },
          {
              regex: /(query)(\s*)("[^"]*")(\s*)(")/,
              token: ["directive", null, "string", null, "string"],
              mode: {
                  spec: "beancount-query",
                  end: /"/,
              },
          },
          {
              regex: /"(?:[^\\]|\\.)*?"/,
              token: "string",
          },
          {
              regex: /@|@@|{|}/,
              token: "bracket",
          },
          {
              regex: /\s+/,
              token: "whitespace",
          },
          {
              regex: /#[A-Za-z0-9\-_\/.]+/,
              token: "tag",
          },
          {
              regex: /[A-Z][A-Z0-9'\._\-]{0,22}[A-Z0-9]/,
              token: "commodity keyword",
          },
          {
              regex: /TRUE|FALSE/,
              token: "bool atom",
          },
          {
              regex: /(?:[A-Z][A-Za-z0-9\-]+)(?::[A-Z][A-Za-z0-9\-]*)+/,
              token: "account",
          },
          {
              regex: /[*!&#?%PSTCURM]|txn/,
              token: "directive transaction",
          },
          // other dated directives
          {
              regex: /balance|open|close|commodity|pad|event|custom|price|note|document/,
              token: "directive",
          },
          // undated directives
          {
              regex: /pushtag|poptag|pushmeta|popmeta|option|plugin|include/,
              token: "directive",
              sol: true,
          },
          {
              regex: /[0-9]{4,}[\-\/][0-9]+[\-\/][0-9]+/,
              token: "date",
          },
          {
              regex: /(?:[0-9]+|[0-9][0-9,]+[0-9])(?:\.[0-9]*)?/,
              token: "number",
          },
          {
              regex: /\^[A-Za-z0-9\-_\/.]+/,
              token: "attribute",
          },
          {
              regex: /[a-z][a-za-z0-9\-_]+:/,
              token: "meta",
          },
      ],
  });

  var bqlGrammar = {
      columns: [
          "account",
          "balance",
          "change",
          "cost_currency",
          "cost_date",
          "cost_label",
          "cost_number",
          "currency",
          "date",
          "day",
          "description",
          "filename",
          "flag",
          "id",
          "lineno",
          "links",
          "location",
          "month",
          "narration",
          "number",
          "other_accounts",
          "payee",
          "position",
          "posting_flag",
          "price",
          "tags",
          "type",
          "weight",
          "year",
      ],
      functions: [
          "abs",
          "account_sortkey",
          "any_meta",
          "close_date",
          "coalesce",
          "commodity",
          "commodity_meta",
          "convert",
          "cost",
          "count",
          "currency",
          "currency_meta",
          "date",
          "date_add",
          "date_diff",
          "day",
          "entry_meta",
          "filter_currency",
          "findfirst",
          "first",
          "getitem",
          "getprice",
          "grep",
          "grepn",
          "joinstr",
          "last",
          "leaf",
          "length",
          "max",
          "maxwidth",
          "meta",
          "min",
          "month",
          "neg",
          "number",
          "only",
          "open_date",
          "open_meta",
          "parent",
          "possign",
          "quarter",
          "root",
          "safediv",
          "str",
          "subst",
          "sum",
          "today",
          "units",
          "value",
          "weekday",
          "year",
          "ymonth",
      ],
      keywords: [
          "and",
          "as",
          "asc",
          "at",
          "balances",
          "by",
          "clear",
          "close",
          "desc",
          "distinct",
          "errors",
          "explain",
          "false",
          "flatten",
          "from",
          "group",
          "having",
          "in",
          "journal",
          "limit",
          "not",
          "null",
          "on",
          "open",
          "or",
          "order",
          "pivot",
          "print",
          "reload",
          "run",
          "select",
          "true",
          "where",
      ],
  };

  const { columns, functions, keywords } = bqlGrammar;
  const functionCompletions = functions.map((f) => `${f}(`);
  const commands = ["select"];
  codemirror.registerHelper("hint", "beancount-query", (cm) => {
      const doc = cm.getDoc();
      const cursor = doc.getCursor();
      const line = doc.getLine(cursor.line);
      const currentWord = getCurrentWord(cursor, line);
      // keywords at the start of the line
      if (currentWord === line) {
          return {
              list: commands.filter(d => d.startsWith(currentWord)),
              from: new codemirror.Pos(cursor.line, 0),
              to: cursor,
          };
      }
      return fuzzyMatch(cursor, currentWord, columns.concat(functionCompletions, keywords));
  });

  /* eslint-disable no-useless-escape */
  const { columns: columns$1, functions: functions$1, keywords: keywords$1 } = bqlGrammar;
  // This should match the grammar defined in Beancount (`query/query_parser.py`).
  // @ts-ignore
  codemirror.defineSimpleMode("beancount-query", {
      start: [
          {
              regex: new RegExp(`(?=^|\\s)(${keywords$1.join("|")})(?=\\s|$)`, "i"),
              token: "keyword",
          },
          {
              regex: /(\"[^\"]*\"|\'[^\']*\')/,
              token: "string",
          },
          {
              regex: /(?:\#(?:\"[^\"]*\"|\'[^\']*\')|\d\d\d\d-\d\d-\d\d)/,
              token: "date",
          },
          {
              regex: /[-+]?([0-9]+\.[0-9]*|[0-9]*\.[0-9]+)/,
              token: "number",
          },
          {
              regex: /[-+]?[0-9]+/,
              token: "number",
          },
          {
              regex: new RegExp(`(${columns$1.join("|")})(?=\\)|\\s|,|$)`, "i"),
              token: "variable-2",
          },
          {
              regex: new RegExp(`(${functions$1.join("|")})(?=\\()`, "i"),
              token: "variable-3",
          },
      ],
  });

  // This handles saving in both the main and the overlaid entry editors.
  codemirror.commands.favaSave = (cm) => {
      // @ts-ignore
      const button = cm.getOption("favaSaveButton");
      const buttonText = button.textContent;
      button.disabled = true;
      button.textContent = button.getAttribute("data-progress-content");
      putAPI("source", {
          file_path: button.getAttribute("data-filename"),
          entry_hash: button.getAttribute("data-entry-hash"),
          source: cm.getValue(),
          sha256sum: cm.getTextArea().getAttribute("data-sha256sum"),
      })
          .then(data => {
          cm.focus();
          cm.getTextArea().setAttribute("data-sha256sum", data);
          e.trigger("file-modified");
          // Reload the page if an entry was changed.
          if (button.getAttribute("data-entry-hash")) {
              router.reload();
              closeOverlay();
          }
      }, error => {
          notify(error, "error");
      })
          .then(() => {
          cm.getDoc().markClean();
          button.textContent = buttonText;
      });
  };
  codemirror.commands.favaFormat = (cm) => {
      putAPI("format_source", { source: cm.getValue() }).then(data => {
          const scrollPosition = cm.getScrollInfo().top;
          cm.setValue(data);
          cm.scrollTo(null, scrollPosition);
      }, error => {
          notify(error, "error");
      });
  };
  codemirror.commands.favaToggleComment = (cm) => {
      const doc = cm.getDoc();
      const args = {
          from: doc.getCursor("start"),
          to: doc.getCursor("end"),
          options: { lineComment: ";" },
      };
      if (!cm.uncomment(args.from, args.to, args.options)) {
          cm.lineComment(args.from, args.to, args.options);
      }
  };
  codemirror.commands.favaCenterCursor = (cm) => {
      const { top } = cm.cursorCoords(true, "local");
      const height = cm.getScrollInfo().clientHeight;
      cm.scrollTo(null, top - height / 2);
  };
  codemirror.commands.favaJumpToMarker = (cm) => {
      const doc = cm.getDoc();
      const cursor = cm.getSearchCursor("FAVA-INSERT-MARKER");
      if (cursor.findNext()) {
          cm.focus();
          doc.setCursor(cursor.pos.from);
          cm.execCommand("goLineUp");
          cm.execCommand("favaCenterCursor");
      }
      else {
          doc.setCursor(doc.lastLine(), 0);
      }
  };
  // If the given key should be ignored for autocompletion
  function ignoreKey(key) {
      switch (key) {
          case "ArrowDown":
          case "ArrowUp":
          case "ArrowLeft":
          case "ArrowRight":
          case "PageDown":
          case "PageUp":
          case "Home":
          case "End":
          case "Escape":
          case "Enter":
          case "Alt":
          case "Control":
          case "Meta":
          case "Shift":
          case "CapsLock":
              return true;
          default:
              return false;
      }
  }
  // Initialize the query editor
  function initQueryEditor() {
      const queryForm = select("#query-form");
      if (!queryForm) {
          return;
      }
      // @ts-ignore
      const queryStringEl = queryForm.elements.query_string;
      const queryOptions = {
          mode: "beancount-query",
          extraKeys: {
              "Ctrl-Enter": (cm) => {
                  cm.save();
                  e.trigger("form-submit-query", queryForm);
              },
              "Cmd-Enter": (cm) => {
                  cm.save();
                  e.trigger("form-submit-query", queryForm);
              },
          },
          placeholder: queryStringEl.getAttribute("placeholder") || undefined,
      };
      const editor = codemirror.fromTextArea(queryStringEl, queryOptions);
      editor.on("keyup", (cm, event) => {
          if (!cm.state.completionActive &&
              !ignoreKey(event.key)) {
              codemirror.commands.autocomplete(cm, undefined, {
                  completeSingle: false,
              });
          }
      });
      delegate(select("#query-container"), "click", ".toggle-box-header", (event, closest) => {
          const wrapper = closest.closest(".toggle-box");
          if (!wrapper)
              return;
          if (wrapper.classList.contains("inactive")) {
              const code = wrapper.querySelector("code");
              editor.setValue(code ? code.textContent || "" : "");
              editor.save();
              e.trigger("form-submit-query", queryForm);
              return;
          }
          wrapper.classList.toggle("toggled");
      });
  }
  // Initialize read-only editors
  function initReadOnlyEditors() {
      selectAll("textarea.editor-readonly").forEach(el => {
          codemirror.fromTextArea(el, {
              mode: "beancount",
              readOnly: true,
          });
      });
  }
  const sourceEditorOptions = {
      mode: "beancount",
      indentUnit: 4,
      lineNumbers: true,
      foldGutter: true,
      showTrailingSpace: true,
      styleActiveLine: true,
      gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
      extraKeys: {
          "Ctrl-Space": "autocomplete",
          "Ctrl-S": "favaSave",
          "Cmd-S": "favaSave",
          "Ctrl-D": "favaFormat",
          "Cmd-D": "favaFormat",
          "Ctrl-Y": "favaToggleComment",
          "Cmd-Y": "favaToggleComment",
          Tab: (cm) => {
              if (cm.getDoc().somethingSelected()) {
                  cm.execCommand("indentMore");
              }
              else {
                  cm.execCommand("insertSoftTab");
              }
          },
      },
  };
  let activeEditor = null;
  // Init source editor.
  function initSourceEditor(name) {
      if (favaAPI.favaOptions["currency-column"]) {
          sourceEditorOptions.rulers = [
              {
                  column: favaAPI.favaOptions["currency-column"] - 1,
                  lineStyle: "dotted",
              },
          ];
      }
      const sourceEditorTextarea = select(name);
      if (!sourceEditorTextarea) {
          return;
      }
      const editor = codemirror.fromTextArea(sourceEditorTextarea, sourceEditorOptions);
      if (name === "#source-editor") {
          activeEditor = editor;
      }
      const saveButton = select(`${name}-submit`);
      // @ts-ignore
      editor.setOption("favaSaveButton", saveButton);
      editor.on("changes", (cm) => {
          saveButton.disabled = cm.getDoc().isClean();
      });
      editor.on("keyup", (cm, event) => {
          if (!cm.state.completionActive &&
              !ignoreKey(event.key)) {
              codemirror.commands.autocomplete(cm, undefined, {
                  completeSingle: false,
              });
          }
      });
      const line = parseInt(new URLSearchParams(window.location.search).get("line") || "0", 10);
      if (line > 0) {
          editor.getDoc().setCursor(line - 1, 0);
          editor.execCommand("favaCenterCursor");
      }
      else {
          editor.execCommand("favaJumpToMarker");
      }
      // keybindings when the focus is outside the editor
      mousetrap.bind(["ctrl+s", "meta+s"], event => {
          event.preventDefault();
          editor.execCommand("favaSave");
      });
      mousetrap.bind(["ctrl+d", "meta+d"], event => {
          event.preventDefault();
          editor.execCommand("favaFormat");
      });
      // Run editor commands with buttons in editor menu.
      selectAll(`${name}-form button`).forEach(button => {
          const command = button.getAttribute("data-command");
          if (command) {
              button.addEventListener("click", event => {
                  event.preventDefault();
                  event.stopImmediatePropagation();
                  editor.execCommand(command);
              });
          }
      });
  }
  e.on("page-loaded", () => {
      initQueryEditor();
      initReadOnlyEditors();
      initSourceEditor("#source-editor");
  });
  const leaveMessage = "There are unsaved changes. Are you sure you want to leave?";
  e.on("navigate", (state) => {
      if (activeEditor) {
          if (!activeEditor.getDoc().isClean()) {
              const leave = window.confirm(leaveMessage); // eslint-disable-line no-alert
              if (!leave) {
                  state.interrupt = true;
              }
              else {
                  activeEditor = null;
              }
          }
          else {
              activeEditor = null;
          }
      }
  });
  window.addEventListener("beforeunload", event => {
      if (activeEditor && !activeEditor.getDoc().isClean()) {
          event.returnValue = leaveMessage;
      }
  });

  function addFilter(value) {
      filters.update(fs => {
          if (fs.filter) {
              fs.filter += ` ${value}`;
          }
          else {
              fs.filter = value;
          }
          return fs;
      });
  }
  e.on("page-loaded", () => {
      const journal = select(".journal");
      if (!journal)
          return;
      delegate(journal, "click", "li", event => {
          if (!event.target)
              return;
          const target = event.target;
          if (target.tagName === "A") {
              return;
          }
          if (target.className === "tag" || target.className === "link") {
              // Filter for tags and links when clicking on them.
              addFilter(target.innerText);
          }
          else if (target.className === "payee") {
              // Filter for payees when clicking on them.
              addFilter(`payee:"${target.innerText}"`);
          }
          else if (target.tagName === "DD") {
              // Filter for metadata when clicking on the value.
              addFilter(` ${target.previousElementSibling.innerText}"${target.innerText}"`);
          }
          else if (target.closest(".indicators")) {
              // Toggle postings and metadata by clicking on indicators.
              const entry = target.closest(".transaction");
              if (entry) {
                  entry.classList.toggle("show-postings");
              }
          }
      });
      // Toggle entries with buttons.
      selectAll("#entry-filters button").forEach(button => {
          button.addEventListener("click", () => {
              const type = button.getAttribute("data-type");
              const shouldShow = button.classList.contains("inactive");
              button.classList.toggle("inactive", !shouldShow);
              if (type === "transaction" || type === "custom" || type === "document") {
                  selectAll(`#entry-filters .${type}-toggle`).forEach(el => {
                      el.classList.toggle("inactive", !shouldShow);
                  });
              }
              journal.classList.toggle(`show-${type}`, shouldShow);
              // Modify get params
              const filterShow = [];
              selectAll("#entry-filters button").forEach(el => {
                  const datatype = el.getAttribute("data-type");
                  if (datatype && !el.classList.contains("inactive")) {
                      filterShow.push(datatype);
                  }
              });
              const url = new URL(window.location.href);
              url.searchParams.delete("show");
              filterShow.forEach(filter => {
                  url.searchParams.append("show", filter);
              });
              router.navigate(url.toString(), false);
          });
      });
  });

  function click(selector) {
      const element = select(selector);
      if (element) {
          // @ts-ignore
          element.click();
      }
  }
  e.on("page-loaded", () => {
      selectAll("[data-key]").forEach(element => {
          const key = element.getAttribute("data-key");
          if (key !== null) {
              mousetrap.bind(key, () => {
                  const tag = element.tagName;
                  if (tag === "BUTTON" || tag === "A") {
                      element.click();
                  }
                  else if (tag === "INPUT") {
                      element.focus();
                  }
              }, "keyup");
          }
      });
  });
  // Add a tooltip showing the keyboard shortcut over the target element.
  function showTooltip(target) {
      const tooltip = document.createElement("div");
      tooltip.className = "keyboard-tooltip";
      tooltip.innerHTML = target.getAttribute("data-key") || "";
      document.body.appendChild(tooltip);
      const parentCoords = target.getBoundingClientRect();
      // Padded 10px to the left if there is space or centered otherwise
      const left = parentCoords.left +
          Math.min((target.offsetWidth - tooltip.offsetWidth) / 2, 10);
      const top = parentCoords.top + (target.offsetHeight - tooltip.offsetHeight) / 2;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top + window.pageYOffset}px`;
  }
  // Show all keyboard shortcut tooltips.
  function showTooltips() {
      // @ts-ignore
      select("#reload-page").classList.remove("hidden");
      selectAll("[data-key]").forEach(el => {
          showTooltip(el);
      });
  }
  // Remove all keyboard shortcut tooltips.
  function removeTooltips() {
      // @ts-ignore
      select("#reload-page").classList.add("hidden");
      selectAll(".keyboard-tooltip").forEach(tooltip => {
          tooltip.remove();
      });
  }
  e.on("page-init", () => {
      mousetrap.bind("?", () => {
          removeTooltips();
          showTooltips();
          once(document, "mousedown", () => {
              removeTooltips();
          });
      });
      mousetrap.bind("esc", () => {
          closeOverlay();
          removeTooltips();
      });
      // Charts
      mousetrap.bind("c", () => {
          const selected = select(".chart-labels .selected");
          if (selected && selected.nextElementSibling) {
              selected.nextElementSibling.click();
          }
          else {
              click(".chart-labels label:first-child");
          }
      });
      mousetrap.bind("C", () => {
          const selected = select(".chart-labels .selected");
          if (selected && selected.previousElementSibling) {
              selected.previousElementSibling.click();
          }
          else {
              click(".chart-labels label:last-child");
          }
      });
  });

  /**
   * This script updates the links and error count in the sidebar as well as
   * toggling the sidebar on mobile.
   */
  function initSidebar() {
      selectAll("aside a").forEach(el => {
          el.classList.remove("selected");
          const href = el.getAttribute("href");
          if (href && href.includes(window.location.pathname)) {
              el.classList.add("selected");
          }
      });
      select("aside li.error").classList.toggle("hidden", favaAPI.errors === 0);
      select("aside li.error span").innerHTML = `${favaAPI.errors}`;
  }
  e.on("page-init", () => {
      const asideButton = select("#aside-button");
      asideButton.addEventListener("click", () => {
          select("aside").classList.toggle("active");
          asideButton.classList.toggle("active");
      });
  });
  e.on("page-loaded", () => {
      initSidebar();
  });
  e.on("file-modified", async () => {
      const errors = await fetchAPI("errors");
      favaAPI.errors = number(errors);
      initSidebar();
  });

  // Account trees.
  e.on("page-loaded", () => {
      selectAll(".tree-table").forEach(table => {
          const expandAllLink = select(".expand-all", table);
          expandAllLink.addEventListener("click", () => {
              expandAllLink.classList.add("hidden");
              selectAll(".toggled", table).forEach(el => {
                  el.classList.remove("toggled");
              });
          });
          delegate(table, "click", "span.has-children", (event) => {
              if (!event.target)
                  return;
              const target = event.target;
              if (target.tagName === "A")
                  return;
              const row = target.closest("li");
              const willShow = row.classList.contains("toggled");
              if (event.shiftKey) {
                  selectAll("li", row).forEach(el => {
                      el.classList.toggle("toggled", !willShow);
                  });
              }
              if (event.ctrlKey || event.metaKey) {
                  selectAll("li", row).forEach(el => {
                      el.classList.toggle("toggled", willShow);
                  });
              }
              row.classList.toggle("toggled");
              expandAllLink.classList.toggle("hidden", !selectAll(".toggled", table).length);
          });
      });
  });

  /* javascript/AutocompleteInput.svelte generated by Svelte v3.12.1 */

  function add_css() {
  	var style = element("style");
  	style.id = 'svelte-16b8qvp-style';
  	style.textContent = "span.svelte-16b8qvp{display:inline-block;position:relative}input.svelte-16b8qvp{width:100%}ul.svelte-16b8qvp{position:absolute;float:left;z-index:var(--z-index-autocomplete);overflow-x:hidden;overflow-y:auto;background-color:var(--color-background);border:1px solid var(--color-background-darkest);box-shadow:0 3px 3px var(--color-background-darker)}li.svelte-16b8qvp{min-width:8rem;padding:0 0.5em;white-space:nowrap;cursor:pointer}li.selected.svelte-16b8qvp,li.svelte-16b8qvp:hover{color:var(--color-background);background-color:var(--color-links)}li.svelte-16b8qvp span::before{position:absolute;z-index:-1;width:0.65em;height:1.2em;margin-top:0.12em;margin-left:-0.1em;content:\"\";background-color:var(--color-autocomplete-match);border-radius:2px}";
  	append(document.head, style);
  }

  function get_each_context(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.innerHTML = list[i].innerHTML;
  	child_ctx.suggestion = list[i].suggestion;
  	child_ctx.i = i;
  	return child_ctx;
  }

  // (158:4) {#each filteredSuggestions as { innerHTML, suggestion }
  function create_each_block(ctx) {
  	var li, html_tag, raw_value = ctx.innerHTML + "", t, dispose;

  	function mousedown_handler(...args) {
  		return ctx.mousedown_handler(ctx, ...args);
  	}

  	return {
  		c() {
  			li = element("li");
  			t = space();
  			html_tag = new HtmlTag(raw_value, t);
  			attr(li, "class", "svelte-16b8qvp");
  			toggle_class(li, "selected", ctx.i === ctx.index);
  			dispose = listen(li, "mousedown", mousedown_handler);
  		},

  		m(target, anchor) {
  			insert(target, li, anchor);
  			html_tag.m(li);
  			append(li, t);
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			if ((changed.filteredSuggestions) && raw_value !== (raw_value = ctx.innerHTML + "")) {
  				html_tag.p(raw_value);
  			}

  			if (changed.index) {
  				toggle_class(li, "selected", ctx.i === ctx.index);
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(li);
  			}

  			dispose();
  		}
  	};
  }

  function create_fragment(ctx) {
  	var span, input_1, t, ul, span_class_value, dispose;

  	var input_1_levels = [
  		{ name: ctx.name },
  		{ type: "text" },
  		{ autocomplete: "off" },
  		{ placeholder: ctx.placeholder },
  		ctx.inputOptions,
  		{ class: "svelte-16b8qvp" }
  	];

  	var input_1_data = {};
  	for (var i = 0; i < input_1_levels.length; i += 1) {
  		input_1_data = assign(input_1_data, input_1_levels[i]);
  	}

  	let each_value = ctx.filteredSuggestions;

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
  	}

  	return {
  		c() {
  			span = element("span");
  			input_1 = element("input");
  			t = space();
  			ul = element("ul");

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}
  			set_attributes(input_1, input_1_data);
  			ul.hidden = ctx.hidden;
  			attr(ul, "class", "svelte-16b8qvp");
  			attr(span, "class", span_class_value = "" + null_to_empty((ctx.className || '')) + " svelte-16b8qvp");

  			dispose = [
  				listen(input_1, "input", ctx.input_1_input_handler),
  				listen(input_1, "blur", ctx.blur_handler),
  				listen(input_1, "focusin", ctx.focusin_handler),
  				listen(input_1, "input", ctx.input_handler),
  				listen(input_1, "keydown", ctx.keydown)
  			];
  		},

  		m(target, anchor) {
  			insert(target, span, anchor);
  			append(span, input_1);

  			set_input_value(input_1, ctx.value);

  			ctx.input_1_binding(input_1);
  			append(span, t);
  			append(span, ul);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(ul, null);
  			}
  		},

  		p(changed, ctx) {
  			if (changed.value && (input_1.value !== ctx.value)) set_input_value(input_1, ctx.value);

  			set_attributes(input_1, get_spread_update(input_1_levels, [
  				(changed.name) && { name: ctx.name },
  				{ type: "text" },
  				{ autocomplete: "off" },
  				(changed.placeholder) && { placeholder: ctx.placeholder },
  				(changed.inputOptions) && ctx.inputOptions,
  				{ class: "svelte-16b8qvp" }
  			]));

  			if (changed.index || changed.filteredSuggestions) {
  				each_value = ctx.filteredSuggestions;

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  					} else {
  						each_blocks[i] = create_each_block(child_ctx);
  						each_blocks[i].c();
  						each_blocks[i].m(ul, null);
  					}
  				}

  				for (; i < each_blocks.length; i += 1) {
  					each_blocks[i].d(1);
  				}
  				each_blocks.length = each_value.length;
  			}

  			if (changed.hidden) {
  				ul.hidden = ctx.hidden;
  			}

  			if ((changed.className) && span_class_value !== (span_class_value = "" + null_to_empty((ctx.className || '')) + " svelte-16b8qvp")) {
  				attr(span, "class", span_class_value);
  			}
  		},

  		i: noop,
  		o: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(span);
  			}

  			ctx.input_1_binding(null);

  			destroy_each(each_blocks, detaching);

  			run_all(dispose);
  		}
  	};
  }

  function instance($$self, $$props, $$invalidate) {
  	

    const dispatch = createEventDispatcher();

    let { value = "", suggestions = [], name = "", placeholder = "", valueExtractor, valueSelector, setSize = false, className } = $$props;
    let filteredSuggestions = [];
    let hidden = true;
    let index = -1;
    let input;
    const inputOptions = {};

    function focus() {
      input.focus();
    }

    function setCustomValidity(str) {
      input.setCustomValidity(str);
    }

    function select(suggestion) {
      if (input && valueSelector) {
        $$invalidate('value', value = valueSelector(suggestion, input));
      } else {
        $$invalidate('value', value = suggestion);
      }
      dispatch("select");
      $$invalidate('hidden', hidden = true);
    }

    function mousedown(event, suggestion) {
      if (event.button === 0) {
        select(suggestion);
      }
    }

    function keydown(event) {
      if (event.keyCode === 13) {
        // ENTER
        if (index > -1) {
          event.preventDefault();
          select(filteredSuggestions[index].suggestion);
        }
      } else if (event.keyCode === 27) {
        $$invalidate('hidden', hidden = true);
        // ESC
      } else if (event.keyCode === 38) {
        // UP
        event.preventDefault();
        $$invalidate('index', index = index === 0 ? filteredSuggestions.length - 1 : index - 1);
      } else if (event.keyCode === 40) {
        // DOWN
        event.preventDefault();
        $$invalidate('index', index = index === filteredSuggestions.length - 1 ? 0 : index + 1);
      }
    }

  	function input_1_input_handler() {
  		value = this.value;
  		$$invalidate('value', value);
  	}

  	function input_1_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('input', input = $$value);
  		});
  	}

  	const blur_handler = () => {
  	      $$invalidate('hidden', hidden = true);
  	    };

  	const focusin_handler = () => {
  	      $$invalidate('hidden', hidden = false);
  	    };

  	const input_handler = () => {
  	      $$invalidate('hidden', hidden = false);
  	    };

  	const mousedown_handler = ({ suggestion }, ev) => mousedown(ev, suggestion);

  	$$self.$set = $$props => {
  		if ('value' in $$props) $$invalidate('value', value = $$props.value);
  		if ('suggestions' in $$props) $$invalidate('suggestions', suggestions = $$props.suggestions);
  		if ('name' in $$props) $$invalidate('name', name = $$props.name);
  		if ('placeholder' in $$props) $$invalidate('placeholder', placeholder = $$props.placeholder);
  		if ('valueExtractor' in $$props) $$invalidate('valueExtractor', valueExtractor = $$props.valueExtractor);
  		if ('valueSelector' in $$props) $$invalidate('valueSelector', valueSelector = $$props.valueSelector);
  		if ('setSize' in $$props) $$invalidate('setSize', setSize = $$props.setSize);
  		if ('className' in $$props) $$invalidate('className', className = $$props.className);
  	};

  	$$self.$$.update = ($$dirty = { input: 1, valueExtractor: 1, value: 1, suggestions: 1, index: 1, filteredSuggestions: 1, setSize: 1, placeholder: 1 }) => {
  		if ($$dirty.input || $$dirty.valueExtractor || $$dirty.value || $$dirty.suggestions) { {
          const val = input && valueExtractor ? valueExtractor(value, input) : value;
          const filtered = suggestions
            .map(suggestion => String(suggestion))
            .filter(suggestion => fuzzytest(val, suggestion))
            .slice(0, 30)
            .map(suggestion => ({
              suggestion,
              innerHTML: fuzzywrap(val, suggestion),
            }));
          if (filtered.length === 1 && filtered[0].suggestion === val) {
            $$invalidate('filteredSuggestions', filteredSuggestions = []);
          } else {
            $$invalidate('filteredSuggestions', filteredSuggestions = filtered);
          }
        } }
  		if ($$dirty.index || $$dirty.filteredSuggestions) { if (index > filteredSuggestions.length - 1) {
          $$invalidate('index', index = filteredSuggestions.length - 1);
        } }
  		if ($$dirty.setSize || $$dirty.value || $$dirty.placeholder) { if (setSize) {
          $$invalidate('inputOptions', inputOptions.size = Math.max(value.length, placeholder.length) + 1, inputOptions);
        } }
  	};

  	return {
  		value,
  		suggestions,
  		name,
  		placeholder,
  		valueExtractor,
  		valueSelector,
  		setSize,
  		className,
  		filteredSuggestions,
  		hidden,
  		index,
  		input,
  		inputOptions,
  		focus,
  		setCustomValidity,
  		mousedown,
  		keydown,
  		input_1_input_handler,
  		input_1_binding,
  		blur_handler,
  		focusin_handler,
  		input_handler,
  		mousedown_handler
  	};
  }

  class AutocompleteInput extends SvelteComponent {
  	constructor(options) {
  		super();
  		if (!document.getElementById("svelte-16b8qvp-style")) add_css();
  		init(this, options, instance, create_fragment, safe_not_equal, ["value", "suggestions", "name", "placeholder", "valueExtractor", "valueSelector", "setSize", "className", "focus", "setCustomValidity"]);
  	}

  	get focus() {
  		return this.$$.ctx.focus;
  	}

  	get setCustomValidity() {
  		return this.$$.ctx.setCustomValidity;
  	}
  }

  /* javascript/entry-forms/AccountInput.svelte generated by Svelte v3.12.1 */

  function create_fragment$1(ctx) {
  	var updating_value, current;

  	function autocompleteinput_value_binding(value_1) {
  		ctx.autocompleteinput_value_binding.call(null, value_1);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let autocompleteinput_props = {
  		className: "account",
  		placeholder: _('Account'),
  		suggestions: ctx.suggestions || favaAPI.accounts
  	};
  	if (ctx.value !== void 0) {
  		autocompleteinput_props.value = ctx.value;
  	}
  	var autocompleteinput = new AutocompleteInput({ props: autocompleteinput_props });

  	ctx.autocompleteinput_binding(autocompleteinput);
  	binding_callbacks.push(() => bind(autocompleteinput, 'value', autocompleteinput_value_binding));

  	return {
  		c() {
  			autocompleteinput.$$.fragment.c();
  		},

  		m(target, anchor) {
  			mount_component(autocompleteinput, target, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			var autocompleteinput_changes = {};
  			if (changed.suggestions) autocompleteinput_changes.suggestions = ctx.suggestions || favaAPI.accounts;
  			if (!updating_value && changed.value) {
  				autocompleteinput_changes.value = ctx.value;
  			}
  			autocompleteinput.$set(autocompleteinput_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(autocompleteinput.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(autocompleteinput.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			ctx.autocompleteinput_binding(null);

  			destroy_component(autocompleteinput, detaching);
  		}
  	};
  }

  function instance$1($$self, $$props, $$invalidate) {
  	

    let { value = "", suggestions } = $$props;

    let input;

    function checkValidity(val) {
      if (favaAPI.accounts.includes(val)) {
        input.setCustomValidity("");
      } else {
        input.setCustomValidity(_("Should be one of the declared accounts"));
      }
    }

  	function autocompleteinput_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('input', input = $$value);
  		});
  	}

  	function autocompleteinput_value_binding(value_1) {
  		value = value_1;
  		$$invalidate('value', value);
  	}

  	$$self.$set = $$props => {
  		if ('value' in $$props) $$invalidate('value', value = $$props.value);
  		if ('suggestions' in $$props) $$invalidate('suggestions', suggestions = $$props.suggestions);
  	};

  	$$self.$$.update = ($$dirty = { input: 1, value: 1 }) => {
  		if ($$dirty.input || $$dirty.value) { if (input) checkValidity(value); }
  	};

  	return {
  		value,
  		suggestions,
  		input,
  		autocompleteinput_binding,
  		autocompleteinput_value_binding
  	};
  }

  class AccountInput extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["value", "suggestions"]);
  	}
  }

  /* javascript/Import.svelte generated by Svelte v3.12.1 */
  const { Object: Object_1 } = globals;

  function add_css$1() {
  	var style = element("style");
  	style.id = 'svelte-gepel5-style';
  	style.textContent = ".flex-row.svelte-gepel5{display:flex}.button.svelte-gepel5{padding:4px 8px}";
  	append(document.head, style);
  }

  function get_each_context_2(ctx, list, i) {
  	const child_ctx = Object_1.create(ctx);
  	child_ctx.info = list[i];
  	child_ctx.each_value_2 = list;
  	child_ctx.info_index = i;
  	return child_ctx;
  }

  function get_each_context_1(ctx, list, i) {
  	const child_ctx = Object_1.create(ctx);
  	child_ctx.item = list[i];
  	child_ctx.each_value_1 = list;
  	child_ctx.item_index = i;
  	return child_ctx;
  }

  function get_each_context$1(ctx, list, i) {
  	const child_ctx = Object_1.create(ctx);
  	child_ctx.directory = list[i][0];
  	child_ctx.items = list[i][1];
  	return child_ctx;
  }

  // (97:4) {:else}
  function create_else_block(ctx) {
  	var p, updating_value, t0, input, t1, button, t2_value = 'Move' + "", t2, t3, current, dispose;

  	function accountinput_value_binding_1(value) {
  		ctx.accountinput_value_binding_1.call(null, value, ctx);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let accountinput_props = {};
  	if (ctx.item.account !== void 0) {
  		accountinput_props.value = ctx.item.account;
  	}
  	var accountinput = new AccountInput({ props: accountinput_props });

  	binding_callbacks.push(() => bind(accountinput, 'value', accountinput_value_binding_1));

  	function input_input_handler_1() {
  		ctx.input_input_handler_1.call(input, ctx);
  	}

  	function click_handler_1() {
  		return ctx.click_handler_1(ctx);
  	}

  	return {
  		c() {
  			p = element("p");
  			accountinput.$$.fragment.c();
  			t0 = space();
  			input = element("input");
  			t1 = space();
  			button = element("button");
  			t2 = text(t2_value);
  			t3 = space();
  			attr(input, "size", "40");
  			attr(button, "type", "button");

  			dispose = [
  				listen(input, "input", input_input_handler_1),
  				listen(button, "click", click_handler_1)
  			];
  		},

  		m(target, anchor) {
  			insert(target, p, anchor);
  			mount_component(accountinput, p, null);
  			append(p, t0);
  			append(p, input);

  			set_input_value(input, ctx.item.newName);

  			append(p, t1);
  			append(p, button);
  			append(button, t2);
  			append(p, t3);
  			current = true;
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			var accountinput_changes = {};
  			if (!updating_value && changed.Object || changed.data) {
  				accountinput_changes.value = ctx.item.account;
  			}
  			accountinput.$set(accountinput_changes);

  			if ((changed.Object || changed.data) && (input.value !== ctx.item.newName)) set_input_value(input, ctx.item.newName);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(accountinput.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(accountinput.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(p);
  			}

  			destroy_component(accountinput);

  			run_all(dispose);
  		}
  	};
  }

  // (79:4) {#if item.importers.length}
  function create_if_block(ctx) {
  	var each_1_anchor, current;

  	let each_value_2 = ctx.item.importers;

  	let each_blocks = [];

  	for (let i = 0; i < each_value_2.length; i += 1) {
  		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
  	}

  	const out = i => transition_out(each_blocks[i], 1, 1, () => {
  		each_blocks[i] = null;
  	});

  	return {
  		c() {
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			each_1_anchor = empty();
  		},

  		m(target, anchor) {
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(target, anchor);
  			}

  			insert(target, each_1_anchor, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed._ || changed.Object || changed.data || changed.extractURL) {
  				each_value_2 = ctx.item.importers;

  				let i;
  				for (i = 0; i < each_value_2.length; i += 1) {
  					const child_ctx = get_each_context_2(ctx, each_value_2, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  						transition_in(each_blocks[i], 1);
  					} else {
  						each_blocks[i] = create_each_block_2(child_ctx);
  						each_blocks[i].c();
  						transition_in(each_blocks[i], 1);
  						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
  					}
  				}

  				group_outros();
  				for (i = each_value_2.length; i < each_blocks.length; i += 1) {
  					out(i);
  				}
  				check_outros();
  			}
  		},

  		i(local) {
  			if (current) return;
  			for (let i = 0; i < each_value_2.length; i += 1) {
  				transition_in(each_blocks[i]);
  			}

  			current = true;
  		},

  		o(local) {
  			each_blocks = each_blocks.filter(Boolean);
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				transition_out(each_blocks[i]);
  			}

  			current = false;
  		},

  		d(detaching) {
  			destroy_each(each_blocks, detaching);

  			if (detaching) {
  				detach(each_1_anchor);
  			}
  		}
  	};
  }

  // (80:6) {#each item.importers as info}
  function create_each_block_2(ctx) {
  	var p, updating_value, t0, input, t1, button, t2_value = 'Move' + "", t2, t3, a, t4_value = _('Extract') + "", t4, t5, t6_value = ctx.info.importer_name + "", t6, t7, a_title_value, a_href_value, t8, current, dispose;

  	function accountinput_value_binding(value) {
  		ctx.accountinput_value_binding.call(null, value, ctx);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let accountinput_props = {};
  	if (ctx.info.account !== void 0) {
  		accountinput_props.value = ctx.info.account;
  	}
  	var accountinput = new AccountInput({ props: accountinput_props });

  	binding_callbacks.push(() => bind(accountinput, 'value', accountinput_value_binding));

  	function input_input_handler() {
  		ctx.input_input_handler.call(input, ctx);
  	}

  	function click_handler() {
  		return ctx.click_handler(ctx);
  	}

  	return {
  		c() {
  			p = element("p");
  			accountinput.$$.fragment.c();
  			t0 = space();
  			input = element("input");
  			t1 = space();
  			button = element("button");
  			t2 = text(t2_value);
  			t3 = space();
  			a = element("a");
  			t4 = text(t4_value);
  			t5 = text(" ( ");
  			t6 = text(t6_value);
  			t7 = text(" )");
  			t8 = space();
  			attr(input, "size", "40");
  			attr(button, "type", "button");
  			attr(a, "class", "button svelte-gepel5");
  			attr(a, "title", a_title_value = "" + _('Extract') + " with importer " + ctx.info.importer_name);
  			attr(a, "href", a_href_value = extractURL(ctx.item.name, ctx.info.importer_name));
  			attr(p, "class", "flex-row svelte-gepel5");

  			dispose = [
  				listen(input, "input", input_input_handler),
  				listen(button, "click", click_handler)
  			];
  		},

  		m(target, anchor) {
  			insert(target, p, anchor);
  			mount_component(accountinput, p, null);
  			append(p, t0);
  			append(p, input);

  			set_input_value(input, ctx.info.newName);

  			append(p, t1);
  			append(p, button);
  			append(button, t2);
  			append(p, t3);
  			append(p, a);
  			append(a, t4);
  			append(a, t5);
  			append(a, t6);
  			append(a, t7);
  			append(p, t8);
  			current = true;
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			var accountinput_changes = {};
  			if (!updating_value && changed.Object || changed.data) {
  				accountinput_changes.value = ctx.info.account;
  			}
  			accountinput.$set(accountinput_changes);

  			if ((changed.Object || changed.data) && (input.value !== ctx.info.newName)) set_input_value(input, ctx.info.newName);

  			if ((!current || changed.Object || changed.data) && t6_value !== (t6_value = ctx.info.importer_name + "")) {
  				set_data(t6, t6_value);
  			}

  			if ((!current || changed.Object || changed.data) && a_title_value !== (a_title_value = "" + _('Extract') + " with importer " + ctx.info.importer_name)) {
  				attr(a, "title", a_title_value);
  			}

  			if ((!current || changed.Object || changed.data) && a_href_value !== (a_href_value = extractURL(ctx.item.name, ctx.info.importer_name))) {
  				attr(a, "href", a_href_value);
  			}
  		},

  		i(local) {
  			if (current) return;
  			transition_in(accountinput.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(accountinput.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(p);
  			}

  			destroy_component(accountinput);

  			run_all(dispose);
  		}
  	};
  }

  // (73:2) {#each items as item}
  function create_each_block_1(ctx) {
  	var pre, a, t0_value = ctx.item.basename + "", t0, a_href_value, pre_title_value, t1, current_block_type_index, if_block, if_block_anchor, current;

  	var if_block_creators = [
  		create_if_block,
  		create_else_block
  	];

  	var if_blocks = [];

  	function select_block_type(changed, ctx) {
  		if (ctx.item.importers.length) return 0;
  		return 1;
  	}

  	current_block_type_index = select_block_type(null, ctx);
  	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

  	return {
  		c() {
  			pre = element("pre");
  			a = element("a");
  			t0 = text(t0_value);
  			t1 = space();
  			if_block.c();
  			if_block_anchor = empty();
  			attr(a, "href", a_href_value = documentURL(ctx.item.name));
  			attr(a, "data-remote", "");
  			attr(a, "target", "_blank");
  			attr(pre, "title", pre_title_value = ctx.item.name);
  		},

  		m(target, anchor) {
  			insert(target, pre, anchor);
  			append(pre, a);
  			append(a, t0);
  			insert(target, t1, anchor);
  			if_blocks[current_block_type_index].m(target, anchor);
  			insert(target, if_block_anchor, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			if ((!current || changed.Object || changed.data) && t0_value !== (t0_value = ctx.item.basename + "")) {
  				set_data(t0, t0_value);
  			}

  			if ((!current || changed.Object || changed.data) && a_href_value !== (a_href_value = documentURL(ctx.item.name))) {
  				attr(a, "href", a_href_value);
  			}

  			if ((!current || changed.Object || changed.data) && pre_title_value !== (pre_title_value = ctx.item.name)) {
  				attr(pre, "title", pre_title_value);
  			}

  			var previous_block_index = current_block_type_index;
  			current_block_type_index = select_block_type(changed, ctx);
  			if (current_block_type_index === previous_block_index) {
  				if_blocks[current_block_type_index].p(changed, ctx);
  			} else {
  				group_outros();
  				transition_out(if_blocks[previous_block_index], 1, 1, () => {
  					if_blocks[previous_block_index] = null;
  				});
  				check_outros();

  				if_block = if_blocks[current_block_type_index];
  				if (!if_block) {
  					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
  					if_block.c();
  				}
  				transition_in(if_block, 1);
  				if_block.m(if_block_anchor.parentNode, if_block_anchor);
  			}
  		},

  		i(local) {
  			if (current) return;
  			transition_in(if_block);
  			current = true;
  		},

  		o(local) {
  			transition_out(if_block);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(pre);
  				detach(t1);
  			}

  			if_blocks[current_block_type_index].d(detaching);

  			if (detaching) {
  				detach(if_block_anchor);
  			}
  		}
  	};
  }

  // (71:0) {#each Object.entries(data) as [directory, items]}
  function create_each_block$1(ctx) {
  	var h3, t0, t1_value = ctx.directory + "", t1, t2, each_1_anchor, current;

  	let each_value_1 = ctx.items;

  	let each_blocks = [];

  	for (let i = 0; i < each_value_1.length; i += 1) {
  		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
  	}

  	const out = i => transition_out(each_blocks[i], 1, 1, () => {
  		each_blocks[i] = null;
  	});

  	return {
  		c() {
  			h3 = element("h3");
  			t0 = text("Directory: ");
  			t1 = text(t1_value);
  			t2 = space();

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			each_1_anchor = empty();
  		},

  		m(target, anchor) {
  			insert(target, h3, anchor);
  			append(h3, t0);
  			append(h3, t1);
  			insert(target, t2, anchor);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(target, anchor);
  			}

  			insert(target, each_1_anchor, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			if ((!current || changed.Object || changed.data) && t1_value !== (t1_value = ctx.directory + "")) {
  				set_data(t1, t1_value);
  			}

  			if (changed.Object || changed.data || changed._ || changed.extractURL || changed.documentURL) {
  				each_value_1 = ctx.items;

  				let i;
  				for (i = 0; i < each_value_1.length; i += 1) {
  					const child_ctx = get_each_context_1(ctx, each_value_1, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  						transition_in(each_blocks[i], 1);
  					} else {
  						each_blocks[i] = create_each_block_1(child_ctx);
  						each_blocks[i].c();
  						transition_in(each_blocks[i], 1);
  						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
  					}
  				}

  				group_outros();
  				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
  					out(i);
  				}
  				check_outros();
  			}
  		},

  		i(local) {
  			if (current) return;
  			for (let i = 0; i < each_value_1.length; i += 1) {
  				transition_in(each_blocks[i]);
  			}

  			current = true;
  		},

  		o(local) {
  			each_blocks = each_blocks.filter(Boolean);
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				transition_out(each_blocks[i]);
  			}

  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(h3);
  				detach(t2);
  			}

  			destroy_each(each_blocks, detaching);

  			if (detaching) {
  				detach(each_1_anchor);
  			}
  		}
  	};
  }

  function create_fragment$2(ctx) {
  	var each_1_anchor, current;

  	let each_value = ctx.Object.entries(ctx.data);

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
  	}

  	const out = i => transition_out(each_blocks[i], 1, 1, () => {
  		each_blocks[i] = null;
  	});

  	return {
  		c() {
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			each_1_anchor = empty();
  		},

  		m(target, anchor) {
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(target, anchor);
  			}

  			insert(target, each_1_anchor, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed.Object || changed.data || changed._ || changed.extractURL || changed.documentURL) {
  				each_value = ctx.Object.entries(ctx.data);

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context$1(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  						transition_in(each_blocks[i], 1);
  					} else {
  						each_blocks[i] = create_each_block$1(child_ctx);
  						each_blocks[i].c();
  						transition_in(each_blocks[i], 1);
  						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
  					}
  				}

  				group_outros();
  				for (i = each_value.length; i < each_blocks.length; i += 1) {
  					out(i);
  				}
  				check_outros();
  			}
  		},

  		i(local) {
  			if (current) return;
  			for (let i = 0; i < each_value.length; i += 1) {
  				transition_in(each_blocks[i]);
  			}

  			current = true;
  		},

  		o(local) {
  			each_blocks = each_blocks.filter(Boolean);
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				transition_out(each_blocks[i]);
  			}

  			current = false;
  		},

  		d(detaching) {
  			destroy_each(each_blocks, detaching);

  			if (detaching) {
  				detach(each_1_anchor);
  			}
  		}
  	};
  }

  function newFilename(date, basename) {
    if (/\d{4}-\d{2}-\d{2}/.test(basename)) {
      return basename;
    }
    return `${date} ${basename}`;
  }

  function extractURL(filename, importer) {
    const params = new URLSearchParams();
    params.set("filename", filename);
    params.set("importer", importer);
    return `#extract-${params.toString()}`;
  }

  function documentURL(filename) {
    const params = new URLSearchParams();
    params.set("filename", filename);
    return `../document/?${params.toString()}`;
  }

  function instance$2($$self, $$props, $$invalidate) {
  	

    let { data } = $$props;

    const today = new Date().toISOString().slice(0, 10);

    async function move(filename, account, newName) {
      try {
        const msg = await fetchAPI("move", {
          filename,
          account,
          newName,
        });
        notify(msg);
        for (const [directory, items] of Object.entries(data)) {
          $$invalidate('data', data[directory] = items.filter(item => item.name !== filename), data);
        }
      } catch (error) {
        notify(error, "error");
      }
    }

  	function accountinput_value_binding(value, { info }) {
  		info.account = value;
  		$$invalidate('Object', Object);
  	}

  	function input_input_handler({ info, each_value_2, info_index }) {
  		each_value_2[info_index].newName = this.value;
  		$$invalidate('Object', Object);
  		$$invalidate('data', data);
  	}

  	const click_handler = ({ item, info }) => move(item.name, info.account, info.newName);

  	function accountinput_value_binding_1(value, { item }) {
  		item.account = value;
  		$$invalidate('Object', Object);
  	}

  	function input_input_handler_1({ item, each_value_1, item_index }) {
  		each_value_1[item_index].newName = this.value;
  		$$invalidate('Object', Object);
  		$$invalidate('data', data);
  	}

  	const click_handler_1 = ({ item }) => move(item.name, item.account, item.newName);

  	$$self.$set = $$props => {
  		if ('data' in $$props) $$invalidate('data', data = $$props.data);
  	};

  	$$self.$$.update = ($$dirty = { Object: 1, data: 1 }) => {
  		if ($$dirty.Object || $$dirty.data) { for (const items of Object.values(data)) {
          for (const item of items) {
            item.newName = item.newName || newFilename(today, item.basename);
            for (const importInfo of item.importers) {
              importInfo.newName =
                importInfo.newName || newFilename(importInfo.date, importInfo.name);
            }
          }
        } }
  	};

  	return {
  		data,
  		move,
  		Object,
  		accountinput_value_binding,
  		input_input_handler,
  		click_handler,
  		accountinput_value_binding_1,
  		input_input_handler_1,
  		click_handler_1
  	};
  }

  class Import extends SvelteComponent {
  	constructor(options) {
  		super();
  		if (!document.getElementById("svelte-gepel5-style")) add_css$1();
  		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["data"]);
  	}
  }

  /* javascript/ChartSwitcher.svelte generated by Svelte v3.12.1 */

  function get_each_context$2(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.chart = list[i];
  	child_ctx.index = i;
  	return child_ctx;
  }

  function get_each_context_1$1(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.key = list[i];
  	return child_ctx;
  }

  function get_each_context_2$1(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.conversion = list[i][0];
  	child_ctx.conversionName = list[i][1];
  	return child_ctx;
  }

  function get_each_context_3(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.currency = list[i];
  	return child_ctx;
  }

  function get_each_context_4(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.item = list[i];
  	return child_ctx;
  }

  // (90:0) {#if charts.length}
  function create_if_block$1(ctx) {
  	var form, p, p_hidden_value, t0, span0, t1, select0, select0_hidden_value, t2, span3, label0, input0, t3, span1, t4_value = _('Treemap') + "", t4, t5, label1, input1, t6, span2, t7_value = _('Sunburst') + "", t7, span3_hidden_value, t8, select1, t9, select2, t10, button, t11, div0, svg_1, div0_resize_listener, div0_hidden_value, t12, div1, div1_hidden_value, dispose;

  	let each_value_4 = ctx.legend.domain.sort();

  	let each_blocks_4 = [];

  	for (let i = 0; i < each_value_4.length; i += 1) {
  		each_blocks_4[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
  	}

  	let each_value_3 = ctx.currencies;

  	let each_blocks_3 = [];

  	for (let i = 0; i < each_value_3.length; i += 1) {
  		each_blocks_3[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
  	}

  	let each_value_2 = ctx.conversions;

  	let each_blocks_2 = [];

  	for (let i = 0; i < each_value_2.length; i += 1) {
  		each_blocks_2[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
  	}

  	let each_value_1 = Object.keys(ctx.intervals);

  	let each_blocks_1 = [];

  	for (let i = 0; i < each_value_1.length; i += 1) {
  		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
  	}

  	let each_value = ctx.charts;

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
  	}

  	return {
  		c() {
  			form = element("form");
  			p = element("p");

  			for (let i = 0; i < each_blocks_4.length; i += 1) {
  				each_blocks_4[i].c();
  			}

  			t0 = space();
  			span0 = element("span");
  			t1 = space();
  			select0 = element("select");

  			for (let i = 0; i < each_blocks_3.length; i += 1) {
  				each_blocks_3[i].c();
  			}

  			t2 = space();
  			span3 = element("span");
  			label0 = element("label");
  			input0 = element("input");
  			t3 = space();
  			span1 = element("span");
  			t4 = text(t4_value);
  			t5 = space();
  			label1 = element("label");
  			input1 = element("input");
  			t6 = space();
  			span2 = element("span");
  			t7 = text(t7_value);
  			t8 = space();
  			select1 = element("select");

  			for (let i = 0; i < each_blocks_2.length; i += 1) {
  				each_blocks_2[i].c();
  			}

  			t9 = space();
  			select2 = element("select");

  			for (let i = 0; i < each_blocks_1.length; i += 1) {
  				each_blocks_1[i].c();
  			}

  			t10 = space();
  			button = element("button");
  			t11 = space();
  			div0 = element("div");
  			svg_1 = svg_element("svg");
  			t12 = space();
  			div1 = element("div");

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}
  			p.hidden = p_hidden_value = !ctx.$showCharts;
  			attr(p, "class", "chart-legend");
  			attr(span0, "class", "spacer");
  			if (ctx.$chartCurrency === void 0) add_render_callback(() => ctx.select0_change_handler.call(select0));
  			select0.hidden = select0_hidden_value = !ctx.$showCharts || !ctx.hasCurrencySetting;
  			ctx.$$binding_groups[0].push(input0);
  			attr(input0, "type", "radio");
  			input0.__value = "treemap";
  			input0.value = input0.__value;
  			attr(span1, "class", "button");
  			ctx.$$binding_groups[0].push(input1);
  			attr(input1, "type", "radio");
  			input1.__value = "sunburst";
  			input1.value = input1.__value;
  			attr(span2, "class", "button");
  			span3.hidden = span3_hidden_value = !ctx.$showCharts || !ctx.hasModeSetting;
  			attr(span3, "class", "chart-mode");
  			if (ctx.$conversion === void 0) add_render_callback(() => ctx.select1_change_handler.call(select1));
  			if (ctx.$interval === void 0) add_render_callback(() => ctx.select2_change_handler.call(select2));
  			attr(button, "type", "button");
  			attr(button, "data-key", "ctrl+c");
  			attr(button, "class", "toggle-chart");
  			toggle_class(button, "closed", !ctx.$showCharts);
  			attr(form, "class", "wide-form");
  			add_render_callback(() => ctx.div0_resize_handler.call(div0));
  			div0.hidden = div0_hidden_value = !ctx.$showCharts;
  			div1.hidden = div1_hidden_value = !ctx.$showCharts;
  			attr(div1, "class", "chart-labels");

  			dispose = [
  				listen(select0, "change", ctx.select0_change_handler),
  				listen(input0, "change", ctx.input0_change_handler),
  				listen(input1, "change", ctx.input1_change_handler),
  				listen(select1, "change", ctx.select1_change_handler),
  				listen(select2, "change", ctx.select2_change_handler),
  				listen(button, "click", ctx.click_handler)
  			];
  		},

  		m(target, anchor) {
  			insert(target, form, anchor);
  			append(form, p);

  			for (let i = 0; i < each_blocks_4.length; i += 1) {
  				each_blocks_4[i].m(p, null);
  			}

  			append(form, t0);
  			append(form, span0);
  			append(form, t1);
  			append(form, select0);

  			for (let i = 0; i < each_blocks_3.length; i += 1) {
  				each_blocks_3[i].m(select0, null);
  			}

  			select_option(select0, ctx.$chartCurrency);

  			append(form, t2);
  			append(form, span3);
  			append(span3, label0);
  			append(label0, input0);

  			input0.checked = input0.__value === ctx.$chartMode;

  			append(label0, t3);
  			append(label0, span1);
  			append(span1, t4);
  			append(span3, t5);
  			append(span3, label1);
  			append(label1, input1);

  			input1.checked = input1.__value === ctx.$chartMode;

  			append(label1, t6);
  			append(label1, span2);
  			append(span2, t7);
  			append(form, t8);
  			append(form, select1);

  			for (let i = 0; i < each_blocks_2.length; i += 1) {
  				each_blocks_2[i].m(select1, null);
  			}

  			select_option(select1, ctx.$conversion);

  			append(form, t9);
  			append(form, select2);

  			for (let i = 0; i < each_blocks_1.length; i += 1) {
  				each_blocks_1[i].m(select2, null);
  			}

  			select_option(select2, ctx.$interval);

  			append(form, t10);
  			append(form, button);
  			insert(target, t11, anchor);
  			insert(target, div0, anchor);
  			append(div0, svg_1);
  			ctx.svg_1_binding(svg_1);
  			div0_resize_listener = add_resize_listener(div0, ctx.div0_resize_handler.bind(div0));
  			insert(target, t12, anchor);
  			insert(target, div1, anchor);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(div1, null);
  			}
  		},

  		p(changed, ctx) {
  			if (changed.legend) {
  				each_value_4 = ctx.legend.domain.sort();

  				let i;
  				for (i = 0; i < each_value_4.length; i += 1) {
  					const child_ctx = get_each_context_4(ctx, each_value_4, i);

  					if (each_blocks_4[i]) {
  						each_blocks_4[i].p(changed, child_ctx);
  					} else {
  						each_blocks_4[i] = create_each_block_4(child_ctx);
  						each_blocks_4[i].c();
  						each_blocks_4[i].m(p, null);
  					}
  				}

  				for (; i < each_blocks_4.length; i += 1) {
  					each_blocks_4[i].d(1);
  				}
  				each_blocks_4.length = each_value_4.length;
  			}

  			if ((changed.$showCharts) && p_hidden_value !== (p_hidden_value = !ctx.$showCharts)) {
  				p.hidden = p_hidden_value;
  			}

  			if (changed.currencies) {
  				each_value_3 = ctx.currencies;

  				let i;
  				for (i = 0; i < each_value_3.length; i += 1) {
  					const child_ctx = get_each_context_3(ctx, each_value_3, i);

  					if (each_blocks_3[i]) {
  						each_blocks_3[i].p(changed, child_ctx);
  					} else {
  						each_blocks_3[i] = create_each_block_3(child_ctx);
  						each_blocks_3[i].c();
  						each_blocks_3[i].m(select0, null);
  					}
  				}

  				for (; i < each_blocks_3.length; i += 1) {
  					each_blocks_3[i].d(1);
  				}
  				each_blocks_3.length = each_value_3.length;
  			}

  			if (changed.$chartCurrency) select_option(select0, ctx.$chartCurrency);

  			if ((changed.$showCharts || changed.hasCurrencySetting) && select0_hidden_value !== (select0_hidden_value = !ctx.$showCharts || !ctx.hasCurrencySetting)) {
  				select0.hidden = select0_hidden_value;
  			}

  			if (changed.$chartMode) input0.checked = input0.__value === ctx.$chartMode;
  			if (changed.$chartMode) input1.checked = input1.__value === ctx.$chartMode;

  			if ((changed.$showCharts || changed.hasModeSetting) && span3_hidden_value !== (span3_hidden_value = !ctx.$showCharts || !ctx.hasModeSetting)) {
  				span3.hidden = span3_hidden_value;
  			}

  			if (changed.conversions) {
  				each_value_2 = ctx.conversions;

  				let i;
  				for (i = 0; i < each_value_2.length; i += 1) {
  					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

  					if (each_blocks_2[i]) {
  						each_blocks_2[i].p(changed, child_ctx);
  					} else {
  						each_blocks_2[i] = create_each_block_2$1(child_ctx);
  						each_blocks_2[i].c();
  						each_blocks_2[i].m(select1, null);
  					}
  				}

  				for (; i < each_blocks_2.length; i += 1) {
  					each_blocks_2[i].d(1);
  				}
  				each_blocks_2.length = each_value_2.length;
  			}

  			if (changed.$conversion) select_option(select1, ctx.$conversion);

  			if (changed.intervals) {
  				each_value_1 = Object.keys(ctx.intervals);

  				let i;
  				for (i = 0; i < each_value_1.length; i += 1) {
  					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

  					if (each_blocks_1[i]) {
  						each_blocks_1[i].p(changed, child_ctx);
  					} else {
  						each_blocks_1[i] = create_each_block_1$1(child_ctx);
  						each_blocks_1[i].c();
  						each_blocks_1[i].m(select2, null);
  					}
  				}

  				for (; i < each_blocks_1.length; i += 1) {
  					each_blocks_1[i].d(1);
  				}
  				each_blocks_1.length = each_value_1.length;
  			}

  			if (changed.$interval) select_option(select2, ctx.$interval);

  			if (changed.$showCharts) {
  				toggle_class(button, "closed", !ctx.$showCharts);
  			}

  			if ((changed.$showCharts) && div0_hidden_value !== (div0_hidden_value = !ctx.$showCharts)) {
  				div0.hidden = div0_hidden_value;
  			}

  			if (changed.$activeChart || changed.charts) {
  				each_value = ctx.charts;

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context$2(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  					} else {
  						each_blocks[i] = create_each_block$2(child_ctx);
  						each_blocks[i].c();
  						each_blocks[i].m(div1, null);
  					}
  				}

  				for (; i < each_blocks.length; i += 1) {
  					each_blocks[i].d(1);
  				}
  				each_blocks.length = each_value.length;
  			}

  			if ((changed.$showCharts) && div1_hidden_value !== (div1_hidden_value = !ctx.$showCharts)) {
  				div1.hidden = div1_hidden_value;
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(form);
  			}

  			destroy_each(each_blocks_4, detaching);

  			destroy_each(each_blocks_3, detaching);

  			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input0), 1);
  			ctx.$$binding_groups[0].splice(ctx.$$binding_groups[0].indexOf(input1), 1);

  			destroy_each(each_blocks_2, detaching);

  			destroy_each(each_blocks_1, detaching);

  			if (detaching) {
  				detach(t11);
  				detach(div0);
  			}

  			ctx.svg_1_binding(null);
  			div0_resize_listener.cancel();

  			if (detaching) {
  				detach(t12);
  				detach(div1);
  			}

  			destroy_each(each_blocks, detaching);

  			run_all(dispose);
  		}
  	};
  }

  // (93:6) {#each legend.domain.sort() as item}
  function create_each_block_4(ctx) {
  	var span, i, t0, t1_value = ctx.item + "", t1, t2;

  	return {
  		c() {
  			span = element("span");
  			i = element("i");
  			t0 = space();
  			t1 = text(t1_value);
  			t2 = space();
  			attr(i, "class", "color");
  			set_style(i, "background-color", ctx.legend.scale(ctx.item));
  			attr(span, "class", "legend");
  		},

  		m(target, anchor) {
  			insert(target, span, anchor);
  			append(span, i);
  			append(span, t0);
  			append(span, t1);
  			append(span, t2);
  		},

  		p(changed, ctx) {
  			if (changed.legend) {
  				set_style(i, "background-color", ctx.legend.scale(ctx.item));
  			}

  			if ((changed.legend) && t1_value !== (t1_value = ctx.item + "")) {
  				set_data(t1, t1_value);
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(span);
  			}
  		}
  	};
  }

  // (104:6) {#each currencies as currency}
  function create_each_block_3(ctx) {
  	var option, t_value = ctx.currency + "", t, option_value_value;

  	return {
  		c() {
  			option = element("option");
  			t = text(t_value);
  			option.__value = option_value_value = ctx.currency;
  			option.value = option.__value;
  		},

  		m(target, anchor) {
  			insert(target, option, anchor);
  			append(option, t);
  		},

  		p(changed, ctx) {
  			if ((changed.currencies) && t_value !== (t_value = ctx.currency + "")) {
  				set_data(t, t_value);
  			}

  			if ((changed.currencies) && option_value_value !== (option_value_value = ctx.currency)) {
  				option.__value = option_value_value;
  			}

  			option.value = option.__value;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(option);
  			}
  		}
  	};
  }

  // (119:6) {#each conversions as [conversion, conversionName]}
  function create_each_block_2$1(ctx) {
  	var option, t_value = ctx.conversionName + "", t;

  	return {
  		c() {
  			option = element("option");
  			t = text(t_value);
  			option.__value = ctx.conversion;
  			option.value = option.__value;
  		},

  		m(target, anchor) {
  			insert(target, option, anchor);
  			append(option, t);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(option);
  			}
  		}
  	};
  }

  // (124:6) {#each Object.keys(intervals) as key}
  function create_each_block_1$1(ctx) {
  	var option, t_value = ctx.intervals[ctx.key] + "", t;

  	return {
  		c() {
  			option = element("option");
  			t = text(t_value);
  			option.__value = ctx.key;
  			option.value = option.__value;
  		},

  		m(target, anchor) {
  			insert(target, option, anchor);
  			append(option, t);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(option);
  			}
  		}
  	};
  }

  // (141:4) {#each charts as chart, index}
  function create_each_block$2(ctx) {
  	var label, t0_value = ctx.chart.name + "", t0, t1, dispose;

  	function click_handler_1() {
  		return ctx.click_handler_1(ctx);
  	}

  	return {
  		c() {
  			label = element("label");
  			t0 = text(t0_value);
  			t1 = space();
  			toggle_class(label, "selected", ctx.index === ctx.$activeChart.index);
  			dispose = listen(label, "click", click_handler_1);
  		},

  		m(target, anchor) {
  			insert(target, label, anchor);
  			append(label, t0);
  			append(label, t1);
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			if ((changed.charts) && t0_value !== (t0_value = ctx.chart.name + "")) {
  				set_data(t0, t0_value);
  			}

  			if (changed.$activeChart) {
  				toggle_class(label, "selected", ctx.index === ctx.$activeChart.index);
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(label);
  			}

  			dispose();
  		}
  	};
  }

  function create_fragment$3(ctx) {
  	var if_block_anchor;

  	var if_block = (ctx.charts.length) && create_if_block$1(ctx);

  	return {
  		c() {
  			if (if_block) if_block.c();
  			if_block_anchor = empty();
  		},

  		m(target, anchor) {
  			if (if_block) if_block.m(target, anchor);
  			insert(target, if_block_anchor, anchor);
  		},

  		p(changed, ctx) {
  			if (ctx.charts.length) {
  				if (if_block) {
  					if_block.p(changed, ctx);
  				} else {
  					if_block = create_if_block$1(ctx);
  					if_block.c();
  					if_block.m(if_block_anchor.parentNode, if_block_anchor);
  				}
  			} else if (if_block) {
  				if_block.d(1);
  				if_block = null;
  			}
  		},

  		i: noop,
  		o: noop,

  		d(detaching) {
  			if (if_block) if_block.d(detaching);

  			if (detaching) {
  				detach(if_block_anchor);
  			}
  		}
  	};
  }

  function instance$3($$self, $$props, $$invalidate) {
  	let $activeChart, $chartMode, $chartCurrency, $showCharts, $conversion, $interval;

  	component_subscribe($$self, activeChart, $$value => { $activeChart = $$value; $$invalidate('$activeChart', $activeChart); });
  	component_subscribe($$self, chartMode, $$value => { $chartMode = $$value; $$invalidate('$chartMode', $chartMode); });
  	component_subscribe($$self, chartCurrency, $$value => { $chartCurrency = $$value; $$invalidate('$chartCurrency', $chartCurrency); });
  	component_subscribe($$self, showCharts, $$value => { $showCharts = $$value; $$invalidate('$showCharts', $showCharts); });
  	component_subscribe($$self, conversion, $$value => { $conversion = $$value; $$invalidate('$conversion', $conversion); });
  	component_subscribe($$self, interval, $$value => { $interval = $$value; $$invalidate('$interval', $interval); });

  	

    let charts = [];
    let svg;

    let renderedChart;
    let chart;
    let hasCurrencySetting;
    let chartWidth;

    const conversions = [
      ["at_cost", _("At Cost")],
      ["at_value", _("At Market Value")],
      ["units", _("Units")],
      ...favaAPI.options.operating_currency
        .sort()
        .map(currency => [currency, `Converted to ${currency}`]),
      ...favaAPI.options.commodities
        .sort()
        .filter(
          c => !favaAPI.options.operating_currency.includes(c) && c.length <= 3
        )
        .map(currency => [currency, `Converted to ${currency}`]),
    ];
    // TODO  _('Converted to %(currency)s', currency=currency)

    async function selectChart(index) {
      chart = charts[index];
      set_store_value(activeChart, $activeChart = {
        name: chart.name,
        index,
      });
      await tick();
      $$invalidate('renderedChart', renderedChart = chart
        .renderer(svg)
        .setWidth(chartWidth)
        .set("mode", $chartMode)
        .set("currency", $chartCurrency)
        .draw(chart.data));
      $$invalidate('hasCurrencySetting', hasCurrencySetting = renderedChart.has_currency_setting);
    }

    onMount(() => {
      $$invalidate('charts', charts = parseChartData());
      if (charts.length) {
        const active = charts[$activeChart.index];
        if (active && active.name === $activeChart.name) {
          selectChart($activeChart.index);
        } else {
          selectChart(0);
        }
      }
    });

    const intervals = {
      year: _("Yearly"),
      quarter: _("Quarterly"),
      month: _("Monthly"),
      week: _("Weekly"),
      day: _("Daily"),
    };

  	const $$binding_groups = [[]];

  	function select0_change_handler() {
  		chartCurrency.set(select_value(this));
  		$$invalidate('currencies', currencies), $$invalidate('renderedChart', renderedChart);
  	}

  	function input0_change_handler() {
  		chartMode.set(this.__value);
  	}

  	function input1_change_handler() {
  		chartMode.set(this.__value);
  	}

  	function select1_change_handler() {
  		conversion.set(select_value(this));
  		$$invalidate('conversions', conversions);
  	}

  	function select2_change_handler() {
  		interval.set(select_value(this));
  		$$invalidate('intervals', intervals);
  	}

  	const click_handler = () => {
  	        showCharts.update(v => !v);
  	      };

  	function svg_1_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('svg', svg = $$value);
  		});
  	}

  	function div0_resize_handler() {
  		chartWidth = this.clientWidth;
  		$$invalidate('chartWidth', chartWidth);
  	}

  	const click_handler_1 = ({ index }) => selectChart(index);

  	let legend, currencies, hasModeSetting;

  	$$self.$$.update = ($$dirty = { renderedChart: 1, chartWidth: 1, $chartMode: 1, $chartCurrency: 1 }) => {
  		if ($$dirty.renderedChart || $$dirty.chartWidth || $$dirty.$chartMode || $$dirty.$chartCurrency) { if (renderedChart) {
          renderedChart
            .setWidth(chartWidth)
            .set("mode", $chartMode)
            .set("currency", $chartCurrency)
            .update();
          $$invalidate('hasCurrencySetting', hasCurrencySetting = renderedChart.has_currency_setting);
        } }
  		if ($$dirty.renderedChart) { $$invalidate('legend', legend = (renderedChart && renderedChart.legend) || { domain: [] }); }
  		if ($$dirty.renderedChart) { $$invalidate('currencies', currencies = (renderedChart && renderedChart.currencies) || []); }
  		if ($$dirty.renderedChart) { $$invalidate('hasModeSetting', hasModeSetting = renderedChart && renderedChart.has_mode_setting); }
  	};

  	return {
  		charts,
  		svg,
  		hasCurrencySetting,
  		chartWidth,
  		conversions,
  		selectChart,
  		intervals,
  		$activeChart,
  		$chartMode,
  		$chartCurrency,
  		legend,
  		currencies,
  		hasModeSetting,
  		$showCharts,
  		$conversion,
  		$interval,
  		select0_change_handler,
  		input0_change_handler,
  		input1_change_handler,
  		select1_change_handler,
  		select2_change_handler,
  		click_handler,
  		svg_1_binding,
  		div0_resize_handler,
  		click_handler_1,
  		$$binding_groups
  	};
  }

  class ChartSwitcher extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
  	}
  }

  /* javascript/FilterForm.svelte generated by Svelte v3.12.1 */
  const { Object: Object_1$1 } = globals;

  function get_each_context$3(ctx, list, i) {
  	const child_ctx = Object_1$1.create(ctx);
  	child_ctx.name = list[i].name;
  	child_ctx.placeholder = list[i].placeholder;
  	child_ctx.key = list[i].key;
  	child_ctx.suggestions = list[i].suggestions;
  	child_ctx.autocompleteOptions = list[i].autocompleteOptions;
  	return child_ctx;
  }

  // (67:2) {#each filters as { name, placeholder, key, suggestions, autocompleteOptions }}
  function create_each_block$3(ctx) {
  	var span, updating_value, t, button, current, dispose;

  	var autocompleteinput_spread_levels = [
  		{ placeholder: ctx.placeholder },
  		{ suggestions: ctx.suggestions },
  		{ setSize: true },
  		ctx.autocompleteOptions
  	];

  	function autocompleteinput_value_binding(value) {
  		ctx.autocompleteinput_value_binding.call(null, value, ctx);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let autocompleteinput_props = {};
  	for (var i = 0; i < autocompleteinput_spread_levels.length; i += 1) {
  		autocompleteinput_props = assign(autocompleteinput_props, autocompleteinput_spread_levels[i]);
  	}
  	if (ctx.values[ctx.name] !== void 0) {
  		autocompleteinput_props.value = ctx.values[ctx.name];
  	}
  	var autocompleteinput = new AutocompleteInput({ props: autocompleteinput_props });

  	binding_callbacks.push(() => bind(autocompleteinput, 'value', autocompleteinput_value_binding));
  	autocompleteinput.$on("select", ctx.submit);

  	function click_handler() {
  		return ctx.click_handler(ctx);
  	}

  	return {
  		c() {
  			span = element("span");
  			autocompleteinput.$$.fragment.c();
  			t = space();
  			button = element("button");
  			button.textContent = "×";
  			attr(button, "type", "button");
  			attr(button, "tabindex", "-1");
  			attr(button, "class", "close muted round");
  			toggle_class(span, "empty", !ctx.values[ctx.name]);
  			dispose = listen(button, "click", click_handler);
  		},

  		m(target, anchor) {
  			insert(target, span, anchor);
  			mount_component(autocompleteinput, span, null);
  			append(span, t);
  			append(span, button);
  			current = true;
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			var autocompleteinput_changes = (changed.filters) ? get_spread_update(autocompleteinput_spread_levels, [
  									autocompleteinput_spread_levels[0],
  			autocompleteinput_spread_levels[1],
  			autocompleteinput_spread_levels[2],
  			get_spread_object(ctx.autocompleteOptions)
  								]) : {};
  			if (!updating_value && changed.values || changed.filters) {
  				autocompleteinput_changes.value = ctx.values[ctx.name];
  			}
  			autocompleteinput.$set(autocompleteinput_changes);

  			if ((changed.values || changed.filters)) {
  				toggle_class(span, "empty", !ctx.values[ctx.name]);
  			}
  		},

  		i(local) {
  			if (current) return;
  			transition_in(autocompleteinput.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(autocompleteinput.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(span);
  			}

  			destroy_component(autocompleteinput);

  			dispose();
  		}
  	};
  }

  function create_fragment$4(ctx) {
  	var form, t, button, current, dispose;

  	let each_value = ctx.filters;

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
  	}

  	const out = i => transition_out(each_blocks[i], 1, 1, () => {
  		each_blocks[i] = null;
  	});

  	return {
  		c() {
  			form = element("form");

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			t = space();
  			button = element("button");
  			attr(button, "type", "submit");
  			attr(form, "id", "filter-form");
  			attr(form, "class", "filter-form");
  			dispose = listen(form, "submit", prevent_default(ctx.submit));
  		},

  		m(target, anchor) {
  			insert(target, form, anchor);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(form, null);
  			}

  			append(form, t);
  			append(form, button);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed.values || changed.filters) {
  				each_value = ctx.filters;

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context$3(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  						transition_in(each_blocks[i], 1);
  					} else {
  						each_blocks[i] = create_each_block$3(child_ctx);
  						each_blocks[i].c();
  						transition_in(each_blocks[i], 1);
  						each_blocks[i].m(form, t);
  					}
  				}

  				group_outros();
  				for (i = each_value.length; i < each_blocks.length; i += 1) {
  					out(i);
  				}
  				check_outros();
  			}
  		},

  		i(local) {
  			if (current) return;
  			for (let i = 0; i < each_value.length; i += 1) {
  				transition_in(each_blocks[i]);
  			}

  			current = true;
  		},

  		o(local) {
  			each_blocks = each_blocks.filter(Boolean);
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				transition_out(each_blocks[i]);
  			}

  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(form);
  			}

  			destroy_each(each_blocks, detaching);

  			dispose();
  		}
  	};
  }

  function clear(name) {
    filters.update(fs => {
      fs[name] = "";
      return fs;
    });
  }

  function instance$4($$self, $$props, $$invalidate) {
  	

    const filters$1 = [
      {
        name: "time",
        placeholder: _("Time"),
        key: "f t",
        suggestions: favaAPI.years,
      },
      {
        name: "account",
        placeholder: _("Account"),
        key: "f a",
        suggestions: favaAPI.accounts,
      },
      {
        name: "filter",
        placeholder: _("Filter by tag, payee, ..."),
        key: "f f",
        suggestions: [
          ...favaAPI.tags.map(tag => `#${tag}`),
          ...favaAPI.links.map(link => `^${link}`),
          ...favaAPI.payees.map(payee => `payee:"${payee}"`),
        ],
        autocompleteOptions: {
          valueExtractor(value, input) {
            const [ret] = value.slice(0, input.selectionStart).match(/\S*$/);
            return ret;
          },
          valueSelector(value, input) {
            const [search] = input.value
              .slice(0, input.selectionStart)
              .match(/\S*$/);
            return `${input.value.slice(
            0,
            input.selectionStart - search.length
          )}${value}${input.value.slice(input.selectionStart)}`;
          },
        },
      },
    ];

    let values;
    filters.subscribe(fs => {
      $$invalidate('values', values = { ...fs });
    });

    function submit() {
      filters.update(fs => {
        Object.assign(fs, values);
        return fs;
      });
    }

  	function autocompleteinput_value_binding(value, { name }) {
  		values[name] = value;
  		$$invalidate('values', values);
  	}

  	const click_handler = ({ name }) => clear(name);

  	return {
  		filters: filters$1,
  		values,
  		submit,
  		autocompleteinput_value_binding,
  		click_handler
  	};
  }

  class FilterForm extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
  	}
  }

  class Posting {
      constructor() {
          this.account = "";
          this.amount = "";
      }
  }
  class Entry {
      constructor(type) {
          this.type = type;
          this.meta = {};
          this.date = new Date().toISOString().slice(0, 10);
      }
  }
  class Balance extends Entry {
      constructor() {
          super("Balance");
          this.account = "";
      }
  }
  class Transaction extends Entry {
      constructor() {
          super("Transaction");
          this.flag = "*";
          this.payee = "";
          this.narration = "";
          this.postings = [new Posting(), new Posting()];
      }
  }
  async function saveEntries(entries) {
      if (!entries.length)
          return;
      try {
          const data = await putAPI("add_entries", { entries });
          router.reload();
          notify(data);
      }
      catch (error) {
          notify(`Saving failed: ${error}`, "error");
          throw error;
      }
  }

  /* javascript/modals/ModalBase.svelte generated by Svelte v3.12.1 */

  function create_fragment$5(ctx) {
  	var div2, div0, t0, div1, button, t2, current, dispose;

  	const default_slot_template = ctx.$$slots.default;
  	const default_slot = create_slot(default_slot_template, ctx, null);

  	return {
  		c() {
  			div2 = element("div");
  			div0 = element("div");
  			t0 = space();
  			div1 = element("div");
  			button = element("button");
  			button.textContent = "x";
  			t2 = space();

  			if (default_slot) default_slot.c();
  			attr(div0, "class", "overlay-background");
  			attr(button, "type", "button");
  			attr(button, "class", "muted close-overlay");

  			attr(div1, "class", "overlay-content");
  			attr(div2, "class", "overlay");
  			toggle_class(div2, "shown", ctx.shown);

  			dispose = [
  				listen(div0, "click", ctx.closeHandler),
  				listen(button, "click", ctx.closeHandler)
  			];
  		},

  		l(nodes) {
  			if (default_slot) default_slot.l(div1_nodes);
  		},

  		m(target, anchor) {
  			insert(target, div2, anchor);
  			append(div2, div0);
  			append(div2, t0);
  			append(div2, div1);
  			append(div1, button);
  			append(div1, t2);

  			if (default_slot) {
  				default_slot.m(div1, null);
  			}

  			current = true;
  		},

  		p(changed, ctx) {
  			if (default_slot && default_slot.p && changed.$$scope) {
  				default_slot.p(
  					get_slot_changes(default_slot_template, ctx, changed, null),
  					get_slot_context(default_slot_template, ctx, null)
  				);
  			}

  			if (changed.shown) {
  				toggle_class(div2, "shown", ctx.shown);
  			}
  		},

  		i(local) {
  			if (current) return;
  			transition_in(default_slot, local);
  			current = true;
  		},

  		o(local) {
  			transition_out(default_slot, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div2);
  			}

  			if (default_slot) default_slot.d(detaching);
  			run_all(dispose);
  		}
  	};
  }

  function instance$5($$self, $$props, $$invalidate) {
  	let { shown = false, closeHandler = closeOverlay } = $$props;

  	let { $$slots = {}, $$scope } = $$props;

  	$$self.$set = $$props => {
  		if ('shown' in $$props) $$invalidate('shown', shown = $$props.shown);
  		if ('closeHandler' in $$props) $$invalidate('closeHandler', closeHandler = $$props.closeHandler);
  		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
  	};

  	return { shown, closeHandler, $$slots, $$scope };
  }

  class ModalBase extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["shown", "closeHandler"]);
  	}
  }

  /* javascript/entry-forms/AddMetadataButton.svelte generated by Svelte v3.12.1 */

  function create_fragment$6(ctx) {
  	var button, t, dispose;

  	return {
  		c() {
  			button = element("button");
  			t = text("m");
  			attr(button, "class", "muted round");
  			attr(button, "type", "button");
  			attr(button, "title", _('Add metadata'));
  			dispose = listen(button, "click", ctx.addMetadata);
  		},

  		m(target, anchor) {
  			insert(target, button, anchor);
  			append(button, t);
  		},

  		p: noop,
  		i: noop,
  		o: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(button);
  			}

  			dispose();
  		}
  	};
  }

  function instance$6($$self, $$props, $$invalidate) {
  	let { meta } = $$props;

    function addMetadata() {
      $$invalidate('meta', meta[""] = "", meta);
      $$invalidate('meta', meta);
    }

  	$$self.$set = $$props => {
  		if ('meta' in $$props) $$invalidate('meta', meta = $$props.meta);
  	};

  	return { meta, addMetadata };
  }

  class AddMetadataButton extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["meta"]);
  	}
  }

  /* javascript/entry-forms/EntryMetadata.svelte generated by Svelte v3.12.1 */
  const { Object: Object_1$2 } = globals;

  function get_each_context$4(ctx, list, i) {
  	const child_ctx = Object_1$2.create(ctx);
  	child_ctx.metakey = list[i];
  	child_ctx.i = i;
  	return child_ctx;
  }

  // (55:4) {#if i === metakeys.length - 1}
  function create_if_block$2(ctx) {
  	var button, t, dispose;

  	return {
  		c() {
  			button = element("button");
  			t = text("+");
  			attr(button, "class", "muted round add-row");
  			attr(button, "type", "button");
  			attr(button, "title", _('Add metadata'));
  			dispose = listen(button, "click", ctx.addMetadata);
  		},

  		m(target, anchor) {
  			insert(target, button, anchor);
  			append(button, t);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(button);
  			}

  			dispose();
  		}
  	};
  }

  // (32:0) {#each metakeys as metakey, i}
  function create_each_block$4(ctx) {
  	var div, button, t1, input0, input0_value_value, t2, input1, t3, t4, dispose;

  	function click_handler() {
  		return ctx.click_handler(ctx);
  	}

  	function change_handler(...args) {
  		return ctx.change_handler(ctx, ...args);
  	}

  	function input1_input_handler() {
  		ctx.input1_input_handler.call(input1, ctx);
  	}

  	var if_block = (ctx.i === ctx.metakeys.length - 1) && create_if_block$2(ctx);

  	return {
  		c() {
  			div = element("div");
  			button = element("button");
  			button.textContent = "×";
  			t1 = space();
  			input0 = element("input");
  			t2 = space();
  			input1 = element("input");
  			t3 = space();
  			if (if_block) if_block.c();
  			t4 = space();
  			attr(button, "class", "muted round remove-fieldset");
  			attr(button, "type", "button");
  			attr(button, "tabindex", "-1");
  			attr(input0, "type", "text");
  			attr(input0, "class", "metadata-key");
  			attr(input0, "placeholder", _('Key'));
  			input0.value = input0_value_value = ctx.metakey;
  			input0.required = true;
  			attr(input1, "type", "text");
  			attr(input1, "class", "metadata-value");
  			attr(input1, "placeholder", _('Value'));
  			attr(div, "class", "fieldset metadata");

  			dispose = [
  				listen(button, "click", click_handler),
  				listen(input0, "change", change_handler),
  				listen(input1, "input", input1_input_handler)
  			];
  		},

  		m(target, anchor) {
  			insert(target, div, anchor);
  			append(div, button);
  			append(div, t1);
  			append(div, input0);
  			append(div, t2);
  			append(div, input1);

  			set_input_value(input1, ctx.meta[ctx.metakey]);

  			append(div, t3);
  			if (if_block) if_block.m(div, null);
  			append(div, t4);
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			if ((changed.metakeys) && input0_value_value !== (input0_value_value = ctx.metakey)) {
  				input0.value = input0_value_value;
  			}

  			if ((changed.meta || changed.metakeys) && (input1.value !== ctx.meta[ctx.metakey])) set_input_value(input1, ctx.meta[ctx.metakey]);

  			if (ctx.i === ctx.metakeys.length - 1) {
  				if (if_block) {
  					if_block.p(changed, ctx);
  				} else {
  					if_block = create_if_block$2(ctx);
  					if_block.c();
  					if_block.m(div, t4);
  				}
  			} else if (if_block) {
  				if_block.d(1);
  				if_block = null;
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div);
  			}

  			if (if_block) if_block.d();
  			run_all(dispose);
  		}
  	};
  }

  function create_fragment$7(ctx) {
  	var each_1_anchor;

  	let each_value = ctx.metakeys;

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block$4(get_each_context$4(ctx, each_value, i));
  	}

  	return {
  		c() {
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			each_1_anchor = empty();
  		},

  		m(target, anchor) {
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(target, anchor);
  			}

  			insert(target, each_1_anchor, anchor);
  		},

  		p(changed, ctx) {
  			if (changed.metakeys || changed._ || changed.meta) {
  				each_value = ctx.metakeys;

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context$4(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  					} else {
  						each_blocks[i] = create_each_block$4(child_ctx);
  						each_blocks[i].c();
  						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
  					}
  				}

  				for (; i < each_blocks.length; i += 1) {
  					each_blocks[i].d(1);
  				}
  				each_blocks.length = each_value.length;
  			}
  		},

  		i: noop,
  		o: noop,

  		d(detaching) {
  			destroy_each(each_blocks, detaching);

  			if (detaching) {
  				detach(each_1_anchor);
  			}
  		}
  	};
  }

  function instance$7($$self, $$props, $$invalidate) {
  	let { meta } = $$props;

    function removeMetadata(metakey) {
      delete meta[metakey];
      $$invalidate('meta', meta);
    }

    function updateMetakey(currentKey, newKey) {
      $$invalidate('meta', meta = Object.keys(meta).reduce((m, key) => {
        if (key === currentKey) {
          m[newKey] = meta[currentKey];
        } else {
          m[key] = meta[key];
        }
        return m;
      }, {}));
    }

    function addMetadata() {
      $$invalidate('meta', meta[""] = "", meta);
      $$invalidate('meta', meta);
    }

  	const click_handler = ({ metakey }) => removeMetadata(metakey);

  	const change_handler = ({ metakey }, event) => {
  	        updateMetakey(metakey, event.target.value);
  	      };

  	function input1_input_handler({ metakey }) {
  		meta[metakey] = this.value;
  		$$invalidate('meta', meta);
  		$$invalidate('metakeys', metakeys), $$invalidate('meta', meta);
  	}

  	$$self.$set = $$props => {
  		if ('meta' in $$props) $$invalidate('meta', meta = $$props.meta);
  	};

  	let metakeys;

  	$$self.$$.update = ($$dirty = { meta: 1 }) => {
  		if ($$dirty.meta) { $$invalidate('metakeys', metakeys = Object.keys(meta).filter(
          key => !key.startsWith("_") && key !== "filename" && key !== "lineno"
        )); }
  	};

  	return {
  		meta,
  		removeMetadata,
  		updateMetakey,
  		addMetadata,
  		metakeys,
  		click_handler,
  		change_handler,
  		input1_input_handler
  	};
  }

  class EntryMetadata extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$7, create_fragment$7, safe_not_equal, ["meta"]);
  	}
  }

  /* javascript/entry-forms/Transaction.svelte generated by Svelte v3.12.1 */
  const { Object: Object_1$3 } = globals;

  function get_each_context$5(ctx, list, i) {
  	const child_ctx = Object_1$3.create(ctx);
  	child_ctx.posting = list[i];
  	child_ctx.each_value = list;
  	child_ctx.posting_index = i;
  	return child_ctx;
  }

  // (86:2) {#each entry.postings as posting}
  function create_each_block$5(ctx) {
  	var div, button0, t1, updating_value, t2, input, t3, button1, t4, t5, current, dispose;

  	function click_handler() {
  		return ctx.click_handler(ctx);
  	}

  	function accountinput_value_binding(value) {
  		ctx.accountinput_value_binding.call(null, value, ctx);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let accountinput_props = { suggestions: ctx.suggestions };
  	if (ctx.posting.account !== void 0) {
  		accountinput_props.value = ctx.posting.account;
  	}
  	var accountinput = new AccountInput({ props: accountinput_props });

  	binding_callbacks.push(() => bind(accountinput, 'value', accountinput_value_binding));

  	function input_input_handler() {
  		ctx.input_input_handler.call(input, ctx);
  	}

  	return {
  		c() {
  			div = element("div");
  			button0 = element("button");
  			button0.textContent = "×";
  			t1 = space();
  			accountinput.$$.fragment.c();
  			t2 = space();
  			input = element("input");
  			t3 = space();
  			button1 = element("button");
  			t4 = text("+");
  			t5 = space();
  			attr(button0, "class", "muted round remove-fieldset");
  			attr(button0, "type", "button");
  			attr(button0, "tabindex", "-1");
  			attr(input, "type", "text");
  			attr(input, "class", "amount");
  			attr(input, "placeholder", _('Amount'));
  			attr(button1, "class", "muted round add-row");
  			attr(button1, "type", "button");
  			attr(button1, "title", _('Add posting'));
  			attr(div, "class", "fieldset posting");

  			dispose = [
  				listen(button0, "click", click_handler),
  				listen(input, "input", input_input_handler),
  				listen(button1, "click", ctx.addPosting)
  			];
  		},

  		m(target, anchor) {
  			insert(target, div, anchor);
  			append(div, button0);
  			append(div, t1);
  			mount_component(accountinput, div, null);
  			append(div, t2);
  			append(div, input);

  			set_input_value(input, ctx.posting.amount);

  			append(div, t3);
  			append(div, button1);
  			append(button1, t4);
  			append(div, t5);
  			ctx.div_binding(div);
  			current = true;
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			var accountinput_changes = {};
  			if (changed.suggestions) accountinput_changes.suggestions = ctx.suggestions;
  			if (!updating_value && changed.entry) {
  				accountinput_changes.value = ctx.posting.account;
  			}
  			accountinput.$set(accountinput_changes);

  			if (changed.entry && (input.value !== ctx.posting.amount)) set_input_value(input, ctx.posting.amount);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(accountinput.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(accountinput.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div);
  			}

  			destroy_component(accountinput);

  			ctx.div_binding(null);
  			run_all(dispose);
  		}
  	};
  }

  function create_fragment$8(ctx) {
  	var div1, div0, input0, t0, input1, t1, label0, t2_value = _('Payee') + "", t2, t3, t4, updating_value, t5, label1, t6_value = _('Narration') + "", t6, t7, t8, input2, t9, updating_meta, t10, button, t11, t12, updating_meta_1, t13, current, dispose;

  	function autocompleteinput_value_binding(value) {
  		ctx.autocompleteinput_value_binding.call(null, value);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let autocompleteinput_props = {
  		className: "payee",
  		placeholder: _('Payee'),
  		suggestions: favaAPI.payees
  	};
  	if (ctx.entry.payee !== void 0) {
  		autocompleteinput_props.value = ctx.entry.payee;
  	}
  	var autocompleteinput = new AutocompleteInput({ props: autocompleteinput_props });

  	ctx.autocompleteinput_binding(autocompleteinput);
  	binding_callbacks.push(() => bind(autocompleteinput, 'value', autocompleteinput_value_binding));
  	autocompleteinput.$on("select", ctx.autocompleteSelectPayee);

  	function addmetadatabutton_meta_binding(value_1) {
  		ctx.addmetadatabutton_meta_binding.call(null, value_1);
  		updating_meta = true;
  		add_flush_callback(() => updating_meta = false);
  	}

  	let addmetadatabutton_props = {};
  	if (ctx.entry.meta !== void 0) {
  		addmetadatabutton_props.meta = ctx.entry.meta;
  	}
  	var addmetadatabutton = new AddMetadataButton({ props: addmetadatabutton_props });

  	binding_callbacks.push(() => bind(addmetadatabutton, 'meta', addmetadatabutton_meta_binding));

  	function entrymetadata_meta_binding(value_2) {
  		ctx.entrymetadata_meta_binding.call(null, value_2);
  		updating_meta_1 = true;
  		add_flush_callback(() => updating_meta_1 = false);
  	}

  	let entrymetadata_props = {};
  	if (ctx.entry.meta !== void 0) {
  		entrymetadata_props.meta = ctx.entry.meta;
  	}
  	var entrymetadata = new EntryMetadata({ props: entrymetadata_props });

  	binding_callbacks.push(() => bind(entrymetadata, 'meta', entrymetadata_meta_binding));

  	let each_value = ctx.entry.postings;

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block$5(get_each_context$5(ctx, each_value, i));
  	}

  	const out = i => transition_out(each_blocks[i], 1, 1, () => {
  		each_blocks[i] = null;
  	});

  	return {
  		c() {
  			div1 = element("div");
  			div0 = element("div");
  			input0 = element("input");
  			t0 = space();
  			input1 = element("input");
  			t1 = space();
  			label0 = element("label");
  			t2 = text(t2_value);
  			t3 = text(":");
  			t4 = space();
  			autocompleteinput.$$.fragment.c();
  			t5 = space();
  			label1 = element("label");
  			t6 = text(t6_value);
  			t7 = text(":");
  			t8 = space();
  			input2 = element("input");
  			t9 = space();
  			addmetadatabutton.$$.fragment.c();
  			t10 = space();
  			button = element("button");
  			t11 = text("p");
  			t12 = space();
  			entrymetadata.$$.fragment.c();
  			t13 = space();

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}
  			attr(input0, "type", "date");
  			input0.required = true;
  			attr(input1, "type", "text");
  			attr(input1, "name", "flag");
  			input1.required = true;
  			attr(label0, "for", "payee");
  			attr(label1, "for", "payee");
  			attr(input2, "type", "text");
  			attr(input2, "name", "narration");
  			attr(input2, "placeholder", _('Narration'));
  			attr(button, "class", "muted round");
  			attr(button, "type", "button");
  			attr(button, "title", _('Add posting'));
  			attr(button, "tabindex", "-1");
  			attr(div0, "class", "fieldset");
  			attr(div1, "class", "entry-form transaction");

  			dispose = [
  				listen(input0, "input", ctx.input0_input_handler),
  				listen(input1, "input", ctx.input1_input_handler),
  				listen(input2, "input", ctx.input2_input_handler),
  				listen(button, "click", ctx.addPosting)
  			];
  		},

  		m(target, anchor) {
  			insert(target, div1, anchor);
  			append(div1, div0);
  			append(div0, input0);

  			set_input_value(input0, ctx.entry.date);

  			append(div0, t0);
  			append(div0, input1);

  			set_input_value(input1, ctx.entry.flag);

  			append(div0, t1);
  			append(div0, label0);
  			append(label0, t2);
  			append(label0, t3);
  			append(div0, t4);
  			mount_component(autocompleteinput, div0, null);
  			append(div0, t5);
  			append(div0, label1);
  			append(label1, t6);
  			append(label1, t7);
  			append(div0, t8);
  			append(div0, input2);

  			set_input_value(input2, ctx.entry.narration);

  			append(div0, t9);
  			mount_component(addmetadatabutton, div0, null);
  			append(div0, t10);
  			append(div0, button);
  			append(button, t11);
  			append(div1, t12);
  			mount_component(entrymetadata, div1, null);
  			append(div1, t13);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(div1, null);
  			}

  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed.entry) set_input_value(input0, ctx.entry.date);
  			if (changed.entry && (input1.value !== ctx.entry.flag)) set_input_value(input1, ctx.entry.flag);

  			var autocompleteinput_changes = {};
  			if (!updating_value && changed.entry) {
  				autocompleteinput_changes.value = ctx.entry.payee;
  			}
  			autocompleteinput.$set(autocompleteinput_changes);

  			if (changed.entry && (input2.value !== ctx.entry.narration)) set_input_value(input2, ctx.entry.narration);

  			var addmetadatabutton_changes = {};
  			if (!updating_meta && changed.entry) {
  				addmetadatabutton_changes.meta = ctx.entry.meta;
  			}
  			addmetadatabutton.$set(addmetadatabutton_changes);

  			var entrymetadata_changes = {};
  			if (!updating_meta_1 && changed.entry) {
  				entrymetadata_changes.meta = ctx.entry.meta;
  			}
  			entrymetadata.$set(entrymetadata_changes);

  			if (changed.postingRow || changed._ || changed.entry || changed.suggestions) {
  				each_value = ctx.entry.postings;

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context$5(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  						transition_in(each_blocks[i], 1);
  					} else {
  						each_blocks[i] = create_each_block$5(child_ctx);
  						each_blocks[i].c();
  						transition_in(each_blocks[i], 1);
  						each_blocks[i].m(div1, null);
  					}
  				}

  				group_outros();
  				for (i = each_value.length; i < each_blocks.length; i += 1) {
  					out(i);
  				}
  				check_outros();
  			}
  		},

  		i(local) {
  			if (current) return;
  			transition_in(autocompleteinput.$$.fragment, local);

  			transition_in(addmetadatabutton.$$.fragment, local);

  			transition_in(entrymetadata.$$.fragment, local);

  			for (let i = 0; i < each_value.length; i += 1) {
  				transition_in(each_blocks[i]);
  			}

  			current = true;
  		},

  		o(local) {
  			transition_out(autocompleteinput.$$.fragment, local);
  			transition_out(addmetadatabutton.$$.fragment, local);
  			transition_out(entrymetadata.$$.fragment, local);

  			each_blocks = each_blocks.filter(Boolean);
  			for (let i = 0; i < each_blocks.length; i += 1) {
  				transition_out(each_blocks[i]);
  			}

  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div1);
  			}

  			ctx.autocompleteinput_binding(null);

  			destroy_component(autocompleteinput);

  			destroy_component(addmetadatabutton);

  			destroy_component(entrymetadata);

  			destroy_each(each_blocks, detaching);

  			run_all(dispose);
  		}
  	};
  }

  const accountCompletionCache = {};

  function instance$8($$self, $$props, $$invalidate) {
  	

    let { entry } = $$props;
    let focusInput;
    let suggestions;
    let postingRow;

    function focus() {
      focusInput.focus();
    }

    function removePosting(posting) {
      $$invalidate('entry', entry.postings = entry.postings.filter(p => p !== posting), entry);
    }

    async function addPosting() {
      $$invalidate('entry', entry.postings = entry.postings.concat(new Posting()), entry);
      await tick();
      postingRow.querySelector("input").focus();
    }

    // Autofill complete transactions.
    function autocompleteSelectPayee() {
      if (entry.narration || !entry.postings.every(p => !p.account)) return;
      fetchAPI("payee_transaction", { payee: entry.payee }).then(data => {
        $$invalidate('entry', entry = Object.assign(new Transaction(), data, { date: entry.date }));
      });
    }

  	function input0_input_handler() {
  		entry.date = this.value;
  		$$invalidate('entry', entry);
  	}

  	function input1_input_handler() {
  		entry.flag = this.value;
  		$$invalidate('entry', entry);
  	}

  	function autocompleteinput_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('focusInput', focusInput = $$value);
  		});
  	}

  	function autocompleteinput_value_binding(value) {
  		entry.payee = value;
  		$$invalidate('entry', entry);
  	}

  	function input2_input_handler() {
  		entry.narration = this.value;
  		$$invalidate('entry', entry);
  	}

  	function addmetadatabutton_meta_binding(value_1) {
  		entry.meta = value_1;
  		$$invalidate('entry', entry);
  	}

  	function entrymetadata_meta_binding(value_2) {
  		entry.meta = value_2;
  		$$invalidate('entry', entry);
  	}

  	const click_handler = ({ posting }) => removePosting(posting);

  	function accountinput_value_binding(value, { posting }) {
  		posting.account = value;
  		$$invalidate('entry', entry);
  	}

  	function input_input_handler({ posting, each_value, posting_index }) {
  		each_value[posting_index].amount = this.value;
  		$$invalidate('entry', entry);
  	}

  	function div_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('postingRow', postingRow = $$value);
  		});
  	}

  	$$self.$set = $$props => {
  		if ('entry' in $$props) $$invalidate('entry', entry = $$props.entry);
  	};

  	$$self.$$.update = ($$dirty = { entry: 1 }) => {
  		if ($$dirty.entry) { if (entry.payee) {
          const { payee } = entry;
          if (favaAPI.payees.includes(payee)) {
            if (!accountCompletionCache[payee]) {
              accountCompletionCache[payee] = fetchAPI("payee_accounts", { payee });
            }
            accountCompletionCache[payee].then(s => {
              $$invalidate('suggestions', suggestions = s);
            });
          }
        } }
  	};

  	return {
  		entry,
  		focusInput,
  		suggestions,
  		postingRow,
  		focus,
  		removePosting,
  		addPosting,
  		autocompleteSelectPayee,
  		input0_input_handler,
  		input1_input_handler,
  		autocompleteinput_binding,
  		autocompleteinput_value_binding,
  		input2_input_handler,
  		addmetadatabutton_meta_binding,
  		entrymetadata_meta_binding,
  		click_handler,
  		accountinput_value_binding,
  		input_input_handler,
  		div_binding
  	};
  }

  class Transaction_1 extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$8, create_fragment$8, safe_not_equal, ["entry", "focus"]);
  	}

  	get focus() {
  		return this.$$.ctx.focus;
  	}
  }

  /* javascript/entry-forms/Balance.svelte generated by Svelte v3.12.1 */

  function create_fragment$9(ctx) {
  	var div1, div0, input0, t0, h4, t1_value = _('Balance') + "", t1, t2, updating_value, t3, input1, t4, updating_value_1, t5, updating_meta, t6, updating_meta_1, current, dispose;

  	function accountinput_value_binding(value) {
  		ctx.accountinput_value_binding.call(null, value);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let accountinput_props = {};
  	if (ctx.entry.account !== void 0) {
  		accountinput_props.value = ctx.entry.account;
  	}
  	var accountinput = new AccountInput({ props: accountinput_props });

  	binding_callbacks.push(() => bind(accountinput, 'value', accountinput_value_binding));

  	function autocompleteinput_value_binding(value_1) {
  		ctx.autocompleteinput_value_binding.call(null, value_1);
  		updating_value_1 = true;
  		add_flush_callback(() => updating_value_1 = false);
  	}

  	let autocompleteinput_props = {
  		className: "currency",
  		placeholder: _('Currency'),
  		suggestions: favaAPI.currencies
  	};
  	if (ctx.entry.amount.currency !== void 0) {
  		autocompleteinput_props.value = ctx.entry.amount.currency;
  	}
  	var autocompleteinput = new AutocompleteInput({ props: autocompleteinput_props });

  	binding_callbacks.push(() => bind(autocompleteinput, 'value', autocompleteinput_value_binding));

  	function addmetadatabutton_meta_binding(value_2) {
  		ctx.addmetadatabutton_meta_binding.call(null, value_2);
  		updating_meta = true;
  		add_flush_callback(() => updating_meta = false);
  	}

  	let addmetadatabutton_props = {};
  	if (ctx.entry.meta !== void 0) {
  		addmetadatabutton_props.meta = ctx.entry.meta;
  	}
  	var addmetadatabutton = new AddMetadataButton({ props: addmetadatabutton_props });

  	binding_callbacks.push(() => bind(addmetadatabutton, 'meta', addmetadatabutton_meta_binding));

  	function entrymetadata_meta_binding(value_3) {
  		ctx.entrymetadata_meta_binding.call(null, value_3);
  		updating_meta_1 = true;
  		add_flush_callback(() => updating_meta_1 = false);
  	}

  	let entrymetadata_props = {};
  	if (ctx.entry.meta !== void 0) {
  		entrymetadata_props.meta = ctx.entry.meta;
  	}
  	var entrymetadata = new EntryMetadata({ props: entrymetadata_props });

  	binding_callbacks.push(() => bind(entrymetadata, 'meta', entrymetadata_meta_binding));

  	return {
  		c() {
  			div1 = element("div");
  			div0 = element("div");
  			input0 = element("input");
  			t0 = space();
  			h4 = element("h4");
  			t1 = text(t1_value);
  			t2 = space();
  			accountinput.$$.fragment.c();
  			t3 = space();
  			input1 = element("input");
  			t4 = space();
  			autocompleteinput.$$.fragment.c();
  			t5 = space();
  			addmetadatabutton.$$.fragment.c();
  			t6 = space();
  			entrymetadata.$$.fragment.c();
  			attr(input0, "type", "date");
  			input0.required = true;
  			attr(input1, "type", "tel");
  			attr(input1, "class", "number");
  			attr(input1, "pattern", "-?[0-9.,]*");
  			attr(input1, "placeholder", _('Number'));
  			attr(input1, "size", "10");
  			attr(div0, "class", "fieldset");
  			attr(div1, "class", "entry-form balance");

  			dispose = [
  				listen(input0, "input", ctx.input0_input_handler),
  				listen(input1, "input", ctx.input1_input_handler)
  			];
  		},

  		m(target, anchor) {
  			insert(target, div1, anchor);
  			append(div1, div0);
  			append(div0, input0);

  			set_input_value(input0, ctx.entry.date);

  			append(div0, t0);
  			append(div0, h4);
  			append(h4, t1);
  			append(div0, t2);
  			mount_component(accountinput, div0, null);
  			append(div0, t3);
  			append(div0, input1);

  			set_input_value(input1, ctx.entry.amount.number);

  			append(div0, t4);
  			mount_component(autocompleteinput, div0, null);
  			append(div0, t5);
  			mount_component(addmetadatabutton, div0, null);
  			append(div1, t6);
  			mount_component(entrymetadata, div1, null);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed.entry) set_input_value(input0, ctx.entry.date);

  			var accountinput_changes = {};
  			if (!updating_value && changed.entry) {
  				accountinput_changes.value = ctx.entry.account;
  			}
  			accountinput.$set(accountinput_changes);

  			if (changed.entry) set_input_value(input1, ctx.entry.amount.number);

  			var autocompleteinput_changes = {};
  			if (!updating_value_1 && changed.entry) {
  				autocompleteinput_changes.value = ctx.entry.amount.currency;
  			}
  			autocompleteinput.$set(autocompleteinput_changes);

  			var addmetadatabutton_changes = {};
  			if (!updating_meta && changed.entry) {
  				addmetadatabutton_changes.meta = ctx.entry.meta;
  			}
  			addmetadatabutton.$set(addmetadatabutton_changes);

  			var entrymetadata_changes = {};
  			if (!updating_meta_1 && changed.entry) {
  				entrymetadata_changes.meta = ctx.entry.meta;
  			}
  			entrymetadata.$set(entrymetadata_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(accountinput.$$.fragment, local);

  			transition_in(autocompleteinput.$$.fragment, local);

  			transition_in(addmetadatabutton.$$.fragment, local);

  			transition_in(entrymetadata.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(accountinput.$$.fragment, local);
  			transition_out(autocompleteinput.$$.fragment, local);
  			transition_out(addmetadatabutton.$$.fragment, local);
  			transition_out(entrymetadata.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div1);
  			}

  			destroy_component(accountinput);

  			destroy_component(autocompleteinput);

  			destroy_component(addmetadatabutton);

  			destroy_component(entrymetadata);

  			run_all(dispose);
  		}
  	};
  }

  function instance$9($$self, $$props, $$invalidate) {
  	

    let { entry } = $$props;

  	function input0_input_handler() {
  		entry.date = this.value;
  		$$invalidate('entry', entry);
  	}

  	function accountinput_value_binding(value) {
  		entry.account = value;
  		$$invalidate('entry', entry);
  	}

  	function input1_input_handler() {
  		entry.amount.number = this.value;
  		$$invalidate('entry', entry);
  	}

  	function autocompleteinput_value_binding(value_1) {
  		entry.amount.currency = value_1;
  		$$invalidate('entry', entry);
  	}

  	function addmetadatabutton_meta_binding(value_2) {
  		entry.meta = value_2;
  		$$invalidate('entry', entry);
  	}

  	function entrymetadata_meta_binding(value_3) {
  		entry.meta = value_3;
  		$$invalidate('entry', entry);
  	}

  	$$self.$set = $$props => {
  		if ('entry' in $$props) $$invalidate('entry', entry = $$props.entry);
  	};

  	$$self.$$.update = ($$dirty = { entry: 1 }) => {
  		if ($$dirty.entry) { if (entry && !entry.amount) {
          $$invalidate('entry', entry.amount = {
            number: "",
            currency: "",
          }, entry);
        } }
  	};

  	return {
  		entry,
  		input0_input_handler,
  		accountinput_value_binding,
  		input1_input_handler,
  		autocompleteinput_value_binding,
  		addmetadatabutton_meta_binding,
  		entrymetadata_meta_binding
  	};
  }

  class Balance$1 extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$9, create_fragment$9, safe_not_equal, ["entry"]);
  	}
  }

  /* javascript/modals/AddEntry.svelte generated by Svelte v3.12.1 */

  function get_each_context$6(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.name = list[i][0];
  	child_ctx.Cls = list[i][1];
  	child_ctx.component = list[i][2];
  	return child_ctx;
  }

  // (49:6) {#each entryTypes as [name, Cls, component]}
  function create_each_block$6(ctx) {
  	var button, t0_value = ctx.name + "", t0, t1, dispose;

  	function click_handler() {
  		return ctx.click_handler(ctx);
  	}

  	return {
  		c() {
  			button = element("button");
  			t0 = text(t0_value);
  			t1 = space();
  			attr(button, "type", "button");
  			toggle_class(button, "muted", !(ctx.entry instanceof ctx.Cls));
  			dispose = listen(button, "click", click_handler);
  		},

  		m(target, anchor) {
  			insert(target, button, anchor);
  			append(button, t0);
  			append(button, t1);
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			if ((changed.entry || changed.entryTypes)) {
  				toggle_class(button, "muted", !(ctx.entry instanceof ctx.Cls));
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(button);
  			}

  			dispose();
  		}
  	};
  }

  // (45:0) <ModalBase {shown}>
  function create_default_slot(ctx) {
  	var form, h3, t0_value = _('Add') + "", t0, t1, t2, updating_entry, t3, div, span, t4, button0, t5_value = _('Save and add new') + "", t5, t6, button1, t7_value = _('Save') + "", t7, current, dispose;

  	let each_value = ctx.entryTypes;

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block$6(get_each_context$6(ctx, each_value, i));
  	}

  	function switch_instance_entry_binding(value) {
  		ctx.switch_instance_entry_binding.call(null, value);
  		updating_entry = true;
  		add_flush_callback(() => updating_entry = false);
  	}

  	var switch_value = ctx.svelteComponent;

  	function switch_props(ctx) {
  		let switch_instance_props = {};
  		if (ctx.entry !== void 0) {
  			switch_instance_props.entry = ctx.entry;
  		}
  		return { props: switch_instance_props };
  	}

  	if (switch_value) {
  		var switch_instance = new switch_value(switch_props(ctx));

  		ctx.switch_instance_binding(switch_instance);
  		binding_callbacks.push(() => bind(switch_instance, 'entry', switch_instance_entry_binding));
  	}

  	return {
  		c() {
  			form = element("form");
  			h3 = element("h3");
  			t0 = text(t0_value);
  			t1 = space();

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			t2 = space();
  			if (switch_instance) switch_instance.$$.fragment.c();
  			t3 = space();
  			div = element("div");
  			span = element("span");
  			t4 = space();
  			button0 = element("button");
  			t5 = text(t5_value);
  			t6 = space();
  			button1 = element("button");
  			t7 = text(t7_value);
  			attr(span, "class", "spacer");
  			attr(button0, "type", "submit");
  			attr(button0, "class", "muted");
  			attr(button1, "type", "submit");
  			attr(div, "class", "fieldset");

  			dispose = [
  				listen(button0, "click", prevent_default(ctx.submitAndNew)),
  				listen(form, "submit", prevent_default(ctx.submit))
  			];
  		},

  		m(target, anchor) {
  			insert(target, form, anchor);
  			append(form, h3);
  			append(h3, t0);
  			append(h3, t1);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(h3, null);
  			}

  			append(form, t2);

  			if (switch_instance) {
  				mount_component(switch_instance, form, null);
  			}

  			append(form, t3);
  			append(form, div);
  			append(div, span);
  			append(div, t4);
  			append(div, button0);
  			append(button0, t5);
  			append(div, t6);
  			append(div, button1);
  			append(button1, t7);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed.entry || changed.entryTypes) {
  				each_value = ctx.entryTypes;

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context$6(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  					} else {
  						each_blocks[i] = create_each_block$6(child_ctx);
  						each_blocks[i].c();
  						each_blocks[i].m(h3, null);
  					}
  				}

  				for (; i < each_blocks.length; i += 1) {
  					each_blocks[i].d(1);
  				}
  				each_blocks.length = each_value.length;
  			}

  			var switch_instance_changes = {};
  			if (!updating_entry && changed.entry) {
  				switch_instance_changes.entry = ctx.entry;
  			}

  			if (switch_value !== (switch_value = ctx.svelteComponent)) {
  				if (switch_instance) {
  					group_outros();
  					const old_component = switch_instance;
  					transition_out(old_component.$$.fragment, 1, 0, () => {
  						destroy_component(old_component, 1);
  					});
  					check_outros();
  				}

  				if (switch_value) {
  					switch_instance = new switch_value(switch_props(ctx));

  					ctx.switch_instance_binding(switch_instance);
  					binding_callbacks.push(() => bind(switch_instance, 'entry', switch_instance_entry_binding));

  					switch_instance.$$.fragment.c();
  					transition_in(switch_instance.$$.fragment, 1);
  					mount_component(switch_instance, form, t3);
  				} else {
  					switch_instance = null;
  				}
  			}

  			else if (switch_value) {
  				switch_instance.$set(switch_instance_changes);
  			}
  		},

  		i(local) {
  			if (current) return;
  			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(form);
  			}

  			destroy_each(each_blocks, detaching);

  			ctx.switch_instance_binding(null);
  			if (switch_instance) destroy_component(switch_instance);
  			run_all(dispose);
  		}
  	};
  }

  function create_fragment$a(ctx) {
  	var current;

  	var modalbase = new ModalBase({
  		props: {
  		shown: ctx.shown,
  		$$slots: { default: [create_default_slot] },
  		$$scope: { ctx }
  	}
  	});

  	return {
  		c() {
  			modalbase.$$.fragment.c();
  		},

  		m(target, anchor) {
  			mount_component(modalbase, target, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			var modalbase_changes = {};
  			if (changed.shown) modalbase_changes.shown = ctx.shown;
  			if (changed.$$scope || changed.svelteComponent || changed.entryComponent || changed.entry) modalbase_changes.$$scope = { changed, ctx };
  			modalbase.$set(modalbase_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(modalbase.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(modalbase.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			destroy_component(modalbase, detaching);
  		}
  	};
  }

  function instance$a($$self, $$props, $$invalidate) {
  	let $urlHash;

  	component_subscribe($$self, urlHash, $$value => { $urlHash = $$value; $$invalidate('$urlHash', $urlHash); });

  	

    const entryTypes = [[_("Transaction"), Transaction], [_("Balance"), Balance]];
    let entry = new Transaction();

    let entryComponent;

    async function focus() {
      await tick();
      if (entryComponent.focus) entryComponent.focus();
    }

    async function submitAndNew(event) {
      if (event.target.form.reportValidity()) {
        await saveEntries([entry]);
        $$invalidate('entry', entry = new entry.constructor());
        focus();
      }
    }

    async function submit() {
      await saveEntries([entry]);
      $$invalidate('entry', entry = new entry.constructor());
      closeOverlay();
    }

  	const click_handler = ({ Cls }) => {
  	            $$invalidate('entry', entry = new Cls());
  	          };

  	function switch_instance_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('entryComponent', entryComponent = $$value);
  		});
  	}

  	function switch_instance_entry_binding(value) {
  		entry = value;
  		$$invalidate('entry', entry);
  	}

  	let svelteComponent, shown;

  	$$self.$$.update = ($$dirty = { entry: 1, $urlHash: 1, shown: 1 }) => {
  		if ($$dirty.entry) { $$invalidate('svelteComponent', svelteComponent = {
          Transaction: Transaction_1,
          Balance: Balance$1,
        }[entry.constructor.name]); }
  		if ($$dirty.$urlHash) { $$invalidate('shown', shown = $urlHash === "add-transaction"); }
  		if ($$dirty.shown) { if (shown) focus(); }
  	};

  	return {
  		entryTypes,
  		entry,
  		entryComponent,
  		submitAndNew,
  		submit,
  		svelteComponent,
  		shown,
  		click_handler,
  		switch_instance_binding,
  		switch_instance_entry_binding
  	};
  }

  class AddEntry extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$a, create_fragment$a, safe_not_equal, []);
  	}
  }

  /* javascript/modals/Context.svelte generated by Svelte v3.12.1 */

  // (38:4) {:catch}
  function create_catch_block(ctx) {
  	var t;

  	return {
  		c() {
  			t = text("Loading entry context failed.");
  		},

  		m(target, anchor) {
  			insert(target, t, anchor);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(t);
  			}
  		}
  	};
  }

  // (36:4) {:then html}
  function create_then_block(ctx) {
  	var html_tag, raw_value = ctx.html + "";

  	return {
  		c() {
  			html_tag = new HtmlTag(raw_value, null);
  		},

  		m(target, anchor) {
  			html_tag.m(target, anchor);
  		},

  		p(changed, ctx) {
  			if ((changed.content) && raw_value !== (raw_value = ctx.html + "")) {
  				html_tag.p(raw_value);
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				html_tag.d();
  			}
  		}
  	};
  }

  // (34:20)        Loading entry context...     {:then html}
  function create_pending_block(ctx) {
  	var t;

  	return {
  		c() {
  			t = text("Loading entry context...");
  		},

  		m(target, anchor) {
  			insert(target, t, anchor);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(t);
  			}
  		}
  	};
  }

  // (32:0) <ModalBase {shown}>
  function create_default_slot$1(ctx) {
  	var div_1, promise;

  	let info = {
  		ctx,
  		current: null,
  		token: null,
  		pending: create_pending_block,
  		then: create_then_block,
  		catch: create_catch_block,
  		value: 'html',
  		error: 'null'
  	};

  	handle_promise(promise = ctx.content, info);

  	return {
  		c() {
  			div_1 = element("div");

  			info.block.c();
  			attr(div_1, "class", "content");
  		},

  		m(target, anchor) {
  			insert(target, div_1, anchor);

  			info.block.m(div_1, info.anchor = null);
  			info.mount = () => div_1;
  			info.anchor = null;

  			ctx.div_1_binding(div_1);
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			info.ctx = ctx;

  			if (('content' in changed) && promise !== (promise = ctx.content) && handle_promise(promise, info)) ; else {
  				info.block.p(changed, assign(assign({}, ctx), info.resolved));
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div_1);
  			}

  			info.block.d();
  			info.token = null;
  			info = null;

  			ctx.div_1_binding(null);
  		}
  	};
  }

  function create_fragment$b(ctx) {
  	var current;

  	var modalbase = new ModalBase({
  		props: {
  		shown: ctx.shown,
  		$$slots: { default: [create_default_slot$1] },
  		$$scope: { ctx }
  	}
  	});

  	return {
  		c() {
  			modalbase.$$.fragment.c();
  		},

  		m(target, anchor) {
  			mount_component(modalbase, target, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			var modalbase_changes = {};
  			if (changed.shown) modalbase_changes.shown = ctx.shown;
  			if (changed.$$scope || changed.div || changed.content) modalbase_changes.$$scope = { changed, ctx };
  			modalbase.$set(modalbase_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(modalbase.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(modalbase.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			destroy_component(modalbase, detaching);
  		}
  	};
  }

  function instance$b($$self, $$props, $$invalidate) {
  	let $urlHash;

  	component_subscribe($$self, urlHash, $$value => { $urlHash = $$value; $$invalidate('$urlHash', $urlHash); });

  	

    let div;

    onMount(() => {
      delegate(div, "click", ".toggle-box-header", event => {
        event.target.closest(".toggle-box").classList.toggle("toggled");
      });
    });

    afterUpdate(async () => {
      if (!content) return;
      await content;
      initSourceEditor("#source-slice-editor");
    });

  	function div_1_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('div', div = $$value);
  		});
  	}

  	let shown, entryHash, content;

  	$$self.$$.update = ($$dirty = { $urlHash: 1, shown: 1, entryHash: 1 }) => {
  		if ($$dirty.$urlHash) { $$invalidate('shown', shown = $urlHash.startsWith("context")); }
  		if ($$dirty.shown || $$dirty.$urlHash) { $$invalidate('entryHash', entryHash = shown ? $urlHash.slice(8) : ""); }
  		if ($$dirty.shown || $$dirty.entryHash) { $$invalidate('content', content = !shown
          ? ""
          : fetch(`${favaAPI.baseURL}_context/?entry_hash=${entryHash}`).then(
              handleText
            )); }
  	};

  	return { div, shown, content, div_1_binding };
  }

  class Context extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$b, create_fragment$b, safe_not_equal, []);
  	}
  }

  /* javascript/modals/DocumentUpload.svelte generated by Svelte v3.12.1 */

  function get_each_context$7(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.folder = list[i];
  	return child_ctx;
  }

  function get_each_context_1$2(ctx, list, i) {
  	const child_ctx = Object.create(ctx);
  	child_ctx.file = list[i];
  	child_ctx.each_value_1 = list;
  	child_ctx.file_index = i;
  	return child_ctx;
  }

  // (88:4) {#each files as file}
  function create_each_block_1$2(ctx) {
  	var div, input, dispose;

  	function input_input_handler() {
  		ctx.input_input_handler.call(input, ctx);
  	}

  	return {
  		c() {
  			div = element("div");
  			input = element("input");
  			attr(div, "class", "fieldset");
  			dispose = listen(input, "input", input_input_handler);
  		},

  		m(target, anchor) {
  			insert(target, div, anchor);
  			append(div, input);

  			set_input_value(input, ctx.file.name);
  		},

  		p(changed, new_ctx) {
  			ctx = new_ctx;
  			if (changed.files && (input.value !== ctx.file.name)) set_input_value(input, ctx.file.name);
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div);
  			}

  			dispose();
  		}
  	};
  }

  // (97:10) {#each folders as folder}
  function create_each_block$7(ctx) {
  	var option, t_value = ctx.folder + "", t, option_value_value;

  	return {
  		c() {
  			option = element("option");
  			t = text(t_value);
  			option.__value = option_value_value = ctx.folder;
  			option.value = option.__value;
  		},

  		m(target, anchor) {
  			insert(target, option, anchor);
  			append(option, t);
  		},

  		p(changed, ctx) {
  			if ((changed.folders) && t_value !== (t_value = ctx.folder + "")) {
  				set_data(t, t_value);
  			}

  			if ((changed.folders) && option_value_value !== (option_value_value = ctx.folder)) {
  				option.__value = option_value_value;
  			}

  			option.value = option.__value;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(option);
  			}
  		}
  	};
  }

  // (85:0) <ModalBase {shown} {closeHandler}>
  function create_default_slot$2(ctx) {
  	var form_1, h3, t0_value = _('Upload file(s)') + "", t0, t1, t2, t3, div0, label0, t4_value = _('Documents folder') + "", t4, t5, select, t6, div1, label1, t7_value = _('Account') + "", t7, t8, updating_value, t9, input, t10, button, t11_value = _('Upload') + "", t11, current, dispose;

  	let each_value_1 = ctx.files;

  	let each_blocks_1 = [];

  	for (let i = 0; i < each_value_1.length; i += 1) {
  		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
  	}

  	let each_value = ctx.folders;

  	let each_blocks = [];

  	for (let i = 0; i < each_value.length; i += 1) {
  		each_blocks[i] = create_each_block$7(get_each_context$7(ctx, each_value, i));
  	}

  	function accountinput_value_binding(value) {
  		ctx.accountinput_value_binding.call(null, value);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let accountinput_props = {};
  	if (ctx.account !== void 0) {
  		accountinput_props.value = ctx.account;
  	}
  	var accountinput = new AccountInput({ props: accountinput_props });

  	binding_callbacks.push(() => bind(accountinput, 'value', accountinput_value_binding));

  	return {
  		c() {
  			form_1 = element("form");
  			h3 = element("h3");
  			t0 = text(t0_value);
  			t1 = text(":");
  			t2 = space();

  			for (let i = 0; i < each_blocks_1.length; i += 1) {
  				each_blocks_1[i].c();
  			}

  			t3 = space();
  			div0 = element("div");
  			label0 = element("label");
  			t4 = text(t4_value);
  			t5 = text(":\n        ");
  			select = element("select");

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].c();
  			}

  			t6 = space();
  			div1 = element("div");
  			label1 = element("label");
  			t7 = text(t7_value);
  			t8 = text(":\n        ");
  			accountinput.$$.fragment.c();
  			t9 = space();
  			input = element("input");
  			t10 = space();
  			button = element("button");
  			t11 = text(t11_value);
  			attr(select, "name", "folder");
  			attr(div0, "class", "fieldset");
  			attr(input, "type", "hidden");
  			attr(input, "name", "hash");
  			input.value = ctx.hash;
  			attr(div1, "class", "fieldset");
  			attr(button, "type", "submit");
  			dispose = listen(form_1, "submit", prevent_default(ctx.submit));
  		},

  		m(target, anchor) {
  			insert(target, form_1, anchor);
  			append(form_1, h3);
  			append(h3, t0);
  			append(h3, t1);
  			append(form_1, t2);

  			for (let i = 0; i < each_blocks_1.length; i += 1) {
  				each_blocks_1[i].m(form_1, null);
  			}

  			append(form_1, t3);
  			append(form_1, div0);
  			append(div0, label0);
  			append(label0, t4);
  			append(label0, t5);
  			append(label0, select);

  			for (let i = 0; i < each_blocks.length; i += 1) {
  				each_blocks[i].m(select, null);
  			}

  			append(form_1, t6);
  			append(form_1, div1);
  			append(div1, label1);
  			append(label1, t7);
  			append(label1, t8);
  			mount_component(accountinput, label1, null);
  			append(div1, t9);
  			append(div1, input);
  			append(form_1, t10);
  			append(form_1, button);
  			append(button, t11);
  			ctx.form_1_binding(form_1);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed.files) {
  				each_value_1 = ctx.files;

  				let i;
  				for (i = 0; i < each_value_1.length; i += 1) {
  					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

  					if (each_blocks_1[i]) {
  						each_blocks_1[i].p(changed, child_ctx);
  					} else {
  						each_blocks_1[i] = create_each_block_1$2(child_ctx);
  						each_blocks_1[i].c();
  						each_blocks_1[i].m(form_1, t3);
  					}
  				}

  				for (; i < each_blocks_1.length; i += 1) {
  					each_blocks_1[i].d(1);
  				}
  				each_blocks_1.length = each_value_1.length;
  			}

  			if (changed.folders) {
  				each_value = ctx.folders;

  				let i;
  				for (i = 0; i < each_value.length; i += 1) {
  					const child_ctx = get_each_context$7(ctx, each_value, i);

  					if (each_blocks[i]) {
  						each_blocks[i].p(changed, child_ctx);
  					} else {
  						each_blocks[i] = create_each_block$7(child_ctx);
  						each_blocks[i].c();
  						each_blocks[i].m(select, null);
  					}
  				}

  				for (; i < each_blocks.length; i += 1) {
  					each_blocks[i].d(1);
  				}
  				each_blocks.length = each_value.length;
  			}

  			var accountinput_changes = {};
  			if (!updating_value && changed.account) {
  				accountinput_changes.value = ctx.account;
  			}
  			accountinput.$set(accountinput_changes);

  			if (!current || changed.hash) {
  				input.value = ctx.hash;
  			}
  		},

  		i(local) {
  			if (current) return;
  			transition_in(accountinput.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(accountinput.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(form_1);
  			}

  			destroy_each(each_blocks_1, detaching);

  			destroy_each(each_blocks, detaching);

  			destroy_component(accountinput);

  			ctx.form_1_binding(null);
  			dispose();
  		}
  	};
  }

  function create_fragment$c(ctx) {
  	var current;

  	var modalbase = new ModalBase({
  		props: {
  		shown: ctx.shown,
  		closeHandler: ctx.closeHandler,
  		$$slots: { default: [create_default_slot$2] },
  		$$scope: { ctx }
  	}
  	});

  	return {
  		c() {
  			modalbase.$$.fragment.c();
  		},

  		m(target, anchor) {
  			mount_component(modalbase, target, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			var modalbase_changes = {};
  			if (changed.shown) modalbase_changes.shown = ctx.shown;
  			if (changed.$$scope || changed.form || changed.hash || changed.account || changed.folders || changed.files) modalbase_changes.$$scope = { changed, ctx };
  			modalbase.$set(modalbase_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(modalbase.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(modalbase.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			destroy_component(modalbase, detaching);
  		}
  	};
  }

  function instance$c($$self, $$props, $$invalidate) {
  	

    let account = "";
    let hash = "";
    let files = [];
    let folders = [];
    let form;

    async function submit() {
      await Promise.all(
        files.map(({ dataTransferFile, name }) => {
          const formData = new FormData(form);
          formData.append("account", account);
          formData.append("file", dataTransferFile, name);
          return fetch(`${favaAPI.baseURL}api/add-document/`, {
            method: "PUT",
            body: formData,
          })
            .then(handleJSON)
            .then(
              response => {
                notify(response.data);
              },
              error => {
                notify(`Upload error: ${error}`, "error");
              }
            );
        })
      );
      $$invalidate('files', files = []);
      $$invalidate('account', account = "");
      $$invalidate('hash', hash = "");
      router.reload();
    }

    function handleDrop(event, target) {
      $$invalidate('folders', folders = favaAPI.options.documents);
      $$invalidate('files', files = []);

      if (!event.dataTransfer.files.length) {
        return;
      }
      if (!folders.length) {
        notify(
          _('You need to set the "documents" Beancount option for file uploads.'),
          "error"
        );
        return;
      }

      const dateAttribute = target.getAttribute("data-entry-date");
      const entryDate =
        dateAttribute || new Date().toISOString().substring(0, 10);
      $$invalidate('account', account = target.getAttribute("data-account-name"));
      $$invalidate('hash', hash = target.getAttribute("data-entry"));

      for (const dataTransferFile of event.dataTransfer.files) {
        let { name } = dataTransferFile;

        if (!/^\d{4}-\d{2}-\d{2}/.test(name)) {
          name = `${entryDate} ${name}`;
        }

        $$invalidate('files', files = files.concat({
          dataTransferFile,
          name,
        }));
      }
    }
    function closeHandler() {
      $$invalidate('shown', shown = false);
      $$invalidate('files', files = []);
    }

  	function input_input_handler({ file, each_value_1, file_index }) {
  		each_value_1[file_index].name = this.value;
  		$$invalidate('files', files);
  	}

  	function accountinput_value_binding(value) {
  		account = value;
  		$$invalidate('account', account);
  	}

  	function form_1_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('form', form = $$value);
  		});
  	}

  	let shown;

  	$$self.$$.update = ($$dirty = { files: 1 }) => {
  		if ($$dirty.files) { $$invalidate('shown', shown = files.length); }
  	};

  	return {
  		account,
  		hash,
  		files,
  		folders,
  		form,
  		submit,
  		handleDrop,
  		closeHandler,
  		shown,
  		input_input_handler,
  		accountinput_value_binding,
  		form_1_binding
  	};
  }

  class DocumentUpload extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$c, create_fragment$c, safe_not_equal, ["handleDrop"]);
  	}

  	get handleDrop() {
  		return this.$$.ctx.handleDrop;
  	}
  }

  /* javascript/modals/Export.svelte generated by Svelte v3.12.1 */

  // (17:0) <ModalBase {shown}>
  function create_default_slot$3(ctx) {
  	var div;

  	return {
  		c() {
  			div = element("div");
  		},

  		m(target, anchor) {
  			insert(target, div, anchor);
  			div.innerHTML = ctx.content;
  		},

  		p(changed, ctx) {
  			if (changed.content) {
  				div.innerHTML = ctx.content;
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div);
  			}
  		}
  	};
  }

  function create_fragment$d(ctx) {
  	var current;

  	var modalbase = new ModalBase({
  		props: {
  		shown: ctx.shown,
  		$$slots: { default: [create_default_slot$3] },
  		$$scope: { ctx }
  	}
  	});

  	return {
  		c() {
  			modalbase.$$.fragment.c();
  		},

  		m(target, anchor) {
  			mount_component(modalbase, target, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			var modalbase_changes = {};
  			if (changed.shown) modalbase_changes.shown = ctx.shown;
  			if (changed.$$scope || changed.content) modalbase_changes.$$scope = { changed, ctx };
  			modalbase.$set(modalbase_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(modalbase.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(modalbase.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			destroy_component(modalbase, detaching);
  		}
  	};
  }

  function instance$d($$self, $$props, $$invalidate) {
  	let $urlHash;

  	component_subscribe($$self, urlHash, $$value => { $urlHash = $$value; $$invalidate('$urlHash', $urlHash); });

  	

    let content = "";

    onMount(() => {
      const template = document.querySelector("#export-overlay-content");
      $$invalidate('content', content = template.innerHTML);
    });

  	let shown;

  	$$self.$$.update = ($$dirty = { $urlHash: 1 }) => {
  		if ($$dirty.$urlHash) { $$invalidate('shown', shown = $urlHash === "export"); }
  	};

  	return { content, shown };
  }

  class Export extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$d, create_fragment$d, safe_not_equal, []);
  	}
  }

  /* javascript/entry-forms/Note.svelte generated by Svelte v3.12.1 */

  function create_fragment$e(ctx) {
  	var div2, div0, input, t0, h4, t1_value = _('Note') + "", t1, t2, updating_value, t3, updating_meta, t4, div1, textarea, t5, updating_meta_1, current, dispose;

  	function accountinput_value_binding(value) {
  		ctx.accountinput_value_binding.call(null, value);
  		updating_value = true;
  		add_flush_callback(() => updating_value = false);
  	}

  	let accountinput_props = {};
  	if (ctx.entry.account !== void 0) {
  		accountinput_props.value = ctx.entry.account;
  	}
  	var accountinput = new AccountInput({ props: accountinput_props });

  	binding_callbacks.push(() => bind(accountinput, 'value', accountinput_value_binding));

  	function addmetadatabutton_meta_binding(value_1) {
  		ctx.addmetadatabutton_meta_binding.call(null, value_1);
  		updating_meta = true;
  		add_flush_callback(() => updating_meta = false);
  	}

  	let addmetadatabutton_props = {};
  	if (ctx.entry.meta !== void 0) {
  		addmetadatabutton_props.meta = ctx.entry.meta;
  	}
  	var addmetadatabutton = new AddMetadataButton({ props: addmetadatabutton_props });

  	binding_callbacks.push(() => bind(addmetadatabutton, 'meta', addmetadatabutton_meta_binding));

  	function entrymetadata_meta_binding(value_2) {
  		ctx.entrymetadata_meta_binding.call(null, value_2);
  		updating_meta_1 = true;
  		add_flush_callback(() => updating_meta_1 = false);
  	}

  	let entrymetadata_props = {};
  	if (ctx.entry.meta !== void 0) {
  		entrymetadata_props.meta = ctx.entry.meta;
  	}
  	var entrymetadata = new EntryMetadata({ props: entrymetadata_props });

  	binding_callbacks.push(() => bind(entrymetadata, 'meta', entrymetadata_meta_binding));

  	return {
  		c() {
  			div2 = element("div");
  			div0 = element("div");
  			input = element("input");
  			t0 = space();
  			h4 = element("h4");
  			t1 = text(t1_value);
  			t2 = space();
  			accountinput.$$.fragment.c();
  			t3 = space();
  			addmetadatabutton.$$.fragment.c();
  			t4 = space();
  			div1 = element("div");
  			textarea = element("textarea");
  			t5 = space();
  			entrymetadata.$$.fragment.c();
  			attr(input, "type", "date");
  			attr(input, "name", "date");
  			input.required = true;
  			attr(div0, "class", "fieldset");
  			attr(textarea, "name", "comment");
  			attr(textarea, "rows", "2");
  			attr(div1, "class", "fieldset");
  			attr(div2, "class", "entry-form");

  			dispose = [
  				listen(input, "input", ctx.input_input_handler),
  				listen(textarea, "input", ctx.textarea_input_handler)
  			];
  		},

  		m(target, anchor) {
  			insert(target, div2, anchor);
  			append(div2, div0);
  			append(div0, input);

  			set_input_value(input, ctx.entry.date);

  			append(div0, t0);
  			append(div0, h4);
  			append(h4, t1);
  			append(div0, t2);
  			mount_component(accountinput, div0, null);
  			append(div0, t3);
  			mount_component(addmetadatabutton, div0, null);
  			append(div2, t4);
  			append(div2, div1);
  			append(div1, textarea);

  			set_input_value(textarea, ctx.entry.comment);

  			append(div2, t5);
  			mount_component(entrymetadata, div2, null);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (changed.entry) set_input_value(input, ctx.entry.date);

  			var accountinput_changes = {};
  			if (!updating_value && changed.entry) {
  				accountinput_changes.value = ctx.entry.account;
  			}
  			accountinput.$set(accountinput_changes);

  			var addmetadatabutton_changes = {};
  			if (!updating_meta && changed.entry) {
  				addmetadatabutton_changes.meta = ctx.entry.meta;
  			}
  			addmetadatabutton.$set(addmetadatabutton_changes);

  			if (changed.entry) set_input_value(textarea, ctx.entry.comment);

  			var entrymetadata_changes = {};
  			if (!updating_meta_1 && changed.entry) {
  				entrymetadata_changes.meta = ctx.entry.meta;
  			}
  			entrymetadata.$set(entrymetadata_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(accountinput.$$.fragment, local);

  			transition_in(addmetadatabutton.$$.fragment, local);

  			transition_in(entrymetadata.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(accountinput.$$.fragment, local);
  			transition_out(addmetadatabutton.$$.fragment, local);
  			transition_out(entrymetadata.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div2);
  			}

  			destroy_component(accountinput);

  			destroy_component(addmetadatabutton);

  			destroy_component(entrymetadata);

  			run_all(dispose);
  		}
  	};
  }

  function instance$e($$self, $$props, $$invalidate) {
  	

    let { entry } = $$props;

  	function input_input_handler() {
  		entry.date = this.value;
  		$$invalidate('entry', entry);
  	}

  	function accountinput_value_binding(value) {
  		entry.account = value;
  		$$invalidate('entry', entry);
  	}

  	function addmetadatabutton_meta_binding(value_1) {
  		entry.meta = value_1;
  		$$invalidate('entry', entry);
  	}

  	function textarea_input_handler() {
  		entry.comment = this.value;
  		$$invalidate('entry', entry);
  	}

  	function entrymetadata_meta_binding(value_2) {
  		entry.meta = value_2;
  		$$invalidate('entry', entry);
  	}

  	$$self.$set = $$props => {
  		if ('entry' in $$props) $$invalidate('entry', entry = $$props.entry);
  	};

  	return {
  		entry,
  		input_input_handler,
  		accountinput_value_binding,
  		addmetadatabutton_meta_binding,
  		textarea_input_handler,
  		entrymetadata_meta_binding
  	};
  }

  class Note extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$e, create_fragment$e, safe_not_equal, ["entry"]);
  	}
  }

  /* javascript/modals/Extract.svelte generated by Svelte v3.12.1 */

  // (60:4) {#if entry}
  function create_if_block$3(ctx) {
  	var div0, h3, t0, t1_value = ctx.currentIndex + 1 + "", t1, t2, t3_value = ctx.entries.length + "", t3, t4, t5_value = ctx.entries.length - ctx.duplicates + "", t5, t6, t7, span0, t8, label, input, t9, t10, div1, updating_entry, t11, div2, t12, span1, t13, t14, hr, t15, if_block2_anchor, current, dispose;

  	function switch_instance_entry_binding(value) {
  		ctx.switch_instance_entry_binding.call(null, value);
  		updating_entry = true;
  		add_flush_callback(() => updating_entry = false);
  	}

  	var switch_value = ctx.component;

  	function switch_props(ctx) {
  		let switch_instance_props = {};
  		if (ctx.entry !== void 0) {
  			switch_instance_props.entry = ctx.entry;
  		}
  		return { props: switch_instance_props };
  	}

  	if (switch_value) {
  		var switch_instance = new switch_value(switch_props(ctx));

  		binding_callbacks.push(() => bind(switch_instance, 'entry', switch_instance_entry_binding));
  	}

  	var if_block0 = (ctx.currentIndex > 0) && create_if_block_4(ctx);

  	function select_block_type(changed, ctx) {
  		if (ctx.currentIndex < ctx.entries.length - 1) return create_if_block_3;
  		return create_else_block$1;
  	}

  	var current_block_type = select_block_type(null, ctx);
  	var if_block1 = current_block_type(ctx);

  	var if_block2 = (ctx.entry.meta.__source__) && create_if_block_1(ctx);

  	return {
  		c() {
  			div0 = element("div");
  			h3 = element("h3");
  			t0 = text("Entry ");
  			t1 = text(t1_value);
  			t2 = text(" of ");
  			t3 = text(t3_value);
  			t4 = text(" (");
  			t5 = text(t5_value);
  			t6 = text("\n          to import):");
  			t7 = space();
  			span0 = element("span");
  			t8 = space();
  			label = element("label");
  			input = element("input");
  			t9 = text("\n          ignore duplicate");
  			t10 = space();
  			div1 = element("div");
  			if (switch_instance) switch_instance.$$.fragment.c();
  			t11 = space();
  			div2 = element("div");
  			if (if_block0) if_block0.c();
  			t12 = space();
  			span1 = element("span");
  			t13 = space();
  			if_block1.c();
  			t14 = space();
  			hr = element("hr");
  			t15 = space();
  			if (if_block2) if_block2.c();
  			if_block2_anchor = empty();
  			attr(span0, "class", "spacer");
  			attr(input, "type", "checkbox");
  			input.checked = ctx.duplicate;
  			attr(label, "class", "button muted");
  			attr(div0, "class", "headerline");
  			attr(div1, "class", "ingest-row");
  			toggle_class(div1, "duplicate", ctx.duplicate);
  			attr(span1, "class", "spacer");
  			attr(div2, "class", "fieldset");
  			dispose = listen(input, "click", ctx.toggleDuplicate);
  		},

  		m(target, anchor) {
  			insert(target, div0, anchor);
  			append(div0, h3);
  			append(h3, t0);
  			append(h3, t1);
  			append(h3, t2);
  			append(h3, t3);
  			append(h3, t4);
  			append(h3, t5);
  			append(h3, t6);
  			append(div0, t7);
  			append(div0, span0);
  			append(div0, t8);
  			append(div0, label);
  			append(label, input);
  			append(label, t9);
  			insert(target, t10, anchor);
  			insert(target, div1, anchor);

  			if (switch_instance) {
  				mount_component(switch_instance, div1, null);
  			}

  			insert(target, t11, anchor);
  			insert(target, div2, anchor);
  			if (if_block0) if_block0.m(div2, null);
  			append(div2, t12);
  			append(div2, span1);
  			append(div2, t13);
  			if_block1.m(div2, null);
  			insert(target, t14, anchor);
  			insert(target, hr, anchor);
  			insert(target, t15, anchor);
  			if (if_block2) if_block2.m(target, anchor);
  			insert(target, if_block2_anchor, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			if ((!current || changed.currentIndex) && t1_value !== (t1_value = ctx.currentIndex + 1 + "")) {
  				set_data(t1, t1_value);
  			}

  			if ((!current || changed.entries) && t3_value !== (t3_value = ctx.entries.length + "")) {
  				set_data(t3, t3_value);
  			}

  			if ((!current || changed.entries || changed.duplicates) && t5_value !== (t5_value = ctx.entries.length - ctx.duplicates + "")) {
  				set_data(t5, t5_value);
  			}

  			if (!current || changed.duplicate) {
  				input.checked = ctx.duplicate;
  			}

  			var switch_instance_changes = {};
  			if (!updating_entry && changed.entry) {
  				switch_instance_changes.entry = ctx.entry;
  			}

  			if (switch_value !== (switch_value = ctx.component)) {
  				if (switch_instance) {
  					group_outros();
  					const old_component = switch_instance;
  					transition_out(old_component.$$.fragment, 1, 0, () => {
  						destroy_component(old_component, 1);
  					});
  					check_outros();
  				}

  				if (switch_value) {
  					switch_instance = new switch_value(switch_props(ctx));

  					binding_callbacks.push(() => bind(switch_instance, 'entry', switch_instance_entry_binding));

  					switch_instance.$$.fragment.c();
  					transition_in(switch_instance.$$.fragment, 1);
  					mount_component(switch_instance, div1, null);
  				} else {
  					switch_instance = null;
  				}
  			}

  			else if (switch_value) {
  				switch_instance.$set(switch_instance_changes);
  			}

  			if (changed.duplicate) {
  				toggle_class(div1, "duplicate", ctx.duplicate);
  			}

  			if (ctx.currentIndex > 0) {
  				if (if_block0) {
  					if_block0.p(changed, ctx);
  				} else {
  					if_block0 = create_if_block_4(ctx);
  					if_block0.c();
  					if_block0.m(div2, t12);
  				}
  			} else if (if_block0) {
  				if_block0.d(1);
  				if_block0 = null;
  			}

  			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block1) {
  				if_block1.p(changed, ctx);
  			} else {
  				if_block1.d(1);
  				if_block1 = current_block_type(ctx);
  				if (if_block1) {
  					if_block1.c();
  					if_block1.m(div2, null);
  				}
  			}

  			if (ctx.entry.meta.__source__) {
  				if (if_block2) {
  					if_block2.p(changed, ctx);
  				} else {
  					if_block2 = create_if_block_1(ctx);
  					if_block2.c();
  					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
  				}
  			} else if (if_block2) {
  				if_block2.d(1);
  				if_block2 = null;
  			}
  		},

  		i(local) {
  			if (current) return;
  			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(div0);
  				detach(t10);
  				detach(div1);
  			}

  			if (switch_instance) destroy_component(switch_instance);

  			if (detaching) {
  				detach(t11);
  				detach(div2);
  			}

  			if (if_block0) if_block0.d();
  			if_block1.d();

  			if (detaching) {
  				detach(t14);
  				detach(hr);
  				detach(t15);
  			}

  			if (if_block2) if_block2.d(detaching);

  			if (detaching) {
  				detach(if_block2_anchor);
  			}

  			dispose();
  		}
  	};
  }

  // (79:8) {#if currentIndex > 0}
  function create_if_block_4(ctx) {
  	var button0, t1, button1, t2_value = _('Previous') + "", t2, dispose;

  	return {
  		c() {
  			button0 = element("button");
  			button0.textContent = "⏮";
  			t1 = space();
  			button1 = element("button");
  			t2 = text(t2_value);
  			attr(button0, "type", "button");
  			attr(button0, "class", "muted");
  			attr(button1, "type", "button");
  			attr(button1, "class", "muted");

  			dispose = [
  				listen(button0, "click", ctx.click_handler),
  				listen(button1, "click", ctx.previousEntry)
  			];
  		},

  		m(target, anchor) {
  			insert(target, button0, anchor);
  			insert(target, t1, anchor);
  			insert(target, button1, anchor);
  			append(button1, t2);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(button0);
  				detach(t1);
  				detach(button1);
  			}

  			run_all(dispose);
  		}
  	};
  }

  // (103:8) {:else}
  function create_else_block$1(ctx) {
  	var button, t_value = _('Save') + "", t;

  	return {
  		c() {
  			button = element("button");
  			t = text(t_value);
  			attr(button, "type", "submit");
  		},

  		m(target, anchor) {
  			insert(target, button, anchor);
  			append(button, t);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(button);
  			}
  		}
  	};
  }

  // (93:8) {#if currentIndex < entries.length - 1}
  function create_if_block_3(ctx) {
  	var button0, t0_value = _('Next') + "", t0, t1, button1, dispose;

  	return {
  		c() {
  			button0 = element("button");
  			t0 = text(t0_value);
  			t1 = space();
  			button1 = element("button");
  			button1.textContent = "⏭";
  			attr(button0, "type", "submit");
  			attr(button1, "type", "button");
  			attr(button1, "class", "muted");
  			dispose = listen(button1, "click", ctx.click_handler_1);
  		},

  		m(target, anchor) {
  			insert(target, button0, anchor);
  			append(button0, t0);
  			insert(target, t1, anchor);
  			insert(target, button1, anchor);
  		},

  		p: noop,

  		d(detaching) {
  			if (detaching) {
  				detach(button0);
  				detach(t1);
  				detach(button1);
  			}

  			dispose();
  		}
  	};
  }

  // (108:6) {#if entry.meta.__source__}
  function create_if_block_1(ctx) {
  	var h3, t0_value = _('Source') + "", t0, t1, t2, pre, t3_value = ctx.entry.meta.__source__ + "", t3;

  	var if_block = (ctx.entry.meta.lineno > 0) && create_if_block_2(ctx);

  	return {
  		c() {
  			h3 = element("h3");
  			t0 = text(t0_value);
  			t1 = space();
  			if (if_block) if_block.c();
  			t2 = space();
  			pre = element("pre");
  			t3 = text(t3_value);
  		},

  		m(target, anchor) {
  			insert(target, h3, anchor);
  			append(h3, t0);
  			append(h3, t1);
  			if (if_block) if_block.m(h3, null);
  			insert(target, t2, anchor);
  			insert(target, pre, anchor);
  			append(pre, t3);
  		},

  		p(changed, ctx) {
  			if (ctx.entry.meta.lineno > 0) {
  				if (if_block) {
  					if_block.p(changed, ctx);
  				} else {
  					if_block = create_if_block_2(ctx);
  					if_block.c();
  					if_block.m(h3, null);
  				}
  			} else if (if_block) {
  				if_block.d(1);
  				if_block = null;
  			}

  			if ((changed.entry) && t3_value !== (t3_value = ctx.entry.meta.__source__ + "")) {
  				set_data(t3, t3_value);
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(h3);
  			}

  			if (if_block) if_block.d();

  			if (detaching) {
  				detach(t2);
  				detach(pre);
  			}
  		}
  	};
  }

  // (111:10) {#if entry.meta.lineno > 0}
  function create_if_block_2(ctx) {
  	var t0, t1_value = _('Line') + "", t1, t2, t3_value = ctx.entry.meta.lineno + "", t3, t4;

  	return {
  		c() {
  			t0 = text("(");
  			t1 = text(t1_value);
  			t2 = text(": ");
  			t3 = text(t3_value);
  			t4 = text(")");
  		},

  		m(target, anchor) {
  			insert(target, t0, anchor);
  			insert(target, t1, anchor);
  			insert(target, t2, anchor);
  			insert(target, t3, anchor);
  			insert(target, t4, anchor);
  		},

  		p(changed, ctx) {
  			if ((changed.entry) && t3_value !== (t3_value = ctx.entry.meta.lineno + "")) {
  				set_data(t3, t3_value);
  			}
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(t0);
  				detach(t1);
  				detach(t2);
  				detach(t3);
  				detach(t4);
  			}
  		}
  	};
  }

  // (57:0) <ModalBase {shown}>
  function create_default_slot$4(ctx) {
  	var form, h3, t0_value = _('Import') + "", t0, t1, current, dispose;

  	var if_block = (ctx.entry) && create_if_block$3(ctx);

  	return {
  		c() {
  			form = element("form");
  			h3 = element("h3");
  			t0 = text(t0_value);
  			t1 = space();
  			if (if_block) if_block.c();
  			form.noValidate = ctx.duplicate;
  			dispose = listen(form, "submit", prevent_default(ctx.submitOrNext));
  		},

  		m(target, anchor) {
  			insert(target, form, anchor);
  			append(form, h3);
  			append(h3, t0);
  			append(form, t1);
  			if (if_block) if_block.m(form, null);
  			current = true;
  		},

  		p(changed, ctx) {
  			if (ctx.entry) {
  				if (if_block) {
  					if_block.p(changed, ctx);
  					transition_in(if_block, 1);
  				} else {
  					if_block = create_if_block$3(ctx);
  					if_block.c();
  					transition_in(if_block, 1);
  					if_block.m(form, null);
  				}
  			} else if (if_block) {
  				group_outros();
  				transition_out(if_block, 1, 1, () => {
  					if_block = null;
  				});
  				check_outros();
  			}

  			if (!current || changed.duplicate) {
  				form.noValidate = ctx.duplicate;
  			}
  		},

  		i(local) {
  			if (current) return;
  			transition_in(if_block);
  			current = true;
  		},

  		o(local) {
  			transition_out(if_block);
  			current = false;
  		},

  		d(detaching) {
  			if (detaching) {
  				detach(form);
  			}

  			if (if_block) if_block.d();
  			dispose();
  		}
  	};
  }

  function create_fragment$f(ctx) {
  	var current;

  	var modalbase = new ModalBase({
  		props: {
  		shown: ctx.shown,
  		$$slots: { default: [create_default_slot$4] },
  		$$scope: { ctx }
  	}
  	});

  	return {
  		c() {
  			modalbase.$$.fragment.c();
  		},

  		m(target, anchor) {
  			mount_component(modalbase, target, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			var modalbase_changes = {};
  			if (changed.shown) modalbase_changes.shown = ctx.shown;
  			if (changed.$$scope || changed.duplicate || changed.entry || changed.currentIndex || changed.entries || changed.component || changed.duplicates) modalbase_changes.$$scope = { changed, ctx };
  			modalbase.$set(modalbase_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(modalbase.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(modalbase.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			destroy_component(modalbase, detaching);
  		}
  	};
  }

  function isDuplicate(e) {
    return !!e.meta.__duplicate__;
  }

  function instance$f($$self, $$props, $$invalidate) {
  	let $urlHash;

  	component_subscribe($$self, urlHash, $$value => { $urlHash = $$value; $$invalidate('$urlHash', $urlHash); });

  	

    let entries = [];
    let component;
    let currentIndex = 0;
    let duplicate;
    let duplicates;
    let entry;
    let shown;

    async function submitOrNext() {
      if (currentIndex < entries.length - 1) {
        $$invalidate('currentIndex', currentIndex += 1);
      } else {
        await saveEntries(entries.filter(e => !isDuplicate(e)));
        closeOverlay();
      }
    }

    function previousEntry() {
      $$invalidate('currentIndex', currentIndex = Math.max(currentIndex - 1, 0));
    }

    function toggleDuplicate() {
      $$invalidate('entry', entry.meta.__duplicate__ = !entry.meta.__duplicate__, entry);
    }

  	function switch_instance_entry_binding(value) {
  		entry = value;
  		$$invalidate('entry', entry), $$invalidate('entries', entries), $$invalidate('currentIndex', currentIndex), $$invalidate('shown', shown), $$invalidate('$urlHash', $urlHash);
  	}

  	const click_handler = () => {
  	              $$invalidate('currentIndex', currentIndex = 0);
  	            };

  	const click_handler_1 = () => {
  	              $$invalidate('currentIndex', currentIndex = entries.length - 1);
  	            };

  	$$self.$$.update = ($$dirty = { $urlHash: 1, shown: 1, entries: 1, currentIndex: 1, entry: 1 }) => {
  		if ($$dirty.$urlHash) { $$invalidate('shown', shown = $urlHash.startsWith("extract")); }
  		if ($$dirty.shown || $$dirty.$urlHash) { if (shown) {
          const params = new URLSearchParams($urlHash.slice(8));
          const filename = params.get("filename");
          const importer = params.get("importer");
          fetchAPI("extract", { filename, importer }).then(data => {
            $$invalidate('entries', entries = data);
          });
        } }
  		if ($$dirty.entries || $$dirty.currentIndex) { $$invalidate('entry', entry = entries[currentIndex]); }
  		if ($$dirty.entry || $$dirty.entries) { if (entry) {
          $$invalidate('component', component = { Balance: Balance$1, Note, Transaction: Transaction_1 }[entry.type]);
          $$invalidate('duplicates', duplicates = entry && entries.filter(e => isDuplicate(e)).length);
          $$invalidate('duplicate', duplicate = isDuplicate(entry));
        } }
  	};

  	return {
  		entries,
  		component,
  		currentIndex,
  		duplicate,
  		duplicates,
  		entry,
  		shown,
  		submitOrNext,
  		previousEntry,
  		toggleDuplicate,
  		switch_instance_entry_binding,
  		click_handler,
  		click_handler_1
  	};
  }

  class Extract extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$f, create_fragment$f, safe_not_equal, []);
  	}
  }

  /* javascript/modals/Modals.svelte generated by Svelte v3.12.1 */

  function create_fragment$g(ctx) {
  	var t0, t1, t2, t3, current;

  	var addentry = new AddEntry({});

  	var context = new Context({});

  	let documentupload_props = {};
  	var documentupload = new DocumentUpload({ props: documentupload_props });

  	ctx.documentupload_binding(documentupload);

  	var export_1 = new Export({});

  	var extract = new Extract({});

  	return {
  		c() {
  			addentry.$$.fragment.c();
  			t0 = space();
  			context.$$.fragment.c();
  			t1 = space();
  			documentupload.$$.fragment.c();
  			t2 = space();
  			export_1.$$.fragment.c();
  			t3 = space();
  			extract.$$.fragment.c();
  		},

  		m(target, anchor) {
  			mount_component(addentry, target, anchor);
  			insert(target, t0, anchor);
  			mount_component(context, target, anchor);
  			insert(target, t1, anchor);
  			mount_component(documentupload, target, anchor);
  			insert(target, t2, anchor);
  			mount_component(export_1, target, anchor);
  			insert(target, t3, anchor);
  			mount_component(extract, target, anchor);
  			current = true;
  		},

  		p(changed, ctx) {
  			var documentupload_changes = {};
  			documentupload.$set(documentupload_changes);
  		},

  		i(local) {
  			if (current) return;
  			transition_in(addentry.$$.fragment, local);

  			transition_in(context.$$.fragment, local);

  			transition_in(documentupload.$$.fragment, local);

  			transition_in(export_1.$$.fragment, local);

  			transition_in(extract.$$.fragment, local);

  			current = true;
  		},

  		o(local) {
  			transition_out(addentry.$$.fragment, local);
  			transition_out(context.$$.fragment, local);
  			transition_out(documentupload.$$.fragment, local);
  			transition_out(export_1.$$.fragment, local);
  			transition_out(extract.$$.fragment, local);
  			current = false;
  		},

  		d(detaching) {
  			destroy_component(addentry, detaching);

  			if (detaching) {
  				detach(t0);
  			}

  			destroy_component(context, detaching);

  			if (detaching) {
  				detach(t1);
  			}

  			ctx.documentupload_binding(null);

  			destroy_component(documentupload, detaching);

  			if (detaching) {
  				detach(t2);
  			}

  			destroy_component(export_1, detaching);

  			if (detaching) {
  				detach(t3);
  			}

  			destroy_component(extract, detaching);
  		}
  	};
  }

  function instance$g($$self, $$props, $$invalidate) {
  	

    let documentUploadModal;
    // File uploads via Drag and Drop on elements with class "droptarget" and
    // attribute "data-account-name"
    onMount(() => {
      delegate(document, "dragenter", ".droptarget", (event, closestTarget) => {
        closestTarget.classList.add("dragover");
        event.preventDefault();
      });

      delegate(document, "dragover", ".droptarget", (event, closestTarget) => {
        closestTarget.classList.add("dragover");
        event.preventDefault();
      });

      delegate(document, "dragleave", ".droptarget", (event, closestTarget) => {
        closestTarget.classList.remove("dragover");
        event.preventDefault();
      });

      delegate(document, "drop", ".droptarget", (event, closestTarget) => {
        closestTarget.classList.remove("dragover");
        event.preventDefault();
        event.stopPropagation();
        documentUploadModal.handleDrop(event, closestTarget);
      });
    });

  	function documentupload_binding($$value) {
  		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
  			$$invalidate('documentUploadModal', documentUploadModal = $$value);
  		});
  	}

  	return {
  		documentUploadModal,
  		documentupload_binding
  	};
  }

  class Modals extends SvelteComponent {
  	constructor(options) {
  		super();
  		init(this, options, instance$g, create_fragment$g, safe_not_equal, []);
  	}
  }

  /**
   * Fava's main Javascript entry point.
   *
   * The code for Fava's UI is split into several modules that are all imported
   * below. The different modules can listen to and register events to
   * communicate and to register DOM event handlers for example.
   *
   * The events currently in use in Fava:
   *
   * file-modified:
   *    Fetch and update the error count in the sidebar.
   *
   * page-init:
   *    Run once the page is initialized, i.e., when the DOM is ready. Use this
   *    for JS code and parts of the UI that are independent of the current
   *    contents of <article>.
   *
   * page-loaded:
   *    After a new page has been loaded asynchronously. Use this to bind to
   *    elements in the page.
   */
  function initSvelteComponent(selector, SvelteComponent) {
      const el = select(selector);
      if (el) {
          let data = {};
          const script = select("script", el);
          if (script && script.type === "application/json") {
              data = JSON.parse(script.innerHTML);
          }
          const component = new SvelteComponent({ target: el, props: { data } });
          e.once("page-loaded", () => component.$destroy());
      }
  }
  e.on("page-loaded", () => {
      Object.assign(favaAPI, favaAPIValidator(getScriptTagJSON("#ledger-data")));
      initSvelteComponent("#svelte-charts", ChartSwitcher);
      initSvelteComponent("#svelte-import", Import);
      document.title = favaAPI.documentTitle;
      select("h1 strong").innerHTML = favaAPI.pageTitle;
      select("#reload-page").classList.add("hidden");
  });
  e.on("page-init", () => {
      // eslint-disable-next-line
      new Modals({ target: document.body });
      // eslint-disable-next-line
      new FilterForm({ target: select("header") });
      // Watch for all clicks on <button>s and fire the appropriate events.
      delegate(document.body, "click", "button", (event, button) => {
          const type = button.getAttribute("data-event");
          if (type) {
              e.trigger(`button-click-${type}`, button);
          }
      });
      // Watch for all submits of <forms>s and fire the appropriate events.
      delegate(document.body, "submit", "form", (event, form) => {
          const type = form.getAttribute("data-event");
          if (type) {
              event.preventDefault();
              e.trigger(`form-submit-${type}`, form);
          }
      });
  });
  // Check the `changed` API endpoint every 5 seconds and fire the appropriate
  // events if some file changed.
  async function doPoll() {
      try {
          const changed = await fetchAPI("changed");
          if (changed) {
              if (favaAPI.favaOptions["auto-reload"]) {
                  router.reload();
              }
              else {
                  select("#reload-page").classList.remove("hidden");
                  e.trigger("file-modified");
                  notify(_("File change detected. Click to reload."), "warning", () => {
                      router.reload();
                  });
              }
          }
      }
      finally {
          setTimeout(doPoll, 5000);
      }
  }
  ready().then(() => {
      Object.assign(favaAPI, favaAPIValidator(getScriptTagJSON("#ledger-data")));
      router.init();
      e.trigger("page-init");
      e.trigger("page-loaded");
      setTimeout(doPoll, 5000);
  });

}());
//# sourceMappingURL=app.js.map
