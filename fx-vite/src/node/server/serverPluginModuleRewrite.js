// module路径重写插件
const path = require('path')
const { readBody, bareImportRE } = require("../utils") // 读取文件 和 path解析
const { parse } = require('es-module-lexer') // es module 语法解析插件
const MagicString = require('magic-string')
const clientPublicPath = `/vite/client`

function rewriteImports (source, resolver) {
    let imports = parse(source)[0]
    let ms = new MagicString(source)
    if (imports.length > 0) {
        imports.forEach(item => {
            let { s, e } = item
            // 截取es module标识
            let id = source.slice(s, e)
            // 匹配 开头 不是 ./ 也不是 / 这种路径
            if (bareImportRE.test(id)) {
                id = `/@modules/${id}`
                ms.overwrite(s, e, id)
            } else {
                // relative to absolute ./foo -> /some/path/foo
                let { pathname, query } = resolver.resolveRelativeRequest(id)
                // 处理css文件 ./xxx.css => ./xxx.css?import
                if (!query && path.extname(pathname) === '.css') {
                    pathname += `?import`
                }
                ms.overwrite(s, e, pathname)
            }
        })
    }
    return ms.toString()
}
function moduleRewritePlugin ({ app, root, resolver }) {
    app.use(async (ctx, next) => {
        await next()
        // 将流转成字符串, 并且处理js文件中引入的问题
        if (ctx.body && ctx.response.is('js') && ctx.path !== clientPublicPath) {
            let r = await readBody(ctx.body)
            const result = rewriteImports(r, resolver)
            ctx.body = result
        }
    })
}

module.exports = moduleRewritePlugin