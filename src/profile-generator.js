import { createCanvas, loadImage } from 'canvas';
import { classes } from './classes.js';
import { allItems } from './items.js';

function drawStat(ctx, label, value, x, y, valueXOffset) {
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(value, x + valueXOffset, y);
}

export async function generateProfileImage(member, stats, items, clans, t) {
    const width = 800;
    const height = 500; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Helper function for rounded rectangles, now safely inside the scope
    ctx.roundRect = function (x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        this.beginPath();
        this.moveTo(x + r, y);
        this.arcTo(x + w, y, x + w, y + h, r);
        this.arcTo(x + w, y + h, x, y + h, r);
        this.arcTo(x, y + h, x, y, r);
        this.arcTo(x, y, x + w, y, r);
        this.closePath();
        return this;
    }
    
    const equippedCosmetics = items?.equippedCosmetics || {};
    const equippedGear = items?.equippedGear || {};
    
    const backgroundId = equippedCosmetics.fundo;
    const titleId = equippedCosmetics.titulo;
    const borderId = equippedCosmetics.borda_avatar;
    const progressbarId = equippedCosmetics.progressbar;

    const backgroundItem = allItems.find(i => i.id === backgroundId);
    const titleItem = allItems.find(i => i.id === titleId);
    const borderItem = allItems.find(i => i.id === borderId);
    const progressbarItem = allItems.find(i => i.id === progressbarId);
    
    // 1. Background Layer
    if (backgroundItem && backgroundItem.url && backgroundItem.url.startsWith('http')) {
        try {
            const background = await loadImage(backgroundItem.url);
            ctx.drawImage(background, 0, 0, width, height);
        } catch (e) {
            console.error("Failed to load custom background, using default.", e);
            ctx.fillStyle = '#18191C'; ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = '#18191C'; ctx.fillRect(0, 0, width, height);
    }
    
    // 2. Semi-transparent Overlay for Readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.roundRect(20, 20, width - 40, height - 40, 15);
    ctx.fill();

    // 3. Main Header (Avatar, Name, Title, Class)
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    const avatarSize = 128;
    const avatarX = 50;
    const avatarY = 45;
    
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    if (borderItem && borderItem.url) {
        try {
            const border = await loadImage(borderItem.url);
            ctx.drawImage(border, avatarX - 16, avatarY - 16, avatarSize + 32, avatarSize + 32);
        } catch (e) { console.error("Failed to load avatar border.", e); }
    }

    const nameX = avatarX + avatarSize + 20;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    let nameText = member.displayName;
    if (stats.clanId && clans) {
        const clan = Array.from(clans.values()).find(c => c.id === stats.clanId);
        if (clan) {
            nameText = `[${clan.tag}] ${member.displayName}`;
        }
    }
    ctx.fillText(nameText, nameX, avatarY + 45);

    if (titleItem) {
        ctx.font = 'italic 24px sans-serif';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(t(`item_${titleItem.id}_name`) || titleItem.name, nameX, avatarY + 80);
    }

    if (stats.class) {
        const userClass = classes.find(c => c.id === stats.class);
        if (userClass) {
            ctx.font = 'bold 26px sans-serif';
            ctx.fillStyle = userClass.color || '#D2AC47';
            ctx.fillText(`${userClass.icon} ${t(`class_${userClass.id}_name`)}`, nameX, avatarY + 115);
        }
    }

    // 4. XP Bar
    const xpY = 200;
    const barHeight = 25;
    const barWidth = width - 100;
    const barX = 50;
    const xpToLevelUp = 100 * (stats.level || 1);
    const xpPercent = Math.min((stats.xp || 0) / xpToLevelUp, 1);
    
    ctx.fillStyle = '#2C2F33'; // Bar background
    ctx.roundRect(barX, xpY, barWidth, barHeight, 12);
    ctx.fill();

    if (xpPercent > 0) {
        if (progressbarItem?.rarity === 'Kardec') {
            const gradient = ctx.createLinearGradient(barX, 0, barX + (barWidth * xpPercent), 0);
            gradient.addColorStop(0, '#ff00ff'); // Hot pink
            gradient.addColorStop(1, '#4b0082'); // Indigo/dark purple
            ctx.fillStyle = gradient;
        } else if (progressbarItem?.url && progressbarItem.url.includes('#')) {
             ctx.fillStyle = progressbarItem.url; // Use color hex from URL if present
        } else {
             ctx.fillStyle = '#39FF14'; // Default Green
        }
        ctx.roundRect(barX, xpY, barWidth * xpPercent, barHeight, 12);
        ctx.fill();
    }
    
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    const xpText = `LVL ${stats.level || 1} | ${stats.xp || 0} / ${xpToLevelUp} XP`;
    const textMetrics = ctx.measureText(xpText);
    ctx.fillText(xpText, barX + (barWidth / 2) - (textMetrics.width / 2), xpY + 18);


    // 5. Stats Grid
    const statsY = 280;
    const statsXCol1 = 50;
    const statsXCol2 = 300;
    const statsXCol3 = 550;
    const statsSpacing = 45;
    const valueOffset = 180;
    
    let totalXPBonus = 0;
    if (equippedGear) {
        for (const gearId of Object.values(equippedGear)) {
            const gearItem = allItems.find(i => i.id === gearId);
            if (gearItem && gearItem.bonus) {
                totalXPBonus += gearItem.bonus;
            }
        }
    }

    drawStat(ctx, t('troup_coins'), String(stats.coins || 0), statsXCol1, statsY, valueOffset);
    drawStat(ctx, t('raids_created'), String(stats.raidsCreated || 0), statsXCol2, statsY, valueOffset);
    drawStat(ctx, t('kicked_others'), String(stats.kickedOthers || 0), statsXCol3, statsY, valueOffset);

    drawStat(ctx, t('reputation'), `👍 ${stats.reputation || 0}`, statsXCol1, statsY + statsSpacing, valueOffset);
    drawStat(ctx, t('raids_helped'), String(stats.raidsHelped || 0), statsXCol2, statsY + statsSpacing, valueOffset);
    drawStat(ctx, t('was_kicked'), String(stats.wasKicked || 0), statsXCol3, statsY + statsSpacing, valueOffset);
    
    ctx.fillStyle = '#39FF14'; // Special color for bonus
    ctx.fillText(t('xp_bonus'), statsXCol1, statsY + statsSpacing * 2);
    ctx.fillText(`+${totalXPBonus.toFixed(2)}%`, statsXCol1 + valueOffset, statsY + statsSpacing * 2);

    // 6. Roles
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#B9BBBE';
    const roles = member.roles.cache
        .filter(r => r.name !== '@everyone' && r.name !== 'Br' && r.name !== 'En')
        .map(r => r.name)
        .slice(0, 10) // Limit roles displayed
        .join(', ');
        
    const rolesText = `${t('roles')}: ${roles || t('no_roles')}`;
    ctx.fillText(rolesText, 50, height - 35, width - 100);

    return canvas.toBuffer('image/png');
}
