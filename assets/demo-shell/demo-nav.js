(function () {
  const navItems = [
    {
      group: '主流程',
      items: [
        { key: 'index', short: '1', title: '第一步', desc: '申请书准备方式', href: './index.html' },
        { key: 'step2', short: '2', title: '材料提取', desc: 'AI 解析核对', href: './Step2SmartExtraction.html' },
        { key: 'diversion', short: '3', title: '调解与撤案引导', desc: '路径确认', href: './调解&撤案引导bot.html' },
        { key: 'filing', short: '4', title: '智能立案助手', desc: '生成申请书', href: './申请书bot.html' },
        { key: 'report', short: '5', title: '评估报告', desc: '风险与路径建议', href: './申请书bot.html?demoStage=report', openReport: true }
      ]
    },
    {
      group: '辅助流程',
      items: [
        { key: 'followup', short: '路', title: '后续路径', desc: '路径选择卡片', href: './立案提交后路径选择.html' },
        { key: 'qa', short: '问', title: '答题关卡', desc: '普法问答', href: './游戏化问答.html' },
        { key: 'defense', short: '辩', title: '抗辩模拟', desc: '对方视角', href: './抗辩机器人.html' },
        { key: 'path', short: '图', title: '案件路径图', desc: '仲裁调解对比', href: './案件路径图.html' }
      ]
    }
  ];

  const pageKeyByFile = {
    'index.html': 'index',
    'Step2SmartExtraction.html': 'step2',
    '调解&撤案引导bot.html': 'diversion',
    '申请书bot.html': 'filing',
    '立案提交后路径选择.html': 'followup',
    '游戏化问答.html': 'qa',
    '抗辩机器人.html': 'defense',
    '案件路径图.html': 'path'
  };

  function currentPageKey() {
    const file = decodeURIComponent(window.location.pathname.split('/').pop() || 'index.html');
    const query = new URLSearchParams(window.location.search);
    if (file === '申请书bot.html' && query.get('demoStage') === 'report') return 'report';
    return pageKeyByFile[file] || '';
  }

  function setExpanded(expanded) {
    document.body.classList.toggle('demo-nav-expanded', expanded);
    try {
      localStorage.setItem('filingDemoNavExpanded', expanded ? '1' : '0');
    } catch (error) {}
  }

  function createNav() {
    if (document.querySelector('.demo-global-nav')) return;
    const originalPaddingLeft = window.getComputedStyle(document.body).paddingLeft || '0px';
    document.body.style.setProperty('--demo-body-pad-left', originalPaddingLeft);
    document.body.classList.add('demo-nav-ready');

    let expanded = true;
    try {
      expanded = localStorage.getItem('filingDemoNavExpanded') !== '0';
    } catch (error) {}
    setExpanded(expanded);

    const activeKey = currentPageKey();
    const nav = document.createElement('aside');
    nav.className = 'demo-global-nav';
    nav.setAttribute('aria-label', '新立案流程演示导航');

    const groups = navItems.map(group => {
      const links = group.items.map(item => {
        const active = item.key === activeKey ? ' active' : '';
        const attrs = item.openReport ? ' data-open-report="1"' : '';
        return `<a class="demo-nav-link${active}" href="${item.href}" data-key="${item.key}"${attrs} title="${item.title}">
          <span class="demo-nav-index">${item.short}</span>
          <span class="demo-nav-copy"><strong>${item.title}</strong><span>${item.desc}</span></span>
        </a>`;
      }).join('');
      return `<section class="demo-nav-group">
        <div class="demo-nav-group-title">${group.group}</div>
        ${links}
      </section>`;
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
      <div class="demo-nav-scroll">${groups}</div>
    `;

    nav.querySelector('.demo-nav-toggle').addEventListener('click', () => {
      setExpanded(!document.body.classList.contains('demo-nav-expanded'));
    });
    nav.addEventListener('click', event => {
      const link = event.target.closest('a[data-open-report]');
      if (!link) return;
      try {
        localStorage.setItem('filingDemoOpenReport', 'filingBot');
      } catch (error) {}
    });

    document.body.appendChild(nav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createNav);
  } else {
    createNav();
  }
})();
