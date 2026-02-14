const EleventyFetch = require("@11ty/eleventy-fetch");

module.exports = async function () {
    const GUILD_ID = process.env.DISCORD_GUILD_ID;
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

    // Return fallback if no credentials
    if (!GUILD_ID || !BOT_TOKEN) {
        console.log("Discord: No credentials, using fallback data");
        return {
            members: "3000+",
            online: "150+",
            available: false
        };
    }

    try {
        const data = await EleventyFetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`,
            {
                duration: "1h", // Cache for 1 hour
                type: "json",
                fetchOptions: {
                    headers: {
                        Authorization: `Bot ${BOT_TOKEN}`
                    }
                }
            }
        );

        return {
            members: data.approximate_member_count || "3000+",
            online: data.approximate_presence_count || "150+",
            name: data.name,
            available: true
        };
    } catch (error) {
        console.error("Discord API error:", error.message);
        return {
            members: "3000+",
            online: "150+",
            available: false
        };
    }
};
