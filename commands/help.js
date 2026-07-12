/**
 * help.js - Enhanced version with menuMode support
 * Modes: not_forwarded | forwarded | buttons | numbers
 */
const settings = require('../settings');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { getMenuStyle, getMenuSettings } = require('./menuSettings');
const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');
const { getPrefix } = require('./setprefix');
const { getOwnerName } = require('./setowner');
const { getBotName } = require('../lib/botConfig');
const { createFakeContact } = require('../lib/fakeContact');

const more      = String.fromCharCode(8206);
const readmore  = more.repeat(4001);

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatTime(seconds) {
    const days    = Math.floor(seconds / 86400); seconds %= 86400;
    const hours   = Math.floor(seconds / 3600);  seconds %= 3600;
    const minutes = Math.floor(seconds / 60);    seconds  = Math.floor(seconds % 60);
    let t = '';
    if (days)    t += `${days}d `;
    if (hours)   t += `${hours}h `;
    if (minutes) t += `${minutes}m `;
    if (seconds || !t) t += `${seconds}s`;
    return t.trim();
}

const detectPlatform = () => {
    if (process.env.DYNO)   return '☁️Heroku';
    if (process.env.RENDER) return '🛸Render';
    if (process.env.PORTS && process.env.CYPHERX_HOST_ID) return '🌀CypherX Platform';
    if (process.env.P_SERVER_UUID) return '🖥️Panel';
    if (process.env.LXC)    return 'Linux Container (LXC)';
    switch (os.platform()) {
        case 'win32':  return 'Windows';
        case 'darwin': return 'macOS';
        case 'linux':  return 'Linux';
        default:       return 'Unknown';
    }
};

const formatMemory = (m) =>
    m < 1073741824
        ? Math.round(m / 1048576) + ' MB'
        : Math.round(m / 1073741824) + ' GB';

const progressBar = (used, total, size = 10) => {
    const pct = Math.round((used / total) * size);
    return `${'█'.repeat(pct)}${'░'.repeat(size - pct)} ${Math.round((used / total) * 100)}%`;
};

// ─── Command categories ───────────────────────────────────────────────────────

