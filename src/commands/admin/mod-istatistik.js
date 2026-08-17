const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    PermissionFlagsBits
} = require('discord.js');
const { getWeeklyLeaderboard, publishWeeklyReport } = require('../../modules/modStatsUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mod-istatistik')
        .setDescription('Moderatörlerin haftalık ve toplam abone onay istatistiklerini gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addBooleanOption(opt => 
            opt.setName('rapor-yayinla')
               .setDescription('Haftalık liderlik raporunu kanalda hemen yayınlar ve sayacı sıfırlar.')
               .setRequired(false)
        ),

    async execute(interaction, client) {
        const raporYayinla = interaction.options.getBoolean('rapor-yayinla') || false;

        if (raporYayinla) {
            await interaction.deferReply({ flags: 64 });
            const result = await publishWeeklyReport(client, true);
            if (result) {
                return interaction.editReply({ content: '✅ Haftalık moderatör liderlik raporu başarıyla kanala gönderildi ve haftalık sayac sıfırlandı.' });
            } else {
                return interaction.editReply({ content: '❌ Rapor kanala gönderilemedi, lütfen logları kontrol edin.' });
            }
        }

        const leaderboard = getWeeklyLeaderboard();

        let content = `## 🏆 Moderatör Abone Onay İstatistikleri\n\n`;

        if (leaderboard.length === 0) {
            content += `⚠️ Henüz kayıtlı moderatör işlemi bulunmuyor.`;
        } else {
            const topMod = leaderboard[0];
            content += `👑 **Haftanın Birincisi:** <@${topMod.modId}> — **${topMod.weeklyApprovals} Onay**\n\n` +
                       `📊 **Haftalık Liderlik Sıralaması:**\n`;

            leaderboard.slice(0, 10).forEach((entry, idx) => {
                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
                content += `${medal} **#${idx + 1}** <@${entry.modId}> — **${entry.weeklyApprovals} Haftalık Onay** | Toplam Onay: **${entry.totalApprovals}**\n`;
            });
        }

        const container = new ContainerBuilder()
            .setAccentColor(0xFFD700)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(content)
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Otomatik Raporlama: Kanal <#1518693119082889376> • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    },
};
