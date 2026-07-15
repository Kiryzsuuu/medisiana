const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RoomMessage = require('../models/RoomMessage');

function registerRoomSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Token tidak ditemukan'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select('-password');
      if (!user) return next(new Error('User tidak ditemukan'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Autentikasi socket gagal'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('room:join', ({ roomId }) => {
      socket.join(`room:${roomId}`);
    });

    socket.on('room:leave', ({ roomId }) => {
      socket.leave(`room:${roomId}`);
    });

    socket.on('room:message', async ({ roomId, content }) => {
      if (!content?.trim()) return;
      const message = await RoomMessage.create({
        roomId,
        senderId: socket.user._id,
        senderType: 'user',
        content,
      });
      io.to(`room:${roomId}`).emit('room:message', {
        ...message.toObject(),
        senderName: socket.user.fullName,
      });
    });
  });
}

module.exports = { registerRoomSocket };
