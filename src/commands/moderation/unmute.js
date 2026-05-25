const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, tempmuteDatabase } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');
const { config } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Kullanıcının susturmasını kaldırır.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Susturma kaldırılacak kişi').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('sebep').setDescription('Unmute sebebi').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction, client) {
        const user   = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: '❌ Bu kullanıcı sunucuda bulunamadı!', flags: 64 });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı!', flags: 64 });

        if (!member.roles.cache.has(muteRole.id)) {
            return interaction.reply({ content: '❌ Bu kullanıcı zaten susturulmuş değil!', flags: 64 });
        }

        // Merkezi DB'den tempmute kaydını sil
        tempmuteDatabase.delete(user.id);
        const caseId = addModCase('UNMUTE', user.id, interaction.user.id, reason);

        const dmEmbed = buildDMEmbed('unmute', interaction.guild.name, interaction.user.tag, reason,
            `Vaka ID: #${caseId}`
        );
        const dmSent = await sendDM(user, dmEmbed);

        try {
            await member.roles.remove(muteRole, `[#${caseId}] ${reason} | Yetkili: ${interaction.user.tag}`);

            const embed = buildModEmbed(
                `🔊 Susturma Kaldırıldı | Vaka #${caseId}`,
                '#00FF00',
                [
                    { name: '👤 Kullanıcı',  value: `${user.tag}\n(${user.id})`,                    inline: true },
                    { name: '👮 Yetkili',    value: interaction.user.tag,                            inline: true },
                    { name: '📋 Sebep',      value: reason,                                          inline: false },
                    { name: '📩 DM Durumu',  value: dmSent ? '✅ Gönderildi' : '❌ Gönderilemedi',  inline: true },
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Unmute işlemi başarısız: ${error.message}`, flags: 64 });
        }
    },
};
