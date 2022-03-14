const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const permissions = require('../../util/permissions.js');
const i18n = require('i18n');

/*
    Summary:
    A command that will run a setup function.
    This is similiar to when you first get your computer, you have to setup. If you don't like the configuration, you run the setup again
    Felt like this is cleaner compared to a settings command.
*/

async function setup_timeout(client, message, interaction, requested = false) {
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

    // Reset the clone
    client.settings_clone[message.guildId] = JSON.parse(JSON.stringify(client.settings[message.guildId]));

    const embed = new MessageEmbed()
        .setColor('#cc1414')
        .setDescription(
            i18n.__mf('setup.timoutMessage', {
                prefix: client.settings[message.guildId]['prefix'],
            }),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    if (requested) {
        embed.setDescription(i18n.__mf('setup.cancelMessage'));
    }

    await message.edit({ embeds: [embed], components: [] });
}

async function generate_setup(client, message, interaction, section, msg = null) {
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

    if (section == 0) {
        // Prefix
        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('setup.prefixMessage'),
            )
            .setAuthor(
                user.tag,
                user.avatarURL(),
            )
            .setTimestamp();

        if (msg == null) {
            msg = await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }

        if (msg == null) {
            msg = await message.fetchReply();
        }

        const custom_id = 'setup.' + user.id + '.' + message.channelId + '.' + msg.id + '.skip|' + section;

        const button = new MessageButton()
            .setCustomId(custom_id)
            .setLabel('Skip')
            .setStyle('DANGER');

        const cancel_custom_id = 'setup.' + user.id + '.' + message.channelId + '.' + msg.id + '.cancel';
        const cancel_button = new MessageButton()
            .setCustomId(cancel_custom_id)
            .setLabel('Cancel')
            .setStyle('DANGER');

        const row = new MessageActionRow()
            .addComponents([button, cancel_button]);

        await msg.edit({ embeds: [embed], components: [row] });

        const to_timeout = setTimeout(async function() { await setup_timeout(client, msg, interaction); }, 45000);
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

            // Save the returned message
            client.settings_clone[message.guildId]['prefix'] = m.content;

            // Delete the returned message
            await m.delete();

            await generate_setup(client, message, interaction, section + 1, msg);
        });

        collector.on('end', async (collected, reason) => {
            if (reason == 'limit' || reason == 'user') {
                return;
            }

            if (to_timeout.hasRef()) {
                clearTimeout(to_timeout);
                to_timeout.unref();
            }

            await setup_timeout(client, msg, interaction);
        });
    }
    else if (section == 1) {
        // Mod Role selection
        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('setup.roleMessage'),
            )
            .setAuthor(
                user.tag,
                user.avatarURL(),
            )
            .setTimestamp();

        if (msg != null) {
            await msg.edit({ emebds: [embed], components: [] });
        }

        if (msg == null) {
            msg = await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
        }

        if (msg == null) {
            msg = await message.fetchReply();
        }

        const custom_id_menu = 'setup.' + user.id + '.' + message.channelId + '.' + msg.id + '.setupModSelect';
        const custom_id_skip = 'setup.' + user.id + '.' + message.channelId + '.' + msg.id + '.skip|' + section;

        const options = [];

        message.guild.roles.cache.each(data => {
            if (data.name != '@everyone') {
                options.push({
                    label: data.name,
                    value: data.id,
                });
            }
        });

        const button = new MessageButton()
            .setCustomId(custom_id_skip)
            .setLabel('Skip')
            .setStyle('DANGER');

        const cancel_custom_id = 'setup.' + user.id + '.' + message.channelId + '.' + msg.id + '.cancel';
        const cancel_button = new MessageButton()
            .setCustomId(cancel_custom_id)
            .setLabel('Cancel')
            .setStyle('DANGER');

        const selectMenu = new MessageSelectMenu()
            .setCustomId(custom_id_menu)
            .setPlaceholder('Select the role')
            .setMaxValues(1)
            .setMinValues(1)
            .addOptions(options);

        const row1 = new MessageActionRow()
            .addComponents(selectMenu);

        const row2 = new MessageActionRow()
            .addComponents([button, cancel_button]);

        await msg.edit({ embeds: [embed], components: [row1, row2] });
    }
    else {
        // Setup complete
        // Save the data
        client.settings_clone[message.guildId]['setup_already'] = '1';

        // Reload settings
        (async () => {
            const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
            await delay(1000);
        })();

        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('setup.completeMessage', {
                    prefix: client.settings_clone[message.guildId]['prefix'],
                }),
            )
            .setAuthor(
                user.tag,
                user.avatarURL(),
            )
            .setTimestamp();

        if (msg == null) {
            await message.reply({ embeds: [embed] });
        }
        else {
            await msg.edit({ embeds: [embed], components: [] });
        }
    }
}

