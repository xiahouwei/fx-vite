// 解析.vue文件插件
const path = require('path')
const fs = require('fs').promises
const hash_sum = require('hash-sum')
const chalk = require("chalk"); // 终端字体插件
const LRUCache = require("lru-cache") // lru缓存插件
const {
    parse,
    compileStyleAsync
} = require('@vue/compiler-sfc')
const { resolveCompiler } = require('../utils/resolveVue')
const { codegenCss } = require('./serverPluginCss')
const { debugHmr } = require('./serverPluginHmr')
const debug = require('debug')('vite:sfc')

const vueCache = new LRUCache({
    max: 65535
})


// template转化函数
// function doCompileTemplate({ filename, id, scoped, slotted, inMap, source, ssr = false, ssrCssVars, isProd = false, compiler = ssr ? CompilerSSR__namespace : CompilerDOM__namespace, compilerOptions = {}, transformAssetUrls })
function compileSFCTemplate (root, source, id, scoped) {
    const { compileTemplate } = resolveCompiler(root)
    return compileTemplate({
        source,
        id,
        scoped,
        compilerOptions: {
            scopeId: scoped ? `data-v-${id}` : null
        }
    })
}
function vuePlugin ({ app, root, resolver, watcher }) {
    app.use(async (ctx, next) => {
        if (!ctx.path.endsWith('.vue')) {
            return next()
        }
        // 获取.vue文件内容
        const query = ctx.query
        const publicPath = ctx.path
        const filePath = path.join(root, publicPath)

        // 解析模板
        let descriptor = await parseSFC(root, filePath)
        if (!descriptor) {
            // read failed
            return
        }

        // 处理文件中的script内容
        if (!query.type) {
            const id = hash_sum(publicPath)
            let code = ''
            // 1.重写export default
            if (descriptor.script) {
                let content = descriptor.script.content
                code += content.replace(/((?:^|\n|;)\s*)export default/, '$1const __script=')
            }
            // 2.如果有style样式标签, 则注入
            if (descriptor.styles) {
                let hasScoped = false
                let hasCSSModules = false
                descriptor.styles.forEach((s, i) => {
                    const styleRequest = publicPath + `?type=style&index=${i}`
                    // 处理scoped
                    if (s.scoped) hasScoped = true
                    // 处理module
                    if (s.module) {
                        if (!hasCSSModules) {
                            code += `\nconst __cssModules = __script.__cssModules = {}`
                            hasCSSModules = true
                        }
                        const styleVar = `__style${i}`
                        const moduleName = typeof s.module === 'string' ? s.module : '$style'
                        code += `\nimport ${styleVar} from ${JSON.stringify(
                        styleRequest + '&module'
                        )}`
                        code += `\n__cssModules[${JSON.stringify(moduleName)}] = ${styleVar}`
                    } else {
                        code += `\nimport ${JSON.stringify(styleRequest)}`
                    }
                })
                if (hasScoped) {
                    code += `\n__script.__scopeId = "data-v-${id}"`
                }
            }

            // 3.如果有template标签, 则再次向文件发请求, 且带着参数type=template
            if (descriptor.template) {
                const requestPath = `${publicPath}?type=template`
                code += `\nimport { render as __render } from "${requestPath}"`
                code += `\n__script.render = __render`
            }
            // 4.热更新标记
            code += `\n__script.__hmrId = ${JSON.stringify(publicPath)}`
            code += `\ntypeof __VUE_HMR_RUNTIME__ !== 'undefined' && __VUE_HMR_RUNTIME__.createRecord(__script.__hmrId, __script)`
            code += `\n__script.__file = ${JSON.stringify(filePath)}`
            code += `\nexport default __script`
            ctx.type = 'js'
            ctx.body = code
        }
        // 处理type=template的文件请求
        if (query.type === 'template') {
            // 将.vue文件中的template编译为render函数
            let content = descriptor.template.content
            // 把含有assets这种静态资源的路径 改为 /src/assets
            // console.log(/src\=[\"|\']\.\/assets/.test(content))
            content = content.replace(/\.\/assets/, '/src/assets')
            const id = hash_sum(publicPath)
            const { code } = compileSFCTemplate(root, content, id, descriptor.styles.some((s) => s.scoped))
            ctx.type = 'js'
            ctx.body = code
        }
        // 处理 type=style的文件请求
        if (query.type === 'style') {
            const index = Number(query.index)
            const styleBlock = descriptor.styles[index]
            const id = hash_sum(publicPath)
            const resource = filePath + `?type=style&index=${index}`
            const { code } = await compileStyleAsync({
                source: styleBlock.content,
                filename: resource,
                id: `data-v-${id}`,
                scoped: styleBlock.scoped != null,
                modules: styleBlock.module != null
            })
            ctx.type = 'js'
            ctx.body = codegenCss(`${id}-${index}`, code)
        }
    })

    /* .vue文件变化后具体执行方法
     * 1.vue-rerender 只发起请求类型为 template 的请求。无需请求整个完整的新组件
     * 2.vue-reload 发起新组件的完整请求
     * 3.style-update style 标签更新
     * 4.style-remove style 标签移除
    */
    const handleVueReload = async function (filePath, timestamp = Date.now(), content) {
        const publicPath = resolver.fileToRequest(root, filePath);
        const cacheEntry = vueCache.get(filePath)
        const { send } = watcher

        debugHmr(`busting Vue cache for ${filePath}`)
        vueCache.del(filePath)

        // 解析单文件
        const descriptor = await parseSFC(root, filePath)
        if (!descriptor) {
            // read failed
            return
        }

        // 获取缓存
        const prevDescriptor = cacheEntry && cacheEntry.descriptor
        if (!prevDescriptor) {
            // the file has never been accessed yet
            debugHmr(`no existing descriptor found for ${filePath}`)
            return
        }

        let needRerender = false

        // 声明vue-reload向客户端通信方法
        const sendReload = () => {
            send({
                type: 'vue-reload',
                path: publicPath,
                changeSrcPath: publicPath,
                timestamp
            })
            console.log(
                chalk.green(`[vite:hmr] `) +
                `${path.relative(root, filePath)} updated. (reload)`
            )
        }

        // 1.比较script或者<script setup>是否变化
        if (
            !isEqualBlock(descriptor.script, prevDescriptor.script) ||
            !isEqualBlock(descriptor.scriptSetup, prevDescriptor.scriptSetup)
        ) {
            return sendReload()
        }


        // 2.比较template模板是否变化
        if (!isEqualBlock(descriptor.template, prevDescriptor.template)) {
            needRerender = true
        }
        
        // 3.比较style标签是否有变化, 进行更新或者删除
        let didUpdateStyle = false
        const styleId = hash_sum(publicPath)
        const prevStyles = prevDescriptor.styles || []
        const nextStyles = descriptor.styles || []
        nextStyles.forEach((_, i) => {
            if (!prevStyles[i] || !isEqualBlock(prevStyles[i], nextStyles[i])) {
                didUpdateStyle = true
                const path = `${publicPath}?type=style&index=${i}`
                send({
                    type: 'style-update',
                    path,
                    changeSrcPath: path,
                    timestamp
                })
            }
        })
        // stale styles always need to be removed
        prevStyles.slice(nextStyles.length).forEach((_, i) => {
            didUpdateStyle = true
            send({
                type: 'style-remove',
                path: publicPath,
                id: `${styleId}-${i + nextStyles.length}`
            })
        })
        // 4.比较自定义块变化
        const prevCustoms = prevDescriptor.customBlocks || []
        const nextCustoms = descriptor.customBlocks || []
        if (
            nextCustoms.some(
                (_, i) =>
                ! prevCustoms[i] || !isEqualBlock(prevCustoms[i], nextCustoms[i])
            )
        ) {
            return sendReload()
        }

        // 如果需要重新render则发布通知
        if (needRerender) {
            send({
                type: 'vue-rerender',
                path: publicPath,
                changeSrcPath: publicPath,
                timestamp
            })
        }
        // 记录并输出update文件及种类
        let updateType = []
        if (needRerender) {
            updateType.push(`template`)
        }
        if (didUpdateStyle) {
            updateType.push(`style`)
        }
        if (updateType.length) {
            console.log(
                chalk.green(`[vite:hmr] `) +
                `${path.relative(root, filePath)} updated. (${updateType.join(
                    ' & '
                )})`
            )
        }
    }
    watcher.handleVueReload = handleVueReload
    // 侦测.vue文件的修改
    watcher.on('change', (file) => {
        if (file.endsWith('.vue')) {
            handleVueReload(file)
        }
    })
}

// 对比差异
function isEqualBlock(a, b) {
    if (!a && !b) return true
    if (!a || !b) return false
    // src imports will trigger their own updates
    if (a.src && b.src && a.src === b.src) return true
    if (a.content !== b.content) return false
    const keysA = Object.keys(a.attrs)
    const keysB = Object.keys(b.attrs)
    if (keysA.length !== keysB.length) {
        return false
    }
    return keysA.every((key) => a.attrs[key] === b.attrs[key])
}

// 解析vue单文件组件
async function parseSFC (root, filePath, content) {
    let cached = vueCache.get(filePath)
    if (cached && cached.descriptor) {
        debug(`${filePath} parse cache hit`)
        return cached.descriptor
    }
    // 解析
    const _content = await fs.readFile(filePath, 'utf8')
    const { descriptor } = parse(_content)
    // 缓存
    cached = cached || { styles: [], customs: [] }
    cached.descriptor = descriptor
    vueCache.set(filePath, cached)
    return descriptor
}

module.exports = vuePlugin
module.exports.vueCache = vueCache
