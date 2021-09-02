const { readBody } = require('./fxUtils')
const { bareImportRE, isExternalUrl, isDataUrl, isStaticAsset, isImportRequest } = require('./pathUtils')
const { isCSSRequest } = require('./cssUtils')

module.exports.readBody = readBody
module.exports.bareImportRE = bareImportRE
module.exports.isExternalUrl = isExternalUrl
module.exports.isDataUrl = isDataUrl
module.exports.isStaticAsset = isStaticAsset
module.exports.isImportRequest = isImportRequest
module.exports.isCSSRequest = isCSSRequest