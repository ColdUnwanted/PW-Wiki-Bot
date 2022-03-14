const { MessageEmbed } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const ping = require('ping');
const i18n = require('i18n');

/*
    Summary:
    A command that will show the ping to Discord's API & their websocket. Also added another ping to wiki site, technically that is not needed.
    Purpose of this is just to know how's the ping like.
*/

async function command(client, message, args, interaction = false) {
    const wiki_ping = await ping.promise.probe('pixelworlds.fandom.com');

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
            i18n.__mf('ping.message', {
                websocket: Math.round(message.client.ws.ping) + 'ms',
                api: 'Testing...',
                fandom: wiki_ping.time + 'ms',
            }),
        )
        .setAuthor(
            user.tag,
            user.avatarURL(),
        )
        .setTimestamp();

    // Get the api start and end time
    let date = new Date();
    const start_time = date.getTime();
    const msg = await message
        .reply({ embeds: [embed], allowedMentions: { repliedUser: false } })
        .catch(console.error);

    date = new Date();
    const end_time = date.getTime();

    // Edit the msg to add the api
    embed.setDescription(
        i18n.__mf('ping.message', {
            websocket: Math.round(message.client.ws.ping) + 'ms',
            api: Math.round((end_time - start_time)) + 'ms',
            fandom: wiki_ping.time + 'ms',
        }),
    );

    if (interaction) {
        await message.editReply({ embeds: [embed] });
    }
    else {
        await msg.edit({ embeds: [embed] });
    }
}

module.exports = {
    name: 'ping',
    cooldown: 30,
    description: i18n.__mf('ping.description'),
    data: new SlashCommandBuilder()
        .setDefaultPermission(true)
        .setName('ping')
        .setDescription(i18n.__mf('ping.description')),
    async execute(client, message, args) {
        await command(client, message, args);
    },
    async slash(client, interaction) {
        await command(client, interaction, null, true);
    },
};