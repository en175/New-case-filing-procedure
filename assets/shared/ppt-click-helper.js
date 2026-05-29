(function (global) {
  /**
   * PPT 演示点击辅助：统一在 document 上监听指针点击。
   * @param {{ targetEl?: HTMLElement | null, match: (event: MouseEvent, targetEl: HTMLElement | null) => boolean }} rule
   * @param {(event: MouseEvent) => void} callback
   * @param {{ event?: string, capture?: boolean, ignore?: (target: EventTarget | null) => boolean }} [options]
   * @returns {() => void} dispose
   */
  function bindDocumentClick(rule, callback, options) {
    if (typeof callback !== 'function') {
      return function noop() {};
    }

    const opts = options || {};
    const eventName = opts.event || 'click';
    const useCapture = opts.capture !== false;

    const handler = (event) => {
      if (opts.ignore && opts.ignore(event.target)) return;
      const targetEl = rule.targetEl || null;
      if (targetEl && !targetEl.isConnected) return;
      if (!rule.match(event, targetEl)) return;
      callback(event);
    };

    document.addEventListener(eventName, handler, useCapture);
    return function dispose() {
      document.removeEventListener(eventName, handler, useCapture);
    };
  }

  /**
   * 点击 targetEl 外部时触发（常用于遮罩关闭、点空白翻页）。
   * @param {HTMLElement} targetEl
   * @param {(event: MouseEvent) => void} onOutside
   * @param {{ event?: string, capture?: boolean, ignore?: (target: EventTarget | null) => boolean }} [options]
   * @returns {() => void} dispose
   */
  function clickOutside(targetEl, onOutside, options) {
    if (!targetEl) {
      return function noop() {};
    }
    return bindDocumentClick(
      {
        targetEl,
        match(event, el) {
          return !el.contains(event.target);
        }
      },
      onOutside,
      options
    );
  }

  /**
   * 点击 targetEl 内部时触发（面板内确认、选项选中等）。
   * @param {HTMLElement} targetEl
   * @param {(event: MouseEvent) => void} onInside
   * @param {{ event?: string, capture?: boolean, ignore?: (target: EventTarget | null) => boolean }} [options]
   * @returns {() => void} dispose
   */
  function clickInside(targetEl, onInside, options) {
    if (!targetEl) {
      return function noop() {};
    }
    return bindDocumentClick(
      {
        targetEl,
        match(event, el) {
          return el.contains(event.target);
        }
      },
      onInside,
      options
    );
  }

  /**
   * 点击屏幕任意位置时触发（全屏推进、任意位置 next 等）。
   * @param {(event: MouseEvent) => void} onAnywhere
   * @param {{ event?: string, capture?: boolean, ignore?: (target: EventTarget | null) => boolean }} [options]
   * @returns {() => void} dispose
   */
  function clickAnywhere(onAnywhere, options) {
    return bindDocumentClick(
      {
        targetEl: null,
        match() {
          return true;
        }
      },
      onAnywhere,
      options
    );
  }

  /**
   * 点击屏幕任意位置时触发 PPT 下一页，等同于当前配置的“下一页”键。
   * @param {{ ignore?: (target: EventTarget | null) => boolean }} [options]
   * @returns {() => void} dispose
   */
  function clickAnywhereToNext(options) {
    return clickAnywhere((event) => {
      if (options?.ignore && options.ignore(event.target)) return;
      const nav = global.DemoPptNav;
      if (!nav?.goNext) return;
      event.preventDefault();
      nav.goNext();
    }, {
      ignore: options?.ignore
    });
  }

  const PptClickHelper = {
    clickOutside,
    clickInside,
    clickAnywhere,
    clickAnywhereToNext
  };

  global.clickOutside = clickOutside;
  global.clickInside = clickInside;
  global.clickAnywhere = clickAnywhere;
  global.clickAnywhereToNext = clickAnywhereToNext;
  global.PptClickHelper = PptClickHelper;
})(typeof window !== 'undefined' ? window : globalThis);
