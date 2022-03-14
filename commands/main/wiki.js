const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, MessageAttachment } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const wiki_api = require('../../util/wiki/wiki_api.js');
const image_generation = require('../../util/wiki/image_generation.js');
const { logging } = require('../../config.json');
const i18n = require('i18n');

/*
    Summary:
    A command that is connected to PW fandom.
    It uses the fandom search engine and retrieves all data from there due to the fact that it is easier to maintain that way.
    Also returns image because it's actually cleaner compared to throwing onto an embed
    Plus the embed text limit will be an arse.
*/

async function search_timeout(client, message, interaction) {
    let user = null;
    if (interaction) {
        user = message.user;
    }
    else {
        user = message.author;
    }

    if (user == null) {
        user = interaction.user;
    }

    const embed = new MessageEmbed()
        .setColor('#cc1414')
        .setDescription(
            i18n.__mf('wiki.timeoutMessage', {
                prefix: client.settings[message.guildId]['prefix'],
            }),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    await message.edit({ embeds: [embed], components: [] });
}

function generate_booster_components(datas, page, message, user) {
    // Convert page to int
    page = parseInt(page);

    // Do the select menu first
    const select_menu_custom_id = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.boosterMenu|' + page.toString();

    const select_menu = new MessageSelectMenu()
        .setCustomId(select_menu_custom_id)
        .setPlaceholder('Select the item to search (Page ' + page + ' / ' + datas.length + ')')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(datas[page - 1]);

    const row1 = new MessageActionRow()
        .addComponents(select_menu);

    // The prev and next button
    const prev_custom_id = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.boosterChangeMenu|' + (page - 1).toString();
    const next_custom_id = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.boosterChangeMenu|' + (page + 1).toString();

    // Disable handler
    let prev_disabled = false;
    let next_disabled = false;

    if (page == 1) {
        prev_disabled = true;
    }
    else if (page == datas.length) {
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

    return [row1, row2];
}

async function display_result(client, message, user, item_name, is_booster = false) {
    // Generate the item name first
    const item_url = item_name.replaceAll(' ', '_');

    if (is_booster) {
        const loading_embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('wiki.loadingMessageBooster'),
            )
            .setAuthor(
                user.tag,
                user.avatarURL(),
            )
            .setTimestamp();

        await message.edit({ embeds: [loading_embed], components: [] });

        let date = new Date();
        const start_time = date.getTime();

        const booster_info = await wiki_api.get_booster_info(item_name);

        if (booster_info != null) {
            const booster_items = booster_info[2][1];

            const booster_image = await image_generation.convert_list(item_name, booster_info);
            const attachment = new MessageAttachment(booster_image, 'booster.png');

            date = new Date();
            const end_time = date.getTime();

            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.searchMessageBooster', {
                        item_name: item_name,
                        item_url: item_url,
                    }),
                )
                .setAuthor(
                    user.tag,
                    user.avatarURL(),
                )
                .setTimestamp()
                .setFooter('(' + (Math.round((end_time - start_time)) / 1000) + 's)');

            // Normally this is sent to another server instead of sending it to your
            const img_msg = await message.edit({ files: [attachment] });

            embed.setImage(img_msg.attachments.first().url);

            // Format the booster items
            const new_data = [];
            const split_data = [];

            for (let i = 0; i < booster_items.length; i++) {
                if ((i < 25) || (i > 25 && i < 50) || (i > 50 && i < 75) || (i > 75 && i < 100) || (i > 100 && i < 125)) {
                    split_data.push({
                        label: booster_items[i],
                        value: booster_items[i],
                    });
                }
                else if ((i == 25) || (i == 50) || (i == 75) || (i == 100)) {
                    new_data.push(split_data.slice());
                    split_data.length = 0;
                    split_data.push({
                        label: booster_items[i],
                        value: booster_items[i],
                    });
                }
            }

            if (split_data.length <= 25 && split_data.length != 0) {
                new_data.push(split_data.slice());
            }

            client.wiki_booster_container[message.id] = new_data;

            // Create the rows
            const components = generate_booster_components(client.wiki_booster_container[message.id], 1, message, user);

            await message.edit({ embeds: [embed], components: components });
        }
        else {
            // Send an exist but failed message
            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.boosterExistFailed', {
                        item_name: item_name,
                        item_url: item_url,
                    }),
                )
                .setAuthor(
                    user.tag,
                    user.avatarURL(),
                )
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        }
    }
    else {
        const loading_embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('wiki.loadingMessage'),
            )
            .setAuthor(
                user.tag,
                user.avatarURL(),
            )
            .setTimestamp();

        await message.edit({ embeds: [loading_embed], components: [] });

        let date = new Date();
        const start_time = date.getTime();

        const item_info = await wiki_api.get_block_info(item_name);

        if (item_info != null) {
            let variants = null;
            let has_variant = false;
            client.wiki_variant.forEach(data => {
                if (data.includes(item_name)) {
                    variants = data.slice();
                    has_variant = true;
                }
            });

            if (has_variant) {
                const index = variants.indexOf(item_name);
                variants.splice(index, 1);
            }

            let crossbreed = item_info[1][0][5];
            let has_crossbreed = false;

            if (crossbreed.toLowerCase() != 'non-crossbreedable') {
                const crossbreed1 = crossbreed.split(' + ')[0];
                const crossbreed2 = crossbreed.split(' + ')[1];
                crossbreed = [crossbreed1, crossbreed2];
                has_crossbreed = true;
            }

            const item_image = await image_generation.convert(item_name, item_info);
            const attachment = new MessageAttachment(item_image, 'item.png');

            date = new Date();
            const end_time = date.getTime();

            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.searchMessage', {
                        item_name: item_name,
                        item_url: item_url,
                    }),
                )
                .setAuthor(
                    user.tag,
                    user.avatarURL(),
                )
                .setTimestamp()
                .setFooter('(' + (Math.round((end_time - start_time)) / 1000) + 's)');

            // Normally this is sent to another server instead of sending it to your
            const img_msg = await message.edit({ files: [attachment] });

            embed.setImage(img_msg.attachments.first().url);

            // Set the buttons / select menu
            const components = [];

            // Variant check
            if (has_variant) {
                // Display a search menu
                const options = [];
                variants.forEach(data => {
                    options.push({
                        label: data,
                        value: data,
                    });
                });

                const custom_id = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.blockVariantMenu';

                const select_menu = new MessageSelectMenu()
                    .setCustomId(custom_id)
                    .setPlaceholder('View other variants of this block')
                    .setMinValues(1)
                    .setMaxValues(1)
                    .addOptions(options);

                const row = new MessageActionRow()
                    .addComponents(select_menu);

                components.push(row);
            }

            // Crossbreed check
            if (has_crossbreed) {
                // Display 2 button
                const custom_id_1 = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.bC|' + crossbreed[0];
                const custom_id_2 = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.bC|' + crossbreed[1];

                const button_1 = new MessageButton()
                    .setCustomId(custom_id_1)
                    .setLabel(crossbreed[0])
                    .setStyle('SECONDARY');

                const button_2 = new MessageButton()
                    .setCustomId(custom_id_2)
                    .setLabel(crossbreed[1])
                    .setStyle('SECONDARY');

                const row = new MessageActionRow()
                    .addComponents([button_1, button_2]);

                components.push(row);
            }

            await message.edit({ embeds: [embed], components: components });
        }
        else {
            // Send an exist but failed message
            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.itemExistFailed', {
                        item_name: item_name,
                        item_url: item_url,
                    }),
                )
                .setAuthor(
                    user.tag,
                    user.avatarURL(),
                )
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        }
    }
}

