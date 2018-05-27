const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './test/index.test.js',
  target: 'web',
  output: {
    // use absolute paths in sourcemaps (important for debugging via IDE)
    devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    devtoolFallbackModuleFilenameTemplate: '[absolute-resource-path]?[hash]',
    filename: 'main.test.web.js',
    path: path.resolve(__dirname, 'dist')
  },
  devtool: "source-map",
  mode: 'production',
  devServer: {
    contentBase: path.join(__dirname, "/public"),
    compress: true,
    port: 8000,
  }
};
