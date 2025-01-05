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
    const text = msg.text ? msg.text.toLowerCase() : '';
    console.log(chatId);

    // Initialize user state if not exists
    if (!userStates[chatId]) {
        userStates[chatId] = { step: null };
    }

    const userState = userStates[chatId];

    switch (true) {
        case text === '/start': {
            // Asking for phone number manually
            bot.sendMessage(chatId, "👋 Halo! Untuk melanjutkan, mohon kirimkan nomor telepon Anda dalam format: 08XXXXXXXXXX atau +62XXXXXXXXXX");
            userState.step = 'waiting_for_phone'; // Waiting for phone number input
            break;
        }
        case userState.step === 'waiting_for_phone' && (text.startsWith('08') || text.startsWith('+62')): {
            // Using the phone number as-is without modification
            const phoneNumber = text.trim();

            console.log('Received phone number:', phoneNumber);

            // Query Odoo with the phone number
            try {
                const response = await axios.get(`${BASE_URL}/user`, {
                    params: { phone: phoneNumber } // Use phone number to search in Odoo without modification
                });

                if (response.data.success) {
                    const userName = response.data.data.name;
                    const welcomeMessage = `👋 Halo, ${userName}! Selamat datang di PT Inti Tekstil Kreatif (INTEX)!\n\n` +
                        `Kami siap membantu Anda dengan pemesanan produk berbasis kain.\n` +
                        `Silakan pilih salah satu opsi di bawah ini:\n\n` +
                        `1️⃣ Buat Pesanan Baru\n` +
                        `2️⃣ Cek Status Pesanan\n` +
                        `3️⃣ Feedback dan Layanan Pelanggan`;
                    bot.sendMessage(chatId, welcomeMessage);
                    console.log('User data:', response.data.data);
                } else {
                    bot.sendMessage(chatId, `❌ Kami tidak dapat menemukan pengguna dengan nomor telepon yang terdaftar.`);
                }
            } catch (error) {
                console.error('Error fetching user data from Odoo:', error.message);
                bot.sendMessage(chatId, `❌ Terjadi kesalahan saat mengambil data dari sistem kami.`);
            }

            userState.step = 'menu'; // Reset state to menu after completion
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
            break;
        }
        case userState.step === 'menu' && (text === '2' || text.includes('cek status pesanan')): {
            bot.sendMessage(chatId, `📦 Anda memilih untuk cek status pesanan.\n` +
                `Silakan masukkan nomor pesanan Anda (gunakan format: #S00002):`);
            userState.step = 'check_order'; // Move to order check step
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
