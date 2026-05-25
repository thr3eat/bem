const {
    Events,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { config } = require('../modules/constants');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const { hgIstatistik, hgGunlukSifirla } = require('../modules/stats');
        hgGunlukSifirla();
        hgIstatistik.toplamKatilan++;
        hgIstatistik.bugunKatilan++;

        if (!config.WELCOME_CHANNEL_ID) return;

        try {
            const channel = await member.guild.channels.fetch(config.WELCOME_CHANNEL_ID).catch(() => null);
            if (!channel) return;

            const hesapYasi = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

            const container = new ContainerBuilder()
                .setAccentColor(0x00FF88)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 👋 Hoş Geldin, ${member.user.toString()}!\n` +
                        `**${member.guild.name}** ailesine katıldın! 🎉`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `🆔 **Kullanıcı ID** — ${member.user.id}\n` +
                        `📅 **Hesap Yaşı** — ${hesapYasi}\n` +
                        `👥 **Toplam Üye** — ${member.guild.memberCount}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Sentura 🦸 ekoyildiz • <t:${Math.floor(Date.now() / 1000)}:R>`
                    )
                );

            await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        } catch (error) {
            console.error('[Welcome Event Error]', error);
        }
    },
};