async function find_item(client, message, user, item_name) {
    // Check the wiki connection first
    let found = false;
    item_name = wiki_api.shortform_check(item_name);
    let is_booster = false;

    // Check if the item name can be straight found through the datas
    client.wiki_data.forEach(item => {
        if (item[0].toUpperCase() == item_name.toUpperCase()) {
            item_name = item[0];
            found = true;

            if (item[1] == 'Boosters') {
                is_booster = true;
            }
        }
    });

    if (found) {
        // Display the result
        await display_result(client, message, user, item_name, is_booster);
    }
    else {
        // Item cant be found from the data
        // Run a search query
        const search_result = await wiki_api.search(item_name, client.wiki_data);

        if (search_result == null) {
            // Account login failed...
        }
        else if (typeof (search_result) != 'object') {
            // Not list because the search only have 1 data only so straight use that
            await display_result(client, message, user, search_result);
        }
        else {
            // It's a search result that the user must choose
            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.searchQuery', {
                        result1: search_result[0],
                        result2: search_result[1],
                        result3: search_result[2],
                        result4: search_result[3],
                        result5: search_result[4],
                    }),
                )
                .setAuthor(
                    user.tag,
                    user.avatarURL(),
                )
                .setTimestamp();

            // Create the search buttons
            const search_buttons = [];
            let counter = 1;
            search_result.forEach(result => {
                const button_custom_id = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.sB|' + result;

                search_buttons.push(new MessageButton()
                    .setCustomId(button_custom_id)
                    .setLabel(counter.toString())
                    .setStyle('SECONDARY'));
                counter++;
            });

            // Create the cancel button
            const custom_id = 'wiki.' + user.id + '.' + message.channelId + '.' + message.id + '.cancelSearch';
            const cancelBtn = new MessageButton()
                .setCustomId(custom_id)
                .setLabel('Cancel')
                .setStyle('DANGER');

            // Convert it into row
            const searchRow = new MessageActionRow()
                .addComponents(search_buttons);
            const cancelRow = new MessageActionRow()
                .addComponents(cancelBtn);

            // Send the msg
            await message.edit({ embeds: [embed], components: [searchRow, cancelRow] });
        }
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

    if (args == null || !args.length) {
        // Basically no arguments given
        // Generate a message to ask user for their input
        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('wiki.askSearch', {
                    name: user.tag,
                }),
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

        const custom_id = 'wiki.' + user.id + '.' + message.channelId + '.' + msg.id + '.cancelSearch';

        const button = new MessageButton()
            .setCustomId(custom_id)
            .setLabel('Cancel')
            .setStyle('DANGER');

        const row = new MessageActionRow()
            .addComponents(button);

        await msg.edit({ embeds: [embed], components: [row] });

        const to_timeout = setTimeout(async function() { await search_timeout(client, msg, interaction); }, 45000);
        const filter = m => m.author.id == user.id;

        const collector = message.channel.createMessageCollector({ filter, max: 1, time: 40000, error: ['time'] });

        // Store everything first
        const data_array = [];
        data_array.push(collector);
        client.timeout[user.id] = data_array;

        collector.on('collect', async (m) => {
            // Stop the timeout process
            clearTimeout(to_timeout);
            to_timeout.unref();

            // Delete the returned message
            await m.delete();

            const start_embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.startSearch'),
                )
                .setAuthor(
                    m.author.tag,
                    m.author.avatarURL(),
                )
                .setTimestamp();

            await msg.edit({ embeds: [start_embed], components: [] });

            await find_item(client, msg, m.author, m.content);
        });

        collector.on('end', async (collected, reason) => {
            if (reason == 'limit' || reason == 'user') {
                return;
            }

            if (to_timeout.hasRef()) {
                clearTimeout(to_timeout);
                to_timeout.unref();
            }

            await search_timeout(client, msg, interaction);
        });
    }
    else {
        let search_string = '';
        if (Array.isArray(args)) {
            search_string = args.join(' ');
        }
        else {
            search_string = args;
        }

        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('wiki.startSearch'),
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

        await find_item(client, msg, user, search_string);
    }
}

