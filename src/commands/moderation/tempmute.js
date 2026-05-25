const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, parseDuration, formatDuration, tempmuteDatabase } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');
const { config } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempmute')
        .setDescription('Kullanıcıyı belirli süreliğine susturur.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
        .addStringOption(opt => opt.setName('sure').setDescription('Süre (örn: 10m, 2h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    async execute(interaction, client) {
        const user       = interaction.options.getUser('kullanici');
        const sureStr    = interaction.options.getString('sure');
        const reason     = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const durationMs = parseDuration(sureStr);

        if (!durationMs) {
            return interaction.reply({ content: '❌ Geçersiz süre formatı! Örnek: `10m`, `2h`, `1d`', flags: 64 });
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);
        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı!', flags: 64 });

        const expiresAt    = Date.now() + durationMs;
        const durationText = formatDuration(durationMs);
        const caseId       = addModCase('TEMPMUTE', user.id, interaction.user.id, `${reason} (${durationText})`);

        // Merkezi moderationUtils DB'sini kullan
        tempmuteDatabase.set(user.id, { expiresAt, reason, moderatorId: interaction.user.id });

        const dmEmbed = buildDMEmbed('tempmute', interaction.guild.name, interaction.user.tag, reason,
            `Süre: **${durationText}**\nBitiş: <t:${Math.floor(expiresAt / 1000)}:F>\nVaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.add(muteRole, `[TEMPMUTE #${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `⏰ Geçici Susturma | Vaka #${caseId}`,
                '#FF8C00',
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
            tempmuteDatabase.delete(user.id);
            await interaction.reply({ content: `❌ Geçici susturma başarısız: ${error.message}`, flags: 64 });
        }
    },
};
