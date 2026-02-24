class Stats {
    constructor() {
        this.counts = { post: 0, comment: 0, transfer: 0, custom_json: 0, vote: 0, other: 0 };
        this.totalOps = 0;
        this.lastBlockNum = 0;
        this.blockCount = 0;
        this.startTime = Date.now();
        this.accountActivity = new Map(); // account -> count
    }

    record(type, data) {
        this.totalOps++;
        if (type === 'comment') {
            if (data.parent_author === '') this.counts.post++;
            else this.counts.comment++;
        } else if (this.counts[type] !== undefined) {
            this.counts[type]++;
        } else {
            this.counts.other++;
        }

        const actors = this._getActors(type, data);
        for (const actor of actors) {
            if (actor) this.accountActivity.set(actor, (this.accountActivity.get(actor) || 0) + 1);
        }
    }

    _getActors(type, data) {
        if (type === 'comment') return [data.author];
        if (type === 'transfer') return [data.from, data.to];
        if (type === 'custom_json') return [...(data.required_posting_auths || []), ...(data.required_auths || [])];
        if (type === 'vote') return [data.voter];
        return [];
    }

    setBlock(blockNum) {
        this.lastBlockNum = blockNum;
        this.blockCount++;
    }

    getUptimeStr() {
        const ms = Date.now() - this.startTime;
        const s = Math.floor(ms / 1000);
        const m = Math.floor(s / 60);
        const h = Math.floor(m / 60);
        if (h > 0) return `${h}h ${m % 60}m`;
        if (m > 0) return `${m}m ${s % 60}s`;
        return `${s}s`;
    }

    getTopAccounts(n = 10) {
        return [...this.accountActivity.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, n);
    }

    getSummary() {
        return { ...this.counts, total: this.totalOps, block: this.lastBlockNum, uptime: this.getUptimeStr() };
    }
}

module.exports = Stats;
