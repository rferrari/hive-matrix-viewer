// ── Logo Injection ────────────────────────────────────────────────────────
const logoAscii = `
██╗  ██╗██╗██╗   ██╗███████╗
██║  ██║██║██║   ██║██╔════╝
███████║██║██║   ██║█████╗  
██╔══██║██║╚██╗ ██╔╝██╔══╝  
██║  ██║██║ ╚████╔╝ ███████╗
╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝
          HIVE MATRIX VIEWER`;
document.getElementById('logo').textContent = logoAscii;

// ── Matrix Rain Canvas ────────────────────────────────────────────────────────
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

// ── Stats ─────────────────────────────────────────────────────────────────────
const counts = { post: 0, comment: 0, transfer: 0, custom_json: 0, vote: 0 };
function updateStats() {
    document.getElementById('s-post').textContent = counts.post;
    document.getElementById('s-comment').textContent = counts.comment;
    document.getElementById('s-transfer').textContent = counts.transfer;
    document.getElementById('s-json').textContent = counts.custom_json;
    document.getElementById('s-vote').textContent = counts.vote;
}

// ── Price ─────────────────────────────────────────────────────────────────────
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

// ── Configuration & State ───────────────────────────────────────────────────
let appConfig = { preferredFrontend: 'peakd.com' };
let activeFilters = [];
const activeTypes = new Set(['post', 'comment', 'json', 'transfer', 'vote']);

function matchesFilter(text, type) {
    // 1. Check operation type toggle
    if (type && !activeTypes.has(type)) return false;

    // 2. Check keyword filters
    if (!activeFilters.length) return true;
    const t = text.toLowerCase();
    return activeFilters.some(f => t.includes(f));
}

document.getElementById('filter-input').addEventListener('input', (e) => {
    const raw = e.target.value.trim().toLowerCase();
    activeFilters = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    document.getElementById('filter-label').textContent =
        activeFilters.length ? `🔍 "${activeFilters.join('", "')}"` : '🔍';

    refreshFeedVisibility();
});

// ── Toggles ──────────────────────────────────────────────────────────────────
function updateToggleButtons() {
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        const type = btn.getAttribute('data-type');
        if (activeTypes.has(type)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        if (activeTypes.has(type)) {
            activeTypes.delete(type);
        } else {
            activeTypes.add(type);
        }
        updateToggleButtons();
        refreshFeedVisibility();
    });
});

function refreshFeedVisibility() {
    const items = feed.querySelectorAll('.op');
    items.forEach(item => {
        const searchText = item.getAttribute('data-search') || '';
        const type = item.getAttribute('data-type');
        item.style.display = matchesFilter(searchText, type) ? 'block' : 'none';
    });
}

// ── Feed ──────────────────────────────────────────────────────────────────────
const feed = document.getElementById('feed');
const MAX_ITEMS = 400;

function addItem(html, searchText, type = '') {
    const div = document.createElement('div');
    div.className = 'op';
    div.innerHTML = html;
    div.setAttribute('data-search', searchText.toLowerCase());
    if (type) div.setAttribute('data-type', type);

    // Sticky Scroll Logic
    const isAtBottom = feed.scrollHeight - feed.clientHeight <= feed.scrollTop + 50;

    // Filter check for initial append
    if (!matchesFilter(searchText, type)) {
        div.style.display = 'none';
    }

    feed.appendChild(div);
    while (feed.children.length > MAX_ITEMS) feed.removeChild(feed.firstChild);

    if (isAtBottom && div.style.display !== 'none') {
        feed.scrollTop = feed.scrollHeight;
    }
}

