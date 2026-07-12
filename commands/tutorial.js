const settings = require("../settings");
const os = require("os");
const path = require("path");
const fs = require("fs");

// Uptime formatter
function runtime(seconds) {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${d}d ${h}h ${m}m ${s}s`;
}

async function tutorialCommand(sock, chatId, message) {
    try {
        // ❤️ Reaction when command triggered
        await sock.sendMessage(chatId, {
            react: {
                text: "📸",
                key: message.key
            }
        });

        const userName = message.pushName || "User";
        const botUptime = runtime(process.uptime());
        const totalMemory = (os.totalmem() / (1024 * 1024 * 1024)).toFixed(2);
        const usedMemory = (process.memoryUsage().heapUsed / (1024 * 1024)).toFixed(2);
        const host = os.platform();

        const uptimeMessage =
            `👋 \`Hello ${userName}, here is the tutorial videos\` \n\n` +
            `*This ${settings.botName || "> *𝗦𝗶𝗹𝗲𝗻𝘁 𝗟𝗗𝗧"} Whatsapp Bot tutorials. This bot is easy to deploy*\n\n` +
            `*katabump video:* https://youtu.be/G7Fhg4SNTKw?si=F6o2WQckQDftgM8q\n` +
            `*cypherXHost video:* https://youtu.be/ilaDlfd39n0?si=63XKx8q4RHULXQBF\n` +
            `*bothosting video:* ~comming soon~\n` +
            `*heroku video:* https://youtu.be/3wNH2plt2eI?si=f-l9fQBLktMwKHgf\n` +
            `*${settings.botName || "LIGHT DESK TEAM DEY GUIDE"} Online*\n\n` +
            `*Follow the 𝗟𝗜𝗚𝗛𝗧 𝗗𝗘𝗦𝗞 𝗧𝗘𝗔𝗠 𝗱𝗲𝘆 𝗴𝘂𝗶𝗱𝗲 channel on WhatsApp: https://whatsapp.com/channel/0029VaxN1oa0gcfDa761Mj3q\n\n` +
            `> Powered by ${settings.ownerName || "𝗠𝗶𝗱𝗞𝗶𝗻𝗴"}`;

        // Resolve the local image path
        const imagePath = path.resolve(__dirname, "../assets/silentlightdeskteam.jpg");

        // Send local image
        await sock.sendMessage(chatId, {
            image: fs.readFileSync(imagePath),
            caption: uptimeMessage
        }, { quoted: message });

    } catch (error) {
        console.error("Error in alive command:", error);

        // Send fallback text
        await sock.sendMessage(chatId, {
            text: `❌ An error occurred, but here's the info:\n\n${uptimeMessage}`
        }, { quoted: message });

        await sock.sendMessage(chatId, {
            react: { text: "⚠️", key: message.key }
        });
    }
}

module.exports = tutorialCommand;
