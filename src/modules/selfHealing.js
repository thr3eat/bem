const fs = require('fs');
const path = require('path');

class SelfHealingEngine {
    constructor() {
        this.client = null;
        this.isReconnecting = false;
        this.lastPingSuccess = Date.now();
        this.eventLoopLag = 0;
        this.consecutiveErrors = 0;
        this.backupDir = path.join(__dirname, '../../data/backups');
    }

    init(client, loginFn) {
        this.client = client;
        this.loginFn = loginFn;

        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        this._startWatchdog();
        this._startEventLoopMonitor();
        this._setupGlobalErrorHandlers();
        console.log('[🛡️ SELF-HEALING] Gelişmiş otonom iyileştirme motoru aktif!');
    }

    _startWatchdog() {
        setInterval(async () => {
            if (!this.client || this.isReconnecting) return;

            try {
                // 1. WebSocket Ping & Status Kontrolü
                const isReady = this.client.isReady();
                const ping = this.client.ws?.ping ?? -1;

                if (isReady && ping >= 0) {
                    this.lastPingSuccess = Date.now();
                    this.consecutiveErrors = 0;
                } else if (Date.now() - this.lastPingSuccess > 45000) {
                    console.warn(`[🛡️ SELF-HEALING] Discord bağlantısı ${Math.floor((Date.now() - this.lastPingSuccess) / 1000)}s boyunca yanıt vermedi. Yeniden bağlanılıyor...`);
                    await this.recoverConnection();
                }
            } catch (err) {
                console.error('[🛡️ SELF-HEALING] Watchdog kontrol hatası:', err.message);
            }
        }, 15000);
    }

    _startEventLoopMonitor() {
        let lastTime = Date.now();
        setInterval(() => {
            const now = Date.now();
            this.eventLoopLag = now - lastTime - 2000;
            lastTime = now;

            if (this.eventLoopLag > 3000) {
                console.warn(`[⚠️ OTONOM İYİLEŞTİRME] Event Loop gecikmesi yüksek: ${this.eventLoopLag}ms. Bellek ve işlemler optimize ediliyor...`);
                if (global.gc) {
                    try { global.gc(); } catch {}
                }
            }
        }, 2000);
    }

    async recoverConnection() {
        if (this.isReconnecting) return;
        this.isReconnecting = true;

        try {
            console.log('[🔄 OTONOM İYİLEŞTİRME] Temiz istemci sıfırlaması başlatılıyor...');
            if (this.client) {
                await this.client.destroy().catch(() => {});
            }
        } catch (e) {
            console.error('[🛡️ SELF-HEALING] İstemci kapatma hatası:', e.message);
        }

        setTimeout(() => {
            if (typeof this.loginFn === 'function') {
                this.loginFn();
            }
            this.lastPingSuccess = Date.now();
            this.isReconnecting = false;
        }, 5000);
    }

    _setupGlobalErrorHandlers() {
        process.on('unhandledRejection', (reason) => {
            this.consecutiveErrors++;
            console.error(`[🛡️ SELF-HEALING] Yakalanan Asenkron Hata (#${this.consecutiveErrors}):`, reason?.message || reason);
            
            if (this.consecutiveErrors > 15) {
                console.warn('[🛡️ SELF-HEALING] Üst üste çok fazla hata alındı, istemci otomatik yenileniyor...');
                this.consecutiveErrors = 0;
                this.recoverConnection();
            }
        });

        process.on('uncaughtException', (err) => {
            console.error('[🛡️ SELF-HEALING] Yakalanan İstisna:', err.message);
            if (err.code === 'ENOMEM' || err.message?.includes('FATAL')) {
                console.error('[🚨 KRİTİK] Bellek/sistem çökmesi engelleniyor, süreç otomatik yeniden başlatılacak.');
                process.exit(1);
            }
        });
    }

    // Veritabanı Otomatik Yedekleme ve Bozuk Dosya Onarma
    safeReadJson(filePath) {
        const fileName = path.basename(filePath);
        const backupPath = path.join(this.backupDir, `${fileName}.bak`);

        if (!fs.existsSync(filePath)) {
            if (fs.existsSync(backupPath)) {
                console.warn(`[🛡️ SELF-HEALING] ${fileName} bulunamadı, yedekten yükleniyor...`);
                try {
                    const data = fs.readFileSync(backupPath, 'utf8');
                    fs.writeFileSync(filePath, data);
                    return JSON.parse(data);
                } catch {}
            }
            return {};
        }

        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(content);
            // Başarılı okumada yedeği güncelle
            fs.writeFileSync(backupPath, content);
            return parsed;
        } catch (err) {
            console.error(`[🚨 OTONOM İYİLEŞTİRME] ${fileName} bozulmuş! Otomatik yedekten kurtarılıyor...`);
            if (fs.existsSync(backupPath)) {
                try {
                    const backupData = fs.readFileSync(backupPath, 'utf8');
                    fs.writeFileSync(filePath, backupData);
                    console.log(`[✅ SELF-HEALING] ${fileName} başarıyla otomatik kurtarıldı!`);
                    return JSON.parse(backupData);
                } catch (bErr) {
                    console.error(`[❌ SELF-HEALING] Yedek de korumalı değil:`, bErr.message);
                }
            }
            // Yedek de yoksa boş şablon oluştur
            fs.writeFileSync(filePath, '{}');
            return {};
        }
    }
}

module.exports = new SelfHealingEngine();
