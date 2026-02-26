'use client';

import { useState, useEffect, useRef } from 'react';

export interface HiveOp {
    type: string;
    data: any;
    blockNum: number;
    timestamp: string;
    receivedAt: number;
}

export interface HiveSnapshot {
    ops: HiveOp[];
    stats: { post: number; comment: number; transfer: number; json: number; vote: number; block: number };
    leaderboard: [string, number][];
}

const MAX_CLIENT_OPS = 150;
const MAX_KNOWN_IDS = 1000;
const LEADERBOARD_UPDATE_INTERVAL = 5000; // Update leaderboard every 5s

export function useHiveLive(initialData: HiveSnapshot) {
    const [ops, setOps] = useState<HiveOp[]>(initialData.ops);

    const accountActivity = useRef(new Map<string, number>(
        initialData.leaderboard.map(([name, count]) => [name, count] as [string, number])
    ));

    // Also seed accountActivity from all initial ops for accuracy
    useEffect(() => {
        initialData.ops.forEach(op => {
            const { type, data } = op;
            if (type === 'comment') accountActivity.current.set(data.author, (accountActivity.current.get(data.author) || 0) + 1);
            else if (type === 'transfer') [data.from, data.to].forEach(a => accountActivity.current.set(a, (accountActivity.current.get(a) || 0) + 1));
            else if (type === 'custom_json') {
                const auths = [...(data.required_posting_auths || []), ...(data.required_auths || [])];
                auths.forEach(a => accountActivity.current.set(a, (accountActivity.current.get(a) || 0) + 1));
            } else if (type === 'vote') accountActivity.current.set(data.voter, (accountActivity.current.get(data.voter) || 0) + 1);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const knownIds = useRef(new Set<string>(
        initialData.ops.map(op => `${op.blockNum}-${op.type}-${JSON.stringify(op.data).slice(0, 50)}`)
    ));

    const [stats, setStats] = useState(() => ({ ...initialData.stats }));

    const [leaderboard, setLeaderboard] = useState<[string, number][]>(initialData.leaderboard);

    const [blockNum, setBlockNum] = useState(() => {
        if (!initialData.ops || initialData.ops.length === 0) return 0;
        const nums = initialData.ops.map(op => op.blockNum).filter(n => typeof n === 'number');
        return nums.length > 0 ? Math.max(...nums) : 0;
    });

    const [price, setPrice] = useState('loading…');

    useEffect(() => {
        const source = new EventSource('/api/hive');

        source.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);

                // If this is the initial snapshot from SSE
                if (parsed && parsed.snapshot === true) {
                    // If we already have data from SSR, skip most of it
                    // but we can still use it to seed blockNum and stats if they are 0
                    setBlockNum(prev => prev || (parsed.ops.length > 0 ? Math.max(...parsed.ops.map((op: any) => op.blockNum)) : 0));
                    setOps(prev => prev.length === 0 ? parsed.ops : prev);
                    setStats(prev => {
                        const isAllZero = Object.values(prev).every(v => v === 0);
                        return isAllZero ? parsed.stats : prev;
                    });
                    if (leaderboard.length === 0) setLeaderboard(parsed.leaderboard);
                    return;
                }

                // Regular array of new ops
                const newOps: HiveOp[] = parsed;
                if (!newOps || newOps.length === 0) return;

                const filtered = newOps.filter((op: HiveOp) => {
                    const id = `${op.blockNum}-${op.type}-${JSON.stringify(op.data).slice(0, 50)}`;
                    if (knownIds.current.has(id)) return false;
                    knownIds.current.add(id);
                    return true;
                });

                // Cap knownIds to prevent memory growth
                if (knownIds.current.size > MAX_KNOWN_IDS) {
                    const sorted = Array.from(knownIds.current);
                    knownIds.current = new Set(sorted.slice(-MAX_CLIENT_OPS));
                }

                if (filtered.length > 0) {
                    setOps(prev => [...prev, ...filtered].slice(-MAX_CLIENT_OPS));

                    // Update stats and leaderboard based on new items
                    setStats(prevStats => {
                        const newStats = { ...prevStats };
                        filtered.forEach((op: HiveOp) => {
                            const type = op.type;
                            const data = op.data;

                            if (type === 'comment') {
                                newStats[data.parent_author === '' ? 'post' : 'comment']++;
                                accountActivity.current.set(data.author, (accountActivity.current.get(data.author) || 0) + 1);
                            } else if (type === 'transfer') {
                                newStats.transfer++;
                                [data.from, data.to].forEach(a => accountActivity.current.set(a, (accountActivity.current.get(a) || 0) + 1));
                            } else if (type === 'custom_json') {
                                newStats.json++;
                                const auths = [...(data.required_posting_auths || []), ...(data.required_auths || [])];
                                auths.forEach(a => accountActivity.current.set(a, (accountActivity.current.get(a) || 0) + 1));
                            } else if (type === 'vote') {
                                newStats.vote++;
                                accountActivity.current.set(data.voter, (accountActivity.current.get(data.voter) || 0) + 1);
                            } else if (type === 'block_separator') {
                                newStats.block++;
                            }
                        });
                        return newStats;
                    });

                    setBlockNum(prev => {
                        let max = prev;
                        filtered.forEach(op => {
                            if (op.blockNum && typeof op.blockNum === 'number' && op.blockNum > max) {
                                max = op.blockNum;
                            }
                        });
                        return max;
                    });

                }
            } catch (err) {
                console.error("SSE parse error:", err);
            }
        };

        // Throttled leaderboard update
        const leaderboardInterval = setInterval(() => {
            const top = [...accountActivity.current.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            setLeaderboard(top);

            // Periodically prune accountActivity to prevent unbounded growth
            // (Only keep users who have at least some minimal activity or are in top 100)
            if (accountActivity.current.size > 2000) {
                const pruned = [...accountActivity.current.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 500);
                accountActivity.current = new Map(pruned);
            }
        }, LEADERBOARD_UPDATE_INTERVAL);

        source.onerror = (err) => {
            console.error("SSE connection error:", err);
        };

        return () => {
            source.close();
            clearInterval(leaderboardInterval);
        };
    }, []);

    // Price fetcher
    useEffect(() => {
        const fetchPrice = async () => {
            try {
                const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hive&vs_currencies=usd');
                const d = await r.json();
                const p = d?.hive?.usd;
                setPrice(p ? `$${p.toFixed(4)}` : 'unavailable');
            } catch (_) { }
        };
        fetchPrice();
        const interval = setInterval(fetchPrice, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return { ops, stats, leaderboard, blockNum, price };
}
