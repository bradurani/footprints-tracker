const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  target: 'web',
  output: {
    filename: 'footprints.min.js',
    path: path.resolve(__dirname, 'release')
  },
  plugins: [
    new CleanWebpackPlugin(['release'])
  ],
  mode: 'production'
};
