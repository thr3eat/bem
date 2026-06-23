const { EmbedBuilder } = require('discord.js');
const { EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID, EKO_DM_MESAJ } = require('./constants');
const JsonDatabase = require('./jsonDatabase');

const ekoAbonerDatabase = new JsonDatabase('subscribers.json');
const ekoDailyStats = new Map();
const ekoCooldownSet = new Set();

function ekoFotografVarMi(message) {
    const resimUzantilari = ['jpg','jpeg','png','gif','webp','bmp','tiff','svg','avif','heic','heif'];
    if (message.attachments.some(a => {
        const uzanti = (a.name || '').split('.').pop().toLowerCase();
        return resimUzantilari.includes(uzanti);
    })) return true;

    if (message.attachments.some(a => a.contentType?.startsWith('image/'))) return true;
    if (message.embeds.some(e => e.image || e.thumbnail)) return true;

    const urlRegex = /https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?[^\s]*)?/i;
    if (urlRegex.test(message.content)) return true;

    return false;
}

function ekoGuncelleIstatistik(userId) {
    const bugun = new Date().toISOString().slice(0, 10);
    const gunlukSayi = (ekoDailyStats.get(bugun) || 0) + 1;
    ekoDailyStats.set(bugun, gunlukSayi);

    const mevcut = ekoAbonerDatabase.get(userId) || { count: 0, lastPhotoAt: null, totalPhotos: 0 };
    mevcut.totalPhotos += 1;
    mevcut.lastPhotoAt = new Date();
    ekoAbonerDatabase.set(userId, mevcut);

    return { gunlukSayi, kullaniciFoto: mevcut.totalPhotos };
}

function ekoAboneDMEmbed(member, fotoSayi) {
    return new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('⭐ Eko Yıldız — Hoşgeldiniz!')
        .setDescription(EKO_DM_MESAJ)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: '📸 Paylaştığınız Fotoğraf', value: `${fotoSayi} adet`, inline: true },
            { name: '📅 Abone Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
            { name: '🎭 Kazanılan Rol', value: '⭐ Eko Yıldız Abone', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız | Sentura 🦸 ekoyildiz' });
}

function ekoKanalTebrikEmbed(member, fotoSayi, yeniAbone) {
    const renk = yeniAbone ? '#00FF88' : '#FFD700';
    const baslik = yeniAbone ? `🎉 Yeni Abone! — ${member.user.username}` : `📸 Fotoğraf Paylaşımı — ${member.user.username}`;

    return new EmbedBuilder()
        .setColor(renk)
        .setTitle(baslik)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
        .setDescription(yeniAbone ? `**${member.user.toString()}** aramıza katıldı! ⭐` : `**${member.user.toString()}** yeni bir fotoğraf paylaştı.`)
        .addFields({ name: yeniAbone ? '📸 Toplam Fotoğraf' : '📸 Toplam Fotoğrafı', value: `${fotoSayi}`, inline: true })
        .setTimestamp()
        .setFooter({ text: 'Eko Yıldız Otomasyon | Sentura 🦸 ekoyildiz' });
}

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

module.exports = {
    ekoAbonerDatabase, ekoDailyStats, ekoCooldownSet,
    ekoFotografVarMi, ekoGuncelleIstatistik,
    ekoAboneDMEmbed, ekoKanalTebrikEmbed, ekoLogEmbed,
    EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID
};
