/**
 * Themed notice modal — reusable mask + dialog.
 * Usage:
 *   ThemedNoticeModal.init({ theme: 'aiService' });
 *   ThemedNoticeModal.show({ theme: 'aiService', paragraphs: [...] });
 */
(function (global) {
  'use strict';

  const THEMES = {
    aiService: {
      className: 'tnm-theme--ai-service',
      iconHtml: '<i class="fas fa-scale-balanced" aria-hidden="true"></i>',
      title: 'AI 辅助服务使用提示',
      paragraphs: [
        '本系统提供的智能问答、材料识别、内容生成、风险提示等 AI 辅助能力，仅用于帮助当事人梳理案件事实、整理申请材料和生成文书参考内容。',
        'AI 生成或提示的内容不代表广州仲裁委员会、本委工作人员、调解员、仲裁庭或任何案件处理人员的意见，不构成法律意见、裁判意见或案件结果承诺。',
        '当事人应对其提交材料、陈述内容及确认提交的文书内容的真实性、准确性、完整性负责。系统生成内容需由当事人自行核对、修改并确认后使用。'
      ],
      confirmText: '我已知晓并继续'
    }
  };

  let maskEl = null;
  let previousBodyOverflow = '';
  let isOpen = false;

  function pickOverrides(overrides) {
    const picked = {};
    if (!overrides) return picked;
    ['title', 'paragraphs', 'confirmText', 'iconHtml', 'className'].forEach(function (key) {
      if (overrides[key] !== undefined && overrides[key] !== null) {
        picked[key] = overrides[key];
      }
    });
    return picked;
  }

  function resolveTheme(themeKey, overrides) {
    const base = THEMES[themeKey] || THEMES.aiService;
    return Object.assign({}, base, pickOverrides(overrides));
  }

  function ensureMask() {
    if (maskEl) return maskEl;
    maskEl = document.createElement('div');
    maskEl.className = 'tnm-mask';
    maskEl.setAttribute('role', 'dialog');
    maskEl.setAttribute('aria-modal', 'true');
    maskEl.setAttribute('aria-hidden', 'true');
    maskEl.addEventListener('click', close);
    document.body.appendChild(maskEl);
    return maskEl;
  }

  function renderDialog(theme) {
    const mask = ensureMask();
    mask.className = 'tnm-mask ' + (theme.className || '');
    mask.setAttribute('aria-label', theme.title || '提示');

    const paragraphsHtml = (theme.paragraphs || [])
      .map(function (text) {
        return '<p>' + escapeHtml(text) + '</p>';
      })
      .join('');

    mask.innerHTML =
      '<div class="tnm-dialog">' +
        '<div class="tnm-header">' +
          '<div class="tnm-icon">' + (theme.iconHtml || '') + '</div>' +
          '<h2 class="tnm-title">' + escapeHtml(theme.title || '') + '</h2>' +
        '</div>' +
        '<div class="tnm-body">' + paragraphsHtml + '</div>' +
        '<div class="tnm-footer">' +
          '<button type="button" class="tnm-btn">' + escapeHtml(theme.confirmText || '确定') + '</button>' +
        '</div>' +
      '</div>';

    return mask;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function show(options) {
    const opts = options || {};
    const theme = resolveTheme(opts.theme || 'aiService', opts);
    renderDialog(theme);
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    maskEl.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(function () {
      maskEl.classList.add('tnm-mask--show');
    });
    isOpen = true;
    if (typeof opts.onShow === 'function') opts.onShow();
    return ThemedNoticeModal;
  }

  function close() {
    if (!maskEl || !isOpen) return ThemedNoticeModal;
    maskEl.classList.remove('tnm-mask--show');
    maskEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousBodyOverflow;
    isOpen = false;
    return ThemedNoticeModal;
  }

  function init(options) {
    const opts = Object.assign(
      {
        theme: 'aiService',
        autoShow: true,
        delay: 120,
        when: null
      },
      options || {}
    );

    function tryShow() {
      if (typeof opts.when === 'function' && !opts.when()) return;
      if (!opts.autoShow) return;
      setTimeout(function () {
        show(Object.assign({ theme: opts.theme }, pickOverrides(opts)));
      }, opts.delay);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryShow, { once: true });
    } else {
      tryShow();
    }
    return ThemedNoticeModal;
  }

  const ThemedNoticeModal = {
    THEMES: THEMES,
    show: show,
    close: close,
    init: init,
    isOpen: function () {
      return isOpen;
    }
  };

  global.ThemedNoticeModal = ThemedNoticeModal;
})(typeof window !== 'undefined' ? window : globalThis);
