const path = require('path');
const slash = require('slash'); // 转换 Windows 反斜杠路径转换为正斜杠路径 \ => /。
const queryRE = /\?.*$/


function resolveRelativeRequest (importee) {
    const importer = '/src'
    const queryMatch = importee.match(queryRE)
    if (/^\.\//.test(importee)) {
        importee = importee.replace(/^\./, importer)
    }
    return {
        pathname: importee,
        query: queryMatch ? queryMatch[0] : ''
    }
}
function fileToRequest (root, filePath) {
    return  '/' + slash(path.relative(root, filePath)).replace(/^public\//, '')
}
exports.resolveRelativeRequest = resolveRelativeRequest
exports.fileToRequest = fileToRequest