// Get the discord.js classes
const { Collection, Client, Intents, MessageEmbed } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const { general } = require('./config.json');
const wiki_api = require('./util/wiki/wiki_api.js');
const permissions = require('./util/permissions.js');
const i18n = require('i18n');
const { join } = require('path');

// Select which token based on whether the bot is testing or not
let token = general.token;
let client_id = general.id;

// Create new client instance
const client = new Client({
    disableMentions: 'everyone',
    restTimeOffset: 0,
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
        Intents.FLAGS.GUILD_BANS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
    ],
});

// Client stuffs
client.login(token);
client.commands = new Collection();
client.slash_commands = [];
client.prefix = general.default_prefix;
client.queue = new Map();
client.timeout = {};
client.wiki_booster_container = {};
client.suggest_data = {};
client.settings = {};
client.wiki_variant = [];
const cooldowns = new Collection();
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// il8n config
i18n.configure({
    locales: ['en'],
    directory: join(__dirname, 'locales'),
    defaultLocale: 'en',
    retryInDefaultLocale: true,
    objectNotation: true,
    register: global,

    logErrorFn: function(msg) {
        console.log('error', msg);
    },

    missingKeyFn: function(locale, value) {
        return value;
    },

    mustacheConfig: {
        tags: ['{{', '}}'],
        disable: false,
    },
});

// Load the commands
function readFiles(dir) {
    const paths = fs.readdirSync(dir, { withFileTypes: true });

    return paths.reduce((files, path) => {
        if (path.isDirectory()) {
            files.push(...readFiles(join(dir, path.name)));
        }
        else if (path.isFile()) {
            files.push(join(dir, path.name));
        }

        return files;
    }, []);
}

const commandFiles = readFiles('commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(join(__dirname, file));
    client.commands.set(command.name, command);

    if (command.data != null) {
        client.slash_commands.push(command.data.toJSON());
    }
}

// Register slash commands
const rest = new REST({ version: '9' }).setToken(token);
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationCommands(client_id),
            { body: client.slash_commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    }
    catch (error) {
        // Do nothing
    }
})();

// When client is ready print out the bot details
client.once('ready', () => {
    // Update permissions
    (async () => {
        await permissions.update_permissions(client);
    })();

    // Display a ui
    console.log('Logged in as');
    console.log(client.user.username);
    console.log(client.user.id);
    console.log('----------');

    // Set bot activity
    client.user.setPresence({ activities: [{ name: general.status, type: 'WATCHING' }], status: 'online' });

    // Update data function
    (async () => {
        let first_run = true;
        while (true) {
            if (first_run) {
                first_run = false;
            }
            else {
                reload_wiki_data();
            }

            const wait_ms = 3600000 - new Date().getTime() % 3600000;
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            await delay(wait_ms);
        }
    })();
});

// Get wiki data, this is a list of items
function reload_wiki_data() {
    wiki_api.get_all_items((result) => {
        if (result != null) {
            client.wiki_data = result;
        }
    });
}
reload_wiki_data();

