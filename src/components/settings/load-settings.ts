// Settings (and its slider/switch/toggle components) is its own chunk. It is fetched once the app is idle after
// starting, or when the pointer or focus reaches a way in, so opening it doesn't wait for the download.
export const loadSettingsPanel = () => import('@/components/settings/SettingsPanel')

export const preloadSettings = () => void loadSettingsPanel()
