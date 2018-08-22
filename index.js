const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 44555 })

wss.on('connection', (ws, req) => {
    ws.on('message', message => {
        var data = JSON.parse(message);
        let type = data.type;
        let args = data.args;
        if (type === 'log') {
            console.log(...args);
        } else if (type === 'info') {
            console.info(...args)
        } else if (type === 'warn') {
            console.warn(...args);
        } else if (type === 'error') {
            console.error(...args)
        } else if (type === '_open') {
            console.clear()
        }
    });
})