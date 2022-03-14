const { MessageEmbed, MessageButton, MessageActionRow } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const i18n = require('i18n');

/*
    Summary:
    A command that is used to give user the invite link of the bot, technically this can be obtained from the help command
    But most bots just create this command, so I just followed it.
*/

async function command(client, message, args, interaction = false) {
    let user = null;
    if (interaction) {
        user = message.user;
    }
    else {
        user = message.author;
    }

    const embed = new MessageEmbed()
        .setColor('#2f3136')
        .setDescription(
            i18n.__mf('invite.message'),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    let msg = await message.reply({ embeds: [embed] });

    if (msg == null) {
        msg = await message.fetchReply();
    }

    const button = new MessageButton()
        .setLabel('Invite')
        .setStyle('LINK')
        .setURL('https://justunwanted.com/PWWB/invite');

    const row = new MessageActionRow()
        .addComponents(button);

    await msg.edit({ embeds: [embed], components: [row] });
}

module.exports = {
    name: 'invite',
    cooldown: 30,
    description: i18n.__mf('invite.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(true)
        .setName('invite')
        .setDescription(i18n.__mf('invite.description')),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, null, true);
    },
};