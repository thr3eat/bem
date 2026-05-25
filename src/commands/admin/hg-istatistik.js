const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { hgIstatistik, hgGunlukSifirla } = require('../../modules/stats');
const { YOUTUBE_ABONE_LINK, YOUTUBE_UYE_LINK } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hg-istatistik')
        .setDescription('Hoşgeldin sisteminin istatistiklerini gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        hgGunlukSifirla();

        const container = new ContainerBuilder()
            .setAccentColor(0xFFD700)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 👋 Hoşgeldin Sistemi — İstatistikler')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `👥 **Toplam Katılan (Bu Oturum)** — ${hgIstatistik.toplamKatilan}\n` +
                    `📅 **Bugün Katılan** — ${hgIstatistik.bugunKatilan}\n` +
                    `🏰 **Mevcut Üye Sayısı** — ${interaction.guild.memberCount}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `📺 **YouTube Abone Linki** — [Abone Ol!](${YOUTUBE_ABONE_LINK})\n` +
                    `💎 **YouTube Üyelik Linki** — [Üye Ol!](${YOUTUBE_UYE_LINK})`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Eko Yıldız Hoşgeldin Sistemi • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | 64,
        });
    },
};
