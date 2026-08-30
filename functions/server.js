const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;
const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID;
const JWT_SECRET = process.env.JWT_SECRET || process.env.CLIENT_SECRET || 'dsrp-login-secret';
const REQUIRE_GUILD_MEMBERSHIP = String(
    process.env.REQUIRE_GUILD_MEMBERSHIP || (BOT_TOKEN && TARGET_GUILD_ID ? 'true' : 'false')
).toLowerCase() === 'true';

// Determine domain defensively
const getRedirectUri = (req) => {
    if (process.env.REDIRECT_URI) return process.env.REDIRECT_URI;

    if (req.headers.host && req.headers.host.includes('localhost')) {
        return `http://${req.headers.host}/auth/discord/callback`;
    }

    const protocol = req.headers['x-forwarded-proto']
        ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
        : 'https';

    return `${protocol}://${req.headers.host || 'detroit-ly.web.app'}/auth/discord/callback`;
};

app.use(cookieParser());
app.use(express.json());

router.get('/auth/discord', (req, res) => {
    const redirectUri = getRedirectUri(req);
    const scope = REQUIRE_GUILD_MEMBERSHIP ? 'identify%20email%20guilds%20guilds.join' : 'identify%20email';
    const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
    res.redirect(url);
});

router.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/?error=missing_code');

    const redirectUri = getRedirectUri(req);

    try {
        const params = new URLSearchParams();
        params.append('client_id', CLIENT_ID);
        params.append('client_secret', CLIENT_SECRET);
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        const tokenResp = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const access_token = tokenResp.data.access_token;
        const userResp = await axios.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const user = userResp.data;

        // Use JWT instead of in-memory Session to work seamlessly with Serverless (Netlify Functions)
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

        // MaxAge helps the browser keep the cookie
        res.cookie('sid', token, {
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production' || !req.headers.host.includes('localhost'),
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.redirect('/');
    } catch (err) {
        console.error('OAuth error', err.response ? err.response.data : err.message);
        res.redirect('/?error=oauth_failed');
    }
});

router.get('/me', (req, res) => {
    const token = req.cookies.sid;
    if (!token) return res.status(401).json({ error: 'not_logged_in' });

    try {
        const user = jwt.verify(token, JWT_SECRET);
        res.json({ id: user.id, username: user.username, discriminator: user.discriminator, avatar: user.avatar, email: user.email });
    } catch (err) {
        return res.status(401).json({ error: 'session_invalid' });
    }
});

app.get(/^\/(?!api\/|auth\/|logout$).*/, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

router.get('/api/streamer-info', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing url parameter' });

    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' }
        });
        const html = response.data;
        const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);

        if (match && match[1]) {
            res.json({ avatar: match[1] });
        } else {
            res.status(404).json({ error: 'Image not found' });
        }
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: 'Failed to fetch external URL' });
    }
});

router.get('/api/discord-count', async (req, res) => {
    try {
        // Fetch invite data with counts
        const resp = await axios.get('https://discord.com/api/v9/invites/toplife1?with_counts=true');
        res.json({ count: resp.data.approximate_member_count });
    } catch (err) {
        console.error('Discord fetch error:', err.message);
        res.status(500).json({ error: 'Failed' });
    }
});

