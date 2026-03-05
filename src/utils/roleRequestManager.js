// ─────────────────────────────────────────────────────────
// Role Request Manager  –  faction-scoped approval system
// ─────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require('discord.js');
const { baseEmbed } = require('./embedFactory');

const REQUESTS_FILE = path.join(__dirname, '..', '..', 'data', 'role-requests.json');

/* ─── faction registry (mirror of factionManager) ─── */
const FACTIONS = [
  { tag: 'MAYOR',   emoji: '🏛️', title: 'Мэрия' },
  { tag: 'FBI',     emoji: '🕵️', title: 'ФБР' },
  { tag: 'LSPD',    emoji: '🚓', title: 'ЛСПД' },
  { tag: 'SFPD',    emoji: '🚓', title: 'СФПД' },
  { tag: 'LVPD',    emoji: '🚓', title: 'ЛВПД' },
  { tag: 'ARMY-LV', emoji: '🪖', title: 'Армия ЛВ' },
  { tag: 'ARMY-SF', emoji: '🪖', title: 'Армия СФ' },
  { tag: 'MOH',     emoji: '🚑', title: 'Минздрав' },
  { tag: 'INST',    emoji: '🏫', title: 'Инструкторы' },
  { tag: 'COURT',   emoji: '⚖️', title: 'Суд' },
];

/* ─── persistence ─── */

function loadRequests() {
  try {
    if (!fs.existsSync(REQUESTS_FILE)) fs.writeFileSync(REQUESTS_FILE, '[]', 'utf8');
    return JSON.parse(fs.readFileSync(REQUESTS_FILE, 'utf8'));
  } catch { return []; }
}

