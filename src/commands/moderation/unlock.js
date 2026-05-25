const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unlock')
        .setDescription('Kanalı tekrar mesaj gönderimine açar.')
        .addChannelOption(opt =>
            opt.setName('kanal').setDescription('Açılacak kanal (boş = mevcut)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        try {
            await kanal.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                { SendMessages: null }, // null = varsayılan izne dön
                { reason: `Kanal kilidi açıldı | Yetkili: ${interaction.user.tag}` }
            );
            await interaction.reply({ content: `🔓 <#${kanal.id}> kanalının kilidi açıldı.` });
        } catch (error) {
            await interaction.reply({ content: `❌ Kanal kilidi açılamadı: ${error.message}`, flags: 64 });
        }
    },
};
