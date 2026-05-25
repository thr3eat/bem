const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { getRobloxUser, getUserRankInGroup, setRobloxRank } = require('../../modules/robloxApi');
const { rankList } = require('../../modules/constants');
const { buildModEmbed, sendLog } = require('../../modules/embedBuilders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rutbedegistir')
        .setDescription('Kullanıcıya listeden bir rütbe atar.')
        .addStringOption(opt =>
            opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)
        )
        .addIntegerOption(opt =>
            opt.setName('rutbe_id').setDescription('Atanacak rütbeyi listeden seçin').setRequired(true).setAutocomplete(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        const filtered = rankList.filter(r => r.name.toLowerCase().includes(focusedValue.toLowerCase()));
        await interaction.respond(filtered.slice(0, 25).map(r => ({ name: r.name, value: r.id })));
    },

    async execute(interaction, client) {
        const username    = interaction.options.getString('roblox_adi');
        const requestedId = interaction.options.getInteger('rutbe_id');
        await interaction.deferReply();

        try {
            const robloxUser = await getRobloxUser(username);
            if (!robloxUser)
                return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);

            const currentRankData = await getUserRankInGroup(robloxUser.id);
            if (currentRankData.rank === 0)
                return interaction.editReply(`❌ **${robloxUser.name}** emniyet grubumuzda bulunmuyor.`);

            const newRankObj = rankList.find(r => r.id === requestedId);
            if (!newRankObj) return interaction.editReply(`❌ Geçersiz rütbe ID'si seçildi.`);

            const oldRankObj = rankList.find(r => r.id === currentRankData.rank) || { name: currentRankData.name };
            await setRobloxRank(robloxUser.id, newRankObj.id);

            const isTenzil    = newRankObj.id < currentRankData.rank;
            const accentColor = isTenzil ? 0xFF4444 : 0x00FF88;
            const baslik      = isTenzil ? '🔻 Rütbe Düşürme Başarılı' : '🆙 Rütbe Değişikliği Başarılı';

            const container = new ContainerBuilder()
                .setAccentColor(accentColor)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${baslik}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `👤 **Kullanıcı** — ${robloxUser.name}\n` +
                        `🆔 **Roblox ID** — ${robloxUser.id}\n` +
                        `📊 **Eski Rütbe** — ${oldRankObj.name}\n` +
                        `${isTenzil ? '🔻' : '🆙'} **Yeni Rütbe** — ${newRankObj.name}\n` +
                        `👮 **Yetkili** — ${interaction.user.tag}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Sentura 🦸 ekoyildiz • <t:${Math.floor(Date.now() / 1000)}:R>`
                    )
                );

            await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });

            const logEmbed = buildModEmbed('👮 Rütbe Değişikliği', isTenzil ? '#FF0000' : '#00FF00', [
                { name: '👤 Kullanıcı',  value: robloxUser.name,       inline: true },
                { name: '📊 Eski Rütbe', value: oldRankObj.name,       inline: true },
                { name: '🆙 Yeni Rütbe', value: newRankObj.name,       inline: true },
                { name: '👮 Yetkili',    value: interaction.user.tag,  inline: true },
                { name: '🆔 Roblox ID',  value: String(robloxUser.id), inline: true },
            ]);
            await sendLog(client, logEmbed);

        } catch (error) {
            await interaction.editReply(`❌ Hata: ${error.message}`);
        }
    },
};
