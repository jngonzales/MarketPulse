import { Events, Client, ActivityType } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`✅ Ready! Logged in as ${client.user?.tag}`);
    
    // Set bot activity
    client.user?.setActivity({
      name: 'market data | /help',
      type: ActivityType.Watching,
    });

    console.log('🔥 MarketPulse Pro is now online!');
  },
};
