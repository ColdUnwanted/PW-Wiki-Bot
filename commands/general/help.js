const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { general } = require('../../config.json');
const i18n = require('i18n');

/*
    Summary:
    A command that display all the commands of the bot and what the different parameters are.
    Also added the news part which am not really sure what to do with it for now.
*/

async function display_help(client, message, interaction) {
    let user = null;
    if (interaction) {
        user = message.user;
    }
    else {
        user = message.author;
    }
    console.log(client.settings);

    const owner = await client.users.fetch(general.owner_id);

    const embed = new MessageEmbed()
        .setColor('#2f3136')
        .setDescription(
            i18n.__mf('help.message', {
                name: message.guild.name,
                prefix: client.settings[message.guildId]['prefix'],
                owner: owner.tag,
            }),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    // Commands section
    let commands = '';
    client.commands.each(async (key) => {
        if (commands == '') {
            commands += key.name;
        }
        else {
            commands += '\n' + key.name;
        }
    });
    commands = '```\n' + commands + '\n```';

    embed.addField('Commands', commands, true);

    // News section
    embed.addField('News',
        i18n.__mf('news.message'),
        true);

    const options = [];
    client.commands.each(async (key) => {
        if (key.name == 'help') {
            return;
        }

        options.push({
            label: key.name,
            value: key.name,
        });
    });

    let msg = await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

    if (msg == null) {
        msg = await message.fetchReply();
    }

    const custom_id = 'help.' + user.id + '.' + message.channelId + '.' + msg.id + '.selectMenu';

    const select_menu = new MessageSelectMenu()
        .setCustomId(custom_id)
        .setPlaceholder('Select a command')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options);

    const row = new MessageActionRow()
        .addComponents(select_menu);

    await msg.edit({ embeds: [embed], components: [row] });
}

async function display_command_help(client, message, command_name, interaction = false) {
    let user = null;
    if (interaction) {
        user = message.user;
    }
    else {
        user = message.author;
    }

    // Generate a default embed
    const embed = new MessageEmbed()
        .setColor('#2f3136')
        .setDescription(
            i18n.__mf('help.commands.default', {
                command: command_name,
            }),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    if (client.commands.get(command_name) != null) {
        embed.setDescription(
            i18n.__mf('help.commands.'.concat(command_name.toLowerCase()), {
                prefix: client.settings[message.guildId]['prefix'],
                command: command_name,
            }),
        );
    }

    return embed;
}

async function command(client, message, args, interaction = false, ori_msg = null) {
    if (args == null || !args.length) {
        // Args is empty so just display the help
        await display_help(client, message, interaction);
    }
    else {
        let command_help = '';
        if (Array.isArray(args)) {
            command_help = args.join(' ');
        }
        else {
            command_help = args;
        }

        let command_name = null;
        // Check if the command can be found
        client.commands.each(async (key) => {
            if (key.name.toLowerCase() == command_help.toLowerCase()) {
                command_name = key.name;
            }
        });

        if (command_name == null) {
            await display_help(client, message, interaction);
        }
        else {
            const help_embed = await display_command_help(client, message, command_name, interaction);
            if (ori_msg == null) {
                await message.reply({ embeds: [help_embed], allowedMentions: { repliedUser: false } });
            }
            else {
                await ori_msg.edit({ embeds: [help_embed], components: [] });
            }
        }
    }
}

module.exports = {
    name: 'help',
    cooldown: 30,
    description: i18n.__mf('help.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(true)
        .setName('help')
        .setDescription(i18n.__mf('help.description'))
        .addStringOption(option =>
            option.setName(i18n.__mf('help.optionName'))
                .setDescription(i18n.__mf('help.optionDescription'))
                .setRequired(false)
                .addChoices([
                    ['help', 'help'],
                    ['ping', 'ping'],
                    ['uptime', 'uptime'],
                    ['setup', 'setup'],
                    ['config', 'config'],
                    ['wiki', 'wiki'],
                    ['list', 'list'],
                    ['suggest', 'suggest'],
                    ['invite', 'invite'],
                ])),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, interaction.options.getString(i18n.__mf('help.optionName')), true);
    },
    async interact(client, interaction, message, section) {
        if (section == 'selectMenu') {
            await command(client, interaction, interaction.values[0], true, message);
        }
    },
};