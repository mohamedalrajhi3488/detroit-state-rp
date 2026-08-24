const express = require('express');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const SERVER_CODE = process.env.SERVER_CODE || 'dg3r3zd';
// decide port and host. If HIDE_PORT=true we'll default to port 80 so the URL shows no port.
const DEFAULT_PORT = process.env.HIDE_PORT === 'true' ? 80 : 3000;
const PORT = parseInt(process.env.PORT || DEFAULT_PORT, 10);
// allow binding to a specific host/IP (e.g. 100.113.116.45)
const HOST = process.env.HOST || '0.0.0.0';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const getRedirectUri = (req = null) => {
  if (process.env.REDIRECT_URI) return process.env.REDIRECT_URI;

  const host = req && req.headers && req.headers.host ? req.headers.host : 'localhost:3000';
  const forwardedProto = req && req.headers && req.headers['x-forwarded-proto']
    ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
    : (host.includes('localhost') ? 'http' : 'https');

  return `${forwardedProto}://${host}/auth/discord/callback`;
};
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://dsrp.up.railway.app/auth/discord/callback';
const BOT_TOKEN = process.env.BOT_TOKEN;
const TARGET_GUILD_ID = process.env.TARGET_GUILD_ID;
const JWT_SECRET = process.env.JWT_SECRET || process.env.CLIENT_SECRET || 'dsrp-login-secret';
const REQUIRE_GUILD_MEMBERSHIP = String(process.env.REQUIRE_GUILD_MEMBERSHIP || 'false').toLowerCase() === 'true';
const ACTIVITY_LOG = [];
const REGISTERED_USERS = new Map();

const normalizeActivityEntry = (entry) => ({
  id: entry.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  user: entry.user || 'Unknown',  avatar: entry.avatar || null,  action: entry.action || 'تسجيل دخول',
  detail: entry.detail || 'تمت العملية بنجاح.',
  color: entry.color || 'blue',
  time: entry.time || new Date().toISOString()
});

const addActivityEntry = (entry) => {
  const normalized = normalizeActivityEntry(entry)
  const recentMatch = ACTIVITY_LOG.find((item) => {
    const sameUser = String(item.user).toLowerCase() === String(normalized.user).toLowerCase()
    const sameAction = String(item.action) === String(normalized.action)
    const withinWindow = Math.abs(new Date(item.time).getTime() - new Date(normalized.time).getTime()) < 5 * 60 * 1000
    return sameUser && sameAction && withinWindow
  })

  if (recentMatch) {
    recentMatch.detail = normalized.detail
    recentMatch.time = normalized.time
    recentMatch.color = normalized.color
    return recentMatch
  }

  ACTIVITY_LOG.unshift(normalized)
  if (ACTIVITY_LOG.length > 200) ACTIVITY_LOG.length = 200
  return normalized
}

const addRegisteredUser = (user) => {
  if (!user || !user.id) return null

  const existing = REGISTERED_USERS.get(String(user.id))

  const normalizedUser = {
    id: user.id,
    name: user.name || user.username || 'User',
    email: user.email || `${(user.username || user.name || 'user').toLowerCase()}@discord`,
    role: user.role || 'Discord User',
    firstLoginAt: existing?.firstLoginAt || user.firstLoginAt || new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    avatar: user.avatar || null
  }

  if (existing) {
    REGISTERED_USERS.set(String(user.id), { ...existing, ...normalizedUser, firstLoginAt: existing.firstLoginAt || normalizedUser.firstLoginAt, lastSeen: normalizedUser.lastSeen })
    return REGISTERED_USERS.get(String(user.id))
  }

  REGISTERED_USERS.set(String(user.id), normalizedUser)
  return normalizedUser
}

const createSignedUserToken = (user) => {
  return jwt.sign({
    id: user.id,
    username: user.username,
    discriminator: user.discriminator,
    avatar: user.avatar,
    email: user.email,
    status: user.status || 'offline'
  }, JWT_SECRET, { expiresIn: '7d' })
}

const getRegisteredUsers = () => Array.from(REGISTERED_USERS.values()).slice(0, 100)

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.warn('CLIENT_ID or CLIENT_SECRET not set in environment. Fill .env or set env vars.');
}

// Simple in-memory session store (for demo only)
const SESSIONS = new Map();

