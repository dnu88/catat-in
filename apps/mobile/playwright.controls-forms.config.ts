import { defineConfig, devices } from '@playwright/test'
import base from './playwright.experience.config'

export default defineConfig({
  ...base,
  testMatch: 'controls-forms.spec.ts',
  projects: [
    { name: 'preview-webkit-360', use: { ...devices['Desktop Safari'], connectOptions: { wsEndpoint: 'ws://127.0.0.1:9239/kaswise-layout-qa' }, viewport: { width: 360, height: 800 } } },
    { name: 'preview-webkit-390', use: { ...devices['Desktop Safari'], connectOptions: { wsEndpoint: 'ws://127.0.0.1:9239/kaswise-layout-qa' }, viewport: { width: 390, height: 844 } } },
    { name: 'preview-webkit-430', use: { ...devices['Desktop Safari'], connectOptions: { wsEndpoint: 'ws://127.0.0.1:9239/kaswise-layout-qa' }, viewport: { width: 430, height: 932 } } },
  ],
})
