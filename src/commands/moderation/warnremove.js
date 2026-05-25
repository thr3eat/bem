const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { getUserWarnings, removeWarning } = require('../../modules/moderationUtils');
const { buildModEmbed } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warnremove')
        .setDescription('Kullanıcıdan uyarı kaldırır.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Uyarı kaldırılacak kişi').setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('index').setDescription("Kaldırılacak uyarı numarası (1'den başlar)").setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user  = interaction.options.getUser('kullanici');
        const index = interaction.options.getInteger('index') - 1;
        const warns = getUserWarnings(user.id);

        if (warns.length === 0) {
            return interaction.reply({ content: `❌ **${user.tag}** adlı kullanıcının uyarısı yok.`, flags: 64 });
        }

        if (index < 0 || index >= warns.length) {
            return interaction.reply({
                content: `❌ Geçersiz uyarı numarası! (1 ile ${warns.length} arasında olmalı)`,
                flags: 64,
            });
        }

        const removedWarn = warns[index];
        removeWarning(user.id, index);
        const kalanSayi = getUserWarnings(user.id).length;

        const container = new ContainerBuilder()
            .setAccentColor(0x00BFFF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 🗑️ Uyarı Kaldırıldı')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `👤 **Kullanıcı** — ${user.tag}\n` +
                    `👮 **Kaldıran** — ${interaction.user.tag}\n` +
                    `📋 **Kaldırılan Uyarı** — ${removedWarn.reason}\n` +
                    `🔢 **Kalan Uyarı** — ${kalanSayi}`
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
