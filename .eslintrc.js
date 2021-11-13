module.exports = {
  overrides: [
    {
      files: ['*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
      ],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/quotes': [
          'error',
          'single',
          { avoidEscape: true, allowTemplateLiterals: false },
        ],
      },
    },
    {
      files: ['src/**/*.ts'],
      excludedFiles: ['src/__tests__/**/*.ts'],
      parserOptions: {
        // why not the normal tsconfig?
        // because this one excludes tests
        //project: 'tsconfig.eslint.json',
        project: ['./tsconfig.json'],
        sourceType: 'module',
      },
    },
    {
      files: ['.eslintrc.js', '*.config.js'],
      env: {
        node: true,
      },
    },
    {
      files: ['iframe_code.js'],
      env: {
        browser: true,
      },
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 2020,
      },
    },
  ],
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  env: { es6: true },
  rules: {
    curly: ['error', 'multi-line'],
    eqeqeq: 'error',
    'prefer-arrow-callback': 'error',
    'no-unused-vars': [
      'error',
      { vars: 'all', args: 'none', ignoreRestSiblings: true },
    ],
  },
};