app.use(cookieParser());
app.use(express.json()); // Parsing JSON for submissions
app.use(express.static(__dirname)); // serve index.html from project root
// If a React client build exists, serve it at root instead (client/dist)
const fs = require('fs');
const path = require('path');
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // fallback to index.html in client/dist
  app.get(['/', '/admin', '/admin/*'], (req, res, next) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.get('/api/server-status', async (req, res) => {
  try {
    const response = await axios.get(`https://servers-frontend.fivem.net/api/servers/single/${SERVER_CODE}`, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('FiveM status fetch failed:', error.message);
    res.status(502).json({ error: 'server_status_unavailable' });
  }
});

app.get('/api/activity-log', (req, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 20)
  res.json(ACTIVITY_LOG.slice(0, limit))
})

app.delete('/api/activity-log', (req, res) => {
  ACTIVITY_LOG.length = 0
  res.json({ ok: true, deleted: true, count: 0 })
})

app.delete('/api/activity-log/:id', (req, res) => {
  const { id } = req.params
  const index = ACTIVITY_LOG.findIndex((item) => String(item.id) === String(id))

  if (index === -1) {
    return res.status(404).json({ ok: false, deleted: false, error: 'activity_not_found' })
  }

  ACTIVITY_LOG.splice(index, 1)
  return res.json({ ok: true, deleted: true })
})

app.post('/api/activity-log', (req, res) => {
  const { user, action, detail, color, time } = req.body || {}
  if (!user) {
    return res.status(400).json({ error: 'Missing user' })
  }

  const entry = addActivityEntry({ user, action: action || 'تسجيل دخول', detail: detail || 'تمت العملية بنجاح.', color: color || 'blue', time })
  res.status(201).json(entry)
})

app.get('/api/registered-users', (req, res) => {
  res.json(getRegisteredUsers())
})

app.post('/api/register-login', (req, res) => {
  const user = req.body || {}
  if (!user || !user.id) {
    return res.status(400).json({ error: 'Invalid user payload' })
  }

  const existing = REGISTERED_USERS.get(String(user.id))
  const normalizedUser = addRegisteredUser(user)
  if (!normalizedUser) {
    return res.status(400).json({ error: 'Invalid user payload' })
  }

  let entry = null
  if (!existing) {
    entry = addActivityEntry({
      user: normalizedUser.name,
      action: 'تسجيل دخول',
      detail: 'تم تسجيل الدخول إلى الموقع بنجاح.',
      color: 'blue',
      time: new Date().toISOString()
    })
  }

  res.status(201).json({ user: normalizedUser, activity: entry, users: getRegisteredUsers() })
})

app.get('/auth/discord', (req, res) => {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).send('Discord OAuth is not configured. Set CLIENT_ID and CLIENT_SECRET in .env.');
  }

  const redirectUri = getRedirectUri(req);
  const scope = REQUIRE_GUILD_MEMBERSHIP
    ? encodeURIComponent('identify email guilds guilds.join')
    : encodeURIComponent('identify email');

  const url = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=consent`;
  res.redirect(url);
});

app.get('/auth/discord/callback', async (req, res) => {
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
    let guildStatus = 'offline';

    let isMember = false;
    if (REQUIRE_GUILD_MEMBERSHIP && TARGET_GUILD_ID) {
      try {
        const guildsResp = await axios.get('https://discord.com/api/users/@me/guilds', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const guilds = guildsResp.data || [];
        isMember = guilds.some(g => String(g.id) === String(TARGET_GUILD_ID));
      } catch (e) {
        console.warn('Failed to fetch user guilds:', e.message);
      }
    }

    if (REQUIRE_GUILD_MEMBERSHIP && TARGET_GUILD_ID && BOT_TOKEN) {
      try {
        const memberResp = await axios.get(`https://discord.com/api/guilds/${TARGET_GUILD_ID}/members/${user.id}`, {
          headers: { Authorization: `Bot ${BOT_TOKEN}` }
        });
        const member = memberResp.data || {};
        guildStatus = member.status || member.presence?.status || member.user?.presence?.status || guildStatus;
      } catch (e) {
        console.warn('Failed to fetch guild member presence:', e.response ? e.response.data : e.message);
        if (e.response && (e.response.status === 404 || e.response.status === 403)) {
          guildStatus = 'not_in_guild';
        }
      }
    }

    if (REQUIRE_GUILD_MEMBERSHIP && !isMember && TARGET_GUILD_ID && BOT_TOKEN && guildStatus !== 'not_in_guild') {
      try {
        await axios.put(
          `https://discord.com/api/guilds/${TARGET_GUILD_ID}/members/${user.id}`,
          { access_token },
          { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        isMember = true;
      } catch (e) {
        console.warn('Failed to add user to guild via bot:', e.response ? e.response.data : e.message);
      }
    }

    if (REQUIRE_GUILD_MEMBERSHIP && !isMember && process.env.DISCORD_INVITE_CODE) {
      const inviteUrl = `https://discord.gg/${process.env.DISCORD_INVITE_CODE}`;
      res.cookie('sid_join_temp', uuidv4(), { maxAge: 60 * 60 * 1000, httpOnly: true });
      return res.redirect(inviteUrl);
    }

    const signedUser = { ...user, status: guildStatus };
    if (REQUIRE_GUILD_MEMBERSHIP && !isMember && TARGET_GUILD_ID) {
      signedUser.status = 'not_in_guild';
    }

    const token = createSignedUserToken(signedUser);
    res.cookie('sid', token, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' || !req.headers.host.includes('localhost'),
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.redirect('/');
  } catch (err) {
    console.error('OAuth error', err.response ? err.response.data : err.message);
    res.redirect('/?error=oauth_failed');
  }
});

app.get('/me', (req, res) => {
  const token = req.cookies.sid;
  if (!token) return res.status(401).json({ error: 'not_logged_in' });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return res.json({
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatar: user.avatar,
      email: user.email,
      status: user.status || 'offline'
    });
  } catch {
    return res.status(401).json({ error: 'session_invalid' });
  }
});

