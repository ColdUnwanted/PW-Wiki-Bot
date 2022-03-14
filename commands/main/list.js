const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const i18n = require('i18n');
const fs = require('fs');
const list = require('../../util/wiki/list/list_data.json');
const { logging } = require('../../config.json');

/*
    Summary:
    A command that will list certain stuffs such as achievements or butterfly questline.
*/

async function display_all(client, user, msg, failed = false) {
    // Format the desc
    let desc = '```md';
    let counter = 1;
    Object.keys(list).forEach(key => {
        desc += '\n';

        const arr = key.split(' ');

        for (let i = 0; i < arr.length; i++) {
            arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
        }

        desc += counter + '. ' + arr.join(' ');
        counter++;
    });

    if (desc != '```md') {
        desc += '\n```';
    }
    else {
        desc = '';
    }

    // Create the embed
    const embed = new MessageEmbed()
        .setColor('#2f3136')
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    // Change the desc if failed
    if (failed) {
        embed.setDescription('**Mentioned list could not be found.**');
    }

    // Add the desc
    embed.addField('Lists available:', desc);

    await msg.edit({ embeds: [embed] });

    // Add the select menu
    const options = [];
    Object.keys(list).forEach(key => {
        const arr = key.split(' ');

        for (let i = 0; i < arr.length; i++) {
            arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
        }

        options.push({
            label: arr.join(' '),
            value: key,
        });
    });

    const custom_id = 'list.' + user.id + '.' + msg.channelId + '.' + msg.id + '.allListMenu';

    const select_menu = new MessageSelectMenu()
        .setCustomId(custom_id)
        .setPlaceholder('Select a list')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options);

    const row = new MessageActionRow()
        .addComponents(select_menu);

    await msg.edit({ embeds: [embed], components: [row] });
}

async function load_list(client, user, msg, which, page = 1) {
    // Retrieve the data first
    const data = list[which].datas;
    const title = list[which].title;

    if (page > data.length) {
        page = data.length;
    }

    if (page < 1) {
        page = 1;
    }

    page = parseInt(page);

    // Load the data
    const embed = new MessageEmbed()
        .setColor('#2f3136')
        .setTitle(title)
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    embed.setDescription(fs.readFileSync(data[page - 1].file).toString());

    // Check if there's image
    if (Object.prototype.hasOwnProperty.call(data[page - 1], 'image')) {
        const attachment = new MessageAttachment(data[page - 1].image, title + '.png');

        const channel = await client.channels.fetch(logging.imageChannel);
        const img_msg = await channel.send({ files: [attachment] });

        embed.setThumbnail(img_msg.attachments.first().url);
    }

    await msg.edit({ embeds: [embed], components: [] });

    // Create the buttons and select menu
    // Do the select menu first
    let select_menu_custom_id = null;

    if (data[page - 1].useWiki) {
        select_menu_custom_id = 'list.' + user.id + '.' + msg.channelId + '.' + msg.id + '.listMenuWiki|' + which + '|' + page.toString();
    }
    else {
        select_menu_custom_id = 'list.' + user.id + '.' + msg.channelId + '.' + msg.id + '.listMenu|' + which + '|' + page.toString();
    }

    const options = [];

    data[page - 1].data.forEach(value => {
        options.push({
            label: value,
            value: value,
        });
    });

    const select_menu = new MessageSelectMenu()
        .setCustomId(select_menu_custom_id)
        .setPlaceholder('Select the item to search (Page ' + page + ' / ' + data.length + ')')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options);

    const row1 = new MessageActionRow()
        .addComponents(select_menu);

    // The prev and next button
    const prev_custom_id = 'list.' + user.id + '.' + msg.channelId + '.' + msg.id + '.listChangeMenu|' + which + '|' + (page - 1).toString();
    const next_custom_id = 'list.' + user.id + '.' + msg.channelId + '.' + msg.id + '.listChangeMenu|' + which + '|' + (page + 1).toString();

    // Disable handler
    let prev_disabled = false;
    let next_disabled = false;

    if (page == 1) {
        prev_disabled = true;
    }
    else if (page == data.length) {
        next_disabled = true;
    }

    const prev_button = new MessageButton()
        .setCustomId(prev_custom_id)
        .setLabel('Previous')
        .setStyle('PRIMARY')
        .setDisabled(prev_disabled);

    const next_button = new MessageButton()
        .setCustomId(next_custom_id)
        .setLabel('Next')
        .setStyle('PRIMARY')
        .setDisabled(next_disabled);

    const row2 = new MessageActionRow()
        .addComponents([prev_button, next_button]);

    const component = [row1];

    if (data.length > 1) {
        component.push(row2);
    }

    await msg.edit({ embeds: [embed], components: component });
}

async function load_inner_list(client, user, msg, which, data) {
    // Retrieve the data to be used
    data = data.toLowerCase();
    const selected_data = list[which][data];

    const arr = data.split(' ');

    for (let i = 0; i < arr.length; i++) {
        arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1);
    }

    // Load the data
    const embed = new MessageEmbed()
        .setColor('#2f3136')
        .setTitle(arr.join(' '))
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    embed.setDescription(fs.readFileSync(selected_data.file).toString());

    // Check if there's image
    if (Object.prototype.hasOwnProperty.call(selected_data, 'image')) {
        const attachment = new MessageAttachment(selected_data.image, data + '.png');

        const channel = await client.channels.fetch(logging.imageChannel);
        const img_msg = await channel.send({ files: [attachment] });

        embed.setFooter(arr.join(' '), img_msg.attachments.first().url);
    }

    await msg.edit({ embeds: [embed], components: [] });

    // Create the select menu if there is data
    if (selected_data.data.length > 0) {
        let select_menu_custom_id = null;

        if (selected_data.useWiki) {
            select_menu_custom_id = 'list.' + user.id + '.' + msg.channelId + '.' + msg.id + '.listMenuWiki|' + which + '|' + data;
        }
        else {
            select_menu_custom_id = 'list.' + user.id + '.' + msg.channelId + '.' + msg.id + '.listMenu|' + which + '|' + data;
        }

        const options = [];

        selected_data.data.forEach(value => {
            options.push({
                label: value,
                value: value,
            });
        });

        const select_menu = new MessageSelectMenu()
            .setCustomId(select_menu_custom_id)
            .setPlaceholder('Select the item to search')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(options);

        const row1 = new MessageActionRow()
            .addComponents(select_menu);

        await msg.edit({ embeds: [embed], components: [row1] });
    }
}

