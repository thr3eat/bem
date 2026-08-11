const { Events } = require('discord.js');
const { selamlamaTetikleyicileri, cevapHavuzu, rastgeleCevap } = require('../modules/selamlamaUtils');
const { selamlamaCooldown, selamlamaDurum } = require('../modules/stats');

const COOLDOWN_MS = 6000;
const YETKILI_USER_ID = '1031620522406072350';

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;

        const icerik = message.content.trim().toLowerCase();
        if (!icerik) return;

        // 1031620522406072350 idli kişi için !durma ve !basslatma komutları
        if (message.author.id === YETKILI_USER_ID) {
            if (icerik === '!durma') {
                selamlamaDurum.aktif = false;
                try {
                    await message.reply('🛑 **Tüm otomatik selamlamalar ve yanıtlar durduruldu.**');
                } catch (err) {
                    console.error('[SELAMLAMA] !durma yanıtı verilemedi:', err.message);
                }
                return;
            }

            if (icerik === '!basslatma' || icerik === '!baslatma' || icerik === '!başlatma') {
                selamlamaDurum.aktif = true;
                try {
                    await message.reply('▶️ **Tüm otomatik selamlamalar ve yanıtlar tekrar başlatıldı.**');
                } catch (err) {
                    console.error('[SELAMLAMA] !basslatma yanıtı verilemedi:', err.message);
                }
                return;
            }
        }

        // Selamlama sistemi durdurulmuşsa çalıştırma
        if (!selamlamaDurum.aktif) return;

        if (!message.guild) return;

        // Desen eşleşmesi kontrol et (tam eşleşme)
        const eslesen = selamlamaTetikleyicileri.find(d => d.kelimeler.includes(icerik));
        if (!eslesen) return;

        // "iyiyim" cevabı için sadece bota yanıt (reply) verdiyse çalışsın
        if (eslesen.tip === 'iyiyim') {
            if (!message.reference || !message.reference.messageId) return;
            
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                if (!repliedMessage || repliedMessage.author.id !== client.user.id) return;
            } catch {
                return;
            }
        }

        // Cooldown kontrolü
        const cooldownKey = `${message.author.id}_${message.channelId}`;
        const sonSelam = selamlamaCooldown.get(cooldownKey);
        if (sonSelam && (Date.now() - sonSelam < COOLDOWN_MS)) return;

        selamlamaCooldown.set(cooldownKey, Date.now());

        const havuz = cevapHavuzu[eslesen.tip];
        const cevap = rastgeleCevap(havuz, message.member?.displayName || message.author.username);

        if (cevap) {
            try {
                await message.reply({ content: cevap });
            } catch (error) {
                console.error('[SELAMLAMA HATA]', error);
            }
        }
    },
};
