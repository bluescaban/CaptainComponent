const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const dotenv = require('dotenv');

// Load .env into process.env (silently no-ops if .env doesn't exist)
dotenv.config();

module.exports = [
  // ─── Plugin controller (runs in Figma's sandboxed JS environment) ───────────
  {
    name: 'controller',
    entry: './src/plugin/controller.ts',
    output: {
      filename: 'controller.js',
      path: path.resolve(__dirname, 'dist'),
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: { configFile: 'tsconfig.json' },
          },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
  },

  // ─── Plugin UI (runs in an iframe — full browser environment) ────────────────
  {
    name: 'ui',
    entry: './src/ui/index.tsx',
    output: {
      filename: 'ui.js',
      path: path.resolve(__dirname, 'dist'),
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader',
            options: { configFile: 'tsconfig.json' },
          },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'index.html',
        inject: 'body',
        scriptLoading: 'blocking',
      }),
      // Inject .env values as compile-time constants in the UI bundle
      new webpack.DefinePlugin({
        __OPENAI_API_KEY__: JSON.stringify(process.env.OPENAI_API_KEY || ''),
      }),
    ],
  },
];
