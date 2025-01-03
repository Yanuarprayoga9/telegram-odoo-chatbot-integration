// Install required libraries: npm install node-telegram-bot-api axios
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();
// Replace with your BotFather token
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Base URL for Odoo API
const BASE_URL = 'http://localhost:18888/api';
// User session states
const userStates = {};

// Command Handler
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text.toLowerCase();

    // Initialize user state if not exists
    if (!userStates[chatId]) {
        userStates[chatId] = { step: null };
    }

    const userState = userStates[chatId];

    switch (true) {
        case text === '/start': {
            const welcomeMessage = `👋 Halo! Selamat datang di PT Inti Tekstil Kreatif (INTEX)!\n\n` +
                `Kami siap membantu Anda dengan pemesanan produk berbasis kain.\n` +
                `Silakan pilih salah satu opsi di bawah ini:\n\n` +
                `1️⃣ Buat Pesanan Baru\n` +
                `2️⃣ Cek Status Pesanan\n` +
                `3️⃣ Feedback dan Layanan Pelanggan`;
            bot.sendMessage(chatId, welcomeMessage);
            userState.step = 'menu'; // Set user step to menu
            console.log(userState.step);
            break;
        }
        case text === '/back': {
            const welcomeMessage = `👋 Halo! Selamat datang di PT Inti Tekstil Kreatif (INTEX)!\n\n` +
                `Kami siap membantu Anda dengan pemesanan produk berbasis kain.\n` +
                `Silakan pilih salah satu opsi di bawah ini:\n\n` +
                `1️⃣ Buat Pesanan Baru\n` +
                `2️⃣ Cek Status Pesanan\n` +
                `3️⃣ Feedback dan Layanan Pelanggan`;
            bot.sendMessage(chatId, welcomeMessage);
            userState.step = 'menu'; // Set user step to menu
            console.log(userState.step);
            break;
        }
        case userState.step === 'menu' && (text === '1' || text.includes('buat pesanan baru')): {
            bot.sendMessage(chatId, `🛍️ Anda memilih untuk membuat pesanan baru.\n` +
                `Silakan isi detail pesanan Anda di bawah ini:\n\n` +
                `📦 Jenis Produk (misal: Kaos Polos, Kaos Sablon, Keset):\n` +
                `✂️ Ukuran (misal: S, M, L, XL):\n` +
                `🎨 Warna (misal: Merah, Biru, Hitam):\n` +
                `🔢 Jumlah Pesanan:`);
            userState.step = 'create_order'; // Move to order creation step
            console.log(userState.step);
            break;
        }
        case userState.step === 'menu' && (text === '2' || text.includes('cek status pesanan')): {
            bot.sendMessage(chatId, `📦 Anda memilih untuk cek status pesanan.\n` +
                `Silakan masukkan nomor pesanan Anda (gunakan format: #S00002):`);
            userState.step = 'check_order'; // Move to order check step
            console.log(userState.step);
            break;
        }
        case userState.step === 'check_order' && text.startsWith('#'): {
            const orderNumber = text.replace('#', '').trim().toUpperCase();
            try {
                const response = await axios.get(`${BASE_URL}/order_status`, {
                    params: { order_name: orderNumber },
                });
                const order = response.data;
                bot.sendMessage(chatId, `🔍 Status Pesanan #${orderNumber}:\n\n` +
                    `🆔 Order ID: ${order.order_id}\n` +
                    `📋 State: ${order.state}\n` +
                    `🚚 Delivery Status: ${order.delivery_status.join(', ')}`);
                console.log(userState.step);
            } catch (error) {
                bot.sendMessage(chatId, `❌ Tidak dapat menemukan pesanan dengan nomor: #${orderNumber}.\n` +
                    `Pastikan nomor pesanan Anda benar.`);
            }
            userState.step = 'menu'; // Reset state to menu
            break;
        }
        case userState.step === 'menu' && (text === '3' || text.includes('feedback')): {
            bot.sendMessage(chatId, `📝 Silakan beri tahu kami tentang pengalaman Anda dengan produk kami:`);
            userState.step = 'feedback'; // Set step for feedback
            break;
        }
        default: {
            bot.sendMessage(chatId, `🙏 Mohon maaf, perintah tidak dikenali. Silakan pilih opsi yang tersedia.`);
        }
    }
});