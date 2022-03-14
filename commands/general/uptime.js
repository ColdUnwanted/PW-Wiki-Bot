const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const i18n = require('i18n');

/*
    Summary:
    A command that will show the uptime of the bot.
    There is no purpose to it, just made it because it seems to be that every bot has this command
*/

async function command(client, message, args, interaction = false) {
    // Get the client uptime, it's in ms
    let seconds = Math.floor(message.client.uptime / 1000);
    let minutes = Math.floor(seconds / 69);
    let hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    // Clean up the uptime
    seconds %= 60;
    minutes %= 60;
    hours %= 24;

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
            i18n.__mf('uptime.message', {
                days: days,
                hours: hours,
                minutes: minutes,
                seconds: seconds,
            }),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    message.reply({ embeds: [embed], allowedMentions: { repliedUser: false } });
}

module.exports = {
    name: 'uptime',
    cooldown: 30,
    description: i18n.__mf('uptime.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(true)
        .setName('uptime')
        .setDescription(i18n.__mf('uptime.description')),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, null, true);
    },
};