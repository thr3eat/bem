// ============================================================
//  EMBED BUILDERS
// ============================================================

const { EmbedBuilder } = require('discord.js');
const { colorMap, iconMap, titleMap, config } = require('./constants');

// ============================================================
//  MODERATION EMBED
// ============================================================
function buildModEmbed(title, color, fields, footerText = 'Sentura 🦸 ekoyildiz') {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .addFields(fields)
        .setTimestamp()
        .setFooter({ text: footerText });
}

// ============================================================
//  DM EMBED
// ============================================================
function buildDMEmbed(action, guildName, moderatorTag, reason, extra = '') {
    const embed = new EmbedBuilder()
        .setColor(colorMap[action] || '#888888')
        .setTitle(`${iconMap[action]} ${titleMap[action]}`)
        .addFields(
            { name: '🏠 Sunucu', value: guildName, inline: true },
            { name: '👮 Yetkili', value: moderatorTag, inline: true },
            { name: '📋 Sebep', value: reason || 'Belirtilmedi', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Sentura 🦸 ekoyildiz | İtiraz için yetkililere başvurun.' });
    if (extra) embed.addFields({ name: '📌 Ek Bilgi', value: extra, inline: false });
    return embed;
}

// ============================================================
//  DM SENDING
// ============================================================
async function sendDM(user, embed) {
    try {
        await user.send({ embeds: [embed] });
        return true;
    } catch {
        return false;
    }
}

// ============================================================
//  LOG CHANNEL SENDING
// ============================================================
async function sendLog(client, embed) {
    if (!config.LOG_CHANNEL_ID) return;
    try {
        const channel = await client.channels.fetch(config.LOG_CHANNEL_ID);
        if (channel) await channel.send({ embeds: [embed] });
    } catch { }
}

// ============================================================
//  EKO YILDIZ EMBEDS
// ============================================================
function ekoLogEmbed(member, yeniAbone, fotoSayi, dmDurumu) {
    return new EmbedBuilder()
        .setColor(yeniAbone ? '#00FF88' : '#888888')
        .setTitle(yeniAbone ? '⭐ Eko Yıldız — Yeni Abone' : '📸 Eko Yıldız — Fotoğraf')
        .addFields(
            { name: '👤 Kullanıcı', value: `${member.user.tag} (${member.user.id})`, inline: true },
            { name: '🆕 Yeni Abone mi?', value: yeniAbone ? '✅ Evet' : '❌ Hayır (zaten abone)', inline: true },
            { name: '📸 Toplam Fotoğraf', value: `${fotoSayi}`, inline: true },
            { name: '📩 DM Durumu', value: dmDurumu ? '✅ Gönderildi' : '❌ Gönderilemedi (DM kapalı)', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Otomasyon Sistemi' });
}

function ekoAboneDMEmbed(member, toplamFoto) {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⭐ Eko Yıldız — Abone Oldunuz!')
        .addFields(
            { name: '👋 Hoş Geldin', value: `${member.user.tag}`, inline: false },
            { name: '📸 Toplam Fotoğraf', value: `${toplamFoto}`, inline: true },
            { name: '🎁 Ödül', value: 'Eko Yıldız rolü verildi!', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Otomasyon Sistemi' });
}

function ekoKanalTebrikEmbed(member, toplamFoto, yeniAbone) {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle(yeniAbone ? '⭐ Yeni Abone Hoşlandırma!' : '📸 Fotoğraf Paylaşıldı')
        .setDescription(`${member.user.tag} ${yeniAbone ? 'Eko Yıldız abonesi oldu!' : 'fotoğraf paylaştı!'}`)
        .addFields(
            { name: '📸 Toplam Fotoğraf', value: `${toplamFoto}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Otomasyon' });
}

// ============================================================
//  KAYIT SYSTEM EMBEDS
// ============================================================
function kayitBasariliEmbed(robloxUser, oldRankObj, newRankObj, discordUser) {
    const timestamp = Math.floor(Date.now() / 1000);
    return new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ Kayıt Başarılı!')
        .setDescription(`## 🎉 Roblox Hesabı Doğrulandı\n**[${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)** hesabı başarıyla eşleştirildi.\n\n-# Eko Yıldız Otomatik Kayıt Sistemi • <t:${timestamp}:R>`)
        .addFields(
            { name: '👤 Roblox Kullanıcı', value: `\`${robloxUser.name}\``, inline: true },
            { name: '🆔 Roblox ID', value: `\`${robloxUser.id}\``, inline: true },
            { name: '📊 Atanan Rütbe', value: `**${newRankObj?.name || 'Sistem Rütbesi'}**`, inline: false },
            { name: '👮 Discord', value: `${discordUser.tag} (<@${discordUser.id}>)`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
}

function kayitHataEmbed(baslik, mesaj) {
    const timestamp = Math.floor(Date.now() / 1000);
    return new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`❌ ${baslik}`)
        .setDescription(`### ⚠️ Bir Hata Oluştu\n${mesaj}\n\n-# İşlem Zamanı: <t:${timestamp}:R>`)
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
}

function kayitUyariEmbed(baslik, mesaj) {
    const timestamp = Math.floor(Date.now() / 1000);
    return new EmbedBuilder()
        .setColor('#FFA500')
        .setTitle(`⚠️ ${baslik}`)
        .setDescription(`### 📢 Dikkat\n${mesaj}\n\n-# Sistem Uyarısı • <t:${timestamp}:R>`)
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Kayıt Sistemi' });
}

module.exports = {
    buildModEmbed,
    buildDMEmbed,
    sendDM,
    sendLog,
    ekoLogEmbed,
    ekoAboneDMEmbed,
    ekoKanalTebrikEmbed,
    kayitBasariliEmbed,
    kayitHataEmbed,
    kayitUyariEmbed
};
