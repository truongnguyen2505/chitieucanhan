import test from 'node:test';
import assert from 'node:assert/strict';
import { createInstallManager } from '../src/install.js';

function browser({ standalone = false, iosStandalone = false, media = true } = {}) {
 const target = new EventTarget();
 target.navigator = { standalone: iosStandalone };
 target.displayMode = new EventTarget();
 target.displayMode.matches = standalone;
 if (media) target.matchMedia = () => target.displayMode;
 return target;
}
function offer(target, { outcome = 'accepted', prompt = async () => {}, userChoice } = {}) {
 const event = new Event('beforeinstallprompt', { cancelable: true });
 event.prompt = prompt;
 event.userChoice = userChoice || Promise.resolve({ outcome });
 target.dispatchEvent(event);
 return event;
}

test('unsupported browsers leave manual installation available without invoking a prompt', async () => {
 const manager = createInstallManager(browser({ media: false }));
 assert.equal(manager.getState().canInstall, false);
 assert.equal(manager.getState().isInstalled, false);
 assert.equal(await manager.install(), 'unavailable');
 manager.dispose();
});

test('an accepted prompt is one-use; installation is confirmed by the browser event', async () => {
 const target = browser(), changes = [];
 const manager = createInstallManager(target, state => changes.push(state));
 let prompts = 0;
 const event = offer(target, { prompt: async () => { prompts++; } });
 assert.equal(event.defaultPrevented, true);
 assert.equal(manager.getState().canInstall, true);
 assert.equal(await manager.install(), 'accepted');
 assert.equal(manager.getState().isInstalled, false);
 assert.equal(await manager.install(), 'unavailable');
 assert.equal(prompts, 1);
 target.dispatchEvent(new Event('appinstalled'));
 assert.equal(manager.getState().isInstalled, true);
 assert.equal(manager.getState().canInstall, false);
 assert.equal(manager.getState().message, '');
 assert.ok(changes.some(state => state.isInstalling));
 manager.dispose();
});

test('dismissing a prompt allows a fresh browser event to offer installation again', async () => {
 const target = browser(), manager = createInstallManager(target);
 offer(target, { outcome: 'dismissed' });
 assert.equal(await manager.install(), 'dismissed');
 assert.equal(manager.getState().isInstalled, false);
 assert.equal(manager.getState().canInstall, false);
 offer(target);
 assert.equal(manager.getState().canInstall, true);
 assert.equal(manager.getState().message, '');
 assert.equal(await manager.install(), 'accepted');
 manager.dispose();
});

test('repeated clicks cannot open concurrent browser prompts', async () => {
 const target = browser(), manager = createInstallManager(target);
 let finish, prompts = 0;
 offer(target, { prompt: async () => { prompts++; }, userChoice: new Promise(resolve => { finish = resolve; }) });
 const first = manager.install();
 assert.equal(manager.getState().isInstalling, true);
 assert.equal(await manager.install(), 'pending');
 finish({ outcome: 'dismissed' });
 assert.equal(await first, 'dismissed');
 assert.equal(prompts, 1);
 assert.equal(manager.getState().isInstalling, false);
 manager.dispose();
});

test('prompt failures fall back to instructions and can recover with a new event', async () => {
 const target = browser(), manager = createInstallManager(target);
 offer(target, { prompt: async () => { throw new Error('expired'); } });
 assert.equal(await manager.install(), 'failed');
 assert.equal(manager.getState().isInstalling, false);
 assert.equal(manager.getState().canInstall, false);
 assert.ok(manager.getState().message);
 offer(target);
 assert.equal(await manager.install(), 'accepted');
 manager.dispose();
});

test('standalone Android and iOS launches suppress installation; display-mode changes are observed', async () => {
 for (const options of [{ standalone: true }, { iosStandalone: true }]) {
  const target = browser(options), manager = createInstallManager(target);
  offer(target);
  assert.equal(manager.getState().isInstalled, true);
  assert.equal(manager.getState().canInstall, false);
  assert.equal(await manager.install(), 'installed');
  manager.dispose();
 }
 const target = browser(), manager = createInstallManager(target);
 offer(target);
 const change = new Event('change');
 change.matches = true;
 target.displayMode.dispatchEvent(change);
 assert.equal(manager.getState().isInstalled, true);
 assert.equal(manager.getState().canInstall, false);
 manager.dispose();
});

test('disposing the manager removes listeners and ignores a pending prompt completion', async () => {
 const target = browser(), changes = [];
 const manager = createInstallManager(target, state => changes.push(state));
 let finish;
 offer(target, { userChoice: new Promise(resolve => { finish = resolve; }) });
 const pending = manager.install();
 manager.dispose();
 const count = changes.length;
 offer(target);
 target.dispatchEvent(new Event('appinstalled'));
 finish({ outcome: 'accepted' });
 await pending;
 assert.equal(changes.length, count);
 assert.equal(await manager.install(), 'unavailable');
});
