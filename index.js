const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const { status, startApi } = require('./api'); 
const config = require('./config.json'); 

// Botun sunucudaki üyeleri yönetebilmesi için GuildMembers intent'ini ekledik
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const TOKEN = process.env.DISCORD_TOKEN; 

// --- KOMUTLARI KAYDETME ---
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        const commands = [
            // Oyun Yönetim Komutları
            new SlashCommandBuilder().setName('oyun-yonet').setDescription('Oyunu açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),
            new SlashCommandBuilder().setName('market-yonet').setDescription('Rütbe marketini açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),
            new SlashCommandBuilder().setName('tumunu-ac').setDescription('Oyun, Market ve Adalet Sarayını aynı anda açar.'),
            new SlashCommandBuilder().setName('tumunu-kapat').setDescription('Tüm sistemleri aynı anda kapatır.'),
            
            // Moderasyon Komutları
            new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı sunucudan yasaklar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true)),
            new SlashCommandBuilder().setName('kick').setDescription('Kullanıcıyı sunucudan atar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(true)),
            new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıya Susturulmuş rolü verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false))
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

    // 1. SUNUCU KONTROLÜ
    if (interaction.guildId !== config.GUILD_ID) {
        return interaction.reply({ content: '❌ Bu komut sadece ana sunucumuzda kullanılabilir.', ephemeral: true });
    }

    // 2. ROL KONTROLÜ
    const hasRole = interaction.member.roles.cache.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yok!', ephemeral: true });
    }

    const command = interaction.commandName;

    // === OYUN YÖNETİM SİSTEMLERİ ===
    if (command === 'oyun-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isGameOpen = durum;
        await interaction.reply(`📢 Oyun durumu güncellendi: **${durum ? 'AÇIK' : 'KAPALI'}**`);
    }
    else if (command === 'market-yonet') {
        const durum = interaction.options.getBoolean('durum');
        status.isMarketOpen = durum;
        await interaction.reply(`🛒 Market durumu güncellendi: **${durum ? 'AÇIK' : 'KAPALI'}**`);
    }
    else if (command === 'tumunu-ac') {
        status.isGameOpen = true;
        status.isMarketOpen = true;
        status.isAdaletSarayOpen = true;
        await interaction.reply(`✅ **Tüm Sistemler (Oyun, Market, Adalet Sarayı) AÇILDI!**`);
    }
    else if (command === 'tumunu-kapat') {
        status.isGameOpen = false;
        status.isMarketOpen = false;
        status.isAdaletSarayOpen = false;
        await interaction.reply(`🚨 **Tüm Sistemler KAPATILDI!**`);
    }

    // === MODERASYON SİSTEMLERİ ===
    else if (command === 'ban' || command === 'kick') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep');
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        // İşlem tipi (Ban veya Kick)
        const actionText = command === 'ban' ? 'banlandınız' : 'atıldınız';

        // DM İçin Embed Mesaj Oluşturma
        const dmEmbed = new EmbedBuilder()
            .setColor('#FF0000') // Kırmızı renk
            .setTitle('🚨 Sunucudan Uzaklaştırıldınız!')
            .setDescription(`**${reason}** sebebiyle **${interaction.guild.name}** sunucusundan ${actionText}.. Baybay!`)
            .setTimestamp();

        try {
            // Önce DM atmayı dener (Kişi DM kapatmışsa hata verir, o yüzden try-catch içinde)
            await user.send({ embeds: [dmEmbed] });
        } catch (error) {
            console.log("Kullanıcının DM'leri kapalı olduğu için mesaj gönderilemedi.");
        }

        try {
            // Sonra işlemi uygular
            if (command === 'ban') {
                await member.ban({ reason: reason });
                await interaction.reply(`🔨 **${user.tag}** sunucudan başarıyla banlandı. Sebep: ${reason}`);
            } else {
                await member.kick(reason);
                await interaction.reply(`👢 **${user.tag}** sunucudan başarıyla atıldı. Sebep: ${reason}`);
            }
        } catch (error) {
            await interaction.reply({ content: 'Bunu yapmaya yetkim yok! (Botun rolü, yasaklanacak kişinin rolünden üstte olmalı)', ephemeral: true });
        }
    }
    else if (command === 'mute') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı. config.json ID\'sini kontrol edin.', ephemeral: true });

        try {
            await member.roles.add(muteRole, reason);
            await interaction.reply(`🔇 **${user.tag}** başarıyla susturuldu. Sebep: ${reason}`);
        } catch (error) {
            await interaction.reply({ content: 'Kullanıcıya rol verilemedi! Botun yetkilerini kontrol edin.', ephemeral: true });
        }
    }
});

const PORT = process.env.PORT || config.PORT;
startApi(PORT); 
client.login(TOKEN);