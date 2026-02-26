import { Client } from '@hiveio/dhive';

// Simple in-memory buffer for server-side caching
// Note: This is per-instance on Vercel and ephemeral.
let buffer: any[] = [];
const MAX_BUFFER_SIZE = 500;
let isStreaming = false;

// Server-side stats and leaderboard for consistent initial state
const serverStats = { post: 0, comment: 0, transfer: 0, json: 0, vote: 0, block: 0 };
const serverAccountActivity = new Map<string, number>();

// Active SSE connections
export const clients = new Set<ReadableStreamDefaultController>();

const RPC_NODES = [
    "https://api.hive.blog",
    "https://api.deathwing.me",
    "https://hive-api.arcange.eu"
];
let client = new Client(RPC_NODES);

function updateServerStats(type: string, data: any) {
    if (type === 'comment') {
        serverStats[data.parent_author === '' ? 'post' : 'comment']++;
        serverAccountActivity.set(data.author, (serverAccountActivity.get(data.author) || 0) + 1);
    } else if (type === 'transfer') {
        serverStats.transfer++;
        [data.from, data.to].forEach(a => serverAccountActivity.set(a, (serverAccountActivity.get(a) || 0) + 1));
    } else if (type === 'custom_json') {
        serverStats.json++;
        const auths = [...(data.required_posting_auths || []), ...(data.required_auths || [])];
        auths.forEach(a => serverAccountActivity.set(a, (serverAccountActivity.get(a) || 0) + 1));
    } else if (type === 'vote') {
        serverStats.vote++;
        serverAccountActivity.set(data.voter, (serverAccountActivity.get(data.voter) || 0) + 1);
    }
}

let lastKnownBlock = 0;

export function startHiveStream() {
    if (isStreaming) return;
    isStreaming = true;

    console.log("Starting Hive stream for Next.js SSE...");
    const stream = client.blockchain.getOperationsStream();

    stream.on('data', (op: any) => {
        // dhive AppliedOperation usually has block_num, but let's be safe
        const block_num = op.block_num ?? op.blockNum ?? op.block;
        const timestamp = op.timestamp ?? op.time ?? new Date().toISOString();
        const operation = op.op;

        if (!operation || !Array.isArray(operation)) return;
        const [type, data] = operation;

        // Detect block transition and insert block separator
        if (block_num && block_num > lastKnownBlock) {
            // console.log(`Block transition detected: ${lastKnownBlock} -> ${block_num}`);
            lastKnownBlock = block_num;
            serverStats.block++;
            const sepEntry = {
                type: 'block_separator',
                data: { blockNum: block_num },
                blockNum: block_num,
                timestamp,
                receivedAt: Date.now()
            };
            buffer.push(sepEntry);
            if (buffer.length > MAX_BUFFER_SIZE) {
                buffer.shift();
            }
            broadcastEntry(sepEntry);
        }

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

        // Update server-side stats
        updateServerStats(type, data);

        // Broadcast to all connected SSE clients
        broadcastEntry(entry);
    });

    stream.on('error', (err) => {
        console.error("Stream error in Next.js backend:", err);
        isStreaming = false;
        setTimeout(startHiveStream, 5000);
    });
}

function broadcastEntry(entry: any) {
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
}


export function getHiveSnapshot() {
    const leaderboard = [...serverAccountActivity.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    return {
        ops: buffer,
        stats: { ...serverStats },
        leaderboard
    };
}

// Keep backward compat just in case
export function getHiveBuffer() {
    return buffer;
}
