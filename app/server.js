const express = require('express');
const path = require('path');

const app = express();
const clients = new Set();
let serverConfig = {};

// Serve the browser Matrix UI from /public
app.use(express.static(path.join(__dirname, '..', 'public')));

// SSE endpoint — browser connects here to receive live ops
app.get('/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Send initial config on connect
    res.write(`data: ${JSON.stringify({ kind: 'config', config: serverConfig })}\n\n`);
    res.write('data: {"type":"connected"}\n\n');

    clients.add(res);
    req.on('close', () => clients.delete(res));
});

// Broadcast a JSON event to all connected SSE clients
function broadcast(event) {
    if (clients.size === 0) return;
    const data = `data: ${JSON.stringify(event)}\n\n`;
    for (const client of clients) {
        try { client.write(data); } catch (_) { clients.delete(client); }
    }
}

function startServer(config, port = 3005) {
    serverConfig = config;
    app.listen(port, '0.0.0.0', () => {
        const Reset = '\x1b[0m', Green = '\x1b[32m', Cyan = '\x1b[36m';
        console.log(`${Green}[Browser UI]${Reset} ${Cyan}http://localhost:${port}${Reset}`);
    });
}

module.exports = { broadcast, startServer };
