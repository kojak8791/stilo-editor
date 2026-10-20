// The compile-time flags of Vue's esm-bundler build. A Vue app gets them from @vitejs/plugin-vue;
// this demo runs on the library's Vite config, without it. Imported before Vue.
Object.assign(globalThis, {
  __VUE_OPTIONS_API__: true,
  __VUE_PROD_DEVTOOLS__: false,
  __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
});
