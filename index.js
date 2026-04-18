const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

const app = express();
app.use(express.json()); // POST isteklerindeki JSON verilerini okuyabilmek için bu satır zorunludur.

// --- DURUM DEĞİŞKENLERİ ---
let isGameOpen = true; 
let isMarketOpen = true; 
let isAdaletSarayOpen = false; // Adalet Sarayı başlangıçta kapalı olarak ayarlandı.

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1495017792754417664';

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

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Discord komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komutlar kaydedilirken hata oluştu:', error);
    }
})();

// --- API ÇIKIŞLARI (ROBLOX İÇİN) ---

// 1. Roblox'un tüm durumları kontrol ettiği GET isteği
app.get('/check-status', (req, res) => {
    res.json({ 
        open: isGameOpen, 
        market: isMarketOpen, 
        adaletSaray: isAdaletSarayOpen 
    });
});

// 2. Roblox Ana Oyun'dan gelen POST isteği ile Adalet Sarayı'nı güncelleme
app.post('/update-adalet', (req, res) => {
    const { status } = req.body;
    
    // Gelen verinin doğruluğunu kontrol ediyoruz
    if (typeof status === 'boolean') {
        isAdaletSarayOpen = status;
        res.json({ success: true, current: isAdaletSarayOpen });
        console.log(`Adalet Sarayı durumu güncellendi: ${isAdaletSarayOpen ? 'AÇIK' : 'KAPALI'}`);
    } else {
        res.status(400).json({ success: false, error: 'Geçersiz veri tipi. Lütfen true veya false gönderin.' });
    }
});

// --- DISCORD ETKİLEŞİMİ ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'oyun-yonet') {
        isGameOpen = interaction.options.getBoolean('durum');
        await interaction.reply(`Oyun durumu başarıyla güncellendi: **${isGameOpen ? 'AÇIK' : 'KAPALI'}**`);
    }

    if (interaction.commandName === 'market-yonet') {
        isMarketOpen = interaction.options.getBoolean('durum');
        await interaction.reply(`Rütbe Marketi durumu başarıyla güncellendi: **${isMarketOpen ? 'AÇIK' : 'KAPALI'}**`);
    }
});

// --- SUNUCU BAŞLATMA ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`API ${PORT} portunda aktif.`));
client.login(TOKEN);
