// 匹配 开头 不是 ./ 也不是 / 这种路径  转换 vue => /@modules/vue
const bareImportRE = /^[^\/\.]/

const externalRE = /^(https?:)?\/\//

function isExternalUrl (url) {
    return  externalRE.test(url)
}

const dataUrlRE = /^\s*data:/i

function isDataUrl (url) {
    return  dataUrlRE.test(url)
}

const imageRE = /\.(png|jpe?g|gif|svg|ico|webp)(\?.*)?$/
const mediaRE = /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/
const fontsRE = /\.(woff2?|eot|ttf|otf)(\?.*)?$/i

/**
 * Check if a file is a static asset that vite can process.
 */
function isStaticAsset (file) {
    return imageRE.test(file) || mediaRE.test(file) || fontsRE.test(file)
}
/**
 * Check if a request is an import from js instead of a native resource request
 * i.e. differentiate
 * `import('/style.css')`
 * from
 * `<link rel="stylesheet" href="/style.css">`
 *
 * The ?import query is injected by serverPluginModuleRewrite.
 */
function isImportRequest (ctx) {
    return ctx.query.import != null
}

exports.bareImportRE = bareImportRE
exports.isExternalUrl = isExternalUrl
exports.isDataUrl = isDataUrl
exports.isStaticAsset = isStaticAsset
exports.isImportRequest = isImportRequest