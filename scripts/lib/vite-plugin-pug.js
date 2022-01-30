import { join } from 'path'
import { compileFile } from 'pug'

export default function (options, locals) {
  return {
    name: "vite-plugin-pug",

    handleHotUpdate({ file, server }) {
      if (file.endsWith(".pug")) {
        server.ws.send({
          type: "full-reload",
        })
      }
    },

    transformIndexHtml: {
      enforce: 'pre',
      transform(html, { filename }) {
        let updatedHtml = html.replace(/<template.*?data-type="pug".*?(\/>|<\/template>)/g, (matchedString) => {
          let [, rawTemplatePath] = matchedString.match(/data-src=["'](.*?)["']/) || []

          if (!rawTemplatePath) {
            throw new Error('Template path not specified for ' + matchedString);
          }

          let entryFileDir = filename.replace(/(.*)\/.*\.html$/, '$1')
          let templateFilePath = join(entryFileDir, rawTemplatePath)

          return compileFile(templateFilePath, options)(locals)
        })

        return updatedHtml
      },
    },
  }
}
