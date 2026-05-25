const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { EKO_GUILD_ID, EKO_KANAL_ID, EKO_ROL_ID, ekoFotografVarMi } = require('../../modules/ekoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-toplu-rol')
        .setDescription('Kanalda fotoğraf paylaşmış herkese Eko Yıldız rolü verir (toplu).')
        .addIntegerOption(opt =>
            opt.setName('limit')
                .setDescription('Kaç mesaj taransın? (max 100, varsayılan 100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(false)
        ),

    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID)
            return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        await interaction.deferReply({ flags: 64 });

        const guild = client.guilds.cache.get(EKO_GUILD_ID);
        if (!guild) return interaction.editReply('❌ Sunucu bulunamadı.');

        const rol = guild.roles.cache.get(EKO_ROL_ID);
        if (!rol) return interaction.editReply('❌ Eko Yıldız rolü bulunamadı.');

        const kanal = guild.channels.cache.get(EKO_KANAL_ID);
        if (!kanal) return interaction.editReply('❌ Eko kanalı bulunamadı.');

        const limit = interaction.options.getInteger('limit') ?? 100;

        let mesajlar;
        try {
            mesajlar = await kanal.messages.fetch({ limit });
        } catch {
            return interaction.editReply('❌ Mesajlar alınamadı.');
        }

        const fotografPaylasanlar = new Set();
        mesajlar.forEach(m => {
            if (!m.author.bot && ekoFotografVarMi(m)) {
                fotografPaylasanlar.add(m.author.id);
            }
        });

        if (fotografPaylasanlar.size === 0) {
            return interaction.editReply(`ℹ️ Son ${limit} mesajda fotoğraf paylaşan kullanıcı bulunamadı.`);
        }

        await guild.members.fetch();
        let verildi = 0, atildi = 0, hata = 0;

        for (const userId of fotografPaylasanlar) {
            const m = guild.members.cache.get(userId);
            if (!m) { hata++; continue; }

            if (!m.roles.cache.has(EKO_ROL_ID)) {
                try {
                    await m.roles.add(rol, 'Toplu rol verme işlemi');
                    verildi++;
                } catch {
                    hata++;
                }
            } else {
                atildi++;
            }
            await new Promise(r => setTimeout(r, 100)); // Rate limit koruması
        }

        const accentColor = hata > 0 ? 0xFF4444 : verildi > 0 ? 0x00FF88 : 0x888888;

        const container = new ContainerBuilder()
            .setAccentColor(accentColor)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 📊 Toplu Rol İşlemi Tamamlandı')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `✅ **Rol Verildi** — ${verildi} kişi\n` +
                    `⏩ **Zaten Vardı** — ${atildi} kişi\n` +
                    `❌ **Hata** — ${hata} kişi\n` +
                    `🔍 **Taranan Mesaj** — ${limit}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# İşlemi yapan: ${interaction.user.tag} • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });
    },
};
