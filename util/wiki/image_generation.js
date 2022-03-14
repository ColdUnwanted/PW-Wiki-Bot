const { registerFont, createCanvas, loadImage } = require('canvas');
const axios = require('axios').default;
const wrap = require('word-wrap');

// Register fonts
registerFont('util/wiki/data/BebasNeue-Regular.ttf', { family: 'BN' });
registerFont('util/wiki/data/PoetsenOne-Regular.ttf', { family: 'PO' });

module.exports.convert = async function convert(name, infos) {
    // Get the rarity and item type
    // Then determine which image frame to use

    const rarity = infos[1][0][2];
    const item_type = infos[1][0][3];
    let no_attribute = true;
    let attribute_type = null;

    // Pick image template
    let image_template = null;

    if (infos.length < 4) {
        // This mean it's not a wearables
        // So pick the image template
        if (rarity.toLowerCase() == 'common') {
            image_template = await loadImage('util/wiki/data/tnorc.png');
        }
        else if (rarity.toLowerCase() == 'uncommon') {
            image_template = await loadImage('util/wiki/data/tnoruc.png');
        }
        else if (rarity.toLowerCase() == 'rare') {
            image_template = await loadImage('util/wiki/data/tnorr.png');
        }
        else if (rarity.toLowerCase() == 'ultra rare') {
            image_template = await loadImage('util/wiki/data/tnorur.png');
        }
        else if (rarity.toLowerCase() == 'legendary') {
            image_template = await loadImage('util/wiki/data/tnorl.png');
        }
        else if (rarity.toLowerCase() == 'legendary+') {
            image_template = await loadImage('util/wiki/data/tnorlp.png');
        }
        else {
            // Rarity N/A
            image_template = await loadImage('util/wiki/data/tnorc.png');
        }

        no_attribute = true;
    }
    else {
        // Either a weapon or a wearable
        // Check weapons first
        if (item_type.toLowerCase() == 'weapons') {
            // Meaning that its a weapon
            // Pick themplate according to the rarity
            if (rarity.toLowerCase() == 'common') {
                image_template = await loadImage('util/wiki/data/tattc.png');
            }
            else if (rarity.toLowerCase() == 'uncommon') {
                image_template = await loadImage('util/wiki/data/tattuc.png');
            }
            else if (rarity.toLowerCase() == 'rare') {
                image_template = await loadImage('util/wiki/data/tattr.png');
            }
            else if (rarity.toLowerCase() == 'ultra rare') {
                image_template = await loadImage('util/wiki/data/tattur.png');
            }
            else if (rarity.toLowerCase() == 'legendary') {
                image_template = await loadImage('util/wiki/data/tattl.png');
            }
            else if (rarity.toLowerCase() == 'legendary+') {
                image_template = await loadImage('util/wiki/data/tattlp.png');
            }
            else {
                // Rarity N/A
                image_template = await loadImage('util/wiki/data/tattc.png');
            }

            attribute_type = 'W';
        }
        else {
            // Wearables
            // Pick themplate according to the rarity
            if (rarity.toLowerCase() == 'common') {
                image_template = await loadImage('util/wiki/data/tdefc.png');
            }
            else if (rarity.toLowerCase() == 'uncommon') {
                image_template = await loadImage('util/wiki/data/tdefuc.png');
            }
            else if (rarity.toLowerCase() == 'rare') {
                image_template = await loadImage('util/wiki/data/tdefr.png');
            }
            else if (rarity.toLowerCase() == 'ultra rare') {
                image_template = await loadImage('util/wiki/data/tdefur.png');
            }
            else if (rarity.toLowerCase() == 'legendary') {
                image_template = await loadImage('util/wiki/data/tdefl.png');
            }
            else if (rarity.toLowerCase() == 'legendary+') {
                image_template = await loadImage('util/wiki/data/tdeflp.png');
            }
            else {
                // Rarity N/A
                image_template = await loadImage('util/wiki/data/tdefc.png');
            }

            attribute_type = 'D';
        }

        no_attribute = false;
    }

    // Create the canvas
    const W = 600;
    const H = 400;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Disable image compression stuffs
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    // Put the template image into the ctx
    ctx.drawImage(image_template, 0, 0);

    // Title bar
    // Set the ctx font size here
    ctx.font = '40px BN';
    const title_width = ctx.measureText(name).width;
    const title_height = 40;

    // Draw title box
    ctx.fillStyle = '#0064a5';
    ctx.beginPath();
    ctx.moveTo(((W - title_width) / 2) - 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 10, 53);
    ctx.lineTo(((W - title_width) / 2) - 10, 53);
    ctx.closePath();
    ctx.fill();

    // Draw outline box
    ctx.strokeStyle = '#0c2859';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(((W - title_width) / 2) - 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 10, 53);
    ctx.lineTo(((W - title_width) / 2) - 10, 53);
    ctx.lineTo(((W - title_width) / 2) - 19, 53 - title_height);
    ctx.closePath();
    ctx.stroke();

    // Draw the text
    ctx.fillStyle = 'white';
    ctx.fillText(name, (W - title_width) / 2, 48);

    // Set the image
    const img = infos[0];
    const item_img = await loadImage(img);
    ctx.drawImage(item_img, 8, 8, 240, 240, 34, 78, 120, 120);

    // Set the infos
    const tier = infos[1][0][1];
    const comp = infos[1][0][0];
    const farm = infos[1][0][4];
    const cross = infos[1][0][5];
    const any = infos[1][0][6];
    const which = infos[1][1];

    // Write item type
    ctx.font = '18px PO';
    ctx.fillStyle = 'white';
    ctx.fillText('Item Type:', 188, 97);

    ctx.font = '12px PO';
    ctx.fillStyle = '#1ed8e8';
    ctx.fillText(item_type, 208, 115);

    // Write tier
    ctx.font = '18px PO';
    ctx.fillStyle = 'white';
    ctx.fillText('Tier:', 316, 97);

    ctx.font = '12px PO';
    ctx.fillStyle = '#1ed8e8';
    ctx.fillText(tier, 335, 115);

    // Write complexity
    ctx.font = '18px PO';
    ctx.fillStyle = 'white';
    ctx.fillText('Complexity:', 442, 97);

    ctx.font = '12px PO';
    ctx.fillStyle = '#1ed8e8';
    ctx.fillText(comp, 462, 115);

    // Write rarity
    ctx.font = '18px PO';
    ctx.fillStyle = 'white';
    ctx.fillText('Complexity:', 188, 141);

    ctx.font = '12px PO';
    ctx.fillStyle = '#1ed8e8';
    ctx.fillText(rarity, 208, 159);

    // Write farmability
    ctx.font = '18px PO';
    ctx.fillStyle = 'white';
    ctx.fillText('Farmability:', 316, 141);

    ctx.font = '12px PO';
    ctx.fillStyle = '#1ed8e8';
    ctx.fillText(farm, 335, 159);

    // Write the last one which is either
    if (which == 'G') {
        ctx.font = '18px PO';
        ctx.fillStyle = 'white';
        ctx.fillText('Growth Time:', 442, 141);

        ctx.font = '12px PO';
        ctx.fillStyle = '#1ed8e8';
        ctx.fillText(any, 462, 159);
    }
    else if (which == 'C') {
        ctx.font = '18px PO';
        ctx.fillStyle = 'white';
        ctx.fillText('Consumes:', 442, 141);

        ctx.font = '12px PO';
        ctx.fillStyle = '#1ed8e8';
        ctx.fillText(any, 462, 159);
    }
    else {
        ctx.font = '15px PO';
        ctx.fillStyle = 'white';
        ctx.fillText('Production Time:', 442, 141);

        ctx.font = '12px PO';
        ctx.fillStyle = '#1ed8e8';
        ctx.fillText(any, 462, 159);
    }

    // Crossbreed
    ctx.font = '12px PO';
    ctx.fillStyle = 'white';
    const cross_width = ctx.measureText(cross).width;
    ctx.fillText(cross, 436 - (cross_width / 2), 189);

    // Descriptions
    const desc = infos[2];
    const splitDesc = desc.split('\n');

    let current_h = 234;
    const pad = 16;

    splitDesc.every(line_text => {
        const para = wrap(line_text, { width: 70 }).split('\n');
        para.forEach(line => {
            const dw = ctx.measureText(line).width;
            ctx.fillText(line, 300 - (dw / 2), current_h);
            current_h += pad;

            if (!no_attribute) {
                if (current_h >= 307) {
                    return;
                }
            }
            else {
                return;
            }
        });
    });

    // Attributes
    if (!no_attribute) {
        const base = infos[3][0];
        const crit = infos[3][1];
        const earth = infos[3][2];
        const air = infos[3][3];
        const fire = infos[3][4];
        const water = infos[3][5];
        const dark = infos[3][6];
        const light = infos[3][7];

        ctx.font = '15px PO';

        const text_height = 15;
        let text_width = 0;
        text_width = ctx.measureText(base).width;
        ctx.fillText(base, 83 - (text_width / 2), 355 - (text_height / 2));

        text_width = ctx.measureText(crit).width;
        ctx.fillText(crit, 139 - (text_width / 2), 355 - (text_height / 2));

        text_width = ctx.measureText(earth).width;
        ctx.fillText(earth, 223 - (text_width / 2), 355 - (text_height / 2));

        text_width = ctx.measureText(air).width;
        ctx.fillText(air, 289 - (text_width / 2), 355 - (text_height / 2));

        text_width = ctx.measureText(fire).width;
        ctx.fillText(fire, 352 - (text_width / 2), 355 - (text_height / 2));

        text_width = ctx.measureText(water).width;
        ctx.fillText(water, 417 - (text_width / 2), 355 - (text_height / 2));

        text_width = ctx.measureText(dark).width;
        ctx.fillText(dark, 484 - (text_width / 2), 355 - (text_height / 2));

        text_width = ctx.measureText(light).width;
        ctx.fillText(light, 549 - (text_width / 2), 355 - (text_height / 2));
    }

    return canvas.toBuffer();
};

