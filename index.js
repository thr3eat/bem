const {
    Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes,
    EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder,
    ButtonStyle, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder,
    TextInputStyle, AuditLogEvent, Collection
} = require('discord.js');
const { status, startApi } = require('./api');
const config = require('./config.json');

// ============================================================
//  ROBLOX GRUP VE API AYARLARI
// ============================================================
const ROBLOX_GROUP_ID = 8505535;
const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE; // Render'da environment variable olarak ekle

// ============================================================
//  RÜTBE LİSTESİ — Grup ID: 8505535 (Guest hariç tümü)
// ============================================================
const rankList = [
    { name: "Polis",                              id: 1   },
    { name: "Akademi Adayı",                      id: 2   },
    { name: "Akademi",                            id: 3   },
    { name: "Polis Memuru Adayı",                 id: 6   },
    { name: "Polis Memuru",                       id: 7   },
    { name: "Kıdemli Polis Memuru",               id: 8   },
    { name: "Başpolis Memuru Adayı",              id: 9   },
    { name: "Başpolis Memuru",                    id: 10  },
    { name: "Kıdemli Başpolis Memuru",            id: 11  },
    { name: "Uzm. Başpolis Memuru",               id: 12  },
    { name: "Aday Komiser",                       id: 13  },
    { name: "Emekli Personel",                    id: 14  },
    { name: "Stajyer Komiser",                    id: 15  },
    { name: "Komiser Yardımcısı",                 id: 16  },
    { name: "Askomiser",                          id: 17  },
    { name: "Komiser",                            id: 18  },
    { name: "Üskomiser",                          id: 19  },
    { name: "Başkomiser",                         id: 20  },
    { name: "Amir Adayı",                         id: 21  },
    { name: "Emniyet Amiri",                      id: 22  },
    { name: "Müdür",                              id: 23  },
    { name: "4. Sınıf Emniyet Müdürü",            id: 24  },
    { name: "3. Sınıf Emniyet Müdürü",            id: 25  },
    { name: "2. Sınıf Emniyet Müdürü",            id: 26  },
    { name: "1. Sınıf Emniyet Müdürü",            id: 27  },
    { name: "Emniyet Genel Müdürü",               id: 28  },
    { name: "Teftiş Kurulu",                      id: 29  },
    { name: "Teftiş Kurulu Başkan Yardımcısı",    id: 30  },
    { name: "Teftiş Kurulu Başkanı",              id: 31  },
    { name: "Yüksek Polis Kurulu",                id: 32  },
    { name: "Yönetim Kurulu",                     id: 33  },
    { name: "Yönetim Kurulu Başkan Yardımcısı",   id: 34  },
    { name: "Yönetim Kurulu Başkanı",             id: 36  },
    { name: "Contributor",                        id: 37  },
    { name: "Geliştirme Ekibi",                   id: 250 },
    { name: "Vali",                               id: 252 },
    { name: "Cumhurbaşkanı",                      id: 254 },
    { name: "Proje Uygulaması",                   id: 255 }
];

// ============================================================
//  IN-MEMORY DEPOLAMA (aktif warn/uyarı/unban talepleri vb.)
// ============================================================
// { userId: [ { reason, moderator, timestamp } ] }
const warnDatabase = new Map();

// { caseId: { type, userId, moderatorId, reason, timestamp } }
const modlogDatabase = new Map();
let caseCounter = 1;

// { userId: { expiresAt, reason, moderatorId } }
const tempbanDatabase = new Map();
const tempmuteDatabase = new Map();

// Aktif unban talepleri: { messageId: { userId, reason, requesterId } }
const unbanRequests = new Map();

// ============================================================
//  YARDIMCI FONKSİYONLAR - ROBLOX API
// ============================================================
async function getRobloxUser(username) {
    try {
        const response = await fetch('https://users.roblox.com/v1/usernames/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
        });
        const data = await response.json();
        if (data.data && data.data.length > 0) return data.data[0];
        return null;
    } catch {
        return null;
    }
}

async function getRobloxUserById(userId) {
    try {
        const response = await fetch(`https://users.roblox.com/v1/users/${userId}`);
        const data = await response.json();
        return data || null;
    } catch {
        return null;
    }
}

async function getUserRankInGroup(userId) {
    try {
        const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
        const data = await response.json();
        if (data && data.data) {
            const group = data.data.find(g => g.group.id === ROBLOX_GROUP_ID);
            if (group) return { rank: group.role.rank, name: group.role.name };
        }
        return { rank: 0, name: 'Grup Üyesi Değil' };
    } catch {
        return { rank: 0, name: 'API Hatası' };
    }
}

// ============================================================
//  ROBLOX RÜTBE SİSTEMİ — Kendi cookie ile native API
// ============================================================

// Grup rollerini cache'le (her başlatmada bir kez çekilir)
let groupRolesCache = null;

async function getGroupRoles() {
    if (groupRolesCache) return groupRolesCache;
    try {
        const response = await fetch(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}/roles`, {
            headers: {
                'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`
            }
        });
        if (!response.ok) {
            throw new Error(`Grup rolleri alınamadı: ${response.status}`);
        }
        const data = await response.json();
        // roles: [ { id: <gerçek role id>, name, rank, memberCount } ]
        groupRolesCache = data.roles || [];
        console.log(`[✅] ${groupRolesCache.length} grup rolü yüklendi.`);
        return groupRolesCache;
    } catch (err) {
        console.error('[❌] Grup rolleri çekilirken hata:', err.message);
        return [];
    }
}

// Rank numarasından gerçek Roblox role ID'sini bul
async function getRoleIdByRank(rankNumber) {
    const roles = await getGroupRoles();
    const role = roles.find(r => r.rank === rankNumber);
    return role ? role.id : null;
}

// CSRF token al (Roblox API'si POST/PATCH işlemlerinde gerektirir)
async function getCsrfToken() {
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
        return token;
    } catch (err) {
        console.error('[❌] CSRF token hatası:', err.message);
        throw err;
    }
}

async function setRobloxRank(userId, rankNumber) {
    // 1. Rank numarasından gerçek role ID'sini bul
    const roleId = await getRoleIdByRank(rankNumber);
    if (!roleId) {
        throw new Error(`Rank ${rankNumber} için role ID bulunamadı. Grup rolleri cache'ini kontrol edin.`);
    }

    // 2. CSRF token al
    const csrfToken = await getCsrfToken();

    // 3. Rütbeyi ata
    const response = await fetch(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}/users/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': `.ROBLOSECURITY=${ROBLOX_COOKIE}`,
            'x-csrf-token': csrfToken
        },
        body: JSON.stringify({ roleId: roleId })
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Bilinmeyen hata');
        throw new Error(`Roblox API Hatası: ${response.status} - ${errText}`);
    }

    return true;
}

async function getGroupMemberCount() {
    try {
        const response = await fetch(`https://groups.roblox.com/v1/groups/${ROBLOX_GROUP_ID}`);
        const data = await response.json();
        return data.memberCount || 0;
    } catch {
        return 0;
    }
}

// ============================================================
//  YARDIMCI FONKSİYONLAR - MODERASYON
// ============================================================
function addModCase(type, userId, moderatorId, reason) {
    const caseId = caseCounter++;
    modlogDatabase.set(caseId, {
        caseId,
        type,
        userId,
        moderatorId,
        reason,
        timestamp: new Date()
    });
    return caseId;
}

function getUserWarnings(userId) {
    return warnDatabase.get(userId) || [];
}

