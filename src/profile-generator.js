import { createCanvas, loadImage } from 'canvas';

// Função para desenhar texto com quebra de linha
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


export async function generateProfileImage(member) {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Fundo Gradiente
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#23272A');
    gradient.addColorStop(1, '#2C2F33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Card de fundo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 20);
    ctx.lineTo(width - 20, 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.lineTo(20, height - 20);
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
    const username = member.displayName;
    ctx.fillText(username, avatarX + avatarSize + 25, avatarY + 50);

    // Roles do usuário
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#B9BBBE';
    const roles = member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => role.name)
        .join(', ');
    wrapText(ctx, `Roles: ${roles || 'Nenhuma'}`, avatarX + avatarSize + 25, avatarY + 90, 450, 22);

    // --- Seção de Estatísticas (com placeholders) ---
    const statsX = 50;
    const statsY = 220;
    const statsSpacing = 40;

    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#FFFFFF';

    // Level & XP
    ctx.fillText('Nível', statsX, statsY);
    ctx.fillText('1', statsX + 150, statsY);

    ctx.fillText('XP', statsX, statsY + statsSpacing);
    ctx.fillText('0 / 100', statsX + 150, statsY + statsSpacing);

    // Raids
    const statsX2 = 400;
    ctx.fillText('Raids Criadas', statsX2, statsY);
    ctx.fillText('0', statsX2 + 200, statsY);

    ctx.fillText('Raids Ajudadas', statsX2, statsY + statsSpacing);
    ctx.fillText('0', statsX2 + 200, statsY + statsSpacing);

    // Reputação
    ctx.fillText('Expulsou', statsX, statsY + statsSpacing * 2.5);
    ctx.fillText('0', statsX + 150, statsY + statsSpacing * 2.5);

    ctx.fillText('Foi Expulso', statsX2, statsY + statsSpacing * 2.5);
    ctx.fillText('0', statsX2 + 200, statsY + statsSpacing * 2.5);

    return canvas.toBuffer('image/png');
}
