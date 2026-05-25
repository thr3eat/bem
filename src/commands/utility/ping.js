const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikme süresini gösterir.'),

    async execute(interaction, client) {
        const ping = client.ws.ping;
        const durum = ping < 100 ? '🟢 Mükemmel' : ping < 200 ? '🟡 İyi' : '🔴 Yüksek';

        const container = new ContainerBuilder()
            .setAccentColor(ping < 100 ? 0x00FF88 : ping < 200 ? 0xFFD700 : 0xFF4444)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 🏓 Pong!\n📡 **Gecikme** — \`${ping}ms\`\n📶 **Durum** — ${durum}`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
