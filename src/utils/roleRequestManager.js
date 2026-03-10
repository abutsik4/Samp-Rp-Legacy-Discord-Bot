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

/* ─── fetch members with a specific role ─── */
async function fetchMembersWithRole(guild, roleId) {
  const roleName = guild.roles.cache.get(roleId)?.name;

  // 1) Gather candidate user IDs from approved role-request records
  const candidateIds = new Set();
  if (roleName) {
    const requests = loadRequests();
    for (const req of requests) {
      if (req.status === 'approved' && req.roleName === roleName) {
        candidateIds.add(req.userId);
      }
    }
  }

  // 2) Try REST bulk list (works only if Server Members Intent is enabled)
  const botToken = guild.client.token;
  try {
    let after = '0';
    for (let page = 0; page < 10; page++) {
      const resp = await fetch(
        `https://discord.com/api/v10/guilds/${guild.id}/members?limit=1000&after=${after}`,
        { headers: { Authorization: `Bot ${botToken}` } }
      );
      if (!resp.ok) break; // 403 = intent not enabled, fall through
      const batch = await resp.json();
      if (!batch.length) break;
      for (const m of batch) {
        if (!m.user.bot && (m.roles || []).includes(roleId)) {
          candidateIds.add(m.user.id);
        }
      }
      if (batch.length < 1000) break;
      after = batch[batch.length - 1].user.id;
    }
  } catch {}

  // 3) Verify each candidate individually (single-member fetch never needs the intent)
  const result = [];
  for (const userId of candidateIds) {
    try {
      const member = await guild.members.fetch(userId);
      if (member && !member.user.bot && member.roles.cache.has(roleId)) {
        result.push({
          id: member.id,
          username: member.user.username,
          displayName: member.displayName || member.user.username
        });
      }
    } catch {} // user left server, etc.
  }
  return result;
}

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

/* ─── role types ─── */
const ROLE_TYPES = [
  { key: 'member',  emoji: '👥', label: 'Участник',     format: tag => `👥 ${tag} │ Участник` },
  { key: 'deputy',  emoji: '👔', label: 'Зам. Лидера',  format: tag => `👔 ${tag} │ Зам. Лидера` },
  { key: 'leader',  emoji: '👑', label: 'Лидер',        format: tag => `👑 ${tag} │ Лидер` },
];

function roleNameForType(factionTag, roleTypeKey) {
  const rt = ROLE_TYPES.find(t => t.key === roleTypeKey);
  return rt ? rt.format(factionTag) : `👥 ${factionTag} │ Участник`;
}

/* ─── staff check helper ─── */
const STAFF_PATTERNS = ['🛡️ Админ', '🔨 Модератор', '🛠️ Владелец', '⭐ Гл. Администратор', '👑 Зам. Гл. Админа'];
function isStaff(names) {
  return names.some(n => STAFF_PATTERNS.some(p => n.includes(p)));
}

/* ─── curator → factions mapping ─── */
const CURATOR_FACTIONS = {
  '🏛️ Следящий за Mayor/Court': ['MAYOR', 'COURT'],
  '🕵️ Следящий за FBI':         ['FBI'],
  '🚓 Следящий за SAPD':        ['LSPD', 'SFPD', 'LVPD'],
  '🪩 Следящий за Army':        ['ARMY-LV', 'ARMY-SF'],
  '🚑 Следящий за MOH':         ['MOH'],
  '🏫 Следящий за Inst':        ['INST'],
};

function isCuratorFor(names, factionTag) {
  for (const [curatorName, tags] of Object.entries(CURATOR_FACTIONS)) {
    if (tags.includes(factionTag) && names.some(n => n.includes(curatorName))) return true;
  }
  return false;
}

/* ─── authority check ─── */

function canApprove(member, factionTag, requestedRoleType) {
  const names = member.roles.cache.map(r => r.name);

  // Global staff (Admin / Moderator / Owner / Head Admin) — can approve ANY request
  if (isStaff(names)) {
    return true;
  }
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  // Curator for this faction — can approve deputy + member (NOT leader)
  if (isCuratorFor(names, factionTag)) {
    return requestedRoleType !== 'leader';
  }

  // Leader requests → ONLY admin/moderator/curator (faction leaders cannot self-approve)
  if (requestedRoleType === 'leader') return false;

  // Deputy requests → faction Leader + admin/mod/curator
  if (requestedRoleType === 'deputy') {
    return names.some(n => n === `👑 ${factionTag} │ Лидер`);
  }

  // Member requests → faction Leader, Deputy + admin/mod/curator
  if (names.some(n => n === `👑 ${factionTag} │ Лидер`)) return true;
  if (names.some(n => n === `👔 ${factionTag} │ Зам. Лидера`)) return true;

  return false;
}

