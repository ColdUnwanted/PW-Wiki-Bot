const axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const url = require('url');
const difflib = require('difflib');
const fs = require('fs');
const { wiki } = require('../../config.json');

async function login() {
    // Fetch the bot credentials from the config
    const bot_name = wiki.bot_name;
    const bot_password = wiki.bot_password;

    // Create an instance
    const instance = axios.create({
        baseURL: 'https://pixelworlds.fandom.com/api.php',
        withCredentials: true,
    });

    // Enable cookie support if not token will not work
    axiosCookieJarSupport(instance);
    instance.defaults.jar = new tough.CookieJar();

    // Fetch the token because to login, token is required
    const token_parameter = {
        action: 'query',
        meta: 'tokens',
        type: 'login',
        format: 'json',
    };

    const token_response = await instance.get('/', { params: token_parameter });
    const token_data = token_response.data;

    const login_token = token_data['query']['tokens']['logintoken'];

    // Login to the bot, this is done to allow fetching of query more than 500
    const login_params = new url.URLSearchParams({
        action: 'login',
        lgname: bot_name,
        lgpassword: bot_password,
        lgtoken: login_token,
        format: 'json',
    });

    const login_response = await instance.post('/', login_params);

    // Check the login status
    if (login_response.data['login']['result'] == 'Success') {
        return instance;
    }
    else {
        return null;
    }
}

async function logout(instance) {
    // Get the logout token, this is needed to log the user out
    const token_parameter = {
        action: 'query',
        meta: 'tokens',
        format: 'json',
    };

    const token_response = await instance.get('/', { params: token_parameter });
    const token_data = token_response.data;

    const logout_token = token_data['query']['tokens']['csrftoken'];

    // Logout the user so that a new session can be made later on
    // This will prevent overcrowding of users
    const logout_params = new url.URLSearchParams({
        action: 'logout',
        token: logout_token,
        format: 'json',
    });

    await instance.post('/', logout_params);
}

module.exports.get_all_items = async function get_all_items(callback) {
    // Call the login function
    const instance = await login();

    if (login == null) {
        return null;
    }

    // Get the necessary stuffs
    const all_items = [];

    const all_categories = [
        'Items',
        'Boosters',
    ];

    // Make a promnise array
    // This is done to allow multi concurrent requests
    // This is to make the fetching of data faster
    const all_promise = [];
    all_categories.forEach(category => {
        const params = {
            action: 'query',
            list: 'categorymembers',
            cmtitle: 'Category:' + category,
            cmlimit: '5000',
            format: 'json',
        };

        all_promise.push(instance.get('/', { params: params }));
    });

    // Run the promise and save the datas
    const result = await Promise.all(all_promise);

    for (let i = 0; i < result.length; i++) {
        const catmembers = result[i].data['query']['categorymembers'];
        const cat = all_categories[i];

        catmembers.forEach(item => {
            all_items.push([item['title'], cat]);
        });
    }

    logout(instance);
    callback(all_items);
};

module.exports.search = async function search(name, all_item) {
    // Call the login function
    const instance = await login();

    if (login == null) {
        return null;
    }

    // Search for the item
    const params = {
        action: 'opensearch',
        search: name,
        limit: '20',
        format: 'json',
    };

    const response = await instance.get('/', { params: params });

    // Logout first because the session isnt needed anymore
    logout(instance);

    // Now filter out the result
    const raw_result = response.data[1];
    const filtered_results = [];

    raw_result.forEach(item => {
        all_item.forEach(the_item => {
            if (the_item[0].toUpperCase() == item.toUpperCase()) {
                filtered_results.push(item);
            }
        });
    });

    // If the filtered result is only 1, it means it's a typo or there is only 1 answer to that item name so just return it
    if (filtered_results.length == 1) {
        return filtered_results[0];
    }

    // Check the results
    if (filtered_results.length >= 5) {
        // use the search egnine's result
        return [filtered_results[0], filtered_results[1], filtered_results[2], filtered_results[3], filtered_results[4]];
    }
    else {
        // Need ot add some self search engine into it.
        return self_search(name, filtered_results, all_item);
    }
};

