// ─────────────────────────────────────────────────────────
// Temp Voice Manager — join-to-create temporary voice channels
// ─────────────────────────────────────────────────────────
const { ChannelType, PermissionsBitField } = require('discord.js');
const P = PermissionsBitField.Flags;

const TRIGGER_CHANNEL_NAME = '➕ Создать канал';

// In-memory registry of temporary channels: channelId → { ownerId, createdAt }
const tempChannels = new Map();

/**
 * Called on voiceStateUpdate.
 * - If user joins a trigger channel → create temp voice, move user there.
 * - If a temp channel empties → delete it.
 */
async function handleVoiceStateUpdate(oldState, newState) {
    const { member, guild } = newState;

    // ── User joined a "create" trigger channel ──
    if (newState.channel && newState.channel.name === TRIGGER_CHANNEL_NAME) {
        // Only faction members (Участник / Зам. Лидера / Лидер) + staff can create
        const memberRoles = member.roles.cache.map(r => r.name);
        const hasFactionRole = memberRoles.some(n =>
            n.includes('│ Участник') || n.includes('│ Зам. Лидера') || n.includes('│ Лидер')
        );
        const hasStaff = memberRoles.some(n =>
            n.includes('🛡️ Админ') || n.includes('🔨 Модератор') ||
            n.includes('🛠️ Владелец') || n.includes('⭐ Гл. Администратор') ||
            n.includes('👑 Зам. Гл. Админа') || n.includes('Следящий за')
        );

        if (!hasFactionRole && !hasStaff) {
            try { await member.voice.disconnect('Нет прав для создания канала'); } catch {}
            return;
        }

        const parent = newState.channel.parent;
        if (!parent) return;

        try {
            // Inherit permission overwrites from the trigger channel
            const overwrites = newState.channel.permissionOverwrites.cache.map(ow => ({
                id: ow.id,
                allow: ow.allow.toArray(),
                deny: ow.deny.toArray()
            }));

            // Add creator-specific overwrite so they can manage their channel
            overwrites.push({
                id: member.id,
                allow: [P.ManageChannels, P.MoveMembers, P.MuteMembers, P.Connect, P.Speak]
            });

            const tempChannel = await guild.channels.create({
                name: `🔉 ${member.displayName}`,
                type: ChannelType.GuildVoice,
                parent: parent.id,
                permissionOverwrites: overwrites,
                reason: `Temp voice — ${member.user.tag}`
            });

            // Move user to new channel
            await member.voice.setChannel(tempChannel, 'Temp voice channel created');
            tempChannels.set(tempChannel.id, { ownerId: member.id, createdAt: Date.now() });

            console.log(`[TEMP-VOICE] Created ${tempChannel.name} for ${member.user.tag} in ${parent.name}`);
        } catch (e) {
            console.error('[TEMP-VOICE] Error creating channel:', e);
        }
    }

    // ── User left a channel — check if temp channel is now empty ──
    if (oldState.channel && tempChannels.has(oldState.channel.id)) {
        if (oldState.channel.members.size === 0) {
            try {
                const chName = oldState.channel.name;
                await oldState.channel.delete('Temp voice — empty, auto-deleted');
                tempChannels.delete(oldState.channel.id);
                console.log(`[TEMP-VOICE] Deleted empty channel ${chName}`);
            } catch (e) {
                console.error('[TEMP-VOICE] Error deleting channel:', e);
                tempChannels.delete(oldState.channel.id); // clean map even if delete fails
            }
        }
    }
}

/**
 * On bot startup, scan for orphaned temp voice channels (🔉 prefix, empty)
 * and re-register or clean them up.
 */
async function cleanupOnStartup(guild) {
    const voiceChannels = guild.channels.cache.filter(
        ch => ch.type === ChannelType.GuildVoice && ch.name.startsWith('🔉 ')
    );
    for (const [id, ch] of voiceChannels) {
        if (ch.members.size === 0) {
            try {
                await ch.delete('Temp voice — cleanup on startup');
                console.log(`[TEMP-VOICE] Cleanup: deleted empty ${ch.name}`);
            } catch {}
        } else {
            // Re-register still-active temp channels
            tempChannels.set(id, { ownerId: null, createdAt: Date.now() });
            console.log(`[TEMP-VOICE] Cleanup: re-registered ${ch.name} (${ch.members.size} members)`);
        }
    }
}

module.exports = { handleVoiceStateUpdate, cleanupOnStartup, TRIGGER_CHANNEL_NAME };