const COMMAND_CATEGORIES = {
    'OWNER MENU': [
        'mode', 'autostatus', 'antidelete', 'autoread', 'autotyping',
        'autoreact', 'areact', 'autoreaction', 'autofont', 'autorecording',
        'autoboth', 'pmblocker', 'setpp', 'setbio', 'clearsession', 'cleartmp',
        'sudo', 'setprefix', 'setowner', 'setbotname', 'setmenu', 'restart',
        'menuimage', 'configimage', 'settings', 'update', 'paircode',
        'anticall', 'antibot', 'antileft', 'antiedit', 'antistatusmention',
        'alwaysonline', 'online', 'disp', 'readreciepts', 'settimezone',
        'menumode', 'setforwarded', 'getprefix',
        'broadcast', 'listgroups', 'close', 'open', 'getvcf', 'autosavestatus', 'stickercmd', 'setstickercmd'
    ],
    'AI MENU': [
        'ai', 'gpt', 'gemini', 'copilot', 'deepseek', 'meta', 'metai',
        'vision', 'analyse', 'ilama', 'wormgpt', 'birdai', 'blackbox',
        'perplexity', 'mistral', 'grok', 'speechwrite',
        'imagine', 'flux', 'dalle', 'sora', 'magicstudio', 'remini', 'gptedit'
    ],
    'GROUP ADMIN': [
        'promote', 'demote', 'kick', 'mute', 'unmute', 'ban', 'unban',
        'warn', 'warnings', 'add', 'approve', 'join', 'killall',
        'antilink', 'antibadword', 'antitag', 'antisticker', 'antidemote',
        'antiimage', 'antimention', 'antipromote', 'welcome', 'goodbye',
        'setgroupdesc', 'setgname', 'setgpp',
        'resetlink', 'link', 'revoke'
    ],
    'GROUP TOOLS': [
        'tagall', 'tag', 'hidetag', 'tagnoadmin', 'tagnotadmin', 'mention',
        'groupinfo', 'infogroup', 'admins', 'listadmin', 'listonline',
        'topmembers', 'leave', 'pair', 'chatbot', 'clear', 'delete',
        'getpp', 'lastseen', 'drop', 'getgcprofile', 'getgcname',
        'staff', 'creategroup', 'tagallremote', 'pending'
    ],
    'DOWNLOADER': [
        'play', 'song', 'video', 'ytplay', 'ytv', 'ytaudio', 'ytvideo',
        'playlist', 'addtoplaylist', 'myplaylist', 'playlistplay',
        'repeat', 'shuffle', 'playlistremove', 'playlistclear',
        'ytdocplay', 'ytdocvideo', 'spotify',
        'instagram', 'facebook', 'tiktok', 'xvideo',
        'mediafire', 'mf', 'apk', 'gitclone',
        'lyrics', 'whatsong', 'pinterest', 'terabox'
    ],
    'SEARCHING TOOLS': [
        'yts', 'ytsearch', 'img', 'image', 'movie', 'shazam',
        'fetch', 'ss', 'trt', 'transcribe', 'translate',
        'locate', 'location', 'url', 'tourl', 'vcf',
        'ping', 'runtime', 'uptime', 'alive', 'vv', 'vv2',
        'block', 'unblock', 'allblocklist',
        'enc', 'viewonce', 'weather', 'news', 'inspect',
        'botinfo', 'time', 'date', 'chanelid', 'gif'
    ],
    'STICKER MENU': [
        'sticker', 'stickercrop', 'tgsticker', 'take', 'attp', 'emojimix',
        'meme', 'smeme', 'blur', 'removebg', 'nobg', 'crop', 'simage', 'toimage'
    ],
    'CONVERTER': [
        'totext', 'toimage', 'toaudio', 'tomp3', 'toppt', 'tourl',
        'tovoicenote', 'trim', 'tts'
    ],
    'GAME MENU': [
        'tictactoe', 'connect4', 'hangman', 'trivia', 'answer',
        'truth', 'dare', '8ball', 'cf', 'scramble', 'bet'
    ],
    'FUN & SOCIAL': [
        'compliment', 'insult', 'flirt', 'shayari', 'goodnight', 'gn',
        'roseday', 'lovenight', 'character', 'rate', 'ship', 'simp', 'wasted', 'stupid',
        'joke', 'quote', 'fact', 'oogway', 'pies', 'say'
    ],
    'ANIME MENU': [
        'neko', 'waifu', 'loli', 'nom', 'poke', 'cry',
        'kiss', 'pat', 'hug', 'wink', 'facepalm', 'anime', 'animu'
    ],
    'TEXT MAKER': [
        'metallic', 'ice', 'snow', 'impressive', 'matrix', 'light',
        'neon', 'devil', 'purple', 'thunder', 'leaves', '1917',
        'arena', 'hacker', 'sand', 'blackpink', 'glitch', 'fire'
    ],
    'IMG EDIT': [
        'heart', 'horny', 'circle', 'lgbt', 'lolice',
        'namecard', 'tweet', 'ytcomment', 'comrade',
        'gay', 'glass', 'jail', 'passed', 'triggered'
    ],
    'STATUS MENU': [
        'tostatus', 'savestatus', 'togroupstatus'
    ],
    'SPORTS MENU': [
        'livescore', 'bettips', 'fnews',
        'player', 'team', 'venue', 'gameevents',
        'epl', 'laliga', 'ucl', 'bundesliga',
        'seriea', 'euros', 'fifa'
    ],
    'GITHUB': [
        'git', 'github', 'sc', 'script', 'repo', 'clone'
    ]
};

// ─── Thumbnail loader ─────────────────────────────────────────────────────────

