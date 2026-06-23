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

let ekoKarsilamaMesajId = null;

async function ekoKarsilamaMesajiniGonder(client) {
    try {
        const guild = await client.guilds.fetch(EKO_GUILD_ID).catch(() => null);
        if (!guild) return;
        const kanal = await guild.channels.fetch(EKO_KANAL_ID).catch(() => null);
        if (!kanal) return;

        const mesajlar = await kanal.messages.fetch({ limit: 50 }).catch(() => null);
        if (mesajlar) {
            const mevcutMesaj = mesajlar.find(
                m => m.author.id === client.user.id && m.pinned && m.embeds.some(e => e.title === '⭐ Eko Yıldız Abone Rolü Nasıl Alınır?')
            );
            if (mevcutMesaj) {
                ekoKarsilamaMesajId = mevcutMesaj.id;
                console.log('[📌 EKO] Bilgilendirme mesajı zaten mevcut, izleniyor.');
                return;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('⭐ Eko Yıldız Abone Rolü Nasıl Alınır?')
            .setDescription(
                `Aramıza hoş geldin! YouTube kanalımıza abone olarak özel rolü hemen alabilirsin.\n\n` +
                `**📌 Adım Adım Rol Alma Rehberi:**\n\n` +
                `1️⃣ **Abone Ol:** Öncelikli olarak [YouTube Eko Yıldız](https://www.youtube.com/@eko8yildiz) kanalına abone ol.\n\n` +
                `2️⃣ **Ekran Görüntüsü Al:** YouTube kanalına abone olduğuna dair net bir ekran görüntüsü (kanıt) al.\n\n` +
                `3️⃣ **Buraya Gönder:** Aldığın ekran görüntüsünü (fotoğrafı) **bu kanala** yükleyerek gönder.\n\n` +
                `⚡ Sistem ekran görüntüsünü otomatik olarak kontrol edecek ve sana **<@&${EKO_ROL_ID}>** rolünü anında verecektir! 🎉`
            )
            .setTimestamp()
            .setFooter({ text: 'Eko Yıldız Otomasyon Sistemi | Sentura 🦸 ekoyildiz' });

        const yeniMesaj = await kanal.send({ embeds: [embed] });
        ekoKarsilamaMesajId = yeniMesaj.id;

        await yeniMesaj.pin().catch(() => {});
        console.log('[📌 EKO] Bilgilendirme mesajı gönderildi ve sabitlendi.');

        // Sistem sabitleme mesajını sil
        setTimeout(async () => {
            const sonMesajlar = await kanal.messages.fetch({ limit: 5 }).catch(() => null);
            if (sonMesajlar) {
                const sistemMesaji = sonMesajlar.find(m => m.system && m.type === 6);
                if (sistemMesaji) await sistemMesaji.delete().catch(() => {});
            }
        }, 3000);

    } catch (err) {
        console.error('[❌ EKO] Bilgilendirme mesajı gönderilemedi:', err.message);
    }
}

module.exports = {
    ekoAbonerDatabase, ekoDailyStats, ekoCooldownSet,
    ekoFotografVarMi, ekoGuncelleIstatistik,
    ekoAboneDMEmbed, ekoKanalTebrikEmbed, ekoLogEmbed,
    EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID,
    ekoKarsilamaMesajiniGonder, getEkoKarsilamaMesajId: () => ekoKarsilamaMesajId
};
