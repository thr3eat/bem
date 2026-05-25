const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { rankList } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rutbelist')
        .setDescription('Tüm rütbe listesini gösterir.'),

    async execute(interaction) {
        // Rütbeleri tek bir metin bloğuna sığdır (Discord 4096 char limiti)
        const satirlar = rankList.map(r =>
            `\`${String(r.id).padStart(3)}\` — ${r.name}`
        );

        // ~40 satır = ~1 container, gerekirse böl
        const CHUNK = 20;
        const parcalar = [];
        for (let i = 0; i < satirlar.length; i += CHUNK) {
            parcalar.push(satirlar.slice(i, i + CHUNK).join('\n'));
        }

        const container = new ContainerBuilder()
            .setAccentColor(0x0099FF)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `## 📋 Rütbe Listesi\n-# Toplam ${rankList.length} rütbe`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            );

        for (const parca of parcalar) {
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(parca)
            );
            if (parcalar.indexOf(parca) < parcalar.length - 1) {
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                );
            }
        }

        container
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Sentura 🦸 ekoyildiz • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | 64,
        });
    },
};
