import { db, users } from '@hss/database';
import { DiscordUser } from './discord.js';

export async function upsertUser(discordUser: DiscordUser) {
    const avatarUrl = discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

    const [user] = await db.insert(users).values({
        discordId: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        avatarUrl,
    }).onConflictDoUpdate({
        target: users.discordId,
        set: {
            username: discordUser.username,
            email: discordUser.email,
            avatarUrl,
            updatedAt: new Date(),
        }
    }).returning();

    return user;
}
