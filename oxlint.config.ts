import loguxOxlintConfig from '@logux/oxc-configs/lint'
import { defineConfig } from 'oxlint'

export default defineConfig({
  env: {
    browser: true
  },
  extends: [loguxOxlintConfig],
  ignorePatterns: ['dist', 'projects'],
  rules: {
    'no-underscore-dangle': 'off'
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
})
