import { NextResponse } from 'next/server';
import { Client } from '@hiveio/dhive';

const client = new Client(['https://api.hive.blog', 'https://api.deathwing.me', 'https://anyx.io']);

const TEAM_MEMBERS = [
    'vaipraonde',
    'xvlad',
    'devferri',
    'r4topunk',
    'mengao',
    'web-gnar',
    'willyfox',
    'thejajasper',
    'nogenta',
    'blessskateshop'
];

export async function GET() {
    try {
        const [accounts, globals] = await Promise.all([
            client.database.getAccounts(TEAM_MEMBERS),
            client.database.getConfig() // We actually need getDynamicGlobalProperties for HP
        ]);

        const props = await client.database.getDynamicGlobalProperties();

        const tvfs = parseFloat(props.total_vesting_fund_hive as string);
        const tvs = parseFloat(props.total_vesting_shares as string);

        const teamData = accounts.map(acc => {
            const vesting_shares = parseFloat(acc.vesting_shares as string);
            const received_shares = parseFloat(acc.received_vesting_shares as string);
            const delegated_shares = parseFloat(acc.delegated_vesting_shares as string);

            const total_shares = vesting_shares + received_shares - delegated_shares;
            const hp = (total_shares * tvfs) / tvs;
            const staked_hp = (vesting_shares * tvfs) / tvs;

            // Simple voting power calculation
            const last_vote_time = new Date(acc.last_vote_time + 'Z').getTime();
            const now = new Date().getTime();
            const seconds_since_last_vote = (now - last_vote_time) / 1000;
            let current_vp = acc.voting_power + (10000 * seconds_since_last_vote / 432000);
            current_vp = Math.min(current_vp / 100, 100);

            // Metadata/Profile
            let profile = { name: '', about: '', location: '', profile_image: '' };
            try {
                const metadata = JSON.parse(acc.posting_json_metadata || acc.json_metadata || '{}');
                profile = { ...profile, ...metadata.profile };
            } catch (e) { }

            return {
                name: acc.name,
                profile_image: profile.profile_image || `https://images.hive.blog/u/${acc.name}/avatar`,
                location: profile.location || 'Unknown Location',
                about: profile.about || '',
                balances: {
                    hive: acc.balance,
                    hbd: acc.hbd_balance,
                    savings_hive: acc.savings_balance,
                    savings_hbd: acc.savings_hbd_balance,
                },
                hp: {
                    total: hp.toFixed(3),
                    staked: staked_hp.toFixed(3),
                },
                voting_power: current_vp.toFixed(2),
                resource_credits: "---" // fetching RC requires a separate call usually, we'll placeholder or skip for now
            };
        });

        return NextResponse.json(teamData);
    } catch (error) {
        console.error('Error fetching team data:', error);
        return NextResponse.json({ error: 'Failed to fetch team data' }, { status: 500 });
    }
}