async function loadThumbnail(thumbnailPath) {
    try {
        if (thumbnailPath && (thumbnailPath.startsWith('http://') || thumbnailPath.startsWith('https://'))) {
            try {
                const fetch = require('node-fetch');
                const res = await fetch(thumbnailPath);
                if (res.ok) return Buffer.from(await res.arrayBuffer());
            } catch (_) {}
        }
        if (thumbnailPath && fs.existsSync(thumbnailPath)) {
            return fs.readFileSync(thumbnailPath);
        }
    } catch (_) {}
    // 1×1 transparent fallback
    return Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64'
    );
}

// ─── Header (shared by all modes) ────────────────────────────────────────────

function generateMenuHeader(pushname, currentMode, hostName, ping, uptimeFormatted) {
    const mem       = process.memoryUsage();
    const totalMem  = os.totalmem();
    const sysUsed   = totalMem - os.freemem();
    const prefix2   = getPrefix();
    const bot       = getBotName();
    const ownerName = getOwnerName();
    const ms        = getMenuSettings();

    let h = `‎┏━━❐✧ ${bot} ✧❐\n`;
    h += `┃✦ *Prefix:* [${prefix2}]\n`;
    h += `┃✦ *Owner:* ${ownerName}\n`;
    h += `┃✦ *Mode:* ${currentMode}\n`;
    h += `┃✦ *Platform:* ${hostName}\n`;
    h += `┃✦ *Speed:* ${ping} ms\n`;
    if (ms.showUptime)  h += `┃✦ *Uptime:* ${uptimeFormatted}\n`;
    h += `┃✦ *Version:* v${settings.version}\n`;
    if (ms.showMemory) {
        h += `┃✦ *Usage:* ${formatMemory(mem.heapUsed)} of ${formatMemory(totalMem)}\n`;
        h += `┃✦ *RAM:* [${progressBar(sysUsed, totalMem)}]\n`;
    }
    h += `┗━━❐`;
    return h;
}

// ─── Full menu text (not_forwarded default) ───────────────────────────────────

function generateMenu(pushname, currentMode, hostName, ping, uptimeFormatted) {
    let menu = generateMenuHeader(pushname, currentMode, hostName, ping, uptimeFormatted);
    menu += `\n${readmore}\n`;

    let idx = 0;
    for (const [category, cmds] of Object.entries(COMMAND_CATEGORIES)) {
        // Title case: first letter uppercase, rest lowercase, bold
        const catTitle = '*' + category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() + '*';
        menu += `‎┏━━❐✧ ${catTitle} ✧❐\n`;
        for (const cmd of cmds) menu += `┃◆ ${cmd}\n`;
        menu += `┗━━❐\n`;
        idx++;
        menu += idx % 3 === 0 ? `${readmore}\n` : `\n`;
    }
    menu += `_✧ Powered By Joshuamambo1 Tech_\n`;
    return menu;
}

// ─── Style sender (used by not_forwarded + forwarded) ─────────────────────────

async function sendWithStyle(sock, chatId, message, menulist, menuStyle, thumbnailBuffer, pushname, extraContext = {}) {
    const botname = getBotName();
    const plink   = 'https://github.com/Joshuamambo1';
    const fake    = createFakeContact(message);

    const adReply = {
        showAdAttribution:    false,
        title:                '',
        body:                 '',
        thumbnail:            thumbnailBuffer,
        sourceUrl:            plink,
        mediaType:            1,
        renderLargerThumbnail: true
    };

    switch (menuStyle) {
        case '1':
            await sock.sendMessage(chatId, {
                document: { url: 'https://i.ibb.co/2W0H9Jq/avatar-contact.png' },
                caption:  menulist,
                mimetype: 'application/zip',
                fileName: botname,
                fileLength: '9999999',
                contextInfo: { externalAdReply: adReply, ...extraContext }
            }, { quoted: fake });
            break;

        case '2':
            await sock.sendMessage(chatId, {
                text: menulist,
                contextInfo: Object.keys(extraContext).length ? extraContext : undefined
            }, { quoted: fake });
            break;

        case '3':
            await sock.sendMessage(chatId, {
                text: menulist,
                contextInfo: {
                    externalAdReply: { ...adReply, title: botname, body: pushname },
                    ...extraContext
                }
            }, { quoted: fake });
            break;

        case '4':
            await sock.sendMessage(chatId, {
                image:   thumbnailBuffer,
                caption: menulist,
                contextInfo: Object.keys(extraContext).length ? extraContext : undefined
            }, { quoted: fake });
            break;

        case '5': {
            const msg = generateWAMessageFromContent(chatId, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body:   { text: null },
                            footer: { text: menulist },
                            nativeFlowMessage: { buttons: [{ text: null }] }
                        }
                    }
                }
            }, { quoted: fake });
            await sock.relayMessage(chatId, msg.message, { messageId: msg.key.id });
            break;
        }

        case '6':
            await sock.relayMessage(chatId, {
                requestPaymentMessage: {
                    currencyCodeIso4217: 'USD',
                    requestFrom:         '0@s.whatsapp.net',
                    amount1000:          '1',
                    noteMessage: {
                        extendedTextMessage: {
                            text: menulist,
                            contextInfo: {
                                mentionedJid: [message.key.participant || message.key.remoteJid],
                                externalAdReply: { showAdAttribution: false },
                                ...extraContext
                            }
                        }
                    }
                }
            }, {});
            break;

        default:
            await sock.sendMessage(chatId, { text: menulist }, { quoted: fake });
    }
}