function self_search(name, some_results, all_item) {
    // Create a clone of the array
    const dup_items = all_item.slice();
    const dup_all_items = [];

    dup_items.forEach(item => {
        dup_all_items.push(item[0]);
    });

    // Remove the items that is already in the results from the list
    some_results.forEach(result => {
        const to_remove = dup_all_items.indexOf(result);

        if (to_remove > -1) {
            dup_all_items.splice(to_remove, 1);
        }
    });

    // Use difflib to get the result
    const results = difflib.getCloseMatches(name, dup_all_items, 5 - some_results.length, 0);

    results.forEach(item => {
        some_results.push(item);
    });

    return some_results;
}

module.exports.shortform_check = function shortform_check(text) {
    // Open the JSON file
    const shortform_list = fs.readFileSync('util/wiki/data/shortform.json', 'utf8');

    // Convert to JSON
    const shortform = JSON.parse(shortform_list);

    const splited_text = text.split(' ');
    const new_text_list = [];

    splited_text.forEach(string => {
        Object.keys(shortform).forEach(key => {
            if (shortform[key].includes(string.toLowerCase())) {
                string = key;
            }
        });

        new_text_list.push(string);
    });

    return new_text_list.join(' ');
};

module.exports.get_block_info = async function get_block_info(name) {
    // Api: api.php?action=query&prop=revisions&titles=Alien%20Orb&vrslots=*&rvprop=content&format=json
    // Format: Json
    const instance = await login();

    // Array to store all the promises
    const all_promise = [];

    // The page params
    const page_params = {
        action: 'query',
        prop: 'revisions',
        titles: name,
        rvslots: '*',
        rvprop: 'content',
        format: 'json',
    };

    // First promise
    all_promise.push(instance.get('/', { params: page_params }));

    // Images params
    const image_params = {
        action: 'query',
        prop: 'imageinfo',
        titles: 'File:' + name + '.png',
        iiprop: 'url',
        format: 'json',
    };

    const placeholder_image_params = {
        action: 'query',
        prop: 'imageinfo',
        titles: 'File:Placeholder.png',
        iiprop: 'url',
        format: 'json',
    };

    // Add to the promise
    all_promise.push(instance.get('/', { params: image_params }));
    all_promise.push(instance.get('/', { params: placeholder_image_params }));

    // Run all the promises
    const result = await Promise.all(all_promise);
    logout(instance);

    // Extract the result
    const page_data = result[0].data['query']['pages'];
    const page_number = Object.keys(page_data)[0];
    let page_code = null;

    if (page_number != -1) {
        page_code = page_data[page_number]['revisions'][0]['slots']['main']['*'];
    }
    else {
        return null;
    }

    // Image
    const image_data = result[1].data['query']['pages'];
    const image_page_number = Object.keys(image_data)[0];

    let image = null;
    if (image_page_number != -1) {
        image = image_data[image_page_number]['imageinfo'][0]['url'];
    }
    else {
        // Use placeholder image
        const placeholder_image_data = result[2].data['query']['pages'];
        const placeholder_image_page_number = Object.keys(placeholder_image_data)[0];

        if (placeholder_image_page_number != -1) {
            image = placeholder_image_data[placeholder_image_page_number]['imageinfo'][0]['url'];
        }
        else {
            return null;
        }
    }

    const merged = [];

    // Add image field
    merged.push(image);

    // Add info field
    const info = get_all_info(page_code);
    if (info != null) {
        merged.push(info);
    }
    else {
        return null;
    }

    // Add desc field
    const desc = get_all_desc(page_code);
    if (desc != null) {
        merged.push(desc);
    }
    else {
        return null;
    }

    // Add attribute field
    const attribute = get_all_attributes(page_code);
    if (attribute != null) {
        merged.push(attribute);
    }

    // Everything is done so return the merged array
    return merged;
};

