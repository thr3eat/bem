const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const { status, startApi } = require('./api'); // api.js dosyasını dahil ettik
const config = require('./config.json'); // Ayarları dahil ettik

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const TOKEN = process.env.DISCORD_TOKEN; // Render üzerindeki gizli token

// --- KOMUTLARI KAYDETME ---
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        const commands = [
            new SlashCommandBuilder()
                .setName('oyun-yonet')
                .setDescription('Oyunu açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),
            new SlashCommandBuilder()
                .setName('market-yonet')
                .setDescription('Rütbe marketini açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true))
        ].map(command => command.toJSON());

        await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
        console.log('Discord komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komutlar kaydedilirken hata oluştu:', error);
    }
})();

// --- DISCORD ETKİLEŞİMİ VE YETKİ KONTROLÜ ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // 1. SUNUCU KONTROLÜ: Komut doğru sunucuda mı kullanılıyor?
    if (interaction.guildId !== config.GUILD_ID) {
        return interaction.reply({ 
            content: '❌ Bu komut sadece ana sunucumuzda kullanılabilir.', 
            ephemeral: true // Sadece komutu kullanan kişi bu mesajı görür
        });
    }

    // 2. ROL KONTROLÜ: Kullanıcının belirlenen yetki rolü var mı?
    const hasRole = interaction.member.roles.cache.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return interaction.reply({ 
            content: '❌ Bu komutu kullanmak için gerekli yetkiye sahip değilsin!', 
            ephemeral: true 
        });
    }

    // YETKİ VARSA İŞLEMLERE DEVAM ET
    const durum = interaction.options.getBoolean('durum');

    if (interaction.commandName === 'oyun-yonet') {
        status.isGameOpen = durum; // api.js içindeki durumu değiştirir
        await interaction.reply(`Oyun durumu başarıyla güncellendi: **${durum ? 'AÇIK' : 'KAPALI'}**`);
    }

    if (interaction.commandName === 'market-yonet') {
        status.isMarketOpen = durum;
        await interaction.reply(`Rütbe Marketi durumu başarıyla güncellendi: **${durum ? 'AÇIK' : 'KAPALI'}**`);
    }
});

// Sistemleri Başlat
const PORT = process.env.PORT || config.PORT;
startApi(PORT); // Express (Roblox) API'sini başlatır
client.login(TOKEN); // Discord Botunu başlatır
