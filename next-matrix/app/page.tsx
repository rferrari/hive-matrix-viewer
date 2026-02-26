'use client';

import { useState } from 'react';
import MatrixRain from './components/MatrixRain';
import HUD from './components/HUD';
import MatrixFeed from './components/MatrixFeed';
import { useHiveLive } from './hooks/useHiveLive';

export default function Home() {
  const { ops, stats, leaderboard, blockNum, price } = useHiveLive();
  const [filter, setFilter] = useState('');
  const [activeTypes, setActiveTypes] = useState(new Set(['post', 'comment', 'transfer', 'json', 'vote']));
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
          <div className="title">Hive Matrix Matrix</div>
          <div className="subtitle">Real-time Hive blockchain data</div>
        </div>

        <div id="stats-bar">
          <div className="stat-item no-toggle">
            BLOCK: <span id="s-block">#{blockNum.toLocaleString()}</span>
          </div>
          {['post', 'comment', 'transfer', 'json', 'vote'].map((type) => (
            <button
              key={type}
              className={`stat-item toggle-btn ${activeTypes.has(type) ? 'active' : ''}`}
              onClick={() => toggleType(type)}
            >
              {type.toUpperCase()}S: <span>{stats[type as keyof typeof stats]}</span>
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
