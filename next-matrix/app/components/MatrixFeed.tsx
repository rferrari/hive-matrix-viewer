'use client';

import { useEffect, useRef, useCallback, memo } from 'react';
import { HiveOp } from '../hooks/useHiveLive';

interface MatrixFeedProps {
    ops: HiveOp[];
    filter: string;
    activeTypes: Set<string>;
}

export default function MatrixFeed({ ops, filter, activeTypes }: MatrixFeedProps) {
    const feedRef = useRef<HTMLDivElement>(null);
    const isAtBottom = useRef(true);
    const isFirstRender = useRef(true);

    // Track whether user is scrolled to the bottom
    const handleScroll = useCallback(() => {
        if (feedRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = feedRef.current;
            // Consider "at bottom" if within 50px of the bottom
            isAtBottom.current = scrollHeight - scrollTop - clientHeight < 50;
        }
    }, []);

    useEffect(() => {
        if (feedRef.current) {
            // Always scroll to bottom on first render
            if (isFirstRender.current) {
                feedRef.current.scrollTop = feedRef.current.scrollHeight;
                isFirstRender.current = false;
                return;
            }

            // Only auto-scroll if user was already at the bottom
            if (isAtBottom.current) {
                feedRef.current.scrollTop = feedRef.current.scrollHeight;
            }
        }
    }, [ops]);

    const filteredOps = ops.filter(op => {
        // Block separators: controlled by the 'block' toggle
        if (op.type === 'block_separator') {
            return activeTypes.has('block');
        }

        // Regular ops: check type toggle
        const displayType = op.type === 'comment' && op.data.parent_author === '' ? 'post' : op.type === 'custom_json' ? 'json' : op.type;
        if (!activeTypes.has(displayType)) return false;

        // Apply text filter
        if (!filter) return true;
        return JSON.stringify(op).toLowerCase().includes(filter.toLowerCase());
    });

    return (
        <div id="feed" ref={feedRef} onScroll={handleScroll}>
            {filteredOps.map((op, i) => (
                op.type === 'block_separator'
                    ? <BlockSeparator key={`sep-${op.blockNum}`} op={op} />
                    : <OpEntry key={i} op={op} />
            ))}
        </div>
    );
}

const BlockSeparator = memo(({ op }: { op: HiveOp }) => {
    const time = new Date(op.timestamp + 'Z').toLocaleTimeString([], { hour12: false });
    const blockStr = `#${op.blockNum.toLocaleString()}`;
    return (
        <div className="block-sep">
            ── {blockStr} · {time} ─────────────────────────────────
        </div>
    );
});

function getTransferLevel(amount: number) {
    if (amount >= 10000) return { level: 'WHALE', emoji: ' 🐳', className: 'tag-whale', amtClass: 'amount-whale' };
    if (amount >= 1000) return { level: 'ORCA', emoji: ' 🫍', className: 'tag-orca', amtClass: 'amount-orca' };
    if (amount >= 100) return { level: 'DOLPHIN', emoji: ' 🐬', className: 'tag-dolphin', amtClass: 'amount-dolphin' };
    if (amount >= 10) return { level: 'MINNOW', emoji: ' 🐟', className: 'tag-minnow', amtClass: 'amount-minnow' };
    return { level: '', emoji: '', className: 'tag-transfer', amtClass: 'amount-small' };
}

const OpEntry = memo(({ op }: { op: HiveOp }) => {
    const { type, data, timestamp } = op;
    const time = new Date(timestamp + 'Z').toLocaleTimeString([], { hour12: false });

    let content = null;

    if (type === 'comment') {
        const isPost = data.parent_author === '';
        content = (
            <>
                <span className={`tag tag-${isPost ? 'post' : 'comment'}`}>{isPost ? 'POST' : 'COMMENT'}</span>
                <a href={`https://peakd.com/@${data.author}`} className="author" target="_blank">@{data.author}</a>
                {isPost ? ` published "${data.title}"` : ` replied to @${data.parent_author}`}
            </>
        );
    } else if (type === 'transfer') {
        const amount = parseFloat(data.amount);
        const { level, emoji, className, amtClass } = getTransferLevel(amount);

        content = (
            <>
                <span className={`tag ${className}`}>TRANSFER{emoji}{level}</span>
                <a href={`https://peakd.com/@${data.from}`} className="author" target="_blank">@{data.from}</a> sent
                <b className={amtClass}> {data.amount}</b> to
                <a href={`https://peakd.com/@${data.to}`} className="author" target="_blank"> @${data.to}</a>
                {data.memo && <span className="memo"> [{data.memo}]</span>}
            </>
        );
    } else if (type === 'custom_json') {
        content = (
            <>
                <span className="tag tag-json">JSON</span>
                <span className="appname">[{data.id}]</span> by
                <span className="author"> @{[...(data.required_posting_auths || []), ...(data.required_auths || [])][0]}</span>
            </>
        );
    } else if (type === 'vote') {
        content = (
            <>
                <span className="tag tag-vote">VOTE</span>
                <a href={`https://peakd.com/@${data.voter}`} className="author">@{data.voter}</a>
                <span> {data.weight / 100}% on </span>
                <a href={`https://peakd.com/@${data.author}`} className="author">@{data.author}</a>
            </>
        );
    }

    return (
        <div className="op">
            <span className="ts">[{time}] </span>
            {content}
        </div>
    );
});