async function command(client, message, args, interaction = false) {
    // Run a permission check to see whether the user has the required perm
    const has_perm = await permissions.admin_permissions(client, message);

    if (!has_perm) {
        return;
    }

    let user = null;
    if (interaction) {
        user = message.user;
    }
    else {
        user = message.author;
    }

    // Check if already setup
    const already_setup = client.settings[message.guildId]['setup_already'];

    if (already_setup == '0') {
        await generate_setup(client, message, interaction, 0);
    }
    else {
        // Send an embed telling them they have already setup
        const embed = new MessageEmbed()
            .setColor('#2f3136')
            .setDescription(
                i18n.__mf('setup.message'),
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

        const yes_custom_id = 'setup.' + user.id + '.' + message.channelId + '.' + msg.id + '.runSetupYes';
        const no_custom_id = 'setup.' + user.id + '.' + message.channelId + '.' + msg.id + '.runSetupNo';

        // Set up button
        const yes_button = new MessageButton()
            .setCustomId(yes_custom_id)
            .setLabel('Yes')
            .setStyle('SUCCESS');
        const no_button = new MessageButton()
            .setCustomId(no_custom_id)
            .setLabel('No')
            .setStyle('DANGER');

        const row = new MessageActionRow()
            .addComponents(yes_button)
            .addComponents(no_button);

        await msg.edit({ embeds: [embed], components: [row] });
    }
}

module.exports = {
    name: 'setup',
    cooldown: 30,
    description: i18n.__mf('setup.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(false)
        .setName('setup')
        .setDescription(i18n.__mf('setup.description')),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, null, true);
    },
    async interact(client, interaction, message, section) {
        if (section == 'runSetupYes') {
            // Rerun setup so generate the setup
            interaction.deferUpdate();
            await generate_setup(client, message, interaction, 0, message);
        }
        else if (section == 'runSetupNo') {
            // Dont run setup so give another message
            const embed = new MessageEmbed()
                .setColor('#2f3136')
                .setDescription(
                    i18n.__mf('setup.doneMessage'),
                )
                .setAuthor(
                    interaction.user.tag,
                    interaction.user.avatarURL(),
                )
                .setTimestamp();

            await message.edit({ embeds: [embed], components: [] });
        }
        else if (section == 'setupModSelect') {
            // Get the select details
            const which = interaction.values[0];

            // Save to the client settings
            client.settings_clone[interaction.guildId]['mod_role'] = which;

            // Move to next
            interaction.deferUpdate();
            await generate_setup(client, message, interaction, 2, message);
        }
        else if (section == 'setupMailYes') {
            // Save to the client settings
            client.settings_clone[interaction.guildId]['mail'] = '1';

            // Move to next
            interaction.deferUpdate();
            await generate_setup(client, message, interaction, 3, message);
        }
        else if (section == 'setupMailNo') {
            // Save to the client settings
            client.settings_clone[interaction.guildId]['mail'] = '0';

            // Move to next
            interaction.deferUpdate();
            await generate_setup(client, message, interaction, 3, message);
        }
        else if (section.startsWith('skip')) {
            const next_section = parseInt(section.split('|')[1]) + 1;

            // Clear the message timeout
            try {
                client.timeout[interaction.user.id][0].stop();
                delete client.timeout[interaction.user.id];
            }
            catch {
                // Do nothing
            }

            interaction.deferUpdate();
            await generate_setup(client, message, interaction, next_section, message);
        }
        else if (section == 'cancel') {
            interaction.deferUpdate();
            await setup_timeout(client, message, interaction, true);
        }
    },
};