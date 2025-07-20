import { createCanvas, loadImage } from 'canvas';
import { classes } from './classes.js';
import { rareItems } from './rare-items.js';

const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
};

export async function generateProfileImage(member, stats, items, clans, t) {
    const width = 800;
    const height = 500; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const equippedBackground = items?.equippedBackground || 'default';
    const equippedTitleId = items?.equippedTitle;

    if (equippedBackground !== 'default' && equippedBackground.startsWith('http')) {
        try {
            const background = await loadImage(equippedBackground);
            ctx.drawImage(background, 0, 0, width, height);
        } catch (e) {
            console.error("Failed to load custom background, using default.", e);
            const gradient = ctx.createLinearGradient(0, 0, width, height);
            gradient.addColorStop(0, '#23272A');
            gradient.addColorStop(1, '#2C2F33');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#23272A');
        gradient.addColorStop(1, '#2C2F33');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
    }
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 15);
    ctx.lineTo(width - 15, 15);
    ctx.lineTo(width - 15, height - 15);
    ctx.lineTo(15, height - 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    const avatarSize = 128;
    const avatarX = 50;
    const avatarY = 40;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    ctx.fillStyle = '#FFFFFF';
    if (stats.clanId && clans) {
        const clan = Array.from(clans.values()).find(c => c.id === stats.clanId);
        if (clan) {
            ctx.font = 'bold 32px sans-serif';
            const clanTag = `[${clan.tag}]`;
            const nameX = avatarX + avatarSize + 25;
            const nameY = avatarY + 55;
            
            ctx.fillStyle = '#AAAAAA';
            const tagWidth = ctx.measureText(clanTag).width;
            ctx.fillText(clanTag, nameX, nameY);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(member.displayName, nameX + tagWidth + 10, nameY);
        } else {
            ctx.font = 'bold 36px sans-serif';
            ctx.fillText(member.displayName, avatarX + avatarSize + 25, avatarY + 55);
        }
    } else {
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(member.displayName, avatarX + avatarSize + 25, avatarY + 55);
    }

    if(equippedTitleId) {
        const titleItem = rareItems.find(i => i.id === equippedTitleId);
        if (titleItem) {
            ctx.font = 'italic 20px sans-serif';
            ctx.fillStyle = '#FFD700'; // Gold color for the title
            ctx.fillText(t(`item_${titleItem.id}_name`), avatarX + avatarSize + 25, avatarY + 80);
        }
    }

    if (stats.class) {
        const userClass = classes.find(c => c.id === stats.class);
        if (userClass) {
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = userClass.color || '#D2AC47';
            ctx.fillText(`${userClass.icon} ${t(`class_${userClass.id}_name`)}`, avatarX + avatarSize + 25, avatarY + 115);
        }
    }

    const statsY = 220;
    const statsX = 50;
    const col2X = 320;
    const col3X = 570;
    const statsSpacing = 35;
    const valueOffsetX = 180;

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#FFFFFF';

    ctx.fillText(t('level'), statsX, statsY);
    ctx.fillText(String(stats.level || 1), statsX + valueOffsetX, statsY);
    
    ctx.fillText(t('xp'), statsX, statsY + statsSpacing);
    ctx.fillText(`${stats.xp || 0} / 100`, statsX + valueOffsetX, statsY + statsSpacing);
    
    ctx.fillText(t('troup_coins'), statsX, statsY + statsSpacing * 2);
    ctx.fillText(String(stats.coins || 0), statsX + valueOffsetX, statsY + statsSpacing * 2);

    ctx.fillText(t('raids_created'), col2X, statsY);
    ctx.fillText(String(stats.raidsCreated || 0), col2X + valueOffsetX, statsY);

    ctx.fillText(t('raids_helped'), col2X, statsY + statsSpacing);
    ctx.fillText(String(stats.raidsHelped || 0), col2X + valueOffsetX, statsY + statsSpacing);
    
    ctx.fillText(t('reputation'), col2X, statsY + statsSpacing * 2);
    ctx.fillText(`👍 ${stats.reputation || 0}`, col2X + valueOffsetX, statsY + statsSpacing * 2);

    ctx.fillText(t('kicked_others'), col3X, statsY);
    ctx.fillText(String(stats.kickedOthers || 0), col3X + valueOffsetX, statsY);

    ctx.fillText(t('was_kicked'), col3X, statsY + statsSpacing);
    ctx.fillText(String(stats.wasKicked || 0), col3X + valueOffsetX, statsY + statsSpacing);
    
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#B9BBBE';
    const roles = member.roles.cache.filter(r => r.name !== '@everyone' && r.name.toLowerCase() !== 'limpo').map(r => r.name).join(', ');
    wrapText(ctx, `${t('roles')}: ${roles || t('no_roles')}`, 50, height - 60, width - 100, 20);

    return canvas.toBuffer('image/png');
}
