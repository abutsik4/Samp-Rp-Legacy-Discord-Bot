const { ChannelType, PermissionsBitField } = require('discord.js');

// ═══════════════════════════════════════════════════════════════
// SRP Legacy — Менеджер Организаций (Faction Structure Manager)
// Discord — дополнение к игровому форуму: чат, голос, объявления.
// ═══════════════════════════════════════════════════════════════

const P = PermissionsBitField.Flags;

const FACTIONS = [
  { tag: 'MAYOR',   emoji: '🏛️',  title: 'Мэрия',        color: '#F1C40F',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Совещание', perm: 'vLeader' },
      { name: '🎙️ Рабочая',  perm: 'vLeader' },
      { name: '🤝 Голос 1×1', perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2', perm: 'vAll', userLimit: 4 },
    ]
  },
  { tag: 'FBI',     emoji: '🕵️',   title: 'ФБР',          color: '#2C3E50',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│оперативка',       perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '👥│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',   perm: 'vLeader' },
      { name: '🎙️ Оперштаб',  perm: 'vLeader' },
      { name: '🔊 Совещание',  perm: 'vLeader' },
      { name: '🎙️ Рабочая',   perm: 'vLeader' },
      { name: '🤝 Голос 1×1',  perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2',  perm: 'vAll', userLimit: 4 },
    ]
  },
  { tag: 'LSPD',    emoji: '🚓',   title: 'ЛСПД',         color: '#3498DB',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│департамент',      perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',   perm: 'vLeader' },
      { name: '🚓 Патруль',   perm: 'vAll' },
      { name: '🔊 Совещание',  perm: 'vLeader' },
      { name: '🎙️ Рабочая',   perm: 'vLeader' },
      { name: '🤝 Голос 1×1',  perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2',  perm: 'vAll', userLimit: 4 },
    ]
  },
  { tag: 'SFPD',    emoji: '🚓',   title: 'СФПД',         color: '#2980B9',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│департамент',      perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',   perm: 'vLeader' },
      { name: '🚓 Патруль',   perm: 'vAll' },
      { name: '🔊 Совещание',  perm: 'vLeader' },
      { name: '🎙️ Рабочая',   perm: 'vLeader' },
      { name: '🤝 Голос 1×1',  perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2',  perm: 'vAll', userLimit: 4 },
    ]
  },
  { tag: 'LVPD',    emoji: '🚓',   title: 'ЛВПД',         color: '#1ABC9C',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│департамент',      perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',   perm: 'vLeader' },
      { name: '🚓 Патруль',   perm: 'vAll' },
      { name: '🔊 Совещание',  perm: 'vLeader' },
      { name: '🎙️ Рабочая',   perm: 'vLeader' },
      { name: '🤝 Голос 1×1',  perm: 'vAll' },
      { name: '👥 Голос 2×2',  perm: 'vAll' },
    ]
  },
  { tag: 'ARMY-LV', emoji: '🪖',   title: 'Армия ЛВ',     color: '#27AE60',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│казарма',          perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '👥│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',     perm: 'vLeader' },
      { name: '🛡️ Дежурство',   perm: 'vAll' },
      { name: '🔊 Совещание',    perm: 'vLeader' },
      { name: '🎙️ Рабочая',     perm: 'vLeader' },
      { name: '🤝 Голос 1×1',    perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2',    perm: 'vAll', userLimit: 4 },
    ]
  },
  { tag: 'ARMY-SF', emoji: '🪖',   title: 'Армия СФ',     color: '#229954',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│казарма',          perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',     perm: 'vLeader' },
      { name: '🛡️ Дежурство',   perm: 'vAll' },
      { name: '🔊 Совещание',    perm: 'vLeader' },
      { name: '🎙️ Рабочая',     perm: 'vLeader' },
      { name: '🤝 Голос 1×1',    perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2',    perm: 'vAll', userLimit: 4 },
    ]
  },
  { tag: 'MOH',     emoji: '🚑',   title: 'Минздрав',     color: '#E74C3C',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│ординаторская',    perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',     perm: 'vLeader' },
      { name: '🚑 Дежурство',   perm: 'vAll' },
      { name: '🔊 Совещание',    perm: 'vLeader' },
      { name: '🎙️ Рабочая',     perm: 'vLeader' },
      { name: '🤝 Голос 1×1',    perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2',    perm: 'vAll', userLimit: 4 },
    ]
  },
  { tag: 'INST',    emoji: '🏫',   title: 'Инструкторы',  color: '#9B59B6',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│учебный-центр',    perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Брифинг',     perm: 'vLeader' },
      { name: '📝 Экзамены',    perm: 'vAll' },
      { name: '🔊 Совещание',    perm: 'vLeader' },
      { name: '🎙️ Рабочая',     perm: 'vLeader' },
      { name: '🤝 Голос 1×1',    perm: 'vAll' },
      { name: '👥 Голос 2×2',    perm: 'vAll' },
    ]
  },
  { tag: 'COURT',   emoji: '⚖️',   title: 'Суд',          color: '#E67E22',
    textChannels: [
      { name: '📌│объявления',       perm: 'announce' },
      { name: '💬│канцелярия',       perm: 'chat' },
      { name: '💬│общий-чат',        perm: 'chat' },
      { name: '🤝│обсуждения',       perm: 'chat' },
      { name: '🗑️│управление-ролями', perm: 'manage' },
    ],
    voiceChannels: [
      { name: '🔊 Заседание',    perm: 'vLeader' },
      { name: '🎙️ Кабинет',     perm: 'vLeader' },
      { name: '🔊 Совещание',    perm: 'vLeader' },
      { name: '🎙️ Рабочая',     perm: 'vLeader' },
      { name: '🤝 Голос 1×1',    perm: 'vAll', userLimit: 2 },
      { name: '👥 Голос 2×2',    perm: 'vAll', userLimit: 4 },
    ]
  }
];

