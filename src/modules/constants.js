// ============================================================
//  CONSTANTS & CONFIGURATION
// ============================================================

const configManager = require('./configManager');
const config = configManager.config;
const TOKEN = configManager.get('TOKEN');

// ============================================================
//  ROBLOX SETUP
// ============================================================
const ROBLOX_GROUP_ID = 8505535;
const ROBLOX_COOKIE = (process.env.ROBLOX_COOKIE || '').trim();

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
    { name: "Başkan",                             id: 252 },
    { name: "Cumhurbaşkanı",                      id: 254 },
    { name: "Proje Uygulaması",                   id: 255 }
];

// ============================================================
//  EKO YILDIZ SYSTEM
// ============================================================
const EKO_GUILD_ID      = '1367646464804655104';
const EKO_KANAL_ID      = '1518692517955244133';
const EKO_ROL_ID        = '1518707259633303814';
const EKO_ONAY_KANAL_ID = '1518716530651824199';
const SISTEM_LOG_KANAL_ID = '1527749326707888228';
const EKOCAN_SECIM_KANAL_ID = '1518692466860101915';
const EKO_DM_MESAJ      = "Eko Yıldız'a abone oldunuz! Aramıza hoşgeldiniz";

// ============================================================
//  KAYIT SYSTEM
// ============================================================
const KAYIT_GUILD_ID        = '1367646464804655104';
const KAYIT_KANAL_ID        = '1518909105375547524';
const KAYIT_GRUP_ID         = 35431216;
const KAYIT_RANK_ID         = 2;
const KAYIT_DISCORD_ROL_ID  = '1518909532129067068';
const KAYIT_COOLDOWN_MS = 30 * 1000;

const KAYIT_KARSILAMA_ICERIK = [
    '📌 **Kayıt Nasıl Yapılır?**',
    '',
    '1️⃣  Önce aşağıdaki bağlantıdan gruba katılın:',
    '🔗 https://www.roblox.com/communities/35431216/EkoY-ld-z#!/about',
    '',
    '2️⃣  Gruba katıldıktan sonra **Roblox kullanıcı adınızı** bu kanala yazın.',
    '',
    '3️⃣  Bot sizi otomatik olarak doğrulayacak ve özel rolü verecek! 🎉',
].join('\n');

// ============================================================
//  HOŞGELDIN SYSTEM
// ============================================================
const HG_GUILD_ID   = config.GUILD_ID;
const HG_KANAL_ID   = config.WELCOME_CHANNEL_ID;
const HG_RENK       = '#FFD700';
const HG_ULER_ROL_ID = config.MEMBER_ROLE_ID || null;

const SELAMLAMA_COOLDOWN_MS    = 6000;
const SELAMLAMA_KANALLAR_HEPSI = true;
const SELAMLAMA_KANAL_LISTESI  = [];

// ============================================================
//  YOUTUBE & SOSYAL MEDYA
// ============================================================
const YOUTUBE_ABONE_LINK = 'https://www.youtube.com/@eko8yildiz';
const YOUTUBE_UYE_LINK   = 'https://www.youtube.com/channel/UCNSZYtuDQYsZYYQVJvErDVw/join';

// ============================================================
//  COLOR MAP FOR MODERATION
// ============================================================
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

module.exports = {
    config,
    TOKEN,
    ROBLOX_GROUP_ID,
    ROBLOX_COOKIE,
    rankList,
    EKO_GUILD_ID,
    EKO_KANAL_ID,
    EKO_ROL_ID,
    EKO_ONAY_KANAL_ID,
    SISTEM_LOG_KANAL_ID,
    EKOCAN_SECIM_KANAL_ID,
    EKO_DM_MESAJ,
    KAYIT_GUILD_ID,
    KAYIT_KANAL_ID,
    KAYIT_GRUP_ID,
    KAYIT_RANK_ID,
    KAYIT_DISCORD_ROL_ID,
    KAYIT_COOLDOWN_MS,
    KAYIT_KARSILAMA_ICERIK,
    HG_GUILD_ID,
    HG_KANAL_ID,
    HG_RENK,
    HG_ULER_ROL_ID,
    SELAMLAMA_COOLDOWN_MS,
    SELAMLAMA_KANALLAR_HEPSI,
    SELAMLAMA_KANAL_LISTESI,
    YOUTUBE_ABONE_LINK,
    YOUTUBE_UYE_LINK,
    colorMap,
    iconMap,
    titleMap,
    ROBLOX_API_KEY: config.ROBLOX_API_KEY,
    UNIVERSE_ID: config.UNIVERSE_ID
};