async function command(client, message, args, interaction = false) {
    let user = null;
    if (interaction) {
        user = message.user;
    }
    else {
        user = message.author;
    }

    // Check if args is supplied
    if (args == null || !args.length) {
        // Args not supplied
        // Display loading all available list
        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('list.loading'),
            )
            .setAuthor(
                user.tag,
                user.avatarURL(),
            )
            .setTimestamp();

        let msg = await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

        if (msg == null) {
            msg = await message.fetchReply();
        }

        // Send this msg to the display all list handler
        await display_all(client, user, msg);
    }
    else {
        let list_string = '';
        if (Array.isArray(args)) {
            list_string = args.join(' ');
        }
        else {
            list_string = args;
        }

        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('list.loadingSearch'),
            )
            .setAuthor(
                user.tag,
                user.avatarURL(),
            )
            .setTimestamp();

        let msg = await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

        if (msg == null) {
            msg = await message.fetchReply();
        }

        let found = Object.prototype.hasOwnProperty.call(list, list_string.toLowerCase());
        let which = list_string;

        if (!found) {
            Object.keys(list).forEach(key => {
                if (list[key].allias.includes(list_string.toLowerCase())) {
                    found = true;
                    which = key;
                }
            });
        }

        // If still not found, it could be a number
        if (!found) {
            let counter = 1;
            Object.keys(list).forEach(key => {
                if (list_string.toLowerCase() == counter.toString()) {
                    found = true;
                    which = key;
                }
                counter++;
            });
        }

        // If still not found, it could be a joint message
        const break_string = list_string.split(' ');
        if (!found && break_string.length > 1) {
            found = Object.prototype.hasOwnProperty.call(list, break_string[0].toLowerCase());

            if (!found) {
                // Check the first value
                Object.keys(list).forEach(key => {
                    if (list[key].allias.includes(break_string[0].toLowerCase())) {
                        found = true;
                        which = key;
                    }
                });
            }

            if (!found) {
                let counter = 1;
                Object.keys(list).forEach(key => {
                    if (break_string[0].toLowerCase() == counter.toString()) {
                        found = true;
                        which = key;
                    }
                    counter++;
                });
            }

            if (found) {
                // Check if the next part can be found
                const to_join = break_string.slice(1, break_string.length);
                let which_data = to_join.join(' ');

                // Try to find the data
                let data_found = false;

                data_found = Object.prototype.hasOwnProperty.call(list[which], which_data.toLowerCase());

                if (!data_found) {
                    let counter = 1;
                    Object.keys(list[which]).forEach(key => {
                        if (key.toLowerCase() == 'allias' || key.toLowerCase() == 'title' || key.toLowerCase() == 'datas') {
                            return;
                        }

                        if (which_data.toLowerCase() == counter.toString()) {
                            data_found = true;
                            which_data = key;
                        }
                        counter++;
                    });
                }

                if (which_data.toLowerCase() == 'allias' || which_data.toLowerCase() == 'title' || which_data.toLowerCase() == 'datas') {
                    data_found = false;
                }

                if (data_found) {
                    await load_inner_list(client, user, msg, which, which_data);
                    return;
                }
            }
        }

        // Check if the name can be found in the json
        if (found) {
            // Load the list
            await load_list(client, user, msg, which);
        }
        else {
            // Send a msg to display all lsit handler
            await display_all(client, user, msg);
        }
    }
}

module.exports = {
    name: 'list',
    cooldown: 30,
    description: i18n.__mf('list.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(true)
        .setName('list')
        .setDescription(i18n.__mf('list.description'))
        .addStringOption(option =>
            option.setName(i18n.__mf('list.optionName'))
                .setDescription(i18n.__mf('list.optionDescription'))
                .setRequired(false)
                .addChoices([
                    ['butterfly', 'butterfly'],
                    ['achievements', 'achievements'],
                    ['fishing gear', 'fishing gear'],
                    ['fossils', 'fossils'],
                    ['graffiti', 'graffiti'],
                    ['perks', 'perks'],
                ])),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, interaction.options.getString(i18n.__mf('list.optionName')), true);
    },
    async interact(client, interaction, message, section) {
        if (section == 'allListMenu') {
            await interaction.deferUpdate();
            await load_list(client, interaction.user, message, interaction.values[0]);
        }
        else if (section.startsWith('listMenuWiki')) {
            await message.delete();
            const cmd = client.commands.get('wiki');
            await cmd.custom(client, interaction, interaction.values[0]);
        }
        else if (section.startsWith('listChangeMenu')) {
            const which = section.split('|')[1];
            const page = section.split('|')[2];

            await interaction.deferUpdate();
            await load_list(client, interaction.user, message, which, page);
        }
        else if (section.startsWith('listMenu')) {
            const which = section.split('|')[1];

            await interaction.deferUpdate();
            await load_inner_list(client, interaction.user, message, which, interaction.values[0]);
        }
    },
};