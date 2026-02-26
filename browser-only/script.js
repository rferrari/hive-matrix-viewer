// ── Configuration ───────────────────────────────────────────────────────────
const RPC_NODES = [
    "https://api.hive.blog",
    "https://api.deathwing.me",
    "https://hive-api.arcange.eu",
    "https://api.openhive.network"
];
let currentNodeIndex = 0;
let client = new dhive.Client(RPC_NODES[currentNodeIndex]);

const MAX_ITEMS = 400;
const CACHE_KEY = 'matrix_viewer_cache';

// ── Logo Injection ──────────────────────────────────────────────────────────
const logoAscii = `
██╗  ██╗██╗██╗   ██╗███████╗
██║  ██║██║██║   ██║██╔════╝
███████║██║██║   ██║█████╗  
██╔══██║██║╚██╗ ██╔╝██╔══╝  
██║  ██║██║ ╚████╔╝ ███████╗
╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
      HIVE MATRIX VIEWER (JS)`;
document.getElementById('logo').textContent = logoAscii;

// ── Matrix Rain Canvas ──────────────────────────────────────────────────────
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';
let drops = [];

function initCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const cols = Math.floor(canvas.width / 16);
    drops = Array.from({ length: cols }, () => Math.random() * -canvas.height / 16);
}
initCanvas();
window.addEventListener('resize', initCanvas);

function drawMatrix() {
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f0';
    ctx.font = '14px Courier New';
    for (let i = 0; i < drops.length; i++) {
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, drops[i] * 16);
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
    }
}
setInterval(drawMatrix, 40);

// ── Known Apps (Ported from knownApps.js) ───────────────────────────────────
const KNOWN_JSON_IDS = {
    'ssc-mainnet-hive': 'Hive Engine',
    'ssc-mainnet1': 'Hive Engine',
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
    'follow': 'Follow / Reblog',
    'reblog': 'Reblog',
    'pp_podcast_update': 'Podping',
    'terracore_claim': 'Terracore',
    'terracore_battle': 'Terracore',
    'terracore_transfer': 'Terracore',
    'dcrops': 'dCrops',
    'NFT': 'NFT',
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

// ── State & Stats ───────────────────────────────────────────────────────────
const counts = { post: 0, comment: 0, transfer: 0, json: 0, vote: 0 };
const accountActivity = new Map(); // @user -> count
let activeFilters = [];
const activeTypes = new Set(['post', 'comment', 'json', 'transfer', 'vote']);
const feed = document.getElementById('feed');

function updateStats() {
    document.getElementById('s-post').textContent = counts.post;
    document.getElementById('s-comment').textContent = counts.comment;
    document.getElementById('s-transfer').textContent = counts.transfer;
    document.getElementById('s-json').textContent = counts.json;
    document.getElementById('s-vote').textContent = counts.vote;
}

function updateLeaderboard() {
    const top = [...accountActivity.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const list = document.getElementById('leader-list');
    list.innerHTML = top.map(([acc, n], i) => `
        <div class="leader-row">
            <span class="leader-rank">${(i + 1) % 10}.</span>
            <span class="leader-name">@${acc}</span>
            <span class="leader-count">(${n})</span>
        </div>
    `).join('');
}

// ── Price ───────────────────────────────────────────────────────────────────
async function fetchPrice() {
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=hive&vs_currencies=usd');
        const d = await r.json();
        const p = d?.hive?.usd;
        document.getElementById('hive-price').textContent = p ? `$${p.toFixed(4)}` : 'unavailable';
    } catch (_) { }
}
fetchPrice();
setInterval(fetchPrice, 5 * 60 * 1000);

// ── Utilities ───────────────────────────────────────────────────────────────
function esc(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function ts() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function hiveLink(a, p) {
    const url = `https://peakd.com/@${esc(a)}${p ? '/' + esc(p) : ''}`;
    return `<a href="${url}" target="_blank" class="author">@${esc(a)}</a>${p ? '/' + esc(p) : ''}`;
}

// ── Caching ─────────────────────────────────────────────────────────────────
function saveCache() {
    const items = [];
    // Only save the non-separator ops to keep cache clean
    feed.querySelectorAll('.op').forEach(el => {
        items.push({
            html: el.innerHTML,
            search: el.getAttribute('data-search'),
            type: el.getAttribute('data-type')
        });
    });
    // Save last 100 for fast load
    localStorage.setItem(CACHE_KEY, JSON.stringify(items.slice(-100)));
}

function loadCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return;
        const items = JSON.parse(raw);
        items.forEach(item => {
            addItem(item.html, item.search, item.type, false); // false = don't re-save during load
        });
    } catch (e) {
        console.error("Cache load failed", e);
    }
}

