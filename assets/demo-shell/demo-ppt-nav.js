(function () {

  /**

   * PPT 演示页目录（唯一页面），与 AgentDoc/PPT演示重构文档.md 3.0–3.12 对应。

   */

  const PPT_PAGES = [

    { id: '3.0', key: 'login', title: '登录', href: './login.html' },

    { id: '3.1', key: 'index', title: '演示入口', href: './index.html' },

    { id: '3.2', key: 'filing-bot', title: '申请书生成', href: './申请书bot.html' },

    { id: '3.3', key: 'step2', title: '材料智能提取', href: './Step2SmartExtraction.html' },

    { id: '3.4', key: 'material-split', title: '立案分流智能判断', href: './立案分流智能判断.html' },

    { id: '3.5', key: 'diversion', title: '纠纷化解引导', href: './调解&撤案引导bot.html' },

    { id: '3.10', key: 'followup', title: '立案后路径选择', href: './立案提交后路径选择.html' },

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

    { id: '3.11', key: 'persona', title: '当事人画像话术', href: './当事人画像话术策略.html' },

    { id: '3.12', key: 'ending', title: '演示结束', href: './演示结束页.html', terminal: true }

  ];



  const PPT_PAGE_BY_KEY = Object.fromEntries(PPT_PAGES.map(page => [page.key, page]));



  /**

   * 演示前进/后退顺序。立案后路径选择出现 3 次，形成分支回访环：

   * followup → qa → followup → defense → followup → path-map → report

   */

  const PPT_FLOW = [

    { pageKey: 'login' },

    { pageKey: 'index' },

    { pageKey: 'filing-bot' },

    { pageKey: 'step2' },

    { pageKey: 'material-split' },

    { pageKey: 'diversion' },

    { pageKey: 'followup', visit: 1 },

    { pageKey: 'qa' },

    { pageKey: 'followup', visit: 2 },

    { pageKey: 'defense' },

    { pageKey: 'followup', visit: 3 },

    { pageKey: 'path-map' },

    { pageKey: 'report' },

    { pageKey: 'persona' },

    { pageKey: 'ending' }

  ];



  const LS_KEY_FLOW_INDEX = 'pptFlowIndex';

  const LS_KEY_NEXT = 'pptNavKeyCodeNext';

  const LS_KEY_PREV = 'pptNavKeyCodePrev';

  const LS_KEY_SHOW = 'isShowPptNavControls';



  const DEFAULT_KEY_NEXT = 68; // D

  const DEFAULT_KEY_PREV = 65; // A



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



  function locationPageKey() {

    const slug = currentPageSlug();

    const query = new URLSearchParams(window.location.search);

    const filingBotSlug = pageSlug('申请书bot.html');

    if (slug === filingBotSlug) {

      return query.get('demoStage') === 'report' ? 'report' : 'filing-bot';

    }

    const page = PPT_PAGES.find(item => item.href && hrefPageSlug(item.href) === slug);

    return page?.key || null;

  }



  function readFollowupVisitFromUrl() {

    const raw = new URLSearchParams(window.location.search).get('pptVisit');

    const visit = Number.parseInt(raw, 10);

    return Number.isFinite(visit) && visit >= 1 && visit <= 3 ? visit : null;

  }



  function inferFollowupVisit() {

    const fromUrl = readFollowupVisitFromUrl();

    if (fromUrl) return fromUrl;

    return 1;

  }



  function flowStepMatchesLocation(step) {

    const pageKey = locationPageKey();

    if (!pageKey || pageKey !== step.pageKey) return false;

    if (step.pageKey !== 'followup') return true;

    const visit = step.visit || 1;

    return inferFollowupVisit() === visit;

  }



  function readStoredFlowIndex() {

    try {

      const raw = sessionStorage.getItem(LS_KEY_FLOW_INDEX);

      if (raw === null || raw === '') return -1;

      const index = Number.parseInt(raw, 10);

      return Number.isFinite(index) ? index : -1;

    } catch (error) {

      return -1;

    }

  }



  function writeStoredFlowIndex(index) {

    try {

      sessionStorage.setItem(LS_KEY_FLOW_INDEX, String(index));

    } catch (error) {}

  }



  function findFlowIndicesForLocation() {

    const matches = [];

    for (let i = 0; i < PPT_FLOW.length; i += 1) {

      if (flowStepMatchesLocation(PPT_FLOW[i])) matches.push(i);

    }

    return matches;

  }



  function currentFlowIndex() {

    const stored = readStoredFlowIndex();

    if (stored >= 0 && stored < PPT_FLOW.length && flowStepMatchesLocation(PPT_FLOW[stored])) {

      return stored;

    }

    const matches = findFlowIndicesForLocation();

    if (matches.length === 1) return matches[0];

    if (matches.length > 1) {

      const visit = inferFollowupVisit();

      const byVisit = matches.find(index => (PPT_FLOW[index].visit || 1) === visit);

      return byVisit ?? matches[0];

    }

    return -1;

  }



  /** 兼容旧 API：返回当前流程序号 */

  function currentPageIndex() {

    return currentFlowIndex();

  }



  function flowStepPage(step) {

    return PPT_PAGE_BY_KEY[step.pageKey] || null;

  }



  function flowStepLabel(step) {

    const page = flowStepPage(step);

    if (!page) return '演示页';

    if (step.pageKey === 'followup' && step.visit) {

      return `${page.id} ${page.title} (${step.visit}/3)`;

    }

    return `${page.id} ${page.title}`;

  }



  function buildFlowHref(step) {

    const page = flowStepPage(step);

    if (!page?.href) return null;

    if (step.pageKey !== 'followup' || !step.visit || step.visit <= 1) {

      return page.href;

    }

    const url = new URL(page.href, window.location.href);

    url.searchParams.set('pptVisit', String(step.visit));

    const path = url.pathname.split('/').pop() || page.href;

    return `./${path}?${url.searchParams.toString()}`;

  }



  function firstNavigableFlowIndex() {

    return PPT_FLOW.findIndex(step => {

      const page = flowStepPage(step);

      return page && !page.placeholder && page.href;

    });

  }



  function lastNavigableFlowIndex() {

    for (let i = PPT_FLOW.length - 1; i >= 0; i -= 1) {

      const page = flowStepPage(PPT_FLOW[i]);

      if (page && !page.placeholder && page.href) return i;

    }

    return -1;

  }



  function isFirstFlowStep(index) {

    return index >= 0 && index === firstNavigableFlowIndex();

  }



  function isLastFlowStep(index) {

    return index >= 0 && index === PPT_FLOW.length - 1;

  }



  function resolveNavigableFlowIndex(startIndex, direction) {

    let index = startIndex;

    const step = direction > 0 ? 1 : -1;

    while (index >= 0 && index < PPT_FLOW.length) {

      index += step;

      if (index < 0 || index >= PPT_FLOW.length) return -1;

      const page = flowStepPage(PPT_FLOW[index]);

      if (page && !page.placeholder && page.href) return index;

    }

    return -1;

  }



  function prepareReportFlag(step) {

    const page = flowStepPage(step);

    if (!page?.openReport) return;

    try {

      localStorage.setItem('filingDemoOpenReport', 'filingBot');

    } catch (error) {}

  }



  function navigateToFlowIndex(index) {

    const step = PPT_FLOW[index];

    const page = flowStepPage(step);

    const href = buildFlowHref(step);

    if (!step || !page || page.placeholder || !href) return false;

    writeStoredFlowIndex(index);

    prepareReportFlag(step);

    window.location.href = href;

    return true;

  }



  function goNext() {

    const current = currentFlowIndex();

    if (current < 0) return false;

    let nextIndex = resolveNavigableFlowIndex(current, 1);

    if (nextIndex < 0 && isLastFlowStep(current)) {

      nextIndex = firstNavigableFlowIndex();

    }

    if (nextIndex < 0) return false;

    return navigateToFlowIndex(nextIndex);

  }



  function goPrev() {

    const current = currentFlowIndex();

    if (current < 0) return false;

    let prevIndex = resolveNavigableFlowIndex(current, -1);

    if (prevIndex < 0 && isFirstFlowStep(current)) {

      prevIndex = lastNavigableFlowIndex();

    }

    if (prevIndex < 0) return false;

    return navigateToFlowIndex(prevIndex);

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

    const current = currentFlowIndex();

    const prevBtn = root.querySelector('[data-ppt-nav="prev"]');

    const nextBtn = root.querySelector('[data-ppt-nav="next"]');

    const label = root.querySelector('[data-ppt-nav="label"]');

    const step = current >= 0 ? PPT_FLOW[current] : null;

    const hasPrev = current >= 0 && (resolveNavigableFlowIndex(current, -1) >= 0 || isFirstFlowStep(current));

    const hasNext = current >= 0 && (resolveNavigableFlowIndex(current, 1) >= 0 || isLastFlowStep(current));



    if (prevBtn) prevBtn.disabled = !hasPrev;

    if (nextBtn) nextBtn.disabled = !hasNext;

    if (label) {

      label.textContent = step ? flowStepLabel(step) : '演示页';

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



  function syncFlowIndexOnLoad() {

    const index = currentFlowIndex();

    if (index >= 0) writeStoredFlowIndex(index);

  }



  window.DemoPptNav = {

    pages: PPT_PAGES,

    flow: PPT_FLOW,

    keys: {

      next: LS_KEY_NEXT,

      prev: LS_KEY_PREV,

      show: LS_KEY_SHOW,

      flowIndex: LS_KEY_FLOW_INDEX

    },

    defaults: {

      next: DEFAULT_KEY_NEXT,

      prev: DEFAULT_KEY_PREV

    },

    getKeyCodes,

    getCurrentIndex: currentFlowIndex,

    getCurrentPage() {

      const index = currentFlowIndex();

      if (index < 0) return null;

      const step = PPT_FLOW[index];

      const page = flowStepPage(step);

      if (!page) return null;

      return { ...page, flowStep: step, flowIndex: index };

    },

    goNext,

    goPrev,

    goToIndex: navigateToFlowIndex,

    registerInnerKeyHandler,

    refresh: bootstrap

  };



  function bootstrap() {

    syncFlowIndexOnLoad();

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


