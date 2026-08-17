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

        // Geçici ban/mute kontrolü - her dakika çalışır
        scheduler.addTask('punishment-expiry-check', () => checkExpiredPunishments(client, config), 60000);

        // Haftalık Moderatör Liderlik Raporu kontrolü - her saat başı çalışır (7 gün tamamlandığında otomatik kanala atar)
        const { publishWeeklyReport } = require('../modules/modStatsUtils');
        scheduler.addTask('weekly-mod-stats-report', () => publishWeeklyReport(client), 3600000);

        // Roblox grup kontrolü - her dakika çalışır (Otomatik Canlı Kontrol & Hata Toleranslı safeSend)
        const checkRobloxGroupStatus = async (cl) => {
            try {
                const JsonDatabase = require('../modules/jsonDatabase');
                const robloxChecksDb = new JsonDatabase('robloxChecks.json');
                const { EKO_ONAY_KANAL_ID, KAYIT_GRUP_ID, KAYIT_DISCORD_ROL_ID } = require('../modules/constants');
                const { getUserRankInGroup } = require('../modules/robloxApi');
                const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
                
                const now = Date.now();
                const checks = robloxChecksDb.all();
                
                for (const userId in checks) {
                    const entry = checks[userId];
                    if (entry.status === 'pending' && entry.checkAt <= now) {
                        const onayKanal = await cl.channels.fetch(EKO_ONAY_KANAL_ID).catch(() => null);
                        if (onayKanal) {
                            const ComponentsV2Factory = require('../modules/componentsV2Factory');
                            
                            // 1️⃣ Otomatik Canlı Roblox Üyelik Kontrolü
                            let liveGroupStatusText = '🔍 Canlı üyelik kontrol ediliyor...';
                            try {
                                const rankData = await getUserRankInGroup(entry.robloxUserId, KAYIT_GRUP_ID);
                                if (rankData && rankData.rank > 0) {
                                    liveGroupStatusText = `🟢 **Roblox Canlı Durum:** Grupta Üye (\`${rankData.name}\` - Rank: ${rankData.rank})`;
                                } else {
                                    liveGroupStatusText = `🔴 **Roblox Canlı Durum:** Gruptan Ayrılmış! (Rank: 0)`;
                                }
                            } catch (apiErr) {
                                liveGroupStatusText = `⚠️ **Roblox Canlı Durum:** API Sorgulanamadı (${apiErr.message})`;
                            }

                            // 2️⃣ Primary V2 Payload
                            const v2Payload = ComponentsV2Factory.buildRobloxGroupCheckV2({
                                discordUserId: entry.discordUserId,
                                robloxUsername: entry.robloxUsername,
                                robloxUserId: entry.robloxUserId,
                                registeredAt: entry.registeredAt,
                                groupId: KAYIT_GRUP_ID,
                                targetRoleId: KAYIT_DISCORD_ROL_ID
                            });
                            v2Payload.content = `🔔 **Roblox Grup Kontrol İncelemesi:** <@${entry.discordUserId}>\n${liveGroupStatusText}`;

                            // 3️⃣ Guaranteed Fallback Embed Payload
                            const regTimeF = `<t:${Math.floor(entry.registeredAt / 1000)}:F>`;
                            const regTimeR = `<t:${Math.floor(entry.registeredAt / 1000)}:R>`;
                            const fallbackEmbed = new EmbedBuilder()
                                .setColor('#5865F2')
                                .setTitle('🤖 Roblox Grup Katılım Kontrolü')
                                .setDescription(
                                    `Kullanıcı <@${entry.discordUserId}> için rutin **Roblox Grup Üyelik Kontrolü** zamanı geldi.\n\n` +
                                    `${liveGroupStatusText}\n\n` +
                                    `👤 **Discord Üyesi:** <@${entry.discordUserId}> (\`${entry.discordUserId}\`)\n` +
                                    `🎮 **Roblox Hesabı:** [${entry.robloxUsername}](https://www.roblox.com/users/${entry.robloxUserId}/profile) (\`ID: ${entry.robloxUserId}\`)\n` +
                                    `🎭 **Hedef Rol:** <@&${KAYIT_DISCORD_ROL_ID}>\n` +
                                    `📅 **Kayıt Tarihi:** ${regTimeF} (${regTimeR})\n` +
                                    `🔗 **Roblox Grubu:** [Gruba Git](https://www.roblox.com/communities/${KAYIT_GRUP_ID})`
                                )
                                .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${entry.robloxUserId}&width=420&height=420&format=png`)
                                .setFooter({ text: 'Sentura Otomatik Hata Toleranslı Grup Kontrolü' })
                                .setTimestamp();

                            const fallbackRow = new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId(`roblox_still_in_group_${entry.discordUserId}`).setLabel('EVET - HALA GRUPTA').setStyle(ButtonStyle.Success).setEmoji('✅'),
                                new ButtonBuilder().setCustomId(`roblox_not_in_group_${entry.discordUserId}_${entry.robloxUserId}`).setLabel('HAYIR - GRUPTAN AYRILMIŞ').setStyle(ButtonStyle.Danger).setEmoji('❌')
                            );

                            const fallbackPayload = {
                                content: `🔔 **Roblox Grup Kontrol İncelemesi:** <@${entry.discordUserId}>`,
                                embeds: [fallbackEmbed],
                                components: [fallbackRow]
                            };

                            // 4️⃣ Otomatik Fixleme & Self-Healing Gönderimi (safeSend)
                            await ComponentsV2Factory.safeSend(onayKanal, v2Payload, fallbackPayload);
                            
                            entry.status = 'sent';
                            entry.lastCheckedAt = now;
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
