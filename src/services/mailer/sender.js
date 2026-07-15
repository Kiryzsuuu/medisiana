const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const { transporter } = require('../../config/mailer');

const TEMPLATES_DIR = path.join(__dirname, 'templates');
const cache = {};

function renderTemplate(name, vars) {
  if (!cache[name]) {
    const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
    cache[name] = handlebars.compile(fs.readFileSync(filePath, 'utf-8'));
  }
  return cache[name](vars);
}

const SUBJECTS = {
  'verify-email': 'Verifikasi email Medisiana kamu',
  'reset-password': 'Reset password Medisiana',
  'password-changed': 'Password kamu berhasil diubah',
  welcome: 'Selamat datang di Medisiana!',
  'room-invite': 'Kamu diundang ke Study Room',
  'index-done': '[Admin] Buku selesai diindex',
};

async function sendMail(templateName, to, vars = {}) {
  if (!process.env.SMTP_USER) {
    console.log(`[mailer] SMTP tidak dikonfigurasi - skip kirim email "${templateName}" ke ${to}`);
    return;
  }
  const html = renderTemplate(templateName, vars);
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: SUBJECTS[templateName] || 'Medisiana',
    html,
  });
}

module.exports = { sendMail };
