require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const { connectDB } = require('./src/config/db');
const { errorHandler } = require('./src/middleware/errorHandler');
const { registerRoomSocket } = require('./src/socket/roomSocket');

const authRoutes = require('./src/routes/auth');
const chatRoutes = require('./src/routes/chat');
const bookRoutes = require('./src/routes/books');
const roomRoutes = require('./src/routes/rooms');
const caseRoutes = require('./src/routes/cases');
const adminRoutes = require('./src/routes/admin');
const bannerRoutes = require('./src/routes/banners');
const wellnessRoutes = require('./src/routes/wellness');
const featureCardRoutes = require('./src/routes/featureCards');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*' } });

app.set('io', io);
registerRoomSocket(io);

app.use(cors());
// Higher limit than the 100kb default — banner images are stored as base64 JSON.
app.use(express.json({ limit: '6mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/feature-cards', featureCardRoutes);

// Public marketing page at the root; the login form itself stays at
// /index.html (linked from the landing page's "Masuk" button).
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'landing.html')));

app.use(express.static(path.join(__dirname, 'public')));

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => console.log(`[server] Medisiana berjalan di http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[server] Gagal konek MongoDB:', err.message);
    process.exit(1);
  });
