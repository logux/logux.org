#!/usr/bin/env node

import dotenv from 'dotenv'
import chalk from 'chalk'

import generateWebManifest from './steps/generate-web-manifest.js'
import downloadProject from './steps/download-project.js'
import cleanBuildDir from './steps/clean-build-dir.js'
import copyWellKnown from './steps/copy-well-known.js'
import compressFiles from './steps/compress-files.js'
import compileAssets from './steps/compile-assets.js'
import repackScripts from './steps/repack-scripts.js'
import getChatUsers from './steps/get-chat-users.js'
import repackStyles from './steps/repack-styles.js'
import createLayout from './steps/create-layout.js'
import updateHtml from './steps/update-html.js'
import buildPages from './steps/build-pages.js'
import buildDocs from './steps/build-docs.js'
import readJsdoc from './steps/read-jsdoc.js'
import readDocs from './steps/read-docs.js'
import buildApi from './steps/build-api.js'

dotenv.config()

async function prepareHtml () {
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

async function prepareContent () {
  await Promise.all([
    downloadProject('logux-docs'),
    downloadProject('logux-core'),
    downloadProject('logux-server'),
    downloadProject('logux-client'),
    downloadProject('logux-redux')
  ])
  let [guides, nodeJsdoc, webJsdoc] = await Promise.all([
    readDocs(),
    readJsdoc('logux-server', 'logux-core'),
    readJsdoc('logux-client', 'logux-redux', 'logux-core')
  ])
  return [guides, nodeJsdoc, webJsdoc]
}

async function build () {
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
  await repackScripts(assets)
  await compressFiles(assets)
}

build().catch(e => {
  process.stderr.write(chalk.red(e.stack) + '\n')
  process.exit(1)
})
