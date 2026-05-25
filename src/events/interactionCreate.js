const { Events, Collection } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`[⚠️] Komut bulunamadı: ${interaction.commandName}`);
                return;
            }

            // ─── Cooldown ────────────────────────────────────────────
            const { cooldowns } = client;
            if (!cooldowns.has(command.data.name)) {
                cooldowns.set(command.data.name, new Collection());
            }

            const now        = Date.now();
            const timestamps = cooldowns.get(command.data.name);
            const cooldownMs = (command.cooldown ?? 3) * 1000;

            if (timestamps.has(interaction.user.id)) {
                const expiresAt = timestamps.get(interaction.user.id) + cooldownMs;
                if (now < expiresAt) {
                    const expiredTimestamp = Math.round(expiresAt / 1000);
                    return interaction.reply({
                        content: `⏳ Bu komutu tekrar kullanmak için <t:${expiredTimestamp}:R> beklemelisin.`,
                        flags: 64
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

            // ─── Çalıştır ────────────────────────────────────────────
            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[❌] Komut hatası [${interaction.commandName}]:`, error);
                const msg = '❌ Komut çalıştırılırken bir hata oluştu. Lütfen tekrar deneyin.';
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: msg, flags: 64 }).catch(() => {});
                } else {
                    await interaction.reply({ content: msg, flags: 64 }).catch(() => {});
                }
            }

        } else if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`[❌] Autocomplete hatası [${interaction.commandName}]:`, error);
            }

        } else if (interaction.isButton()) {
            const { handleButtonInteraction } = require('../modules/buttonHandler');
            try {
                await handleButtonInteraction(interaction, client);
            } catch (error) {
                console.error('[❌] Buton hatası:', error);
                await interaction.reply({ content: '❌ Buton işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
            }
        }
    },
};