function addWarning(userId, reason, moderatorId) {
    const warns = getUserWarnings(userId);
    warns.push({ reason, moderatorId, timestamp: new Date() });
    warnDatabase.set(userId, warns);
    return warns.length;
}

function removeWarning(userId, index) {
    const warns = getUserWarnings(userId);
    if (index < 0 || index >= warns.length) return false;
    warns.splice(index, 1);
    warnDatabase.set(userId, warns);
    return true;
}

function parseDuration(str) {
    // "10m", "2h", "1d", "30s" formatlarını parse eder
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
//  YARDIMCI FONKSİYONLAR - EMBED OLUŞTURMA
// ============================================================
function buildModEmbed(title, color, fields, footerText = 'Bursa Emniyet Müdürlüğü') {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: footerText });
}

function buildDMEmbed(action, guildName, moderatorTag, reason, extra = '') {
    const colorMap = {
        ban: '#FF0000', kick: '#FF6600', mute: '#FFA500',
        warn: '#FFFF00', tempban: '#CC0000', tempmute: '#FF8C00',
        unban: '#00FF00', unmute: '#00FF00', note: '#00BFFF'
    };
    const iconMap = {
        ban: '🔨', kick: '👢', mute: '🔇', warn: '⚠️',
        tempban: '⏳', tempmute: '⏰', unban: '✅', unmute: '🔊', note: '📝'
    };
    const titleMap = {
        ban: 'Sunucudan Yasaklandınız!',
        kick: 'Sunucudan Atıldınız!',
        mute: 'Susturuldunuz!',
        warn: 'Uyarı Aldınız!',
        tempban: 'Geçici Olarak Yasaklandınız!',
        tempmute: 'Geçici Olarak Susturuldunuz!',
        unban: 'Yasağınız Kaldırıldı!',
        unmute: 'Susturmanız Kaldırıldı!',
        note: 'Hakkınızda Not Eklendi'
    };
    const embed = new EmbedBuilder()
        .setColor(colorMap[action] || '#888888')
        .setTitle(`${iconMap[action]} ${titleMap[action]}`)
        .addFields(
            { name: '🏠 Sunucu', value: guildName, inline: true },
            { name: '👮 Yetkili', value: moderatorTag, inline: true },
            { name: '📋 Sebep', value: reason || 'Belirtilmedi', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Bursa Emniyet Müdürlüğü | İtiraz için yetkililere başvurun.' });
    if (extra) embed.addFields({ name: '📌 Ek Bilgi', value: extra, inline: false });
    return embed;
}

async function sendDM(user, embed) {
    try {
        await user.send({ embeds: [embed] });
        return true;
    } catch {
        return false;
    }
}

// ============================================================
//  LOG KANALI GÖNDERME
// ============================================================
async function sendLog(client, embed) {
    if (!config.LOG_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(config.LOG_CHANNEL_ID);
        if (channel) await channel.send({ embeds: [embed] });
    } catch { /* Log kanalı bulunamazsa sessizce geç */ }
}

// ============================================================
//  CLIENT VE TOKEN
// ============================================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ]
});

const TOKEN = process.env.DISCORD_TOKEN;

