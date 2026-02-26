import { Client } from '@hiveio/dhive';

// Simple in-memory buffer for server-side caching
// Note: This is per-instance on Vercel and ephemeral.
let buffer: any[] = [];
const MAX_BUFFER_SIZE = 100;
let isStreaming = false;

// Active SSE connections
export const clients = new Set<ReadableStreamDefaultController>();

const RPC_NODES = [
    "https://api.hive.blog",
    "https://api.deathwing.me",
    "https://hive-api.arcange.eu"
];
let client = new Client(RPC_NODES);

export function startHiveStream() {
    if (isStreaming) return;
    isStreaming = true;

    console.log("Starting Hive stream for Next.js SSE...");
    const stream = client.blockchain.getOperationsStream();

    stream.on('data', (op) => {
        const { op: operation, block_num, timestamp } = op;
        const [type, data] = operation;

        // Simplify for buffer
        const entry = {
            type,
            data,
            blockNum: block_num,
            timestamp,
            receivedAt: Date.now()
        };

        buffer.push(entry);
        if (buffer.length > MAX_BUFFER_SIZE) {
            buffer.shift();
        }

        // Broadcast to all connected SSE clients
        if (clients.size > 0) {
            const message = `data: ${JSON.stringify([entry])}\n\n`;
            const encoder = new TextEncoder();
            const encoded = encoder.encode(message);

            for (const controller of clients) {
                try {
                    controller.enqueue(encoded);
                } catch (err) {
                    clients.delete(controller);
                }
            }
        }
    });

    stream.on('error', (err) => {
        console.error("Stream error in Next.js backend:", err);
        isStreaming = false;
        setTimeout(startHiveStream, 5000);
    });
}

export function getHiveBuffer() {
    return buffer;
}
