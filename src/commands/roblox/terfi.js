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
        .setName('terfi')
        .setDescription('Kullanıcıyı bir üst rütbeye terfi ettirir.')
        .addStringOption(opt =>
            opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction, client) {
        const username = interaction.options.getString('roblox_adi');
        await interaction.deferReply();

        try {
            const robloxUser = await getRobloxUser(username);
            if (!robloxUser)
                return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);

            const currentRankData = await getUserRankInGroup(robloxUser.id);
            if (currentRankData.rank === 0)
                return interaction.editReply(`❌ **${robloxUser.name}** emniyet grubumuzda bulunmuyor.`);

            const currentIndex = rankList.findIndex(r => r.id === currentRankData.rank);
            if (currentIndex === -1 || currentIndex >= rankList.length - 1)
                return interaction.editReply(`❌ Kullanıcı daha fazla terfi ettirilemez (en üst rütbede).`);

            const newRankObj = rankList[currentIndex + 1];
            const oldRankObj = rankList[currentIndex] || { name: currentRankData.name };

            await setRobloxRank(robloxUser.id, newRankObj.id);

            const container = new ContainerBuilder()
                .setAccentColor(0x00FF88)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 🆙 Terfi İşlemi Başarılı')
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `👤 **Kullanıcı** — ${robloxUser.name}\n` +
                        `🆔 **Roblox ID** — ${robloxUser.id}\n` +
                        `📊 **Eski Rütbe** — ${oldRankObj.name}\n` +
                        `🆙 **Yeni Rütbe** — ${newRankObj.name}\n` +
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

            // Log kanalına embed gönder
            const logEmbed = buildModEmbed('👮 Terfi İşlemi', '#00FF00', [
                { name: '👤 Kullanıcı',  value: robloxUser.name,      inline: true },
                { name: '📊 Eski Rütbe', value: oldRankObj.name,      inline: true },
                { name: '🆙 Yeni Rütbe', value: newRankObj.name,      inline: true },
                { name: '👮 Yetkili',    value: interaction.user.tag, inline: true },
                { name: '🆔 Roblox ID',  value: String(robloxUser.id), inline: true },
            ]);
            await sendLog(client, logEmbed);

        } catch (error) {
            await interaction.editReply(`❌ Hata: ${error.message}`);
        }
    },
};
