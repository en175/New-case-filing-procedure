(function () {
  const LEGACY_JSON_KEY = 'filingDemoConfig';

  /** 演示配置默认值；每个配置字段单独存为一个 localStorage key */
  const DEFAULT_CONFIG = {
    /** 是否显示左侧导航栏 */
    isShowNavAside: 0,
    /** 是否显示顶部立案流程进度 */
    isShowFilingHudProgress: 0,
    /** 是否显示调解与撤案引导 bot 的演示下一步按钮 */
    isShowDiversionDemoStepBtn: 0,
    /** 是否显示申请书 bot 的演示下一步按钮 */
    isShowApplicationDemoStepBtn: 0,
    /** 是否显示申请书 bot 的自动填写模板按钮 */
    isShowApplicationAutoFillBtn: 0,
    /** 是否显示 PPT 页级前进 / 后退控件 */
    isShowPptNavControls: 0,
    /** PPT 下一页键位 keyCode，默认右方向键 39 */
    pptNavKeyCodeNext: 39,
    /** PPT 上一页键位 keyCode，默认左方向键 37 */
    pptNavKeyCodePrev: 37
  };

  /** 开关类字段统一用 0/1 存储，便于在 LS 里直接改 */
  const SWITCH_KEYS = new Set([
    'isShowNavAside',
    'isShowFilingHudProgress',
    'isShowDiversionDemoStepBtn',
    'isShowApplicationDemoStepBtn',
    'isShowApplicationAutoFillBtn',
    'isShowPptNavControls'
  ]);

  const NUMERIC_KEYS = new Set([
    'pptNavKeyCodeNext',
    'pptNavKeyCodePrev'
  ]);

  function isOn(value) {
    return value === 1 || value === '1' || value === true;
  }

  function toSwitch(value) {
    return isOn(value) ? 1 : 0;
  }

  function normalizeNumeric(key, value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_CONFIG[key];
    return parsed;
  }

  function normalizeValue(key, value) {
    if (SWITCH_KEYS.has(key)) return toSwitch(value);
    if (NUMERIC_KEYS.has(key)) return normalizeNumeric(key, value);
    return value;
  }

  function hasDefaultKey(key) {
    return Object.prototype.hasOwnProperty.call(DEFAULT_CONFIG, key);
  }

  function getConfig(key) {
    try {
      const value = localStorage.getItem(key);
      if (value === null && hasDefaultKey(key)) return DEFAULT_CONFIG[key];
      return normalizeValue(key, value);
    } catch (error) {
      return hasDefaultKey(key) ? DEFAULT_CONFIG[key] : undefined;
    }
  }

  function loadConfig() {
    bootstrapConfig();
    return Object.keys(DEFAULT_CONFIG).reduce((config, key) => {
      config[key] = getConfig(key);
      return config;
    }, {});
  }

  function emitChange(config) {
    window.dispatchEvent(new CustomEvent('filing-demo-config-change', { detail: config }));
  }

  function setConfig(key, value, options = {}) {
    const nextValue = normalizeValue(key, value);
    try {
      localStorage.setItem(key, String(nextValue));
    } catch (error) {}
    const nextConfig = loadConfig();
    if (!options.silent) emitChange(nextConfig);
    return nextConfig;
  }

  function saveConfig(nextConfig) {
    Object.keys(nextConfig || {}).forEach(key => {
      setConfig(key, nextConfig[key], { silent: true });
    });
    const config = loadConfig();
    emitChange(config);
    return config;
  }

  function removeConfig(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {}
    const config = loadConfig();
    emitChange(config);
    return config;
  }

  function resetConfig() {
    Object.keys(DEFAULT_CONFIG).forEach(key => {
      try {
        localStorage.setItem(key, String(DEFAULT_CONFIG[key]));
      } catch (error) {}
    });
    const config = loadConfig();
    emitChange(config);
    return config;
  }

  function migrateLegacyJsonConfig() {
    try {
      const raw = localStorage.getItem(LEGACY_JSON_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        !Array.isArray(parsed) &&
        Object.prototype.hasOwnProperty.call(parsed, 'isShowNavAside') &&
        localStorage.getItem('isShowNavAside') === null
      ) {
        localStorage.setItem('isShowNavAside', String(toSwitch(parsed.isShowNavAside)));
      }
      localStorage.removeItem(LEGACY_JSON_KEY);
    } catch (error) {}
  }

  /** 本地无缓存时，按 DEFAULT_CONFIG 初始化一份可直接手改的 LS key */
  function bootstrapConfig() {
    Object.keys(DEFAULT_CONFIG).forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value === null) {
          localStorage.setItem(key, String(DEFAULT_CONFIG[key]));
          return;
        }
        const normalized = normalizeValue(key, value);
        if (String(normalized) !== value) {
          localStorage.setItem(key, String(normalized));
        }
      } catch (error) {}
    });
    return Object.keys(DEFAULT_CONFIG).reduce((config, key) => {
      config[key] = getConfig(key);
      return config;
    }, {});
  }

  migrateLegacyJsonConfig();
  const currentConfig = bootstrapConfig();

  window.FilingDemoConfig = {
    defaults: DEFAULT_CONFIG,
    switchKeys: SWITCH_KEYS,
    isOn,
    toSwitch,
    read: loadConfig,
    write: saveConfig,
    load: loadConfig,
    save: saveConfig,
    patch: saveConfig,
    get: getConfig,
    set: setConfig,
    remove: removeConfig,
    reset: resetConfig
  };

  window.dispatchEvent(new CustomEvent('filing-demo-config-ready', { detail: currentConfig }));
})();