// ============================================================
//  KOMUTLARI KAYDETME
// ============================================================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        const commands = [
            // === OYUN YÖNETİMİ ===
            new SlashCommandBuilder()
                .setName('oyun-yonet')
                .setDescription('Oyunu açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),

            new SlashCommandBuilder()
                .setName('market-yonet')
                .setDescription('Rütbe marketini açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),

            new SlashCommandBuilder()
                .setName('adaletsarayi-yonet')
                .setDescription('Adalet Sarayını açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),

            new SlashCommandBuilder()
                .setName('tumunu-ac')
                .setDescription('Oyun, Market ve Adalet Sarayını aynı anda açar.'),

            new SlashCommandBuilder()
                .setName('tumunu-kapat')
                .setDescription('Tüm sistemleri aynı anda kapatır.'),

            new SlashCommandBuilder()
                .setName('durum')
                .setDescription('Tüm sistemlerin mevcut durumunu gösterir.'),

            // === MODERASYON ===
            new SlashCommandBuilder()
                .setName('ban')
                .setDescription('Kullanıcıyı sunucudan kalıcı olarak yasaklar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj_sil').setDescription('Kaç günlük mesaj silinsin? (0-7)').setRequired(false)),

            new SlashCommandBuilder()
                .setName('tempban')
                .setDescription('Kullanıcıyı belirli süreliğine yasaklar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('unban')
                .setDescription('Kullanıcının yasağını kaldırır.')
                .addStringOption(opt => opt.setName('kullanici_id').setDescription('Kullanıcı ID').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Unban sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('kick')
                .setDescription('Kullanıcıyı sunucudan atar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('mute')
                .setDescription('Kullanıcıya Susturulmuş rolü verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('tempmute')
                .setDescription('Kullanıcıyı belirli süreliğine susturur.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('unmute')
                .setDescription('Kullanıcının susturmasını kaldırır.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturma kaldırılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Unmute sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('warn')
                .setDescription('Kullanıcıya uyarı verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Uyarı sebebi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('warnlist')
                .setDescription('Kullanıcının uyarılarını listeler.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarıları görülecek kişi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('warnremove')
                .setDescription('Kullanıcıdan uyarı kaldırır.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Uyarı kaldırılacak kişi').setRequired(true))
                .addIntegerOption(opt => opt.setName('index').setDescription('Kaldırılacak uyarı numarası (1\'den başlar)').setRequired(true)),

            new SlashCommandBuilder()
                .setName('modlog')
                .setDescription('Kullanıcının moderasyon geçmişini gösterir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Geçmişi görülecek kişi').setRequired(true)),

            new SlashCommandBuilder()
                .setName('clear')
                .setDescription('Belirtilen sayıda mesajı siler.')
                .addIntegerOption(opt => opt.setName('sayi').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true))
                .addUserOption(opt => opt.setName('kullanici').setDescription('Sadece bu kişinin mesajlarını sil').setRequired(false)),

            new SlashCommandBuilder()
                .setName('slowmode')
                .setDescription('Kanalda yavaş modu ayarlar.')
                .addIntegerOption(opt => opt.setName('saniye').setDescription('Saniye (0 = kapat)').setRequired(true))
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false)),

            new SlashCommandBuilder()
                .setName('lock')
                .setDescription('Kanalı kilitler (yazma engeli).')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false))
                .addStringOption(opt => opt.setName('sebep').setDescription('Kilitleme sebebi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('unlock')
                .setDescription('Kanalın kilidini açar.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false)),

            // === ROBLOX RÜTBE SİSTEMİ ===
            new SlashCommandBuilder()
                .setName('terfi')
                .setDescription('Kullanıcıyı bir üst rütbeye terfi ettirir.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),

            new SlashCommandBuilder()
                .setName('tenzil')
                .setDescription('Kullanıcıyı bir alt rütbeye düşürür.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rutbedegistir')
                .setDescription('Kullanıcıya listeden bir rütbe atar.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true))
                .addIntegerOption(opt => opt.setName('rutbe_id').setDescription('Atanacak rütbeyi listeden seçin').setRequired(true).setAutocomplete(true)),

            new SlashCommandBuilder()
                .setName('rutbebak')
                .setDescription('Kullanıcının Roblox rütbesini gösterir.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rutbelist')
                .setDescription('Tüm rütbe listesini gösterir.'),

            // === BİLGİ KOMUTLARI ===
            new SlashCommandBuilder()
                .setName('kullanici')
                .setDescription('Kullanıcı hakkında bilgi gösterir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Bilgi alınacak kişi').setRequired(false)),

            new SlashCommandBuilder()
                .setName('sunucu')
                .setDescription('Sunucu hakkında bilgi gösterir.'),

            new SlashCommandBuilder()
                .setName('bot')
                .setDescription('Bot hakkında bilgi gösterir.'),

            new SlashCommandBuilder()
                .setName('ping')
                .setDescription('Botun gecikme süresini gösterir.'),

            new SlashCommandBuilder()
                .setName('avatar')
                .setDescription('Kullanıcının avatarını gösterir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Avatar alınacak kişi').setRequired(false)),

            // === DUYURU & MESAJİNG ===
            new SlashCommandBuilder()
                .setName('duyuru')
                .setDescription('Belirtilen kanala embed duyuru gönderir.')
                .addChannelOption(opt => opt.setName('kanal').setDescription('Duyuru kanalı').setRequired(true))
                .addStringOption(opt => opt.setName('baslik').setDescription('Duyuru başlığı').setRequired(true))
                .addStringOption(opt => opt.setName('icerik').setDescription('Duyuru içeriği').setRequired(true))
                .addStringOption(opt => opt.setName('renk').setDescription('Embed rengi (hex, örn: #FF0000)').setRequired(false)),

            new SlashCommandBuilder()
                .setName('dm')
                .setDescription('Kullanıcıya DM gönderir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('DM gönderilecek kişi').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true)),

            new SlashCommandBuilder()
                .setName('toplu-dm')
                .setDescription('Belirli role sahip kişilere toplu DM gönderir.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Hedef rol').setRequired(true))
                .addStringOption(opt => opt.setName('mesaj').setDescription('Mesaj içeriği').setRequired(true)),

            // === ROL YÖNETİMİ ===
            new SlashCommandBuilder()
                .setName('rol-ver')
                .setDescription('Kullanıcıya rol verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Rol verilecek kişi').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Verilecek rol').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rol-al')
                .setDescription('Kullanıcıdan rol alır.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Rol alınacak kişi').setRequired(true))
                .addRoleOption(opt => opt.setName('rol').setDescription('Alınacak rol').setRequired(true)),

            new SlashCommandBuilder()
                .setName('rol-bilgi')
                .setDescription('Rol hakkında bilgi gösterir.')
                .addRoleOption(opt => opt.setName('rol').setDescription('Bilgi alınacak rol').setRequired(true)),

            // === NİCKNAME ===
            new SlashCommandBuilder()
                .setName('nick')
                .setDescription('Kullanıcının sunucu nickini değiştirir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Nick değiştirilecek kişi').setRequired(true))
                .addStringOption(opt => opt.setName('yeni_nick').setDescription('Yeni nickname (boş = sıfırla)').setRequired(false)),

            // === ANKET ===
            new SlashCommandBuilder()
                .setName('anket')
                .setDescription('Hızlı evet/hayır anketi oluşturur.')
                .addStringOption(opt => opt.setName('soru').setDescription('Anket sorusu').setRequired(true))
                .addChannelOption(opt => opt.setName('kanal').setDescription('Anket kanalı (boş = mevcut)').setRequired(false)),

            // === GELEN KUTUSU / TOPLU İŞLEM ===
            new SlashCommandBuilder()
                .setName('hepsini-ban')
                .setDescription('ID listesindeki tüm kullanıcıları banlar (toplu).')
                .addStringOption(opt => opt.setName('id_listesi').setDescription('Virgülle ayrılmış ID listesi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true)),

        ].map(cmd => cmd.toJSON());

        await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
        console.log(`[✅] ${commands.length} Discord komutu başarıyla kaydedildi!`);
    } catch (error) {
        console.error('[❌] Komutlar kaydedilirken hata:', error);
    }
})();

// ============================================================
//  READY EVENTİ
// ============================================================
client.once('ready', async () => {
    console.log(`[🤖] ${client.user.tag} olarak giriş yapıldı!`);
    console.log(`[📊] ${client.guilds.cache.size} sunucuda aktif.`);
    console.log(`[📋] ${rankList.length} rütbe yüklendi.`);
    client.user.setActivity('Bursa Emniyet Müdürlüğü | /yardim', { type: 4 });

    // Başlangıçta grup rollerini önbelleğe al
    if (ROBLOX_COOKIE) {
        await getGroupRoles();
    } else {
        console.warn('[⚠️] ROBLOX_COOKIE environment variable bulunamadı! Rütbe komutları çalışmaz.');
    }

    // Geçici ban/mute kontrolü - her dakika çalışır
    setInterval(() => checkExpiredPunishments(client), 60000);
});

// ============================================================
//  GEÇİCİ CEZA BİTİŞ KONTROLÜ
// ============================================================
async function checkExpiredPunishments(client) {
    const now = Date.now();

    // Geçici banlar
    for (const [userId, data] of tempbanDatabase.entries()) {
        if (now >= data.expiresAt) {
            tempbanDatabase.delete(userId);
            for (const guild of client.guilds.cache.values()) {
                try {
                    await guild.bans.remove(userId, 'Geçici ban süresi doldu - Otomatik Unban');
                    const user = await client.users.fetch(userId).catch(() => null);
                    if (user) {
                        const embed = buildDMEmbed('unban', guild.name, 'Sistem (Otomatik)', 'Geçici ban süreniz doldu.');
                        await sendDM(user, embed);
                        const logEmbed = buildModEmbed(
                            '✅ Otomatik Unban',
                            '#00FF00',
                            [
                                { name: '👤 Kullanıcı', value: `${user.tag} (${userId})`, inline: true },
                                { name: '📋 Sebep', value: 'Geçici ban süresi doldu', inline: true }
                            ]
                        );
                        await sendLog(client, logEmbed);
                    }
                } catch { /* Zaten sunucuda ban yoksa sessizce geç */ }
            }
        }
    }

    // Geçici muteler
    for (const [userId, data] of tempmuteDatabase.entries()) {
        if (now >= data.expiresAt) {
            tempmuteDatabase.delete(userId);
            for (const guild of client.guilds.cache.values()) {
                try {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (!member) continue;
                    const muteRole = guild.roles.cache.get(config.MUTE_ROLE_ID);
                    if (muteRole && member.roles.cache.has(muteRole.id)) {
                        await member.roles.remove(muteRole, 'Geçici mute süresi doldu - Otomatik Unmute');
                        const dmEmbed = buildDMEmbed('unmute', guild.name, 'Sistem (Otomatik)', 'Geçici susturma süreniz doldu.');
                        await sendDM(member.user, dmEmbed);
                        const logEmbed = buildModEmbed(
                            '🔊 Otomatik Unmute',
                            '#00FF00',
                            [
                                { name: '👤 Kullanıcı', value: `${member.user.tag} (${userId})`, inline: true },
                                { name: '📋 Sebep', value: 'Geçici mute süresi doldu', inline: true }
                            ]
                        );
                        await sendLog(client, logEmbed);
                    }
                } catch { /* Üye sunucuda değilse sessizce geç */ }
            }
        }
    }
}

// ============================================================
//  ANA ETKİLEŞİM HANDLER'I
// ============================================================
client.on('interactionCreate', async interaction => {

    // === AUTOCOMPLETE ===
    if (interaction.isAutocomplete()) {
        if (interaction.commandName === 'rutbedegistir') {
            const focusedValue = interaction.options.getFocused();
            const filtered = rankList.filter(r => r.name.toLowerCase().includes(focusedValue.toLowerCase()));
            await interaction.respond(filtered.slice(0, 25).map(r => ({ name: r.name, value: r.id })));
        }
        return;
    }

    // === BUTON ETKİLEŞİMLERİ ===
    if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
        return;
    }

    // Sadece chat input komutları devam etsin
    if (!interaction.isChatInputCommand()) return;

    // Sunucu kontrolü
    if (interaction.guildId !== config.GUILD_ID) {
        return interaction.reply({ content: '❌ Bu komut sadece ana sunucumuzda kullanılabilir.', ephemeral: true });
    }

    // Yetki kontrolü
    const hasRole = interaction.member.roles.cache.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return interaction.reply({ content: '❌ Bu komutu kullanmak için **Yetkili** rolüne sahip olmanız gerekiyor!', ephemeral: true });
    }

    const { commandName } = interaction;

    // ============================================================
    //  OYUN YÖNETİMİ KOMUTLARI
    // ============================================================
    if (commandName === 'oyun-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isGameOpen = durum;
        const embed = buildModEmbed(
            durum ? '🟢 Oyun Açıldı' : '🔴 Oyun Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '🎮 Sistem', value: 'Oyun', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'market-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isMarketOpen = durum;
        const embed = buildModEmbed(
            durum ? '🟢 Market Açıldı' : '🔴 Market Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '🛒 Sistem', value: 'Rütbe Marketi', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'adaletsarayi-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isAdaletSarayOpen = durum;
        const embed = buildModEmbed(
            durum ? '🟢 Adalet Sarayı Açıldı' : '🔴 Adalet Sarayı Kapatıldı',
            durum ? '#00FF00' : '#FF0000',
            [
                { name: '⚖️ Sistem', value: 'Adalet Sarayı', inline: true },
                { name: '📊 Durum', value: durum ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'tumunu-ac') {
        status.isGameOpen = true;
        status.isMarketOpen = true;
        status.isAdaletSarayOpen = true;
        const embed = buildModEmbed(
            '✅ Tüm Sistemler Açıldı',
            '#00FF00',
            [
                { name: '🎮 Oyun', value: '✅ AÇIK', inline: true },
                { name: '🛒 Market', value: '✅ AÇIK', inline: true },
                { name: '⚖️ Adalet Sarayı', value: '✅ AÇIK', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: false }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'tumunu-kapat') {
        status.isGameOpen = false;
        status.isMarketOpen = false;
        status.isAdaletSarayOpen = false;
        const embed = buildModEmbed(
            '🚨 Tüm Sistemler Kapatıldı',
            '#FF0000',
            [
                { name: '🎮 Oyun', value: '❌ KAPALI', inline: true },
                { name: '🛒 Market', value: '❌ KAPALI', inline: true },
                { name: '⚖️ Adalet Sarayı', value: '❌ KAPALI', inline: true },
                { name: '👮 İşlemi Yapan', value: interaction.user.tag, inline: false }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'durum') {
        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📊 Sistem Durumları')
            .setDescription('Bursa Emniyet Müdürlüğü sistematik durum paneli')
            .addFields(
                { name: '🎮 Oyun', value: status.isGameOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true },
                { name: '🛒 Rütbe Marketi', value: status.isMarketOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true },
                { name: '⚖️ Adalet Sarayı', value: status.isAdaletSarayOpen ? '🟢 AÇIK' : '🔴 KAPALI', inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü Sistemleri' });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    // ============================================================
    //  MODERASYON KOMUTLARI
    // ============================================================

    if (commandName === 'ban') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const deletedays = parseInt(interaction.options.getString('mesaj_sil') || '0');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (member) {
            if (!member.bannable) {
                return interaction.reply({ content: '❌ Bu kullanıcıyı banlayamam! (Yetkim yetersiz veya üst rol)', ephemeral: true });
            }
        }

        const caseId = addModCase('BAN', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('ban', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}\nSunucu: ${interaction.guild.name}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await interaction.guild.bans.create(user.id, { reason: `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`, deleteMessageDays: Math.min(Math.max(deletedays, 0), 7) });

            const embed = buildModEmbed(
                `🔨 Kullanıcı Banlandı | Vaka #${caseId}`,
                '#FF0000',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi (DM Kapalı)', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Banlama işlemi başarısız: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'tempban') {
        const user = interaction.options.getUser('kullanici');
        const sureStr = interaction.options.getString('sure');
        const reason = interaction.options.getString('sebep');
        const durationMs = parseDuration(sureStr);

        if (!durationMs) {
            return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnek: `10m`, `2h`, `1d`', ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member && !member.bannable) {
            return interaction.reply({ content: '❌ Bu kullanıcıyı banlayamam!', ephemeral: true });
        }

        const expiresAt = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId = addModCase('TEMPBAN', user.id, interaction.user.id, `${reason} (${durationText})`);
        tempbanDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmEmbed = buildDMEmbed('tempban', interaction.guild.name, interaction.user.tag, reason,
            `Süre: **${durationText}**\nBitiş: <t:${Math.floor(expiresAt / 1000)}:F>\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await interaction.guild.bans.create(user.id, { reason: `[TEMPBAN #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`, deleteMessageDays: 1 });

            const embed = buildModEmbed(
                `⏳ Geçici Ban | Vaka #${caseId}`,
                '#CC0000',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '⏱️ Süre', value: durationText, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '🕐 Bitiş', value: `<t:${Math.floor(expiresAt / 1000)}:F>`, inline: true },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            tempbanDatabase.delete(user.id);
            await interaction.reply({ content: `❌ Geçici banlama işlemi başarısız: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'unban') {
        const userId = interaction.options.getString('kullanici_id');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        try {
            const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
            if (!bannedUser) {
                return interaction.reply({ content: '❌ Bu kullanıcı zaten banlı değil veya ID geçersiz!', ephemeral: true });
            }

            await interaction.guild.bans.remove(userId, `${reason} | Yetkili: ${interaction.user.tag}`);
            tempbanDatabase.delete(userId);

            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const dmEmbed = buildDMEmbed('unban', interaction.guild.name, interaction.user.tag, reason);
                await sendDM(user, dmEmbed);
            }

            const caseId = addModCase('UNBAN', userId, interaction.user.id, reason);
            const embed = buildModEmbed(
                `✅ Ban Kaldırıldı | Vaka #${caseId}`,
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: user ? `${user.tag}\n(${userId})` : userId, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Unban işlemi başarısız: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'kick') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });
        if (!member.kickable) return interaction.reply({ content: '❌ Bu kullanıcıyı atamam! (Yetki yetersiz)', ephemeral: true });

        const caseId = addModCase('KICK', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('kick', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.kick(`[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `👢 Kullanıcı Atıldı | Vaka #${caseId}`,
                '#FF6600',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Atma işlemi başarısız: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'mute') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı! Config\'i kontrol edin.', ephemeral: true });

        if (member.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ Bu kullanıcı zaten susturulmuş!', ephemeral: true });
        }

        const caseId = addModCase('MUTE', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('mute', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.add(muteRole, `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `🔇 Kullanıcı Susturuldu | Vaka #${caseId}`,
                '#FFA500',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Susturma işlemi başarısız: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'tempmute') {
        const user = interaction.options.getUser('kullanici');
        const sureStr = interaction.options.getString('sure');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const durationMs = parseDuration(sureStr);

        if (!durationMs) {
            return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnek: `10m`, `2h`, `1d`', ephemeral: true });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı!', ephemeral: true });

        const expiresAt = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId = addModCase('TEMPMUTE', user.id, interaction.user.id, `${reason} (${durationText})`);
        tempmuteDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmEmbed = buildDMEmbed('tempmute', interaction.guild.name, interaction.user.tag, reason,
            `Süre: **${durationText}**\nBitiş: <t:${Math.floor(expiresAt / 1000)}:F>\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.add(muteRole, `[TEMPMUTE #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `⏰ Geçici Susturma | Vaka #${caseId}`,
                '#FF8C00',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '⏱️ Süre', value: durationText, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '🕐 Bitiş', value: `<t:${Math.floor(expiresAt / 1000)}:F>`, inline: true },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            tempmuteDatabase.delete(user.id);
            await interaction.reply({ content: `❌ Geçici susturma başarısız: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'unmute') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı!', ephemeral: true });

        if (!member.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ Bu kullanıcı zaten susturulmuş değil!', ephemeral: true });
        }

        tempmuteDatabase.delete(user.id);
        const caseId = addModCase('UNMUTE', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('unmute', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.remove(muteRole, `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `🔊 Susturma Kaldırıldı | Vaka #${caseId}`,
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false },
                    { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Unmute işlemi başarısız: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'warn') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        const warnCount = addWarning(user.id, reason, interaction.user.id);
        const caseId = addModCase('WARN', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('warn', interaction.guild.name, interaction.user.tag, reason,
            `Bu sizin **${warnCount}. uyarınız**.\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        const embed = buildModEmbed(
            `⚠️ Kullanıcı Uyarıldı | Vaka #${caseId}`,
            '#FFFF00',
            [
                { name: '👤 Kullanıcı', value: `${user.tag}\n(${user.id})`, inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                { name: '🔢 Toplam Uyarı', value: `${warnCount}`, inline: true },
                { name: '📋 Sebep', value: reason, inline: false },
                { name: '📩 DM Durumu', value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi', inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

    if (commandName === 'warnlist') {
        const user = interaction.options.getUser('kullanici');
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** adlı kullanıcının hiç uyarısı yok.`, ephemeral: true });
        }

        const warnFields = warns.slice(0, 25).map((w, i) => ({
            name: `⚠️ Uyarı #${i + 1} — ${new Date(w.timestamp).toLocaleDateString('tr-TR')}`,
            value: `**Sebep:** ${w.reason}\n**Yetkili ID:** ${w.moderatorId}`,
            inline: false
        }));

        const embed = new EmbedBuilder()
            .setColor('#FFFF00')
            .setTitle(`⚠️ Uyarı Listesi — ${user.tag}`)
            .setDescription(`Toplam **${warns.length}** uyarı`)
            .addFields(warnFields)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (commandName === 'warnremove') {
        const user = interaction.options.getUser('kullanici');
        const index = interaction.options.getInteger('index') - 1;
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `❌ **${user.tag}** adlı kullanıcının uyarısı yok.`, ephemeral: true });
        }

        if (index < 0 || index >= warns.length) {
            return interaction.reply({ content: `❌ Geçersiz uyarı numarası! (1 ile ${warns.length} arasında olmalı)`, ephemeral: true });
        }

        const removedWarn = warns[index];
        removeWarning(user.id, index);

        const embed = buildModEmbed(
            '🗑️ Uyarı Kaldırıldı',
            '#00BFFF',
            [
                { name: '👤 Kullanıcı', value: `${user.tag}`, inline: true },
                { name: '👮 Kaldıran', value: interaction.user.tag, inline: true },
                { name: '📋 Kaldırılan Uyarı', value: removedWarn.reason, inline: false },
                { name: '🔢 Kalan Uyarı', value: `${getUserWarnings(user.id).length}`, inline: true }
            ]
        );
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'modlog') {
        const user = interaction.options.getUser('kullanici');
        const userCases = [...modlogDatabase.values()].filter(c => c.userId === user.id);

        if (userCases.length === 0) {
            return interaction.reply({ content: `✅ **${user.tag}** adlı kullanıcının moderasyon geçmişi temiz.`, ephemeral: true });
        }

        const typeEmoji = { BAN: '🔨', TEMPBAN: '⏳', UNBAN: '✅', KICK: '👢', MUTE: '🔇', TEMPMUTE: '⏰', UNMUTE: '🔊', WARN: '⚠️' };
        const fields = userCases.slice(-10).map(c => ({
            name: `${typeEmoji[c.type] || '📋'} [#${c.caseId}] ${c.type} — ${new Date(c.timestamp).toLocaleDateString('tr-TR')}`,
            value: `**Sebep:** ${c.reason}\n**Yetkili ID:** ${c.moderatorId}`,
            inline: false
        }));

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`📋 Moderasyon Geçmişi — ${user.tag}`)
            .setDescription(`Son ${Math.min(userCases.length, 10)} kayıt (toplam: ${userCases.length})`)
            .addFields(fields)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
    }

    if (commandName === 'clear') {
        const sayi = interaction.options.getInteger('sayi');
        const targetUser = interaction.options.getUser('kullanici');

        if (sayi < 1 || sayi > 100) {
            return interaction.reply({ content: '❌ Silinecek mesaj sayısı 1-100 arasında olmalıdır!', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: sayi });
            if (targetUser) {
                messages = messages.filter(m => m.author.id === targetUser.id);
            }
            const deleted = await interaction.channel.bulkDelete(messages, true);
            await interaction.editReply(`✅ **${deleted.size}** mesaj başarıyla silindi.`);

            const logEmbed = buildModEmbed(
                '🗑️ Toplu Mesaj Silme',
                '#FF6600',
                [
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📝 Kanal', value: `<#${interaction.channelId}>`, inline: true },
                    { name: '🔢 Silinen Mesaj', value: `${deleted.size}`, inline: true },
                    { name: '👤 Hedef Kullanıcı', value: targetUser ? targetUser.tag : 'Hepsi', inline: true }
                ]
            );
            await sendLog(client, logEmbed);
        } catch (error) {
            await interaction.editReply(`❌ Mesajlar silinirken hata: ${error.message}`);
        }
        return;
    }

    if (commandName === 'slowmode') {
        const saniye = interaction.options.getInteger('saniye');
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        if (saniye < 0 || saniye > 21600) {
            return interaction.reply({ content: '❌ Yavaş mod süresi 0-21600 saniye arasında olmalıdır!', ephemeral: true });
        }

        try {
            await kanal.setRateLimitPerUser(saniye, `Slowmode ayarlandı | Yetkili: ${interaction.user.tag}`);
            await interaction.reply({
                content: saniye === 0
                    ? `✅ <#${kanal.id}> kanalında yavaş mod kapatıldı.`
                    : `✅ <#${kanal.id}> kanalında yavaş mod **${saniye} saniye** olarak ayarlandı.`
            });
        } catch (error) {
            await interaction.reply({ content: `❌ Slowmode ayarlanamadı: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'lock') {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        try {
            await kanal.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
            const embed = buildModEmbed(
                '🔒 Kanal Kilitlendi',
                '#FF0000',
                [
                    { name: '📝 Kanal', value: `<#${kanal.id}>`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '📋 Sebep', value: reason, inline: false }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await kanal.send({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Kanal kilitlenemedi: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'unlock') {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        try {
            await kanal.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
            const embed = buildModEmbed(
                '🔓 Kanal Kilidi Açıldı',
                '#00FF00',
                [
                    { name: '📝 Kanal', value: `<#${kanal.id}>`, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true }
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await kanal.send({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Kilit açılamadı: ${error.message}`, ephemeral: true });
        }
        return;
    }

    // ============================================================
    //  ROBLOX RÜTBE SİSTEMİ KOMUTLARI
    // ============================================================

    if (commandName === 'terfi' || commandName === 'tenzil' || commandName === 'rutbedegistir') {
        await interaction.deferReply();

        // Cookie kontrolü
        if (!ROBLOX_COOKIE) {
            return interaction.editReply('❌ ROBLOX_COOKIE environment variable ayarlanmamış! Render\'da ekleyin.');
        }

        const username = interaction.options.getString('roblox_adi');
        const robloxUser = await getRobloxUser(username);

        if (!robloxUser) {
            return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);
        }

        const currentRankData = await getUserRankInGroup(robloxUser.id);
        if (currentRankData.rank === 0) {
            return interaction.editReply(`❌ **${robloxUser.name}** isimli kullanıcı emniyet grubumuzda bulunmuyor!`);
        }

        const currentIndex = rankList.findIndex(r => r.id === currentRankData.rank);
        let newRankObj;

        try {
            if (commandName === 'terfi') {
                if (currentIndex === -1 || currentIndex >= rankList.length - 1) {
                    return interaction.editReply(`❌ Kullanıcı zaten en yüksek rütbede veya rütbesi sistemde tanımlı değil.`);
                }
                newRankObj = rankList[currentIndex + 1];
            } else if (commandName === 'tenzil') {
                if (currentIndex <= 0) {
                    return interaction.editReply(`❌ Kullanıcı daha fazla rütbe düşürülemez (en alt rütbede).`);
                }
                newRankObj = rankList[currentIndex - 1];
            } else if (commandName === 'rutbedegistir') {
                const requestedId = interaction.options.getInteger('rutbe_id');
                newRankObj = rankList.find(r => r.id === requestedId);
                if (!newRankObj) {
                    return interaction.editReply(`❌ Geçersiz rütbe ID'si seçildi.`);
                }
            }

            const oldRankObj = rankList.find(r => r.id === currentRankData.rank) || { name: currentRankData.name };
            await setRobloxRank(robloxUser.id, newRankObj.id);

            const isTenzil = commandName === 'tenzil' || (commandName === 'rutbedegistir' && newRankObj.id < currentRankData.rank);
            const actionText = commandName === 'terfi' ? 'Terfi' : commandName === 'tenzil' ? 'Tenzil' : 'Rütbe Değişikliği';

            const embed = buildModEmbed(
                `👮 ${actionText} Başarılı`,
                isTenzil ? '#FF0000' : '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: robloxUser.name, inline: true },
                    { name: '📊 Eski Rütbe', value: oldRankObj.name, inline: true },
                    { name: '🆙 Yeni Rütbe', value: newRankObj.name, inline: true },
                    { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                    { name: '🆔 Roblox ID', value: String(robloxUser.id), inline: true }
                ]
            );

            await interaction.editReply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.editReply(`❌ Rütbe değiştirilirken hata oluştu: ${error.message}`);
            console.error('[RÜTBE HATA]', error);
        }
        return;
    }

    if (commandName === 'rutbebak') {
        await interaction.deferReply();

        const username = interaction.options.getString('roblox_adi');
        const robloxUser = await getRobloxUser(username);

        if (!robloxUser) {
            return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);
        }

        const rankData = await getUserRankInGroup(robloxUser.id);

        if (rankData.rank === 0) {
            return interaction.editReply(`❌ **${robloxUser.name}** emniyet grubumuzda bulunmuyor.`);
        }

        const rankObj = rankList.find(r => r.id === rankData.rank);
        const rankIndex = rankList.findIndex(r => r.id === rankData.rank);
        const nextRank = rankIndex !== -1 && rankIndex < rankList.length - 1 ? rankList[rankIndex + 1] : null;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`👮 Rütbe Bilgisi — ${robloxUser.name}`)
            .addFields(
                { name: '🏅 Mevcut Rütbe', value: rankObj ? rankObj.name : rankData.name, inline: true },
                { name: '🔢 Rütbe ID', value: String(rankData.rank), inline: true },
                { name: '📊 Sıralama', value: rankIndex !== -1 ? `${rankIndex + 1}/${rankList.length}` : 'Bilinmiyor', inline: true },
                { name: '⬆️ Sonraki Rütbe', value: nextRank ? nextRank.name : '🏆 En Yüksek Rütbe', inline: true },
                { name: '🆔 Roblox ID', value: String(robloxUser.id), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (commandName === 'rutbelist') {
        const chunkSize = 14;
        const embeds = [];

        for (let i = 0; i < rankList.length; i += chunkSize) {
            const chunk = rankList.slice(i, i + chunkSize);
            const embed = new EmbedBuilder()
                .setColor('#0099FF')
                .setTitle(i === 0 ? '📋 Tüm Rütbe Listesi' : '📋 Rütbe Listesi (devam)')
                .setDescription(chunk.map(r => `\`ID: ${String(r.id).padStart(2)}\` — **${r.name}**`).join('\n'))
                .setFooter({ text: `Bursa Emniyet Müdürlüğü | ${rankList.length} rütbe` });
            embeds.push(embed);
        }

        await interaction.reply({ embeds: embeds.slice(0, 10) });
        return;
    }

    // ============================================================
    //  BİLGİ KOMUTLARI
    // ============================================================

    if (commandName === 'kullanici') {
        const target = interaction.options.getUser('kullanici') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`👤 Kullanıcı Bilgisi — ${target.tag}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 Kullanıcı ID', value: target.id, inline: true },
                { name: '📅 Hesap Oluşturma', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '🤖 Bot mu?', value: target.bot ? 'Evet' : 'Hayır', inline: true }
            );

        if (member) {
            embed.addFields(
                { name: '📅 Sunucuya Katılım', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`, inline: true },
                { name: '🏷️ Nickname', value: member.nickname || 'Yok', inline: true },
                { name: '🎭 Roller', value: member.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => `<@&${r.id}>`).join(', ') || 'Yok', inline: false }
            );
        }

        embed.setTimestamp().setFooter({ text: 'Bursa Emniyet Müdürlüğü' });
        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'sunucu') {
        const guild = interaction.guild;
        await guild.members.fetch();
        const botCount = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`🏰 Sunucu Bilgisi — ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '🆔 Sunucu ID', value: guild.id, inline: true },
                { name: '👑 Sahip', value: `<@${guild.ownerId}>`, inline: true },
                { name: '📅 Oluşturulma', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '👥 Toplam Üye', value: String(guild.memberCount), inline: true },
                { name: '🧑 Kullanıcı', value: String(humanCount), inline: true },
                { name: '🤖 Bot', value: String(botCount), inline: true },
                { name: '💬 Kanal', value: String(guild.channels.cache.size), inline: true },
                { name: '🎭 Rol', value: String(guild.roles.cache.size), inline: true },
                { name: '🌟 Boost', value: `${guild.premiumSubscriptionCount || 0} (Tier ${guild.premiumTier})`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'bot') {
        const uptime = process.uptime();
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('🤖 Bot Bilgisi')
            .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🏷️ Bot Adı', value: client.user.tag, inline: true },
                { name: '🆔 Bot ID', value: client.user.id, inline: true },
                { name: '🌐 Sunucu Sayısı', value: String(client.guilds.cache.size), inline: true },
                { name: '⏱️ Uptime', value: `${days}g ${hours}s ${minutes}d ${seconds}sn`, inline: true },
                { name: '📡 Ping', value: `${client.ws.ping}ms`, inline: true },
                { name: '💾 Bellek', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true },
                { name: '📦 Node.js', value: process.version, inline: true },
                { name: '📚 discord.js', value: require('discord.js').version, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü Sistemleri' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'ping') {
        const sent = await interaction.reply({ content: '📡 Ölçülüyor...', fetchReply: true });
        const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;

        const embed = new EmbedBuilder()
            .setColor(client.ws.ping < 100 ? '#00FF00' : client.ws.ping < 200 ? '#FFFF00' : '#FF0000')
            .setTitle('📡 Gecikme Sonuçları')
            .addFields(
                { name: '💓 API Ping (WebSocket)', value: `${client.ws.ping}ms`, inline: true },
                { name: '🔄 Roundtrip', value: `${roundtrip}ms`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await interaction.editReply({ content: null, embeds: [embed] });
        return;
    }

    if (commandName === 'avatar') {
        const target = interaction.options.getUser('kullanici') || interaction.user;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle(`🖼️ Avatar — ${target.tag}`)
            .setImage(target.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setDescription(`[PNG](${target.displayAvatarURL({ format: 'png', size: 1024 })}) | [JPG](${target.displayAvatarURL({ format: 'jpg', size: 1024 })}) | [WEBP](${target.displayAvatarURL({ format: 'webp', size: 1024 })})`)
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    // ============================================================
    //  DUYURU & MESAJLAMA KOMUTLARI
    // ============================================================

    if (commandName === 'duyuru') {
        const kanal = interaction.options.getChannel('kanal');
        const baslik = interaction.options.getString('baslik');
        const icerik = interaction.options.getString('icerik');
        const renkStr = interaction.options.getString('renk') || '#0099FF';

        let renk;
        try {
            renk = renkStr.startsWith('#') ? renkStr : `#${renkStr}`;
        } catch {
            renk = '#0099FF';
        }

        const embed = new EmbedBuilder()
            .setColor(renk)
            .setTitle(`📢 ${baslik}`)
            .setDescription(icerik)
            .setTimestamp()
            .setFooter({ text: `Duyuru | ${interaction.guild.name}`, iconURL: interaction.guild.iconURL() });

        try {
            await kanal.send({ embeds: [embed] });
            await interaction.reply({ content: `✅ Duyuru <#${kanal.id}> kanalına başarıyla gönderildi!`, ephemeral: true });
            const logEmbed = buildModEmbed(
                '📢 Duyuru Gönderildi',
                '#0099FF',
                [
                    { name: '👮 Gönderen', value: interaction.user.tag, inline: true },
                    { name: '📝 Kanal', value: `<#${kanal.id}>`, inline: true },
                    { name: '🏷️ Başlık', value: baslik, inline: false }
                ]
            );
            await sendLog(client, logEmbed);
        } catch (error) {
            await interaction.reply({ content: `❌ Duyuru gönderilemedi: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'dm') {
        const user = interaction.options.getUser('kullanici');
        const mesaj = interaction.options.getString('mesaj');

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📩 Yetkili Mesajı')
            .setDescription(mesaj)
            .addFields({ name: '👮 Gönderen Yetkili', value: interaction.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        const sent = await sendDM(user, embed);
        if (sent) {
            await interaction.reply({ content: `✅ **${user.tag}** kullanıcısına DM başarıyla gönderildi.`, ephemeral: true });
        } else {
            await interaction.reply({ content: `❌ **${user.tag}** kullanıcısına DM gönderilemedi (DM kapalı olabilir).`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'toplu-dm') {
        const rol = interaction.options.getRole('rol');
        const mesaj = interaction.options.getString('mesaj');

        await interaction.deferReply({ ephemeral: true });
        await interaction.guild.members.fetch();

        const members = interaction.guild.members.cache.filter(m =>
            m.roles.cache.has(rol.id) && !m.user.bot
        );

        if (members.size === 0) {
            return interaction.editReply(`❌ **${rol.name}** rolüne sahip kullanıcı bulunamadı.`);
        }

        let success = 0, fail = 0;

        const embed = new EmbedBuilder()
            .setColor('#0099FF')
            .setTitle('📢 Toplu Duyuru')
            .setDescription(mesaj)
            .addFields({ name: '👮 Gönderen', value: interaction.user.tag, inline: true })
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        for (const [, member] of members) {
            const sent = await sendDM(member.user, embed);
            if (sent) success++; else fail++;
            // Rate limit için küçük bekleme
            await new Promise(r => setTimeout(r, 100));
        }

        await interaction.editReply(
            `📊 Toplu DM sonucu:\n✅ Başarılı: **${success}**\n❌ Başarısız: **${fail}**\nToplam: **${members.size}**`
        );
        return;
    }

    // ============================================================
    //  ROL YÖNETİMİ KOMUTLARI
    // ============================================================

    if (commandName === 'rol-ver') {
        const user = interaction.options.getUser('kullanici');
        const rol = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });
        if (member.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `❌ **${user.tag}** zaten **${rol.name}** rolüne sahip!`, ephemeral: true });
        }

        try {
            await member.roles.add(rol, `Rol verildi | Yetkili: ${interaction.user.tag}`);
            const dmEmbed = buildDMEmbed('note', interaction.guild.name, interaction.user.tag, `**${rol.name}** rolü verildi.`);
            await sendDM(user, dmEmbed);
            await interaction.reply(`✅ **${user.tag}** kullanıcısına **${rol.name}** rolü verildi.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Rol verilemedi: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'rol-al') {
        const user = interaction.options.getUser('kullanici');
        const rol = interaction.options.getRole('rol');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });
        if (!member.roles.cache.has(rol.id)) {
            return interaction.reply({ content: `❌ **${user.tag}** zaten **${rol.name}** rolüne sahip değil!`, ephemeral: true });
        }

        try {
            await member.roles.remove(rol, `Rol alındı | Yetkili: ${interaction.user.tag}`);
            const dmEmbed = buildDMEmbed('note', interaction.guild.name, interaction.user.tag, `**${rol.name}** rolü alındı.`);
            await sendDM(user, dmEmbed);
            await interaction.reply(`✅ **${user.tag}** kullanıcısından **${rol.name}** rolü alındı.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Rol alınamadı: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'rol-bilgi') {
        const rol = interaction.options.getRole('rol');
        await interaction.guild.members.fetch();
        const memberCount = interaction.guild.members.cache.filter(m => m.roles.cache.has(rol.id)).size;

        const embed = new EmbedBuilder()
            .setColor(rol.color || '#0099FF')
            .setTitle(`🎭 Rol Bilgisi — ${rol.name}`)
            .addFields(
                { name: '🆔 Rol ID', value: rol.id, inline: true },
                { name: '🎨 Renk', value: rol.hexColor, inline: true },
                { name: '👥 Üye Sayısı', value: String(memberCount), inline: true },
                { name: '📊 Pozisyon', value: String(rol.position), inline: true },
                { name: '🔞 Gösterilebilir', value: rol.hoist ? 'Evet' : 'Hayır', inline: true },
                { name: '🏷️ Bahsedilebilir', value: rol.mentionable ? 'Evet' : 'Hayır', inline: true },
                { name: '📅 Oluşturulma', value: `<t:${Math.floor(rol.createdTimestamp / 1000)}:F>`, inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await interaction.reply({ embeds: [embed] });
        return;
    }

    if (commandName === 'nick') {
        const user = interaction.options.getUser('kullanici');
        const yeniNick = interaction.options.getString('yeni_nick') || null;
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        try {
            await member.setNickname(yeniNick, `Nick değiştirildi | Yetkili: ${interaction.user.tag}`);
            await interaction.reply(`✅ **${user.tag}** kullanıcısının nickname'i **${yeniNick || 'sıfırlandı'}** olarak güncellendi.`);
        } catch (error) {
            await interaction.reply({ content: `❌ Nickname değiştirilemedi: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'anket') {
        const soru = interaction.options.getString('soru');
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('📊 Anket')
            .setDescription(`**${soru}**`)
            .addFields(
                { name: '✅ Evet', value: 'Aşağıya oy vermek için butona basın', inline: true },
                { name: '❌ Hayır', value: 'Aşağıya oy vermek için butona basın', inline: true }
            )
            .setFooter({ text: `Anketi açan: ${interaction.user.tag}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('poll_yes').setLabel('✅ Evet').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('poll_no').setLabel('❌ Hayır').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('poll_results').setLabel('📊 Sonuçlar').setStyle(ButtonStyle.Secondary)
        );

        try {
            await kanal.send({ embeds: [embed], components: [row] });
            await interaction.reply({ content: `✅ Anket <#${kanal.id}> kanalına gönderildi!`, ephemeral: true });
        } catch (error) {
            await interaction.reply({ content: `❌ Anket gönderilemedi: ${error.message}`, ephemeral: true });
        }
        return;
    }

    if (commandName === 'hepsini-ban') {
        const idListStr = interaction.options.getString('id_listesi');
        const reason = interaction.options.getString('sebep');

        const idList = idListStr.split(',').map(id => id.trim()).filter(id => /^\d{17,20}$/.test(id));

        if (idList.length === 0) {
            return interaction.reply({ content: '❌ Geçerli kullanıcı ID\'si bulunamadı! ID\'leri virgülle ayırın.', ephemeral: true });
        }

        if (idList.length > 50) {
            return interaction.reply({ content: '❌ Tek seferde en fazla 50 kullanıcı banlanabilir!', ephemeral: true });
        }

        await interaction.deferReply();
        let success = 0, fail = 0, alreadyBanned = 0;

        for (const userId of idList) {
            try {
                const alreadyBannedCheck = await interaction.guild.bans.fetch(userId).catch(() => null);
                if (alreadyBannedCheck) { alreadyBanned++; continue; }

                await interaction.guild.bans.create(userId, {
                    reason: `[TOPLU BAN] ${reason} | Yetkili: ${interaction.user.tag}`,
                    deleteMessageDays: 1
                });
                addModCase('BAN', userId, interaction.user.id, `[TOPLU BAN] ${reason}`);

                const user = await client.users.fetch(userId).catch(() => null);
                if (user) {
                    const dmEmbed = buildDMEmbed('ban', interaction.guild.name, interaction.user.tag, reason);
                    await sendDM(user, dmEmbed);
                }
                success++;
            } catch { fail++; }
            await new Promise(r => setTimeout(r, 200));
        }

        const embed = buildModEmbed(
            '🔨 Toplu Ban Tamamlandı',
            '#FF0000',
            [
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
                { name: '📋 Sebep', value: reason, inline: false },
                { name: '✅ Başarılı', value: String(success), inline: true },
                { name: '❌ Başarısız', value: String(fail), inline: true },
                { name: '⚠️ Zaten Banlı', value: String(alreadyBanned), inline: true },
                { name: '🔢 Toplam', value: String(idList.length), inline: true }
            ]
        );
        await interaction.editReply({ embeds: [embed] });
        await sendLog(client, embed);
        return;
    }

});

// ============================================================
//  BUTON ETKİLEŞİM HANDLER'I
// ============================================================
const pollVotes = new Map(); // messageId -> { yes: Set, no: Set }

async function handleButtonInteraction(interaction) {
    const { customId, message } = interaction;

    if (customId === 'poll_yes' || customId === 'poll_no' || customId === 'poll_results') {
        if (!pollVotes.has(message.id)) {
            pollVotes.set(message.id, { yes: new Set(), no: new Set() });
        }
        const votes = pollVotes.get(message.id);

        if (customId === 'poll_yes') {
            if (votes.yes.has(interaction.user.id)) {
                votes.yes.delete(interaction.user.id);
                return interaction.reply({ content: '✅ Evet oyunuz geri alındı.', ephemeral: true });
            }
            votes.no.delete(interaction.user.id);
            votes.yes.add(interaction.user.id);
            return interaction.reply({ content: '✅ Evet oyu kaydedildi!', ephemeral: true });
        }

        if (customId === 'poll_no') {
            if (votes.no.has(interaction.user.id)) {
                votes.no.delete(interaction.user.id);
                return interaction.reply({ content: '❌ Hayır oyunuz geri alındı.', ephemeral: true });
            }
            votes.yes.delete(interaction.user.id);
            votes.no.add(interaction.user.id);
            return interaction.reply({ content: '❌ Hayır oyu kaydedildi!', ephemeral: true });
        }

        if (customId === 'poll_results') {
            const total = votes.yes.size + votes.no.size;
            const yesPercent = total > 0 ? Math.round((votes.yes.size / total) * 100) : 0;
            const noPercent = total > 0 ? Math.round((votes.no.size / total) * 100) : 0;
            const yesBar = '█'.repeat(Math.round(yesPercent / 10)) + '░'.repeat(10 - Math.round(yesPercent / 10));
            const noBar = '█'.repeat(Math.round(noPercent / 10)) + '░'.repeat(10 - Math.round(noPercent / 10));

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('📊 Anket Sonuçları')
                        .addFields(
                            { name: `✅ Evet — ${votes.yes.size} oy (${yesPercent}%)`, value: `\`${yesBar}\``, inline: false },
                            { name: `❌ Hayır — ${votes.no.size} oy (${noPercent}%)`, value: `\`${noBar}\``, inline: false },
                            { name: '🔢 Toplam Oy', value: String(total), inline: true }
                        )
                        .setTimestamp()
                ],
                ephemeral: true
            });
        }
    }
}

// ============================================================
//  GuildMemberAdd — Sunucuya katılınca mesaj
// ============================================================
client.on('guildMemberAdd', async member => {
    if (!config.WELCOME_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(config.WELCOME_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('👋 Yeni Üye!')
            .setDescription(`**${member.user.tag}** sunucumuza katıldı!\n${member.guild.name} ailesine hoş geldin! 🎉`)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🆔 Kullanıcı ID', value: member.user.id, inline: true },
                { name: '📅 Hesap Yaşı', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: '👥 Toplam Üye', value: String(member.guild.memberCount), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await channel.send({ embeds: [embed] });
    } catch { /* welcome kanalı yoksa sessizce geç */ }
});

// ============================================================
//  GuildMemberRemove — Sunucudan ayrılınca
// ============================================================
client.on('guildMemberRemove', async member => {
    if (!config.LOG_CHANNEL_ID) return;
    try {
        const embed = new EmbedBuilder()
            .setColor('#FF6600')
            .setTitle('👋 Üye Ayrıldı')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${member.user.tag}\n(${member.user.id})`, inline: true },
                { name: '📅 Katılım', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Bilinmiyor', inline: true },
                { name: '👥 Kalan Üye', value: String(member.guild.memberCount), inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Bursa Emniyet Müdürlüğü' });

        await sendLog(client, embed);
    } catch { }
});

// ============================================================
//  HATA YÖNETİMİ
// ============================================================
client.on('error', error => {
    console.error('[❌ CLIENT ERROR]', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[⚠️ UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', error => {
    console.error('[💥 UNCAUGHT EXCEPTION]', error);
});

// ============================================================
//  BAŞLATMA
// ============================================================
const PORT = process.env.PORT || config.PORT;
startApi(PORT);
client.login(TOKEN);