router.post('/api/submit-test', async (req, res) => {
    const token = req.cookies.sid;
    if (!token) return res.status(401).json({ error: 'not_logged_in' });

    let user;
    try {
        user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return res.status(401).json({ error: 'session_invalid' });
    }

    const { jobId, jobTitle, questions, answers, score, total } = req.body;

    // Default webhook for other tests
    let WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || 'https://canary.discord.com/api/webhooks/1463706272699514902/3XnaUZgcWU_wHHijREAWLRVWm5LcyXsKWpXlGnh6qO-fPZ_dZbibFhSfKlfPIMT1bjeA';

    // Specific webhook for Activation Test (Whitelist)
    if (jobId === 'activation') {
        WEBHOOK_URL = 'https://canary.discord.com/api/webhooks/1476043975566819390/P_s8LlXuRmIrQh8LVE-i0n0qqf-_v539upB_IN__OLMBv2niTvlnsdu7ZJ5a23suBWUR';
    }

    if (!WEBHOOK_URL) {
        return res.status(500).json({ error: 'server_configuration_error' });
    }

    try {
        const fields = questions.map((q, i) => {
            const answerData = answers[i];
            const questionText = q.q || "سؤال بدون نص";
            const isLongQuestion = questionText.length > 200;

            if (!q.type || q.type === 'radio') {
                const options = q.options || [];
                const userAnswerText = options[answerData] || "إجابة غير معروفة";

                if (q.correctIndex !== undefined) {
                    const isCorrect = answerData === q.correctIndex;
                    return {
                        name: isLongQuestion ? `السؤال رقم ${i + 1}` : `Q${i + 1}: ${questionText}`,
                        value: (isLongQuestion ? `**السؤال:** ${questionText}\n` : "") +
                            `**الإجابة:** ${userAnswerText}\n**النتيجة:** ${isCorrect ? '✅ صحيح' : '❌ خطأ'}`,
                        inline: false
                    };
                } else {
                    return {
                        name: isLongQuestion ? `السؤال رقم ${i + 1}` : `Q${i + 1}: ${questionText}`,
                        value: (isLongQuestion ? `**السؤال:** ${questionText}\n` : "") +
                            `**الإجابة:** ${userAnswerText}`,
                        inline: false
                    };
                }
            } else {
                const answerValue = (answerData || "").toString();
                const clippedAnswer = answerValue.length > 1024 ? answerValue.substring(0, 1021) + "..." : (answerValue || "لا يوجد إجابة");

                return {
                    name: isLongQuestion ? `السؤال رقم ${i + 1}` : `Q${i + 1}: ${questionText}`,
                    value: isLongQuestion ? `**السؤال:** ${questionText}\n**الإجابة:**\n${clippedAnswer}` : clippedAnswer,
                    inline: false
                };
            }
        });

        // Final trimming for safety: Discord field values must be <= 1024
        fields.forEach(f => {
            if (f.value.length > 1024) {
                f.value = f.value.substring(0, 1021) + "...";
            }
            if (f.name.length > 256) {
                f.name = f.name.substring(0, 253) + "...";
            }
        });

        if (total > 0) {
            fields.unshift({
                name: '🏆 Score Details',
                value: `**Score:** ${score}/${total}\n**Percentage:** ${Math.round((score / total) * 100)}%`,
                inline: false
            });
        }

        // Split fields into multiple embeds if they exceed total character limit (approx 5000 chars to be safe) or field limit (25)
        const embeds = [];
        let currentFields = [];
        let currentChars = 0;

        for (const field of fields) {
            const fieldChars = field.name.length + field.value.length;
            if (currentFields.length >= 20 || (currentChars + fieldChars) > 5000) {
                embeds.push({
                    title: embeds.length === 0 ? `📝 New Test Submission: ${jobTitle}` : `📝 ${jobTitle} (Continued)`,
                    color: 0x8b5cf6,
                    author: embeds.length === 0 ? {
                        name: `${user.username} (${user.id})`,
                        icon_url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
                    } : null,
                    fields: currentFields,
                    timestamp: new Date().toISOString()
                });
                currentFields = [];
                currentChars = 0;
            }
            currentFields.push(field);
            currentChars += fieldChars;
        }

        if (currentFields.length > 0) {
            embeds.push({
                title: embeds.length === 0 ? `📝 New Test Submission: ${jobTitle}` : `📝 ${jobTitle} (Final Part)`,
                color: 0x10b981,
                author: embeds.length === 0 ? {
                    name: `${user.username} (${user.id})`,
                    icon_url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
                } : null,
                fields: currentFields,
                footer: {
                    text: "𝗗𝗲𝘁𝗿𝗼𝗶𝘁 𝗦𝘁𝗮𝘁𝗲 𝗥𝗣 Application System",
                    icon_url: "https://i.imgur.com/example.png"
                },
                timestamp: new Date().toISOString()
            });
        }

        await axios.post(WEBHOOK_URL, {
            username: "Detroit State Bot",
            embeds: embeds.slice(0, 10) // Discord allows max 10 embeds per message
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Webhook Error:', error.message);
        res.status(500).json({ error: 'failed_to_send_log' });
    }
});

// Use router under both / and /.netlify/functions/server to handle local and Netlify dev seamless routing
app.use('/', router);
app.use('/.netlify/functions/server', router);

// Export for serverless (Netlify)
module.exports.handler = serverless(app);
