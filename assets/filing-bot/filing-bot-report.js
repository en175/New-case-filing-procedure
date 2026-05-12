// Report and route extension point for filing bot pages.
window.FilingBotRouteActions = window.FilingBotRouteActions || {
  goMediationResult() {
    try { localStorage.setItem('filingDemoSelectedRoute', 'mediation'); } catch (error) {}
    window.location.href = './调解申请提交结果.html';
  },
  goArbitrationPath() {
    window.location.href = './案件路径图.html';
  }
};
