const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lock')
        .setDescription('Kanalı mesaj gönderimine kapatır.')
        .addChannelOption(opt =>
            opt.setName('kanal').setDescription('Kilitlenecek kanal (boş = mevcut)').setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const kanal = interaction.options.getChannel('kanal') || interaction.channel;

        try {
            await kanal.permissionOverwrites.edit(
                interaction.guild.roles.everyone,
                { SendMessages: false },
                { reason: `Kanal kilitlendi | Yetkili: ${interaction.user.tag}` }
            );
            await interaction.reply({ content: `🔒 <#${kanal.id}> kanalı kilitlendi.` });
        } catch (error) {
            await interaction.reply({ content: `❌ Kanal kilitlenemedi: ${error.message}`, flags: 64 });
        }
    },
};
