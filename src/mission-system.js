import { missions as missionPool } from './missions.js';
import { generateProfileImage } from './profile-generator.js';
import { AttachmentBuilder } from 'discord.js';

// Função para atribuir missões iniciais a um usuário
export function assignMissions(userId, userMissions) {
    if (!userMissions.has(userId)) {
        // Atribui 3 missões aleatórias que o usuário ainda não tem
        const userHasMission = new Set();
        const missionsToAssign = [];
        
        const shuffledMissions = [...missionPool].sort(() => 0.5 - Math.random());

        for (const mission of shuffledMissions) {
            if (missionsToAssign.length < 3) {
                missionsToAssign.push({
                    id: mission.id,
                    progress: 0,
                    completed: false,
                });
            } else {
                break;
            }
        }
        userMissions.set(userId, missionsToAssign);
        console.log(`Assigned initial missions to ${userId}`);
    }
}

// Função para verificar e atualizar o progresso da missão
export async function checkMissionCompletion(user, missionType, channel, data) {
    const { userMissions, userStats, client, userProfiles, userItems } = data;
    const userId = user.id;

    if (!userMissions.has(userId)) {
        assignMissions(userId, userMissions);
    }

    const activeMissions = userMissions.get(userId);
    if (!activeMissions) return;

    for (const missionProgress of activeMissions) {
        const missionDetails = missionPool.find(m => m.id === missionProgress.id);

        if (missionDetails && missionDetails.type === missionType && !missionProgress.completed) {
            missionProgress.progress += 1;

            if (missionProgress.progress >= missionDetails.goal) {
                missionProgress.completed = true;
                
                // Aplicar recompensa
                const stats = userStats.get(userId) || { level: 1, xp: 0, coins: 0, class: null, raidsCreated: 0, raidsHelped: 0, kickedOthers: 0, wasKicked: 0, reputation: 0, totalRatings: 0 };
                const reward = missionDetails.reward;
                stats.xp += reward.xp;
                stats.coins += reward.coins;
                
                // Verificar level up
                const xpToLevelUp = 100;
                if (stats.xp >= xpToLevelUp) {
                    stats.level += 1;
                    stats.xp -= xpToLevelUp;
                    await channel.send(`🎉 Parabéns, <@${userId}>! Você subiu para o nível ${stats.level} ao completar uma missão!`);
                }
                
                userStats.set(userId, stats);
                
                // Notificar sobre a conclusão da missão
                await channel.send(`🏅 Missão Concluída, <@${userId}>! Você completou "${missionDetails.description}" e ganhou ${reward.xp} XP e ${reward.coins} TC!`);
                
                // Atualizar imagem de perfil
                 const profileInfo = userProfiles.get(userId);
                if (profileInfo) {
                    try {
                        const profileChannel = await client.channels.fetch(profileInfo.channelId);
                        const profileMessage = await profileChannel.messages.fetch(profileInfo.messageId);
                        const guild = profileChannel.guild;
                        const member = await guild.members.fetch(userId);
                        const items = userItems.get(userId) || { inventory: [], equippedBackground: 'default', equippedTitle: null };
                        
                        const newProfileImageBuffer = await generateProfileImage(member, stats, items);
                        const newAttachment = new AttachmentBuilder(newProfileImageBuffer, { name: 'profile-card.png' });
                        
                        await profileMessage.edit({ files: [newAttachment] });
                    } catch (updateError) {
                        console.error(`Falha ao editar a imagem de perfil para ${userId} após completar missão:`, updateError);
                    }
                }
            }
        }
    }
     // Salva o estado atualizado das missões
    userMissions.set(userId, activeMissions);
}
