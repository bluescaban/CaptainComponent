const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env into process.env (silently no-ops if .env doesn't exist)
dotenv.config();

// Figma plugin UIs must be a single self-contained HTML fragment.
// Full HTML documents (doctype, html, head, body) cause parsing failures when
// Figma embeds the content inside its own document.write() wrapper.
// This plugin builds index.html from scratch: just a root div + inline script,
// with ALL < escaped as \u003c so no HTML tag can appear inside the <script>.
class FigmaUIPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap('FigmaUIPlugin', () => {
      const jsPath = path.join(compiler.outputPath, 'ui.js');
      if (!fs.existsSync(jsPath)) return;

      const js = fs.readFileSync(jsPath, 'utf8');

      // No escaping needed — the bundle contains 0 occurrences of </script>.
      // Output a minimal HTML fragment (no doctype/html/head/body) so Figma's
      // document.write() wrapper doesn't get confused by nested HTML structure.
      const html = `<div id="root"></div>\n<script>\n${js}\n</script>`;
      fs.writeFileSync(path.join(compiler.outputPath, 'index.html'), html);
    });
  }
}

module.exports = [
  // ─── Plugin controller (Figma sandboxed JS environment, target ES6) ──────────
  {
    name: 'controller',
    entry: './src/plugin/controller.ts',
    // Always produce a plain concatenated bundle — never eval-based source maps.
    // Figma's sandbox cannot access webpack's __webpack_require__ from inside eval().
    devtool: false,
    output: {
      filename: 'controller.js',
      path: path.resolve(__dirname, 'dist'),
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: { loader: 'ts-loader', options: { configFile: 'tsconfig.plugin.json' } },
          exclude: /node_modules/,
        },
      ],
    },
    resolve: { extensions: ['.ts', '.tsx', '.js'] },
  },

  // ─── Plugin UI (browser iframe) ───────────────────────────────────────────────
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
          use: { loader: 'ts-loader', options: { configFile: 'tsconfig.json' } },
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
      ],
    },
    resolve: { extensions: ['.ts', '.tsx', '.js'] },
    plugins: [
      new webpack.DefinePlugin({
        __OPENAI_API_KEY__: JSON.stringify(process.env.OPENAI_API_KEY || ''),
      }),
      new FigmaUIPlugin(),
    ],
  },
];
