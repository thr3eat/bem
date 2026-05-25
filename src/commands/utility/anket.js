const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anket')
        .setDescription('Hızlı evet/hayır anketi oluşturur.')
        .addStringOption(opt =>
            opt.setName('soru').setDescription('Anket sorusu').setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('kanal').setDescription('Anket kanalı (boş = mevcut)').setRequired(false)
        ),

    async execute(interaction) {
        const soru  = interaction.options.getString('soru');
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📊 Anket\n**${soru}**`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('poll_yes')
                        .setLabel('✅ Evet')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('poll_no')
                        .setLabel('❌ Hayır')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('poll_results')
                        .setLabel('📊 Sonuçlar')
                        .setStyle(ButtonStyle.Secondary)
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Anketi açan: ${interaction.user.tag} • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        try {
            await kanal.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
            await interaction.reply({ content: `✅ Anket <#${kanal.id}> kanalına gönderildi!`, flags: 64 });
        } catch (error) {
            await interaction.reply({ content: `❌ Anket gönderilemedi: ${error.message}`, flags: 64 });
        }
    },
};
