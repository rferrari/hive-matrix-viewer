import { NextResponse } from 'next/server';
import { startHiveStream, getHiveBuffer, clients } from '../../lib/hiveStream';

// Prevent Next.js from caching the SSE route
export const dynamic = 'force-dynamic';

// Start the stream immediately when the module is loaded
if (typeof window === 'undefined') {
    startHiveStream();
}

export async function GET(req: Request) {
    const stream = new ReadableStream({
        start(controller) {
            clients.add(controller);

            // Send the current buffer immediately upon connection
            const buffer = getHiveBuffer();
            const message = `data: ${JSON.stringify(buffer)}\n\n`;
            controller.enqueue(new TextEncoder().encode(message));

            // Keep-alive ping to prevent connection drops (every 30s)
            const interval = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(`:\n\n`));
                } catch (err) {
                    clearInterval(interval);
                    clients.delete(controller);
                }
            }, 30000);

            // Cleanup when stream ends via this specific request
            req.signal.addEventListener('abort', () => {
                clearInterval(interval);
                clients.delete(controller);
            });
        },
        cancel(controller) {
            clients.delete(controller);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
