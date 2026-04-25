const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');
const { status, startApi } = require('./api'); 
const config = require('./config.json'); 

// --- ROBLOX GRUP VE API AYARLARI ---
const ROBLOX_GROUP_ID = 8505535;
const ROMANAGER_API_KEY = "0d268477-793e-4b83-8edc-b936a922c866";

// Rütbe Hiyerarşisi (Sıralı 28 Rütbe)
const rankList = [
    { name: "Akademi Adayı", id: 1 }, { name: "Akademi", id: 3 }, { name: "Polis Memuru Adayı", id: 6 },
    { name: "Polis Memuru", id: 7 }, { name: "Kıdemli Polis Memuru", id: 8 }, { name: "Başpolis Memuru Adayı", id: 9 },
    { name: "Başpolis Memuru", id: 10 }, { name: "Kıdemli Başpolis Memuru", id: 11 }, { name: "Uzm. Başpolis Memuru", id: 12 },
    { name: "Aday Komiser", id: 13 }, { name: "Stajyer Komiser", id: 15 }, { name: "Komiser Yardımcısı", id: 16 },
    { name: "Askomiser", id: 17 }, { name: "Komiser", id: 18 }, { name: "Üskomiser", id: 19 },
    { name: "Başkomiser", id: 20 }, { name: "Amir Adayı", id: 21 }, { name: "Emniyet Amiri", id: 22 },
    { name: "Müdür", id: 23 }, { name: "4. Sınıf Emniyet Müdürü", id: 24 }, { name: "3. Sınıf Emniyet Müdürü", id: 25 },
    { name: "2. Sınıf Emniyet Müdürü", id: 26 }, { name: "1. Sınıf Emniyet Müdürü", id: 27 }, { name: "Emniyet Genel Müdürü", id: 28 },
    { name: "Teftiş Kurulu", id: 29 }, { name: "Teftiş Kurulu Başkan Yardımcısı", id: 30 }, { name: "Teftiş Kurulu Başkanı", id: 31 },
    { name: "Yüksek Polis Kurulu", id: 32 }
];

// --- YARDIMCI FONKSİYONLAR (ROBLOX API) ---
async function getRobloxUser(username) {
    const response = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernames: [username], excludeBannedUsers: false })
    });
    const data = await response.json();
    if (data.data && data.data.length > 0) return data.data[0];
    return null;
}

async function getUserRankInGroup(userId) {
    const response = await fetch(`https://groups.roblox.com/v1/users/${userId}/groups/roles`);
    const data = await response.json();
    if (data && data.data) {
        const group = data.data.find(g => g.group.id === ROBLOX_GROUP_ID);
        if (group) return group.role.rank;
    }
    return 0; 
}

