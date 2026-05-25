const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Kanalda yavaş modu ayarlar.')
        .addIntegerOption(opt =>
            opt.setName('saniye').setDescription('Saniye (0 = kapat)').setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('kanal').setDescription('Kanal (boş = mevcut kanal)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const saniye = interaction.options.getInteger('saniye');
        const kanal  = interaction.options.getChannel('kanal') || interaction.channel;

        if (saniye < 0 || saniye > 21600) {
            return interaction.reply({ content: '❌ Yavaş mod süresi 0-21600 saniye arasında olmalıdır!', flags: 64 });
        }

        try {
            await kanal.setRateLimitPerUser(saniye, `Slowmode ayarlandı | Yetkili: ${interaction.user.tag}`);
            await interaction.reply({
                content: saniye === 0
                    ? `✅ <#${kanal.id}> kanalında yavaş mod kapatıldı.`
                    : `✅ <#${kanal.id}> kanalında yavaş mod **${saniye} saniye** olarak ayarlandı.`,
            });
        } catch (error) {
            await interaction.reply({ content: `❌ Slowmode ayarlanamadı: ${error.message}`, flags: 64 });
        }
    },
};
