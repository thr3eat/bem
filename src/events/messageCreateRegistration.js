const { Events, EmbedBuilder } = require('discord.js');
const { 
    KAYIT_GUILD_ID, KAYIT_KANAL_ID, KAYIT_GRUP_ID, KAYIT_RANK_ID, KAYIT_DISCORD_ROL_ID, KAYIT_COOLDOWN_MS
} = require('../modules/constants');
const { getRobloxUser, getUserRankInGroup, setRobloxRank } = require('../modules/robloxApi');
const { sendLog } = require('../modules/embedBuilders');

const kayitCooldown = new Map();

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (message.guildId !== KAYIT_GUILD_ID) return;
        if (message.channelId !== KAYIT_KANAL_ID) return;

        const icerik = message.content.trim();
        if (!icerik || icerik.includes(' ')) return; // Sadece kullanıcı adı bekliyoruz

        // Cooldown kontrolü
        const sonKayit = kayitCooldown.get(message.author.id);
        if (sonKayit && (Date.now() - sonKayit < KAYIT_COOLDOWN_MS)) {
            const kalan = Math.ceil((KAYIT_COOLDOWN_MS - (Date.now() - sonKayit)) / 1000);
            return message.reply(`⚠️ Çok hızlısın! Lütfen **${kalan}** saniye sonra tekrar dene.`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        }

        kayitCooldown.set(message.author.id, Date.now());

        const yukleniyor = await message.reply({
            embeds: [new EmbedBuilder().setColor('#FFFF00').setDescription('🔍 Roblox hesabı doğrulanıyor, lütfen bekleyin...')]
        });

        try {
            const robloxUser = await getRobloxUser(icerik);
            if (!robloxUser) {
                return yukleniyor.edit({
                    embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Kullanıcı Bulunamadı').setDescription(`**${icerik}** adında bir Roblox kullanıcısı bulunamadı.`)]
                }).then(() => setTimeout(() => yukleniyor.delete().catch(() => {}), 10000));
            }

            const rankData = await getUserRankInGroup(robloxUser.id, KAYIT_GRUP_ID);
            if (rankData.rank === 0) {
                return yukleniyor.edit({
                    embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('⚠️ Gruba Katılmadınız').setDescription(`**${robloxUser.name}** kullanıcısı hedef Roblox grubunda bulunmuyor.\n\n🔗 [Gruba Katılmak İçin Tıkla](https://www.roblox.com/communities/${KAYIT_GRUP_ID})`)]
                }).then(() => setTimeout(() => yukleniyor.delete().catch(() => {}), 15000));
            }

            if (rankData.rank >= KAYIT_RANK_ID) {
                return yukleniyor.edit({
                    embeds: [new EmbedBuilder().setColor('#00FF88').setTitle('✅ Zaten Kayıtlısınız').setDescription(`**${robloxUser.name}** zaten rütbe almış durumda.`)]
                }).then(() => setTimeout(() => yukleniyor.delete().catch(() => {}), 10000));
            }

            // Rütbe ver
            await setRobloxRank(robloxUser.id, KAYIT_RANK_ID, KAYIT_GRUP_ID);

            // Discord rolü ver
            const member = await message.guild.members.fetch(message.author.id).catch(() => null);
            if (member) {
                const rol = message.guild.roles.cache.get(KAYIT_DISCORD_ROL_ID);
                if (rol) await member.roles.add(rol, 'Kayıt sistemi (otomatik)');
            }

            // 2 gün sonra yapılacak Roblox grup kontrolü için kayıt oluştur
            try {
                const JsonDatabase = require('../modules/jsonDatabase');
                const robloxChecksDb = new JsonDatabase('robloxChecks.json');
                robloxChecksDb.set(message.author.id, {
                    discordUserId: message.author.id,
                    robloxUsername: robloxUser.name,
                    robloxUserId: robloxUser.id,
                    registeredAt: Date.now(),
                    checkAt: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 gün sonra
                    status: 'pending'
                });
            } catch (err) {
                console.error('[KAYIT] Roblox grup kontrol kaydı oluşturulamadı:', err.message);
            }

            const ComponentsV2Factory = require('../modules/componentsV2Factory');
            const v2Payload = ComponentsV2Factory.buildRegistrationSuccessV2({
                robloxUser,
                discordUserId: message.author.id,
                targetRoleId: KAYIT_DISCORD_ROL_ID
            });

            await yukleniyor.edit({ ...v2Payload, embeds: [] });

            const logEmbed = new EmbedBuilder()
                .setColor('#00FF88')
                .setTitle('✅ Yeni Roblox Kaydı Yapıldı (Log)')
                .addFields(
                    { name: '🎮 Roblox Hesabı', value: `[${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile) (\`${robloxUser.id}\`)`, inline: true },
                    { name: '👤 Discord Üyesi', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
                    { name: '🎭 Tanımlanan Rol', value: `<@&${KAYIT_DISCORD_ROL_ID}>`, inline: true }
                )
                .setTimestamp();
            await sendLog(client, logEmbed);

        } catch (error) {
            console.error('[KAYIT HATA]', error);
            await yukleniyor.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('❌ Sistem Hatası').setDescription(`Bir hata oluştu: \`${error.message}\``)]
            });
        }
    },
};
