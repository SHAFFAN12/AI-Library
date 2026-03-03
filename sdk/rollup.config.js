import terser from '@rollup/plugin-terser';

export default [
  // ES module build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/ai-automation-sdk.esm.js',
      format: 'es',
      sourcemap: true,
    },
  },
  // IIFE (browser CDN) build
  {
    input: 'src/index.js',
    output: {
      file: 'dist/ai-automation-sdk.min.js',
      format: 'iife',
      name: 'AIAutomation',
      sourcemap: false,
      plugins: [terser()],
    },
  },
];
