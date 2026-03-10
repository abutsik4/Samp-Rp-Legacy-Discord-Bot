// ─────────────────────────────────────────────────────────
// Verification Manager — form-based verification system
// ─────────────────────────────────────────────────────────
const fs   = require('fs');
const path = require('path');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionsBitField
} = require('discord.js');
const { baseEmbed } = require('./embedFactory');

const VERIFICATION_FILE = path.join(__dirname, '..', '..', 'data', 'verification-requests.json');

/* ─── staff check helper ─── */
const STAFF_PATTERNS = [
  '🛡️ Админ', '🔨 Модератор', '🛠️ Владелец',
  '⭐ Гл. Администратор', '👑 Зам. Гл. Админа',
  'Следящий за'  // All curator roles (Следящий за SAPD, Mayor/Court, etc.)
];
function isStaff(names) {
  return names.some(n => STAFF_PATTERNS.some(p => n.includes(p)));
}

/* ─── persistence ─── */
function loadVerifications() {
  try {
    if (!fs.existsSync(VERIFICATION_FILE)) fs.writeFileSync(VERIFICATION_FILE, '[]', 'utf8');
    return JSON.parse(fs.readFileSync(VERIFICATION_FILE, 'utf8'));
  } catch { return []; }
}

function saveVerifications(list) {
  try {
    const dir = path.dirname(VERIFICATION_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(VERIFICATION_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) { console.error('[VERIFY] save error:', err); }
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ─── find admin verification channel ─── */
function findVerificationRequestsChannel(guild) {
  return guild.channels.cache.find(
    ch => ch.name === '📋│заявки-верификации' && ch.parent && ch.parent.name.includes('Администрация')
  ) || null;
}

/* ─── post the admin pending-requests panel in 📋│заявки-верификации ─── */
async function postPendingPanel(guild) {
  const channel = findVerificationRequestsChannel(guild);
  if (!channel) throw new Error('Канал 📋│заявки-верификации не найден.');

  const embed = baseEmbed()
    .setTitle('📋 Панель заявок на верификацию')
    .setDescription(
      `Здесь появляются заявки пользователей на верификацию.\n\n` +
      `• Нажмите **✅ Одобрить** / **❌ Отклонить** на заявке\n` +
      `• Нажмите кнопку ниже, чтобы посмотреть все ожидающие заявки\n\n` +
      `_Заявки обрабатываются администрацией и модераторами._`
    )
    .setColor(0x5865F2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_pending_0')
      .setLabel('📋 Ожидающие заявки')
      .setStyle(ButtonStyle.Primary)
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log('[VERIFY] Pending panel posted in #📋│заявки-верификации');
  return { channelId: channel.id, channelName: channel.name };
}

/* ─── build pending requests embed (paginated, 5 per page) ─── */
const PAGE_SIZE = 5;
function buildPendingEmbed(page) {
  const requests = loadVerifications();
  const pending = requests.filter(r => r.status === 'pending');
  const total = pending.length;

  if (total === 0) {
    return {
      embed: baseEmbed()
        .setTitle('📋 Ожидающие заявки на верификацию')
        .setDescription('✨ Нет ожидающих заявок!')
        .setColor(0x22C55E),
      components: [],
      total: 0,
      pages: 0
    };
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const safePage = Math.max(0, Math.min(page, pages - 1));
  const slice = pending
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const lines = slice.map((r, i) => {
    const num = safePage * PAGE_SIZE + i + 1;
    const ts = Math.floor(new Date(r.createdAt).getTime() / 1000);
    return `**${num}.** <@${r.userId}> (\`${r.userTag}\`)\n` +
           `　🎮 Ник: \`${r.nickname}\` · 🔗 ${r.server}\n` +
           `　⏰ Подана: <t:${ts}:R> · ID: \`${r.id}\``;
  }).join('\n\n');

  const embed = baseEmbed()
    .setTitle('📋 Ожидающие заявки на верификацию')
    .setDescription(lines)
    .setFooter({ text: `Страница ${safePage + 1} из ${pages} • Всего заявок: ${total}` })
    .setColor(0xF59E0B);

  const buttons = [];
  if (safePage > 0) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`verify_pending_${safePage - 1}`)
        .setLabel('◀ Назад')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`verify_pending_${safePage}`)
      .setLabel(`${safePage + 1} / ${pages}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
  );
  if (safePage < pages - 1) {
    buttons.push(
      new ButtonBuilder()
        .setCustomId(`verify_pending_${safePage + 1}`)
        .setLabel('Вперёд ▶')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  buttons.push(
    new ButtonBuilder()
      .setCustomId(`verify_pending_${safePage}_refresh`)
      .setLabel('🔄')
      .setStyle(ButtonStyle.Success)
  );

  const components = buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [];
  return { embed, components, total, pages };
}

/* ─── post the verification panel in ✅│верификация ─── */
async function postVerificationPanel(guild) {
  const channel = guild.channels.cache.find(ch => ch.name === '✅│верификация');
  if (!channel) throw new Error('Канал ✅│верификация не найден. Сначала разверните структуру.');

  const embed = baseEmbed()
    .setTitle('✅ Верификация на сервере')
    .setDescription(
      `Добро пожаловать на **SRP | Legacy | AF & LEA**!\n\n` +
      `Для получения доступа к каналам организаций и возможности запрашивать роли, ` +
      `вам необходимо пройти верификацию.\n\n` +
      `**Как это работает:**\n` +
      `1️⃣ Нажмите кнопку **📝 Пройти верификацию** ниже\n` +
      `2️⃣ Заполните анкету (игровой ник, ссылка на форумник)\n` +
      `3️⃣ Ваша заявка будет отправлена на рассмотрение\n` +
      `4️⃣ Администрация проверит данные и примет решение\n` +
      `5️⃣ При одобрении вы получите роль **✅ Верифицирован**\n\n` +
      `⚠️ **Требования для верификации:**\n` +
      `• Наличие аккаунта на сервере SRP Legacy\n` +
      `• Корректный игровой ник (Имя_Фамилия)\n` +
      `• Один аккаунт Discord = один запрос верификации\n\n` +
      `⏳ Рассмотрение занимает до **24 часов**. Повторные заявки при наличии активной будут отклонены автоматически.`
    )
    .setColor(0x4CAF50);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verification_start')
      .setLabel('📝 Пройти верификацию')
      .setStyle(ButtonStyle.Success)
  );

  await channel.send({ embeds: [embed], components: [row] });
  console.log('[VERIFY] Verification panel posted in #✅│верификация');
  return { channelId: channel.id, channelName: channel.name };
}

/* ─── post rules embed in 📋│правила-верификации ─── */
async function postRulesEmbed(guild) {
  const channel = guild.channels.cache.find(ch => ch.name === '📋│правила-верификации');
  if (!channel) throw new Error('Канал 📋│правила-верификации не найден.');

  const rulesEmbed = baseEmbed()
    .setTitle('📜 Правила сервера Discord — SRP | Legacy')
    .setDescription(
      `Добро пожаловать на официальный Discord-сервер **SRP | Legacy | AF & LEA**!\n` +
      `Пожалуйста, внимательно прочитайте правила. Нарушение ведёт к предупреждениям, мутам или бану.`
    )
    .addFields(
      {
        name: '§1. Общие правила поведения',
        value:
          '• Уважайте всех участников сервера\n' +
          '• Запрещены оскорбления, токсичность, провокации\n' +
          '• Запрещена любая форма дискриминации\n' +
          '• Не спамьте, не флудите, не злоупотребляйте капсом\n' +
          '• Используйте каналы по назначению'
      },
      {
        name: '§2. Контент',
        value:
          '• Запрещён NSFW контент в любых каналах\n' +
          '• Запрещена реклама сторонних серверов и проектов\n' +
          '• Запрещено распространение вредоносных ссылок\n' +
          '• Не публикуйте персональные данные других людей'
      },
      {
        name: '§3. Голосовые каналы',
        value:
          '• Не используйте голосовые модификаторы (саундборды)\n' +
          '• Не создавайте посторонний шум\n' +
          '• Уважайте лимиты участников в каналах\n' +
          '• Следуйте указаниям модераторов'
      },
      {
        name: '§4. Верификация',
        value:
          '• Верификация обязательна для доступа к каналам организаций\n' +
          '• Указывайте реальный игровой ник (Имя_Фамилия)\n' +
          '• Один Discord аккаунт = одна верификация\n' +
          '• Ложные данные при верификации = бан\n' +
          '• При смене ника в игре — обратитесь к администрации'
      },
      {
        name: '§5. Роли и организации',
        value:
          '• Запрос роли доступен только после верификации\n' +
          '• Не злоупотребляйте запросами ролей\n' +
          '• Лидеры организаций несут ответственность за свой состав\n' +
          '• Администрация может снять роль без предупреждения при нарушении правил'
      },
      {
        name: '§6. Администрация',
        value:
          '• Решения администрации не подлежат публичному обсуждению\n' +
          '• По вопросам обращайтесь в личные сообщения администраторам\n' +
          '• Попытки обхода наказаний ведут к перманентному бану\n' +
          '• Администрация оставляет за собой право изменять правила'
      },
      {
        name: '⚠️ Наказания',
        value:
          '🔸 **Предупреждение** — за мелкие нарушения\n' +
          '🔸 **Мут** — за повторные нарушения или спам\n' +
          '🔸 **Кик** — за серьёзные нарушения\n' +
          '🔸 **Бан** — за грубые нарушения или повторный кик\n\n' +
          '📌 *Нажимая кнопку верификации, вы соглашаетесь с правилами сервера.*'
      }
    )
    .setColor(0x5865F2);

  await channel.send({ embeds: [rulesEmbed] });
  console.log('[VERIFY] Rules embed posted in #📋│правила-верификации');
  return { channelId: channel.id, channelName: channel.name };
}

/* ─── interaction handler ─── */
async function handleInteraction(interaction) {

  // ━━━ Button: view pending requests (admin) ━━━
  if (interaction.isButton() && interaction.customId.startsWith('verify_pending_')) {
    const memberRoles = interaction.member.roles.cache.map(r => r.name);
    if (!isStaff(memberRoles)
        && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Только администрация может просматривать заявки.', ephemeral: true });
    }
    const parts = interaction.customId.slice('verify_pending_'.length).split('_');
    const page = parseInt(parts[0], 10) || 0;
    const { embed, components } = buildPendingEmbed(page);
    return interaction.reply({ embeds: [embed], components, ephemeral: true });
  }

  // ━━━ Button: start verification ━━━
  if (interaction.isButton() && interaction.customId === 'verification_start') {
    // Check if already verified
    const memberRoles = interaction.member.roles.cache.map(r => r.name);
    if (memberRoles.some(n => n.includes('✅ Верифицирован'))) {
      return interaction.reply({
        content: '✅ Вы уже верифицированы!',
        ephemeral: true
      });
    }

    // Check for pending request
    const requests = loadVerifications();
    const pending = requests.find(r => r.userId === interaction.user.id && r.status === 'pending');
    if (pending) {
      return interaction.reply({
        content: '⏳ У вас уже есть активная заявка на верификацию. Ожидайте решения администрации.',
        ephemeral: true
      });
    }

    // Show the verification modal
    const modal = new ModalBuilder()
      .setCustomId('verification_form')
      .setTitle('📝 Анкета верификации');

    const nicknameInput = new TextInputBuilder()
      .setCustomId('verify_nickname')
      .setLabel('Игровой ник (Имя_Фамилия)')
      .setPlaceholder('Например: Ivan_Petrov')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(3)
      .setMaxLength(50);

    const serverInput = new TextInputBuilder()
      .setCustomId('verify_server')
      .setLabel('Ссылка на форумник')
      .setPlaceholder('Например: https://forum.srp-legacy.ru/profile/12345')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(200);

    const aboutInput = new TextInputBuilder()
      .setCustomId('verify_about')
      .setLabel('Расскажите о себе (должность, опыт)')
      .setPlaceholder('Например: Работаю в ЛСПД, сержант, играю 2 месяца')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nicknameInput),
      new ActionRowBuilder().addComponents(serverInput),
      new ActionRowBuilder().addComponents(aboutInput)
    );

    return interaction.showModal(modal);
  }

  // ━━━ Modal submit: verification form ━━━
  if (interaction.isModalSubmit() && interaction.customId === 'verification_form') {
    const nickname = interaction.fields.getTextInputValue('verify_nickname').trim();
    const server = interaction.fields.getTextInputValue('verify_server').trim();
    const about = interaction.fields.getTextInputValue('verify_about')?.trim() || '—';

    // Validate nickname format (Имя_Фамилия)
    if (!/^[A-Za-zА-Яа-яЁё]+[_][A-Za-zА-Яа-яЁё]+$/.test(nickname)) {
      return interaction.reply({
        content: '❌ **Неверный формат ника.** Используйте формат: `Имя_Фамилия` (например: `Ivan_Petrov`).',
        ephemeral: true
      });
    }

    // Double-check no pending
    let requests = loadVerifications();
    if (requests.find(r => r.userId === interaction.user.id && r.status === 'pending')) {
      return interaction.reply({
        content: '⏳ У вас уже есть активная заявка. Ожидайте решения.',
        ephemeral: true
      });
    }

    // Create verification request
    const request = {
      id: genId(),
      userId: interaction.user.id,
      userTag: interaction.user.tag || interaction.user.username,
      nickname,
      server,
      about,
      status: 'pending',
      decidedBy: null,
      deciderTag: null,
      denyReason: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
      requestMessageId: null,
      requestChannelId: null
    };

    requests.push(request);
    saveVerifications(requests);

    // Send to admin verification channel
    const guild = interaction.guild;
    const adminChannel = findVerificationRequestsChannel(guild);

    if (adminChannel) {
      const requestEmbed = baseEmbed()
        .setTitle('📝 Новая заявка на верификацию')
        .setDescription(
          `**Пользователь:** <@${request.userId}> (\`${request.userTag}\`)\n` +
          `**Аккаунт создан:** <t:${Math.floor(interaction.user.createdTimestamp / 1000)}:R>\n` +
          `**Присоединился:** <t:${Math.floor(interaction.member.joinedTimestamp / 1000)}:R>\n\n` +
          `📋 **Данные анкеты:**`
        )
        .addFields(
          { name: '🎮 Игровой ник', value: `\`${nickname}\``, inline: true },
          { name: '🔗 Форумник', value: server, inline: true },
          { name: '📝 О себе', value: about || '—' }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
        .setColor(0xF59E0B)
        .setFooter({ text: `ID заявки: ${request.id} • User ID: ${request.userId}` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify_approve_${request.id}`)
          .setLabel('✅ Одобрить')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`verify_deny_${request.id}`)
          .setLabel('❌ Отклонить')
          .setStyle(ButtonStyle.Danger)
      );

      try {
        const msg = await adminChannel.send({ embeds: [requestEmbed], components: [row] });
        // Save message reference
        requests = loadVerifications();
        const rec = requests.find(r => r.id === request.id);
        if (rec) {
          rec.requestMessageId = msg.id;
          rec.requestChannelId = msg.channelId;
          saveVerifications(requests);
        }
      } catch (err) {
        console.error('[VERIFY] Failed to post request:', err);
      }
    }

    return interaction.reply({
      content:
        `✅ **Заявка на верификацию отправлена!**\n\n` +
        `📋 **Ваши данные:**\n` +
        `• Ник: \`${nickname}\`\n` +
        `• Форумник: ${server}\n\n` +
        `⏳ Ожидайте решения администрации. Вы получите уведомление в ЛС.`,
      ephemeral: true
    });
  }

  // ━━━ Button: approve verification ━━━
  if (interaction.isButton() && interaction.customId.startsWith('verify_approve_')) {
    const requestId = interaction.customId.slice('verify_approve_'.length);
    const requests = loadVerifications();
    const request = requests.find(r => r.id === requestId);

    if (!request) return interaction.reply({ content: '❌ Заявка не найдена.', ephemeral: true });
    if (request.status !== 'pending') {
      return interaction.reply({ content: `ℹ️ Эта заявка уже рассмотрена (${request.status}).`, ephemeral: true });
    }

    // Only admin/mod can approve
    const memberRoles = interaction.member.roles.cache.map(r => r.name);
    if (!isStaff(memberRoles)
        && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Только администрация может рассматривать заявки.', ephemeral: true });
    }

    try {
      const guild = interaction.guild;
      const member = await guild.members.fetch(request.userId);
      const verifiedRole = guild.roles.cache.find(r => r.name.includes('✅ Верифицирован'));
      const unverifiedRole = guild.roles.cache.find(r => r.name.includes('❌ Не верифицирован'));

      if (verifiedRole) await member.roles.add(verifiedRole, `Верификация одобрена ${interaction.user.tag}`);
      if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
        await member.roles.remove(unverifiedRole, 'Верифицирован');
      }

      // Try to set nickname
      try {
        await member.setNickname(request.nickname, 'Верификация — игровой ник');
      } catch {} // May fail for owner/admin

      // Update record
      request.status = 'approved';
      request.decidedBy = interaction.user.id;
      request.deciderTag = interaction.user.tag || interaction.user.username;
      request.decidedAt = new Date().toISOString();
      saveVerifications(requests);

      // Update the embed
      const doneEmbed = baseEmbed()
        .setTitle('✅ Верификация одобрена')
        .setDescription(
          `**Пользователь:** <@${request.userId}> (\`${request.userTag}\`)\n` +
          `**Игровой ник:** \`${request.nickname}\`\n` +
          `**Одобрил:** <@${interaction.user.id}>\n` +
          `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setColor(0x22C55E);

      await interaction.update({ embeds: [doneEmbed], components: [] });

      // DM the user
      try {
        const user = await guild.client.users.fetch(request.userId);
        await user.send(
          `✅ **Ваша верификация на сервере SRP | Legacy одобрена!**\n\n` +
          `Вам выдана роль **✅ Верифицирован** и установлен ник **${request.nickname}**.\n` +
          `Теперь вы можете запрашивать роли организаций в канале 📩│запрос-роли.`
        );
      } catch {}

      console.log(`[VERIFY] ✅ ${request.userTag} (${request.nickname}) verified by ${interaction.user.tag}`);
    } catch (err) {
      console.error('[VERIFY] approve error:', err);
      return interaction.reply({ content: `❌ Ошибка: ${err.message}`, ephemeral: true });
    }
    return;
  }

  // ━━━ Button: deny verification ━━━
  if (interaction.isButton() && interaction.customId.startsWith('verify_deny_')) {
    const requestId = interaction.customId.slice('verify_deny_'.length);
    const requests = loadVerifications();
    const request = requests.find(r => r.id === requestId);

    if (!request) return interaction.reply({ content: '❌ Заявка не найдена.', ephemeral: true });
    if (request.status !== 'pending') {
      return interaction.reply({ content: `ℹ️ Эта заявка уже рассмотрена (${request.status}).`, ephemeral: true });
    }

    // Only admin/mod
    const memberRoles = interaction.member.roles.cache.map(r => r.name);
    if (!isStaff(memberRoles)
        && !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '❌ Только администрация может рассматривать заявки.', ephemeral: true });
    }

    request.status = 'denied';
    request.decidedBy = interaction.user.id;
    request.deciderTag = interaction.user.tag || interaction.user.username;
    request.decidedAt = new Date().toISOString();
    saveVerifications(requests);

    const denyEmbed = baseEmbed()
      .setTitle('❌ Верификация отклонена')
      .setDescription(
        `**Пользователь:** <@${request.userId}> (\`${request.userTag}\`)\n` +
        `**Игровой ник:** \`${request.nickname}\`\n` +
        `**Отклонил:** <@${interaction.user.id}>\n` +
        `**Дата:** <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor(0xEF4444);

    await interaction.update({ embeds: [denyEmbed], components: [] });

    // DM the user
    try {
      const user = await interaction.guild.client.users.fetch(request.userId);
      await user.send(
        `❌ **Ваша заявка на верификацию на сервере SRP | Legacy отклонена.**\n\n` +
        `Возможные причины: неверный ник, неполные данные.\n` +
        `Вы можете подать повторную заявку с корректными данными.`
      );
    } catch {}

    console.log(`[VERIFY] ❌ ${request.userTag} (${request.nickname}) denied by ${interaction.user.tag}`);
    return;
  }
}

/* ─── exports ─── */
module.exports = {
  handleInteraction,
  postVerificationPanel,
  postPendingPanel,
  postRulesEmbed,
  loadVerifications,
  saveVerifications,
  findVerificationRequestsChannel,
};
