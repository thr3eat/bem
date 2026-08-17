const express = require('express');
const app = express();

app.use(express.json());

const status = {
    isGameOpen: true,
    isMarketOpen: true,
    isAdaletSarayOpen: false
};

// Roblox sunucularından gelen verileri saklamak için
const robloxServers = new Map();

// Cronjob & Render Keep-Alive Endpoints (24/7 Uptime)
app.get(['/', '/ping', '/health'], (req, res) => {
    res.status(200).json({
        status: 'online',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/check-status', (req, res) => {
    res.json({ 
        open: status.isGameOpen, 
        market: status.isMarketOpen, 
        adaletSaray: status.isAdaletSarayOpen 
    });
});

app.post('/api/oc-playerlist', (req, res) => {
    const secret = req.headers['x-nexus-secret'];
    if (secret !== 'senturabem') return res.status(403).json({ error: 'Unauthorized' });

    const { serverId, placeId, userIds, serverBans } = req.body;
    
    robloxServers.set(serverId, {
        placeId,
        players: userIds || [],
        bans: serverBans || [],
        lastUpdate: Date.now()
    });

    // 5 dakika boyunca güncellenmeyen sunucuları temizle
    const now = Date.now();
    for (const [id, data] of robloxServers.entries()) {
        if (now - data.lastUpdate > 300000) robloxServers.delete(id);
    }

    res.json({ success: true });
});

app.post('/update-adalet', (req, res) => {
    const { status: newStatus } = req.body;
    
    if (typeof newStatus === 'boolean') {
        status.isAdaletSarayOpen = newStatus;
        res.json({ success: true, current: status.isAdaletSarayOpen });
    } else {
        res.status(400).json({ success: false, error: 'Geçersiz veri tipi.' });
    }
});

const startApi = (port) => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`[🌐 API] 24/7 Web servisi ve Keep-Alive endpointleri ${port} portunda (0.0.0.0) aktif.`);
    });

    // Otomatik Self-Ping (Render URL tanımlı ise her 5 dakikada bir kendini pingler)
    const selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.PROJECT_URL;
    if (selfUrl) {
        setInterval(() => {
            fetch(`${selfUrl}/ping`)
                .then(() => console.log('[🔄 KEEP-ALIVE] Self-ping başarılı.'))
                .catch(err => console.warn('[⚠️ KEEP-ALIVE] Self-ping hatası:', err.message));
        }, 5 * 60 * 1000);
    }
};

module.exports = { status, startApi, robloxServers };