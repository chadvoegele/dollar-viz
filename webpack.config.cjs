const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: 'development',
  entry: {
    index: './www/js/app/main.js',
  },
  devtool: 'inline-source-map',
  devServer: {
    proxy: {
      '/ledger_rest': {
        target: 'http://127.0.0.1:8090/',
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      title: 'DollarViz',
      template: 'www/table.html'
    }),
    new HtmlWebpackPlugin({
      title: 'DollarViz',
      filename: "chart.html",
      template: 'www/chart.html'
    }),
    new CopyPlugin({
      patterns: [
        { from: "www/js/vendor/arg-1.3.min.js" },
        { from: "www/js/vendor/bootstrap-datepicker.min.js" },
        { from: "www/css/bootstrap-datepicker3.standalone.min.css" },
      ],
    }),
  ],
  output: {
    filename: '[name].[fullhash].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};
