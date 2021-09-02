const PORT = 4000;
const start = Date.now();
const argv = require('minimist')(process.argv.slice(2)); // 解析命令参数
// make sure to set debug flag before requiring anything
if (argv.debug) {
    process.env.DEBUG = `vite:` + (argv.debug === true ? '*' : argv.debug);
}


const os = require("os");
const chalk = require("chalk"); // 终端字体插件

runServer()

function runServer () {
    const server = require('./server').createServer();
    const port = PORT;
    const hostname = 'localhost';
    const protocol = 'http'
    server.listen(port, () => {
        console.log();
        console.log(`  FX-Dev server running at:`);
        // 获取网卡信息
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