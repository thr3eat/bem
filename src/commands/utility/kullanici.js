const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kullanici')
        .setDescription('Kullanıcı hakkında bilgi gösterir.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Bilgi alınacak kişi').setRequired(false)
        ),

    async execute(interaction) {
        const target = interaction.options.getUser('kullanici') || interaction.user;
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);

        const roller = member
            ? member.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .map(r => `<@&${r.id}>`)
                .join(' ') || 'Yok'
            : 'Bilinmiyor';

        const container = new ContainerBuilder()
            .setAccentColor(0x0099FF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 👤 ${target.tag}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `🆔 **Kullanıcı ID** — ${target.id}\n` +
                    `📅 **Hesap Oluşturma** — <t:${Math.floor(target.createdTimestamp / 1000)}:F>\n` +
                    `🤖 **Bot mu?** — ${target.bot ? 'Evet' : 'Hayır'}`
                )
            );

        if (member) {
            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `📅 **Sunucuya Katılım** — <t:${Math.floor(member.joinedTimestamp / 1000)}:F>\n` +
                        `🏷️ **Nickname** — ${member.nickname || 'Yok'}\n` +
                        `🎭 **Roller** — ${roller}`
                    )
                );
        }

        container
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Sentura 🦸 ekoyildiz • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