function saveRequests(list) {
  try {
    const dir = path.dirname(REQUESTS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REQUESTS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) { console.error('[ROLE-REQ] save error:', err); }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ─── authority check ─── */

function canApprove(member, factionTag) {
  const names = member.roles.cache.map(r => r.name);

  // Global staff  –  can approve any faction
  if (names.some(n => n.includes('🛡️ Админ') || n.includes('🔨 Модератор') || n.includes('🛠️ Владелец'))) {
    return true;
  }

  // Faction-scoped:  leader / deputy of THE SAME faction only
  if (names.some(n => n === `👑 ${factionTag} │ Лидер`))        return true;
  if (names.some(n => n === `👔 ${factionTag} │ Зам. Лидера`))  return true;

  // Discord Administrator permission (server owner, etc.)
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  return false;
}

/* ─── post the persistent request panel ─── */

async function postRequestPanel(guild) {
  const channel = guild.channels.cache.find(ch => ch.name === '📩│запрос-роли');
  if (!channel) throw new Error('Канал 📩│запрос-роли не найден. Сначала разверните структуру.');

  const embed = baseEmbed()
    .setTitle('📩 Запрос роли организации')
    .setDescription(
      'Нажмите кнопку ниже, чтобы подать заявку на вступление в организацию.\n\n' +
      '**Как это работает:**\n' +
      '1️⃣ Нажмите **📩 Запросить роль**\n' +
      '2️⃣ Выберите организацию из списка\n' +
      '3️⃣ Ваш запрос будет отправлен руководству организации\n' +
      '4️⃣ Лидер или Зам. Лидера рассмотрит вашу заявку\n' +
      '5️⃣ При одобрении бот **автоматически** выдаст вам роль\n\n' +
      '⚠️ **Требования:** роль **✅ Верифицирован**\n' +
      '⏳ Можно иметь только **1 активный запрос** одновременно'
    )
    .setColor(0x5865F2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('role_request_start')
      .setLabel('📩 Запросить роль')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log('[ROLE-REQ] Request panel posted in #📩│запрос-роли');
  return { channelId: channel.id, channelName: channel.name };
}

/* ─── find the approval channel for a faction ─── */

function findApprovalChannel(guild, faction) {
  // First try: faction's own 📌│объявления channel
  const factionAnnounce = guild.channels.cache.find(
    ch => ch.name === '📌│объявления' && ch.parent && ch.parent.name.includes(faction.title)
  );
  if (factionAnnounce) return factionAnnounce;

  // Fallback: admin chat
  return guild.channels.cache.find(ch => ch.name === '📢│админ-чат') || null;
}

/* ─── interaction handler (call from interactionCreate) ─── */

async function handleInteraction(interaction) {

  // ━━━ Button: start a role request ━━━
  if (interaction.isButton() && interaction.customId === 'role_request_start') {
    const memberRoles = interaction.member.roles.cache.map(r => r.name);

    // Must be verified
    if (!memberRoles.some(n => n.includes('✅ Верифицирован'))) {
      return interaction.reply({
        content: '❌ **Вы не верифицированы.**\nПройдите верификацию в канале **✅│верификация**, затем попробуйте снова.',
        ephemeral: true
      });
    }

    // Only one pending request at a time
    const requests = loadRequests();
    const pending = requests.find(r => r.userId === interaction.user.id && r.status === 'pending');
    if (pending) {
      return interaction.reply({
        content: `⏳ У вас уже есть активный запрос в **${pending.factionEmoji} ${pending.factionTitle}**.\nДождитесь решения руководства или попросите его отклонить.`,
        ephemeral: true
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('role_request_faction')
      .setPlaceholder('Выберите организацию...')
      .addOptions(
        FACTIONS.map(f => ({
          label: `${f.title} (${f.tag})`,
          value: f.tag,
          emoji: f.emoji,
          description: `Вступить в ${f.title}`
        }))
      );

    return interaction.reply({
      content: '🏢 **Выберите организацию**, в которую хотите вступить:',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ━━━ Select menu: faction chosen ━━━
  if (interaction.isStringSelectMenu() && interaction.customId === 'role_request_faction') {
    const factionTag = interaction.values[0];
    const faction = FACTIONS.find(f => f.tag === factionTag);
    if (!faction) return interaction.reply({ content: '❌ Организация не найдена', ephemeral: true });

    // Already in this faction?
    const memberRoles = interaction.member.roles.cache.map(r => r.name);
    const inFaction = memberRoles.some(n =>
      n.includes(`${factionTag} │ Участник`) ||
      n.includes(`${factionTag} │ Лидер`) ||
      n.includes(`${factionTag} │ Зам. Лидера`)
    );
    if (inFaction) {
      return interaction.reply({
        content: `❌ Вы уже являетесь членом **${faction.emoji} ${faction.title}**!`,
        ephemeral: true
      });
    }

    // Double-check no pending (race condition)
    let requests = loadRequests();
    if (requests.find(r => r.userId === interaction.user.id && r.status === 'pending')) {
      return interaction.reply({ content: '⏳ У вас уже есть активный запрос.', ephemeral: true });
    }

    // Create request record
    const request = {
      id: genId(),
      userId: interaction.user.id,
      userTag: interaction.user.tag || interaction.user.username,
      factionTag: faction.tag,
      factionTitle: faction.title,
      factionEmoji: faction.emoji,
      roleName: `👥 ${faction.tag} │ Участник`,
      status: 'pending',
      approvedBy: null,
      approverTag: null,
      denyReason: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
      approvalMessageId: null,
      approvalChannelId: null
    };

    requests.push(request);
    saveRequests(requests);

    // Post approval embed
    const guild = interaction.guild;
    const approvalChannel = findApprovalChannel(guild, faction);

    if (approvalChannel) {
      const leaderRole = guild.roles.cache.find(r => r.name === `👑 ${faction.tag} │ Лидер`);
      const deputyRole = guild.roles.cache.find(r => r.name === `👔 ${faction.tag} │ Зам. Лидера`);

      const mentions = [
        leaderRole ? `<@&${leaderRole.id}>` : `👑 ${faction.tag} │ Лидер`,
        deputyRole ? `<@&${deputyRole.id}>` : `👔 ${faction.tag} │ Зам. Лидера`
      ].join(', ');

      const approvalEmbed = baseEmbed()
        .setTitle(`📩 Новый запрос — ${faction.emoji} ${faction.title}`)
        .setDescription(
          `**Игрок:** <@${request.userId}> (\`${request.userTag}\`)\n` +
          `**Организация:** ${faction.emoji} **${faction.title}**\n` +
          `**Запрошенная роль:** ${request.roleName}\n` +
          `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
          `🔐 **Кто может одобрить:**\n` +
          `${mentions}, 🛡️ Админ, 🔨 Модератор`
        )
        .setColor(0xF59E0B)
        .setFooter({ text: `ID: ${request.id}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`role_approve_${request.id}`)
          .setLabel('✅ Одобрить')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`role_deny_${request.id}`)
          .setLabel('❌ Отклонить')
          .setStyle(ButtonStyle.Danger)
      );

      try {
        const msg = await approvalChannel.send({
          content: leaderRole || deputyRole
            ? `${leaderRole ? `<@&${leaderRole.id}>` : ''} ${deputyRole ? `<@&${deputyRole.id}>` : ''}`.trim()
            : undefined,
          embeds: [approvalEmbed],
          components: [row]
        });
        // Save message ref
        requests = loadRequests();
        const rec = requests.find(r => r.id === request.id);
        if (rec) {
          rec.approvalMessageId = msg.id;
          rec.approvalChannelId = msg.channelId;
          saveRequests(requests);
        }
      } catch (err) {
        console.error('[ROLE-REQ] Failed to post approval embed:', err);
      }
    }

    return interaction.reply({
      content:
        `✅ Ваш запрос на вступление в **${faction.emoji} ${faction.title}** отправлен!\n` +
        `Руководство организации получило уведомление. Ожидайте решения.`,
      ephemeral: true
    });
  }

  // ━━━ Button: approve ━━━
  if (interaction.isButton() && interaction.customId.startsWith('role_approve_')) {
    const requestId = interaction.customId.slice('role_approve_'.length);
    const requests = loadRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) return interaction.reply({ content: '❌ Запрос не найден.', ephemeral: true });
    if (request.status !== 'pending') {
      return interaction.reply({ content: `ℹ️ Этот запрос уже рассмотрен (${request.status}).`, ephemeral: true });
    }

    // Authority check
    if (!canApprove(interaction.member, request.factionTag)) {
      return interaction.reply({
        content:
          `❌ **У вас нет прав** одобрить этот запрос.\n` +
          `Могут одобрить: **👑 Лидер** / **👔 Зам. Лидера** организации **${request.factionTitle}**, а также **🛡️ Админ** и **🔨 Модератор**.`,
        ephemeral: true
      });
    }

    // Grant the role
    try {
      const guild = interaction.guild;
      const member = await guild.members.fetch(request.userId);
      const role = guild.roles.cache.find(r => r.name === request.roleName);

      if (!role) {
        return interaction.reply({ content: `❌ Роль **${request.roleName}** не найдена. Сначала разверните структуру.`, ephemeral: true });
      }

      await member.roles.add(role, `Запрос одобрен ${interaction.user.tag}`);

      // Update record
      request.status = 'approved';
      request.approvedBy = interaction.user.id;
      request.approverTag = interaction.user.tag || interaction.user.username;
      request.decidedAt = new Date().toISOString();
      saveRequests(requests);

      // Update the embed
      const doneEmbed = baseEmbed()
        .setTitle(`✅ Запрос одобрен — ${request.factionEmoji} ${request.factionTitle}`)
        .setDescription(
          `**Игрок:** <@${request.userId}> (\`${request.userTag}\`)\n` +
          `**Роль:** ${request.roleName}\n` +
          `**Одобрил:** <@${interaction.user.id}>\n` +
          `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setColor(0x22C55E);

      await interaction.update({ embeds: [doneEmbed], components: [] });

      // Try to DM the user
      try {
        const user = await guild.client.users.fetch(request.userId);
        await user.send(
          `✅ Ваш запрос на вступление в **${request.factionEmoji} ${request.factionTitle}** одобрен!\n` +
          `Вам выдана роль **${request.roleName}**.`
        );
      } catch {} // DMs may be disabled

      console.log(`[ROLE-REQ] ✅ ${request.userTag} → ${request.roleName} (approved by ${interaction.user.tag})`);
    } catch (err) {
      console.error('[ROLE-REQ] approve error:', err);
      return interaction.reply({ content: `❌ Ошибка при выдаче роли: ${err.message}`, ephemeral: true });
    }

    return; // interaction.update already called
  }

  // ━━━ Button: deny ━━━
  if (interaction.isButton() && interaction.customId.startsWith('role_deny_')) {
    const requestId = interaction.customId.slice('role_deny_'.length);
    const requests = loadRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) return interaction.reply({ content: '❌ Запрос не найден.', ephemeral: true });
    if (request.status !== 'pending') {
      return interaction.reply({ content: `ℹ️ Этот запрос уже рассмотрен (${request.status}).`, ephemeral: true });
    }

    if (!canApprove(interaction.member, request.factionTag)) {
      return interaction.reply({
        content:
          `❌ **У вас нет прав** отклонить этот запрос.\n` +
          `Могут отклонить: **👑 Лидер** / **👔 Зам. Лидера** организации **${request.factionTitle}**, а также **🛡️ Админ** и **🔨 Модератор**.`,
        ephemeral: true
      });
    }

    request.status = 'denied';
    request.approvedBy = interaction.user.id;
    request.approverTag = interaction.user.tag || interaction.user.username;
    request.decidedAt = new Date().toISOString();
    saveRequests(requests);

    const denyEmbed = baseEmbed()
      .setTitle(`❌ Запрос отклонён — ${request.factionEmoji} ${request.factionTitle}`)
      .setDescription(
        `**Игрок:** <@${request.userId}> (\`${request.userTag}\`)\n` +
        `**Роль:** ${request.roleName}\n` +
        `**Отклонил:** <@${interaction.user.id}>\n` +
        `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor(0xEF4444);

    await interaction.update({ embeds: [denyEmbed], components: [] });

    // Try DM
    try {
      const user = await interaction.guild.client.users.fetch(request.userId);
      await user.send(
        `❌ Ваш запрос на вступление в **${request.factionEmoji} ${request.factionTitle}** отклонён.\n` +
        `Вы можете подать новый запрос.`
      );
    } catch {}

    console.log(`[ROLE-REQ] ❌ ${request.userTag} → ${request.factionTitle} (denied by ${interaction.user.tag})`);
    return;
  }
}

/* ─── exports ─── */

module.exports = {
  FACTIONS,
  loadRequests,
  saveRequests,
  canApprove,
  postRequestPanel,
  handleInteraction,
};
