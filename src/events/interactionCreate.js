const { Events, Collection } = require('discord.js');
const configManager = require('../modules/configManager');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            // Sunucu ve yetki kontrolü (Yalnızca belirtilen sunucuda ve rolde olanlar kullanabilir)
            const allowedGuildId = configManager.get('ALLOWED_GUILD_ID', '1483482948320891074');
            const allowedRoleId = configManager.get('ALLOWED_ROLE_ID', '1521519524812165280');

            const roles = interaction.member?.roles;
            const hasRole = roles && (
                (typeof roles.cache?.has === 'function' && roles.cache.has(allowedRoleId)) ||
                (Array.isArray(roles) && roles.includes(allowedRoleId))
            );

            if (interaction.guildId !== allowedGuildId || !hasRole) {
                return interaction.reply({
                    content: '❌ Bu botun komutlarını kullanma yetkiniz bulunmamaktadır.',
                    flags: 64 // Ephemeral (sadece kullanıcıya görünür)
                });
            }

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
            // Sunucu ve yetki kontrolü (Autocomplete için de sınırla)
            const allowedGuildId = configManager.get('ALLOWED_GUILD_ID', '1483482948320891074');
            const allowedRoleId = configManager.get('ALLOWED_ROLE_ID', '1521519524812165280');

            const roles = interaction.member?.roles;
            const hasRole = roles && (
                (typeof roles.cache?.has === 'function' && roles.cache.has(allowedRoleId)) ||
                (Array.isArray(roles) && roles.includes(allowedRoleId))
            );

            if (interaction.guildId !== allowedGuildId || !hasRole) {
                return;
            }

            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error(`[❌] Autocomplete hatası [${interaction.commandName}]:`, error);
            }

        } else if (interaction.isButton()) {
            const isCustom = [
                'eko_approve_', 'eko_reject_', 'roblox_still_in_group_', 'roblox_not_in_group_',
                'user_rate_btn', 'user_reply_btn', 'user_end_btn', 'mod_reply_btn_', 'mod_end_btn_',
                'eko_undo_', 'eko_mod_send_msg_', 'ekocan_role_btn', 'ekocancik_role_btn'
            ].some(prefix => interaction.customId.startsWith(prefix));

            if (isCustom) {
                const { handleCustomInteraction } = require('../modules/interactionHandlerExt');
                try {
                    await handleCustomInteraction(interaction, client);
                } catch (error) {
                    console.error('[❌] Özel buton hatası:', error);
                    await interaction.reply({ content: '❌ Buton işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
                }
            } else {
                const { handleButtonInteraction } = require('../modules/buttonHandler');
                try {
                    await handleButtonInteraction(interaction, client);
                } catch (error) {
                    console.error('[❌] Buton hatası:', error);
                    await interaction.reply({ content: '❌ Buton işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
                }
            }
        } else if (interaction.isModalSubmit()) {
            const { handleCustomInteraction } = require('../modules/interactionHandlerExt');
            try {
                await handleCustomInteraction(interaction, client);
            } catch (error) {
                console.error('[❌] Modal hatası:', error);
                await interaction.reply({ content: '❌ Modal işlenirken bir hata oluştu.', flags: 64 }).catch(() => {});
            }
        }
    },
};
