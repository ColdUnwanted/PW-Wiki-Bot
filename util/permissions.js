const i18n = require('i18n');

module.exports.update_permissions = async function update_permissions(client) {
    console.log('Started updating application (/) commands permissions.');
    const all_commands = await client.application?.commands.fetch();
    const guilds = await client.guilds.cache;

    // Go through all commands
    guilds.each(async (guild_data) => {
        const guild = await client.guilds.cache.get(guild_data.id);
        const full_permissions = [];
        all_commands.forEach(async (commands) => {
            if (!commands.defaultPermission) {
                const permissions = [
                    {
                        id: guild.ownerId,
                        type: 'USER',
                        permission: true,
                    },
                ];

                full_permissions.push(
                    {
                        id: commands.id,
                        permissions: permissions,
                    },
                );
            }
        });

        try {
            await guild.commands.permissions.set({ fullPermissions: full_permissions });
        }
        catch {
            // Oo nothing
        }
    });

    console.log('Successfully updating application (/) commands permissions.');
};

module.exports.admin_permissions = async function admin_permissions(client, message) {
    if (message.guild.ownerId == message.member.id) {
        return true;
    }

    const mod_role = client.settings[message.guildId]['mod_role'];

    if (message.member.roles.cache.some(role => role.id === mod_role)) {
        return true;
    }

    await message.reply(i18n.__mf('common.permissionError'));
    return false;
};