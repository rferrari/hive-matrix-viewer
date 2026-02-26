'use client';

import { useState } from 'react';
import Link from 'next/link';
import MatrixRain from './MatrixRain';
import HUD from './HUD';
import MatrixFeed from './MatrixFeed';
import { useHiveLive, HiveOp, HiveSnapshot } from '../hooks/useHiveLive';

interface ClientHomeProps {
    initialData: HiveSnapshot;
}

export default function ClientHome({ initialData }: ClientHomeProps) {
    const { ops, stats, leaderboard, blockNum, price } = useHiveLive(initialData);
    const [filter, setFilter] = useState('');
    const [activeTypes, setActiveTypes] = useState(new Set(['post', 'comment', 'transfer', 'json', 'vote', 'block']));
    const [panelWidth, setPanelWidth] = useState(520);
    const [isResizing, setIsResizing] = useState(false);

    const toggleType = (type: string) => {
        const newSet = new Set(activeTypes);
        if (newSet.has(type)) newSet.delete(type);
        else newSet.add(type);
        setActiveTypes(newSet);
    };

    const startResizing = (e: React.MouseEvent) => {
        setIsResizing(true);
        const onMouseMove = (moveEvent: MouseEvent) => {
            const newWidth = window.innerWidth - moveEvent.clientX;
            if (newWidth >= 300 && newWidth <= window.innerWidth * 0.8) {
                setPanelWidth(newWidth);
                document.documentElement.style.setProperty('--panel-width', `${newWidth}px`);
            }
        };
        const onMouseUp = () => {
            setIsResizing(false);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <main className={isResizing ? 'resizing' : ''}>
            <MatrixRain />

            <HUD
                blockNum={blockNum}
                leaderboard={leaderboard}
            />

            <div id="panel" style={{ width: panelWidth }}>
                <div id="resizer" onMouseDown={startResizing} />

                <div id="header">
                    <div className="title">Hive Matrix Viewer</div>
                    <div className="subtitle">Real-time Hive blockchain data explorer</div>
                </div>

                <div id="stats-bar">
                    {['post', 'comment', 'transfer', 'json', 'vote', 'block'].map((type) => (
                        <button
                            key={type}
                            className={`stat-item toggle-btn ${activeTypes.has(type) ? 'active' : ''}`}
                            onClick={() => toggleType(type)}
                        >
                            {type.toUpperCase()}S: <span>{stats[type as keyof typeof stats] ?? 0}</span>
                        </button>
                    ))}
                </div>
                <div id="price-bar">HIVE/USD: <b id="hive-price">{price}</b></div>

                <div id="filter-bar">
                    <div id="filter-label">FILTER:</div>
                    <input
                        id="filter-input"
                        type="text"
                        placeholder="regex or string..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                <MatrixFeed
                    ops={ops}
                    filter={filter}
                    activeTypes={activeTypes}
                />
            </div>
        </main>
    );
}
