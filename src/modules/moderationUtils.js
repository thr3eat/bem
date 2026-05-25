const JsonDatabase = require('./jsonDatabase');

// ============================================================
//  PERSISTENT DATABASES
// ============================================================
const warnDb = new JsonDatabase('warnings.json');
const modlogDb = new JsonDatabase('modlogs.json');
const tempbanDb = new JsonDatabase('tempbans.json');
const tempmuteDb = new JsonDatabase('tempmutes.json');
const unbanRequestsDb = new JsonDatabase('unbanRequests.json');

// Memory-only for polls as they are usually short-lived
const pollVotes = new Map();

let caseCounter = Object.keys(modlogDb.all()).length + 1;

// ============================================================
//  MODLOG FUNCTIONS
// ============================================================
function addModCase(type, userId, moderatorId, reason) {
    const caseId = caseCounter++;
    const logEntry = {
        caseId,
        type,
        userId,
        moderatorId,
        reason,
        timestamp: new Date().toISOString()
    };
    modlogDb.set(caseId.toString(), logEntry);
    return caseId;
}

// ============================================================
//  MODLOG QUERY
// ============================================================
function getModCases(userId) {
    const all = modlogDb.all();
    return Object.values(all).filter(c => c.userId === userId);
}

// ============================================================
//  WARNING SYSTEM
// ============================================================
function getUserWarnings(userId) {
    return warnDb.get(userId) || [];
}

function addWarning(userId, reason, moderatorId) {
    const warns = getUserWarnings(userId);
    warns.push({ reason, moderatorId, timestamp: new Date().toISOString() });
    warnDb.set(userId, warns);
    return warns.length;
}

function removeWarning(userId, index) {
    const warns = getUserWarnings(userId);
    if (index < 0 || index >= warns.length) return false;
    warns.splice(index, 1);
    warnDb.set(userId, warns);
    return true;
}

// ============================================================
//  DURATION PARSING
// ============================================================
function parseDuration(str) {
    const match = str.match(/^(\d+)(s|m|h|d)$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[unit];
}

function formatDuration(ms) {
    if (ms < 60000) return `${Math.floor(ms / 1000)} saniye`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)} dakika`;
    if (ms < 86400000) return `${Math.floor(ms / 3600000)} saat`;
    return `${Math.floor(ms / 86400000)} gün`;
}

// ============================================================
//  PUNISHMENT EXPIRATION CHECK
// ============================================================
async function checkExpiredPunishments(client, config) {
    const now = Date.now();

    // Geçici banlar
    const tempbans = tempbanDb.all();
    for (const userId in tempbans) {
        const data = tempbans[userId];
        if (now >= data.expiresAt) {
            tempbanDb.delete(userId);
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.bans.remove(userId, 'Geçici ban süresi doldu - Otomatik Unban');
                    const user = await client.users.fetch(userId).catch(() => null);
                    if (user) {
                        client.emit('moderation_log', {
                            type: 'auto_unban',
                            user,
                            guild,
                            reason: 'Geçici ban süreniz doldu.'
                        });
                    }
                } catch { }
            }
        }
    }

    // Geçici muteler
    const tempmutes = tempmuteDb.all();
    for (const userId in tempmutes) {
        const data = tempmutes[userId];
        if (now >= data.expiresAt) {
            tempmuteDb.delete(userId);
            for (const guild of client.guilds.cache.values()) {
                try {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (!member) continue;
                    const muteRole = guild.roles.cache.get(config.MUTE_ROLE_ID);
                    if (muteRole && member.roles.cache.has(muteRole.id)) {
                        await member.roles.remove(muteRole, 'Geçici mute süresi doldu - Otomatik Unmute');
                        client.emit('moderation_log', {
                            type: 'auto_unmute',
                            member,
                            reason: 'Geçici susturma süreniz doldu.'
                        });
                    }
                } catch { }
            }
        }
    }
}

module.exports = {
    // Databases (Exposing for direct access where needed)
    warnDatabase: { get: (id) => warnDb.get(id), set: (id, val) => warnDb.set(id, val), delete: (id) => warnDb.delete(id) },
    modlogDatabase: { all: () => modlogDb.all() },
    tempbanDatabase: {
        set: (id, val) => tempbanDb.set(id, val),
        delete: (id) => tempbanDb.delete(id),
        entries: () => Object.entries(tempbanDb.all()),
        get: (id) => tempbanDb.get(id),
    },
    tempmuteDatabase: {
        set: (id, val) => tempmuteDb.set(id, val),
        delete: (id) => tempmuteDb.delete(id),
        entries: () => Object.entries(tempmuteDb.all()),
        get: (id) => tempmuteDb.get(id),
    },
    unbanRequests: unbanRequestsDb,
    pollVotes,
    
    addModCase,
    getUserWarnings,
    getModCases,
    addWarning,
    removeWarning,
    parseDuration,
    formatDuration,
    checkExpiredPunishments,
    
    getCaseCounter: () => caseCounter,
    incrementCaseCounter: () => caseCounter++
};
