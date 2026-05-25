const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { addModCase, tempbanDatabase } = require('../../modules/moderationUtils');
const { buildDMEmbed, buildModEmbed, sendDM, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Kullanıcının yasağını kaldırır.')
        .addStringOption(opt =>
            opt.setName('kullanici_id').setDescription('Kullanıcı ID').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('sebep').setDescription('Unban sebebi').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction, client) {
        const userId = interaction.options.getString('kullanici_id');
        const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi';

        try {
            const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);
            if (!bannedUser) {
                return interaction.reply({ content: '❌ Bu kullanıcı zaten banlı değil veya ID geçersiz!', flags: 64 });
            }

            await interaction.guild.bans.remove(userId, `${reason} | Yetkili: ${interaction.user.tag}`);

            // Merkezi DB'den tempban kaydını sil
            tempbanDatabase.delete(userId);

            const user = await client.users.fetch(userId).catch(() => null);
            if (user) {
                const dmEmbed = buildDMEmbed('unban', interaction.guild.name, interaction.user.tag, reason);
                await sendDM(user, dmEmbed);
            }

            const caseId = addModCase('UNBAN', userId, interaction.user.id, reason);
            const embed  = buildModEmbed(
                `✅ Ban Kaldırıldı | Vaka #${caseId}`,
                '#00FF00',
                [
                    { name: '👤 Kullanıcı', value: user ? `${user.tag}\n(${userId})` : userId, inline: true },
                    { name: '👮 Yetkili',   value: interaction.user.tag,                        inline: true },
                    { name: '📋 Sebep',     value: reason,                                      inline: false },
                ]
            );
            await interaction.reply({ embeds: [embed] });
            await sendLog(client, embed);
        } catch (error) {
            await interaction.reply({ content: `❌ Unban işlemi başarısız: ${error.message}`, flags: 64 });
        }
    },
};
