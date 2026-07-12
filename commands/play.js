const yts = require('yt-search');
const axios = require('axios');
const { createFakeContact } = require('../lib/fakeContact');

async function playCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        const fakekontak = createFakeContact(message);

        if (!searchQuery) {
            return await sock.sendMessage(chatId, {
                text: '_❌ Nikeza song name._\n_Example: *.play Holyten murder*_'
            }, { quoted: fakekontak });
        }

        await sock.sendMessage(chatId, {
            react: { text: '💝', key: message.key }
        });

        // Use Drex API directly (no need for yts search anymore)
        const apiUrl = `https://api.drexapp.space/downloader/ytplay?q=${encodeURIComponent(searchQuery)}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });
        const data = response.data;

        if (!data?.status || !data?.result?.download_url) {
            await sock.sendMessage(chatId, {
                react: { text: '❎', key: message.key }
            });
            return await sock.sendMessage(chatId, {
                text: '_❌ Ingoma ayitholakalanga noma ukulanda kwehlulekile. Zama igama elihlukile._'
            }, { quoted: fakekontak });
        }

        const title = data.result.title;
        const duration = data.result.duration || '?';
        const audioUrl = data.result.download_url;

        await sock.sendMessage(chatId, {
            text: `_🎶Downloading:_\n_${title}_`
        }, { quoted: fakekontak });

        // Download the audio
        const audioResponse = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
        });
        const audioBuffer = Buffer.from(audioResponse.data);

        // Send as audio
        await sock.sendMessage(chatId, {
            audio:    audioBuffer,
            mimetype: 'audio/mp4',
            ptt:      false,
            fileName: `${title}.mp3`,
            caption: `🎵 *${title}*`
        }, { quoted: fakekontak });

        // Success reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

    } catch (error) {
        console.error('Error in playCommand:', error.message);
        await sock.sendMessage(chatId, {
            text: '_❌ Ukulanda kuhlulekile. Sicela uzame futhi kamuva._'
        }, { quoted: createFakeContact(message) });
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        });
    }
}

module.exports = playCommand;