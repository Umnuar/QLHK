import { describe, expect, it, vi } from 'vitest';

class MockBrowserWindow {
  removeMenu = vi.fn();
  setMenu = vi.fn();
  setMenuBarVisibility = vi.fn();
  loadURL = vi.fn();
  loadFile = vi.fn();
  webContents = {
    on: vi.fn(),
    setWindowOpenHandler: vi.fn(),
    toggleDevTools: vi.fn(),
    reload: vi.fn(),
    setZoomFactor: vi.fn(),
  };
  static getAllWindows = vi.fn(() => []);
}

vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn(() => '1.0.0'),
    requestSingleInstanceLock: vi.fn(() => true),
    quit: vi.fn(),
    on: vi.fn(),
    whenReady: vi.fn(() => Promise.resolve()),
    isPackaged: false,
  },
  BrowserWindow: MockBrowserWindow,
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
  Menu: {
    setApplicationMenu: vi.fn(),
  },
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => true),
  },
  session: {
    defaultSession: {
      setPermissionRequestHandler: vi.fn(),
    },
  },
}));

vi.mock('electron-store', () => ({
  default: class MockStore {
    get = vi.fn();
    set = vi.fn();
    delete = vi.fn();
    clear = vi.fn();
  },
}));

describe('Electron Shell Security Hardening (CWE-94, CWE-287, CWE-250)', () => {
  it('thẩm định nguồn gốc sender frame hợp lệ và chặn các nguồn lạ (CWE-287)', async () => {
    const { validateSender } = await import('../../electron/main');

    // 1. Frame rỗng -> chặn
    expect(validateSender({} as any)).toBe(false);

    // 2. Frame từ trang web ngoài trái phép -> chặn
    expect(validateSender({ senderFrame: { url: 'https://attacker.site/phishing' } } as any)).toBe(false);

    // 3. Frame từ giao thức độc hại (javascript:, data:) -> chặn
    expect(validateSender({ senderFrame: { url: 'javascript:alert(1)' } } as any)).toBe(false);
    expect(validateSender({ senderFrame: { url: 'data:text/html,<h1>hack</h1>' } } as any)).toBe(false);

    // 4. Frame cục bộ hợp lệ (file://) -> chấp nhận
    expect(validateSender({ senderFrame: { url: 'file:///C:/Projects/QLHK/QLHK-Client/dist/index.html' } } as any)).toBe(true);
  });
});
