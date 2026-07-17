const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const JsonDatabase = require('./jsonDatabase');
const {
    EKO_GUILD_ID,
    EKO_ROL_ID,
    KAYIT_GUILD_ID,
    KAYIT_DISCORD_ROL_ID,
    EKO_ONAY_KANAL_ID
} = require('./constants');

const conversationsDb = new JsonDatabase('conversations.json');

/**
 * Helper to update components on a message to remove or disable buttons.
 */
async function disableMessageButtons(message, keepEnabledIds = []) {
    try {
        if (!message || !message.components || message.components.length === 0) return;
        const newRows = [];
        for (const row of message.components) {
            const newRow = ActionRowBuilder.from(row);
            newRow.components.forEach(btn => {
                // If it's a ButtonBuilder, set disabled
                if (typeof btn.setDisabled === 'function') {
                    if (!keepEnabledIds.includes(btn.data.custom_id)) {
                        btn.setDisabled(true);
                    }
                }
            });
            newRows.push(newRow);
        }
        await message.edit({ components: newRows }).catch(() => {});
    } catch (err) {
        console.error('Error disabling buttons:', err.message);
    }
}

/**
 * Helper to remove all components from a message.
 */
async function removeMessageButtons(message) {
    try {
        if (!message) return;
        await message.edit({ components: [] }).catch(() => {});
    } catch (err) {
        console.error('Error removing buttons:', err.message);
    }
}