async function setRobloxRank(userId, rankId) {
    const response = await fetch(`https://api.romanager.bot/v1/role/${userId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': ROMANAGER_API_KEY
        },
        body: JSON.stringify({ roleRank: rankId })
    });
    if (!response.ok) throw new Error("RoManager API Hatası");
    return true;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
const TOKEN = process.env.DISCORD_TOKEN; 

// --- KOMUTLARI KAYDETME ---
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        const commands = [
            new SlashCommandBuilder().setName('oyun-yonet').setDescription('Oyunu açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),
            new SlashCommandBuilder().setName('market-yonet').setDescription('Rütbe marketini açar veya kapatır.')
                .addBooleanOption(opt => opt.setName('durum').setDescription('Açık mı?').setRequired(true)),
            new SlashCommandBuilder().setName('tumunu-ac').setDescription('Oyun, Market ve Adalet Sarayını aynı anda açar.'),
            new SlashCommandBuilder().setName('tumunu-kapat').setDescription('Tüm sistemleri aynı anda kapatır.'),
            
            new SlashCommandBuilder().setName('ban').setDescription('Kullanıcıyı sunucudan yasaklar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Banlanacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Ban sebebi').setRequired(true)),
            new SlashCommandBuilder().setName('kick').setDescription('Kullanıcıyı sunucudan atar.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Atılacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Atılma sebebi').setRequired(true)),
            new SlashCommandBuilder().setName('mute').setDescription('Kullanıcıya Susturulmuş rolü verir.')
                .addUserOption(opt => opt.setName('kullanici').setDescription('Susturulacak kişi').setRequired(true))
                .addStringOption(opt => opt.setName('sebep').setDescription('Susturma sebebi').setRequired(false)),
                
            new SlashCommandBuilder().setName('terfi').setDescription('Kullanıcıyı bir üst rütbeye terfi ettirir.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),
            new SlashCommandBuilder().setName('tenzil').setDescription('Kullanıcıyı bir alt rütbeye düşürür.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)),
            
            // DİKKAT: Rütbe değiştir komutunda ID yazmak yerine Otomatik Tamamlama (Autocomplete) açtık!
            new SlashCommandBuilder().setName('rutbedegistir').setDescription('Kullanıcıya listeden bir rütbe atar.')
                .addStringOption(opt => opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true))
                .addIntegerOption(opt => opt.setName('rutbe_id').setDescription('Atanacak rütbeyi listeden seçin (Yazarak arayabilirsiniz)').setRequired(true).setAutocomplete(true))
        ].map(command => command.toJSON());

        await rest.put(Routes.applicationCommands(config.CLIENT_ID), { body: commands });
        console.log('Discord komutları başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komutlar kaydedilirken hata oluştu:', error);
    }
})();

// --- DISCORD ETKİLEŞİMİ VE YETKİ KONTROLÜ ---
client.on('interactionCreate', async interaction => {
    
    // === 1. AUTOCOMPLETE (Açılır Liste Arama Sistemi) ===
    if (interaction.isAutocomplete()) {
        const focusedValue = interaction.options.getFocused();
        // Yazılan kelimeye göre listedeki rütbeleri filtreler
        const filtered = rankList.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
        
        // Discord kuralları gereği ekranda max 25 sonuç gösterebiliriz, bu yüzden slice(0,25) kullanıyoruz
        await interaction.respond(
            filtered.slice(0, 25).map(choice => ({ name: choice.name, value: choice.id }))
        );
        return;
    }

    // Normal komutlar için devam et
    if (!interaction.isChatInputCommand()) return;

    if (interaction.guildId !== config.GUILD_ID) {
        return interaction.reply({ content: '❌ Bu komut sadece ana sunucumuzda kullanılabilir.', ephemeral: true });
    }

    const hasRole = interaction.member.roles.cache.has(config.REQUIRED_ROLE_ID);
    if (!hasRole) {
        return interaction.reply({ content: '❌ Bu komutu kullanmak için yetkiniz yok!', ephemeral: true });
    }

    const command = interaction.commandName;

    // === ROBLOX RÜTBE SİSTEMLERİ ===
    if (command === 'terfi' || command === 'tenzil' || command === 'rutbedegistir') {
        await interaction.deferReply(); 

        const username = interaction.options.getString('roblox_adi');
        const robloxUser = await getRobloxUser(username);

        if (!robloxUser) {
            return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);
        }

        const currentRankId = await getUserRankInGroup(robloxUser.id);
        if (currentRankId === 0) {
            return interaction.editReply(`❌ **${robloxUser.name}** isimli kullanıcı emniyet grubumuzda değil!`);
        }

        const currentIndex = rankList.findIndex(r => r.id === currentRankId);
        let newRankObj;

        try {
            if (command === 'terfi') {
                if (currentIndex === -1 || currentIndex >= rankList.length - 1) {
                    return interaction.editReply(`❌ Kullanıcı zaten en yüksek rütbede veya rütbesi listede yok.`);
                }
                newRankObj = rankList[currentIndex + 1];
            } 
            else if (command === 'tenzil') {
                if (currentIndex <= 0) {
                    return interaction.editReply(`❌ Kullanıcı daha fazla rütbe düşürülemez.`);
                }
                newRankObj = rankList[currentIndex - 1];
            } 
            else if (command === 'rutbedegistir') {
                // Kullanıcı listeden rütbenin adını seçer ama biz kodda seçtiği rütbenin değerini (value = ID) alırız.
                const requestedId = interaction.options.getInteger('rutbe_id');
                newRankObj = rankList.find(r => r.id === requestedId);
                
                if (!newRankObj) {
                    return interaction.editReply(`❌ Geçersiz bir rütbe seçimi yapıldı.`);
                }
            }

            await setRobloxRank(robloxUser.id, newRankObj.id);

            const embed = new EmbedBuilder()
                .setColor(command === 'tenzil' ? '#FF0000' : '#00FF00')
                .setTitle('👮 Rütbe Güncellemesi Başarılı')
                .addFields(
                    { name: '👤 Kullanıcı', value: robloxUser.name, inline: true },
                    { name: '🔄 Yeni Rütbe', value: `${newRankObj.name}`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Bursa Emniyet Müdürlüğü Sistemleri' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            await interaction.editReply(`❌ Rütbe değiştirilirken bir hata oluştu. RoManager API'sini veya yetkileri kontrol edin.`);
            console.error(error);
        }
        return;
    }

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

        const actionText = command === 'ban' ? 'banlandınız' : 'atıldınız';
        const dmEmbed = new EmbedBuilder()
            .setColor('#FF0000') 
            .setTitle('🚨 Sunucudan Uzaklaştırıldınız!')
            .setDescription(`**${reason}** sebebiyle **${interaction.guild.name}** sunucusundan ${actionText}.. Baybay!`)
            .setTimestamp();

        try { await user.send({ embeds: [dmEmbed] }); } catch (error) { }

        try {
            if (command === 'ban') {
                await member.ban({ reason: reason });
                await interaction.reply(`🔨 **${user.tag}** sunucudan başarıyla banlandı. Sebep: ${reason}`);
            } else {
                await member.kick(reason);
                await interaction.reply(`👢 **${user.tag}** sunucudan başarıyla atıldı. Sebep: ${reason}`);
            }
        } catch (error) {
            await interaction.reply({ content: 'Bunu yapmaya yetkim yok!', ephemeral: true });
        }
    }
    else if (command === 'mute') {
        const user = interaction.options.getUser('kullanici');
        const reason = interaction.options.getString('sebep') || 'Belirtilmedi';
        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        if (!member) return interaction.reply({ content: 'Bu kullanıcı sunucuda bulunamadı!', ephemeral: true });

        const muteRole = interaction.guild.roles.cache.get(config.MUTE_ROLE_ID);
        if (!muteRole) return interaction.reply({ content: '❌ Susturulmuş rolü bulunamadı.', ephemeral: true });

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
