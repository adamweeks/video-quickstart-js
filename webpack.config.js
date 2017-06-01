var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
  entry: './app',
  plugins: [
    new webpack.EnvironmentPlugin([
      `TWILIO_ACCOUNT_SID`,
      `TWILIO_API_KEY`,
      `TWILIO_API_SECRET`,
      `EMOTION_API_KEY`
    ]),
    new HtmlWebpackPlugin({
      template: `./app/index.html`
    }),
    new ExtractTextPlugin("styles.css")
  ],
  devtool: `source-map`,
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          use: "css-loader"
        })
      },
      {
        test: /.*\.(gif|png|jpg)$/,
        use: [
          `file-loader?name=[name].[ext]`
        ]
      }
    ]
  },
};