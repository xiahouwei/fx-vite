const PORT = 4000; // 设置默认端口
const start = Date.now();
const argv = require('minimist')(process.argv.slice(2)); // 解析命令参数
// 根据是否传入--debug * 来设置DEBUG环境变量
if (argv.debug) {
    process.env.DEBUG = `vite:` + (argv.debug === true ? '*' : argv.debug);
}


const os = require("os"); // os模块用于一些系统操作, 这里主要用获取网卡信息
const chalk = require("chalk"); // 终端字体插件, 这里用于改变  http://192.168.31.17:3000/ 显示的颜色

runServer()

function runServer () {
    // 创建koa服务
    const server = require('./server').createServer();
    const port = PORT;
    const hostname = 'localhost';
    const protocol = 'http'
    server.listen(port, () => {
        console.log();
        console.log(`  FX-Dev server running at:`);
        // 获取网卡信息 根据当前ip来提示用户开启的服务
        const interfaces = os.networkInterfaces(); 
        Object.keys(interfaces).forEach((key) => (interfaces[key] || [])
            .filter(details => details.family === 'IPv4')
            .map(detail => {
                return {
                    type: detail.address.includes('127.0.0.1')
                        ? 'Local:   '
                        : 'Network: ',
                    host: detail.address.replace('127.0.0.1', hostname)
                };
            }).forEach(({ type, host }) => {
                const url = `${protocol}://${host}:${chalk.bold(port)}/`;
                console.log(`  > ${type} ${chalk.cyan(url)}`);
            })
        );
        console.log();
        require('debug')('vite:server')(`server ready in ${Date.now() - start}ms.`);
    })
}