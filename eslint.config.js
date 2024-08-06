import loguxConfig from '@logux/eslint-config'
import globals from 'globals'

export default [
  {
    ignores: ['scripts/lib/dirs.js', 'dist', 'projects']
  },
  ...loguxConfig,
  {
    languageOptions: {
      globals: globals.browser
    },
    rules: {
      'n/no-unsupported-features/node-builtins': 'off'
    }
  },
  {
    files: ['scripts/**/*.js'],
    rules: {
      'no-console': 'off'
    }
  }
]
