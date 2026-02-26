'use client';

import { useEffect, useRef } from 'react';
import { HiveOp } from '../hooks/useHiveLive';

interface MatrixFeedProps {
    ops: HiveOp[];
    filter: string;
    activeTypes: Set<string>;
}

export default function MatrixFeed({ ops, filter, activeTypes }: MatrixFeedProps) {
    const feedRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [ops]);

    const filteredOps = ops.filter(op => {
        if (!activeTypes.has(op.type === 'comment' && op.data.parent_author === '' ? 'post' : op.type === 'custom_json' ? 'json' : op.type)) return false;
        if (!filter) return true;
        return JSON.stringify(op).toLowerCase().includes(filter.toLowerCase());
    });

    return (
        <div id="feed" ref={feedRef}>
            {filteredOps.map((op, i) => (
                <OpEntry key={i} op={op} />
            ))}
        </div>
    );
}

function OpEntry({ op }: { op: HiveOp }) {
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
        const whaleClass = amount >= 1000 ? 'tag-whale' : '';
        const amtClass = amount >= 1000 ? 'amount-whale' : amount >= 100 ? 'amount-large' : amount >= 10 ? 'amount-mid' : 'amount-small';

        content = (
            <>
                <span className={`tag tag-transfer ${whaleClass}`}>TRANSFER</span>
                <a href={`https://peakd.com/@${data.from}`} className="author">@{data.from}</a> sent
                <b className={amtClass}> {data.amount}</b> to
                <a href={`https://peakd.com/@${data.to}`} className="author"> @${data.to}</a>
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
}
