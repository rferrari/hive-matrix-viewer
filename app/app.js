const dotenv = require('dotenv');
const ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${ENV}` });

const moment = require('moment');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const { ALL_USERS } = require('./hive-bot/constants.js');
const { decodeJsonId } = require('./knownApps.js');
const Stats = require('./stats.js');
const { formatUSD } = require('./price.js');
const { broadcast, startServer } = require('./server.js');

const CONFIG_PATH = path.join(__dirname, 'config.json');

async function onboardUser() {
  const setupRl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(res => setupRl.question(Ye + q + R + ' ', res));

  console.log(Wh + '\n--- HIVE MATRIX VIEWER SETUP ---' + R);
  const username = await ask('Enter your Hive username (skip with Enter):');
  const preferredFrontend = await ask('Preferred Hive Frontend (e.g., peakd.com, ecency.com, hive.blog) [peakd.com]:') || 'peakd.com';
  const handleVotes = (await ask('Show votes? (y/n):')).toLowerCase() === 'y';
  const handleJSON = (await ask('Show Custom JSON? (y/n):')).toLowerCase() !== 'n';

  const defaultConfig = {
    hiveUsername: username || "hive-matrix",
    preferredFrontend: preferredFrontend,
    handleHivePosts: true,
    handleHiveComments: true,
    handleCustomJson: handleJSON,
    handleTransfers: true,
    handleVotes: handleVotes,
    allowedCustomJsonIds: ["*"],
    statsEveryBlocks: 20,
    leaderEveryBlocks: 100,
    whaleThreshold: 50000,
    saveMatches: false,
    browserUI: true,
    browserPort: 3005,
    hiverpc: ["https://api.hive.blog", "https://api.deathwing.me", "https://hive-api.arcange.eu"]
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
  console.log(Gr + 'Config saved to app/config.json!\n' + R);
  setupRl.close();
  return defaultConfig;
}

let config;
if (fs.existsSync(CONFIG_PATH)) {
  config = require('./config.json');
} else {
  // We'll handle this in the start sequence to avoid blocking require
}

// ── ANSI ──────────────────────────────────────────────────────────────────────
const R = '\x1b[0m';
const Gr = '\x1b[32m';         // Green
const BGr = '\x1b[92m\x1b[1m'; // Bright Green Bold
const Bl = '\x1b[94m';         // Light Blue
const Re = '\x1b[31m\x1b[1m';   // Red Bold
const BRe = '\x1b[91m\x1b[1m';  // Bright Red Bold
const Ye = '\x1b[33m';         // Yellow
const Ma = '\x1b[35m';         // Magenta
const BMa = '\x1b[95m\x1b[1m'; // Bright Magenta Bold
const Cy = '\x1b[36m';         // Cyan
const Gy = '\x1b[90m';         // Gray
const Wh = '\x1b[97m\x1b[1m';   // White Bold
const Und = '\x1b[4m';
const BGrNoBold = '\x1b[92m';  // Bright Green

// ── Helpers ──────────────────────────────────────────────────────────────────
// OSC 8 Hyperlink: \x1b]8;;url\x1b\\text\x1b]8;;\x1b\\
function link(url, text) {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}
function hiveLink(author, permlink = '') {
  const domain = config.preferredFrontend || 'peakd.com';
  const url = `https://${domain}/@${author}${permlink ? '/' + permlink : ''}`;
  // Only wrap the author in the link, keeping permlink as plain text
  return link(url, `@${author}`) + (permlink ? '/' + permlink : '');
}

// ── CLI args ──────────────────────────────────────────────────────────────────
// node app.js --filter skatehive,transfer
// node app.js --watch skatehive
const args = process.argv.slice(2);
let cliFilterArg = '';
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--filter' || args[i] === '--watch') && args[i + 1]) {
    cliFilterArg = args[i + 1].toLowerCase();
    i++;
  }
}

// ── Filters ───────────────────────────────────────────────────────────────────
// Multiple comma-separated OR keywords
let activeFilters = cliFilterArg ? cliFilterArg.split(',').map(s => s.trim()) : [];
let saveMatchesToFile = false; // Initialized in start()
let rl; // Global reference for SIGINT and line input

function applyFilters(searchText) {
  if (activeFilters.length === 0) return true;
  return activeFilters.some(f => searchText.includes(f));
}