// ── Feed Management ─────────────────────────────────────────────────────────
function addItem(html, searchText, type = '', shouldSave = true) {
    const div = document.createElement('div');
    div.className = 'op';
    div.innerHTML = html;
    div.setAttribute('data-search', searchText.toLowerCase());
    if (type) div.setAttribute('data-type', type);

    const isAtBottom = feed.scrollHeight - feed.clientHeight <= feed.scrollTop + 50;

    if (!matchesFilter(searchText, type)) {
        div.style.display = 'none';
    }

    feed.appendChild(div);
    while (feed.children.length > MAX_ITEMS) feed.removeChild(feed.firstChild);

    if (isAtBottom && div.style.display !== 'none') {
        feed.scrollTop = feed.scrollHeight;
    }

    if (shouldSave) saveCache();
}

function addBlockSep(blockNum, timestamp) {
    const div = document.createElement('div');
    div.className = 'block-sep';
    div.textContent = `── #${blockNum.toLocaleString()} · ${timestamp || ''} ──`;

    const isAtBottom = feed.scrollHeight - feed.clientHeight <= feed.scrollTop + 50;
    feed.appendChild(div);
    while (feed.children.length > MAX_ITEMS) feed.removeChild(feed.firstChild);
    if (isAtBottom) feed.scrollTop = feed.scrollHeight;
}

// ── Filter Logic ────────────────────────────────────────────────────────────
function matchesFilter(text, type) {
    if (type && !activeTypes.has(type)) return false;
    if (!activeFilters.length) return true;
    const t = text.toLowerCase();
    return activeFilters.some(f => t.includes(f));
}

function refreshFeedVisibility() {
    feed.querySelectorAll('.op').forEach(item => {
        const searchText = item.getAttribute('data-search') || '';
        const type = item.getAttribute('data-type');
        item.style.display = matchesFilter(searchText, type) ? 'block' : 'none';
    });
}

document.getElementById('filter-input').addEventListener('input', (e) => {
    const raw = e.target.value.trim().toLowerCase();
    activeFilters = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    document.getElementById('filter-label').textContent = activeFilters.length ? `🔍 "${activeFilters.join('", "')}"` : '🔍';
    refreshFeedVisibility();
});

document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (activeTypes.has(type)) {
            activeTypes.delete(type);
            btn.classList.remove('active');
        } else {
            activeTypes.add(type);
            btn.classList.add('active');
        }
        refreshFeedVisibility();
    });
});

// ── Hive Stream Logic ───────────────────────────────────────────────────────
const connStatus = document.getElementById('connection-status');
let isConnected = false;

function updateConnectionStatus(status, isError = false) {
    connStatus.innerHTML = `<span class="${isError ? 'status-err' : 'status-ok'}">● ${status}</span>`;
}

