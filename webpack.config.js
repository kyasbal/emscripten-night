const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const dist = path.resolve(__dirname, "dist");
const WasmPackPlugin = require("@wasm-tool/wasm-pack-plugin");

module.exports = {
  optimization: {
    minimize: false
  },
  mode: "production",
  entry: "./src/index.ts",
  devtool: "source-map",
  output: {
    path: dist,
    filename: "bundle.js"
  },
  devServer: {
    contentBase: dist
  },
  resolve: {
    extensions: [".ts", ".tsx", ".wasm"]
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: "babel-loader"
          }
        ]
      },
      {
        test: /\.(vert|frag)?$/,
        use: [
          {
            loader: "raw-loader"
          }
        ]
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "template/index.html"
    }),
    new WasmPackPlugin({
      crateDirectory: path.resolve(__dirname, "crate")
    })
  ]
};
