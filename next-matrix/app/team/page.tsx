'use client';

import { useEffect, useState } from 'react';
import MatrixRain from '../components/MatrixRain';
import Link from 'next/link';

interface TeamMember {
    name: string;
    profile_image: string;
    location: string;
    about: string;
    balances: {
        hive: string;
        hbd: string;
        savings_hive: string;
        savings_hbd: string;
    };
    hp: {
        total: string;
        staked: string;
    };
    voting_power: string;
}

export default function TeamPage() {
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/team')
            .then(res => res.json())
            .then(data => {
                setTeam(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    return (
        <main>
            <MatrixRain />

            <div className="team-container">
                <div style={{ marginBottom: '40px' }}>
                    <Link href="/" className="author" style={{ fontSize: '12px' }}>← BACK TO FEED</Link>
                    <h1 style={{ marginTop: '20px', color: '#0f0', letterSpacing: '4px', textTransform: 'uppercase', fontSize: '24px' }}>
                        Meet Skatehive Team
                    </h1>
                    <p style={{ color: '#0f06', fontSize: '11px', marginTop: '5px' }}>SKATEHIVE COMMUNITY TEAM · ACTIVE PERSONNEL</p>
                </div>

                {loading ? (
                    <div style={{ color: '#0f0', fontSize: '14px' }}>DECRYPTING ACCOUNTS PROFILES...</div>
                ) : (
                    <div className="team-grid">
                        {team.map(member => (
                            <AgentCard key={member.name} member={member} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

function AgentCard({ member }: { member: TeamMember }) {
    return (
        <div className="agent-card">
            <div className="agent-header">
                <div className="agent-pfp">
                    <img src={member.profile_image} alt={member.name} />
                </div>
                <div className="agent-info">
                    <h2>@{member.name}</h2>
                    <div className="location">FROM: {member.location}</div>
                </div>
            </div>

            <div className="agent-stats">
                <div className="stat-label">HIVE TOKENS:</div>
                <div className="stat-value">{member.balances.hive}</div>

                <div className="stat-label">SAVINGS:</div>
                <div className="stat-value">{member.balances.savings_hive}</div>

                <div className="stat-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="stat-label">STAKED HIVE:</span>
                        <span className="stat-value" style={{ color: '#ff0' }}>{parseFloat(member.hp.staked).toLocaleString()} HP</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                        <span className="stat-label">USABLE HP:</span>
                        <span className="stat-value">{parseFloat(member.hp.total).toLocaleString()} HP</span>
                    </div>
                </div>

                <div className="stat-label" style={{ marginTop: '5px' }}>HBD TOKENS:</div>
                <div className="stat-value" style={{ marginTop: '5px' }}>{member.balances.hbd}</div>

                <div className="stat-label">SAVINGS:</div>
                <div className="stat-value">{member.balances.savings_hbd}</div>

                <div className="stat-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="stat-label">VOTING POWER:</span>
                        <span className="stat-value">{member.voting_power}%</span>
                    </div>
                    <div className="vp-bar-container">
                        <div className="vp-bar" style={{ width: `${member.voting_power}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
}
