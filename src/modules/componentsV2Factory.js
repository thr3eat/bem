const { ComponentType, ButtonStyle, MessageFlags } = require('discord.js');

// ComponentType constants with fallbacks
const TYPE_CONTAINER     = ComponentType.Container || 17;
const TYPE_SECTION       = ComponentType.Section || 9;
const TYPE_TEXT_DISPLAY  = ComponentType.TextDisplay || 10;
const TYPE_THUMBNAIL     = ComponentType.Thumbnail || 11;
const TYPE_MEDIA_GALLERY = ComponentType.MediaGallery || 12;
const TYPE_SEPARATOR     = ComponentType.Separator || 14;
const TYPE_ACTION_ROW    = ComponentType.ActionRow || 1;
const TYPE_BUTTON        = ComponentType.Button || 2;

const FLAGS_V2 = MessageFlags.IsComponentsV2 || (1 << 13);

class ComponentsV2Factory {
    static get FLAGS() {
        return FLAGS_V2;
    }

    /**
     * Create a Text Display component
     */
    static text(content) {
        return {
            type: TYPE_TEXT_DISPLAY,
            content: content
        };
    }

    /**
     * Create a Separator line component
     */
    static separator(divider = true) {
        return {
            type: TYPE_SEPARATOR,
            divider: divider
        };
    }

    /**
     * Create a Section with optional right accessory (thumbnail/image)
     */
    static section(textContent, imageUrl = null) {
        const sec = {
            type: TYPE_SECTION,
            text: typeof textContent === 'string' ? this.text(textContent) : textContent
        };
        if (imageUrl) {
            sec.accessory = {
                type: TYPE_THUMBNAIL,
                media: { url: imageUrl }
            };
        }
        return sec;
    }

    /**
     * Create a Media Gallery grid component (Alias for createMediaGallery)
     */
    static mediaGallery(imageUrls = []) {
        return this.createMediaGallery(imageUrls);
    }

    /**
     * Create a Media Gallery grid component (Type 12)
     */
    static createMediaGallery(imageUrls = []) {
        return {
            type: TYPE_MEDIA_GALLERY,
            items: imageUrls.map(url => ({ media: { url } }))
        };
    }

    /**
     * Create a Section with Thumbnail accessory (Type 9 & Type 11)
     */
    static createSectionWithThumbnail(title, description, thumbnailUrl) {
        return {
            type: TYPE_SECTION,
            text: {
                type: TYPE_TEXT_DISPLAY,
                content: `### ${title}\n${description}`
            },
            accessory: {
                type: TYPE_THUMBNAIL,
                media: { url: thumbnailUrl }
            }
        };
    }

    /**
     * Create a standardized header block with separator
     */
    static createHeaderBlock(title, iconEmoji = '🚀') {
        return [
            {
                type: TYPE_TEXT_DISPLAY,
                content: `## ${iconEmoji} ${title}`
            },
            { type: TYPE_SEPARATOR, divider: true }
        ];
    }

