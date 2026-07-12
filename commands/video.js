const yts = require('yt-search');
const axios = require('axios');
const { createFakeContact } = require('../lib/fakeContact');

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        const searchQuery = text.split(' ').slice(1).join(' ').trim();
        const fakekontak = createFakeContact(message);
        
        if (!searchQuery) {
            return await sock.sendMessage(chatId, { 
                text: "🎬❌ What video do you want to download?\n\n🔍 *Examples:*\n• .video Imagine Dragons Believer.."
            }, { quoted: fakekontak });
        }

        // Initial reaction
        await sock.sendMessage(chatId, {
            react: { text: '☠️', key: message.key }
        });

        let videoUrl = '';
        let title = '';
        
        // Check if input is a YouTube URL
        const isUrl = searchQuery.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
        
        if (isUrl) {
            videoUrl = searchQuery;
            // Extract video ID and get info
            const videoId = isUrl[1];
            const search = await yts({ videoId: videoId });
            if (search?.videos?.[0]) {
                title = search.videos[0].title;
            } else {
                title = 'YouTube Video';
            }
        } else {
            // Search for the video
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { 
                    text: "❌ Awekho amavidiyo atholakele! Zama igama lokusesha elihlukile."
                }, { quoted: fakekontak });
                await sock.sendMessage(chatId, {
                    react: { text: '❌', key: message.key }
                });
                return;
            }
            // Get the first video result
            const video = videos[0];
            videoUrl = video.url;
            title = video.title;
        }

        // Notify user about download
        await sock.sendMessage(chatId, { 
            text: `📥 *Downloading...*\n\n🎬 *${title}*\n\n⏳ fetching video...`
        }, { quoted: fakekontak });

        // Fetch video data from WORKING EliteProTech API
        const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(videoUrl)}&format=mp4`;
        const response = await axios.get(apiUrl, { timeout: 60000 });
        const data = response.data;

        if (!data || !data.success || !data.downloadURL) {
            throw new Error('API returned no download URL');
        }

        const videoDownloadUrl = data.downloadURL;
        const videoTitle = data.title || title;

        // Success reaction
        await sock.sendMessage(chatId, {
            react: { text: '✅', key: message.key }
        });

        // Send as video (playable in chat)
        await sock.sendMessage(chatId, {
            video: { url: videoDownloadUrl },
            mimetype: "video/mp4",
            caption: `🎬 *${videoTitle}*\n\n✅ Download successful!\n🔗 Source: YouTube`
        }, { quoted: fakekontak });

        // Also send as document (downloadable file)
        await sock.sendMessage(chatId, {
            document: { url: videoDownloadUrl },
            mimetype: "video/mp4",
            fileName: `${videoTitle.replace(/[^\w\s-]/g, '').substring(0, 50)}.mp4`,
            caption: `📁 *${videoTitle}*`
        }, { quoted: fakekontak });

        // Final reaction
        await sock.sendMessage(chatId, {
            react: { text: '📥', key: message.key }
        });

    } catch (error) {
        console.error('Error in videoCommand:', error.message || error);
        
        await sock.sendMessage(chatId, {
            react: { text: '❌', key: message.key }
        });
        
        let errorMsg = "❌ Ukulanda kuhlulekile. Sicela uzame futhi kamuva.";
        
        if (error.message?.includes('timeout')) {
            errorMsg = "⏱️ Isicelo siphelelwe yisikhathi. Sicela uzame futhi.";
        } else if (error.message?.includes('ENOTFOUND')) {
            errorMsg = "🌐 Ayikwazi ukuxhuma kusevisi yokulanda.";
        } else if (error.message?.includes('API returned no download URL')) {
            errorMsg = "⚠️ I-URL yokulanda ividiyo ayitholakali. Ividiyo ingase ikhawulelwe.";
        }
        
        await sock.sendMessage(chatId, { 
            text: errorMsg
        }, { quoted: createFakeContact(message) });
    }
}

module.exports = videoCommand;