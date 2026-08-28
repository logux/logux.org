#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { styleText } from 'node:util'

import { exitOnErrors } from './lib/errors.js'
import buildApi from './steps/build-api.js'
import buildDocs from './steps/build-docs.js'
import buildPages from './steps/build-pages.js'
import cleanBuildDir from './steps/clean-build-dir.js'
import compileAssets from './steps/compile-assets.js'
import copyWellKnown from './steps/copy-well-known.js'
import createLayout from './steps/create-layout.js'
import downloadProject from './steps/download-project.js'
import generateWebManifest from './steps/generate-web-manifest.js'
import readDocs from './steps/read-docs.js'
import readTypedoc from './steps/read-typedoc.js'
import repackStyles from './steps/repack-styles.js'
import updateHtml from './steps/update-html.js'

if (existsSync('.env')) process.loadEnvFile()

async function prepareHtml() {
  await cleanBuildDir()
  let assets = await compileAssets()
  let [webmanifest, filesFromCSS] = await Promise.all([
    generateWebManifest(assets),
    repackStyles(assets),
    copyWellKnown(assets)
  ])
  let uikit = await updateHtml(assets, webmanifest, filesFromCSS)
  return [assets, uikit]
}

async function prepareContent() {
  await Promise.all([
    downloadProject('logux-docs'),
    downloadProject('logux-core'),
    downloadProject('logux-server'),
    downloadProject('logux-client'),
    downloadProject('logux-actions')
  ])
  let [guides, nodeApi, webApi] = await Promise.all([
    readDocs(),
    readTypedoc('logux-server', 'logux-actions', 'logux-core'),
    readTypedoc('logux-client', 'logux-actions', 'logux-core')
  ])
  return [guides, nodeApi, webApi]
}

async function build() {
  if (process.env.NO_CONTENT) {
    await prepareHtml()
    return
  }
  let [[assets, uikit], [guides, nodeApi, webApi]] = await Promise.all([
    prepareHtml(),
    prepareContent()
  ])
  let layout = await createLayout(uikit)
  await Promise.all([
    buildDocs(assets, layout, guides),
    buildPages(assets, layout),
    buildApi(assets, layout, 'Node API', nodeApi),
    buildApi(assets, layout, 'Web API', webApi)
  ])
  exitOnErrors()
}

build().catch(e => {
  let message = e.stack ?? String(e)
  process.stderr.write(
    styleText('red', message, { stream: process.stderr }) + '\n'
  )
  process.exit(1)
})
