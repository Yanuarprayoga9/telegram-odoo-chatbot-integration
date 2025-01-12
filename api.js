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
let phone;
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
        case text === 'back': {
            // Reset to menu
            bot.sendMessage(chatId, "🔙 Anda kembali ke menu utama.", {
                reply_markup: {
                    keyboard: [['1️⃣ Buat Pesanan Baru', '2️⃣ Cek Status Pesanan'], ['3️⃣ Feedback dan Layanan Pelanggan']],
                    resize_keyboard: true,
                },
            });
            userState.step = 'menu'; // Reset state to menu
            break;
        }
        case text === '/start': {
            // Asking for phone number manually
            bot.sendMessage(chatId, "👋 Halo! Untuk melanjutkan, mohon kirimkan nomor telepon Anda dalam format: 08XXXXXXXXXX atau +62XXXXXXXXXX");
            userState.step = 'waiting_for_phone'; // Waiting for phone number input
            break;
        }
        case userState.step === 'waiting_for_phone' && (text.startsWith('08') || text.startsWith('+62')): {
            // Using the phone number as-is without modification
            const phoneNumber = text.trim();
            phone = phoneNumber;
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
            // Fetch products list
            try {
                const response = await axios.get(`${BASE_URL}/products`);
                const products = response.data;

                // Display product options
                let productMessage = "📦 Pilih Produk dari daftar berikut:\n\n";
                products.forEach((product, index) => {
                    productMessage += `${index + 1}. ${product.name} - ${product.list_price} IDR\n`;
                });

                productMessage += `\nSilakan pilih produk dengan mengetikkan nomor pilihan (misal: 1 untuk ${products[0].name})`;

                bot.sendMessage(chatId, productMessage);
                userState.step = 'waiting_for_product'; // Waiting for product selection
            } catch (error) {
                console.error('Error fetching products:', error.message);
                bot.sendMessage(chatId, `❌ Terjadi kesalahan saat mengambil daftar produk.`);
            }
            break;
        }
        case userState.step === 'waiting_for_product' && !isNaN(parseInt(text)) && parseInt(text) > 0: {
            const productIndex = parseInt(text) - 1;
            const response = await axios.get(`${BASE_URL}/products`);
            const products = response.data;

            if (productIndex >= 0 && productIndex < products.length) {
                const selectedProduct = products[productIndex];
                bot.sendMessage(chatId, `Anda memilih produk: ${selectedProduct.name}\n` +
                    `Harga: ${selectedProduct.list_price} IDR\n` +
                    `Stok tersedia: ${selectedProduct.stock_available}`);

                bot.sendMessage(chatId, `🔢 Silakan masukkan jumlah pesanan:`);
                userState.step = 'waiting_for_quantity'; // Waiting for quantity input
                userState.selectedProduct = selectedProduct; // Store selected product
            } else {
                bot.sendMessage(chatId, `❌ Pilihan produk tidak valid. Silakan coba lagi.`);
            }
            break;
        }
        case userState.step === 'waiting_for_quantity' && !isNaN(parseInt(text)) && parseInt(text) > 0: {
            const quantity = parseInt(text);
            const selectedProduct = userState.selectedProduct;

            // Proceed to create the order in Odoo
            try {
                const response = await axios.get(`${BASE_URL}/user`, {
                    params: { phone: phone } // Use phone number to search in Odoo without modification
                });

                const orderData = {
                    customer_id: response.data.data.id, // Replace with actual customer id
                    product_id: selectedProduct.product_id,
                    quantity: quantity,
                    unit_price: selectedProduct.list_price,
                    pricelist_id: 1, // Replace with actual pricelist id
                    payment_term_id: 2, // Replace with actual payment term id
                };
                console.log('Creating order with data:', orderData);
                const createResponse = await axios.post(`${BASE_URL}/quotation`, orderData);

                if (createResponse.data.result.success) {
                    bot.sendMessage(chatId, `✅ Pesanan Anda berhasil dibuat! Berikut adalah detail pesanan:\n` +
                        `Nomor Pesanan: ${createResponse.data.result.data.name}\n` +
                        `Total: ${createResponse.data.result.data.amount_total} IDR\n` +
                        `Tanggal Pesanan: ${createResponse.data.result.data.date_order}`);
                } else {
                    bot.sendMessage(chatId, `❌ Gagal membuat pesanan. Silakan coba lagi.`);
                }
            } catch (error) {
                console.error('Error creating order:', error.message);
                bot.sendMessage(chatId, `❌ Terjadi kesalahan saat membuat pesanan.`);
            }

            userState.step = 'menu'; // Reset to menu
            break;
        } case userState.step === 'menu' && (text === '2' || text.includes('cek status pesanan')): {
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
        
                let feedbackMessage = '';
                if (order.delivery_status[0].toLowerCase() === 'done') {
                    const feedbackLink = `http://localhost:18888/survey/start/a05ab7b4-e0b1-4ff9-b355-fac76cfd3abe`;
                    feedbackMessage = `✅ Pesanan Anda telah selesai! Mohon berikan feedback Anda melalui link berikut:\n${feedbackLink}`;
                }
        
                const message = `🔍 Status Pesanan #${orderNumber}:\n\n` +
                    `🆔 Order ID: ${order.order_id}\n` +
                    `📋 State: ${order.state}\n` +
                    `🚚 Delivery Status: ${order.delivery_status.join(', ')}\n\n` +
                    feedbackMessage;
        
                bot.sendMessage(chatId, message);
            } catch (error) {
                bot.sendMessage(chatId, `❌ Tidak dapat menemukan pesanan dengan nomor: #${orderNumber}.\n` +
                    `Pastikan nomor pesanan Anda benar.`);
            }
            userState.step = 'menu'; // Reset state to menu
            break;
        }
        default: {
            bot.sendMessage(chatId, `🙏 Mohon maaf, perintah tidak dikenali. Silakan pilih opsi yang tersedia.`);
        }
    }
});
