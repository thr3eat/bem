const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// --- AYARLAR ---
const app = express();
let isGameOpen = true; 

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = '1495017792754417664';

// --- KOMUTLARI KAYDETME FONKSİYONU ---
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Slash komutları yükleniyor...');
        const commands = [
            new SlashCommandBuilder()
                .setName('oyun-yonet')
                .setDescription('Oyunu açar veya kapatır')
                .addBooleanOption(option => 
                    option.setName('durum')
                    .setDescription('Açık mı kapalı mı?')
                    .setRequired(true))
        ].map(command => command.toJSON());

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Slash komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error(error);
    }
})();

// --- ROBLOX API KISMI ---
app.get('/check-status', (req, res) => {
    res.json({ open: isGameOpen });
});

// --- DISCORD ETKİLEŞİMİ ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'oyun-yonet') {
        const durum = interaction.options.getBoolean('durum');
        isGameOpen = durum;
        await interaction.reply(`Oyun durumu güncellendi: **${durum ? 'AÇIK' : 'KAPALI'}**`);
    }
});

// --- BAŞLATMA ---
const PORT = process.env.PORT || 10000; // Render için 10000 daha iyidir
app.listen(PORT, () => console.log(`API ${PORT} portunda aktif.`));
client.login(TOKEN);