function ts() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function amountClass(a) {
    const v = parseFloat(a);
    if (isNaN(v)) return '';
    if (v >= 50000) return 'amount-whale';
    if (v >= 10000) return 'amount-large';
    if (v >= 1000) return 'amount-mid';
    return 'amount-small';
}
function esc(s) { return String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function hiveLink(a, p) {
    const domain = appConfig.preferredFrontend || 'peakd.com';
    const url = `https://${domain}/@${esc(a)}${p ? '/' + esc(p) : ''}`;
    // Link only covers the @username part
    return `<a href="${url}" target="_blank" class="author">@${esc(a)}</a>${p ? '/' + esc(p) : ''}`;
}

function renderOp(type, data) {
    if (type === 'comment') {
        const isPost = data.parent_author === '';
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
        const isWhaleOp = parseFloat(data.amount) >= 50000;
        const whale = isWhaleOp ? `<span class="tag-whale">🐋 WHALE 🐋 </span>` : '';
        const memo = data.memo ? `<br><span class="memo">${esc(data.memo.slice(0, 100))}</span>` : '';
        const keyword = isWhaleOp ? 'whale alert' : '';
        const search = `transfer ${keyword} ${data.from || ''} ${data.to || ''} ${data.amount || ''} ${data.memo || ''}`;
        addItem(`<span class="ts">${ts()}</span> ${whale}<span class="tag-transfer">[TRANSFER]</span> ${hiveLink(data.from)} → ${hiveLink(data.to)}: <span class="${amountClass(data.amount)}">${esc(data.amount)}</span>${memo}`, search, 'transfer');

    } else if (type === 'custom_json') {
        const by = data.required_posting_auths?.[0] || data.required_auths?.[0] || '?';
        const search = `json custom_json ${data.id || ''} ${by} ${typeof data.json === 'string' ? data.json : JSON.stringify(data.json || '')}`;
        addItem(`<span class="ts">${ts()}</span> <span class="tag-json">[JSON]</span> <span style="color:#0f0">${esc(data.id)}</span> by ${hiveLink(by)}`, search, 'json');

    } else if (type === 'vote') {
        const pct = data.weight / 100;
        const isFull = pct === 100;
        const col = isFull ? '#ff0' : pct >= 50 ? '#0f0' : '#444';
        const search = `vote ${data.voter || ''} ${data.author || ''} ${data.permlink || ''}`;
        addItem(`<span class="ts">${ts()}</span> <span class="tag-vote">[VOTE]</span> ${hiveLink(data.voter)} <span style="color:${col}">${pct}%</span> → ${hiveLink(data.author, data.permlink)}`, search, 'vote');
    }
}

// ── SSE ───────────────────────────────────────────────────────────────────────
const blockDisplay = document.getElementById('block-display');
const connStatus = document.getElementById('connection-status');
let reconnectDelay = 1000;

function connect() {
    const ev = new EventSource('/stream');
    ev.onopen = () => {
        connStatus.innerHTML = '<span class="status-ok">● connected</span>';
        reconnectDelay = 1000;
    };
    ev.onmessage = (e) => {
        try {
            const msg = JSON.parse(e.data);

            if (msg.kind === 'config') {
                appConfig = msg.config;

                // Sync toggles with config booleans
                if (msg.config.handleHivePosts === false) activeTypes.delete('post');
                if (msg.config.handleHiveComments === false) activeTypes.delete('comment');
                if (msg.config.handleTransfers === false) activeTypes.delete('transfer');
                if (msg.config.handleCustomJson === false) activeTypes.delete('json');
                if (msg.config.handleVotes === false) activeTypes.delete('vote');

                updateToggleButtons();
                refreshFeedVisibility();
                return;
            }

            if (msg.kind === 'leaderboard') {
                const list = document.getElementById('leader-list');
                list.innerHTML = msg.data.map(([acc, n], i) => `
            <div class="leader-row">
                <span class="leader-rank">${(i + 1) % 10}.</span>
                <span class="leader-name">@${acc}</span>
                <span class="leader-count">(${n})</span>
            </div>
        `).join('');
                return;
            }

            if (msg.kind === 'block') {
                document.getElementById('s-block').textContent = `#${(msg.blockNum || 0).toLocaleString()}`;
                blockDisplay.textContent = `Block #${(msg.blockNum || 0).toLocaleString()} · ${msg.timestamp || ''}`;
                const div = document.createElement('div');
                div.className = 'block-sep';
                div.textContent = `── #${(msg.blockNum || 0).toLocaleString()} · ${msg.timestamp || ''} ──`;

                // Sticky Scroll Logic for blocks
                const isAtBottom = feed.scrollHeight - feed.clientHeight <= feed.scrollTop + 50;

                feed.appendChild(div);
                while (feed.children.length > MAX_ITEMS) feed.removeChild(feed.firstChild);

                if (isAtBottom) {
                    feed.scrollTop = feed.scrollHeight;
                }
                return;
            }
            if (msg.kind === 'op') {
                const { type, data } = msg;
                if (type === 'comment') { counts[data.parent_author === '' ? 'post' : 'comment']++; updateStats(); }
                else if (counts[type] !== undefined) { counts[type]++; updateStats(); }
                renderOp(type, data);
            }
        } catch (_) { }
    };
    ev.onerror = () => {
        connStatus.innerHTML = `<span class="status-err">● disconnected — retry in ${reconnectDelay / 1000}s</span>`;
        ev.close();
        setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
    };
}
connect();
