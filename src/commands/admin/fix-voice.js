const {
    SlashCommandBuilder,
    ChannelType,
    PermissionFlagsBits,
    PermissionsBitField
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fix-voice')
        .setDescription('Включить голосовую активацию на всех голосовых каналах.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;

        // Check that the bot has ManageRoles permission (required to edit channel overwrites)
        const botMember = await guild.members.fetchMe();
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.editReply(
                '❌ У бота нет права **Управление ролями** (Manage Roles) — невозможно изменить разрешения каналов.'
            );
        }

        // Fetch all channels to ensure the cache is fully populated
        await guild.channels.fetch();

        const voiceChannels = guild.channels.cache.filter(
            ch => ch.type === ChannelType.GuildVoice || ch.type === ChannelType.GuildStageVoice
        );

        if (voiceChannels.size === 0) {
            return interaction.editReply('⚠️ На сервере не найдено голосовых каналов.');
        }

        let updated = 0;
        let failed = 0;

        for (const [, channel] of voiceChannels) {
            try {
                const everyoneOverwrite = channel.permissionOverwrites.cache.get(guild.id);
                const alreadyAllowed = everyoneOverwrite?.allow.has(PermissionsBitField.Flags.UseVAD);

                if (!alreadyAllowed) {
                    await channel.permissionOverwrites.edit(guild.id, {
                        UseVAD: true
                    }, { reason: `/${interaction.commandName} — включение голосовой активации` });
                    updated++;
                }
            } catch (e) {
                console.error(`[FIX-VOICE] Failed to update ${channel.name}:`, e.message);
                failed++;
            }
        }

        const total = voiceChannels.size;
        const skipped = total - updated - failed;
        await interaction.editReply(
            `✅ Готово! Каналов: **${total}**\n` +
            `• Обновлено: **${updated}**\n` +
            `• Уже было включено: **${skipped}**\n` +
            (failed > 0 ? `• Ошибки: **${failed}**` : '')
        );
    }
};
