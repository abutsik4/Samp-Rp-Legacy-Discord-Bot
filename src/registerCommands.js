const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.DISCORD_TOKEN;

// ── Load all command files from src/commands/**/*.js ──
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function loadCommandsRecursive(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      loadCommandsRecursive(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const command = require(fullPath);
      if (command.data && typeof command.data.toJSON === 'function') {
        commands.push(command.data.toJSON());
        console.log(`  ✔ Loaded: /${command.data.name}`);
      } else {
        console.warn(`  ⚠ Skipped ${fullPath} — missing data or toJSON`);
      }
    }
  }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('Loading command files...');
    loadCommandsRecursive(commandsPath);
    console.log(`\nRegistering ${commands.length} application (/) commands for guild ${guildId}...`);

    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`✅ Successfully registered ${commands.length} commands.`);
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
    process.exitCode = 1;
  }
})();