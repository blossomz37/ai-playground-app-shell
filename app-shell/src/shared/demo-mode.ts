export const DEMO_MODE_SETTING_KEY = 'demoMode.enabled'
export const AI_API_KEY_REQUIRED_MESSAGE = 'Save an API key before using AI tools.'

export function isDemoModeEnabled(value: unknown): boolean {
  return value === true
}
