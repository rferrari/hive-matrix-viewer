// Maps known custom_json operation IDs to human-readable app names
const KNOWN_JSON_IDS = {
    // Hive Engine
    'ssc-mainnet-hive': 'Hive Engine',
    'ssc-mainnet1': 'Hive Engine',
    // Splinterlands
    'sm_market_purchase': 'Splinterlands',
    'sm_sell_cards': 'Splinterlands',
    'sm_buy_cards': 'Splinterlands',
    'sm_combine_cards': 'Splinterlands',
    'sm_claim_rewards': 'Splinterlands',
    'sm_stake_tokens_multi': 'Splinterlands',
    'sm_token_award': 'Splinterlands',
    'sm_sps': 'Splinterlands SPS',
    'sm_purchase': 'Splinterlands',
    'sm_claim_campaign': 'Splinterlands',
    'sm_update_price': 'Splinterlands',
    'sm_transfer_cards': 'Splinterlands',
    'sm_burn_cards': 'Splinterlands',
    // Social / curation
    'follow': 'Follow / Reblog',
    'reblog': 'Reblog',
    // Podping
    'pp_podcast_update': 'Podping',
    // Gaming
    'terracore_claim': 'Terracore',
    'terracore_battle': 'Terracore',
    'terracore_transfer': 'Terracore',
    'dcrops': 'dCrops',
    'NFT': 'NFT',
    // dApps
    'beacon_custom_json': 'Peak Beacon',
    'leodex': 'LeoDEX',
    'actifit': 'Actifit',
    'dbuzz': 'DBuzz',
    'ecency_point': 'Ecency',
    'peaklock': 'PeakLock',
    'rc_direct_delegation': 'RC Delegation',
};

function decodeJsonId(id) {
    if (!id) return null;
    for (const [key, label] of Object.entries(KNOWN_JSON_IDS)) {
        if (id === key || id.startsWith(key + ':')) return label;
    }
    return null;
}

module.exports = { decodeJsonId };
