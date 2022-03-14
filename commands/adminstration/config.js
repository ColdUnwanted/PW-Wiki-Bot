const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const permissions = require('../../util/permissions.js');
const i18n = require('i18n');

/*
    Summary:
    A command that just displays the current configuration of the bot.
    Felt like this is a better way of displaying rather than throwing it into a settings command then edit the settings from there.
*/

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

    const already_setup = client.settings[message.guildId]['setup_already'];
    let setup_text = i18n.__mf('config.setupAlreadyTrue');
    if (already_setup == '0') {
        setup_text = i18n.__mf('config.setupAlreadyFalse', { prefix: client.settings[message.guildId]['prefix'] });
    }

    const embed = new MessageEmbed()
        .setColor('#2f3136')
        .setDescription(
            i18n.__mf('config.message', {
                text: setup_text,
                prefix: client.settings[message.guildId]['prefix'],
            }),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    embed.addField('Prefix', '`' + client.settings[message.guildId]['prefix'] + '`', true);

    let mod_role = client.settings[message.guildId]['mod_role'];

    if (mod_role == '0') {
        mod_role = '-';
    }
    else {
        mod_role = message.guild.roles.cache.get(mod_role);

        if (mod_role == null) {
            mod_role = '-';
        }
        else {
            mod_role = mod_role.name;
        }
    }

    embed.addField('Moderation Role', '`' + mod_role + '`', true);

    let msg = await message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });

    if (msg == null) {
        msg = await message.fetchReply();
    }

    const custom_id = 'config.' + user.id + '.' + message.channelId + '.' + msg.id + '.setupButton';

    const button = new MessageButton()
        .setCustomId(custom_id)
        .setLabel('Setup')
        .setStyle('PRIMARY');

    const row = new MessageActionRow()
        .addComponents(button);

    if (already_setup == '0') {
        await msg.edit({ embeds: [embed], components: [row] });
    }
}

module.exports = {
    name: 'config',
    cooldown: 30,
    description: i18n.__mf('config.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(false)
        .setName('config')
        .setDescription(i18n.__mf('config.description')),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, null, true);
    },
    async interact(client, interaction, message, section) {
        if (section == 'setupButton') {
            await message.delete();
            const cmd = client.commands.get('setup');
            await cmd.slash(client, interaction);
        }
    },
};