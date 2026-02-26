'use client';

interface HUDProps {
    blockNum: number;
    leaderboard: [string, number][];
}

export default function HUD({ blockNum, leaderboard }: HUDProps) {
    const logoAscii = `
██╗  ██╗██╗██╗   ██╗███████╗
██║  ██║██║██║   ██║██╔════╝
███████║██║██║   ██║█████╗  
██╔══██║██║╚██╗ ██╔╝██╔══╝  
██║  ██║██║ ╚████╔╝ ███████╗
╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
      HIVE MATRIX VIEWER`;

    return (
        <>
            <div id="leaderboard">
                <h3 title="Ranking of accounts by total observed operations in this session">TOP ACCOUNTS ⓘ</h3>
                <div id="leader-list">
                    {leaderboard.length === 0 ? "Wait for data..." : leaderboard.map(([acc, n], i) => (
                        <div key={acc} className="leader-row">
                            <span className="leader-rank">{(i + 1) % 10}.</span>
                            <span className="leader-name">@{acc}</span>
                            <span className="leader-count">({n})</span>
                        </div>
                    ))}
                </div>
            </div>

            <div id="left-panel">
                <div id="logo" style={{ marginBottom: 0 }}>{logoAscii}</div>
                <div id="block-display">
                    {blockNum ? `Block #${blockNum.toLocaleString()}` : "Connecting to the Hive blockchain…"}
                </div>
                <div id="connection-status">
                    <span className="status-ok">● buffered stream via next.js</span>
                </div>
            </div>
        </>
    );
}
