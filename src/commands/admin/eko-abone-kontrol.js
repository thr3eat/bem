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

        const container = new ContainerBuilder()
            .setAccentColor(abone ? 0xFFD700 : 0x888888)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ⭐ Abone Kontrol — ${hedef.tag}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `🎭 **Abone Rolü** — ${abone ? '✅ Mevcut' : '❌ Yok'}\n` +
                    `📸 **Paylaştığı Fotoğraf** — ${veri ? veri.totalPhotos : 0}\n` +
                    `📅 **Son Paylaşım** — ${sonPaylasim}`
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
            flags: MessageFlags.IsComponentsV2 | 64,
        });
    },
};