module.exports.convert_list = async function convert_list(name, infos) {
    // Pick image template
    const image_template = await loadImage('util/wiki/data/tpack.png');

    // Create the canvas
    const W = 600;
    const H = 595;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Disable image compression stuffs
    ctx.webkitImageSmoothingEnabled = false;
    ctx.mozImageSmoothingEnabled = false;
    ctx.imageSmoothingEnabled = false;

    // Put the template image into the ctx
    ctx.drawImage(image_template, 0, 0);

    // Title bar
    // Set the ctx font size here
    ctx.font = '40px BN';
    const title_width = ctx.measureText(name).width;
    const title_height = 40;

    // Draw title box
    ctx.fillStyle = '#0064a5';
    ctx.beginPath();
    ctx.moveTo(((W - title_width) / 2) - 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 10, 53);
    ctx.lineTo(((W - title_width) / 2) - 10, 53);
    ctx.closePath();
    ctx.fill();

    // Draw outline box
    ctx.strokeStyle = '#0c2859';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(((W - title_width) / 2) - 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 19, 53 - title_height);
    ctx.lineTo(W - ((W - title_width) / 2) + 10, 53);
    ctx.lineTo(((W - title_width) / 2) - 10, 53);
    ctx.lineTo(((W - title_width) / 2) - 19, 53 - title_height);
    ctx.closePath();
    ctx.stroke();

    // Draw the text
    ctx.fillStyle = 'white';
    ctx.fillText(name, (W - title_width) / 2, 48);

    // Set the image
    const img = infos[0];
    const item_img = await loadImage(img);
    ctx.drawImage(item_img, 10, 10, 163, 163, 37, 82, 114, 114);

    // Set the infos
    const cost = infos[1];
    ctx.font = '18px PO';
    ctx.fillStyle = 'white';
    const cw = ctx.measureText('Cost').width;
    ctx.fillText('Cost', 93 - (cw / 2), 235);

    ctx.font = '12px PO';
    ctx.fillStyle = '#1ed8e8';
    const gw = ctx.measureText(cost + ' Gems').width;
    ctx.fillText(cost + ' Gems', 93 - (gw / 2), 252);

    // Image list
    const img_list = infos[2][0];
    let image_width = 191;
    let image_height = 85;
    for (let i = 0; i < img_list.length; i++) {
        const list_img = await loadImage(img_list[i]);
        ctx.drawImage(list_img, image_width, image_height, 32, 32);

        // Move the image width
        image_width += 42;

        // Image width checker
        if (image_width > 527) {
            if (img_list.length - i - 1 < 9) {
                // Calculate total width
                const total_width = ((img_list.length - i - 1) * 32) + ((img_list.length - i - 2) * 10);
                image_width = Math.round(375 - (total_width / 2));
                image_height += 39;
            }
            else {
                image_width = 191;
                image_height += 39;

                if (image_height >= 513) {
                    break;
                }
            }
        }
    }

    return canvas.toBuffer();
};