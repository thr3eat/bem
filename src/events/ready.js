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

        // Roblox grup kontrolü - her dakika çalışır
        const checkRobloxGroupStatus = async (cl) => {
            try {
                const JsonDatabase = require('../modules/jsonDatabase');
                const robloxChecksDb = new JsonDatabase('robloxChecks.json');
                const { EKO_ONAY_KANAL_ID, KAYIT_GRUP_ID, KAYIT_DISCORD_ROL_ID } = require('../modules/constants');
                
                const now = Date.now();
                const checks = robloxChecksDb.all();
                
                for (const userId in checks) {
                    const entry = checks[userId];
                    if (entry.status === 'pending' && entry.checkAt <= now) {
                        const onayKanal = await cl.channels.fetch(EKO_ONAY_KANAL_ID).catch(() => null);
                        if (onayKanal) {
                            const ComponentsV2Factory = require('../modules/componentsV2Factory');
                            const v2Payload = ComponentsV2Factory.buildRobloxGroupCheckV2({
                                discordUserId: entry.discordUserId,
                                robloxUsername: entry.robloxUsername,
                                robloxUserId: entry.robloxUserId,
                                registeredAt: entry.registeredAt,
                                groupId: KAYIT_GRUP_ID,
                                targetRoleId: KAYIT_DISCORD_ROL_ID
                            });
                            v2Payload.content = `🔔 **Roblox Grup Kontrol İncelemesi:** <@${entry.discordUserId}>`;

                            await onayKanal.send(v2Payload);
                            
                            entry.status = 'sent';
                            robloxChecksDb.set(userId, entry);
                        }
                    }
                }
            } catch (err) {
                console.error('[KONTROL] Roblox grup kontrolü sırasında hata:', err.message);
            }
        };
        scheduler.addTask('roblox-group-status-check', () => checkRobloxGroupStatus(client), 60000);

        // Kayıt ve Eko Yıldız karşılama mesajlarını ve başlangıç kanal taramasını kontrol et
        const { kayitKarsilamaMesajiniGonder, taraveKontrolEtKayitKanali } = require('../modules/kayitUtils');
        const { ekoKarsilamaMesajiniGonder, ekoAbonerDatabase, EKO_GUILD_ID, EKO_ROL_ID } = require('../modules/ekoUtils');
        setTimeout(() => kayitKarsilamaMesajiniGonder(client), 3000);
        setTimeout(() => taraveKontrolEtKayitKanali(client), 4000);
        setTimeout(() => ekoKarsilamaMesajiniGonder(client), 5000);

        // Başlangıçta eksik abone rollerini tamamlama kontrolü
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

        // Ekocan / Ekocancık aile seçim mesajı kontrolü
        const sendEkocanChoiceMessage = async (cl) => {
            try {
                const { EKOCAN_SECIM_KANAL_ID, EKO_GUILD_ID } = require('../modules/constants');
                const guild = await cl.guilds.fetch(EKO_GUILD_ID).catch(() => null);
                if (!guild) return;
                const kanal = await guild.channels.fetch(EKOCAN_SECIM_KANAL_ID).catch(() => null);
                if (!kanal) return;

                const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
                if (mesajlar) {
                    const mevcut = mesajlar.find(m => m.author.id === cl.user.id && m.embeds.some(e => e.title === '📢 KARARINI VER!'));
                    if (mevcut) {
                        console.log('[📌 EKO] Ekocan aile seçim mesajı zaten mevcut.');
                        return;
                    }
                }

                const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor('#FF6600')
                    .setTitle('📢 KARARINI VER!')
                    .setDescription(
                        `⚡ **EKOCAN AİLESİ Mİ?**\n` +
                        `⚡ **EKOCANCIK AİLESİ Mİ?**\n\n` +
                        `Tıklayarak rolü al!`
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ekocan_role_btn')
                        .setLabel('EKOCAN')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔥'),
                    new ButtonBuilder()
                        .setCustomId('ekocancik_role_btn')
                        .setLabel('EKOCANCIK')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('⭐')
                );

                await kanal.send({ embeds: [embed], components: [row] });
                console.log('[📌 EKO] Ekocan aile seçim mesajı gönderildi.');
            } catch (err) {
                console.error('[❌ EKO] Ekocan aile seçim mesajı gönderilemedi:', err.message);
            }
        };
        setTimeout(() => sendEkocanChoiceMessage(client), 10000);
    },
};
