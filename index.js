const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

const app = express();
let isGameOpen = true; 
let isMarketOpen = true; // Rütbe Marketi durumu

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
                .setDescription('Oyunu açar veya kapatır')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),
            new SlashCommandBuilder()
                .setName('market-yonet')
                .setDescription('Rütbe marketini açar veya kapatır')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true))
        ].map(command => command.toJSON());

        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('Komutlar başarıyla kaydedildi!');
    } catch (error) {
        console.error(error);
    }
})();

// --- API ÇIKIŞLARI ---
app.get('/check-status', (req, res) => {
    res.json({ open: isGameOpen, market: isMarketOpen });
});

// --- DISCORD ETKİLEŞİMİ ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'oyun-yonet') {
        isGameOpen = interaction.options.getBoolean('durum');
        await interaction.reply(`Oyun durumu: **${isGameOpen ? 'AÇIK' : 'KAPALI'}**`);
    }

    if (interaction.commandName === 'market-yonet') {
        isMarketOpen = interaction.options.getBoolean('durum');
        await interaction.reply(`Rütbe Marketi durumu: **${isMarketOpen ? 'AÇIK' : 'KAPALI'}**`);
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`API ${PORT} portunda aktif.`));
client.login(TOKEN);
