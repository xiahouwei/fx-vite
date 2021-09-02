const moduleRE = /^\/@modules\//
const path = require('path')
const fsPromise = require('fs').promises
const { resolveVue } = require('../utils/resolveVue')

function moduleResolvePlugin ({ app, root }) {
    app.use(async (ctx, next) => {
        // 没有匹配到/@modules 则往下执行
        if (!moduleRE.test(ctx.path)) {
            return next()
        }
        const id = ctx.path.replace(moduleRE, '')
        // 读取模块内容并返回js文件
        const content = await fsPromise.readFile(resolveVue(root)[id], 'utf8')
        ctx.type = 'js'
        ctx.body = content
    })

}


module.exports = moduleResolvePlugin
