import js from '@eslint/js';

export default [
  js.configs.recommended,
  // Node.js files (server, capi, agent configs)
  {
    files: ['server.js', 'capi.js', 'src/agent_cards/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'writable',
        require: 'readonly',
        exports: 'writable',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
    },
  },
  // Browser files (src/js/) - multi-file globals pattern via script tags
  {
    files: ['src/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        FormData: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        console: 'readonly',
        HTMLElement: 'readonly',
        CustomEvent: 'readonly',
        Event: 'readonly',
        EventSource: 'readonly',
        MediaRecorder: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        AudioContext: 'readonly',
        RTCPeerConnection: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        // External libraries loaded via script tags
        TRTC: 'readonly',
        QRCode: 'readonly',
      },
    },
    rules: {
      // Disable no-undef for browser files using multi-file globals pattern
      'no-undef': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-prototype-builtins': 'warn',
    },
  },
  {
    ignores: ['node_modules/', 'public/', 'docs/'],
  },
];