const GLOBAL_ROLES = [
  // Администрация (hoisted — отображаются отдельно)
  { name: '🛠️ Владелец',            color: '#E74C3C', hoist: true },
  { name: '⭐ Гл. Администратор',  color: '#FF5722', hoist: true },
  { name: '👑 Зам. Гл. Админа',     color: '#FF7043', hoist: true },
  { name: '🛡️ Админ',               color: '#E91E63', hoist: true },
  { name: '🔨 Модератор',           color: '#9C27B0', hoist: true },
  // Кураторы организаций (consolidated, hoisted)
  { name: '🏛️ Следящий за Mayor/Court', color: '#F1C40F', hoist: true },
  { name: '🕵️ Следящий за FBI',         color: '#2C3E50', hoist: true },
  { name: '🚓 Следящий за SAPD',        color: '#3498DB', hoist: true },
  { name: '🪩 Следящий за Army',        color: '#27AE60', hoist: true },
  { name: '🚑 Следящий за MOH',         color: '#E74C3C', hoist: true },
  { name: '🏫 Следящий за Inst',        color: '#9B59B6', hoist: true },
  // Общие роли
  { name: '✅ Верифицирован',     color: '#4CAF50' },
  { name: '❌ Не верифицирован',  color: '#757575' },
  { name: '🤖 Бот',              color: '#607D8B' }
];

// Привязка кураторов к организациям
const CURATOR_MAP = {
  'MAYOR':   '🏛️ Следящий за Mayor/Court',
  'COURT':   '🏛️ Следящий за Mayor/Court',
  'FBI':     '🕵️ Следящий за FBI',
  'LSPD':    '🚓 Следящий за SAPD',
  'SFPD':    '🚓 Следящий за SAPD',
  'LVPD':    '🚓 Следящий за SAPD',
  'ARMY-LV': '🪩 Следящий за Army',
  'ARMY-SF': '🪩 Следящий за Army',
  'MOH':     '🚑 Следящий за MOH',
  'INST':    '🏫 Следящий за Inst',
};

// Миграция: старое название → новое (для переноса участников)
const MIGRATION_MAP = {
  '🏛️ Следящий за Mayor': '🏛️ Следящий за Mayor/Court',
  '🚓 Следящий за LSPD':  '🚓 Следящий за SAPD',
  '🚓 Следящий за SFPD':  '🚓 Следящий за SAPD',
  '🚓 Следящий за LVPD':  '🚓 Следящий за SAPD',
  '⚖️ Следящий за Court': '🏛️ Следящий за Mayor/Court',
};

let setupStatus = { active: false, progress: 0, total: 0, currentTask: 'Ожидание' };
const delay = ms => new Promise(res => setTimeout(res, ms));

// ─── Утилиты ────────────────────────────────────────────────
async function findOrCreateRole(guild, name, color, perms, opts = {}) {
    let role = guild.roles.cache.find(r => r.name === name);
    if (!role) {
        role = await guild.roles.create({
            name, color,
            permissions: perms || [],
            hoist: opts.hoist || false,
            reason: 'SRP Legacy — авто-настройка'
        });
    } else if (opts.hoist && !role.hoist) {
        await role.setHoist(true, 'SRP Legacy — hoist update').catch(() => {});
    }
    return role;
}

