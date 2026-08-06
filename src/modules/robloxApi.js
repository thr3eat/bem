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
// ─── Cookie Format Helper ────────────────────────────────────
function getCookieHeader() {
    if (!ROBLOX_COOKIE) return '';
    const cookie = ROBLOX_COOKIE.trim();
    if (!cookie) return '';
    return cookie.includes('.ROBLOSECURITY=') ? cookie : `.ROBLOSECURITY=${cookie}`;
}

async function getGroupRoles(groupId = ROBLOX_GROUP_ID) {
    const cacheKey = `roles_${groupId}`;
    const cached = groupRolesCache.get(cacheKey);
    if (cached) return cached;

    const cookieHeader = getCookieHeader();
    try {
        const response = await fetchWithRetry(`https://groups.roblox.com/v1/groups/${groupId}/roles`, {
            headers: cookieHeader ? { 'Cookie': cookieHeader } : {}
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
//  CSRF TOKEN — TTL Cache + Multi-Endpoint Fallback
// ============================================================
async function getCsrfToken(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = csrfTokenCache.get('csrf');
        if (cached) return cached;
    }

    const cookieHeader = getCookieHeader();
    if (!cookieHeader) {
        throw new Error('ROBLOX_COOKIE tanımlanmamış veya boş. Lütfen ortam değişkenlerini kontrol edin.');
    }

    // 1. Birincil Endpoint: auth.roblox.com/v2/logout
    try {
        const response = await fetch('https://auth.roblox.com/v2/logout', {
            method: 'POST',
            headers: {
                'Cookie': cookieHeader,
                'Content-Length': '0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const token = response.headers.get('x-csrf-token') || response.headers.get('X-CSRF-TOKEN');
        if (token) {
            csrfTokenCache.set('csrf', token);
            return token;
        }

        if (response.status === 401) {
            console.error('[❌ ROBLOX] ROBLOX_COOKIE geçersiz veya süresi dolmuş (401 Unauthorized).');
            throw new Error('ROBLOX_COOKIE geçersiz veya süresi dolmuş.');
        }
    } catch (err) {
        if (err.message.includes('geçersiz')) throw err;
        console.warn('[⚠️ ROBLOX] Logout endpointinden CSRF alınamadı, yedek deneniyor:', err.message);
    }

    // 2. Yedek Endpoint: catalog API
    try {
        const fallbackRes = await fetch('https://catalog.roblox.com/v1/catalog/items/details', {
            method: 'POST',
            headers: {
                'Cookie': cookieHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items: [] })
        });
        const token = fallbackRes.headers.get('x-csrf-token') || fallbackRes.headers.get('X-CSRF-TOKEN');
        if (token) {
            csrfTokenCache.set('csrf', token);
            return token;
        }
    } catch (err) {
        console.error('[❌ ROBLOX] Yedek CSRF endpoint hatası:', err.message);
    }

    throw new Error('CSRF token alınamadı (ROBLOX_COOKIE geçerliliğini ve hesabın durumunu kontrol edin).');
}

// ============================================================
//  SET RANK — Retry + 403 Otomatik CSRF Yakalama
// ============================================================
async function setRobloxRank(userId, rankNumber, groupId = ROBLOX_GROUP_ID) {
    const roleId = await getRoleIdByRank(rankNumber, groupId);
    if (!roleId) {
        throw new Error(`Rank ${rankNumber} için role ID bulunamadı.`);
    }

    const cookieHeader = getCookieHeader();
    if (!cookieHeader) {
        throw new Error('ROBLOX_COOKIE bulunamadı.');
    }

    let csrfToken;
    try {
        csrfToken = await getCsrfToken();
    } catch (e) {
        console.warn('[⚠️ ROBLOX] CSRF önceden alınamadı, istekle yanıt beklenecek:', e.message);
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader
        };
        if (csrfToken) {
            headers['x-csrf-token'] = csrfToken;
        }

        const response = await fetchWithRetry(`https://groups.roblox.com/v1/groups/${groupId}/users/${userId}`, {
            method: 'PATCH',
            headers: headers,
            body: JSON.stringify({ roleId })
        });

        if (response.ok) return true;

        if (response.status === 403) {
            // Roblox 403 yanıtının kendisi x-csrf-token başlığında yeni token'ı verir!
            const returnedToken = response.headers.get('x-csrf-token') || response.headers.get('X-CSRF-TOKEN');
            if (returnedToken) {
                console.log(`[✅ ROBLOX] 403 yanıtından yeni CSRF token otomatik alındı (Deneme ${attempt})`);
                csrfTokenCache.set('csrf', returnedToken);
                csrfToken = returnedToken;
                continue;
            }

            console.warn('[⚠️ ROBLOX] CSRF token geçersiz, zorla yenileniyor...');
            try {
                csrfToken = await getCsrfToken(true);
                continue;
            } catch (csrfErr) {
                throw new Error(`CSRF token yenilenemedi: ${csrfErr.message}`);
            }
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
