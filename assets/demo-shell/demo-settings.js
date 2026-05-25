(function () {
  const SWITCH_SECTIONS = [
    {
      title: '界面显示',
      items: [
        {
          key: 'isShowNavAside',
          label: '显示左侧导航栏',
          desc: '演示页左侧步骤导航栏。'
        },
        {
          key: 'isShowFilingHudProgress',
          label: '显示顶部立案流程进度',
          desc: '页面顶部 HUD 进度条。'
        },
        {
          key: 'isShowPptNavControls',
          label: '显示 PPT 前进 / 后退按钮',
          desc: '右下角页级导航按钮；键盘翻页始终生效。'
        }
      ]
    },
    {
      title: '演示辅助按钮',
      items: [
        {
          key: 'isShowDiversionDemoStepBtn',
          label: '显示调解与撤案引导演示下一步',
          desc: '纠纷化解引导页的演示推进按钮。'
        },
        {
          key: 'isShowApplicationDemoStepBtn',
          label: '显示申请书 bot 演示下一步',
          desc: '申请书生成页的演示推进按钮。'
        },
        {
          key: 'isShowApplicationAutoFillBtn',
          label: '显示申请书自动填写模板按钮',
          desc: '申请书生成页的自动填写入口。'
        }
      ]
    }
  ];

  const KEY_ITEMS = [
    {
      key: 'pptNavKeyCodePrev',
      label: '上一页键位',
      desc: 'PPT 演示切换到上一页。'
    },
    {
      key: 'pptNavKeyCodeNext',
      label: '下一页键位',
      desc: 'PPT 演示切换到下一页。'
    }
  ];

  const KEY_CODE_LABELS = {
    8: 'Backspace',
    9: 'Tab',
    13: 'Enter',
    27: 'Esc',
    32: 'Space',
    33: 'PageUp',
    34: 'PageDown',
    35: 'End',
    36: 'Home',
    37: '← 左方向键',
    38: '↑ 上方向键',
    39: '→ 右方向键',
    40: '↓ 下方向键'
  };

  let listeningKey = null;
  let toastTimer = null;

  function formatKeyCode(code) {
    const numeric = Number.parseInt(code, 10);
    if (!Number.isFinite(numeric)) return '未设置';
    if (KEY_CODE_LABELS[numeric]) return KEY_CODE_LABELS[numeric];
    if (numeric >= 65 && numeric <= 90) return String.fromCharCode(numeric);
    if (numeric >= 48 && numeric <= 57) return String.fromCharCode(numeric);
    if (numeric >= 112 && numeric <= 123) return `F${numeric - 111}`;
    return `键码 ${numeric}`;
  }

  function getConfigApi() {
    return window.FilingDemoConfig;
  }

  function readValue(key) {
    return getConfigApi()?.get(key);
  }

  function saveValue(key, value) {
    getConfigApi()?.set(key, value);
    showToast('已保存');
    refreshMeta();
  }

  function showToast(message) {
    const toast = document.getElementById('demoSettingsToast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.classList.remove('is-visible');
    }, 1600);
  }

  function refreshMeta() {
    document.querySelectorAll('[data-setting-meta]').forEach(node => {
      const key = node.getAttribute('data-setting-meta');
      if (!key) return;
      const value = readValue(key);
      node.textContent = String(value ?? '');
    });
  }

  function createSwitchItem(item) {
    const row = document.createElement('div');
    row.className = 'demo-settings-item';
    row.innerHTML = `
      <div class="demo-settings-item-main">
        <p class="demo-settings-item-title">${item.label}</p>
        <p class="demo-settings-item-desc">${item.desc}</p>
        <div class="demo-settings-item-meta"><code>${item.key}</code> = <span data-setting-meta="${item.key}"></span></div>
      </div>
      <label class="demo-settings-switch">
        <input type="checkbox" data-setting-switch="${item.key}" />
        <span class="demo-settings-switch-slider"></span>
      </label>
    `;

    const input = row.querySelector('[data-setting-switch]');
    input.checked = getConfigApi()?.isOn(readValue(item.key));
    input.addEventListener('change', () => {
      saveValue(item.key, input.checked ? 1 : 0);
    });
    return row;
  }

  function createKeyItem(item) {
    const row = document.createElement('div');
    row.className = 'demo-settings-item';
    row.innerHTML = `
      <div class="demo-settings-item-main">
        <p class="demo-settings-item-title">${item.label}</p>
        <p class="demo-settings-item-desc">${item.desc}</p>
        <div class="demo-settings-item-meta"><code>${item.key}</code> = <span data-setting-meta="${item.key}"></span></div>
      </div>
      <button type="button" class="demo-settings-key-btn" data-setting-key="${item.key}"></button>
    `;

    const button = row.querySelector('[data-setting-key]');
    updateKeyButton(button);
    button.addEventListener('click', () => startKeyListening(item.key, button));
    return row;
  }

  function updateKeyButton(button) {
    const key = button.getAttribute('data-setting-key');
    const code = readValue(key);
    const label = formatKeyCode(code);
    button.textContent = listeningKey === key ? '请按下任意键…' : label;
    button.classList.toggle('is-listening', listeningKey === key);
  }

  function startKeyListening(key, button) {
    if (listeningKey === key) {
      stopKeyListening();
      return;
    }
    stopKeyListening();
    listeningKey = key;
    updateKeyButton(button);
    window.addEventListener('keydown', handleKeyCapture, true);
  }

  function stopKeyListening() {
    listeningKey = null;
    window.removeEventListener('keydown', handleKeyCapture, true);
    document.querySelectorAll('[data-setting-key]').forEach(updateKeyButton);
  }

  function handleKeyCapture(event) {
    if (!listeningKey) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      stopKeyListening();
      showToast('已取消');
      return;
    }

    const code = event.keyCode || event.which;
    if (!code || event.metaKey || event.ctrlKey || event.altKey) return;

    event.preventDefault();
    event.stopPropagation();

    const currentKey = listeningKey;
    stopKeyListening();
    saveValue(currentKey, code);
    document.querySelectorAll('[data-setting-key]').forEach(updateKeyButton);
  }

  function renderSections(root) {
    SWITCH_SECTIONS.forEach(section => {
      const block = document.createElement('section');
      block.className = 'demo-settings-section';
      block.innerHTML = `<h2>${section.title}</h2>`;
      section.items.forEach(item => block.appendChild(createSwitchItem(item)));
      root.appendChild(block);
    });

    const keySection = document.createElement('section');
    keySection.className = 'demo-settings-section';
    keySection.innerHTML = '<h2>PPT 页级导航键位</h2><p class="demo-settings-item-desc">点击按钮后按下目标键即可绑定；按 Esc 取消。</p>';
    KEY_ITEMS.forEach(item => keySection.appendChild(createKeyItem(item)));
    root.appendChild(keySection);
  }

  function bindActions() {
    document.getElementById('demoSettingsReset')?.addEventListener('click', () => {
      if (!window.confirm('确定恢复全部演示设置为默认值吗？')) return;
      getConfigApi()?.reset();
      document.querySelectorAll('[data-setting-switch]').forEach(input => {
        const key = input.getAttribute('data-setting-switch');
        input.checked = getConfigApi()?.isOn(readValue(key));
      });
      document.querySelectorAll('[data-setting-key]').forEach(updateKeyButton);
      refreshMeta();
      showToast('已恢复默认');
    });
  }

  function bootstrap() {
    const root = document.getElementById('demoSettingsSections');
    if (!root || !getConfigApi()) return;
    renderSections(root);
    bindActions();
    refreshMeta();
  }

  if (getConfigApi()) {
    bootstrap();
  } else {
    window.addEventListener('filing-demo-config-ready', bootstrap, { once: true });
  }
})();