async function findOrCreateChannel(guild, name, type, parentId, overwrites, opts = {}) {
    let ch = guild.channels.cache.find(c =>
        c.name === name && c.type === type && (parentId ? c.parentId === parentId : true)
    );
    if (!ch) {
        ch = await guild.channels.create({
            name, type,
            parent: parentId || undefined,
            permissionOverwrites: overwrites || [],
            userLimit: opts.userLimit || undefined,
            reason: 'SRP Legacy — авто-настройка'
        });
    } else {
        if (overwrites && overwrites.length > 0) {
            try { await ch.permissionOverwrites.set(overwrites); } catch (_) {}
        }
        if (opts.userLimit != null && ch.userLimit !== opts.userLimit) {
            try { await ch.setUserLimit(opts.userLimit); } catch (_) {}
        }
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

// Shorthand: senior-admin overwrites (ViewChannel + full manage in channels)
const SENIOR_TEXT_ALLOW = [P.ViewChannel, P.SendMessages, P.ManageMessages, P.MoveMembers, P.MuteMembers, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];
const SENIOR_VOICE_ALLOW = [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers, P.DeafenMembers];
const CURATOR_TEXT_ALLOW = [P.ViewChannel, P.SendMessages, P.ManageMessages, P.MuteMembers, P.ReadMessageHistory, P.AttachFiles, P.EmbedLinks];
const CURATOR_VOICE_ALLOW = [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers];

async function deployStructure(guild) {
    if (setupStatus.active) return false;

    // Count tasks
    let factionTasks = 0;
    for (const f of FACTIONS) factionTasks += 3 + 1 + f.textChannels.length + f.voiceChannels.length + 1; // +1 temp voice
    // 1(@everyone) + roles + 1(senior perms) + 1(migration) + 4(info cat) + 5(admin cat) + factions
    const totalTasks = 1 + GLOBAL_ROLES.length + 1 + 1 + 4 + 5 + factionTasks;
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
            rc[gr.name] = await findOrCreateRole(guild, gr.name, gr.color, [], { hoist: !!gr.hoist });
            await delay(350);
        }

        const ownerRole    = rc['🛠️ Владелец'];
        const headAdmin    = rc['⭐ Гл. Администратор'];
        const depHeadAdmin = rc['👑 Зам. Гл. Админа'];
        const adminRole    = rc['🛡️ Админ'];
        const modRole      = rc['🔨 Модератор'];
        const verified     = rc['✅ Верифицирован'];
        const unverified   = rc['❌ Не верифицирован'];

        // ═══ 2b. Права ролей ═══
        step('🔐 Настройка прав ролей...');

        // Владелец / Гл. Администратор / Зам. Гл. Админа — полные права МИНУС ManageChannels, ManageGuild
        const seniorAdminPerms = [
            P.ViewChannel, P.SendMessages, P.ReadMessageHistory,
            P.ManageMessages, P.ManageNicknames, P.ManageRoles,
            P.KickMembers, P.BanMembers, P.MuteMembers, P.DeafenMembers,
            P.MoveMembers, P.Connect, P.Speak, P.ModerateMembers,
            P.AttachFiles, P.EmbedLinks, P.UseExternalEmojis, P.AddReactions
        ];
        try { await ownerRole.setPermissions(seniorAdminPerms); } catch (_) {}
        await delay(200);
        try { await headAdmin.setPermissions(seniorAdminPerms); } catch (_) {}
        await delay(200);
        try { await depHeadAdmin.setPermissions(seniorAdminPerms); } catch (_) {}
        await delay(200);

        // Админ — keep as-is
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

        // ═══ 2c. Миграция старых кураторских ролей ═══
        step('🔄 Миграция кураторских ролей...');
        for (const [oldName, newName] of Object.entries(MIGRATION_MAP)) {
            const oldRole = guild.roles.cache.find(r => r.name === oldName);
            if (oldRole) {
                const newRole = rc[newName];
                if (newRole) {
                    for (const [, member] of oldRole.members) {
                        try {
                            if (!member.roles.cache.has(newRole.id)) await member.roles.add(newRole);
                            await member.roles.remove(oldRole);
                            await delay(200);
                        } catch (e) { console.error(`[STRUCTURE] Migration error for ${member.user.tag}:`, e.message); }
                    }
                    try { await oldRole.delete('SRP Legacy — curator consolidation'); } catch (_) {}
                }
            }
        }
        await delay(300);

        // Helper: senior admin overwrite entries for text channels
        const seniorTextOW = [
            { id: ownerRole.id, allow: SENIOR_TEXT_ALLOW },
            { id: headAdmin.id, allow: SENIOR_TEXT_ALLOW },
            { id: depHeadAdmin.id, allow: SENIOR_TEXT_ALLOW },
        ];
        // Helper: senior admin overwrite entries for voice channels
        const seniorVoiceOW = [
            { id: ownerRole.id, allow: SENIOR_VOICE_ALLOW },
            { id: headAdmin.id, allow: SENIOR_VOICE_ALLOW },
            { id: depHeadAdmin.id, allow: SENIOR_VOICE_ALLOW },
        ];

        // ═══ 3. 📚 Основная Информация — верификация + запрос ролей ═══
        step('📚 Категория: Основная Информация...');
        const startCat = await findOrCreateCategory(guild, '📚 Основная Информация', [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory] }
        ]);
        await delay(300);

        step('� Канал: как-верифицироваться...');
        await findOrCreateChannel(guild, '📝│как-верифицироваться', ChannelType.GuildText, startCat.id, [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages] }
        ]);
        await delay(300);

        step('✅ Канал: верификация...');
        await findOrCreateChannel(guild, '✅│верификация', ChannelType.GuildText, startCat.id, [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages] },
        ]);
        await delay(300);

        step('📩 Канал: запрос роли...');
        await findOrCreateChannel(guild, '📩│запрос-роли', ChannelType.GuildText, startCat.id, [
            { id: everyone.id, allow: [P.ViewChannel, P.ReadMessageHistory, P.SendMessages] },
        ]);
        await delay(300);

        // ═══ 4. 🛡️ АДМИНИСТРАЦИЯ ═══
        step('🛡️ Категория: Администрация...');
        const adminCat = await findOrCreateCategory(guild, '🛡️ Администрация', [
            { id: everyone.id, deny: [P.ViewChannel] },
            ...seniorTextOW,
            { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.ManageMessages] },
            { id: modRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] }
        ]);
        await delay(300);

        step('📢 Канал: объявления-админ...');
        await findOrCreateChannel(guild, '📢│объявления-админ', ChannelType.GuildText, adminCat.id, [
            { id: everyone.id, deny: [P.ViewChannel] },
            ...seniorTextOW,
            { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages, P.ReadMessageHistory] },
            { id: modRole.id, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages] }
        ]);
        await delay(300);

        step('📢 Канал: админ-чат...');
        await findOrCreateChannel(guild, '📢│админ-чат', ChannelType.GuildText, adminCat.id, [
            { id: everyone.id, deny: [P.ViewChannel] },
            ...seniorTextOW,
            { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
            { id: modRole.id, allow: [P.ViewChannel, P.SendMessages] }
        ]);
        await delay(300);

        step('📋 Канал: заявки-верификации...');
        await findOrCreateChannel(guild, '📋│заявки-верификации', ChannelType.GuildText, adminCat.id, [
            { id: everyone.id, deny: [P.ViewChannel] },
            ...seniorTextOW,
            { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages, P.ReadMessageHistory] },
            { id: modRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] }
        ]);
        await delay(300);

        step('🔊 Голос: админ-совещание...');
        await findOrCreateChannel(guild, '🔊 Админ-совещание', ChannelType.GuildVoice, adminCat.id, [
            { id: everyone.id, deny: [P.ViewChannel] },
            ...seniorVoiceOW,
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

            // Resolve curator role for this faction
            const curatorRoleName = CURATOR_MAP[faction.tag];
            const curatorRole = curatorRoleName ? rc[curatorRoleName] : null;
            const curatorTextOW = curatorRole ? [{ id: curatorRole.id, allow: CURATOR_TEXT_ALLOW }] : [];
            const curatorVoiceOW = curatorRole ? [{ id: curatorRole.id, allow: CURATOR_VOICE_ALLOW }] : [];

            // Категория
            step(`🏗️ ${faction.emoji} ${faction.title} — категория...`);
            const catName = `${faction.emoji} ${faction.title}`;
            const catOW = [
                { id: everyone.id, deny: [P.ViewChannel] },
                ...seniorTextOW,
                { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages, P.MoveMembers, P.MuteMembers, P.Connect, P.Speak, P.ReadMessageHistory] },
                { id: modRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory, P.Connect, P.Speak] },
                ...curatorTextOW,
                { id: fR.leader.id, allow: [P.ViewChannel, P.ManageMessages, P.SendMessages, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers, P.ReadMessageHistory] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.ManageMessages, P.SendMessages, P.Connect, P.Speak, P.MuteMembers, P.ReadMessageHistory] },
                { id: fR.member.id, allow: [P.ViewChannel, P.SendMessages, P.Connect, P.Speak, P.ReadMessageHistory] }
            ];
            const cat = await findOrCreateCategory(guild, catName, catOW);
            await delay(350);

            // ── Текстовые каналы (per-faction definitions) ──
            for (const chDef of faction.textChannels) {
                step(`  📝 ${faction.title} — ${chDef.name}...`);
                let overwrites;
                if (chDef.perm === 'announce') {
                    overwrites = [
                        { id: everyone.id, deny: [P.ViewChannel] },
                        ...seniorTextOW,
                        { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages, P.ReadMessageHistory] },
                        { id: modRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
                        ...curatorTextOW,
                        { id: fR.leader.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                        { id: fR.deputy.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                        { id: fR.member.id, allow: [P.ViewChannel, P.ReadMessageHistory], deny: [P.SendMessages] }
                    ];
                } else if (chDef.perm === 'manage') {
                    overwrites = [
                        { id: everyone.id, deny: [P.ViewChannel] },
                        ...seniorTextOW,
                        { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages, P.ReadMessageHistory] },
                        { id: modRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
                        ...curatorTextOW,
                        { id: fR.leader.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
                        { id: fR.deputy.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
                    ];
                } else {
                    overwrites = [
                        { id: everyone.id, deny: [P.ViewChannel] },
                        ...seniorTextOW,
                        { id: adminRole.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages, P.ReadMessageHistory] },
                        { id: modRole.id, allow: [P.ViewChannel, P.SendMessages, P.ReadMessageHistory] },
                        ...curatorTextOW,
                        { id: fR.leader.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                        { id: fR.deputy.id, allow: [P.ViewChannel, P.SendMessages, P.ManageMessages] },
                        { id: fR.member.id, allow: [P.ViewChannel, P.SendMessages] }
                    ];
                }
                await findOrCreateChannel(guild, chDef.name, ChannelType.GuildText, cat.id, overwrites);
                await delay(300);
            }

            // ── Голосовые каналы (per-faction definitions) ──
            for (const vDef of faction.voiceChannels) {
                step(`  🔊 ${faction.title} — ${vDef.name}...`);
                let overwrites;
                if (vDef.perm === 'vLeader') {
                    overwrites = [
                        { id: everyone.id, deny: [P.ViewChannel] },
                        ...seniorVoiceOW,
                        { id: adminRole.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers] },
                        { id: modRole.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                        ...curatorVoiceOW,
                        { id: fR.leader.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers, P.MoveMembers] },
                        { id: fR.deputy.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MuteMembers] },
                        { id: fR.member.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
                    ];
                } else {
                    overwrites = [
                        { id: everyone.id, deny: [P.ViewChannel] },
                        ...seniorVoiceOW,
                        { id: adminRole.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers] },
                        { id: modRole.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                        ...curatorVoiceOW,
                        { id: fR.leader.id, allow: [P.ViewChannel, P.Connect, P.Speak, P.MoveMembers] },
                        { id: fR.deputy.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                        { id: fR.member.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
                    ];
                }
                await findOrCreateChannel(guild, vDef.name, ChannelType.GuildVoice, cat.id, overwrites, { userLimit: vDef.userLimit || 0 });
                await delay(300);
            }

            // ── Временный голосовой канал (join-to-create) ──
            step(`  ➕ ${faction.title} — создать канал...`);
            const tempVoiceOW = [
                { id: everyone.id, deny: [P.ViewChannel] },
                ...seniorVoiceOW,
                { id: adminRole.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                { id: modRole.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                ...curatorVoiceOW,
                { id: fR.leader.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                { id: fR.deputy.id, allow: [P.ViewChannel, P.Connect, P.Speak] },
                { id: fR.member.id, allow: [P.ViewChannel, P.Connect, P.Speak] }
            ];
            await findOrCreateChannel(guild, '➕ Создать канал', ChannelType.GuildVoice, cat.id, tempVoiceOW);
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

module.exports = { deployStructure, getSetupStatus, FACTIONS, GLOBAL_ROLES, CURATOR_MAP };
