const { ChannelType, PermissionsBitField } = require('discord.js');

// ═══════════════════════════════════════════════════════════════
// SRP Legacy — Менеджер Организаций (Faction Structure Manager)
// Discord — дополнение к игровому форуму: чат, голос, объявления.
// ═══════════════════════════════════════════════════════════════

const P = PermissionsBitField.Flags;

const FACTIONS = [
  { tag: 'MAYOR',   emoji: '🏛️',  title: 'Мэрия',        color: '#F1C40F' },
  { tag: 'FBI',     emoji: '🕵️',   title: 'ФБР',          color: '#2C3E50' },
  { tag: 'LSPD',    emoji: '🚓',   title: 'ЛСПД',         color: '#3498DB' },
  { tag: 'SFPD',    emoji: '🚓',   title: 'СФПД',         color: '#2980B9' },
  { tag: 'LVPD',    emoji: '🚓',   title: 'ЛВПД',         color: '#1ABC9C' },
  { tag: 'ARMY-LV', emoji: '🪖',   title: 'Армия ЛВ',     color: '#27AE60' },
  { tag: 'ARMY-SF', emoji: '🪖',   title: 'Армия СФ',     color: '#229954' },
  { tag: 'MOH',     emoji: '🚑',   title: 'Минздрав',     color: '#E74C3C' },
  { tag: 'INST',    emoji: '🏫',   title: 'Инструкторы',  color: '#9B59B6' },
  { tag: 'COURT',   emoji: '⚖️',   title: 'Суд',          color: '#E67E22' }
];

const GLOBAL_ROLES = [
  { name: '🛠️ Владелец',         color: '#E74C3C' },
  { name: '🛡️ Админ',            color: '#E91E63' },
  { name: '🔨 Модератор',        color: '#9C27B0' },
  { name: '✅ Верифицирован',     color: '#4CAF50' },
  { name: '❌ Не верифицирован',  color: '#757575' },
  { name: '🤖 Бот',              color: '#607D8B' }
];

let setupStatus = { active: false, progress: 0, total: 0, currentTask: 'Ожидание' };
const delay = ms => new Promise(res => setTimeout(res, ms));

// ─── Утилиты ────────────────────────────────────────────────
async function findOrCreateRole(guild, name, color, perms) {
    let role = guild.roles.cache.find(r => r.name === name);
    if (!role) {
        role = await guild.roles.create({
            name, color,
            permissions: perms || [],
            reason: 'SRP Legacy — авто-настройка'
        });
    }
    return role;
}

async function findOrCreateChannel(guild, name, type, parentId, overwrites) {
    let ch = guild.channels.cache.find(c =>
        c.name === name && c.type === type && (parentId ? c.parentId === parentId : true)
    );
    if (!ch) {
        ch = await guild.channels.create({
            name, type,
            parent: parentId || undefined,
            permissionOverwrites: overwrites || [],
            reason: 'SRP Legacy — авто-настройка'
        });
    } else if (overwrites && overwrites.length > 0) {
        try { await ch.permissionOverwrites.set(overwrites); } catch (_) {}
    }
    return ch;
}

async function findOrCreateCategory(guild, name, overwrites) {
    let cat = guild.channels.cache.find(c =>
        c.name === name && c.type === ChannelType.GuildCategory
    );
    if (!cat) {
        cat = await guild.channels.create({
            name, type: ChannelType.GuildCategory,
            permissionOverwrites: overwrites || [],
            reason: 'SRP Legacy — авто-настройка'
        });
    } else if (overwrites && overwrites.length > 0) {
        try { await cat.permissionOverwrites.set(overwrites); } catch (_) {}
    }
    return cat;
}

function step(msg) { setupStatus.currentTask = msg; setupStatus.progress++; }

