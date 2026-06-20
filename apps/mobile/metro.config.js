const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// withUniwindConfig must be the outermost wrapper
module.exports = withUniwindConfig(config, {
  // relative path to global.css from project root
  cssEntryFile: './src/global.css',
  // auto-generated Tailwind typings (picked up automatically by TS in src/)
  dtsFile: './src/uniwind-types.d.ts',
});
