const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags,
} = require('discord.js');
const { getRobloxUser, getUserRankInGroup } = require('../../modules/robloxApi');
const { rankList } = require('../../modules/constants');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rutbebak')
        .setDescription('Kullanıcının Roblox rütbesini gösterir.')
        .addStringOption(opt =>
            opt.setName('roblox_adi').setDescription('Roblox kullanıcı adı').setRequired(true)
        ),

    async execute(interaction) {
        const username = interaction.options.getString('roblox_adi');
        await interaction.deferReply();

        try {
            const robloxUser = await getRobloxUser(username);
            if (!robloxUser)
                return interaction.editReply(`❌ **${username}** adında bir Roblox kullanıcısı bulunamadı.`);

            const rankData  = await getUserRankInGroup(robloxUser.id);
            if (rankData.rank === 0)
                return interaction.editReply(`❌ **${robloxUser.name}** emniyet grubumuzda bulunmuyor.`);

            const rankObj   = rankList.find(r => r.id === rankData.rank);
            const rankIndex = rankList.findIndex(r => r.id === rankData.rank);
            const nextRank  = rankIndex !== -1 && rankIndex < rankList.length - 1 ? rankList[rankIndex + 1] : null;

            const container = new ContainerBuilder()
                .setAccentColor(0x0099FF)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## 👮 Rütbe Bilgisi — ${robloxUser.name}`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `🏅 **Mevcut Rütbe** — ${rankObj ? rankObj.name : rankData.name}\n` +
                        `🔢 **Rütbe ID** — ${rankData.rank}\n` +
                        `📊 **Sıralama** — ${rankIndex !== -1 ? `${rankIndex + 1}/${rankList.length}` : 'Bilinmiyor'}\n` +
                        `⬆️ **Sonraki Rütbe** — ${nextRank ? nextRank.name : '🏆 En Yüksek Rütbe'}\n` +
                        `🆔 **Roblox ID** — ${robloxUser.id}`
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
        } catch (error) {
            await interaction.editReply(`❌ Hata: ${error.message}`);
        }
    },
};
