#!/usr/bin/env node

import dotenv from 'dotenv'
import pico from 'picocolors'

import generateWebManifest from './steps/generate-web-manifest.js'
import downloadProject from './steps/download-project.js'
import cleanBuildDir from './steps/clean-build-dir.js'
import copyWellKnown from './steps/copy-well-known.js'
import compressFiles from './steps/compress-files.js'
import compileAssets from './steps/compile-assets.js'
import getChatUsers from './steps/get-chat-users.js'
import repackStyles from './steps/repack-styles.js'
import createLayout from './steps/create-layout.js'
import installTypes from './steps/install-types.js'
import readTypedoc from './steps/read-typedoc.js'
import updateHtml from './steps/update-html.js'
import buildPages from './steps/build-pages.js'
import buildDocs from './steps/build-docs.js'
import readDocs from './steps/read-docs.js'
import buildApi from './steps/build-api.js'
import { exitOnErrors } from './lib/errors.js'

dotenv.config()

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
  await installTypes(() => [
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
  let [users, [assets, uikit], [guides, nodeApi, webApi]] = await Promise.all([
    getChatUsers(),
    prepareHtml(),
    prepareContent()
  ])
  let layout = await createLayout(uikit, users)
  await Promise.all([
    buildDocs(assets, layout, guides),
    buildPages(assets, layout),
    buildApi(assets, layout, 'Node API', nodeApi),
    buildApi(assets, layout, 'Web API', webApi)
  ])
  exitOnErrors()
  await compressFiles(assets)
}

build().catch(e => {
  if (e.stack) {
    process.stderr.write(pico.red(e.stack) + '\n')
  } else {
    process.stderr.write(pico.red(e) + '\n')
  }
  process.exit(1)
})
