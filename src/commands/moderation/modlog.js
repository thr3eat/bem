const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { getModCases } = require('../../modules/moderationUtils');

const typeEmoji = {
    BAN: '🔨', KICK: '👢', MUTE: '🔇', WARN: '⚠️',
    TEMPBAN: '⏳', TEMPMUTE: '⏰', UNBAN: '✅', UNMUTE: '🔊',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('Kullanıcının geçmiş ceza kayıtlarını gösterir.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Kayıtları bakılacak kişi').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const user  = interaction.options.getUser('kullanici');
        const cases = getModCases(user.id);

        if (cases.length === 0) {
            return interaction.reply({
                content: `✅ **${user.tag}** kullanıcısının herhangi bir ceza kaydı bulunmuyor.`,
                flags: 64,
            });
        }

        const caseLines = cases.reverse().slice(0, 10).map(c => {
            const emoji = typeEmoji[c.type] || '📋';
            return (
                `${emoji} **Vaka #${c.caseId} — ${c.type}**\n` +
                `> 📅 <t:${Math.floor(c.timestamp / 1000)}:f>\n` +
                `> 👮 <@${c.moderatorId}>\n` +
                `> 📝 ${c.reason}`
            );
        }).join('\n\n');

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📜 Modlog — ${user.tag}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(caseLines)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Toplam ${cases.length} kayıt — Son 10 gösteriliyor • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
