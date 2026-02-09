module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', '@typescript-eslint'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'no-redeclare': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'no-useless-escape': 'off',
    'no-empty-pattern': 'off',
    'no-extra-boolean-cast': 'off',
    'no-async-promise-executor': 'off',
    'no-case-declarations': 'off',
  },
  overrides: [
    {
      files: ['src/components/ui/button.tsx', 'src/lib/auth.tsx'],
      rules: {
        'react-refresh/only-export-components': 'off',
      },
    },
  ],
}
