

const { clientPublicPath } = require('./serverPluginClient')
const { readBody } = require("../utils") // 读取文件
function htmlRewritePlugin ({ app }) {
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
            ctx.body = html.replace(/<head>/, `<head>${devInjectionCode}`)
            return
        }
    })
}

module.exports = htmlRewritePlugin