function showFilterStatus() {
  const statusLine = [
    config.handleHivePosts ? `${Bl}[POSTS]${R}` : `${Gy}[posts]${R}`,
    config.handleHiveComments ? `${Bl}[CMNTS]${R}` : `${Gy}[cmnts]${R}`,
    config.handleCustomJson ? `${Gr}[JSON]${R}` : `${Gy}[json]${R}`,
    config.handleTransfers ? `${Ma}[XFERS]${R}` : `${Gy}[xfers]${R}`,
    config.handleVotes ? `${Cy}[VOTES]${R}` : `${Gy}[votes]${R}`
  ].join(' ');

  if (activeFilters.length === 0) {
    process.stdout.write(`\r${statusLine} ${Gy}[ filter: NONE ]${R}                     \n`);
  } else {
    process.stdout.write(`\r${statusLine} ${Ye}[ filter: "${activeFilters.join('", "')}" ]${R}                     \n`);
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const stats = new Stats();
let STATS_EVERY_BLOCKS = 20;   // Initialized in start()
let LEADER_EVERY_BLOCKS = 100;  // Initialized in start()

// ── Auto-save log ─────────────────────────────────────────────────────────────
const logsDir = path.join(__dirname, 'logs', 'filter');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
function saveMatch(line) {
  if (!saveMatchesToFile || activeFilters.length === 0) return;
  const date = new Date().toISOString().slice(0, 10);
  const fname = path.join(logsDir, `${activeFilters.join('-')}-${date}.log`);
  const clean = line.replace(/\x1b\[\d+m/g, '');
  fs.appendFileSync(fname, clean + '\n');
}

// ── Community tags ────────────────────────────────────────────────────────────
const COMMUNITY_COLORS = {
  'hive-179017': `${BGr}[SKATEHIVE]${R}`,
  'hive-140217': `${Bl}[LEOFINANCE]${R}`,
  'hive-193552': `${Cy}[ACTIFIT]${R}`,
  'hive-127515': `${Ma}[HIVEBR]${R}`,
  'hive-194913': `${Wh}[DBUZZ]${R}`,
  'hive-166847': `${Re}[SPLINTERLANDS]${R}`,
  'hive-173425': `${BGr}[DEEPDIVES]${R}`,
};
function communityTag(json_metadata) {
  try {
    const m = typeof json_metadata === 'string' ? JSON.parse(json_metadata) : json_metadata;
    if (!m) return '';
    const comm = m.community || (m.tags && m.tags.find(t => t.startsWith('hive-')));
    if (comm && COMMUNITY_COLORS[comm]) return ' ' + COMMUNITY_COLORS[comm];
    if (m.tags?.length) return ` ${Gy}[${m.tags.slice(0, 2).join(' ')}]${R}`;
  } catch (_) { }
  return '';
}

// ── Transfer value tier ───────────────────────────────────────────────────────
let WHALE_THRESHOLD = 50000; // Initialized in start()
function transferColor(amountStr) {
  const val = parseFloat(amountStr);
  if (isNaN(val)) return Gy;
  if (val >= WHALE_THRESHOLD) return BRe;
  if (val >= 10000) return BMa;
  if (val >= 1000) return Ma;
  if (val >= 100) return Ye;
  return Gy;
}
function isWhale(amountStr) {
  return parseFloat(amountStr) >= WHALE_THRESHOLD;
}
function whalePrefix(amountStr) {
  if (!isWhale(amountStr)) return '';
  return `${BRe}🐋 WHALE ALERT 🐋${R} `;
}

// ── Search text builder ───────────────────────────────────────────────────────
function buildSearchText(type, data) {
  const parts = [];
  if (type === 'comment') {
    parts.push(data.author, data.title, data.body, data.permlink, data.parent_author, data.parent_permlink);
    try {
      const m = typeof data.json_metadata === 'string' ? JSON.parse(data.json_metadata) : data.json_metadata;
      if (m) { parts.push(JSON.stringify(m)); }
    } catch (_) { }
  } else if (type === 'transfer') {
    parts.push(data.from, data.to, data.amount, data.memo);
  } else if (type === 'custom_json') {
    parts.push(data.id, ...(data.required_posting_auths || []), ...(data.required_auths || []));
    parts.push(typeof data.json === 'string' ? data.json : JSON.stringify(data.json || ''));
  } else if (type === 'vote') {
    parts.push(data.voter, data.author, data.permlink);
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

// ── Display builder ───────────────────────────────────────────────────────────
function buildDisplay(type, data) {
  const ts = `${Gy}[${moment().format('HH:mm:ss')}]${R} `;

  if (type === 'comment') {
    if (data.parent_author === '') {
      if (!config.handleHivePosts) return null;
      const comm = communityTag(data.json_metadata);
      const snippet = data.body ? ` ${Gr}"${data.body.replace(/\s+/g, ' ').slice(0, 60)}${data.body.length > 60 ? '…' : ''}"${R}` : '';
      const authorLink = hiveLink(data.author, data.permlink);
      return ts + `${Bl}[POST]${R} ${authorLink} » ${snippet}${comm}`;
    } else {
      if (!config.handleHiveComments) return null;
      const snippet = data.body ? ` ${Gr}"${data.body.replace(/\s+/g, ' ').slice(0, 70)}${data.body.length > 70 ? '…' : ''}"${R}` : '';
      const authorLink = hiveLink(data.author, data.permlink);
      const parentLink = hiveLink(data.parent_author, data.parent_permlink);
      return ts + `${Bl}[COMMENT]${R} ${authorLink} → ${parentLink}${snippet}`;
    }
  }

  if (type === 'transfer') {
    if (!config.handleTransfers) return null;
    const col = transferColor(data.amount);
    const usd = formatUSD(data.amount);
    const memo = data.memo ? ` ${Gy}${data.memo.slice(0, 80)}${R}` : '';
    const fromLink = hiveLink(data.from);
    const toLink = hiveLink(data.to);
    return ts + `${whalePrefix(data.amount)}${col}[TRANSFER]${R} ${fromLink} → ${toLink}: ${col}${data.amount}${R}${usd}${memo}`;
  }

  if (type === 'custom_json') {
    if (!config.handleCustomJson) return null;
    const by = data.required_posting_auths?.[0] || data.required_auths?.[0] || '?';
    const label = decodeJsonId(data.id);
    const app = label ? ` ${Gy}(${label})${R}` : '';
    const byLink = hiveLink(by);
    return ts + `${Gr}[JSON]${R} ${Cy}${data.id}${R}${app} by ${byLink}`;
  }

  if (type === 'vote') {
    if (!config.handleVotes) return null;
    const pct = data.weight / 100;
    const isFull = pct === 100;
    const col = isFull ? BGr : pct >= 50 ? Gr : Gy;
    const voterLink = hiveLink(data.voter);
    const authorLink = hiveLink(data.author, data.permlink);
    return ts + `${Cy}[VOTE]${R} ${voterLink} ${col}${pct}%${R} → ${authorLink}`;
  }

  return null;
}

// ── Stats printer ─────────────────────────────────────────────────────────────
function printStats(blockNum) {
  const s = stats.getSummary();
  const line = [
    `${Gr}─── Block ${BGr}#${s.block.toLocaleString()}${R}`,
    `${Bl}posts${R}:${s.post}`,
    `${Bl}cmnt${R}:${s.comment}`,
    `${Ma}xfer${R}:${s.transfer}`,
    `${Gr}json${R}:${s.custom_json}`,
    `${Cy}vote${R}:${s.vote}`,
    `${Gr}uptime${R}:${Cy}${s.uptime}${R}`
  ].join('  ');
  console.log('\n' + line + '\n');
}

let lastLeaderBroadcast = 0;
function broadcastLeaderboard(force = false) {
  const now = Date.now();
  if (!force && now - lastLeaderBroadcast < 2000) return; // 2s throttle
  lastLeaderBroadcast = now;
  const top = stats.getTopAccounts(10);
  broadcast({ kind: 'leaderboard', data: top });
}

function printLeaderboard() {
  const top = stats.getTopAccounts(10);
  if (top.length === 0) return;
  const header = `${Gr}┌── Top Accounts ─────────────────────────────────────┐${R}`;
  const rows = top.map(([acc, n], i) => `${Gr}│${R} ${Cy}${(i + 1) % 10}.${R} ${Cy}@${acc}${R} ${Gr}(${n} ops)${R}`);
  const footer = `${Gr}└─────────────────────────────────────────────────────┘${R}`;
  console.log('\n' + [header, ...rows, footer].join('\n') + '\n');

  broadcastLeaderboard(true);
}

// ── Banner ────────────────────────────────────────────────────────────────────
function printBanner() {
  console.log(BGrNoBold);
  console.log('  ██╗  ██╗██╗██╗   ██╗███████╗');
  console.log('  ██║  ██║██║██║   ██║██╔════╝');
  console.log('  ███████║██║██║   ██║█████╗  ');
  console.log('  ██╔══██║██║╚██╗ ██╔╝██╔══╝  ');
  console.log('  ██║  ██║██║ ╚████╔╝ ███████╗');
  console.log('  ╚═╝  ╚═╝╚═╝  ╚═══╝  ╚══════╝');
  console.log('                 HIVE MATRIX VIEWER');
  console.log(R);
  console.log(Gr + 'Connecting to the Hive Matrix...' + R);
  console.log(Gr + '  Type keywords to filter (comma = OR, empty = clear)' + R);
  console.log(Gy + '  Toggles: ' + Bl + '+json, -json, +posts, -posts, +xfers, -xfers... ' + R);
  if (cliFilterArg) {
    console.log(Ye + `  --filter pre-set: "${cliFilterArg}"` + R);
  }
  showFilterStatus();
  console.log();
}

// ── Start Sequence ────────────────────────────────────────────────────────────
async function start() {
  if (!config) config = await onboardUser();
  const { HiveBot } = require('./hive-bot/loader.js');

  // Initialize config-dependent variables
  saveMatchesToFile = config.saveMatches || false;
  STATS_EVERY_BLOCKS = config.statsEveryBlocks || 20;
  LEADER_EVERY_BLOCKS = config.leaderEveryBlocks || 100;
  WHALE_THRESHOLD = config.whaleThreshold || 50000;

  // Set up live terminal input after config is ready
  process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
      process.kill(process.pid, 'SIGINT');
      return;
    }
  });

  rl = readline.createInterface({ input: process.stdin, terminal: true });
  rl.on('line', (line) => {
    const raw = line.trim().toLowerCase();

    // Command-based toggles
    if (raw === '+posts') { config.handleHivePosts = true; return showFilterStatus(); }
    if (raw === '-posts') { config.handleHivePosts = false; return showFilterStatus(); }
    if (raw === '+comments') { config.handleHiveComments = true; return showFilterStatus(); }
    if (raw === '-comments') { config.handleHiveComments = false; return showFilterStatus(); }
    if (raw === '+json') { config.handleCustomJson = true; return showFilterStatus(); }
    if (raw === '-json') { config.handleCustomJson = false; return showFilterStatus(); }
    if (raw === '+xfers') { config.handleTransfers = true; return showFilterStatus(); }
    if (raw === '-xfers') { config.handleTransfers = false; return showFilterStatus(); }
    if (raw === '+votes') { config.handleVotes = true; return showFilterStatus(); }
    if (raw === '-votes') { config.handleVotes = false; return showFilterStatus(); }

    if (raw === '') {
      activeFilters = [];
    } else {
      activeFilters = raw.split(',').map(s => s.trim()).filter(Boolean);
    }
    showFilterStatus();
  });

  printBanner();

  if (config.browserUI !== false) {
    startServer(config, config.browserPort || 3005);
  }

  const bot = new HiveBot({ hiveUsername: config.hiveUsername, hiverpc: config.hiverpc });

  bot.onOperation(ALL_USERS, (event) => {
    // Block boundary event
    if (event.kind === 'block') {
      const { blockNum, timestamp } = event;
      stats.setBlock(blockNum);

      // Block separator (every block, printed quietly as a visual divider)
      if (config.showBlockSeparator !== false) {
        const ts = timestamp ? moment(timestamp).format('HH:mm:ss') : '';
        const sep = `${Gr}── #${blockNum.toLocaleString()} · ${ts} ─────────────────────────────────${R}`;
        console.log(sep);
      }

      // Stats bar every N blocks
      if (stats.blockCount % STATS_EVERY_BLOCKS === 0 && stats.blockCount > 0) {
        printStats(blockNum);
      }
      // Leaderboard every N blocks
      if (stats.blockCount % LEADER_EVERY_BLOCKS === 0 && stats.blockCount > 0) {
        printLeaderboard();
      }

      // Broadcast block event to browser
      broadcast({ kind: 'block', blockNum, timestamp });
      return;
    }

    // Operation event
    const { type, data } = event;
    stats.record(type, data);

    // Broadcast to browser SSE clients immediately for independence from terminal filters
    broadcast({ kind: 'op', type, data });
    broadcastLeaderboard();

    const display = buildDisplay(type, data);
    if (display === null) return;

    // Apply live keyword filter for terminal only
    if (!applyFilters(buildSearchText(type, data))) return;

    console.log(display);
    saveMatch(display);
  });

  process.on('SIGINT', () => {
    console.log(Re + '\nDisconnecting from the Hive Matrix...' + R);
    rl.close();
    bot.stop();
    process.exit();
  });

  await bot.start();
}

start().catch(err => {
  console.error(Re + 'Failed to connect to the Matrix:' + R, err);
});

