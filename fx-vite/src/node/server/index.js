const koa = require('koa');
const chokidar = require('chokidar'); // 文件修改侦测
const resolver = require('../resolver');
const moduleResolvePlugin = require('./serverPluginModuleResolve');
const moduleRewritePlugin = require('./serverPluginModuleRewrite');
const serverStaticPlugin = require('./serverPluginServerStatic');
const vuePlugin = require('./serverPluginVue');
const cssPlugin = require('./serverPluginCss');
const clientPlugin = require('./serverPluginClient');
const htmlRewritePlugin = require('./serverPluginHtml');
const hmrPlugin = require('./serverPluginHmr');

function createServer () {
    const app = new koa();
    // 目录路径
    const root = process.cwd()
    const watcher = chokidar.watch(root, {
        ignored: ['**/node_modules/**', '**/.git/**'],
        // #610
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 10
        }
    });
    const server =  resolveServer(app.callback())
    const context = {
        app,
        root,
        server,
        watcher,
        resolver,
        port: 4000
    }
    app.use((ctx, next) => {
        Object.assign(ctx, context)
        return next()
    })
    // 引用插件,传入上下文
    const resolvePlugins = [
        // module路径重写插件
        moduleRewritePlugin,
        // html重写插件
        htmlRewritePlugin,
        // module模块解析插件
        moduleResolvePlugin,
        // 引入client.js文件(动态添加css, ws服务)
        clientPlugin,
        // 热替换插件
        hmrPlugin,
        // 解析vue文件
        vuePlugin,
        // 解析css文件
        cssPlugin,
        // 静态服务插件,返回文件
        serverStaticPlugin
    ]
    resolvePlugins.forEach(plugin => plugin(context))

    
    const listen = server.listen.bind(server)
    server.listen = (async (port, ...args) => {
        return listen(port, ...args)
    })
    server.once('listening', () => {
        context.port = server.address().port
    })
    return server

    // return app
}

function resolveServer (requestListener) {
    return require('http').createServer(requestListener)
}

module.exports.createServer = createServer
