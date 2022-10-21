import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('webpack').Configuration} */
const config = {
  mode: 'production',
  entry: {
    a: path.join(__dirname, './src/index.js'),
    b: path.join(__dirname, './src/asyncify/asyncify.js')
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, './webpack')
  },
  module: {
    rules: [
      {
        test: /\.wasm$/,
        type: 'asset/resource'
      }
    ]
  },
  resolve: {
    alias: {
      '@tybys/wasm-util': path.join(__dirname, '..')
    }
  },
  experiments: {
    topLevelAwait: true
  }
}

export default config
