const JsonDatabase = require('./jsonDatabase');
const { EmbedBuilder } = require('discord.js');

const modStatsDb = new JsonDatabase('modStats.json');
const TARGET_CHANNEL_ID = '1518693119082889376';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function _ensureStructure() {
    const data = modStatsDb.all();
    if (!data.lastResetAt) {
        modStatsDb.set('lastResetAt', Date.now());
    }
    if (!data.stats) {
        modStatsDb.set('stats', {});
    }
}

function recordModApproval(modId) {
    _ensureStructure();
    const data = modStatsDb.all();
    const stats = data.stats || {};
    
    if (!stats[modId]) {
        stats[modId] = {
            weeklyApprovals: 0,
            weeklyRejections: 0,
            totalApprovals: 0,
            totalRejections: 0,
            lastActionAt: Date.now()
        };
    }

    stats[modId].weeklyApprovals = (stats[modId].weeklyApprovals || 0) + 1;
    stats[modId].totalApprovals = (stats[modId].totalApprovals || 0) + 1;
    stats[modId].lastActionAt = Date.now();

    modStatsDb.set('stats', stats);
}

function recordModRejection(modId) {
    _ensureStructure();
    const data = modStatsDb.all();
    const stats = data.stats || {};
    
    if (!stats[modId]) {
        stats[modId] = {
            weeklyApprovals: 0,
            weeklyRejections: 0,
            totalApprovals: 0,
            totalRejections: 0,
            lastActionAt: Date.now()
        };
    }

    stats[modId].weeklyRejections = (stats[modId].weeklyRejections || 0) + 1;
    stats[modId].totalRejections = (stats[modId].totalRejections || 0) + 1;
    stats[modId].lastActionAt = Date.now();

    modStatsDb.set('stats', stats);
}

function getWeeklyLeaderboard() {
    _ensureStructure();
    const data = modStatsDb.all();
    const stats = data.stats || {};

    const list = Object.keys(stats).map(modId => ({
        modId,
        weeklyApprovals: stats[modId].weeklyApprovals || 0,
        weeklyRejections: stats[modId].weeklyRejections || 0,
        totalApprovals: stats[modId].totalApprovals || 0,
        totalRejections: stats[modId].totalRejections || 0,
        lastActionAt: stats[modId].lastActionAt || 0
    }));

    list.sort((a, b) => b.weeklyApprovals - a.weeklyApprovals || b.totalApprovals - a.totalApprovals);
    return list;
}

async function publishWeeklyReport(client, force = false) {
    _ensureStructure();
    const data = modStatsDb.all();
    const lastReset = data.lastResetAt || Date.now();
    const now = Date.now();

    if (!force && (now - lastReset < ONE_WEEK_MS)) {
        return false;
    }

    const leaderboard = getWeeklyLeaderboard();
    const targetChannel = await client.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);

    if (targetChannel) {
        const topMod = leaderboard[0];
        let description = `🏆 **HAFTANIN ABONE ONAY LİDERLİK TABLOSU** 🏆\n\n`;

        if (!topMod || topMod.weeklyApprovals === 0) {
            description += `⚠️ Bu hafta henüz onaylanan abone işlemi bulunmuyor.`;
        } else {
            description += `👑 **Haftanın Birincisi:** <@${topMod.modId}> — 🎉 **${topMod.weeklyApprovals} Onay**\n\n` +
                           `📊 **Haftalık Sıralama:**\n`;

            leaderboard.slice(0, 10).forEach((entry, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
                description += `${medal} **#${idx + 1}** <@${entry.modId}> — **${entry.weeklyApprovals} Onay** (Toplam: ${entry.totalApprovals})\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Haftalık Abone Onay Şampiyonu')
            .setDescription(description)
            .setTimestamp()
            .setFooter({ text: 'Sentura Eko Yıldız • Haftalık Otomatik İstatistik Raporu' });

        await targetChannel.send({ content: '🔔 **Haftalık Moderatör İstatistikleri Yayınlandı!**', embeds: [embed] }).catch(err => {
            console.error('[MOD STATS] İstatistik raporu gönderilemedi:', err.message);
        });
    }

    // Haftalık sayaçları sıfırla
    const stats = data.stats || {};
    for (const modId in stats) {
        stats[modId].weeklyApprovals = 0;
        stats[modId].weeklyRejections = 0;
    }
    modStatsDb.set('stats', stats);
    modStatsDb.set('lastResetAt', now);
    console.log('[🏆 MOD STATS] Haftalık abone onay istatistikleri sıfırlandı ve rapor gönderildi.');
    return true;
}

module.exports = {
    recordModApproval,
    recordModRejection,
    getWeeklyLeaderboard,
    publishWeeklyReport,
    TARGET_CHANNEL_ID
};
