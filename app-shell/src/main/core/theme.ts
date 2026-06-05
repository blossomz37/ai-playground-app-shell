import type { ThemeMode } from '@shared/module-contract'

type NativeThemeSource = 'light' | 'dark' | 'system'
const themeModes: ThemeMode[] = ['light', 'dark', 'gray', 'system']

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === 'string' && themeModes.includes(value as ThemeMode)
}

export function toNativeThemeSource(mode: ThemeMode): NativeThemeSource {
  return mode === 'gray' ? 'light' : mode
}

export function themeStartupBackground(mode: ThemeMode, shouldUseDarkColors: boolean): string {
  const nativeMode = toNativeThemeSource(mode)
  const isLight = nativeMode === 'light' || (nativeMode === 'system' && !shouldUseDarkColors)
  return isLight ? '#f5f3f0' : '#1e1e2e'
}
