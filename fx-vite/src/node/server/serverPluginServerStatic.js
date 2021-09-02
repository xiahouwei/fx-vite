// 静态服务插件
const static = require('koa-static')
const path = require('path')
function serverStaticPlugin ({ app, root }) {
    // 解析index
    app.use(static(root))
    // 解析public文件夹
    app.use(static(path.resolve(root, 'public')))
}

module.exports = serverStaticPlugin