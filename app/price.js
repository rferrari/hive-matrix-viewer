// Fetches HIVE/USD price from CoinGecko and caches it.
// Uses Node's built-in fetch (node 18+).

let hivePrice = null;
let hbdPrice = null;
let lastFetch = 0;
const FETCH_INTERVAL = 5 * 60 * 1000; // 5 minutes

async function fetchPrice() {
    try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hive,hive_dollar&vs_currencies=usd');
        const data = await res.json();
        hivePrice = data?.hive?.usd ?? null;
        hbdPrice = data?.hive_dollar?.usd ?? null;
        lastFetch = Date.now();
    } catch (_) { /* keep old price */ }
}

function getHivePrice() {
    if (Date.now() - lastFetch > FETCH_INTERVAL) fetchPrice();
    return hivePrice;
}

// Returns " (~$12.34)" string or '' if price unknown
function formatUSD(amountStr) {
    if (!hivePrice) return '';
    const [num, token] = (amountStr || '').split(' ');
    const val = parseFloat(num);
    if (isNaN(val)) return '';
    const price = token === 'HBD' ? (hbdPrice || 1) : hivePrice;
    return ` \x1b[90m(~$${(val * price).toFixed(2)})\x1b[0m`;
}

// Initial fetch on load
fetchPrice();
// Refresh every 5 minutes
setInterval(fetchPrice, FETCH_INTERVAL);

module.exports = { getHivePrice, formatUSD };