/* ─── authority check for role removal ─── */
function canRemoveRole(member, factionTag, roleTypeToRemove) {
  const names = member.roles.cache.map(r => r.name);

  // Global staff — can remove any role
  if (isStaff(names)) {
    return true;
  }
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  // Curator — can remove deputy + member within their factions
  if (isCuratorFor(names, factionTag)) {
    return roleTypeToRemove === 'deputy' || roleTypeToRemove === 'member';
  }

  // Leader can remove deputy + member
  if (names.some(n => n === `👑 ${factionTag} │ Лидер`)) {
    return roleTypeToRemove === 'deputy' || roleTypeToRemove === 'member';
  }

  // Deputy can remove member only
  if (names.some(n => n === `👔 ${factionTag} │ Зам. Лидера`)) {
    return roleTypeToRemove === 'member';
  }

  return false;
}

/* ─── get removable role types for a member ─── */
function getRemovableRoleTypes(member, factionTag) {
  const names = member.roles.cache.map(r => r.name);
  // Admin/mod can remove all
  if (isStaff(names)) {
    return ['leader', 'deputy', 'member'];
  }
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return ['leader', 'deputy', 'member'];
  }
  // Curator — deputy + member
  if (isCuratorFor(names, factionTag)) return ['deputy', 'member'];
  // Leader — deputy + member
  if (names.some(n => n === `👑 ${factionTag} │ Лидер`)) return ['deputy', 'member'];
  // Deputy — member only
  if (names.some(n => n === `👔 ${factionTag} │ Зам. Лидера`)) return ['member'];
  return [];
}

/* ─── post the persistent request panel ─── */

