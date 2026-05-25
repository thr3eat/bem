// ============================================================
//  ROBLOX API FUNCTIONS — TTL Cache + Retry
// ============================================================

const { ROBLOX_COOKIE, ROBLOX_GROUP_ID, rankList, KAYIT_GRUP_ID } = require('./constants');

// ─── TTL Cache ────────────────────────────────────────────────
class TTLCache {
    constructor(ttlMs) {
        this.ttlMs = ttlMs;
        this.store = new Map();
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
        return entry.value;
    }
    set(key, value) {
        this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }
    delete(key) { this.store.delete(key); }
}

const groupRolesCache = new TTLCache(10 * 60 * 1000);  // 10 dakika
const csrfTokenCache  = new TTLCache(5  * 60 * 1000);  // 5 dakika
const userCache       = new TTLCache(2  * 60 * 1000);  // 2 dakika

// ─── Retry mekanizması ────────────────────────────────────────
async function fetchWithRetry(url, options = {}, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url, options);
            if (res.status === 429) {
                const retryAfter = parseInt(res.headers.get('retry-after') || '5') * 1000;
                console.warn(`[⏳ ROBLOX] Rate limit — ${retryAfter}ms bekleniyor (deneme ${attempt}/${maxRetries})`);
                await new Promise(r => setTimeout(r, retryAfter));
                continue;
            }
            return res;
        } catch (err) {
            if (attempt === maxRetries) throw err;
            const wait = 1000 * attempt; // Exponential backoff
            console.warn(`[⚠️ ROBLOX] Ağ hatası, ${wait}ms sonra tekrar (deneme ${attempt}/${maxRetries}): ${err.message}`);
            await new Promise(r => setTimeout(r, wait));
        }
    }
}

// ============================================================
//  USER FETCHING
// ============================================================
async function getRobloxUser(username) {
    const cacheKey = `user_${username.toLowerCase()}`;
    const cached = userCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetchWithRetry('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
        });
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            userCache.set(cacheKey, data.data[0]);
            return data.data[0];
        }
        return null;
    } catch {
        return null;
    }
}

async function getRobloxUserById(userId) {
    const cacheKey = `userid_${userId}`;
    const cached = userCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetchWithRetry(`https://users.roblox.com/v1/users/${userId}`);
        const data = await response.json();
        if (data) userCache.set(cacheKey, data);
        return data || null;
    } catch {
        return null;
    }
}

async function getUserRankInGroup(userId, groupId = ROBLOX_GROUP_ID) {
    try {
        const response = await fetchWithRetry(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
        const data = await response.json();
        if (data && data.data) {
            const group = data.data.find(g => g.group.id === groupId);
            if (group) return { rank: group.role.rank, name: group.role.name };
        }
        return { rank: 0, name: 'Grup Üyesi Değil' };
    } catch {
        return { rank: 0, name: 'API Hatası' };
    }
}

async function getGroupMemberCount() {
    try {
        const response = await fetchWithRetry(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}`);
        const data = await response.json();
        return data.memberCount || 0;
    } catch {
        return 0;
    }
}

// ============================================================
//  RANK SYSTEM — TTL Cache
// ============================================================
async function getGroupRoles(groupId = ROBLOX_GROUP_ID) {
    const cacheKey = `roles_${groupId}`;
    const cached = groupRolesCache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await fetchWithRetry(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
            headers: { 'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}` }
        });
        if (!response.ok) throw new Error(`Grup rolleri alınamadı: ${response.status}`);
        const data = await response.json();
        const roles = data.roles || [];
        groupRolesCache.set(cacheKey, roles);
        console.log(`[✅ ROBLOX] Grup ${groupId} için ${roles.length} rol cache'lendi (10dk TTL)`);
        return roles;
    } catch (err) {
        console.error(`[❌ ROBLOX] Grup (${groupId}) rolleri çekilirken hata:`, err.message);
        return [];
    }
}

async function getRoleIdByRank(rankNumber, groupId = ROBLOX_GROUP_ID) {
    const roles = await getGroupRoles(groupId);
    const role = roles.find(r => r.rank === rankNumber);
    return role ? role.id : null;
}

// Cache'i zorla yenile (CSRF hatası sonrası vb.)
function invalidateGroupRolesCache(groupId = ROBLOX_GROUP_ID) {
    groupRolesCache.delete(`roles_${groupId}`);
}

// ============================================================
//  CSRF TOKEN — TTL Cache
// ============================================================
async function getCsrfToken(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = csrfTokenCache.get('csrf');
        if (cached) return cached;
    }

    try {
        const response = await fetch('https://auth.roblox.com/v2/logout', {
            method: 'POST',
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
                'Content-Length': '0'
            }
        });
        const token = response.headers.get('x-csrf-token');
        if (!token) throw new Error('CSRF token alınamadı');
        csrfTokenCache.set('csrf', token);
        return token;
    } catch (err) {
        console.error('[❌ ROBLOX] CSRF token hatası:', err.message);
        throw err;
    }
}

// ============================================================
//  SET RANK — Retry + CSRF yenileme
// ============================================================
async function setRobloxRank(userId, rankNumber, groupId = ROBLOX_GROUP_ID) {
    const roleId = await getRoleIdByRank(rankNumber, groupId);
    if (!roleId) {
        throw new Error(`Rank ${rankNumber} için role ID bulunamadı.`);
    }

    let csrfToken = await getCsrfToken();

    for (let attempt = 1; attempt <= 3; attempt++) {
        const response = await fetchWithRetry(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ roleId })
        });

        if (response.ok) return true;

        if (response.status === 403) {
            // CSRF token geçersiz, yenile
            console.warn('[⚠️ ROBLOX] CSRF token geçersiz, yenileniyor...');
            csrfToken = await getCsrfToken(true);
            continue;
        }

        const errText = await response.text().catch(() => 'Bilinmeyen hata');
        throw new Error(`Roblox API Hatası: ${response.status} - ${errText}`);
    }

    throw new Error('Maksimum deneme sayısına ulaşıldı (setRobloxRank)');
}

// ============================================================
//  KAYIT SYSTEM — getGroupRoles ile birleştirildi
// ============================================================
async function kayitGetirGrupRolleri() {
    return getGroupRoles(KAYIT_GRUP_ID);
}

async function kayitGetirRoleId(rankNumber) {
    return getRoleIdByRank(rankNumber, KAYIT_GRUP_ID);
}

async function kayitGruptaMi(robloxUserId) {
    try {
        const res  = await fetchWithRetry(`https://groups.roblox.com/v1/users/${robloxUserId}/groups/roles`);
        const data = await res.json();
        if (data?.data) {
            return data.data.some(g => g.group.id === KAYIT_GRUP_ID);
        }
        return false;
    } catch {
        return false;
    }
}

async function kayitKaydRobloxKullanici(username) {
    return getRobloxUser(username);
}

async function kayitSetRobloxRank(userId, rankNumber) {
    return setRobloxRank(userId, rankNumber, KAYIT_GRUP_ID);
}

module.exports = {
    getRobloxUser,
    getRobloxUserById,
    getUserRankInGroup,
    getGroupMemberCount,
    getGroupRoles,
    getRoleIdByRank,
    getCsrfToken,
    setRobloxRank,
    invalidateGroupRolesCache,
    kayitGetirGrupRolleri,
    kayitGetirRoleId,
    kayitGruptaMi,
    kayitKaydRobloxKullanici,
    kayitSetRobloxRank
};