module.exports = {
    name: 'wiki',
    cooldown: 30,
    description: i18n.__mf('wiki.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(true)
        .setName('wiki')
        .setDescription(i18n.__mf('wiki.description'))
        .addStringOption(option =>
            option.setName(i18n.__mf('wiki.optionName'))
                .setDescription(i18n.__mf('wiki.optionDescription'))
                .setRequired(false)),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, interaction.options.getString(i18n.__mf('wiki.optionName')), true);
    },
    async custom(client, interaction, data) {
        await command(client, interaction, data, true);
    },
    async interact(client, interaction, message, section) {
        if (section == 'cancelSearch') {
            // Clear the message timeout
            try {
                client.timeout[interaction.user.id][0].stop();
            }
            catch {
                // Do nothing just let it pass
            }

            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.searchCancel', {
                        prefix: client.settings[interaction.guildId]['prefix'],
                    }),
                )
                .setAuthor(
                    interaction.user.tag,
                    interaction.user.avatarURL(),
                )
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        }
        else if (section.startsWith('sB')) {
            const result = section.split('|')[1];

            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('wiki.startSearch'),
                )
                .setAuthor(
                    interaction.user.tag,
                    interaction.user.avatarURL(),
                )
                .setTimestamp();
            await message.edit({ embeds: [embed], components: [] });

            interaction.deferUpdate();
            await find_item(client, message, interaction.user, result);
        }
        else if (section == 'blockVariantMenu' || section.startsWith('boosterMenu')) {
            await interaction.deferUpdate();

            await display_result(client, message, interaction.user, interaction.values[0]);
        }
        else if (section.startsWith('bC')) {
            const which = section.split('|')[1];

            await interaction.deferUpdate();
            await display_result(client, message, interaction.user, which);
        }
        else if (section.startsWith('boosterChangeMenu')) {
            const which_page = section.split('|')[1];

            await interaction.deferUpdate();

            let booster_data = null;
            try {
                booster_data = client.wiki_booster_container[message.id];
            }
            catch {
                // Bot restarted so just ignore that command
                return;
            }

            const components = generate_booster_components(booster_data, which_page, message, interaction.user);

            await message.edit({ components: components });
        }
    },
};