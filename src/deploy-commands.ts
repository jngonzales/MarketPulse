import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
import { readdirSync } from 'fs';
import { join } from 'path';

config();

const commands: any[] = [];

// Load all commands
const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

async function loadCommands() {
  for (const folder of commandFolders) {
    const commandFiles = readdirSync(join(commandsPath, folder)).filter(
      file => file.endsWith('.js') || file.endsWith('.ts')
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, folder, file);
      const command = await import(filePath);
      
      if ('data' in command.default && 'execute' in command.default) {
        commands.push(command.default.data.toJSON());
      }
    }
  }
}

// Deploy commands
async function deployCommands() {
  try {
    await loadCommands();
    
    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

    const rest = new REST().setToken(process.env.BOT_TOKEN!);

    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID!, process.env.GUILD_ID!),
      { body: commands },
    ) as any[];

    console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

deployCommands();
