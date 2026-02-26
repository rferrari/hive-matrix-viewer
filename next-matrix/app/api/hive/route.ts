import { NextResponse } from 'next/server';
import { Client } from '@hiveio/dhive';

// Simple in-memory buffer for server-side caching
// Note: This is per-instance on Vercel and ephemeral.
let buffer: any[] = [];
const MAX_BUFFER_SIZE = 100;
let lastUpdate = 0;
let isStreaming = false;

const RPC_NODES = [
    "https://api.hive.blog",
    "https://api.deathwing.me",
    "https://hive-api.arcange.eu"
];
let client = new Client(RPC_NODES);

function startHiveStream() {
    if (isStreaming) return;
    isStreaming = true;

    console.log("Starting Hive stream for Next.js buffer...");
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
        lastUpdate = Date.now();
    });

    stream.on('error', (err) => {
        console.error("Stream error in Next.js backend:", err);
        isStreaming = false;
        setTimeout(startHiveStream, 5000);
    });
}

// Start the stream immediately when the module is loaded
if (typeof window === 'undefined') {
    startHiveStream();
}

export async function GET() {
    // Return the current buffer
    return NextResponse.json({
        ops: buffer,
        timestamp: Date.now(),
        lastUpdate
    });
}