function processOperation(op, timestamp) {
    const [type, data] = op;

    // Track stats
    if (type === 'comment') {
        const isPost = data.parent_author === '';
        counts[isPost ? 'post' : 'comment']++;
        updateStats();

        const author = data.author;
        accountActivity.set(author, (accountActivity.get(author) || 0) + 1);

        // Render
        let meta = {};
        try { meta = typeof data.json_metadata === 'string' ? JSON.parse(data.json_metadata) : (data.json_metadata || {}); } catch (_) { }
        const comm = meta.community || (meta.tags && meta.tags.find(t => t && t.startsWith('hive-')));
        const commHtml = comm ? `<span class="comm-tag">${esc(comm)}</span>` : '';
        const snippet = data.body
            ? `<br><span class="body-snippet">"${esc(data.body.replace(/\s+/g, ' ').slice(0, 80))}${data.body.length > 80 ? '…' : ''}"</span>`
            : '';
        const tag = isPost ? `<span class="tag tag-post">POST</span>` : `<span class="tag tag-comment">COMMENT</span>`;
        const authorLink = hiveLink(data.author, data.permlink);
        const arrow = isPost ? '»' : `→ ${hiveLink(data.parent_author, data.parent_permlink)}`;
        const kind = isPost ? 'post' : 'comment';
        const search = `${kind} ${data.author || ''} ${data.body || ''} ${data.permlink || ''} ${JSON.stringify(meta)}`;
        addItem(`<span class="ts">${ts()}</span> ${tag} ${authorLink} ${arrow} ${commHtml}${snippet}`, search, kind);

    } else if (type === 'transfer') {
        counts.transfer++;
        updateStats();
        [data.from, data.to].forEach(a => accountActivity.set(a, (accountActivity.get(a) || 0) + 1));

        const val = parseFloat(data.amount);
        const whaleThreshold = 50000;
        const isWhaleOp = val >= whaleThreshold;
        const whale = isWhaleOp ? `<span class="tag-whale">🐋 WHALE 🐋 </span>` : '';
        const memo = data.memo ? `<br><span class="memo">${esc(data.memo.slice(0, 100))}</span>` : '';

        let amountClass = 'amount-small';
        if (val >= 50000) amountClass = 'amount-whale';
        else if (val >= 10000) amountClass = 'amount-large';
        else if (val >= 1000) amountClass = 'amount-mid';

        const search = `transfer ${isWhaleOp ? 'whale alert' : ''} ${data.from || ''} ${data.to || ''} ${data.amount || ''} ${data.memo || ''}`;
        addItem(`<span class="ts">${ts()}</span> ${whale}<span class="tag-transfer">[TRANSFER]</span> ${hiveLink(data.from)} → ${hiveLink(data.to)}: <span class="${amountClass}">${esc(data.amount)}</span>${memo}`, search, 'transfer');

    } else if (type === 'custom_json') {
        counts.json++;
        updateStats();
        const auths = [...(data.required_posting_auths || []), ...(data.required_auths || [])];
        auths.forEach(a => accountActivity.set(a, (accountActivity.get(a) || 0) + 1));

        const by = auths[0] || '?';
        const app = decodeJsonId(data.id);
        const appHtml = app ? ` <span style="color:#666">(${esc(app)})</span>` : '';
        const search = `json custom_json ${data.id || ''} ${by} ${typeof data.json === 'string' ? data.json : JSON.stringify(data.json || '')}`;
        addItem(`<span class="ts">${ts()}</span> <span class="tag-json">[JSON]</span> <span style="color:#0f0">${esc(data.id)}</span>${appHtml} by ${hiveLink(by)}`, search, 'json');

    } else if (type === 'vote') {
        counts.vote++;
        updateStats();
        accountActivity.set(data.voter, (accountActivity.get(data.voter) || 0) + 1);

        const pct = data.weight / 100;
        const isFull = pct === 100;
        const col = isFull ? '#ff0' : pct >= 50 ? '#0f0' : '#444';
        const search = `vote ${data.voter || ''} ${data.author || ''} ${data.permlink || ''}`;
        addItem(`<span class="ts">${ts()}</span> <span class="tag-vote">[VOTE]</span> ${hiveLink(data.voter)} <span style="color:${col}">${pct}%</span> → ${hiveLink(data.author, data.permlink)}`, search, 'vote');
    }

    updateLeaderboard();
}

let lastBlockNum = 0;
function startStream() {
    updateConnectionStatus(`connecting to ${RPC_NODES[currentNodeIndex]}...`);

    const stream = client.blockchain.getOperationsStream({
        mode: dhive.BlockchainMode.Latest
    });

    stream.on('data', (op) => {
        if (!isConnected) {
            isConnected = true;
            updateConnectionStatus('connected (direct)');
        }

        const blockNum = op.block_num;
        if (blockNum > lastBlockNum) {
            lastBlockNum = blockNum;
            document.getElementById('s-block').textContent = `#${blockNum.toLocaleString()}`;
            document.getElementById('block-display').textContent = `Block #${blockNum.toLocaleString()}`;
            addBlockSep(blockNum, new Date().toLocaleTimeString());
        }

        processOperation(op.op, op.timestamp);
    });

    stream.on('error', (err) => {
        isConnected = false;
        updateConnectionStatus(`error: switching node...`, true);
        console.error("Stream error, rotating node", err);

        // Rotate node
        currentNodeIndex = (currentNodeIndex + 1) % RPC_NODES.length;
        client = new dhive.Client(RPC_NODES[currentNodeIndex]);

        // Retry after delay
        setTimeout(startStream, 3000);
    });
}

// ── Resizer (Ported) ────────────────────────────────────────────────────────
(function initResizable() {
    const panel = document.getElementById('panel');
    const resizer = document.getElementById('resizer');
    let isResizing = false;

    const savedWidth = localStorage.getItem('panel-width');
    if (savedWidth) {
        document.documentElement.style.setProperty('--panel-width', `${savedWidth}px`);
    }

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.classList.add('resizing');
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResizing);
        e.preventDefault();
    });

    function handleMouseMove(e) {
        if (!isResizing) return;
        const newWidth = window.innerWidth - e.clientX;
        const constrainedWidth = Math.max(300, Math.min(newWidth, window.innerWidth * 0.8));
        document.documentElement.style.setProperty('--panel-width', `${constrainedWidth}px`);
        localStorage.setItem('panel-width', constrainedWidth);
    }

    function stopResizing() {
        isResizing = false;
        document.body.classList.remove('resizing');
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResizing);
    }
})();

// ── Start ──────────────────────────────────────────────────────────────────
loadCache();
startStream();
