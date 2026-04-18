const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// --- AYARLAR ---
const app = express();
let isGameOpen = true; // Oyunun durumu burada tutuluyor

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const TOKEN = 'BOT_TOKEN_BURAYA';
const CLIENT_ID = 'BOT_ID_BURAYA';

// --- ROBLOX API KISMI ---
app.get('/check-status', (req, res) => {
    res.json({ open: isGameOpen });
});

// --- DISCORD KOMUTLARI ---
const commands = [
    new SlashCommandBuilder()
        .setName('oyun-yonet')
        .setDescription('Oyunu açar veya kapatır')
        .addBooleanOption(option => 
            option.setName('durum')
            .setDescription('Açık mı kapalı mı?')
            .setRequired(true))
].map(command => command.toJSON());

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'oyun-yonet') {
        const durum = interaction.options.getBoolean('durum');
        isGameOpen = durum;
        await interaction.reply(`Oyun durumu güncellendi: **${durum ? 'AÇIK' : 'KAPALI'}**`);
    }
});

// --- BAŞLATMA ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API ${PORT} portunda aktif.`));
client.login(TOKEN);