function get_all_info(code) {
    try {
        // Complexity
        let comp = 'N/A';
        try {
            comp = code.split('|comp = ')[1].split('\n|')[0];

            if (comp == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                comp = code.split('|comp= ')[1].split('\n|')[0];

                if (comp == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    comp = code.split('|comp=')[1].split('\n|')[0];

                    if (comp == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    comp = code.split('|comp =')[1].split('\n|')[0];

                    if (comp == undefined) {
                        comp = '';
                    }
                }
            }
        }

        if (comp == '') {
            comp = 'N/A';
        }

        // Tier
        let tier = 'N/A';
        try {
            tier = code.split('|tier = ')[1].split('\n|')[0];

            if (tier == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                tier = code.split('|tier= ')[1].split('\n|')[0];

                if (tier == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    tier = code.split('|tier=')[1].split('\n|')[0];

                    if (tier == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    tier = code.split('|tier =')[1].split('\n|')[0];

                    if (tier == undefined) {
                        tier = '';
                    }
                }
            }
        }

        tier = tier.replaceAll('\n', '');

        // Rarity
        let rarity = 'N/A';
        try {
            rarity = code.split('|rarity = ')[1].split('\n|')[0];

            if (rarity == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                rarity = code.split('|rarity= ')[1].split('\n|')[0];

                if (rarity == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    rarity = code.split('|rarity=')[1].split('\n|')[0];

                    if (rarity == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    rarity = code.split('|rarity =')[1].split('\n|')[0];

                    if (rarity == undefined) {
                        rarity = '';
                    }
                }
            }
        }

        rarity = rarity.replaceAll('\n', '');
        rarity = rarity.trim();

        // Change the rarity to full world
        if (rarity == 'C') {
            rarity = 'Common';
        }
        else if (rarity == 'UC') {
            rarity = 'Uncommon';
        }
        else if (rarity == 'R') {
            rarity = 'Rare';
        }
        else if (rarity == 'UR') {
            rarity = 'Ultra Rare';
        }
        else if (rarity == 'L') {
            rarity = 'Legendary';
        }
        else if (rarity == 'L+') {
            rarity = 'Legendary+';
        }

        // Type
        let type = 'N/A';
        try {
            type = code.split('|type = ')[1].split('\n|')[0];

            if (type == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                type = code.split('|type= ')[1].split('\n|')[0];

                if (type == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    type = code.split('|type=')[1].split('\n|')[0];

                    if (type == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    type = code.split('|type =')[1].split('\n|')[0];

                    if (type == undefined) {
                        type = '';
                    }
                }
            }
        }

        type = type.replaceAll('\n', '');

        // Farmability
        let farm = 'No';
        try {
            farm = code.split('|farmable = ')[1].split('\n|')[0];

            if (farm == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                farm = code.split('|farmable= ')[1].split('\n|')[0];

                if (farm == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    farm = code.split('|farmable=')[1].split('\n|')[0];

                    if (farm == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    farm = code.split('|farmable =')[1].split('\n|')[0];

                    if (farm == undefined) {
                        farm = '';
                    }
                }
            }
        }

        farm = farm.replaceAll('\n', '');

        // Crossbreedable
        let cross = 'non-crossbreedable';
        try {
            cross = code.split('|parents = ')[1].split('\n|')[0];

            if (cross == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                cross = code.split('|parents= ')[1].split('\n|')[0];

                if (cross == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    cross = code.split('|parents=')[1].split('\n|')[0];

                    if (cross == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    cross = code.split('|parents =')[1].split('\n|')[0];

                    if (cross == undefined) {
                        cross = '';
                    }
                }
            }
        }

        cross = cross.replaceAll('\n', '').replaceAll('N/A', 'non-crossbreedable');

        // Growth time, consumables & production time
        // Check which can be found
        const types = [
            'time',
            'consumes',
            'growth',
        ];

        let which = 'G';
        let this_type = null;

        types.forEach(t => {
            let check = 'N/A';
            try {
                check = code.split('|' + t + ' = ')[1].split('\n|')[0];

                if (check == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    check = code.split('|' + t + '= ')[1].split('\n|')[0];

                    if (check == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    try {
                        check = code.split('|' + t + '=')[1].split('\n|')[0];

                        if (check == undefined) {
                            throw 'Index out of bound';
                        }
                    }
                    catch {
                        try {
                            check = code.split('|' + t + ' =')[1].split('\n|')[0];

                            if (check == undefined) {
                                throw 'Index out of bound';
                            }
                        }
                        catch {
                            return;
                        }
                    }
                }
            }

            check = check.replaceAll('\n', '');

            if (check == '') {
                check = 'N/A';
            }

            // Set the which
            if (t == 'time') {
                // Production Time
                which = 'P';
            }
            else if (t == 'consumes') {
                // Consumes
                which = 'C';
            }
            else if (t == 'growth') {
                // Growth Time
                which = 'G';
            }
            else {
                // Something is wrong here... Blame FREAK!
                which = 'N/A';
            }

            this_type = check;
        });

        // Put it into an array
        const all_info = [
            comp,
            tier,
            rarity,
            type,
            farm,
            cross,
            this_type,
        ];

        // Last clean up
        const to_replace = [
            '{{Tooltip|',
            '|icon=true}}',
            '{{',
            '}}',
            '[[',
            ']]',
        ];

        for (let i = 0; i < all_info.length; i++) {
            to_replace.forEach(to => {
                all_info[i] = all_info[i].replaceAll(to, '');
            });
        }

        // Return everything
        return [all_info, which];
    }
    catch {
        return null;
    }
}

function get_all_desc(code) {
    let desc = null;
    try {
        // Get the desc
        let startDesc = '';
        try {
            startDesc = code.split('|desc = ')[1];

            if (startDesc == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                startDesc = code.split('|desc= ')[1];

                if (startDesc == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    startDesc = code.split('|desc=')[1];

                    if (startDesc == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    startDesc = code.split('|desc =')[1];

                    if (startDesc == undefined) {
                        startDesc = '';
                    }
                }
            }
        }

        desc = startDesc.split('}}</onlyinclude>')[0];

        // Stuffs to replace in the description
        const desc_replace = [
            '[[Shop Pack|',
            '[[Pixel Mines#Dark Stone Vendor|',
            '[[Pixel Mines#Wheel of Fortune|',
            '{{Tooltip|',
            '|icon=true}}',
            '|icon = true}}',
            '[[VIP Daily Bonus|',
            '[[Daily Bonus|',
            '[[Familiars|',
            '[[',
            ']]',
            '{{',
            '}}',
        ];

        desc_replace.forEach(change => {
            desc = desc.replaceAll(change, '');
        });

        // Gallery removal
        desc = desc.replaceAll(/ <gallery[\s\S]*?gallery>/g, '');

        // Last Clean up
        return desc.replaceAll('<br>', '\n').replaceAll('</br>', '\n');
    }
    catch (e) {
        console.log(e);
        return null;
    }
}

function get_all_attributes(code) {
    let attribute = [];

    try {
        // Damange
        let damage = '';
        try {
            damage = code.split('|damage = ')[1].split('\n|')[0];

            if (damage == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                damage = code.split('|damage= ')[1].split('\n|')[0];

                if (damage == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    damage = code.split('|damage=')[1].split('\n|')[0];

                    if (damage == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    damage = code.split('|damage =')[1].split('\n|')[0];

                    if (damage == undefined) {
                        damage = '';
                    }
                }
            }
        }

        damage = damage.replaceAll('\n', '');

        // Armor
        let defence = '';
        try {
            defence = code.split('|armor = ')[1].split('\n|')[0];

            if (defence == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                defence = code.split('|armor= ')[1].split('\n|')[0];

                if (defence == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    defence = code.split('|armor=')[1].split('\n|')[0];

                    if (defence == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    defence = code.split('|armor =')[1].split('\n|')[0];

                    if (defence == undefined) {
                        defence = '';
                    }
                }
            }
        }

        defence = defence.replaceAll('\n', '');

        // Critical
        let critical = '0';
        try {
            critical = code.split('|critical = ')[1].split('\n|')[0];

            if (critical == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                critical = code.split('|critical= ')[1].split('\n|')[0];

                if (critical == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    critical = code.split('|critical=')[1].split('\n|')[0];

                    if (critical == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    critical = code.split('|critical =')[1].split('\n|')[0];

                    if (critical == undefined) {
                        critical = '';
                    }
                }
            }
        }

        critical = critical.replaceAll('\n', '');

        // Earth
        let earth = '0';
        try {
            earth = code.split('|earth = ')[1].split('\n|')[0];

            if (earth == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                earth = code.split('|earth= ')[1].split('\n|')[0];

                if (earth == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    earth = code.split('|earth=')[1].split('\n|')[0];

                    if (earth == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    earth = code.split('|earth =')[1].split('\n|')[0];

                    if (earth == undefined) {
                        earth = '';
                    }
                }
            }
        }

        earth = earth.replaceAll('\n', '');

        // Air
        let air = '0';
        try {
            air = code.split('|air = ')[1].split('\n|')[0];

            if (air == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                air = code.split('|air= ')[1].split('\n|')[0];

                if (air == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    air = code.split('|air=')[1].split('\n|')[0];

                    if (air == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    air = code.split('|air =')[1].split('\n|')[0];

                    if (air == undefined) {
                        air = '';
                    }
                }
            }
        }

        air = air.replaceAll('\n', '');

        // Fire
        let fire = '0';
        try {
            fire = code.split('|fire = ')[1].split('\n|')[0];

            if (fire == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                fire = code.split('|fire= ')[1].split('\n|')[0];

                if (fire == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    fire = code.split('|fire=')[1].split('\n|')[0];

                    if (fire == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    fire = code.split('|fire =')[1].split('\n|')[0];

                    if (fire == undefined) {
                        fire = '';
                    }
                }
            }
        }

        fire = fire.replaceAll('\n', '');

        // Water
        let water = '0';
        try {
            water = code.split('|water = ')[1].split('\n|')[0];

            if (water == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                water = code.split('|water= ')[1].split('\n|')[0];

                if (water == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    water = code.split('|water=')[1].split('\n|')[0];

                    if (water == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    water = code.split('|water =')[1].split('\n|')[0];

                    if (water == undefined) {
                        water = '';
                    }
                }
            }
        }

        water = water.replaceAll('\n', '');

        // Dark
        let dark = '0';
        try {
            dark = code.split('|dark = ')[1].split('\n|')[0];

            if (dark == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                dark = code.split('|dark= ')[1].split('\n|')[0];

                if (dark == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    dark = code.split('|dark=')[1].split('\n|')[0];

                    if (dark == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    dark = code.split('|dark =')[1].split('\n|')[0];

                    if (dark == undefined) {
                        dark = '';
                    }
                }
            }
        }

        dark = dark.replaceAll('\n', '');

        // Light
        let light = '0';
        try {
            light = code.split('|light = ')[1].split('\n|')[0];

            if (light == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                light = code.split('|light= ')[1].split('\n|')[0];

                if (light == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    light = code.split('|light=')[1].split('\n|')[0];

                    if (light == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    light = code.split('|light =')[1].split('\n|')[0];

                    if (light == undefined) {
                        light = '';
                    }
                }
            }
        }

        light = light.replaceAll('\n', '');

        if (damage != '') {
            // Damage is not empty so it's a weapon
            attribute = [
                damage,
                critical,
                earth,
                air,
                fire,
                water,
                dark,
                light,
            ];
        }
        else if (defence != '') {
            // Defence is not empty so it's a Armor
            attribute = [
                defence,
                critical,
                earth,
                air,
                fire,
                water,
                dark,
                light,
            ];
        }
        else {
            // Normal block
            return null;
        }

        return attribute;
    }
    catch {
        return null;
    }
}

module.exports.get_booster_info = async function get_booster_info(name) {
    const instance = await login();

    // Array of promises
    const all_promise = [];

    // Pages param
    const page_params = {
        action: 'query',
        prop: 'revisions',
        titles: name,
        rvslots: '*',
        rvprop: 'content',
        format: 'json',
    };

    // Insert the promise
    all_promise.push(instance.get('/', { params: page_params }));

    // Booster image param
    const img_params = {
        action: 'query',
        prop: 'imageinfo',
        titles: 'File:' + name + '.png',
        iiprop: 'url',
        format: 'json',
    };

    // Insert promise
    all_promise.push(instance.get('/', { params: img_params }));

    // Placeholder image param
    const placeholder_image_params = {
        action: 'query',
        prop: 'imageinfo',
        titles: 'File:Placeholder.png',
        iiprop: 'url',
        format: 'json',
    };

    // Insert promise
    all_promise.push(instance.get('/', { params: placeholder_image_params }));

    // Run all promises
    const result = await Promise.all(all_promise);

    // Extract the result
    const page_data = result[0].data['query']['pages'];
    const page_number = Object.keys(page_data)[0];
    let page_code = null;

    if (page_number != -1) {
        page_code = page_data[page_number]['revisions'][0]['slots']['main']['*'];
    }
    else {
        logout(instance);
        return null;
    }

    // Image
    const image_data = result[1].data['query']['pages'];
    const image_page_number = Object.keys(image_data)[0];

    let image = null;
    if (image_page_number != -1) {
        image = image_data[image_page_number]['imageinfo'][0]['url'];
    }
    else {
        // Use placeholder image
        const placeholder_image_data = result[2].data['query']['pages'];
        const placeholder_image_page_number = Object.keys(placeholder_image_data)[0];

        if (placeholder_image_page_number != -1) {
            image = placeholder_image_data[placeholder_image_page_number]['imageinfo'][0]['url'];
        }
        else {
            logout(instance);
            return null;
        }
    }

    // Get all booster child iamge
    const all_image = [];
    const all_name = [];
    const booster_child = [];

    try {
        const each_line = page_code.split('\n');
        each_line.forEach(line => {
            const png_array = line.replace('|link= ', '^&').replace('|link = ', '^&').replace('|link=', '^&').replace('|link =', '^&').split('^&');

            if (png_array.length > 1) {
                const png = png_array[1].split('|')[0].replaceAll('_', ' ');
                all_name.push(png);
            }
        });

        if (all_name.length == 0) {
            // The special one...
            // Using a useless table because of freak -.-
            each_line.forEach(line => {
                const png_array = line.replace('{{Tooltip|', '^&').split('^&');

                if (png_array.length > 1) {
                    const png = png_array[1].split('|icon')[0].replaceAll('_', ' ');
                    all_name.push(png);
                }
            });
        }

        const another_promise = [];
        all_name.forEach(booster_child_img => {
            // PNG image getter
            const child_params_png = {
                action: 'query',
                prop: 'imageinfo',
                titles: 'File:' + booster_child_img + '.png',
                iiprop: 'url',
                format: 'json',
            };

            another_promise.push(instance.get('/', { params: child_params_png }));

            // JPG image getter
            const child_params_jpg = {
                action: 'query',
                prop: 'imageinfo',
                titles: 'File:' + booster_child_img + '.jpg',
                iiprop: 'url',
                format: 'json',
            };

            another_promise.push(instance.get('/', { params: child_params_jpg }));

            const child_params_jpeg = {
                action: 'query',
                prop: 'imageinfo',
                titles: 'File:' + booster_child_img + '.jpeg',
                iiprop: 'url',
                format: 'json',
            };

            another_promise.push(instance.get('/', { params: child_params_jpeg }));
        });

        const image_result = await Promise.all(another_promise);

        let counter = 0;

        all_name.forEach(i => {
            // Go through the results
            const image_data_1 = image_result[counter].data['query']['pages'];
            const data_page_1 = Object.keys(image_data_1)[0];
            counter++;
            const image_data_2 = image_result[counter].data['query']['pages'];
            const data_page_2 = Object.keys(image_data_2)[0];
            counter++;
            const image_data_3 = image_result[counter].data['query']['pages'];
            const data_page_3 = Object.keys(image_data_3)[0];
            counter++;

            let which_img = null;
            if (data_page_1 != -1) {
                which_img = image_data_1[data_page_1]['imageinfo'][0]['url'];
            }
            else if (data_page_2 != -1) {
                which_img = image_data_2[data_page_2]['iamgeinfo'][0]['url'];
            }
            else if (data_page_3 != -1) {
                which_img = image_data_3[data_page_3]['imageinfo'][0]['url'];
            }
            else {
                const placeholder_image_data = result[2].data['query']['pages'];
                const placeholder_image_page_number = Object.keys(placeholder_image_data)[0];

                which_img = placeholder_image_data[placeholder_image_page_number]['imageinfo'][0]['url'];
            }

            all_image.push(which_img);
        });

        booster_child.push(all_image);
        booster_child.push(all_name);
    }
    catch {
        logout(instance);
        return null;
    }

    logout(instance);

    const merged = [];

    // Add image
    merged.push(image);

    // Get booster cost
    const cost = get_booster_cost(page_code);
    if (cost != null) {
        merged.push(cost);
    }
    else {
        return null;
    }

    // Add booster child image
    merged.push(booster_child);

    return merged;
};

function get_booster_cost(code) {
    let cost = null;

    try {
        try {
            cost = code.split('|cost = ')[1].split('|')[0].split('}}')[0];

            if (cost == undefined) {
                throw 'Index out of bound';
            }
        }
        catch {
            try {
                cost = code.split('|cost= ')[1].split('|')[0].split('}}')[0];

                if (cost == undefined) {
                    throw 'Index out of bound';
                }
            }
            catch {
                try {
                    cost = code.split('|cost=')[1].split('|')[0].split('}}')[0];

                    if (cost == undefined) {
                        throw 'Index out of bound';
                    }
                }
                catch {
                    cost = code.split('|cost =')[1].split('|')[0].split('}}')[0];

                    if (cost == undefined) {
                        cost = null;
                    }
                }
            }
        }

        cost = cost.replace('\n', '');
        return cost;
    }
    catch {
        return null;
    }
}