// Get commands call
client.on('messageCreate', async (message) => {
    // Ignore bot messages
    if (message.author.bot) return;

    // For now use the default prefix
    let prefix = general.default_prefix;
    client.settings[message.guild.id] = { 'server_id': message.guild.id, 'prefix': prefix, 'mod_role': 0, 'setup_already': '1' };

    // Check if prefix match
    const prefixRegex = new RegExp(`^(<@!?${client.user.id}>|${escapeRegex(prefix)})\\s*`);
    if (!prefixRegex.test(message.content)) return;

    const [, matchedPrefix] = message.content.match(prefixRegex);

    // Get the arguements
    const args = message.content.slice(matchedPrefix.length).trim().split(' ');
    const command_name = args.shift().toLowerCase();

    // Try to find the command
    const command =
        client.commands.get(command_name) ||
        client.commands.find((cmd) => cmd.aliases && cmd.aliases.includes(command_name));

    if (!command) return;

    try {
        if (!client.timeout[message.author.id][0].checkEnd()) {
            return;
        }
    }
    catch {
        // Do nothing
    }

    // Check if there is a cooldown
    if (!cooldowns.has(command.name)) {
        cooldowns.set(command.name, new Collection());
    }

    // Cooldown handler
    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldown_amount = (command.cooldown || 1) * 100;

    if (timestamps.has(message.author.id)) {
        const expiration_time = timestamps.get(message.author.id) + cooldown_amount;

        if (now < expiration_time) {
            const time_left = (expiration_time - now) / 1000;

            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setTitle(
                    i18n.__mf('common.cooldownTitle'),
                )
                .setDescription(
                    i18n.__mf('common.cooldownMessage', { time: time_left.toFixed(1) }),
                )
                .setAuthor(
                    message.author.tag,
                    message.author.avatarURL(),
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    }

    // No cooldown so give them cooldown
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldown_amount);

    // Try to run the commmand
    try {
        await command.execute(client, message, args);
    }
    catch (error) {
        console.error(error);
        message.reply('An error occured');
    }
});

client.on('interactionCreate', async (interaction) => {
    // Slash command interaction handler
    if (interaction.isCommand()) {
        if (!client.commands.has(interaction.commandName)) return;

        if (!interaction.guild.channels.cache.get(interaction.channelId).permissionsFor(client.user).has('VIEW_CHANNEL') ||
            !interaction.guild.channels.cache.get(interaction.channelId).permissionsFor(client.user).has('SEND_MESSAGES')) {
            await interaction.reply({
                content: i18n.__mf('common.interactionPermissionError'),
                ephemeral: true,
            });
            return;
        }

        try {
            const command = client.commands.get(interaction.commandName);

            // Check if there is a cooldown
            if (!cooldowns.has(command.name)) {
                cooldowns.set(command.name, new Collection());
            }

            // Cooldown handler
            const now = Date.now();
            const timestamps = cooldowns.get(command.name);
            const cooldown_amount = (command.cooldown || 1) * 100;

            if (timestamps.has(interaction.user.id)) {
                const expiration_time = timestamps.get(interaction.user.id) + cooldown_amount;

                if (now < expiration_time) {
                    const time_left = (expiration_time - now) / 1000;

                    const embed = new MessageEmbed()
                        .setColor('#2f3136')
                        .setTitle(
                            i18n.__mf('common.cooldownTitle'),
                        )
                        .setDescription(
                            i18n.__mf('common.cooldownMessage', { time: time_left.toFixed(1) }),
                        )
                        .setAuthor(
                            interaction.user.tag,
                            interaction.user.avatarURL(),
                        )
                        .setTimestamp();

                    return interaction.reply({ embeds: [embed] });
                }
            }

            // No cooldown so give them cooldown
            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldown_amount);

            command.slash(client, interaction);
        }
        catch (error) {
            await interaction.reply({
                content: i18n.__mf('common.interactionError', { type: 'command' }),
                ephemeral: true,
            });
        }
    }

    if (interaction.isSelectMenu() || interaction.isButton()) {
        // Get the command name
        const command_name = interaction.customId.split('.')[0];
        const requested_user = interaction.customId.split('.')[1];
        const channel_id = interaction.customId.split('.')[2];
        const message_id = interaction.customId.split('.')[3];
        const section = interaction.customId.split('.')[4];

        if (!client.commands.has(command_name)) return;

        try {
            const command = client.commands.get(command_name);
            const message = await client.channels.cache.get(channel_id).messages.fetch(message_id);

            if (requested_user != interaction.user.id) {
                // Not the right author
                await interaction.reply({
                    content: i18n.__mf('common.interactionAuthorError'),
                    ephemeral: true,
                });
            }
            else {
                command.interact(client, interaction, message, section);
            }
        }
        catch (error) {
            console.log(error);
            await interaction.reply({
                content: i18n.__mf('common.interactionError', { type: 'interaction' }),
                ephemeral: true,
            });
        }
    }
});
