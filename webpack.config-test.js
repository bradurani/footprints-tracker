const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  target: 'node',  // webpack should compile node compatible code
  output: {
    // use absolute paths in sourcemaps (important for debugging via IDE)
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]',
    filename: 'main.test.js',
    path: path.resolve(__dirname, 'dist')
  },
  externals: [nodeExternals()], // in order to ignore all modules in node_modules folder
  devtool: "source-map",
  mode: 'production',
};