    /**
     * QuickChart.io URL Generator for dynamic charts
     */
    static getQuickChartUrl(labels, data, labelName = 'Veriler', chartType = 'sparkline', color = '#5865F2') {
        const chartConfig = {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: labelName,
                    data: data,
                    borderColor: color,
                    fill: true,
                    backgroundColor: 'rgba(88, 101, 242, 0.15)'
                }]
            },
            options: {
                plugins: { legend: { labels: { color: 'white' } } }
            }
        };
        return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=180&bkg=transparent`;
    }

    /**
     * QuickChart Supported Stats Container (V2)
     */
    static buildChartStatsV2(data) {
        const { title, labels, values, datasetLabel, description, accentColor = 0x5865F2 } = data;
        const chartUrl = this.getQuickChartUrl(labels, values, datasetLabel || title);

        return {
            flags: FLAGS_V2,
            components: [
                this.container(accentColor, [
                    ...this.createHeaderBlock(title, '📈'),
                    ...(description ? [this.text(description), this.separator(false)] : []),
                    this.createMediaGallery([chartUrl]),
                    this.separator(false),
                    this.text(`-# Sentura Dynamic QuickChart Service • <t:${Math.floor(Date.now() / 1000)}:R>`)
                ])
            ]
        };
    }

    /**
     * Create an ActionRow with buttons
     */
    static actionRow(buttons = []) {
        return {
            type: TYPE_ACTION_ROW,
            components: buttons.map(btn => ({
                type: TYPE_BUTTON,
                style: btn.style || ButtonStyle.Primary,
                label: btn.label,
                custom_id: btn.custom_id || btn.customId,
                url: btn.url,
                disabled: btn.disabled || false,
                emoji: btn.emoji
            }))
        };
    }

    /**
     * Create a complete V2 Container payload
     */
    static container(accentColor, innerComponents = []) {
        return {
            type: TYPE_CONTAINER,
            accent_color: typeof accentColor === 'string' ? parseInt(accentColor.replace('#', ''), 16) : accentColor,
            components: innerComponents
        };
    }

    // =========================================================================
    //  PRESET BUILDERS FOR BOT FEATURES
    // =========================================================================

    /**
     * Roblox Group Status Check Container (V2)
     */
    static buildRobloxGroupCheckV2(data) {
        const { discordUserId, robloxUsername, robloxUserId, registeredAt, groupId, targetRoleId } = data;
        const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUserId}&width=420&height=420&format=png`;
        const regTimeF = `<t:${Math.floor(registeredAt / 1000)}:F>`;
        const regTimeR = `<t:${Math.floor(registeredAt / 1000)}:R>`;

        return {
            flags: FLAGS_V2,
            components: [
                this.container(0x5865F2, [
                    this.section(
                        `## 🤖 Roblox Grup Katılım Kontrolü\n` +
                        `Kullanıcı <@${discordUserId}> için rutin **Roblox Grup Üyelik Kontrolü** zamanı geldi.\n\n` +
                        `> Lütfen kullanıcının Roblox grubunda yer almaya devam ettiğini doğrulayın.`,
                        avatarUrl
                    ),
                    this.separator(true),
                    this.text(
                        `👤 **Discord Üyesi:** <@${discordUserId}> (\`${discordUserId}\`)\n` +
                        `🎮 **Roblox Hesabı:** [${robloxUsername}](https://www.roblox.com/users/${robloxUserId}/profile) (\`ID: ${robloxUserId}\`)\n` +
                        `🎭 **Hedef Rol:** <@&${targetRoleId}>\n` +
                        `📅 **Kayıt Tarihi:** ${regTimeF} (${regTimeR})\n` +
                        `🔗 **Roblox Grubu:** [Gruba Git](https://www.roblox.com/communities/${groupId})`
                    ),
                    this.separator(false),
                    this.text(`-# Sentura Roblox Grup Kontrol Otomasyonu • <t:${Math.floor(Date.now() / 1000)}:R>`),
                    this.actionRow([
                        { custom_id: `roblox_still_in_group_${discordUserId}`, label: 'EVET - HALA GRUPTA', style: ButtonStyle.Success, emoji: { name: '✅' } },
                        { custom_id: `roblox_not_in_group_${discordUserId}_${robloxUserId}`, label: 'HAYIR - GRUPTAN AYRILMIŞ', style: ButtonStyle.Danger, emoji: { name: '❌' } }
                    ])
                ])
            ]
        };
    }

    /**
     * YouTube Subscriber Approval / Announcement Container (V2)
     */
    static buildSubscriberV2(data) {
        const { member, fotoSayi, yeniAbone, ekoRoleId } = data;
        const color = yeniAbone ? 0x00FF88 : 0xFFD700;
        const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 256 });

        return {
            flags: FLAGS_V2,
            components: [
                this.container(color, [
                    this.section(
                        yeniAbone
                            ? `## 🎉 Yeni Eko Yıldız Abonesi!\n**${member.user.username}** YouTube kanalımıza abone olarak **<@&${ekoRoleId}>** rolünü kazandı! ⭐`
                            : `## 📸 Fotoğraf Paylaşımı\n**${member.user.username}** yeni bir ekran görüntüsü paylaştı.`,
                        avatarUrl
                    ),
                    this.separator(true),
                    this.text(
                        `👤 **Abone:** ${member.user.toString()} (\`${member.user.tag}\`)\n` +
                        `📸 **Paylaşılan Fotoğraf:** **${fotoSayi} Adet**\n` +
                        `🎭 **Tanımlanan Rol:** <@&${ekoRoleId}>\n` +
                        `📅 **Tarih:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    ),
                    this.separator(false),
                    this.text(`-# Sentura Eko Yıldız Abone Otomasyonu • <t:${Math.floor(Date.now() / 1000)}:R>`)
                ])
            ]
        };
    }

    /**
     * Registration Success Container (V2)
     */
    static buildRegistrationSuccessV2(data) {
        const { robloxUser, discordUserId, targetRoleId } = data;
        const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxUser.id}&width=420&height=420&format=png`;

        return {
            flags: FLAGS_V2,
            components: [
                this.container(0x00FF88, [
                    this.section(
                        `## 🎉 Roblox Kaydı Başarılı!\n` +
                        `**[${robloxUser.name}](https://www.roblox.com/users/${robloxUser.id}/profile)** hesabı doğrulandı, grupta rütbe atandı ve Discord rolü tanımlandı!`,
                        avatarUrl
                    ),
                    this.separator(true),
                    this.text(
                        `🎮 **Roblox Adı:** ${robloxUser.name}\n` +
                        `🆔 **Roblox ID:** \`${robloxUser.id}\`\n` +
                        `🎭 **Verilen Rol:** <@&${targetRoleId}>\n` +
                        `📅 **Grup İnceleme Zamanı:** <t:${Math.floor((Date.now() + 2 * 24 * 60 * 60 * 1000) / 1000)}:R> (2 Gün Sonra)`
                    ),
                    this.separator(false),
                    this.text(`-# Eko Yıldız Roblox Otomatik Kayıt Sistemi • <t:${Math.floor(Date.now() / 1000)}:R>`)
                ])
            ]
        };
    }

    /**
     * Startup Audit Scan Container (V2)
     */
    static buildAuditScanV2(stats) {
        const { toplamMesaj, tekilKullanici, sunucudaMevcut, zatenRoluOlan, yeniRolVerilen, gruptaOlan, kanalId } = stats;

        return {
            flags: FLAGS_V2,
            components: [
                this.container(0x00FF88, [
                    this.section(
                        `## 🔍 Başlangıç Kayıt Kanalı Taraması Tamamlandı\n` +
                        `Bot başlatıldığında <#${kanalId}> kanalına yazan tüm kullanıcıların rolleri ve sunucu durumları otomatik olarak kontrol edildi.`
                    ),
                    this.separator(true),
                    this.text(
                        `📩 **Taranan Mesaj Sayısı:** **${toplamMesaj}**\n` +
                        `👥 **Tekil Kullanıcı Sayısı:** **${tekilKullanici}**\n` +
                        `🏠 **Sunucudaki Üye Sayısı:** **${sunucudaMevcut}**\n` +
                        `🎭 **Zaten Rolü Olan:** **${zatenRoluOlan}**\n` +
                        `⚡ **Yeni Rol Tanımlanan:** **${yeniRolVerilen}**\n` +
                        `🎮 **Roblox Grubunda Doğrulanan:** **${gruptaOlan}**`
                    ),
                    this.separator(false),
                    this.text(`-# Sentura Otomatik Denetim & Senkronizasyon Sistemi • <t:${Math.floor(Date.now() / 1000)}:R>`)
                ])
            ]
        };
    }
}

module.exports = ComponentsV2Factory;
