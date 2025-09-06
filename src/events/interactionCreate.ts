import { Events, Interaction, ChatInputCommandInteraction } from 'discord.js';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as any;
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    const started = Date.now();
    try {
      await command.execute(interaction as ChatInputCommandInteraction);
      const ms = Date.now() - started;
      if (ms > 1500) {
        console.log(`⚙️ Command ${interaction.commandName} took ${ms}ms`);
      }
    } catch (error) {
      console.error('Error executing command:', error);
      
      const errorMessage = 'There was an error while executing this command!';
      
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      } catch {
        // ignore reply errors
      }
    }
  },
};
