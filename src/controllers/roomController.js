const crypto = require('crypto');
const StudyRoom = require('../models/StudyRoom');
const RoomMessage = require('../models/RoomMessage');
const { buildPrompt } = require('../services/ai/prompts');
const { searchRAG, formatChunks, toSources } = require('../services/ai/rag');
const { callAI } = require('../services/ai/providers');
const { getAiConfig } = require('../services/ai/config');

async function listRooms(req, res, next) {
  try {
    const rooms = await StudyRoom.find({
      $or: [{ type: 'public' }, { members: req.user._id }],
    }).sort({ createdAt: -1 });
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
}

async function createRoom(req, res, next) {
  try {
    const { name, description, type = 'public', topic } = req.body;
    if (!name) return res.status(400).json({ error: 'name wajib diisi' });

    const room = await StudyRoom.create({
      name,
      description,
      type,
      topic,
      inviteCode: type === 'private' ? crypto.randomBytes(4).toString('hex') : undefined,
      createdBy: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
}

async function getRoom(req, res, next) {
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });
    const messages = await RoomMessage.find({ roomId: room._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ room, messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
}

async function joinRoom(req, res, next) {
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

    if (room.type === 'private' && req.body.inviteCode !== room.inviteCode) {
      return res.status(403).json({ error: 'Kode invite salah' });
    }

    if (!room.members.some((m) => m.equals(req.user._id))) {
      room.members.push(req.user._id);
      await room.save();
    }

    res.json({ room });
  } catch (err) {
    next(err);
  }
}

async function leaveRoom(req, res, next) {
  try {
    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });
    room.members = room.members.filter((m) => !m.equals(req.user._id));
    await room.save();
    res.json({ message: 'Berhasil keluar dari room' });
  } catch (err) {
    next(err);
  }
}

async function getMessages(req, res, next) {
  try {
    const { before, limit = 50 } = req.query;
    const filter = { roomId: req.params.id };
    if (before) filter.createdAt = { $lt: new Date(before) };
    const messages = await RoomMessage.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    res.json({ messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
}

async function askAi(req, res, next) {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question wajib diisi' });

    const room = await StudyRoom.findById(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room tidak ditemukan' });

    const config = await getAiConfig();
    const { chunks } = await searchRAG(question, req.user.angkatan, { topK: config.topK });
    const recentMessages = await RoomMessage.find({ roomId: room._id }).sort({ createdAt: -1 }).limit(20);
    const roomChatHistory = recentMessages
      .reverse()
      .map((m) => `${m.senderType === 'ai' ? 'Medina' : 'Mahasiswa'}: ${m.content}`)
      .join('\n');

    const systemPrompt = buildPrompt('GROUP', {
      room_name: room.name,
      member_count: room.members.length,
      room_topic: room.topic || '(tidak ditentukan)',
      asker_name: req.user.fullName,
      rag_context: formatChunks(chunks),
      room_chat_history: roomChatHistory,
      question,
    }, config.promptOverrides);

    const response = await callAI(systemPrompt, question, {
      maxTokens: config.maxTokens,
      provider: config.aiProvider,
      apiKey: config.apiKey,
      model: config.aiModel,
    });

    const userMessage = await RoomMessage.create({ roomId: room._id, senderId: req.user._id, senderType: 'user', content: question });
    const aiMessage = await RoomMessage.create({
      roomId: room._id,
      senderType: 'ai',
      content: response.text,
      sources: toSources(chunks),
    });

    const io = req.app.get('io');
    io?.to(`room:${room._id}`).emit('room:message', { ...userMessage.toObject(), senderName: req.user.fullName });
    io?.to(`room:${room._id}`).emit('room:message', aiMessage);

    res.json({ message: response.text, sources: toSources(chunks) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listRooms, createRoom, getRoom, joinRoom, leaveRoom, getMessages, askAi };
