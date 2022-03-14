# [PW Wiki Bot](https://justunwanted.com/PWWB/invite)
A wiki bot used in the official Pixel Worlds Discord Server.

All contribution is welcomed, however whether it gets added to the actual bot that is running in the server depends.

<dl>
    <dt>
    Note: This bot's code is different in terms of the wiki command and the backend to allow multiple server to use the bot.
    </dt>
<dl>
<br/>

## Installation
### Linux
1. Make sure you have installed [Node.js](https://www.digitalocean.com/community/tutorials/how-to-install-node-js-on-debian-9) v10 or higher and [Git](https://www.linode.com/docs/development/version-control/how-to-install-git-on-linux-mac-and-windows/).
2. Clone this repository with `https://github.com/ColdUnwanted/PW-Wiki-Bot.git`.
3. Run `cd PW-Wiki-Bot` to move in the folder that Git has just created.
4. Run `npm install` to download the node modules required.
5. Rename `config-example.json` to `config.json` and edit it.
7. Run the bot with `node bot.js`.

### Windows
1. Make sure you have installed [Node.js](https://www.guru99.com/download-install-node-js.html) v10 or higher and [Git](https://www.linode.com/docs/development/version-control/how-to-install-git-on-linux-mac-and-windows/).
2. Clone this repository with `https://github.com/ColdUnwanted/PW-Wiki-Bot.git`.
3. Run `cd PW-Wiki-Bot` to move in the folder that Git has just created.
4. Run `npm install` to download the node modules required.
5. Rename `config-example.json` to `config.json` and edit it.
7. Run the bot with `node bot.js`.

### Bot Setup
Rename `config-example.json` to `config.json` and edit the default value
* `token` - Discord bot [token](https://www.writebots.com/discord-bot-token/)
* `id` - Discord bot id
* `desc` - A random text
* `default_prefix` - Discord bot prefix
* `status` - Discord bot status
* `owner_id` - Your discord ID

#### Wiki configuration
Create the [Bot Account](https://pixelworlds.fandom.com/wiki/Special:BotPasswords) and update the `config.json`
* `bot_name` - The name of the bot you created. E.g. `ColdUnwanted@PWBot`
* `bot_password` - The bot password you created

## Commands
Default prefix: `!`
* `config` - Config the bot (Already configured by default)
* `setup` - Setup the bot (Already configured by default)
* `help` - Get a list of commands
* `invite` - Bot invite code (Default to the actual PW Wiki Bot)
* `ping` - Get the bot's ping to discord and wiki
* `uptime` - Get the bot's uptime
* `list` - Used to display a list of PW stuffs
* `wiki` - Used to search for PW item on Wiki
<br/><dl><dt>Note: The image return might be double or might not update in the embed, this is normal because the actual version is sending the image to another channel before embeding it.</dt><dl>