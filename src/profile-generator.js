import { createCanvas, loadImage } from 'canvas';
import { classes } from './classes.js';
import { allItems } from './items.js';

const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, currentY);
    return currentY; // Retorna a última posição Y usada
};

export async function generateProfileImage(member, stats, items, clans, t) {
    const width = 800;
    const height = 500; 
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const equippedBackground = items?.equippedBackground || 'default';
    const equippedTitleId = items?.equippedTitle;
    const equippedBorderUrl = items?.equippedBorder;

    // Fundo
    if (equippedBackground !== 'default' && equippedBackground.startsWith('http')) {
        try {
            const background = await loadImage(equippedBackground);
            ctx.drawImage(background, 0, 0, width, height);
        } catch (e) {
            console.error("Failed to load custom background, using default.", e);
            ctx.fillStyle = '#2C2F33';
            ctx.fillRect(0, 0, width, height);
        }
    } else {
        ctx.fillStyle = '#2C2F33';
        ctx.fillRect(0, 0, width, height);
    }
    
    // Overlay semi-transparente para legibilidade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(15, 15, width - 30, height - 30);
    
    // Avatar e Borda
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

    // Carrega e desenha a borda se equipada
    if (equippedBorderUrl) {
        try {
            const border = await loadImage(equippedBorderUrl);
            ctx.drawImage(border, avatarX - 16, avatarY - 16, avatarSize + 32, avatarSize + 32); // Ajuste o posicionamento e tamanho conforme necessário
        } catch (e) {
            console.error("Failed to load avatar border.", e);
        }
    }


    // Nome de usuário e Tag do Clã
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

    // Título
    if(equippedTitleId) {
        const titleItem = allItems.find(i => i.id === equippedTitleId);
        if (titleItem) {
            ctx.font = 'italic 20px sans-serif';
            ctx.fillStyle = '#FFD700'; // Gold color for the title
            ctx.fillText(t(`item_${titleItem.id}_name`), avatarX + avatarSize + 25, avatarY + 80);
        }
    }

    // Classe
    if (stats.class) {
        const userClass = classes.find(c => c.id === stats.class);
        if (userClass) {
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = userClass.color || '#D2AC47';
            ctx.fillText(`${userClass.icon} ${t(`class_${userClass.id}_name`)}`, avatarX + avatarSize + 25, avatarY + 115);
        }
    }

    // Estatísticas
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
    
    const xpToLevelUp = 100 * (stats.level || 1);
    ctx.fillText(t('xp'), statsX, statsY + statsSpacing);
    ctx.fillText(`${stats.xp || 0} / ${xpToLevelUp}`, statsX + valueOffsetX, statsY + statsSpacing);
    
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
    
    // Cargos
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#B9BBBE';
    const roles = member.roles.cache
        .filter(r => r.name !== '@everyone' && r.name !== 'limpo') // Adicionado filtro para 'limpo'
        .map(r => r.name)
        .join(', ');
        
    const rolesText = `${t('roles')}: ${roles || t('no_roles')}`;
    wrapText(ctx, rolesText, 50, height - 80, width - 100, 20);


    return canvas.toBuffer('image/png');
}
