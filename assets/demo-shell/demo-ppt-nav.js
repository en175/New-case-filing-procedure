(function () {
  /**
   * PPT 演示页顺序，与 AgentDoc/PPT演示重构文档.md 3.1–3.12 一一对应。
   */
  const PPT_PAGES = [
    { id: '3.1', key: 'index', title: '演示入口', href: './index.html' },
    { id: '3.2', key: 'filing-bot', title: '申请书生成', href: './申请书bot.html' },
    { id: '3.3', key: 'step2', title: '材料智能提取', href: './Step2SmartExtraction.html' },
    { id: '3.4', key: 'material-split', title: '立案分流智能判断', href: './立案分流智能判断.html' },
    { id: '3.5', key: 'diversion', title: '纠纷化解引导', href: './调解&撤案引导bot.html' },
    { id: '3.6', key: 'defense', title: '抗辩模拟', href: './抗辩机器人.html' },
    { id: '3.7', key: 'qa', title: '案情闯关', href: './游戏化问答.html' },
    { id: '3.8', key: 'path-map', title: '案件路径图', href: './案件路径图.html' },
    {
      id: '3.9',
      key: 'report',
      title: '案件评估报告',
      href: './申请书bot.html?demoStage=report',
      openReport: true
    },
    { id: '3.10', key: 'followup', title: '立案后路径选择', href: './立案提交后路径选择.html' },
    { id: '3.11', key: 'persona', title: '当事人画像话术', href: './当事人画像话术策略.html' },
    { id: '3.12', key: 'ending', title: '演示结束', href: './演示结束页.html', terminal: true }
  ];

  const LS_KEY_NEXT = 'pptNavKeyCodeNext';
  const LS_KEY_PREV = 'pptNavKeyCodePrev';
  const LS_KEY_SHOW = 'isShowPptNavControls';

  const DEFAULT_KEY_NEXT = 39;
  const DEFAULT_KEY_PREV = 37;

  const innerKeyHandlers = new Set();

  function isConfigOn(value) {
    const isOn = window.FilingDemoConfig?.isOn || (nextValue => nextValue === 1 || nextValue === '1');
    return isOn(value);
  }

  function readConfigValue(key, fallback) {
    if (window.FilingDemoConfig?.get) {
      const value = window.FilingDemoConfig.get(key);
      if (value !== undefined && value !== null) return value;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === '') return fallback;
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function readShowControls() {
    if (window.FilingDemoConfig?.get) {
      return isConfigOn(window.FilingDemoConfig.get(LS_KEY_SHOW));
    }
    return isConfigOn(readConfigValue(LS_KEY_SHOW, 0));
  }

  function getKeyCodes() {
    return {
      next: readConfigValue(LS_KEY_NEXT, DEFAULT_KEY_NEXT),
      prev: readConfigValue(LS_KEY_PREV, DEFAULT_KEY_PREV)
    };
  }

  /** Netlify 等托管会把 Step2SmartExtraction.html 301 到 /step2smartextraction，需忽略大小写与 .html 后缀 */
  function pageSlug(value) {
    if (!value) return 'index';
    let name = String(value);
    try {
      name = decodeURIComponent(name);
    } catch (error) {}
    const segment = name.split('/').filter(Boolean).pop() || 'index.html';
    const lower = segment.toLowerCase();
    if (lower === 'index' || lower === 'index.html') return 'index';
    return lower.endsWith('.html') ? lower.slice(0, -5) : lower;
  }

  function currentPageSlug() {
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (!segments.length) return 'index';
    return pageSlug(segments[segments.length - 1]);
  }

  function hrefPageSlug(href) {
    const url = new URL(href, window.location.href);
    return pageSlug(url.pathname.split('/').pop() || 'index.html');
  }

  function currentPageIndex() {
    const slug = currentPageSlug();
    const query = new URLSearchParams(window.location.search);
    const filingBotSlug = pageSlug('申请书bot.html');
    if (slug === filingBotSlug) {
      return query.get('demoStage') === 'report'
        ? PPT_PAGES.findIndex(page => page.key === 'report')
        : PPT_PAGES.findIndex(page => page.key === 'filing-bot');
    }
    const index = PPT_PAGES.findIndex(page => {
      if (!page.href) return false;
      return hrefPageSlug(page.href) === slug;
    });
    return index;
  }

  function firstNavigableIndex() {
    return PPT_PAGES.findIndex(page => !page.placeholder && page.href);
  }

  function lastNavigableIndex() {
    for (let i = PPT_PAGES.length - 1; i >= 0; i -= 1) {
      const page = PPT_PAGES[i];
      if (!page.placeholder && page.href) return i;
    }
    return -1;
  }

  function isFirstPage(index) {
    return index >= 0 && index === firstNavigableIndex();
  }

  function isLastPage(index) {
    return index >= 0 && index === PPT_PAGES.length - 1;
  }

  function resolveNavigableIndex(startIndex, direction) {
    let index = startIndex;
    const step = direction > 0 ? 1 : -1;
    while (index >= 0 && index < PPT_PAGES.length) {
      index += step;
      if (index < 0 || index >= PPT_PAGES.length) return -1;
      const page = PPT_PAGES[index];
      if (!page.placeholder && page.href) return index;
    }
    return -1;
  }

  function prepareReportFlag(page) {
    if (!page.openReport) return;
    try {
      localStorage.setItem('filingDemoOpenReport', 'filingBot');
    } catch (error) {}
  }

  function navigateToIndex(index) {
    const page = PPT_PAGES[index];
    if (!page || page.placeholder || !page.href) return false;
    prepareReportFlag(page);
    window.location.href = page.href;
    return true;
  }

  function goNext() {
    const current = currentPageIndex();
    if (current < 0) return false;
    let nextIndex = resolveNavigableIndex(current, 1);
    if (nextIndex < 0 && isLastPage(current)) {
      nextIndex = firstNavigableIndex();
    }
    if (nextIndex < 0) return false;
    return navigateToIndex(nextIndex);
  }

  function goPrev() {
    const current = currentPageIndex();
    if (current < 0) return false;
    let prevIndex = resolveNavigableIndex(current, -1);
    if (prevIndex < 0 && isFirstPage(current)) {
      prevIndex = lastNavigableIndex();
    }
    if (prevIndex < 0) return false;
    return navigateToIndex(prevIndex);
  }

  function shouldIgnoreTarget(target) {
    if (!target?.closest) return false;
    return !!target.closest('input, textarea, select, [contenteditable="true"]');
  }

  function shouldConsumeForInnerDemo(event) {
    for (const handler of innerKeyHandlers) {
      try {
        if (handler(event)) return true;
      } catch (error) {}
    }
    return false;
  }

  function matchesConfiguredKey(event, keyCodes) {
    const code = event.keyCode || event.which;
    return code === keyCodes.next || code === keyCodes.prev;
  }

  function handleKeydown(event) {
    if (shouldIgnoreTarget(event.target)) return;
    const keyCodes = getKeyCodes();
    if (!matchesConfiguredKey(event, keyCodes)) return;
    if (shouldConsumeForInnerDemo(event)) return;

    const code = event.keyCode || event.which;
    event.preventDefault();
    if (code === keyCodes.next) goNext();
    else if (code === keyCodes.prev) goPrev();
  }

  function updateControlState(root) {
    const current = currentPageIndex();
    const prevBtn = root.querySelector('[data-ppt-nav="prev"]');
    const nextBtn = root.querySelector('[data-ppt-nav="next"]');
    const label = root.querySelector('[data-ppt-nav="label"]');
    const page = current >= 0 ? PPT_PAGES[current] : null;
    const hasPrev = current >= 0 && (resolveNavigableIndex(current, -1) >= 0 || isFirstPage(current));
    const hasNext = current >= 0 && (resolveNavigableIndex(current, 1) >= 0 || isLastPage(current));

    if (prevBtn) prevBtn.disabled = !hasPrev;
    if (nextBtn) nextBtn.disabled = !hasNext;
    if (label) {
      label.textContent = page ? `${page.id} ${page.title}` : '演示页';
    }
  }

  function createControls() {
    if (document.querySelector('.demo-ppt-nav')) return;
    if (!readShowControls()) return;

    const root = document.createElement('div');
    root.className = 'demo-ppt-nav';
    root.setAttribute('role', 'navigation');
    root.setAttribute('aria-label', 'PPT 演示页前进后退');

    root.innerHTML = `
      <button type="button" class="demo-ppt-nav-btn" data-ppt-nav="prev" aria-label="上一页 PPT">
        <span aria-hidden="true">‹</span>
        <span class="demo-ppt-nav-btn-text">后退</span>
      </button>
      <div class="demo-ppt-nav-label" data-ppt-nav="label">演示页</div>
      <button type="button" class="demo-ppt-nav-btn" data-ppt-nav="next" aria-label="下一页 PPT">
        <span class="demo-ppt-nav-btn-text">前进</span>
        <span aria-hidden="true">›</span>
      </button>
    `;

    root.querySelector('[data-ppt-nav="prev"]').addEventListener('click', () => goPrev());
    root.querySelector('[data-ppt-nav="next"]').addEventListener('click', () => goNext());

    document.body.appendChild(root);
    updateControlState(root);
  }

  function teardownControls() {
    document.querySelectorAll('.demo-ppt-nav').forEach(node => node.remove());
  }

  function registerInnerKeyHandler(handler) {
    innerKeyHandlers.add(handler);
    return () => innerKeyHandlers.delete(handler);
  }

  function startAfterConfigReady() {
    if (!window.FilingDemoConfig) {
      window.addEventListener('filing-demo-config-ready', startAfterConfigReady, { once: true });
      return;
    }
    bootstrap();
  }

  window.DemoPptNav = {
    pages: PPT_PAGES,
    keys: {
      next: LS_KEY_NEXT,
      prev: LS_KEY_PREV,
      show: LS_KEY_SHOW
    },
    defaults: {
      next: DEFAULT_KEY_NEXT,
      prev: DEFAULT_KEY_PREV
    },
    getKeyCodes,
    getCurrentIndex: currentPageIndex,
    getCurrentPage() {
      const index = currentPageIndex();
      return index >= 0 ? PPT_PAGES[index] : null;
    },
    goNext,
    goPrev,
    goToIndex: navigateToIndex,
    registerInnerKeyHandler,
    refresh: bootstrap
  };

  function bootstrap() {
    teardownControls();
    createControls();
    window.dispatchEvent(new CustomEvent('demo-ppt-nav-ready', { detail: { api: window.DemoPptNav } }));
  }

  window.addEventListener('keydown', handleKeydown);

  window.addEventListener('filing-demo-config-change', () => bootstrap());

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAfterConfigReady);
  } else {
    startAfterConfigReady();
  }
})();