// ─── MODE: FORWARDED ──────────────────────────────────────────────────────────

async function sendForwardedMenu(sock, chatId, message, menulist, thumbnailBuffer, pushname, channelName, menuStyle) {
    const forwardedContext = {
        isForwarded:       true,
        forwardingScore:   999,
        forwardedNewsletterMessageInfo: {
            newsletterJid:     '120363350273786239@newsletter',
            newsletterName:    channelName || '[ʟɪɢʜᴛ ᴅᴇsᴋ ᴛᴇᴀᴍ ]',
            serverMessageId:   Math.floor(Math.random() * 100000)
        }
    };
    await sendWithStyle(sock, chatId, message, menulist, menuStyle, thumbnailBuffer, pushname, forwardedContext);
}

// ─── MODE: BUTTONS ────────────────────────────────────────────────────────────




// ─── Main helpCommand ─────────────────────────────────────────────────────────

// ─── MODE: NUMBERS ────────────────────────────────────────────────────────────

async function sendNumbersMenu(sock, chatId, message, headerText, thumbnailBuffer, menuStyle) {
    const botname    = getBotName();
    const categories = Object.keys(COMMAND_CATEGORIES);
    const fake       = createFakeContact(message);
    const plink      = 'https://github.com/Joshuamambo1';

    let numberedList = headerText + '\n\n';
    numberedList += `‎┏━━❐✧ *Categories* ✧❐\n`;
    categories.forEach((cat, i) => {
        const catTitle = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
        numberedList += `┃${i + 1}. *${catTitle}*\n`;
    });
    numberedList += `┗━━❐\n`;
    numberedList += `_Reply with 1–${categories.length}_`;

    if (menuStyle === '4') {
        await sock.sendMessage(chatId, {
            image:   thumbnailBuffer,
            caption: numberedList
        }, { quoted: fake });
    } else if (menuStyle === '3') {
        await sock.sendMessage(chatId, {
            text: numberedList,
            contextInfo: {
                externalAdReply: {
                    showAdAttribution:     false,
                    title:                 botname,
                    body:                  'Select a category',
                    thumbnail:             thumbnailBuffer,
                    sourceUrl:             plink,
                    mediaType:             1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: fake });
    } else {
        await sock.sendMessage(chatId, { text: numberedList }, { quoted: fake });
    }
}

// Handler when user replies with a number
async function handleNumberResponse(sock, chatId, message, number) {
    const categories = Object.keys(COMMAND_CATEGORIES);
    const idx        = parseInt(number) - 1;

    if (isNaN(idx) || idx < 0 || idx >= categories.length) {
        await sock.sendMessage(chatId, {
            text: `❌ Invalid number. Please reply with 1–${categories.length}`
        }, { quoted: createFakeContact(message) });
        return;
    }

    const category = categories[idx];
    const cmds     = COMMAND_CATEGORIES[category];
    const prefix   = getPrefix();
    const catTitle = '*' + category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() + '*';

    let text = `‎┏━━❐✧ ${catTitle} ✧❐\n`;
    text += `┃✦ *${cmds.length} commands*\n`;
    text += `┃\n`;
    for (const cmd of cmds) text += `┃◆ ${prefix}${cmd}\n`;
    text += `┗━━❐`;

    await sock.sendMessage(chatId, { text }, { quoted: createFakeContact(message) });
}

// ─────────────────────────────────────────────────────────────────────────────
async function helpCommand(sock, chatId, message) {
    const pushname      = message.pushName || 'User';
    const menuSettings  = getMenuSettings();
    const menuMode      = menuSettings.menuMode  || 'not_forwarded';
    const menuStyle     = menuSettings.menuStyle || '2';

    // Measure ping
    const start = Date.now();
    await sock.sendMessage(chatId, { text: 'Loading menu...♻️' }, { quoted: createFakeContact(message) });
    const ping = Math.round((Date.now() - start) / 2);

    await sock.sendMessage(chatId, { react: { text: '☠️', key: message.key } });

    const uptimeFormatted = formatTime(process.uptime());

    // Bot mode
    let botModeData = { mode: 'public', isPublic: true };
    try {
        botModeData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/messageCount.json'), 'utf8'));
    } catch (_) {}
    const modeMap   = { public: 'Public', private: 'Private', group: 'Group', pm: 'PM' };
    const rawMode   = (botModeData.mode || (botModeData.isPublic ? 'public' : 'private')).toLowerCase();
    const currentMode = modeMap[rawMode] || rawMode.charAt(0).toUpperCase() + rawMode.slice(1);
    const hostName  = detectPlatform();

    // Thumbnail
    const { getMenuImage } = require('../lib/botConfig');
    const customImg = getMenuImage();
    let thumbPath;
    if (customImg) {
        thumbPath = customImg;
    } else {
        const files = ['menu1.jpg','menu2.jpg','menu3.jpg','menu4.jpg','menu5.jpg'];
        thumbPath = path.join(__dirname, '../assets', files[Math.floor(Math.random() * files.length)]);
    }
    const thumbnailBuffer = await loadThumbnail(thumbPath);
    const headerText      = generateMenuHeader(pushname, currentMode, hostName, ping, uptimeFormatted);

    try {
        // ── NOT FORWARDED ──────────────────────────────────────────────────
        if (menuMode === 'not_forwarded') {
            const menulist = generateMenu(pushname, currentMode, hostName, ping, uptimeFormatted);
            await sendWithStyle(sock, chatId, message, menulist, menuStyle, thumbnailBuffer, pushname);

        // ── FORWARDED ──────────────────────────────────────────────────────
        } else if (menuMode === 'forwarded') {
            const channelName = menuSettings.forwardedChannel || 'MidKing Tech';
            const menulist    = generateMenu(pushname, currentMode, hostName, ping, uptimeFormatted);
            await sendForwardedMenu(sock, chatId, message, menulist, thumbnailBuffer, pushname, channelName, menuStyle);

        // ── NUMBERS ────────────────────────────────────────────────────────
        } else if (menuMode === 'numbers') {
            await sendNumbersMenu(sock, chatId, message, headerText, thumbnailBuffer, menuStyle);

        } else {
            // Fallback
            const menulist = generateMenu(pushname, currentMode, hostName, ping, uptimeFormatted);
            await sendWithStyle(sock, chatId, message, menulist, menuStyle, thumbnailBuffer, pushname);
        }

    } catch (error) {
        console.error('Error in help command:', error);
        try {
            const menulist = generateMenu(pushname, currentMode, hostName, ping, uptimeFormatted);
            await sock.sendMessage(chatId, { text: menulist }, { quoted: createFakeContact(message) });
        } catch (_) {}
    }
}

module.exports = {
    helpCommand,
    handleNumberResponse,
    COMMAND_CATEGORIES
};