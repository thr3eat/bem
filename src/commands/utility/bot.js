const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    ThumbnailBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
    version,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bot')
        .setDescription('Bot hakkında bilgi gösterir.'),

    async execute(interaction, client) {
        const uptime  = process.uptime();
        const days    = Math.floor(uptime / 86400);
        const hours   = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);
        const memMB   = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 🤖 Bot Bilgisi')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `🏷️ **Bot Adı** — ${client.user.tag}\n` +
                    `🆔 **Bot ID** — ${client.user.id}\n` +
                    `🌐 **Sunucu Sayısı** — ${client.guilds.cache.size}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `⏱️ **Uptime** — ${days}g ${hours}s ${minutes}d ${seconds}sn\n` +
                    `📡 **Ping** — ${client.ws.ping}ms\n` +
                    `💾 **Bellek** — ${memMB} MB`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `📦 **Node.js** — ${process.version}\n` +
                    `📚 **discord.js** — v${version}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Sentura 🦸 ekoyildiz Sistemleri • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
