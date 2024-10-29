// webpack.config.cjs
const path = require('path');

module.exports = {
  mode: 'production',  
  entry: './index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'vectorvault.bundle.js',
    library: 'VectorVault',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: "typeof self !== 'undefined' ? self : this",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
};