app.post('/logout', (req, res) => {
  const sid = req.cookies.sid;
  if (sid) {
    try {
      jwt.verify(sid, JWT_SECRET)
    } catch {
      // ignore invalid token cleanup
    }
  }

  res.clearCookie('sid', { httpOnly: true, path: '/', sameSite: 'lax' });
  res.json({ ok: true });
});

/* ===== PROXY FOR STREAMER INFO ===== */
app.get('/api/streamer-info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    // Use a User-Agent to look like a browser/bot that might be allowed for previews (like Discord bot)
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'
      }
    });

    // Regex to find og:image content
    const html = response.data;
    // Look for property="og:image" content="..."
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

/* ===== DISCORD MEMBER COUNT (via invite) ===== */
// Simple in-memory cache to avoid hitting Discord rate limits
let _discordCache = { count: null, ts: 0 };
const DISCORD_INVITE = process.env.DISCORD_INVITE_CODE || 'dsrp';

app.get('/api/discord-count', async (req, res) => {
  try {
    const now = Date.now();
    // return cached value if within 60 seconds
    if (_discordCache.count && (now - _discordCache.ts) < 60 * 1000) {
      return res.json({ count: _discordCache.count });
    }

    const url = `https://discord.com/api/v10/invites/${encodeURIComponent(DISCORD_INVITE)}?with_counts=true`;
    const resp = await axios.get(url, { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } });

    // Discord invite response contains approximate_member_count
    const count = resp.data && (resp.data.approximate_member_count || resp.data.approximate_presence_count || 0);
    _discordCache = { count, ts: now };
    res.json({ count });
  } catch (err) {
    console.error('Failed to fetch discord invite:', err.message);
    // don't expose internal error details to client
    res.status(502).json({ error: 'discord_unavailable' });
  }
});

/* ===== SUBMIT TEST TO DISCORD WEBHOOK ===== */
app.post('/api/submit-test', async (req, res) => {
  const sid = req.cookies.sid;
  if (!sid) return res.status(401).json({ error: 'not_logged_in' });

  const user = SESSIONS.get(sid);
  if (!user) return res.status(401).json({ error: 'session_invalid' });

  const { jobTitle, questions, answers, score, total } = req.body;
  const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

  if (!WEBHOOK_URL) {
    console.error('DISCORD_WEBHOOK_URL is not set in .env');
    return res.status(500).json({ error: 'server_configuration_error' });
  }

  try {
    // Format Fields for Embed
    const fields = questions.map((q, i) => {
      const answerData = answers[i];

      if (!q.type || q.type === 'radio') {
        const userAnswerText = q.options[answerData];

        if (q.correctIndex !== undefined) {
          const isCorrect = answerData === q.correctIndex;
          return {
            name: `Q${i + 1}: ${q.q}`,
            value: `**الإجابة:** ${userAnswerText}\n**النتيجة:** ${isCorrect ? '✅ صحيح' : '❌ خطأ'}`,
            inline: false
          };
        } else {
          return {
            name: `Q${i + 1}: ${q.q}`,
            value: `**الإجابة:** ${userAnswerText}`,
            inline: false
          };
        }
      } else {
        return {
          name: `Q${i + 1}: ${q.q}`,
          value: `**الإجابة:**\n${answerData}`,
          inline: false
        };
      }
    });

    if (total > 0) {
      fields.unshift({
        name: '🏆 Score Details',
        value: `**Score:** ${score}/${total}\n**Percentage:** ${Math.round((score / total) * 100)}%`,
        inline: false
      });
    }

    const embed = {
      title: `📝 New Test Submission: ${jobTitle}`,
      color: 0x10b981, // Green
      author: {
        name: `${user.username} (${user.id})`,
        icon_url: user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : null
      },
      fields: fields,
      footer: {
        text: "𝗗𝗲𝘁𝗿𝗼𝗶𝘁 𝗦𝘁𝗮𝘁𝗲 𝗥𝗣 Application System",
        icon_url: "https://i.imgur.com/example.png" // Replace with server logo if available
      },
      timestamp: new Date().toISOString()
    };

    await axios.post(WEBHOOK_URL, {
      username: "Detroit State Bot",
      embeds: [embed]
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Webhook Error:', error.message);
    res.status(500).json({ error: 'failed_to_send_log' });
  }
});

app.listen(PORT, HOST, () => {
  // Determine friendly URL
  const address = (HOST === '0.0.0.0' || HOST === '::') ? 'localhost' : HOST;
  const protocol = 'http';
  const url = (PORT === 80 || PORT === 443) ? `${protocol}://${address}` : `${protocol}://${address}:${PORT}`;

  console.log(`\n🚀 𝗗𝗲𝘁𝗿𝗼𝗶𝘁 𝗦𝘁𝗮𝘁𝗲 𝗥𝗣 Server Started!`);
  console.log(`📡 Local Address:  ${url}`);
  if (HOST === '0.0.0.0') console.log(`🌍 Network Address: http://${require('os').hostname()}:${PORT}`);
  console.log(`\nready to serve.`);
});