async function postRequestPanel(guild) {
  const channel = guild.channels.cache.find(ch => ch.name === '📩│запрос-роли');
  if (!channel) throw new Error('Канал 📩│запрос-роли не найден. Сначала разверните структуру.');

  const embed = baseEmbed()
    .setTitle('📩 Запрос роли организации')
    .setDescription(
      'Нажмите кнопку ниже, чтобы подать заявку на роль в организации.\n\n' +
      '**Доступные роли:**\n' +
      '👥 **Участник** — базовая роль члена организации\n' +
      '👔 **Зам. Лидера** — заместитель лидера\n' +
      '👑 **Лидер** — руководитель организации\n\n' +
      '**Как это работает:**\n' +
      '1️⃣ Нажмите **📩 Запросить роль**\n' +
      '2️⃣ Выберите организацию из списка\n' +
      '3️⃣ Выберите тип роли (Участник / Зам. Лидера / Лидер)\n' +
      '4️⃣ Руководство рассмотрит вашу заявку\n' +
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

  // ━━━ Select menu: faction chosen → show role type picker ━━━
  if (interaction.isStringSelectMenu() && interaction.customId === 'role_request_faction') {
    const factionTag = interaction.values[0];
    const faction = FACTIONS.find(f => f.tag === factionTag);
    if (!faction) return interaction.reply({ content: '❌ Организация не найдена', ephemeral: true });

    // Already has ALL three roles for this faction?
    const memberRoles = interaction.member.roles.cache.map(r => r.name);

    // Build role type options — only show types the user doesn't already have
    const options = ROLE_TYPES.filter(rt => {
      const roleName = rt.format(factionTag);
      return !memberRoles.includes(roleName);
    }).map(rt => ({
      label: `${rt.label} (${rt.format(factionTag)})`,
      value: `${factionTag}::${rt.key}`,
      emoji: rt.emoji,
      description: rt.key === 'member' ? 'Базовая роль организации'
                 : rt.key === 'deputy'  ? 'Заместитель лидера'
                 : 'Руководитель организации'
    }));

    if (options.length === 0) {
      return interaction.reply({
        content: `❌ Вы уже имеете все роли **${faction.emoji} ${faction.title}**!`,
        ephemeral: true
      });
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId('role_request_type')
      .setPlaceholder('Выберите тип роли...')
      .addOptions(options);

    return interaction.reply({
      content: `🏢 **${faction.emoji} ${faction.title}** — выберите тип роли:`,
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ━━━ Select menu: role type chosen → create request ━━━
  if (interaction.isStringSelectMenu() && interaction.customId === 'role_request_type') {
    const [factionTag, roleTypeKey] = interaction.values[0].split('::');
    const faction = FACTIONS.find(f => f.tag === factionTag);
    const roleType = ROLE_TYPES.find(t => t.key === roleTypeKey);
    if (!faction || !roleType) return interaction.reply({ content: '❌ Ошибка выбора', ephemeral: true });

    // Double-check no pending (race condition)
    let requests = loadRequests();
    if (requests.find(r => r.userId === interaction.user.id && r.status === 'pending')) {
      return interaction.reply({ content: '⏳ У вас уже есть активный запрос.', ephemeral: true });
    }

    // Check doesn't already have this exact role
    const roleName = roleType.format(factionTag);
    const memberRoles = interaction.member.roles.cache.map(r => r.name);
    if (memberRoles.includes(roleName)) {
      return interaction.reply({
        content: `❌ У вас уже есть роль **${roleName}**!`,
        ephemeral: true
      });
    }

    // Create request record
    const request = {
      id: genId(),
      userId: interaction.user.id,
      userTag: interaction.user.tag || interaction.user.username,
      factionTag: faction.tag,
      factionTitle: faction.title,
      factionEmoji: faction.emoji,
      roleType: roleTypeKey,
      roleName: roleName,
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

      // Build "who can approve" text and ping mentions based on role type
      let approveText, pingContent;
      if (roleTypeKey === 'leader') {
        approveText = '🛡️ Админ, 🔨 Модератор';
        pingContent = undefined; // no faction ping for leader requests
      } else if (roleTypeKey === 'deputy') {
        approveText = leaderRole ? `<@&${leaderRole.id}>, 🛡️ Админ, 🔨 Модератор` : '👑 Лидер организации, 🛡️ Админ, 🔨 Модератор';
        pingContent = leaderRole ? `<@&${leaderRole.id}>` : undefined;
      } else {
        const mentionParts = [];
        if (leaderRole) mentionParts.push(`<@&${leaderRole.id}>`);
        if (deputyRole) mentionParts.push(`<@&${deputyRole.id}>`);
        approveText = [...mentionParts, '🛡️ Админ', '🔨 Модератор'].join(', ') || '👑 Лидер, 👔 Зам. Лидера, 🛡️ Админ, 🔨 Модератор';
        pingContent = mentionParts.length > 0 ? mentionParts.join(' ') : undefined;
      }

      const approvalEmbed = baseEmbed()
        .setTitle(`📩 Новый запрос — ${faction.emoji} ${faction.title}`)
        .setDescription(
          `**Игрок:** <@${request.userId}> (\`${request.userTag}\`)\n` +
          `**Организация:** ${faction.emoji} **${faction.title}**\n` +
          `**Запрошенная роль:** ${roleType.emoji} **${roleType.label}** — ${request.roleName}\n` +
          `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
          `🔐 **Кто может одобрить:**\n${approveText}`
        )
        .setColor(roleTypeKey === 'leader' ? 0xF59E0B : roleTypeKey === 'deputy' ? 0x3B82F6 : 0xF59E0B)
        .setFooter({ text: `ID: ${request.id} • Тип: ${roleType.label}` });

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
          content: pingContent,
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
    if (!canApprove(interaction.member, request.factionTag, request.roleType || 'member')) {
      return interaction.reply({
        content:
          `❌ **У вас нет прав** одобрить этот запрос.\n` +
          `Могут одобрить: **👑 Лидер** организации **${request.factionTitle}**, а также **🛡️ Админ** и **🔨 Модератор**.` +
          ((request.roleType || 'member') === 'member' ? `\nТакже может одобрить: **👔 Зам. Лидера**.` : ''),
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

      // Announce in faction 📌│объявления
      try {
        const faction = FACTIONS.find(f => f.tag === request.factionTag);
        if (faction) {
          const announceChannel = findApprovalChannel(guild, faction);
          if (announceChannel && announceChannel.name === '📌│объявления') {
            const announceEmbed = baseEmbed()
              .setTitle(`✅ Новый участник — ${request.factionEmoji} ${request.factionTitle}`)
              .setDescription(
                `**Игрок:** <@${request.userId}> (\`${request.userTag}\`)\n` +
                `**Роль:** ${request.roleName}\n` +
                `**Одобрил:** <@${interaction.user.id}>\n` +
                `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
              )
              .setColor(0x22C55E);
            await announceChannel.send({ embeds: [announceEmbed] });
          }
        }
      } catch (err) { console.error('[ROLE-REQ] announce error:', err); }

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

    if (!canApprove(interaction.member, request.factionTag, request.roleType || 'member')) {
      return interaction.reply({
        content:
          `❌ **У вас нет прав** отклонить этот запрос.\n` +
          `Могут отклонить: **👑 Лидер** организации **${request.factionTitle}**, а также **🛡️ Админ** и **🔨 Модератор**.` +
          ((request.roleType || 'member') === 'member' ? `\nТакже может отклонить: **👔 Зам. Лидера**.` : ''),
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

    // Announce denial in faction 📌│объявления
    try {
      const faction = FACTIONS.find(f => f.tag === request.factionTag);
      if (faction) {
        const announceChannel = findApprovalChannel(interaction.guild, faction);
        if (announceChannel && announceChannel.name === '📌│объявления') {
          const announceEmbed = baseEmbed()
            .setTitle(`❌ Запрос отклонён — ${request.factionEmoji} ${request.factionTitle}`)
            .setDescription(
              `**Игрок:** <@${request.userId}> (\`${request.userTag}\`)\n` +
              `**Запрошенная роль:** ${request.roleName}\n` +
              `**Отклонил:** <@${interaction.user.id}>\n` +
              `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setColor(0xEF4444);
          await announceChannel.send({ embeds: [announceEmbed] });
        }
      }
    } catch (err) { console.error('[ROLE-REQ] deny announce error:', err); }

    console.log(`[ROLE-REQ] ❌ ${request.userTag} → ${request.factionTitle} (denied by ${interaction.user.tag})`);
    return;
  }

  // ━━━ Button: role removal start ━━━
  if (interaction.isButton() && interaction.customId.startsWith('role_removal_start_')) {
    const factionTag = interaction.customId.slice('role_removal_start_'.length);
    const faction = FACTIONS.find(f => f.tag === factionTag);
    if (!faction) return interaction.reply({ content: '❌ Организация не найдена', ephemeral: true });

    const removable = getRemovableRoleTypes(interaction.member, factionTag);
    if (removable.length === 0) {
      return interaction.reply({ content: '❌ **У вас нет прав** для снятия ролей в этой организации.', ephemeral: true });
    }

    // If only one removable type, skip role-type select → go straight to user picker
    if (removable.length === 1) {
      const roleTypeKey = removable[0];
      const rt = ROLE_TYPES.find(t => t.key === roleTypeKey);
      const roleName = rt.format(factionTag);
      const role = interaction.guild.roles.cache.find(r => r.name === roleName);
      if (!role) {
        return interaction.reply({ content: `❌ Роль **${roleName}** не найдена. Сначала разверните структуру.`, ephemeral: true });
      }

      // Fetch members with this role via REST API
      await interaction.deferReply({ ephemeral: true });
      const membersWithRole = await fetchMembersWithRole(interaction.guild, role.id);

      if (membersWithRole.length === 0) {
        return interaction.editReply({ content: `ℹ️ Нет участников с ролью **${roleName}**.` });
      }

      // Build user dropdown (max 25 options for Discord select menus)
      const options = membersWithRole.slice(0, 25).map(m => ({
        label: `${m.displayName}`.slice(0, 100),
        value: `${factionTag}::${roleTypeKey}::${m.id}`,
        description: `@${m.username} • ID: ${m.id}`.slice(0, 100),
        emoji: rt.emoji
      }));

      const select = new StringSelectMenuBuilder()
        .setCustomId(`role_removal_user_${factionTag}_${roleTypeKey}`)
        .setPlaceholder('Выберите участника для снятия роли...')
        .addOptions(options);

      return interaction.editReply({
        content: `🗑️ **${faction.emoji} ${faction.title}** — ${rt.emoji} **${rt.label}**\nВыберите участника, с которого нужно снять роль:`,
        components: [new ActionRowBuilder().addComponents(select)]
      });
    }

    // Show select menu of removable role types
    const select = new StringSelectMenuBuilder()
      .setCustomId(`role_removal_type_${factionTag}`)
      .setPlaceholder('Выберите тип роли для снятия...')
      .addOptions(
        removable.map(key => {
          const rt = ROLE_TYPES.find(t => t.key === key);
          return {
            label: `${rt.label} (${rt.format(factionTag)})`,
            value: key,
            emoji: rt.emoji,
            description: key === 'member' ? 'Снять роль участника'
                       : key === 'deputy'  ? 'Снять роль зам. лидера'
                       : 'Снять роль лидера'
          };
        })
      );

    return interaction.reply({
      content: `🗑️ **${faction.emoji} ${faction.title}** — выберите тип роли для снятия:`,
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  // ━━━ Select menu: removal role type chosen → show user dropdown ━━━
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('role_removal_type_')) {
    const factionTag = interaction.customId.slice('role_removal_type_'.length);
    const roleTypeKey = interaction.values[0];
    const faction = FACTIONS.find(f => f.tag === factionTag);
    const rt = ROLE_TYPES.find(t => t.key === roleTypeKey);

    if (!faction || !rt) return interaction.reply({ content: '❌ Ошибка выбора', ephemeral: true });

    // Authority re-check
    if (!canRemoveRole(interaction.member, factionTag, roleTypeKey)) {
      return interaction.reply({ content: '❌ **У вас нет прав** для снятия этой роли.', ephemeral: true });
    }

    const roleName = rt.format(factionTag);
    const role = interaction.guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      return interaction.reply({ content: `❌ Роль **${roleName}** не найдена.`, ephemeral: true });
    }

    // Fetch members with this role via REST API
    await interaction.deferReply({ ephemeral: true });
    const membersWithRole = await fetchMembersWithRole(interaction.guild, role.id);

    if (membersWithRole.length === 0) {
      return interaction.editReply({ content: `ℹ️ Нет участников с ролью **${roleName}**.` });
    }

    // Build user dropdown (max 25 options for Discord select menus)
    const options = membersWithRole.slice(0, 25).map(m => ({
      label: `${m.displayName}`.slice(0, 100),
      value: `${factionTag}::${roleTypeKey}::${m.id}`,
      description: `@${m.username} • ID: ${m.id}`.slice(0, 100),
      emoji: rt.emoji
    }));

    const select = new StringSelectMenuBuilder()
      .setCustomId(`role_removal_user_${factionTag}_${roleTypeKey}`)
      .setPlaceholder('Выберите участника для снятия роли...')
      .addOptions(options);

    return interaction.editReply({
      content: `🗑️ **${faction.emoji} ${faction.title}** — ${rt.emoji} **${rt.label}**\nВыберите участника, с которого нужно снять роль:`,
      components: [new ActionRowBuilder().addComponents(select)]
    });
  }

  // ━━━ Select menu: user chosen for removal → execute removal ━━━
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('role_removal_user_')) {
    const [factionTag, roleTypeKey, targetUserId] = interaction.values[0].split('::');
    const faction = FACTIONS.find(f => f.tag === factionTag);
    const rt = ROLE_TYPES.find(t => t.key === roleTypeKey);

    if (!faction || !rt) {
      return interaction.reply({ content: '❌ Ошибка: неверные данные', ephemeral: true });
    }

    // Authority check
    if (!canRemoveRole(interaction.member, factionTag, roleTypeKey)) {
      return interaction.reply({ content: '❌ **У вас нет прав** для снятия этой роли.', ephemeral: true });
    }

    const guild = interaction.guild;
    const roleName = rt.format(factionTag);
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      return interaction.reply({ content: `❌ Роль **${roleName}** не найдена.`, ephemeral: true });
    }

    try {
      const member = await guild.members.fetch(targetUserId);
      if (!member) {
        return interaction.reply({ content: '❌ Пользователь не найден на сервере.', ephemeral: true });
      }

      if (!member.roles.cache.has(role.id)) {
        return interaction.reply({ content: `❌ У **${member.displayName}** нет роли **${roleName}**.`, ephemeral: true });
      }

      await member.roles.remove(role, `Снято через 🗑️│управление-ролями by ${interaction.user.tag}`);

      const logEmbed = baseEmbed()
        .setTitle(`🗑️ Роль снята — ${faction.emoji} ${faction.title}`)
        .setDescription(
          `**Пользователь:** <@${member.id}> (\`${member.user.tag || member.user.username}\`)\n` +
          `**Снятая роль:** ${rt.emoji} **${rt.label}** — ${roleName}\n` +
          `**Снял:** <@${interaction.user.id}>\n` +
          `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setColor(0xEF4444);

      // Post log in the same channel
      await interaction.reply({ embeds: [logEmbed] });

      // Announce removal in faction 📌│объявления
      try {
        const announceChannel = findApprovalChannel(guild, faction);
        if (announceChannel && announceChannel.name === '📌│объявления') {
          const announceEmbed = baseEmbed()
            .setTitle(`🗑️ Роль снята — ${faction.emoji} ${faction.title}`)
            .setDescription(
              `**Пользователь:** <@${member.id}> (\`${member.user.tag || member.user.username}\`)\n` +
              `**Снятая роль:** ${rt.emoji} **${rt.label}** — ${roleName}\n` +
              `**Снял:** <@${interaction.user.id}>\n` +
              `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
            )
            .setColor(0xEF4444);
          await announceChannel.send({ embeds: [announceEmbed] });
        }
      } catch (err) { console.error('[ROLE-REQ] removal announce error:', err); }

      // Try DM
      try {
        await member.user.send(
          `🗑️ Ваша роль **${roleName}** в **${faction.emoji} ${faction.title}** была снята.\n` +
          `Если это ошибка, обратитесь к руководству.`
        );
      } catch {}

      console.log(`[ROLE-REQ] 🗑️ ${member.user.tag}: removed ${roleName} (by ${interaction.user.tag} via Discord)`);
    } catch (err) {
      console.error('[ROLE-REQ] removal error:', err);
      return interaction.reply({ content: `❌ Ошибка: ${err.message}`, ephemeral: true });
    }
    return;
  }
}

/* ─── post removal panel in faction channel ─── */

async function postRemovalPanel(guild, factionTag) {
  const faction = FACTIONS.find(f => f.tag === factionTag);
  if (!faction) throw new Error(`Faction ${factionTag} not found`);

  const channel = guild.channels.cache.find(
    ch => ch.name === '🗑️│управление-ролями' && ch.parent && ch.parent.name.includes(faction.title)
  );
  if (!channel) throw new Error(`Канал 🗑️│управление-ролями не найден для ${faction.title}. Сначала разверните структуру.`);

  const embed = baseEmbed()
    .setTitle(`🗑️ Управление ролями — ${faction.emoji} ${faction.title}`)
    .setDescription(
      `Используйте кнопку ниже для снятия ролей с участников.\n\n` +
      `**Иерархия снятия ролей:**\n` +
      `👑 **Лидер** — может снять 👔 Зам. Лидера и 👥 Участника\n` +
      `👔 **Зам. Лидера** — может снять только 👥 Участника\n` +
      `🛡️ **Админ / 🔨 Модератор** — может снять любую роль\n\n` +
      `**Как это работает:**\n` +
      `1️⃣ Нажмите **🗑️ Снять роль**\n` +
      `2️⃣ Выберите тип роли\n` +
      `3️⃣ Выберите участника из выпадающего списка\n` +
      `4️⃣ Бот снимет роль и отправит уведомление\n\n` +
      `⚠️ Это действие **необратимо**. Пользователь должен будет подать новый запрос.`
    )
    .setColor(0xEF4444);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`role_removal_start_${factionTag}`)
      .setLabel('🗑️ Снять роль')
      .setStyle(ButtonStyle.Danger)
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log(`[ROLE-REQ] Removal panel posted for ${faction.emoji} ${faction.title}`);
  return { channelId: channel.id, channelName: channel.name };
}

/* ─── exports ─── */

module.exports = {
  FACTIONS,
  ROLE_TYPES,
  loadRequests,
  saveRequests,
  canApprove,
  canRemoveRole,
  getRemovableRoleTypes,
  roleNameForType,
  postRequestPanel,
  postRemovalPanel,
  handleInteraction,
};
