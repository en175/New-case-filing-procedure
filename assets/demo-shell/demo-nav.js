(function () {
  const navItems = [
    { key: 'index', short: '1', title: '申请书准备方式', href: './index.html' },
    { key: 'filing', short: '2', title: 'AI生成申请书bot', href: './申请书bot.html', bot: true },
    { key: 'step2', short: '3', title: 'step2:提交案件材料', href: './Step2SmartExtraction.html' },
    { key: 'step3', short: '4', title: 'step3:申请人信息', href: './Step3PartyConfirmation.html' },
    { key: 'step4', short: '5', title: 'step4:被申请人信息', href: './Step4RespondentConfirmation.html' },
    { key: 'diversionBot', short: '6', title: '调解/仲裁引导bot', href: './调解&撤案引导bot.html', bot: true },
    { key: 'qa', short: '7', title: '游戏化问答', href: './游戏化问答.html' },
    { key: 'defense', short: '8', title: 'AI模拟被申请人bot', href: './抗辩机器人.html', bot: true },
    { key: 'path', short: '9', title: '调解/仲裁路径对比', href: './案件路径图.html' },
    { key: 'step5', short: '10', title: 'step5:案件信息确认', href: './Step5CaseInfoConfirmation.html' },
    { key: 'step6', short: '11', title: 'step6:送达地址确认', href: './Step6DeliveryAddressConfirmation.html' },
    { key: 'report', short: '12', title: '案件评估报告', href: './案件评估报告.html' }
  ];

  const pageKeyByFile = {
    'index.html': 'index',
    '申请书bot.html': 'filing',
    'Step2SmartExtraction.html': 'step2',
    'Step3PartyConfirmation.html': 'step3',
    'Step4RespondentConfirmation.html': 'step4',
    '调解&撤案引导bot.html': 'diversionBot',
    '游戏化问答.html': 'qa',
    '抗辩机器人.html': 'defense',
    '案件路径图.html': 'path',
    'Step5CaseInfoConfirmation.html': 'step5',
    'Step6DeliveryAddressConfirmation.html': 'step6',
    '案件评估报告.html': 'report'
  };

  function currentPageKey() {
    const file = decodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
    return pageKeyByFile[file] || '';
  }

  function isConfigOn(value) {
    const isOn = window.FilingDemoConfig?.isOn || (nextValue => nextValue === 1 || nextValue === '1');
    return isOn(value);
  }

  function setExpanded(expanded) {
    document.body.classList.toggle('demo-nav-expanded', expanded);
  }

  /** isShowNavAside=0 时彻底移除导航，避免残留坍缩态（窄条 + 左侧留白） */
  function teardownNav() {
    document.querySelectorAll('.demo-global-nav').forEach(node => node.remove());
    document.body.classList.remove('demo-nav-ready', 'demo-nav-expanded');
    document.body.style.removeProperty('--demo-body-pad-left');
  }

  function applyHudProgressConfig(config) {
    document.body.classList.toggle('demo-hide-filing-hud-progress', !isConfigOn(config.isShowFilingHudProgress));
  }

  function createNav() {
    const demoConfig = window.FilingDemoConfig?.load?.() || { isShowNavAside: 1 };
    applyHudProgressConfig(demoConfig);
    if (!isConfigOn(demoConfig.isShowNavAside)) {
      teardownNav();
      return;
    }
    if (document.querySelector('.demo-global-nav')) return;
    const originalPaddingLeft = window.getComputedStyle(document.body).paddingLeft || '0px';
    document.body.style.setProperty('--demo-body-pad-left', originalPaddingLeft);
    document.body.classList.add('demo-nav-ready');

    setExpanded(true);

    const activeKey = currentPageKey();
    const nav = document.createElement('aside');
    nav.className = 'demo-global-nav';
    nav.setAttribute('aria-label', '新立案流程演示导航');

    const links = navItems.map(item => {
      const active = item.key === activeKey ? ' active' : '';
      const botIcon = item.bot ? `<span class="demo-nav-bot-icon" aria-label="bot页面" title="bot页面">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <rect x="4.2" y="6.5" width="11.6" height="9" rx="3" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 3.6v2.3M7.6 10.4h.05M12.35 10.4h.05M7.7 13.2h4.6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M4.2 9.2H2.7M17.3 9.2h-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </span>` : '';
      return `<a class="demo-nav-link${active}" href="${item.href}" data-key="${item.key}" title="${item.title}">
        <span class="demo-nav-index">${item.short}</span>
        <span class="demo-nav-copy"><strong>${item.title}</strong>${botIcon}</span>
      </a>`;
    }).join('');

    nav.innerHTML = `
      <div class="demo-nav-head">
        <div class="demo-nav-logo" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M12 3.75a8.25 8.25 0 1 0 0 16.5 8.25 8.25 0 0 0 0-16.5Z" stroke="currentColor" stroke-width="1.8"/>
            <path d="m15.9 8.1-2.05 5.72a1.25 1.25 0 0 1-.77.77L7.36 16.64l2.05-5.72c.13-.37.42-.66.79-.79L15.9 8.1Z" fill="currentColor"/>
            <path d="M12 2.25v2.2M12 19.55v2.2M2.25 12h2.2M19.55 12h2.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="demo-nav-title"><strong>新立案流程</strong><span>演示导航</span></div>
      </div>
      <button class="demo-nav-toggle" type="button" aria-label="展开或收起演示导航"><span>‹</span></button>
      <div class="demo-nav-scroll">${links}</div>
    `;

    nav.querySelector('.demo-nav-toggle').addEventListener('click', () => {
      setExpanded(!document.body.classList.contains('demo-nav-expanded'));
    });

    document.body.appendChild(nav);
  }

  function startNavAfterConfigReady() {
    if (!window.FilingDemoConfig) {
      window.addEventListener('filing-demo-config-ready', startNavAfterConfigReady, { once: true });
      return;
    }
    createNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startNavAfterConfigReady);
  } else {
    startNavAfterConfigReady();
  }

  window.addEventListener('filing-demo-config-change', event => {
    const config = event.detail || {};
    applyHudProgressConfig(config);
    if (!isConfigOn(config.isShowNavAside)) {
      teardownNav();
      return;
    }
    createNav();
  });
})();
