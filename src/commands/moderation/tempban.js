const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, parseDuration, formatDuration, tempbanDatabase } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Kullanıcıyı belirli süreliğine yasaklar.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const user       = interaction.options.getUser('kullanici');
        const sureStr    = interaction.options.getString('sure');
        const reason     = interaction.options.getString('sebep');
        const durationMs = parseDuration(sureStr);

        if (!durationMs) {
            return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnek: `10m`, `2h`, `1d`', flags: 64 });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (member && !member.bannable) {
            return interaction.reply({ content: '❌ Bu kullanıcıyı banlayamam!', flags: 64 });
        }

        const expiresAt    = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId       = addModCase('TEMPBAN', user.id, interaction.user.id, `${reason} (${durationText})`);

        // Merkezi moderationUtils DB'sini kullan (duplicate DB yok)
        tempbanDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmEmbed = buildDMEmbed('tempban', interaction.guild.name, interaction.user.tag, reason,
            `Süre: **${durationText}**\nBitiş: <t:${Math.floor(expiresAt / 1000)}:F>\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await interaction.guild.bans.create(user.id, {
                reason: `[TEMPBAN #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`,
                deleteMessageSeconds: 86400
            });

            const embed = buildModEmbed(
                `⏳ Geçici Ban | Vaka #${caseId}`,
                '#CC0000',
                [
                    { name: '👤 Kullanıcı',  value: `${user.tag}\n(${user.id})`,                    inline: true },
                    { name: '👮 Yetkili',    value: interaction.user.tag,                            inline: true },
                    { name: '⏱️ Süre',       value: durationText,                                   inline: true },
                    { name: '📋 Sebep',      value: reason,                                          inline: false },
                    { name: '🕐 Bitiş',      value: `<t:${Math.floor(expiresAt / 1000)}:F>`,        inline: true },
                    { name: '📩 DM Durumu',  value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi',  inline: true },
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            tempbanDatabase.delete(user.id);
            await interaction.reply({ content: `❌ Geçici banlama işlemi başarısız: ${error.message}`, flags: 64 });
        }
    },
};
