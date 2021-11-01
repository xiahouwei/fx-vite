

const chalk = require("chalk"); // 终端字体插件
const { clientPublicPath } = require('./serverPluginClient')
const { readBody } = require("../utils") // 读取文件
function htmlRewritePlugin ({ app, root, resolver, watcher }) {
    // 导入client.js
    const devInjectionCode = `\n<script type="module">import "${clientPublicPath}"</script>\n`

    app.use(async (ctx, next) => {
        await next()
        if (ctx.status === 304) {
            return
        }
        if (ctx.response.is('html') && ctx.body) {
            // const importer = ctx.path
            const html = await readBody(ctx.body)
            // TODO cache
            // if (rewriteHtmlPluginCache.has(html)) {
            //     debug(`${ctx.path}: serving from cache`)
            //     ctx.body = rewriteHtmlPluginCache.get(html)
            // } else {
            //     if (!html) return
            //     ctx.body = await rewriteHtml(importer, html)
            //     rewriteHtmlPluginCache.set(html, ctx.body)
            // }
            if (!html) return
            // 注入client.js
            ctx.body = html.replace(/<head>/, `<head>${devInjectionCode}`)
            return
        }
    })
    // 监听文件change
    watcher.on('change', (filePath) => {
        const path = resolver.fileToRequest(root, filePath)
        // 如果是.html文件 则触发full-reload
        if (path.endsWith('.html')) {
            watcher.send({
                type: 'full-reload',
                path
            })
            console.log(chalk.green(`[vite] `) + ` ${path} page reloaded.`)
        }
    })
}

module.exports = htmlRewritePlugin