async function handleCustomInteraction(interaction, client) {
    const { customId } = interaction;

    // =========================================================================
    // 1. BUTTON INTERACTIONS
    // =========================================================================
    if (interaction.isButton()) {
        // --- YouTube: Evet, Gerçek (Approve) ---
        if (customId.startsWith('eko_approve_')) {
            await interaction.deferUpdate();
            const parts = customId.split('_');
            const userId = parts[2];
            
            // Send thank you message in the channel and update approval post
            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor('#00FF88')
                .setTitle('✅ Abone Onaylandı!')
                .setDescription(`${oldEmbed.description}\n\n**Onaylayan Moderatör:** ${interaction.user.toString()}\nTeşekkürler!`);

            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
            return;
        }

        // --- YouTube: Yanlış / Reddet (Reject) ---
        if (customId.startsWith('eko_reject_')) {
            const parts = customId.split('_');
            const userId = parts[2];

            // Defer reply immediately so the interaction doesn't expire
            await interaction.deferReply({ flags: 64 });

            try {
                // Guild member and role management
                const guild = client.guilds.cache.get(EKO_GUILD_ID);
                if (guild) {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (member) {
                        const rol = guild.roles.cache.get(EKO_ROL_ID);
                        if (rol && member.roles.cache.has(EKO_ROL_ID)) {
                            await member.roles.remove(rol, `Abone reddedildi (İşlemi yapan: ${interaction.user.tag})`);
                        }
                    }
                }
            } catch (err) {
                console.error('[EKO REJECT] Rol geri alma hatası:', err.message);
            }

            // Create active conversation session
            conversationsDb.set(userId, {
                userId: userId,
                moderatorId: interaction.user.id,
                moderatorName: interaction.user.tag,
                type: 'youtube',
                status: 'active',
                userEnd: false,
                modEnd: false,
                rating: null,
                comment: null,
                lastMessageFrom: 'system'
            });

            // Send DM to user with interactive feedback options
            try {
                const user = await client.users.fetch(userId).catch(() => null);
                if (user) {
                    const rejectEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ ABONE GERÇEKTEN OLUNMADIĞINIZ ALGILANMIŞTIR!')
                        .setDescription(`YouTube abone onayınız **${interaction.user.tag}** adlı moderatör tarafından reddedilmiştir.\n\n` +
                            `**Dikkat!** Eğer bir sorun varsa lütfen destek talebi (ticket) açın ve soruşturma açılmasını söyleyin.`)
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('user_rate_btn')
                            .setLabel('MODERATÖRÜ PUANLA')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⭐'),
                        new ButtonBuilder()
                            .setCustomId('user_reply_btn')
                            .setLabel('MODERATÖRE CEVAP GÖNDER')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✉️'),
                        new ButtonBuilder()
                            .setCustomId('user_end_btn')
                            .setLabel('GÖRÜŞMEYİ KALICI SONLANDIR')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                    await user.send({ embeds: [rejectEmbed], components: [row] });
                }
            } catch (err) {
                console.warn(`[EKO REJECT] Kullanıcıya DM gönderilemedi (${userId}):`, err.message);
            }

            // Update moderator channel message
            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor('#FF0000')
                .setTitle('❌ Abone Reddedildi!')
                .setDescription(`${oldEmbed.description}\n\n**İşlemi Yapan Moderatör:** ${interaction.user.toString()}`);

            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
            await interaction.editReply({ content: '✅ Abone başarıyla reddedildi ve kullanıcıya bildirim gönderildi.' });
            return;
        }

        // --- Roblox: Evet Hala Grupta ---
        if (customId.startsWith('roblox_still_in_group_')) {
            await interaction.deferUpdate();
            const userId = customId.split('_')[4];

            // Clean check status in robloxChecks database
            try {
                const robloxChecksDb = new JsonDatabase('robloxChecks.json');
                const entry = robloxChecksDb.get(userId);
                if (entry) {
                    entry.status = 'completed';
                    robloxChecksDb.set(userId, entry);
                }
            } catch (err) {
                console.error(err);
            }

            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor('#00FF88')
                .setTitle('✅ Roblox Grup Kontrolü Başarılı')
                .setDescription(`${oldEmbed.description}\n\nKullanıcının grupta olduğu onaylandı.\n**Onaylayan Moderatör:** ${interaction.user.toString()}`);

            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
            return;
        }

        // --- Roblox: Hayır Hala Grupta Değil ---
        if (customId.startsWith('roblox_not_in_group_')) {
            const parts = customId.split('_');
            const userId = parts[4];
            const robloxUserId = parts[5];

            await interaction.deferReply({ flags: 64 });

            // Clean status in robloxChecks database
            try {
                const robloxChecksDb = new JsonDatabase('robloxChecks.json');
                const entry = robloxChecksDb.get(userId);
                if (entry) {
                    entry.status = 'rejected';
                    robloxChecksDb.set(userId, entry);
                }
            } catch (err) {
                console.error(err);
            }

            // Remove Roblox group role
            try {
                const guild = client.guilds.cache.get(KAYIT_GUILD_ID);
                if (guild) {
                    const member = await guild.members.fetch(userId).catch(() => null);
                    if (member) {
                        const rol = guild.roles.cache.get(KAYIT_DISCORD_ROL_ID);
                        if (rol && member.roles.cache.has(KAYIT_DISCORD_ROL_ID)) {
                            await member.roles.remove(rol, `Roblox grubunda bulunmadığı için kayıt iptal edildi (İşlemi yapan: ${interaction.user.tag})`);
                        }
                    }
                }
            } catch (err) {
                console.error('[ROBLOX REJECT] Rol geri alma hatası:', err.message);
            }

            // Create active conversation session
            conversationsDb.set(userId, {
                userId: userId,
                moderatorId: interaction.user.id,
                moderatorName: interaction.user.tag,
                type: 'roblox',
                status: 'active',
                userEnd: false,
                modEnd: false,
                rating: null,
                comment: null,
                lastMessageFrom: 'system'
            });

            // Send rejection notification via DM
            try {
                const user = await client.users.fetch(userId).catch(() => null);
                if (user) {
                    const rejectEmbed = new EmbedBuilder()
                        .setColor('#FF0000')
                        .setTitle('⚠️ ROBLOX GRUBUNDA BULUNMADIĞINIZ ALGILANMIŞTIR!')
                        .setDescription(`Roblox grubunda bulunmadığınız tespit edildiği için kayıt rolünüz **${interaction.user.tag}** adlı mod tarafından alınmıştır.\n\n` +
                            `**Dikkat!** Eğer bir sorun varsa lütfen destek talebi (ticket) açın ve soruşturma açılmasını söyleyin.`)
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('user_rate_btn')
                            .setLabel('MODERATÖRÜ PUANLA')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('⭐'),
                        new ButtonBuilder()
                            .setCustomId('user_reply_btn')
                            .setLabel('MODERATÖRE CEVAP GÖNDER')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✉️'),
                        new ButtonBuilder()
                            .setCustomId('user_end_btn')
                            .setLabel('GÖRÜŞMEYİ KALICI SONLANDIR')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                    await user.send({ embeds: [rejectEmbed], components: [row] });
                }
            } catch (err) {
                console.warn(`[ROBLOX REJECT] Kullanıcıya DM gönderilemedi (${userId}):`, err.message);
            }

            // Update moderator channel message
            const oldEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(oldEmbed)
                .setColor('#FF0000')
                .setTitle('❌ Roblox Grup Kontrolü - Kayıt İptal Edildi')
                .setDescription(`${oldEmbed.description}\n\nKullanıcı grupta bulunmadığı için kaydı iptal edildi.\n**İşlemi Yapan Moderatör:** ${interaction.user.toString()}`);

            await interaction.message.edit({ embeds: [updatedEmbed], components: [] });
            await interaction.editReply({ content: '✅ Roblox kaydı iptal edildi ve kullanıcıya bildirim gönderildi.' });
            return;
        }

        // --- User: Rate Moderator ---
        if (customId === 'user_rate_btn') {
            const conv = conversationsDb.get(interaction.user.id);
            if (!conv || conv.status !== 'active') {
                return interaction.reply({ content: '❌ Aktif bir görüşmeniz bulunmamaktadır.', flags: 64 });
            }

            const modal = new ModalBuilder()
                .setCustomId('user_rate_modal')
                .setTitle('Moderatörü Değerlendir');

            const starsInput = new TextInputBuilder()
                .setCustomId('rating_stars')
                .setLabel('Puan (1-5 arası bir sayı girin)')
                .setPlaceholder('5')
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(1)
                .setRequired(true);

            const commentInput = new TextInputBuilder()
                .setCustomId('rating_comment')
                .setLabel('Yorumunuz')
                .setPlaceholder('Görüşlerinizi yazın...')
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(5)
                .setMaxLength(300)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(starsInput),
                new ActionRowBuilder().addComponents(commentInput)
            );

            await interaction.showModal(modal);
            return;
        }

        // --- User: Send Message to Moderator ---
        if (customId === 'user_reply_btn') {
            const conv = conversationsDb.get(interaction.user.id);
            if (!conv || conv.status !== 'active') {
                return interaction.reply({ content: '❌ Aktif veya açık bir görüşmeniz bulunmamaktadır.', flags: 64 });
            }

            const modal = new ModalBuilder()
                .setCustomId('user_reply_modal')
                .setTitle('Moderatöre Cevap Gönder');

            const contentInput = new TextInputBuilder()
                .setCustomId('reply_content')
                .setLabel('Cevabınız')
                .setPlaceholder('Moderatöre iletilecek mesajı yazın...')
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(2)
                .setMaxLength(500)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
            await interaction.showModal(modal);
            return;
        }

        // --- User: Permanently End Conversation ---
        if (customId === 'user_end_btn') {
            const conv = conversationsDb.get(interaction.user.id);
            if (!conv || conv.status !== 'active') {
                return interaction.reply({ content: '❌ Aktif bir görüşmeniz bulunmamaktadır.', flags: 64 });
            }

            await interaction.deferReply();

            conv.userEnd = true;
            conversationsDb.set(interaction.user.id, conv);

            if (conv.modEnd) {
                conv.status = 'ended';
                conversationsDb.set(interaction.user.id, conv);

                // Disable buttons in user DM
                await disableMessageButtons(interaction.message);

                await interaction.editReply({ content: '🔒 Görüşme her iki tarafın onayıyla kalıcı olarak sonlandırılmıştır.' });

                // Notify moderator
                try {
                    const mod = await client.users.fetch(conv.moderatorId).catch(() => null);
                    if (mod) {
                        await mod.send(`🔒 **Görüşme Sonlandırıldı:** <@${conv.userId}> ile olan görüşme kalıcı olarak kapatılmıştır.`);
                    }
                } catch {}
            } else {
                await interaction.editReply({ content: '⚠️ Görüşmeyi sonlandırma talebiniz kaydedildi. Moderatör de onayladığında görüşme sonlanacaktır.' });

                // Notify moderator
                try {
                    const mod = await client.users.fetch(conv.moderatorId).catch(() => null);
                    if (mod) {
                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`mod_end_btn_${conv.userId}`)
                                .setLabel('Görüşmeyi Sonlandır')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('🔒')
                        );
                        await mod.send({
                            content: `⚠️ **Görüşme Kapatma İsteği:** <@${conv.userId}> görüşmeyi sonlandırmak istiyor. Görüşmeyi kapatmak için aşağıdaki butona basın.`,
                            components: [row]
                        });
                    }
                } catch {}
            }
            return;
        }

        // --- Moderator: Reply to User ---
        if (customId.startsWith('mod_reply_btn_')) {
            const userId = customId.split('_')[3];
            const conv = conversationsDb.get(userId);
            if (!conv || conv.status !== 'active') {
                return interaction.reply({ content: '❌ Bu görüşme aktif değil veya sonlandırılmış.', flags: 64 });
            }

            const modal = new ModalBuilder()
                .setCustomId(`mod_reply_modal_${userId}`)
                .setTitle('Kullanıcıya Cevap Gönder');

            const contentInput = new TextInputBuilder()
                .setCustomId('reply_content')
                .setLabel('Mesajınız')
                .setPlaceholder('Kullanıcıya iletilecek cevabı yazın...')
                .setStyle(TextInputStyle.Paragraph)
                .setMinLength(2)
                .setMaxLength(500)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
            await interaction.showModal(modal);
            return;
        }

        // --- Moderator: Permanently End Conversation ---
        if (customId.startsWith('mod_end_btn_')) {
            const userId = customId.split('_')[3];
            const conv = conversationsDb.get(userId);
            if (!conv || conv.status !== 'active') {
                return interaction.reply({ content: '❌ Bu görüşme aktif değil veya zaten sonlandırılmış.', flags: 64 });
            }

            await interaction.deferReply();

            conv.modEnd = true;
            conversationsDb.set(userId, conv);

            if (conv.userEnd) {
                conv.status = 'ended';
                conversationsDb.set(userId, conv);

                // Disable buttons in moderator DM
                await disableMessageButtons(interaction.message);

                await interaction.editReply({ content: '🔒 Görüşme her iki tarafın onayıyla kalıcı olarak sonlandırılmıştır.' });

                // Notify user
                try {
                    const user = await client.users.fetch(userId).catch(() => null);
                    if (user) {
                        await user.send(`🔒 **Görüşme Sonlandırıldı:** Yetkili ile olan görüşmeniz kalıcı olarak kapatılmıştır.`);
                    }
                } catch {}
            } else {
                await interaction.editReply({ content: '⚠️ Görüşmeyi sonlandırma talebiniz kaydedildi. Kullanıcı da onayladığında görüşme sonlanacaktır.' });

                // Notify user
                try {
                    const user = await client.users.fetch(userId).catch(() => null);
                    if (user) {
                        const row = new ActionRowBuilder().addComponents(
                            new ButtonBuilder()
                                .setCustomId('user_end_btn')
                                .setLabel('Görüşmeyi Sonlandır')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('🔒')
                        );
                        await user.send({
                            content: `⚠️ **Görüşme Kapatma İsteği:** Yetkili görüşmeyi sonlandırmak istiyor. Görüşmeyi kapatmak için aşağıdaki butona basın.`,
                            components: [row]
                        });
                    }
                } catch {}
            }
            return;
        }
    }

    // =========================================================================
    // 2. MODAL SUBMISSIONS
    // =========================================================================
    if (interaction.isModalSubmit()) {
        // --- User submits Rating/Comment ---
        if (customId === 'user_rate_modal') {
            await interaction.deferReply({ flags: 64 });

            const conv = conversationsDb.get(interaction.user.id);
            if (!conv) {
                return interaction.editReply({ content: '❌ Görüşme verileri bulunamadı.' });
            }

            const starsText = interaction.fields.getTextInputValue('rating_stars').trim();
            const comment = interaction.fields.getTextInputValue('rating_comment').trim();

            const stars = parseInt(starsText, 10);
            if (isNaN(stars) || stars < 1 || stars > 5) {
                return interaction.editReply({ content: '❌ Lütfen 1 ile 5 arasında geçerli bir tam sayı girin.' });
            }

            conv.rating = stars;
            conv.comment = comment;
            conversationsDb.set(interaction.user.id, conv);

            // Disable rating button in the DM
            await disableMessageButtons(interaction.message, ['user_reply_btn', 'user_end_btn']);

            // Send feedback log to EKO_ONAY_KANAL_ID
            try {
                const onayKanal = await client.channels.fetch(EKO_ONAY_KANAL_ID).catch(() => null);
                if (onayKanal) {
                    const ratingEmbed = new EmbedBuilder()
                        .setColor('#FFD700')
                        .setTitle('⭐ Yetkili Değerlendirmesi')
                        .setDescription(`Bir kullanıcı reddetme işlemi sonrası yetkiliyi puanladı.`)
                        .addFields(
                            { name: '👤 Kullanıcı', value: `${interaction.user.toString()} (\`${interaction.user.id}\`)`, inline: true },
                            { name: '👮 Yetkili', value: `<@${conv.moderatorId}> (\`${conv.moderatorId}\`)`, inline: true },
                            { name: '📊 Puan', value: '⭐'.repeat(stars) + ` (${stars}/5)`, inline: true },
                            { name: '💬 Yorum', value: comment }
                        )
                        .setTimestamp();

                    await onayKanal.send({ embeds: [ratingEmbed] });
                }
            } catch (err) {
                console.error('[EVAL LOG] Kanal log gönderilemedi:', err.message);
            }

            await interaction.editReply({ content: `✅ Değerlendirmeniz başarıyla iletildi: **${stars}/5 Yıldız** - *"${comment}"*` });
            return;
        }

        // --- User sends Message to Moderator ---
        if (customId === 'user_reply_modal') {
            await interaction.deferReply({ flags: 64 });

            const conv = conversationsDb.get(interaction.user.id);
            if (!conv || conv.status !== 'active') {
                return interaction.editReply({ content: '❌ Aktif bir görüşmeniz bulunmamaktadır.' });
            }

            const content = interaction.fields.getTextInputValue('reply_content').trim();

            // Send message to Moderator
            try {
                const mod = await client.users.fetch(conv.moderatorId).catch(() => null);
                if (mod) {
                    const modEmbed = new EmbedBuilder()
                        .setColor('#00FFFF')
                        .setTitle('📩 Kullanıcıdan Yeni Mesaj')
                        .setDescription(`**${interaction.user.tag}** (${interaction.user.toString()}) adlı kişi, **${conv.moderatorName}** adlı youtube onayını (veya Roblox grup kontrolünü) çektiğiniz için size cevap gönderdi:`)
                        .addFields({ name: '💬 Mesajı', value: content })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`mod_reply_btn_${interaction.user.id}`)
                            .setLabel('Cevapla')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✉️'),
                        new ButtonBuilder()
                            .setCustomId(`mod_end_btn_${interaction.user.id}`)
                            .setLabel('GÖRÜŞMEYİ KALICI SONLANDIR')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                    await mod.send({ embeds: [modEmbed], components: [row] });
                    
                    conv.lastMessageFrom = 'user';
                    conversationsDb.set(interaction.user.id, conv);

                    await interaction.editReply({ content: '✅ Mesajınız yetkiliye başarıyla iletildi.' });
                } else {
                    await interaction.editReply({ content: '❌ Yetkiliye ulaşılamadı (DM kutusu kapalı olabilir).' });
                }
            } catch (err) {
                console.error('[USER REPLY]', err.message);
                await interaction.editReply({ content: '❌ Mesaj iletilirken bir hata oluştu.' });
            }
            return;
        }

        // --- Moderator replies to User ---
        if (customId.startsWith('mod_reply_modal_')) {
            await interaction.deferReply({ flags: 64 });

            const userId = customId.split('_')[3];
            const conv = conversationsDb.get(userId);
            if (!conv || conv.status !== 'active') {
                return interaction.editReply({ content: '❌ Bu görüşme aktif değil veya sonlandırılmış.' });
            }

            const content = interaction.fields.getTextInputValue('reply_content').trim();

            // Send message to User
            try {
                const user = await client.users.fetch(userId).catch(() => null);
                if (user) {
                    const userEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('📩 Yetkiliden Yeni Mesaj')
                        .setDescription(`**Moderatör ${interaction.user.tag}** size cevap gönderdi:`)
                        .addFields({ name: '💬 Mesajı', value: content })
                        .setTimestamp();

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('user_reply_btn')
                            .setLabel('MODERATÖRE CEVAP GÖNDER')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('✉️'),
                        new ButtonBuilder()
                            .setCustomId('user_end_btn')
                            .setLabel('GÖRÜŞMEYİ KALICI SONLANDIR')
                            .setStyle(ButtonStyle.Danger)
                            .setEmoji('🔒')
                    );

                    await user.send({ embeds: [userEmbed], components: [row] });

                    conv.lastMessageFrom = 'moderator';
                    conversationsDb.set(userId, conv);

                    await interaction.editReply({ content: '✅ Cevabınız kullanıcıya başarıyla iletildi.' });
                } else {
                    await interaction.editReply({ content: '❌ Kullanıcıya ulaşılamadı (DM kutusu kapalı olabilir).' });
                }
            } catch (err) {
                console.error('[MOD REPLY]', err.message);
                await interaction.editReply({ content: '❌ Cevap iletilirken bir hata oluştu.' });
            }
            return;
        }
    }
}

module.exports = { handleCustomInteraction };
