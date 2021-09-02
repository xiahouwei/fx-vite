const fs = require('fs')
const path = require('path')

const clientFilePath = path.resolve(__dirname, '../../client/client.js')

const clientPublicPath = `/vite/client`

function clientPlugin ({ app }) {
  const clientCode = fs
    .readFileSync(clientFilePath, 'utf-8')
    .replace(`__MODE__`, JSON.stringify('development'))

  app.use(async (ctx, next) => {
    if (ctx.path !== clientPublicPath) {
        return next()
    }
    const socketPort = ctx.port
    ctx.type = 'js'
    ctx.body = clientCode
    ctx.body = clientCode
      .replace(`__HMR_PORT__`, JSON.stringify(socketPort))
  })
}

module.exports = clientPlugin
module.exports.clientPublicPath = clientPublicPath
