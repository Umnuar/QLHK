import { app, BrowserWindow, ipcMain, dialog, Menu, safeStorage, session } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import Store from 'electron-store'

const secureStore = new Store({
  name: 'qlhk-secure-tokens',
  encryptionKey: 'QLHK_ENCRYPTED_STORE_KEY_SECURE_2026',
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

/**
 * Thẩm định nguồn gốc (Sender Frame Origin) của IPC calls theo chuẩn Electron Security v33+ (CWE-287).
 * Chỉ cho phép các request đến từ cửa sổ chính của ứng dụng QLHK (dev URL hoặc file:// local).
 */
export function validateSender(event: Electron.IpcMainInvokeEvent): boolean {
  const frame = event.senderFrame
  if (!frame) return false

  const url = frame.url
  if (VITE_DEV_SERVER_URL) {
    try {
      const parsed = new URL(url)
      const dev = new URL(VITE_DEV_SERVER_URL)
      return parsed.origin === dev.origin
    } catch {
      return false
    }
  }

  // Trong production build, chỉ chấp nhận file:// protocol nạp từ dist
  return url.startsWith('file://')
}

function createWindow() {
  win = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 650,
    useContentSize: true,
    autoHideMenuBar: true,
    title: 'Quản Lý Hộ Khẩu - Nhân Khẩu - Xã Đăk Hà',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  win.removeMenu()
  win.setMenu(null)
  win.setMenuBarVisibility(false)

  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown') {
      // F12 hoặc Ctrl+Shift+I để bật/tắt DevTools (chỉ trong dev hoặc unpacked)
      if (
        (!app.isPackaged || VITE_DEV_SERVER_URL) &&
        (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))
      ) {
        win?.webContents.toggleDevTools();
        event.preventDefault();
      }
      // F5 hoặc Ctrl+R để tải lại trang
      if (input.key === 'F5' || (input.control && !input.shift && input.key.toLowerCase() === 'r')) {
        win?.webContents.reload();
        event.preventDefault();
      }
    }
  });

  // 1. Chặn mở cửa sổ mới trái phép (CWE-94)
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.warn(`[Security] Blocked unauthorized window.open request to: ${url}`)
    return { action: 'deny' }
  })

  // 2. Chặn điều hướng ngoài (will-navigate)
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    let isAllowed = false
    try {
      const target = new URL(navigationUrl)
      if (VITE_DEV_SERVER_URL) {
        const dev = new URL(VITE_DEV_SERVER_URL)
        isAllowed = target.origin === dev.origin
      } else {
        isAllowed = target.protocol === 'file:'
      }
    } catch {
      isAllowed = false
    }

    if (!isAllowed) {
      event.preventDefault()
      console.warn(`[Security] Blocked unauthorized will-navigate to: ${navigationUrl}`)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.webContents.on('console-message', (_e, level, msg) => {
    console.log(`[Renderer ${level}] ${msg}`)
  })
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)

    // Từ chối toàn bộ yêu cầu quyền phần cứng không cần thiết (CWE-250)
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      console.warn(`[Security] Denied hardware/system permission request for: ${permission}`)
      callback(false)
    })

    createWindow()
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC: Secure Token Store (DPAPI via safeStorage + AES Store fallback)
ipcMain.handle('secure-store:get', (event, key: string) => {
  if (!validateSender(event)) {
    console.warn('[Security] Unauthorized IPC invocation on secure-store:get')
    return null
  }
  try {
    const raw = secureStore.get(key) as any
    if (raw && typeof raw === 'object' && raw._safeEncrypted && typeof raw.payload === 'string') {
      if (safeStorage.isEncryptionAvailable()) {
        const decrypted = safeStorage.decryptString(Buffer.from(raw.payload, 'base64'))
        return JSON.parse(decrypted)
      }
    }
    return raw
  } catch (err) {
    console.error('secure-store:get error:', err)
    return null
  }
})

ipcMain.handle('secure-store:set', (event, { key, value }: { key: string; value: any }) => {
  if (!validateSender(event)) {
    console.warn('[Security] Unauthorized IPC invocation on secure-store:set')
    return false
  }
  try {
    if (safeStorage.isEncryptionAvailable()) {
      const stringified = JSON.stringify(value)
      const encrypted = safeStorage.encryptString(stringified).toString('base64')
      secureStore.set(key, { _safeEncrypted: true, payload: encrypted })
    } else {
      secureStore.set(key, value)
    }
    return true
  } catch (err) {
    console.error('secure-store:set error:', err)
    return false
  }
})

ipcMain.handle('secure-store:delete', (event, key: string) => {
  if (!validateSender(event)) {
    console.warn('[Security] Unauthorized IPC invocation on secure-store:delete')
    return false
  }
  try {
    secureStore.delete(key)
    return true
  } catch (err) {
    console.error('secure-store:delete error:', err)
    return false
  }
})

ipcMain.handle('secure-store:clear', (event) => {
  if (!validateSender(event)) {
    console.warn('[Security] Unauthorized IPC invocation on secure-store:clear')
    return false
  }
  try {
    secureStore.clear()
    return true
  } catch (err) {
    console.error('secure-store:clear error:', err)
    return false
  }
})

// IPC: App dialogs
ipcMain.handle('dialog:open-file', async (event, filters?: { name: string; extensions: string[] }[]) => {
  if (!validateSender(event)) {
    console.warn('[Security] Unauthorized IPC invocation on dialog:open-file')
    return null
  }
  if (!win) return null
  const defaultFilters = filters && filters.length > 0 ? filters : [
    { name: 'File Excel (*.xlsx, *.xls)', extensions: ['xlsx', 'xls'] },
    { name: 'Tất cả các file', extensions: ['*'] },
  ]
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: defaultFilters,
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  const filePath = result.filePaths[0]
  try {
    const fileBuffer = fs.readFileSync(filePath)
    return {
      filePath,
      fileName: path.basename(filePath),
      data: fileBuffer.toString('base64'),
    }
  } catch (err: any) {
    return {
      filePath,
      fileName: path.basename(filePath),
      error: err.message,
    }
  }
})

// IPC: Zoom & App Version
ipcMain.handle('get-app-version', (event) => {
  if (!validateSender(event)) return ''
  return app.getVersion()
})
ipcMain.handle('app:version', (event) => {
  if (!validateSender(event)) return ''
  return app.getVersion()
})

ipcMain.handle('app:set-zoom', (event, level: number) => {
  if (!validateSender(event)) return
  if (win && win.webContents) {
    win.webContents.setZoomFactor(level / 100)
  }
})
