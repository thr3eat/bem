const { Events } = require('discord.js');
const { rankList, ROBLOX_COOKIE, config } = require('../modules/constants');
const { getGroupRoles } = require('../modules/robloxApi');
const { checkExpiredPunishments } = require('../modules/moderationUtils');
const scheduler = require('../modules/scheduler');
const { deployCommands } = require('../modules/commandDeployer');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`[🤖] ${client.user.tag} olarak giriş yapıldı!`);
        console.log(`[📊] ${client.guilds.cache.size} sunucuda aktif.`);
        console.log(`[📋] ${rankList.length} rütbe yüklendi.`);
        
        // Komutları otomatik kaydet
        await deployCommands();
        
        client.user.setActivity('Sentura 🦸 ekoyildiz | /yardim', { type: 4 });

        // Başlangıçta grup rollerini önbelleğe al
        if (ROBLOX_COOKIE) {
            await getGroupRoles();
        }

        // Ses sistemini başlat
        setTimeout(() => {
            client.voiceManager.connect();
            scheduler.addTask('voice-connection-check', () => client.voiceManager.checkConnection(), client.voiceManager.SES_YENILE_MS);
        }, 5000);

        // Geçici ban/mute kontrolü - her dakika çalışır
        scheduler.addTask('punishment-expiry-check', () => checkExpiredPunishments(client, config), 60000);

        // Kayıt karşılama mesajını kontrol et
        const { kayitKarsilamaMesajiniGonder } = require('../modules/kayitUtils');
        setTimeout(() => kayitKarsilamaMesajiniGonder(client), 3000);

        // Başlangıçta eksik abone rollerini tamamlama kontrolü
        const { ekoAbonerDatabase, EKO_GUILD_ID, EKO_ROL_ID } = require('../modules/ekoUtils');
        setTimeout(async () => {
            try {
                const guild = client.guilds.cache.get(EKO_GUILD_ID);
                if (guild) {
                    console.log('[⭐ EKO] Başlangıçta abone rolleri kontrol ediliyor...');
                    const subscribers = ekoAbonerDatabase.all();
                    const rol = guild.roles.cache.get(EKO_ROL_ID);
                    if (rol) {
                        await guild.members.fetch();
                        let eklenenSayi = 0;
                        for (const userId in subscribers) {
                            const member = guild.members.cache.get(userId);
                            if (member && !member.roles.cache.has(EKO_ROL_ID)) {
                                console.log(`[⭐ EKO] ${member.user.tag} (${userId}) veritabanında abone olarak kayıtlı fakat rolü eksik. Rol tanımlanıyor...`);
                                await member.roles.add(rol, 'Başlangıçta eksik abone rolünü tamamlama (otomasyon)').catch(err => {
                                    console.error(`[EKO] Rol tanımlama hatası (${member.user.tag}):`, err.message);
                                });
                                eklenenSayi++;
                            }
                        }
                        if (eklenenSayi > 0) {
                            console.log(`[⭐ EKO] Toplam ${eklenenSayi} üyeye eksik olan abone rolü başarıyla tanımlandı.`);
                        } else {
                            console.log('[⭐ EKO] Eksik abone rolü olan üye bulunmadı.');
                        }
                    } else {
                        console.warn('[⚠️ EKO] Eko Abone Rolü bulunamadı, kontrol atlanıyor.');
                    }
                } else {
                    console.warn('[⚠️ EKO] Eko Sunucusu bulunamadı, kontrol atlanıyor.');
                }
            } catch (err) {
                console.error('[❌ EKO] Başlangıç abone rol kontrolü sırasında hata oluşti:', err);
            }
        }, 8000);
    },
};
