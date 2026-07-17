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
                const { EKO_ONAY_KANAL_ID, KAYIT_GRUP_ID } = require('../modules/constants');
                
                const now = Date.now();
                const checks = robloxChecksDb.all();
                
                for (const userId in checks) {
                    const entry = checks[userId];
                    if (entry.status === 'pending' && entry.checkAt <= now) {
                        const onayKanal = await cl.channels.fetch(EKO_ONAY_KANAL_ID).catch(() => null);
                        if (onayKanal) {
                            const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
                            
                            const formattedDate = `<t:${Math.floor(entry.registeredAt / 1000)}:f>`;
                            const checkEmbed = new EmbedBuilder()
                                .setColor('#0099FF')
                                .setTitle('🤖 Roblox Grup Katılım Kontrolü')
                                .setDescription(`<@${entry.discordUserId}> adlı kullanıcı **${formattedDate}** tarihinde Roblox grubuna katılmış ve rolü verilmiştir.\n\nHala grupta mı?`)
                                .addFields(
                                    { name: '👤 Roblox Adı', value: entry.robloxUsername, inline: true },
                                    { name: '🆔 Roblox ID', value: String(entry.robloxUserId), inline: true },
                                    { name: '🔗 Grup Linki', value: `[Gruba Git](https://www.roblox.com/communities/${KAYIT_GRUP_ID})`, inline: true }
                                )
                                .setTimestamp();
                                
                            const row = new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`roblox_still_in_group_${entry.discordUserId}`)
                                    .setLabel('EVET HALA GRUPTA')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('✅'),
                                new ButtonBuilder()
                                    .setCustomId(`roblox_not_in_group_${entry.discordUserId}_${entry.robloxUserId}`)
                                    .setLabel('HAYIR HALA GRUPTA DEĞİL')
                                    .setStyle(ButtonStyle.Danger)
                                    .setEmoji('❌')
                            );
                            
                            await onayKanal.send({ content: `🔔 **Roblox Grup Kontrolü:** <@${entry.discordUserId}>`, embeds: [checkEmbed], components: [row] });
                            
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

        // Kayıt ve Eko Yıldız karşılama mesajlarını kontrol et
        const { kayitKarsilamaMesajiniGonder } = require('../modules/kayitUtils');
        const { ekoKarsilamaMesajiniGonder, ekoAbonerDatabase, EKO_GUILD_ID, EKO_ROL_ID } = require('../modules/ekoUtils');
        setTimeout(() => kayitKarsilamaMesajiniGonder(client), 3000);
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
    },
};
