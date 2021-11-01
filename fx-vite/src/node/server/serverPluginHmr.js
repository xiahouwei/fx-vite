
// 热替换插件
const path = require('path')
const fs = require('fs')
const WebSocket = require('ws');
const debugHmr = require('debug')('vite:hmr')
const { isCSSRequest } = require("../utils")

function hmrPlugin ({ app, watcher, server }) {
    app.use((ctx, next) => {
        return next()
    })
    // 创建websocket服务
    const wss = new WebSocket.Server({ noServer: true })
    // 监听浏览器vite-hmr的websocket请求
    server.on('upgrade', (req, socket, head) => {
        if (req.headers['sec-websocket-protocol'] === 'vite-hmr') {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req)
            })
        }
    })
    // 监听connection, 向浏览器发送connected状态
    wss.on('connection', (socket) => {
        debugHmr('ws client connected')
        socket.send(JSON.stringify({ type: 'connected' }))
    })
   
    // socket发布api
    const send = function (payload) {
        const stringified = JSON.stringify(payload, null, 2)
        debugHmr(`update: ${stringified}`)
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(stringified)
            }
        })
    }
    watcher.send = send

    // 侦测js等非.vue, 非css文件改变
    const handleJSReload = function (filePath, timestamp = Date.now()) {
        console.log('js change....', filePath, timestamp)
    }

    watcher.on('change', (file) => {
        // console.log('file-change')
        // const filePath = path.resolve(__dirname, '../../', file);
        // const data = fs.readFileSync(filePath, 'utf-8');
        // const stringified = JSON.stringify({ type: 'vue-reload' })
        // // console.log(stringified)
        // debugHmr(`update: ${stringified}`)
        // console.log(wss.clients)
        // wss.clients.forEach((client) => {
        //     if (client.readyState === WebSocket.OPEN) {
        //         client.send(stringified)
        //     }
        // })

        if (!(file.endsWith('.vue') || isCSSRequest(file))) {
            // everything except plain .css are considered HMR dependencies.
            // plain css has its own HMR logic in ./serverPluginCss.ts.
            handleJSReload(file)
        }
    });

}

module.exports = hmrPlugin
module.exports.debugHmr = debugHmr