const { KAYIT_GUILD_ID, KAYIT_KANAL_ID, KAYIT_KARSILAMA_ICERIK } = require('./constants');

let kayitKarsilamaMesajId = null;

async function kayitKarsilamaMesajiniGonder(client) {
    try {
        const guild = await client.guilds.fetch(KAYIT_GUILD_ID).catch(() => null);
        if (!guild) return;
        const kanal = await guild.channels.fetch(KAYIT_KANAL_ID).catch(() => null);
        if (!kanal) return;

        const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
        if (mesajlar) {
            const mevcutMesaj = mesajlar.find(
                m => m.author.id === client.user.id && m.pinned && m.content === KAYIT_KARSILAMA_ICERIK
            );
            if (mevcutMesaj) {
                kayitKarsilamaMesajId = mevcutMesaj.id;
                console.log('[📌 KAYIT] Karşılama mesajı zaten mevcut, izleniyor.');
                return;
            }
        }

        const yeniMesaj = await kanal.send(KAYIT_KARSILAMA_ICERIK);
        kayitKarsilamaMesajId = yeniMesaj.id;

        await yeniMesaj.pin().catch(() => {});
        console.log('[📌 KAYIT] Karşılama mesajı gönderildi ve sabitlendi.');

        // Sistem mesajını sil
        setTimeout(async () => {
            const sonMesajlar = await kanal.messages.fetch({ limit: 5 }).catch(() => null);
            if (sonMesajlar) {
                const sistemMesaji = sonMesajlar.find(m => m.system && m.type === 6);
                if (sistemMesaji) await sistemMesaji.delete().catch(() => {});
            }
        }, 3000);

    } catch (err) {
        console.error('[❌ KAYIT] Karşılama mesajı gönderilemedi:', err.message);
    }
}

async function taraveKontrolEtKayitKanali(client) {
    try {
        const { KAYIT_GUILD_ID, KAYIT_KANAL_ID, KAYIT_GRUP_ID, KAYIT_DISCORD_ROL_ID, SISTEM_LOG_KANAL_ID } = require('./constants');
        const { getRobloxUser, getUserRankInGroup } = require('./robloxApi');
        const JsonDatabase = require('./jsonDatabase');
        const robloxChecksDb = new JsonDatabase('robloxChecks.json');

        const guild = await client.guilds.fetch(KAYIT_GUILD_ID).catch(() => null);
        if (!guild) return;

        const kanal = await guild.channels.fetch(KAYIT_KANAL_ID).catch(() => null);
        if (!kanal) return;

        console.log('[🔄 KAYIT TARAMA] Başlangıçta kayıt kanalı taranıyor ve tüm kullanıcıların rolleri kontrol ediliyor...');

        const mesajlar = await kanal.messages.fetch({ limit: 100 }).catch(() => null);
        if (!mesajlar || mesajlar.size === 0) {
            console.log('[📌 KAYIT TARAMA] Kayıt kanalında taranacak mesaj bulunamadı.');
            return;
        }

        let toplamMesaj = mesajlar.size;
        const islenenKullanicilar = new Set();
        let sunucudaMevcut = 0;
        let zatenRoluOlan = 0;
        let yeniRolVerilen = 0;
        let gruptaOlan = 0;
        let gruptaOlmayan = 0;

        await guild.members.fetch().catch(() => {});

        for (const [id, msg] of mesajlar) {
            if (msg.author.bot) continue;
            const authorId = msg.author.id;
            if (islenenKullanicilar.has(authorId)) continue;
            islenenKullanicilar.add(authorId);

            const member = guild.members.cache.get(authorId);
            if (!member) continue;
            sunucudaMevcut++;

            const username = msg.content.trim();
            if (!username || username.includes(' ')) continue;

            const rolVar = member.roles.cache.has(KAYIT_DISCORD_ROL_ID);
            if (rolVar) {
                zatenRoluOlan++;
            }

            // Roblox hesabı ve grup kontrolü yap
            try {
                const robloxUser = await getRobloxUser(username);
                if (robloxUser) {
                    const rankData = await getUserRankInGroup(robloxUser.id, KAYIT_GRUP_ID);
                    if (rankData.rank > 0) {
                        gruptaOlan++;
                        // Gruba katılmış fakat Discord rolü yoksa ver!
                        if (!rolVar) {
                            const rol = guild.roles.cache.get(KAYIT_DISCORD_ROL_ID);
                            if (rol) {
                                await member.roles.add(rol, 'Başlangıç otomatik kayıt taraması (eksik rol tamamlama)');
                                yeniRolVerilen++;
                                console.log(`[✅ KAYIT TARAMA] ${member.user.tag} (${authorId}) için eksik olan Roblox Kayıt Rolü (${KAYIT_DISCORD_ROL_ID}) başarıyla verildi.`);
                            }
                        }

                        // Veritabanı kaydı kontrol et / güncelle
                        if (!robloxChecksDb.has(authorId)) {
                            robloxChecksDb.set(authorId, {
                                discordUserId: authorId,
                                robloxUsername: robloxUser.name,
                                robloxUserId: robloxUser.id,
                                registeredAt: msg.createdTimestamp,
                                checkAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
                                status: 'pending'
                            });
                        }
                    } else {
                        gruptaOlmayan++;
                    }
                }
            } catch (err) {
                console.error(`[⚠️ KAYIT TARAMA] ${username} için tarama hatası:`, err.message);
            }
        }

        console.log(`[📊 KAYIT TARAMA SONUÇ] Taranan Mesaj: ${toplamMesaj} | Kullanıcı: ${islenenKullanicilar.size} | Sunucuda: ${sunucudaMevcut} | Zaten Rolü Var: ${zatenRoluOlan} | Yeni Rol Verilen: ${yeniRolVerilen}`);

        // Log kanalına görsel rapor gönder
        try {
            const logKanal = await client.channels.fetch(SISTEM_LOG_KANAL_ID).catch(() => null);
            if (logKanal) {
                const { EmbedBuilder } = require('discord.js');
                const auditEmbed = new EmbedBuilder()
                    .setColor('#00FF88')
                    .setTitle('🔍 Başlangıç Kayıt Kanalı Taraması Tamamlandı')
                    .setDescription(`Bot yeniden başlatıldığında <#${KAYIT_KANAL_ID}> kanalına yazan tüm kullanıcıların rolleri ve sunucu durumları otomatik olarak kontrol edildi.`)
                    .addFields(
                        { name: '📩 Taranan Mesaj', value: String(toplamMesaj), inline: true },
                        { name: '👥 Tekil Kullanıcı', value: String(islenenKullanicilar.size), inline: true },
                        { name: '🏠 Sunucudaki Üye', value: String(sunucudaMevcut), inline: true },
                        { name: '🎭 Zaten Rolü Olan', value: String(zatenRoluOlan), inline: true },
                        { name: '⚡ Yeni Rol Tanımlanan', value: String(yeniRolVerilen), inline: true },
                        { name: '🎮 Grupta Doğrulanan', value: String(gruptaOlan), inline: true }
                    )
                    .setFooter({ text: 'Sentura Kayıt Taraması Otomasyonu' })
                    .setTimestamp();
                await logKanal.send({ embeds: [auditEmbed] });
            }
        } catch {}
    } catch (err) {
        console.error('[❌ KAYIT TARAMA HATA]', err.message);
    }
}

module.exports = {
    kayitKarsilamaMesajiniGonder,
    taraveKontrolEtKayitKanali,
    getKayitKarsilamaMesajId: () => kayitKarsilamaMesajId
};
