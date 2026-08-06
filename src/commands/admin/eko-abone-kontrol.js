const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { ekoAbonerDatabase, EKO_GUILD_ID, EKO_ROL_ID } = require('../../modules/ekoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-abone-kontrol')
        .setDescription('Bir kullanıcının abone durumunu kontrol eder.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Kontrol edilecek kişi').setRequired(true)
        ),

    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID)
            return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        const hedef = interaction.options.getUser('kullanici');
        const veri  = ekoAbonerDatabase.get(hedef.id);
        const guild = client.guilds.cache.get(EKO_GUILD_ID);
        let abone   = false;

        if (guild) {
            const m = await guild.members.fetch(hedef.id).catch(() => null);
            if (m) abone = m.roles.cache.has(EKO_ROL_ID);
        }

        const sonPaylasim = veri?.lastPhotoAt
            ? `<t:${Math.floor(new Date(veri.lastPhotoAt).getTime() / 1000)}:R>`
            : 'Bilinmiyor';

        const { EmbedBuilder } = require('discord.js');

        const embed = new EmbedBuilder()
            .setColor(abone ? '#FFD700' : '#888888')
            .setTitle(`⭐ YouTube Abone Kontrol — ${hedef.tag}`)
            .setThumbnail(hedef.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                { name: '👤 Kullanıcı', value: `${hedef.toString()} (\`${hedef.id}\`)`, inline: true },
                { name: '🎭 Eko Abone Rolü', value: abone ? `<@&${EKO_ROL_ID}> (✅ Mevcut)` : '❌ Rol Yok', inline: true },
                { name: '📸 Toplam Fotoğraf', value: `${veri ? veri.totalPhotos : 0} Adet`, inline: true },
                { name: '📅 Son Fotoğraf Tarihi', value: sonPaylasim, inline: false }
            )
            .setFooter({ text: 'Eko Yıldız Abone Kontrol Sistemi' })
            .setTimestamp();

        try {
            const container = new ContainerBuilder()
                .setAccentColor(abone ? 0xFFD700 : 0x888888)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ⭐ YouTube Abone Kontrol — ${hedef.tag}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `🎭 **Abone Rolü (<@&${EKO_ROL_ID}>)** — ${abone ? '✅ Mevcut' : '❌ Yok'}\n` +
                        `📸 **Paylaşılan Fotoğraf** — ${veri ? veri.totalPhotos : 0} Adet\n` +
                        `📅 **Son Fotoğraf Paylaşımı** — ${sonPaylasim}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Eko Yıldız Otomasyon • <t:${Math.floor(Date.now() / 1000)}:R>`
                    )
                );

            await interaction.reply({
                components: [container],
                embeds: [embed],
                flags: MessageFlags.IsComponentsV2 | 64,
            });
        } catch {
            await interaction.reply({
                embeds: [embed],
                flags: 64,
            });
        }
    },
};
