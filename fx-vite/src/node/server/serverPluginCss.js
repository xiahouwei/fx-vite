// 解析.css文件插件
const hash_sum = require('hash-sum')
const { readBody, isImportRequest, isCSSRequest } = require("../utils") // 读取文件 和 判断import请求
const { clientPublicPath } = require("./serverPluginClient")
function cssPlugin ({ app, root, resolver, watcher }) {
    app.use(async (ctx, next) => {
        await next()
        // 判断是否为css文件
        if (ctx.path.endsWith('.css') && ctx.body) {
            const id = JSON.stringify(hash_sum(ctx.path))
            // import请求(?import结尾)
            if (isImportRequest(ctx)) {
                const css = await readBody(ctx.body)
                ctx.type = 'js'
                ctx.body = codegenCss(id, css)
            }
        }
    })

    // 侦测css文件变化
    watcher.on('change', (filePath) => {
        if (isCSSRequest(filePath)) {
            const publicPath = resolver.fileToRequest(root, filePath);
            normalCssUpdate(publicPath)
        }
    })

    // 普通的外部 css 文件更新例如 import './index.css'
    function normalCssUpdate (publicPath) {
        watcher.send({
            type: 'style-update',
            path: publicPath,
            changeSrcPath: publicPath,
            timestamp: Date.now()
        })
    }
}
function codegenCss (id, css) {
    // Vite 是通过 updateStyle 这个方法来将 css 字符串挂载到具体的 dom 元素上
    let code =
        `import { updateStyle } from "${clientPublicPath}"\n` +
        `const css = ${JSON.stringify(css)}\n` +
        `updateStyle(${JSON.stringify(id)}, css)\n`
    code += `export default css`
    return code
}

module.exports = cssPlugin
module.exports.codegenCss = codegenCss