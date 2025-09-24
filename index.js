// ====================== SETUP ======================
import 'dotenv/config';
import tmi from 'tmi.js';
import { Client, GatewayIntentBits } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  generateDependencyReport
} from '@discordjs/voice';
import fs from 'fs';
import path from 'path';
import express from 'express';
import WebSocket from 'ws';
import axios from 'axios';
import winston from 'winston';

// ====================== LOGGER ======================
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}] ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

logger.info(`Discord.js Voice Dependency Report:\n${generateDependencyReport()}`);

// ====================== EXPRESS SERVER ======================
const app = express();
app.use(express.static(path.join(process.cwd(), 'public')));
app.listen(3000, () => logger.info('Overlay server running on http://localhost:3000'));

// ====================== WEBSOCKET ======================
const wss = new WebSocket.Server({ port: 8080 });
wss.on('connection', () => logger.info('WebSocket client connected'));

const broadcastToOverlay = (message) => {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  });
};

// ====================== DISCORD BOT ======================
const discordClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] });
let discordConnection = null;
let audioPlayer = createAudioPlayer();
let ttsQueue = [];
let isSpeaking = false;

discordClient.on('ready', async () => {
  logger.info(`Discord Bot logged in as ${discordClient.user?.tag}`);
  const guild = await discordClient.guilds.fetch(process.env.GUILD_ID);
  const channel = guild.channels.cache.get(process.env.VOICE_CHANNEL_ID);
  if (!channel) return logger.error('Voice channel not found!');

  discordConnection = joinVoiceChannel({
    channelId: process.env.VOICE_CHANNEL_ID,
    guildId: process.env.GUILD_ID,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });

  discordConnection.subscribe(audioPlayer);
  logger.info('Connected to Discord voice channel');
});

discordClient.login(process.env.DISCORD_TOKEN);

// ====================== TTS FUNCTION ======================
const speakInDiscord = async (text) => {
  if (!discordConnection) return;

  broadcastToOverlay(text);

  const wavPath = path.join(process.cwd(), 'tts.wav');

  // Wait for Python server to generate WAV
  const waitForFile = async () => {
    let retries = 20; // max 2 seconds
    while (retries > 0 && !fs.existsSync(wavPath)) {
      await new Promise(r => setTimeout(r, 100));
      retries--;
    }
    if (!fs.existsSync(wavPath)) throw new Error('TTS WAV file not generated in time');
  };

  try {
    await waitForFile();
  } catch (err) {
    logger.error(err);
    return;
  }

  const resource = createAudioResource(wavPath);
  audioPlayer.play(resource);

  await new Promise((resolve) => {
    audioPlayer.once(AudioPlayerStatus.Idle, resolve);
  });

  fs.unlinkSync(wavPath); // cleanup
};

// ====================== QUEUE PROCESSOR ======================
const processQueue = async () => {
  if (!ttsQueue.length || isSpeaking) return;
  isSpeaking = true;

  const text = ttsQueue.shift();
  logger.info(`Speaking: ${text}`);
  await speakInDiscord(text);

  isSpeaking = false;
  processQueue();
};

// ====================== TWITCH CHAT ======================
const twitchClient = new tmi.Client({
  identity: {
    username: process.env.TWITCH_USERNAME,
    password: process.env.TWITCH_TOKEN
  },
  channels: [process.env.TWITCH_CHANNEL]
});

twitchClient.connect();

let chatBuffer = [];
twitchClient.on('message', (_channel, _tags, message, self) => {
  if (self) return;
  logger.info(`Twitch: ${message}`);
  chatBuffer.push(message);
});

// ====================== CHAT SUMMARY ======================
const pushBatch = async () => {
  if (!chatBuffer.length) return;

  const batch = chatBuffer.join('\n- ');
  chatBuffer = [];

  try {
    const res = await axios.post('http://127.0.0.1:1919/summarize', { text: batch });
    const summary = res.data.summary;
    if (summary) {
      logger.info(`Summary: ${summary}`);
      ttsQueue.push(summary);
      processQueue();
    }
  } catch (err) {
    logger.error(`Error summarizing batch: ${err}`);
  }
};

setInterval(pushBatch, 15000);
