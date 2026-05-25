const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { status } = require('../../api');

// ─── Components V2 panel oluşturucu (hem /sistem-kontrol hem de buton güncellemesi için) ───
function buildSistemKontrolV2(interaction) {
    const gameState   = status.isGameOpen        ? '🟢 **AÇIK**'   : '🔴 **KAPALI**';
    const marketState = status.isMarketOpen      ? '🟢 **AÇIK**'   : '🔴 **KAPALI**';
    const adaletState = status.isAdaletSarayOpen ? '🟢 **AÇIK**'   : '🔴 **KAPALI**';

    const container = new ContainerBuilder()
        .setAccentColor(0x2B2D31)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                '## 🎛️ Eko Yıldız — Sistem Kontrol Paneli\n' +
                'Aşağıdaki butonlarla Roblox oyun sistemlerini **anında** açıp kapatabilirsiniz.'
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `🎮 **Ana Oyun Girişleri** — ${gameState}\n` +
                `🛒 **Rütbe Market** — ${marketState}\n` +
                `⚖️ **Adalet Sarayı** — ${adaletState}`
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_toggle_game')
                    .setLabel('Oyun Girişleri')
                    .setEmoji('🎮')
                    .setStyle(status.isGameOpen ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('btn_toggle_market')
                    .setLabel('Rütbe Market')
                    .setEmoji('🛒')
                    .setStyle(status.isMarketOpen ? ButtonStyle.Success : ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('btn_toggle_adalet')
                    .setLabel('Adalet Sarayı')
                    .setEmoji('⚖️')
                    .setStyle(status.isAdaletSarayOpen ? ButtonStyle.Success : ButtonStyle.Danger)
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_all_open')
                    .setLabel('Tümünü Aç')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('btn_all_close')
                    .setLabel('Tümünü Kapat')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Secondary)
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `-# 🔑 Panel erişimi: ${interaction.user.tag} • <t:${Math.floor(Date.now() / 1000)}:R>`
            )
        );

    return container;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sistem-kontrol')
        .setDescription('Roblox sistemleri için gelişmiş butonlu kontrol paneli açar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    buildSistemKontrolV2, // buttonHandler'dan da erişilebilsin

    async execute(interaction) {
        const container = buildSistemKontrolV2(interaction);
        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
