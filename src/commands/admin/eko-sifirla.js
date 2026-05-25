const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { ekoAbonerDatabase, ekoCooldownSet, EKO_GUILD_ID } = require('../../modules/ekoUtils');
const { sendLog } = require('../../modules/embedBuilders');
const { buildModEmbed } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eko-sifirla')
        .setDescription('Bir kullanıcının Eko Yıldız abone verilerini sıfırlar.')
        .addUserOption(opt =>
            opt.setName('kullanici').setDescription('Sıfırlanacak kişi').setRequired(true)
        ),

    async execute(interaction, client) {
        if (interaction.guildId !== EKO_GUILD_ID)
            return interaction.reply({ content: '❌ Bu komut sadece Eko sunucusunda kullanılabilir.', flags: 64 });

        const hedef  = interaction.options.getUser('kullanici');
        const onceki = ekoAbonerDatabase.get(hedef.id);

        if (!onceki) {
            return interaction.reply({
                content: `❌ **${hedef.tag}** için Eko Yıldız verisi bulunamadı.`,
                flags: 64,
            });
        }

        ekoAbonerDatabase.delete(hedef.id);

        // Cooldown'u da temizle
        for (const key of ekoCooldownSet) {
            if (key.startsWith(hedef.id)) ekoCooldownSet.delete(key);
        }

        const container = new ContainerBuilder()
            .setAccentColor(0xFF4444)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('## 🗑️ Eko Yıldız Verisi Sıfırlandı')
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `👤 **Kullanıcı** — ${hedef.tag} (${hedef.id})\n` +
                    `📸 **Önceki Fotoğraf Sayısı** — ${onceki.totalPhotos || 0}\n` +
                    `👮 **İşlemi Yapan** — ${interaction.user.tag}`
                )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# Eko Yıldız Otomasyon • <t:${Math.floor(Date.now() / 1000)}:R>`
                )
            );

        await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        // Log kanalına embed gönder
        const logEmbed = buildModEmbed(
            '🗑️ Eko Yıldız Verisi Sıfırlandı',
            '#FF4444',
            [
                { name: '👤 Kullanıcı', value: `${hedef.tag} (${hedef.id})`, inline: true },
                { name: '📸 Önceki Fotoğraf', value: String(onceki.totalPhotos || 0), inline: true },
                { name: '👮 Yetkili', value: interaction.user.tag, inline: true },
            ]
        );
        await sendLog(client, logEmbed);
    },
};