// ════════════════════════════════════════════════════════════
//  ОСНОВНАЯ ФУНКЦИЯ РАЗВЁРТЫВАНИЯ
// ════════════════════════════════════════════════════════════
async function deployStructure(guild) {
    if (setupStatus.active) return false;

    // Task count: 1(@everyone) + 6(global roles) + 4(start cat + 3 channels)
    //   + 3(admin cat + 2 channels) + per-faction(3 roles + 1 cat + 4 text + 4 voice = 12)
    const totalTasks = 1 + GLOBAL_ROLES.length + 4 + 3 + (FACTIONS.length * 12);
    setupStatus = { active: true, progress: 0, total: totalTasks, currentTask: 'Запуск...' };

    try {
        const everyone = guild.roles.everyone;

        // ═══ 1. @everyone — базовые права ═══
        step('⚙️ Настройка @everyone...');
        await everyone.setPermissions([P.ViewChannel, P.ReadMessageHistory, P.Connect, P.Speak]);
        await delay(400);

        // ═══ 2. Глобальные роли ═══
        const rc = {};
        for (const gr of GLOBAL_ROLES) {
            step(`🎭 Роль: ${gr.name}...`);
            rc[gr.name] = await findOrCreateRole(guild, gr.name, gr.color);
            await delay(350);
        }

        const adminRole = rc['🛡️ Админ'];
        const modRole   = rc['🔨 Модератор'];
        const verified  = rc['✅ Верифицирован'];
        const unverified = rc['❌ Не верифицирован'];

        // Задаём права Админу: двигать участников, кик, бан, мут, но НЕ управлять сервером
        try {
            await adminRole.setPermissions([
                P.ViewChannel, P.SendMessages, P.ReadMessageHistory,
                P.ManageMessages, P.ManageNicknames,
                P.KickMembers, P.BanMembers, P.MuteMembers, P.DeafenMembers,
                P.MoveMembers, P.Connect, P.Speak, P.ModerateMembers,
                P.AttachFiles, P.EmbedLinks, P.UseExternalEmojis, P.AddReactions
            ]);
        } catch (_) {}
        await delay(200);

        // Модератор: кик, мут, двигать
        try {
            await modRole.setPermissions([
                P.ViewChannel, P.SendMessages, P.ReadMessageHistory,
                P.ManageMessages, P.KickMembers, P.MuteMembers,
                P.MoveMembers, P.Connect, P.Speak, P.ModerateMembers,
                P.AttachFiles, P.EmbedLinks, P.UseExternalEmojis, P.AddReactions
            ]);
        } catch (_) {}
        await delay(200);

        // ═══ 3. СТАРТ — верификация + запрос ролей ═══
        step('🚀 Категория: СТАРТ...');
        const startCat = await findOrCreateCategory(guild, '🚀 СТАРТ', [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory] }
        ]);
        await delay(300);

        // ── 📋│правила-верификации ──
        step('📋 Канал: правила верификации...');
        await findOrCreateChannel(guild, '📋│правила-верификации', ChannelType.GuildText, startCat.id, [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages] }
        ]);
        await delay(300);

        // ── ✅│верификация ──
        step('✅ Канал: верификация...');
        await findOrCreateChannel(guild, '✅│верификация', ChannelType.GuildText, startCat.id, [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages] },
        ]);
        await delay(300);

        // ── 📩│запрос-роли ──
        step('📩 Канал: запрос роли...');
        await findOrCreateChannel(guild, '📩│запрос-роли', ChannelType.GuildText, startCat.id, [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages] },
        ]);
        await delay(300);

        // ═══ 4. 🛡️ АДМИНИСТРАЦИЯ ═══
        step('🛡️ Категория: Администрация...');
        const adminCat = await findOrCreateCategory(guild, '🛡️ Администрация', [
            { id: everyone.id, deny: [P.ViewChannel] },
            { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages] },
            { id: modRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] }
        ]);
        await delay(300);

        step('📢 Канал: админ-чат...');
        await findOrCreateChannel(guild, '📢│админ-чат', ChannelType.GuildText, adminCat.id, [
            { id: everyone.id, deny: [P.ViewChannel] },
            { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
            { id: modRole.id, allow: [P.ViewChannel, P.SendMessages] }
        ]);
        await delay(300);

        step('🔊 Голос: админ-совещание...');
        await findOrCreateChannel(guild, '🔊 Админ-совещание', ChannelType.GuildVoice, adminCat.id, [
            { id: everyone.id, deny: [P.ViewChannel] },
            { id: adminRole.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers, P.MuteMembers] },
            { id: modRole.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
        ]);
        await delay(300);

        // ═══ 5. ОРГАНИЗАЦИИ ═══
        for (const faction of FACTIONS) {
            step(`🏗️ ${faction.emoji} ${faction.title} — роли...`);

            // Роли
            const fR = {};
            const roleDefs = [
                { key: 'leader', suffix: 'Лидер',       emoji: '👑' },
                { key: 'deputy', suffix: 'Зам. Лидера', emoji: '👔' },
                { key: 'member', suffix: 'Участник',    emoji: '👥' }
            ];
            for (const rd of roleDefs) {
                const rName = `${rd.emoji} ${faction.tag} │ ${rd.suffix}`;
                fR[rd.key] = await findOrCreateRole(guild, rName, faction.color);
                step(`  → ${rName}`);
                await delay(300);
            }

            // Категория
            step(`🏗️ ${faction.emoji} ${faction.title} — категория...`);
            const catName = `${faction.emoji} ${faction.title}`;
            const catOW = [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages, P.MoveMembers, P.MuteMembers, P.Connect, P.Speak] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.ManageMessages, P.SendMessages, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.ManageMessages, P.SendMessages, P.Connect, P.Speak, P.MuteMembers] },
                { id: fR.member.id, allow: [P.ViewChannel, P.SendMessages, P.Connect, P.Speak] }
            ];
            const cat = await findOrCreateCategory(guild, catName, catOW);
            await delay(350);

            // ── Текстовые каналы ──
            // 1. Объявления (только лидер/зам пишут, участники читают)
            step(`  📌 ${faction.title} — объявления...`);
            await findOrCreateChannel(guild, '📌│объявления', ChannelType.GuildText, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.member.id, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages] }
            ]);
            await delay(300);

            // 2. Общий чат — все участники
            step(`  💬 ${faction.title} — общий чат...`);
            await findOrCreateChannel(guild, '💬│общий-чат', ChannelType.GuildText, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.member.id, allow: [P.ViewChannel, P.SendMessages] }
            ]);
            await delay(300);

            // 3. Обсуждения (1 на 1 / личные переговоры)
            step(`  🤝 ${faction.title} — обсуждения 1×1...`);
            await findOrCreateChannel(guild, '🤝│обсуждения-1на1', ChannelType.GuildText, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.member.id, allow: [P.ViewChannel, P.SendMessages] }
            ]);
            await delay(300);

            // 4. Обсуждения (2 на 2 / групповые)
            step(`  👥 ${faction.title} — обсуждения 2×2...`);
            await findOrCreateChannel(guild, '👥│обсуждения-2на2', ChannelType.GuildText, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                { id: fR.member.id, allow: [P.ViewChannel, P.SendMessages] }
            ]);
            await delay(300);

            // ── Голосовые каналы ──
            // 1. Брифинг / Совещание
            step(`  🔊 ${faction.title} — голос: совещание...`);
            await findOrCreateChannel(guild, '🔊 Совещание', ChannelType.GuildVoice, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers] },
                { id: fR.member.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
            ]);
            await delay(300);

            // 2. Рабочая комната
            step(`  🎙️ ${faction.title} — голос: рабочая...`);
            await findOrCreateChannel(guild, '🎙️ Рабочая', ChannelType.GuildVoice, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers] },
                { id: fR.member.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
            ]);
            await delay(300);

            // 3. 1×1 голос
            step(`  🤝 ${faction.title} — голос: 1 на 1...`);
            await findOrCreateChannel(guild, '🤝 Голос 1×1', ChannelType.GuildVoice, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                { id: fR.member.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
            ]);
            await delay(300);

            // 4. 2×2 голос
            step(`  👥 ${faction.title} — голос: 2 на 2...`);
            await findOrCreateChannel(guild, '👥 Голос 2×2', ChannelType.GuildVoice, cat.id, [
                { id: everyone.id, deny: [P.ViewChannel] },
                { id: fR.leader.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                { id: fR.member.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
            ]);
            await delay(300);
        }

        setupStatus.currentTask = '✅ Развёртывание завершено успешно!';
        setupStatus.progress = setupStatus.total;
    } catch (e) {
        console.error('[STRUCTURE] Ошибка:', e);
        setupStatus.currentTask = '❌ Ошибка: ' + e.message;
    } finally {
        setTimeout(() => { setupStatus.active = false; }, 15000);
    }
}

function getSetupStatus() { return setupStatus; }

module.exports = { deployStructure, getSetupStatus, FACTIONS, GLOBAL_ROLES };
