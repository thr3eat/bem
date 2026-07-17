const { Events } = require('discord.js');
const { 
    EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID,
    ekoFotografVarMi, ekoGuncelleIstatistik,
    ekoAboneDMEmbed, ekoKanalTebrikEmbed, ekoLogEmbed,
    ekoCooldownSet
} = require('../modules/ekoUtils');
const { sendLog } = require('../modules/embedBuilders');

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (message.guildId !== EKO_GUILD_ID) return;
        if (message.channelId !== EKO_KANAL_ID) return;
        if (!ekoFotografVarMi(message)) return;

        // --- Üye bilgisini al ---
        let member;
        try {
            const guild = client.guilds.cache.get(EKO_GUILD_ID);
            if (!guild) return;
            member = await guild.members.fetch(message.author.id).catch(() => null);
            if (!member) return;
        } catch {
            return;
        }

        // --- Rol kontrolü ---
        const zatenAbone = member.roles.cache.has(EKO_ROL_ID);

        // --- İstatistik güncelle ---
        const stats = ekoGuncelleIstatistik(message.author.id);
        const toplamFoto = stats.kullaniciFoto;

        // --- ✅ Tepki ekle ---
        try {
            await message.react('✅');
        } catch (err) {
            console.error('[EKO] Tepki eklenemedi:', err.message);
        }

        // --- Rol ver (sadece yoksa) ---
        let rolVerildi = false;
        if (!zatenAbone) {
            try {
                const rol = member.guild.roles.cache.get(EKO_ROL_ID);
                if (rol) {
                    await member.roles.add(rol, 'Eko Yıldız — fotoğraf paylaşımı (otomasyon)');
                    rolVerildi = true;
                }
            } catch (err) {
                console.error('[EKO] Rol verilemedi:', err.message);
            }
        }

        // --- DM gönder ---
        const cooldownKey = `${message.author.id}_${new Date().toISOString().slice(0, 10)}`;
        let dmDurumu = false;

        if (!ekoCooldownSet.has(cooldownKey)) {
            try {
                const dmEmbed = ekoAboneDMEmbed(member, toplamFoto);
                await message.author.send({ embeds: [dmEmbed] });
                dmDurumu = true;
                ekoCooldownSet.add(cooldownKey);
                // Cooldown 24 saat sonra otomatik temizle
                setTimeout(() => ekoCooldownSet.delete(cooldownKey), 24 * 60 * 60 * 1000);
            } catch {
                // DM kapalı — sessizce geç
            }
        }

        // --- Kanal içi tebrik mesajı (sadece yeni abonelere) ---
        if (rolVerildi) {
            try {
                const tebrikEmbed = ekoKanalTebrikEmbed(member, toplamFoto, true);
                const tebrikMesaj = await message.channel.send({ embeds: [tebrikEmbed] });
                // 15 saniye sonra tebrik mesajını sil
                setTimeout(() => tebrikMesaj.delete().catch(() => {}), 15000);
            } catch (err) {
                console.error('[EKO] Tebrik mesajı gönderilemedi:', err.message);
            }
        }

        // --- Log kanalına gönder ---
        try {
            const logEmbed = ekoLogEmbed(member, rolVerildi, toplamFoto, dmDurumu);
            await sendLog(client, logEmbed);
        } catch (err) {
            console.error('[EKO] Log gönderilemedi:', err.message);
        }

        // --- Onay kanalına gönder ---
        try {
            const { EKO_ONAY_KANAL_ID } = require('../modules/constants');
            const onayKanal = await client.channels.fetch(EKO_ONAY_KANAL_ID).catch(() => null);
            if (onayKanal) {
                const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
                
                let resimUrl = null;
                const a = message.attachments.first();
                if (a && a.contentType?.startsWith('image/')) {
                    resimUrl = a.url;
                } else if (a) {
                    resimUrl = a.url;
                }

                const onayEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle('📢 Abone Onay İsteği')
                    .setDescription(`**${message.author.toString()}** (${message.author.tag} - \`${message.author.id}\`) otomatik onay yaptı...\n\nAbone gerçekten olunmuş mudur yoksa yanlış mıdır?`)
                    .addFields(
                        { name: '📅 Gönderim Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
                        { name: '🔗 Orijinal Mesaj', value: `[Tıkla ve Git](${message.url})`, inline: true }
                    )
                    .setTimestamp();

                if (resimUrl) {
                    onayEmbed.setImage(resimUrl);
                }

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`eko_approve_${message.author.id}_${message.id}`)
                        .setLabel('Evet, Gerçek')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('✅'),
                    new ButtonBuilder()
                        .setCustomId(`eko_reject_${message.author.id}_${message.id}`)
                        .setLabel('Yanlış / Reddet')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('❌')
                );

                await onayKanal.send({ content: `🔔 **Yeni Onay İsteği!** ${message.author.toString()}`, embeds: [onayEmbed], components: [row] });
            }
        } catch (err) {
            console.error('[EKO] Onay kanalına istek gönderilemedi:', err.message);
        }

        console.log(`[⭐ EKO] ${message.author.tag} fotoğraf paylaştı | Yeni abone: ${rolVerildi} | Fotoğraf: ${toplamFoto}`);
    },
};
