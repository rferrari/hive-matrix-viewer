'use client';

import { useState, useEffect, useRef } from 'react';

export interface HiveOp {
    type: string;
    data: any;
    blockNum: number;
    timestamp: string;
    receivedAt: number;
}

export function useHiveLive() {
    const [ops, setOps] = useState<HiveOp[]>([]);
    const [stats, setStats] = useState({ post: 0, comment: 0, transfer: 0, json: 0, vote: 0 });
    const [leaderboard, setLeaderboard] = useState<[string, number][]>([]);
    const [blockNum, setBlockNum] = useState(0);
    const [price, setPrice] = useState('loading…');
    const knownIds = useRef(new Set<string>());
    const accountActivity = useRef(new Map<string, number>());

    useEffect(() => {
        const poll = async () => {
            try {
                const res = await fetch('/api/hive');
                const { ops: newOps } = await res.json();

                if (!newOps || newOps.length === 0) return;

                const filtered = newOps.filter((op: HiveOp) => {
                    const id = `${op.blockNum}-${op.type}-${JSON.stringify(op.data).slice(0, 50)}`;
                    if (knownIds.current.has(id)) return false;
                    knownIds.current.add(id);
                    return true;
                });

                if (filtered.length > 0) {
                    setOps(prev => [...prev, ...filtered].slice(-400));

                    // Update stats and leaderboard based on new items
                    const newStats = { ...stats };
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
                        }

                        if (op.blockNum > blockNum) setBlockNum(op.blockNum);
                    });
                    setStats(newStats);

                    const top = [...accountActivity.current.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 10);
                    setLeaderboard(top);
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        const interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, [stats, blockNum]);

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
