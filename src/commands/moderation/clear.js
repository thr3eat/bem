const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Belirtilen sayıda mesajı siler.')
        .addIntegerOption(opt =>
            opt.setName('sayi').setDescription('Silinecek mesaj sayısı (1-100)').setRequired(true)
        )
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Sadece bu kişinin mesajlarını sil').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction, client) {
        const sayi       = interaction.options.getInteger('sayi');
        const targetUser = interaction.options.getUser('kullanici');

        if (sayi < 1 || sayi > 100) {
            return interaction.reply({ content: '❌ Silinecek mesaj sayısı 1-100 arasında olmalıdır!', flags: 64 });
        }

        await interaction.deferReply({ flags: 64 });

        try {
            let messages = await interaction.channel.messages.fetch({ limit: sayi });
            if (targetUser) messages = messages.filter(m => m.author.id === targetUser.id);

            const deleted = await interaction.channel.bulkDelete(messages, true);
            await interaction.editReply(`✅ **${deleted.size}** mesaj başarıyla silindi.`);

            const logEmbed = buildModEmbed('🗑️ Toplu Mesaj Silme', '#FF6600', [
                { name: '👮 Yetkili',          value: interaction.user.tag,                    inline: true },
                { name: '📝 Kanal',            value: `<#${interaction.channelId}>`,           inline: true },
                { name: '🔢 Silinen Mesaj',    value: `${deleted.size}`,                       inline: true },
                { name: '👤 Hedef Kullanıcı',  value: targetUser ? targetUser.tag : 'Hepsi',  inline: true },
            ]);
            await sendLog(client, logEmbed);
        } catch (error) {
            await interaction.editReply(`❌ Mesajlar silinirken hata: ${error.message}`);
        }
    },
};
