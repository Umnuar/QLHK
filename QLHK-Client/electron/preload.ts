import { ipcRenderer, contextBridge } from 'electron'

const electronAPI = {
  secureStore: {
    get: (key: string) => ipcRenderer.invoke('secure-store:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('secure-store:set', { key, value }),
    delete: (key: string) => ipcRenderer.invoke('secure-store:delete', key),
    clear: () => ipcRenderer.invoke('secure-store:clear'),
  },
  openFileDialog: (filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('dialog:open-file', filters),
  setZoom: (level: number) => ipcRenderer.invoke('app:set-zoom', level),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

// Interoperability with QLNN/QLCS standard API bridge
contextBridge.exposeInMainWorld('api', {
  store: electronAPI.secureStore,
  dialog: {
    openFile: electronAPI.openFileDialog,
  },
  app: {
    getVersion: electronAPI.getAppVersion,
    setZoom: electronAPI.setZoom,
  },
})
