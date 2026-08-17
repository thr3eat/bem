const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('yardim')
        .setDescription('Tüm komutları ve kullanım amaçlarını gösterir.'),
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📚 Yardım Menüsü')
            .setDescription('Sentura 🦸 ekoyildiz Bot komut listesi')
            .addFields(
                { name: '🛡️ Moderasyon', value: '`/ban`, `/tempban`, `/kick`, `/mute`, `/tempmute`, `/unban`, `/unmute`, `/warn`, `/clear`, `/slowmode`, `/lock`, `/unlock`, `/modlog`', inline: false },
                { name: '🎮 Yönetim', value: '`/oyun-yonet`, `/market-yonet`, `/adaletsarayi-yonet`, `/tumunu-ac`, `/tumunu-kapat`, `/sistem-kontrol`', inline: false },
                { name: '⭐ Roblox', value: '`/terfi`, `/tenzil`, `/rutbebak`, `/rutbelist`', inline: false },
                { name: '📊 Genel', value: '`/anket`, `/ping`, `/yardim`, `/avatar`, `/bot`, `/sunucu`, `/kullanici`, `/duyuru`, `/nick`', inline: false },
                { name: '📈 İstatistik', value: '`/eko-istatistik`, `/mod-istatistik`, `/hg-istatistik`, `/selamlama-istatistik`', inline: false }
            )
            .setTimestamp()
            .setFooter({ text: 'Sentura 🦸 ekoyildiz' });
            
        await interaction.reply({ embeds: [embed] });
    },
};
