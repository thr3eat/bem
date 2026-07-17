const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { selamlamaCooldown, kullaniciRuhuHali } = require('../../modules/stats');
const { selamlamaTetikleyicileri } = require('../../modules/selamlamaUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('selamlama-istatistik')
        .setDescription('Selamlama sisteminin istatistiklerini gösterir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const cooldownSayisi = selamlamaCooldown.size;
        const ruhalSayisi    = kullaniciRuhuHali.size;
        const desenSayisi    = selamlamaTetikleyicileri.length;

        const container = new ContainerBuilder()
            .setAccentColor(0x5865F2)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    '## 💬 Selamlama Sistemi — İstatistikler'
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `⏱️ **Aktif Cooldown** — ${cooldownSayisi} kullanıcı\n` +
                    `😊 **Takip Edilen Ruh Hali** — ${ruhalSayisi} kullanıcı\n` +
                    `📊 **Tanımlı Selamlama Deseni** — ${desenSayisi} desen\n` +
                    `⚡ **Cooldown Süresi** — 6 saniye`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Eko Yıldız Selamlama Sistemi • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2 | 64,
        });
    },
};
