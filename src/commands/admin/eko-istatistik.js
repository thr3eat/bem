const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { ekoDailyStats, ekoAbonerDatabase, ekoCooldownSet, EKO_GUILD_ID, EKO_ROL_ID } = require('../../modules/ekoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-istatistik')
        .setDescription('Eko Yıldız abone istatistiklerini gösterir.'),

    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID)
            return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        const bugun      = new Date().toISOString().slice(0, 10);
        const gunlukFoto = ekoDailyStats.get(bugun) || 0;
        const toplamAbone = ekoAbonerDatabase.size();
        const toplamFoto  = Object.values(ekoAbonerDatabase.all()).reduce((t, u) => t + (u.totalPhotos || 0), 0);

        let rolUyeSayisi = 0;
        try {
            const guild = client.guilds.cache.get(EKO_GUILD_ID);
            if (guild) {
                await guild.members.fetch();
                rolUyeSayisi = guild.members.cache.filter(m => m.roles.cache.has(EKO_ROL_ID)).size;
            }
        } catch {}

        const container = new ContainerBuilder()
            .setAccentColor(0xFFD700)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## ⭐ Eko Yıldız — İstatistikler')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `👥 **Toplam Abone (Rol)** — ${rolUyeSayisi}\n` +
                    `📊 **Takip Edilen Kullanıcı** — ${toplamAbone}\n` +
                    `📸 **Toplam Fotoğraf** — ${toplamFoto}\n` +
                    `📅 **Bugünkü Fotoğraf** — ${gunlukFoto}\n` +
                    `🕐 **Cooldown'daki Kişi** — ${ekoCooldownSet.size}\n` +
                    `📆 **Tarih** — ${bugun}`
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
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
