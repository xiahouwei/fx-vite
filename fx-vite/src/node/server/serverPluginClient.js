const fs = require('fs')
const path = require('path')

// 客户端注入的js脚本文件
const clientFilePath = path.resolve(__dirname, '../../client/client.js')
// html注入的客户端js文件路径
const clientPublicPath = `/vite/client`

function clientPlugin ({ app }) {
  // 环境变量__MODE__替换为development
  const clientCode = fs
    .readFileSync(clientFilePath, 'utf-8')
    .replace(`__MODE__`, JSON.stringify('development'))

  app.use(async (ctx, next) => {
    // 如果不是/vite/clien请求, 则忽略
    if (ctx.path !== clientPublicPath) {
        return next()
    }
    const socketPort = ctx.port
    ctx.type = 'js'
    // 环境变量__HMR_PORT__替换为真是端口号
    ctx.body = clientCode
      .replace(`__HMR_PORT__`, JSON.stringify(socketPort))
  })
}

module.exports = clientPlugin
module.exports.clientPublicPath = clientPublicPath
