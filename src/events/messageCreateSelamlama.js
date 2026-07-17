const { Events } = require('discord.js');
const { selamlamaTetikleyicileri, cevapHavuzu, rastgeleCevap } = require('../modules/selamlamaUtils');

const { selamlamaCooldown } = require('../modules/stats');
const COOLDOWN_MS = 6000;

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot) return;
        if (!message.guild) return;

        const icerik = message.content.trim().toLowerCase();
        if (!icerik) return;

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
