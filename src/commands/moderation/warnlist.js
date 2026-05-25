const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { getUserWarnings } = require('../../modules/moderationUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnlist')
        .setDescription('Kullanıcının uyarılarını listeler.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Uyarıları görülecek kişi').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user  = interaction.options.getUser('kullanici');
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({
                content: `✅ **${user.tag}** adlı kullanıcının hiç uyarısı yok.`,
                flags: 64,
            });
        }

        const warnLines = warns.slice(0, 25).map((w, i) =>
            `**${i + 1}.** ⚠️ ${new Date(w.timestamp).toLocaleDateString('tr-TR')}\n` +
            `> 📋 ${w.reason}\n` +
            `> 👮 <@${w.moderatorId}>`
        ).join('\n\n');

        const container = new ContainerBuilder()
            .setAccentColor(0xFFFF00)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## ⚠️ Uyarı Listesi — ${user.tag}\nToplam **${warns.length}** uyarı`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(warnLines)
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
            flags: MessageFlags.IsComponentsV2 | 64,
        });
    },
};
