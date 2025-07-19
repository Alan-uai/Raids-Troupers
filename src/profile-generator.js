import { createCanvas, loadImage } from 'canvas';

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

export async function generateProfileImage(member, stats, equippedBackground = 'default') {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fundo (Padrão ou Personalizado)
    if (equippedBackground !== 'default' && equippedBackground.startsWith('http')) {
        try {
            const background = await loadImage(equippedBackground);
            ctx.drawImage(background, 0, 0, width, height);
        } catch (e) {
            console.error("Falha ao carregar background personalizado, usando padrão.", e);
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
    
    // Card de fundo translúcido para melhor legibilidade
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
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

    // Avatar
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);
    const avatarSize = 128;
    const avatarX = 50;
    const avatarY = 50;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Nome de usuário
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText(member.displayName, avatarX + avatarSize + 25, avatarY + 50);

    // Roles do usuário
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#B9BBBE';
    const roles = member.roles.cache.filter(r => r.name !== '@everyone').map(r => r.name).join(', ');
    wrapText(ctx, `Roles: ${roles || 'Nenhuma'}`, avatarX + avatarSize + 25, avatarY + 85, 450, 20);

    // --- Seção de Estatísticas ---
    const statsX = 50;
    const statsY = 220;
    const statsSpacing = 35;
    const col2X = 320;
    const col3X = 570;

    ctx.font = 'bold 20px sans-serif';
    ctx.fillStyle = '#FFFFFF';

    // Coluna 1
    ctx.fillText('Nível', statsX, statsY);
    ctx.fillText(String(stats.level || 1), statsX + 150, statsY);

    ctx.fillText('XP', statsX, statsY + statsSpacing);
    ctx.fillText(`${stats.xp || 0} / 100`, statsX + 150, statsY + statsSpacing);
    
    ctx.fillText('Moedas (TC)', statsX, statsY + statsSpacing * 2);
    ctx.fillText(String(stats.coins || 0), statsX + 150, statsY + statsSpacing * 2);


    // Coluna 2
    ctx.fillText('Raids Criadas', col2X, statsY);
    ctx.fillText(String(stats.raidsCreated || 0), col2X + 180, statsY);

    ctx.fillText('Raids Ajudadas', col2X, statsY + statsSpacing);
    ctx.fillText(String(stats.raidsHelped || 0), col2X + 180, statsY + statsSpacing);

    // Coluna 3
    ctx.fillText('Expulsou', col3X, statsY);
    ctx.fillText(String(stats.kickedOthers || 0), col3X + 150, statsY);

    ctx.fillText('Foi Expulso', col3X, statsY + statsSpacing);
    ctx.fillText(String(stats.wasKicked || 0), col3X + 150, statsY + statsSpacing);

    return canvas.toBuffer('image/png');
}
