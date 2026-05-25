const {
    EmbedBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    MessageFlags,
} = require('discord.js');

const pollVotes = new Map(); // messageId -> { yes: Set, no: Set }

async function handleButtonInteraction(interaction, client) {
    const { customId, message } = interaction;

    // ─── ANKET BUTONLARI ───────────────────────────────────────────────────────
    if (customId === 'poll_yes' || customId === 'poll_no' || customId === 'poll_results') {
        if (!pollVotes.has(message.id)) {
            pollVotes.set(message.id, { yes: new Set(), no: new Set() });
        }
        const votes = pollVotes.get(message.id);

        if (customId === 'poll_yes') {
            if (votes.yes.has(interaction.user.id)) {
                votes.yes.delete(interaction.user.id);
                return interaction.reply({ content: '✅ Evet oyunuz geri alındı.', flags: 64 });
            }
            votes.no.delete(interaction.user.id);
            votes.yes.add(interaction.user.id);
            return interaction.reply({ content: '✅ Evet oyu kaydedildi!', flags: 64 });
        }

        if (customId === 'poll_no') {
            if (votes.no.has(interaction.user.id)) {
                votes.no.delete(interaction.user.id);
                return interaction.reply({ content: '❌ Hayır oyunuz geri alındı.', flags: 64 });
            }
            votes.yes.delete(interaction.user.id);
            votes.no.add(interaction.user.id);
            return interaction.reply({ content: '❌ Hayır oyu kaydedildi!', flags: 64 });
        }

        if (customId === 'poll_results') {
            const total      = votes.yes.size + votes.no.size;
            const yesPercent = total > 0 ? Math.round((votes.yes.size / total) * 100) : 0;
            const noPercent  = total > 0 ? Math.round((votes.no.size  / total) * 100) : 0;
            const yesBar = '█'.repeat(Math.round(yesPercent / 10)) + '░'.repeat(10 - Math.round(yesPercent / 10));
            const noBar  = '█'.repeat(Math.round(noPercent  / 10)) + '░'.repeat(10 - Math.round(noPercent  / 10));

            const container = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 📊 Anket Sonuçları')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `✅ **Evet** — ${votes.yes.size} oy (${yesPercent}%)\n\`${yesBar}\`\n\n` +
                        `❌ **Hayır** — ${votes.no.size} oy (${noPercent}%)\n\`${noBar}\`\n\n` +
                        `🔢 **Toplam Oy** — ${total}`
                    )
                );

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | 64,
            });
        }
    }

    // ─── SİSTEM KONTROL PANELİ BUTONLARI ──────────────────────────────────────
    if (customId.startsWith('btn_toggle_') || customId.startsWith('btn_all_')) {
        const { status } = require('../../api');
        const { buildModEmbed, sendLog } = require('./embedBuilders');
        const { buildSistemKontrolV2 } = require('../commands/admin/sistem-kontrol');

        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return interaction.reply({ content: '❌ Bu butonları kullanmak için yeterli yetkiniz yok!', flags: 64 });
        }

        let systemName = '';
        let newState   = false;

        if (customId === 'btn_toggle_game') {
            status.isGameOpen = !status.isGameOpen;
            newState   = status.isGameOpen;
            systemName = 'Ana Oyun Girişleri';
        } else if (customId === 'btn_toggle_market') {
            status.isMarketOpen = !status.isMarketOpen;
            newState   = status.isMarketOpen;
            systemName = 'Rütbe Market';
        } else if (customId === 'btn_toggle_adalet') {
            status.isAdaletSarayOpen = !status.isAdaletSarayOpen;
            newState   = status.isAdaletSarayOpen;
            systemName = 'Adalet Sarayı';
        } else if (customId === 'btn_all_open') {
            status.isGameOpen = status.isMarketOpen = status.isAdaletSarayOpen = true;
            systemName = 'Tüm Sistemler';
            newState   = true;
        } else if (customId === 'btn_all_close') {
            status.isGameOpen = status.isMarketOpen = status.isAdaletSarayOpen = false;
            systemName = 'Tüm Sistemler';
            newState   = false;
        }

        // Paneli Components V2 ile güncelle
        const container = buildSistemKontrolV2(interaction);
        await interaction.update({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        // Mod log gönder
        const logEmbed = buildModEmbed(
            newState ? '🟢 Sistem Aktif Edildi' : '🔴 Sistem Kapatıldı',
            newState ? '#00FF00' : '#FF0000',
            [
                { name: '⚙️ Sistem',  value: systemName,                    inline: true },
                { name: '📊 Durum',   value: newState ? '**AÇIK**' : '**KAPALI**', inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag,           inline: true },
            ]
        );
        await sendLog(client, logEmbed);
    }
}

module.exports = { handleButtonInteraction };
