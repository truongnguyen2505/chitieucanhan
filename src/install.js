// Keep the browser's one-use install event until a user explicitly requests it.
export function createInstallManager(browser, onChange = () => {}) {
  const displayMode = browser.matchMedia?.('(display-mode: standalone)');
  let pendingPrompt = null;
  let disposed = false;
  let state = {
    canInstall: false,
    isInstalled: Boolean(displayMode?.matches || browser.navigator?.standalone),
    isInstalling: false,
    message: ''
  };
  const getState = () => ({ ...state });
  function update(patch) {
    if (disposed) return;
    state = { ...state, ...patch };
    onChange(getState());
  }
  function beforeInstall(event) {
    event.preventDefault();
    if (state.isInstalled || state.isInstalling) return;
    pendingPrompt = event;
    update({ canInstall: true, message: '' });
  }
  function installed() {
    pendingPrompt = null;
    update({ isInstalled: true, canInstall: false, isInstalling: false, message: '' });
  }
  function displayChanged(event) {
    if (event.matches) installed();
    else update({ isInstalled: Boolean(browser.navigator?.standalone) });
  }
  browser.addEventListener('beforeinstallprompt', beforeInstall);
  browser.addEventListener('appinstalled', installed);
  displayMode?.addEventListener?.('change', displayChanged);
  return {
    getState,
    async install() {
      if (disposed) return 'unavailable';
      if (state.isInstalled) return 'installed';
      if (state.isInstalling) return 'pending';
      if (!pendingPrompt) return 'unavailable';
      const event = pendingPrompt;
      pendingPrompt = null;
      update({ canInstall: false, isInstalling: true, message: '' });
      try {
        await event.prompt();
        const { outcome } = await event.userChoice;
        if (state.isInstalled) return 'installed';
        update({ message: outcome === 'accepted'
          ? 'Hãy hoàn tất cài đặt theo hướng dẫn của trình duyệt.'
          : 'Bạn có thể thêm vào màn hình chính sau bằng menu trình duyệt.' });
        return outcome;
      } catch {
        update({ message: 'Chưa mở được hộp thoại cài đặt. Bạn hãy làm theo hướng dẫn bên dưới.' });
        return 'failed';
      } finally {
        update({ isInstalling: false });
      }
    },
    dispose() {
      disposed = true;
      pendingPrompt = null;
      browser.removeEventListener('beforeinstallprompt', beforeInstall);
      browser.removeEventListener('appinstalled', installed);
      displayMode?.removeEventListener?.('change', displayChanged);
    }
  };
}
