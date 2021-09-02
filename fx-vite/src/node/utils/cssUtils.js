const urlRE = /url\(\s*('[^']+'|"[^"]+"|[^'")]+)\s*\)/
const cssPreprocessLangRE = /\.(less|sass|scss|styl|stylus|postcss)$/
const cssModuleRE = /\.module\.(less|sass|scss|styl|stylus|postcss|css)$/

const isCSSRequest = function (file) {
    return file.endsWith('.css') || cssPreprocessLangRE.test(file)
}
exports.isCSSRequest = isCSSRequest