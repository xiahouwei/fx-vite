const path = require('path')

let resolved = undefined;
// 模块映射
function resolveVue (root) {
    if (resolved) {
        return resolved
    }
    resolved = {
        vue: path.resolve(root, 'node_modules', '@vue/runtime-dom/dist/runtime-dom.esm-browser.js'),
        compiler: path.resolve(root, 'node_modules', '@vue/compiler-sfc/dist/compiler-sfc.cjs.js')
    }
    return resolved
}
function resolveCompiler(cwd) {
    return require(resolveVue(cwd).compiler);
}

module.exports.resolveVue = resolveVue
module.exports.resolveCompiler = resolveCompiler