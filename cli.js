#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const meow = require('meow')
const findup = require('find-up')
const readPkg = require('read-pkg-up').sync
const openBrowser = require('react-dev-utils/openBrowser')
const chalk = require('chalk')
const clipboard = require('clipboardy')

const config = require('pkg-conf').sync('x0')
const pkg = readPkg().pkg

const log = (...args) => {
  console.log(
    chalk.black.bgCyan(' x0 '),
    ...args
  )
}
log.error = (...args) => {
  console.log(
    chalk.black.bgRed(' err '),
    chalk.red(...args)
  )
}

const cli = meow(`
  Usage

    Dev Server

      x0 pages

    Build

      x0 build pages

  Options

      --webpack       Path to webpack config file

    Dev Server

      -o --open       Open dev server in default browser
      -p --port       Port for dev server

    Build

      -d --out-dir    Output directory (default dist)
      -s --static     Output static HTML without JS bundle
      -t --template   Path to custom HTML template

`, {
  flags: {
    // dev
    open: {
      type: 'boolean',
      alias: 'o'
    },
    port: {
      type: 'string',
      alias: 'p'
    },
    // build
    outDir: {
      type: 'string',
      alias: 'd'
    },
    static: {
      type: 'boolean',
    },
    template: {
      type: 'string',
      alias: 't'
    },
    // shared
    config: {
      type: 'string',
      alias: 'c'
    },
    scope: {
      type: 'string',
    },
    webpack: {
      type: 'string',
    },
  }
})

const [ cmd, file ] = cli.input
const input = path.resolve(file || cmd)
const stats = fs.statSync(input)
const dirname = stats.isDirectory() ? input : path.dirname(input)
const filename = stats.isDirectory() ? null : input

const opts = Object.assign({
  input,
  dirname,
  filename,
  stats,
  outDir: 'dist',
  basename: '/',
  scope: {},
  pkg,
}, config, cli.flags)

opts.outDir = path.resolve(opts.outDir)
if (opts.config) opts.config = path.resolve(opts.config)
if (opts.webpack) {
  opts.webpack = require(path.resolve(opts.webpack))
} else {
  const webpackConfig = findup.sync('webpack.config.js', { cwd: dirname })
  if (webpackConfig) opts.webpack = require(webpackConfig)
}

if (opts.app) {
  opts.app = path.resolve(opts.app)
} else {
  const app = findup.sync('_app.js', { cwd: dirname })
  if (app) opts.app = app
}

if (opts.template) {
  opts.template = require(path.resolve(opts.template))
}

const handleError = err => {
  log.error(err)
  process.exit(1)
}

switch (cmd) {
  case 'build':
    log('building static site')
    const { build } = require('.')
    build(opts)
      .then(res => {
        log('site saved to ' + opts.outDir)
      })
      .catch(handleError)
    break
  case 'dev':
  default:
    log('starting dev server')
    const { dev } = require('.')
    dev(opts)
      .then(res => {
        const { port } = res.options
        const url = `http://localhost:${port}`
        log(
          'dev server listening on',
          chalk.green(url),
          chalk.gray('(copied to clipboard)')
        )
        clipboard.write(url)
        if (opts.open) {
          openBrowser(url)
        }
      })
      .catch(handleError)
    break
}

require('update-notifier')({
  pkg: require('./package.json')
}).notify()
