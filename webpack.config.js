const path = require('path');
const fs = require('fs');

const HtmlWebpackPlugin = require('html-webpack-plugin');

const APP_DIR = fs.realpathSync(process.cwd());

const resolveAppPath = relativePath => path.resolve(APP_DIR, relativePath);

module.exports = {
  entry: resolveAppPath('src/index.ts'),
  output: {
    filename: 'recogito-connections.js',
    library: ['recogito', 'Connections'],
    libraryTarget: 'umd',
    libraryExport: 'default'
  },
  devtool: 'source-map',
  performance: {
    hints: false
  },
  optimization: {
    minimize: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      { 
        test: /\.(ts|tsx)$/, 
        use: { 
          loader: 'babel-loader',
          options: {
            "presets": [
              "@babel/preset-env",
              "@babel/preset-typescript",
              "@babel/preset-react"
            ],
            "plugins": [
              [
                "@babel/plugin-proposal-class-properties"
              ]
            ]
          }
        },
        exclude: /node_modules/
      },
      { 
        test: /\.(js|jsx)$/, 
        use: { 
          loader: 'babel-loader' ,
          options: {
            "presets": [
              "@babel/preset-env",
              "@babel/preset-react"
            ],
            "plugins": [
              [
                "@babel/plugin-proposal-class-properties"
              ]
            ]
          }
        }
      },
      { test: /\.css$/,  use: [ 'style-loader', 'css-loader'] },
      { test: /\.scss$/, use: [ 'style-loader', 'css-loader', 'sass-loader' ] }
    ]
  },
  devServer: {
    compress: true,
    hot: true,
    host: process.env.HOST || 'localhost',
    port: 3000,
    static: {
      directory: resolveAppPath('public'),
      publicPath: '/'
    }
  },
  plugins: [
    new HtmlWebpackPlugin ({
      inject: 'head',
      template: resolveAppPath('public/index.html')
    })
  ]
}