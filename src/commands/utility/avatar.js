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
        .setName('avatar')
        .setDescription('Kullanıcının avatarını gösterir.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Avatar alınacak kişi').setRequired(false)
        ),

    async execute(interaction) {
        const target  = interaction.options.getUser('kullanici') || interaction.user;
        const avatarUrl = target.displayAvatarURL({ dynamic: true, size: 1024 });

        const container = new ContainerBuilder()
            .setAccentColor(0x0099FF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 🖼️ ${target.tag} — Avatar`)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `[PNG](${target.displayAvatarURL({ extension: 'png', size: 1024 })}) · ` +
                    `[JPG](${target.displayAvatarURL({ extension: 'jpg', size: 1024 })}) · ` +
                    `[WEBP](${target.displayAvatarURL({ extension: 'webp', size: 1024 })})`
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
