/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    VSCODE_DEBUG?: 'true'
    DIST_ELECTRON: string
    DIST: string
    VITE_DEV_SERVER_URL: string
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

interface ElectronFileResult {
  filePath: string
  fileName: string
  data?: string
  error?: string
}

interface ElectronAPI {
  secureStore: {
    get: (key: string) => Promise<any>
    set: (key: string, value: any) => Promise<boolean>
    delete: (key: string) => Promise<boolean>
    clear: () => Promise<boolean>
  }
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) => Promise<ElectronFileResult | null>
  setZoom: (level: number) => Promise<void>
  getAppVersion: () => Promise<string>
}

interface Window {
  electronAPI?: ElectronAPI
  api?: {
    store: ElectronAPI['secureStore']
    dialog: {
      openFile: ElectronAPI['openFileDialog']
    }
    app: {
      getVersion: () => Promise<string>
      setZoom: (level: number) => Promise<void>
    }
  }
}
