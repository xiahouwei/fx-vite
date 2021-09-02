module.exports = function() {
    const virtualFileId = 'my-virtual-file'
    const moduleContent = `export const msg = "from virtual file"`
    return {
        name: virtualFileId, // 必须的，将会在 warning 和 error 中显示
        resolveId(id) {
            console.log('plugin:', id)
            if (id === virtualFileId) {
                return virtualFileId
            }
        },
        load(id) {
            console.log('load:', id)
            if (id === virtualFileId) {
                return `export const msg = "from virtual file"`
            }
        },
        configureServer: [async ({ app }) => {
            app.use(async (ctx, next) => {
                if (ctx.path.startsWith(`/@modules/${virtualFileId}`)) {
                    ctx.type = 'js'
                    ctx.body = moduleContent
                } else {
                    await next()
                }
            })
        },]
    }
}