const isImportRequest = ctx => {
    return ctx.query.import != null
}
function assetPathPlugin ({ app, resolver }) {
  app.use(async (ctx, next) => {
    if (resolver.isAssetRequest(ctx.path) && isImportRequest(ctx)) {
      ctx.type = 'js'
      ctx.body = `export default ${JSON.stringify(ctx.path)}`
      return
    }
    return next()
  })
}

module.exports = assetPathPlugin