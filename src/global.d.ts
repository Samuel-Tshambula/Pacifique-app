interface ElectronAPI {
  platform: string
  printTicket: () => Promise<{ success: boolean }>
}

declare global {
  interface Window {
    api?: ElectronAPI
  }
}

export {}
