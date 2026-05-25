const fs = require('fs');
const path = require('path');

class JsonDatabase {
    constructor(fileName, options = {}) {
        this.filePath = path.join(__dirname, '../../data', fileName);
        this.writeDebounceMs = options.writeDebounceMs ?? 500;
        this._writeTimer = null;
        this._dirty = false;
        this.data = this._load();
    }

    _load() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, JSON.stringify({}, null, 4));
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
        } catch (err) {
            console.error(`[❌ DB] ${this.filePath} yüklenemedi:`, err);
            return {};
        }
    }

    // Debounced async atomik yazma
    _scheduleWrite() {
        this._dirty = true;
        if (this._writeTimer) clearTimeout(this._writeTimer);
        this._writeTimer = setTimeout(() => this._flush(), this.writeDebounceMs);
    }

    async _flush() {
        if (!this._dirty) return;
        this._dirty = false;
        const tmp = this.filePath + '.tmp';
        try {
            await fs.promises.writeFile(tmp, JSON.stringify(this.data, null, 4));
            await fs.promises.rename(tmp, this.filePath);
        } catch (err) {
            console.error(`[❌ DB] ${this.filePath} yazılamadı:`, err);
            this._dirty = true; // Bir sonraki denemede tekrar dene
        }
    }

    // Acil durum için senkron flush (process exit vb.)
    flushSync() {
        if (!this._dirty) return;
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 4));
            this._dirty = false;
        } catch (err) {
            console.error(`[❌ DB] ${this.filePath} senkron yazılamadı:`, err);
        }
    }

    get(key) {
        return this.data[key];
    }

    set(key, value) {
        this.data[key] = value;
        this._scheduleWrite();
    }

    delete(key) {
        delete this.data[key];
        this._scheduleWrite();
    }

    all() {
        return this.data;
    }

    has(key) {
        return key in this.data;
    }

    size() {
        return Object.keys(this.data).length;
    }
}

// Process kapanırken bekleyen yazmaları uygula
process.on('exit', () => {
    // Tüm aktif DB örneklerini flush etmek için global registry
    for (const db of JsonDatabase._instances || []) {
        db.flushSync();
    }
});

JsonDatabase._instances = [];
const _origConstructor = JsonDatabase;

module.exports = JsonDatabase;
