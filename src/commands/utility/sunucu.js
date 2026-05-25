const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sunucu')
        .setDescription('Sunucu hakkında bilgi gösterir.'),

    async execute(interaction) {
        const guild = interaction.guild;
        await guild.members.fetch();
        const botCount   = guild.members.cache.filter(m => m.user.bot).size;
        const humanCount = guild.memberCount - botCount;

        const container = new ContainerBuilder()
            .setAccentColor(0x0099FF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🏰 ${guild.name}`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `🆔 **Sunucu ID** — ${guild.id}\n` +
                    `👑 **Sahip** — <@${guild.ownerId}>\n` +
                    `📅 **Oluşturulma** — <t:${Math.floor(guild.createdTimestamp / 1000)}:F>`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `👥 **Toplam Üye** — ${guild.memberCount}\n` +
                    `🧑 **Kullanıcı** — ${humanCount}\n` +
                    `🤖 **Bot** — ${botCount}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `💬 **Kanal** — ${guild.channels.cache.size}\n` +
                    `🎭 **Rol** — ${guild.roles.cache.size}\n` +
                    `🌟 **Boost** — ${guild.premiumSubscriptionCount || 0} (Tier ${guild.premiumTier})`
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

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
