const path = require('path')
const typescript = require('typescript')
const transformPureClass = require('@tybys/ts-transform-pure-class').default
const transformModuleSpecifier = require('@tybys/ts-transform-module-specifier').default
const { defineConfig } = require('@tybys/tsgo')

function removeSuffix (str, suffix) {
  if (suffix == null) {
    const pathList = str.split(/[/\\]/)
    const last = pathList[pathList.length - 1]
    const dot = last.lastIndexOf('.')
    pathList[pathList.length - 1] = dot !== -1 ? last.slice(0, dot) : last
    return pathList.join('/')
  }
  return str.endsWith(suffix) ? str.slice(0, str.length - suffix.length) : str
}

function createModuleSpecifierTransformer (suffix) {
  const rewriteExtensions = ['', '.ts']
  return transformModuleSpecifier({
    targets: [
      {
        replacer: (_currentSourceFile, request) => {
          if (request.charAt(0) === '.' && (rewriteExtensions.indexOf(path.extname(request)) !== -1)) {
            return removeSuffix(request) + suffix
          }
          return request
        }
      }
    ]
  })
}

const root = __dirname
const name = path.posix.basename(require('./package.json').name)
const entry = path.resolve(root, 'lib/esm-bundler/index.js')
const dist = path.resolve(root, 'dist')
// const mpDist = path.resolve(root, require('./package.json').miniprogram || 'miniprogram_dist')

module.exports = defineConfig({
  root,
  baseTsconfig: 'tsconfig.json',
  docOutputPath: 'docs/api',
  tscTargets: [
    {
      optionsToExtend: {
        target: typescript.ScriptTarget.ES2019,
        module: typescript.ModuleKind.ESNext,
        outDir: path.join(root, 'lib/esm-bundler'),
        declaration: true
      },
      customTransformersAfter: () => ({
        before: [createModuleSpecifierTransformer('.js')],
        after: [transformPureClass]
      })
    }/* ,
    {
      transpileOnly: true,
      optionsToExtend: {
        target: typescript.ScriptTarget.ES2019,
        module: typescript.ModuleKind.CommonJS,
        sourceMap: true, // for test
        outDir: path.join(root, 'lib/cjs')
      },
      customTransformersAfter: () => ({
        after: [transformPureClass]
      })
    },
    {
      transpileOnly: true,
      outputSuffix: '.mjs',
      optionsToExtend: {
        target: typescript.ScriptTarget.ES2019,
        module: typescript.ModuleKind.ESNext,
        outDir: path.join(root, 'lib/mjs')
      },
      customTransformersAfter: () => ({
        before: [createModuleSpecifierTransformer('.mjs')],
        after: [transformPureClass]
      })
    } */
  ],
  libraryName: name,
  bundleTargets: [
    {
      entry,
      output: {
        name,
        path: dist
      },
      minify: false,
      type: 'umd'
    },
    {
      entry,
      output: {
        name,
        path: dist
      },
      minify: true,
      type: 'umd'
    },
    /* {
      entry,
      output: {
        name: 'index',
        path: mpDist
      },
      minify: true,
      type: 'mp'
    }, */
    {
      entry,
      output: {
        name,
        path: dist
      },
      minify: false,
      type: 'esm-bundler',
      resolveOnly: [/^(?!(tslib)).*?$/]
    }
  ]
})
