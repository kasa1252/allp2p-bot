// ==========================================
// ALLP2P CORE BOT ENGINE (PRODUCTION CLOUD VERSION)
// ==========================================
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

// 🟢 የቴሌግራም ቦት ቶክን እና የቻፓ ቁልፎች (ከ Render Environment Variables ይነበባሉ)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "8939335559:AAGcTFSnG2aAb_1BBh_1k-y6F6-KYn94bfs";
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || "CHASECK_TEST-xxxxxxxxxxxxxxxxxxxx"; 
const OWNER_ADMIN_CHAT_ID = "1722318"; // የአድሚን ቴሌግራም ID

const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// 💾 የሲስተም መዝገቦች
const userSessions = {};   
const activeMarketAds = []; 
const activeP2pChats = {};   
const userBalances = {};    

// 🏠 ዋና ማውጫ
const mainInterfaceMenu = (ctx) => {
    return Markup.keyboard([
        ['🛒 P2P ገበያ (Market)', '📢 ማስታወቂያ ልጠፍ (Post Ad)'],
        ['💰 የኔ ቦርሳ (Wallet)', '💬 የንግድ ቻቶች (Active Chats)'],
        ['ℹ️ እርዳታና መረጃ (Help)']
    ]).resize();
};

// 🏁 የቦቱ መጀመሪያ
bot.command('start', async (ctx) => {
    const chatId = ctx.chat.id;
    if (!userBalances[chatId]) {
        userBalances[chatId] = { etb: 0.00, usdt: 0.00 };
    }
    userSessions[chatId] = { step: 'IDLE' };
    await ctx.reply(`👋 ሰላም ${ctx.from.first_name || 'ተጠቃሚ'}! ወደ ALLP2P መገበያያ ቦት በደህና መጡ።\n\nእዚህ ቦት ላይ በአስተማማኝ ሁኔታ ገንዘብ ማስገባት፣ ማውጣት፣ እና ከሌሎች ተጠቃሚዎች ጋር 24 ሰዓት መገበያየት ይችላሉ።`, mainInterfaceMenu(ctx));
});

// 💰 የኔ ቦርሳ
bot.hears('💰 የኔ ቦርሳ (Wallet)', async (ctx) => {
    const chatId = ctx.chat.id;
    const balance = userBalances[chatId] || { etb: 0.00, usdt: 0.00 };
    let walletText = `💳 *የአንተ የኪስ ቦርሳ (Wallet)*\n\n💵 *የኢትዮጵያ ብር:* ${balance.etb.toFixed(2)} ETB\n🪙 *USDT ባላንስ:* ${balance.usdt.toFixed(2)} USDT\n\n👇 ገንዘብ ለማስገባት ወይም ለማውጣት ከታች ያሉትን በተኖች ይጠቀሙ።`;
    await ctx.replyWithMarkdown(walletText, Markup.inlineKeyboard([
        [Markup.button.callback('➕ ገንዘብ አስገባ (Deposit)', 'DEPOSIT_INIT'), Markup.button.callback('➖ ገንዘብ አውጣ (Withdraw)', 'WITHDRAW_INIT')]
    ]));
});

bot.action('DEPOSIT_INIT', async (ctx) => {
    userSessions[ctx.chat.id] = { step: 'WAITING_DEPOSIT_AMOUNT' };
    await ctx.answerCbQuery();
    await ctx.reply('💰 እባክዎ ማስገባት የሚፈልጉትን የገንዘብ መጠን በቁጥር ብቻ ያስገቡ (ምሳሌ: 500)፦');
});

bot.action('WITHDRAW_INIT', async (ctx) => {
    userSessions[ctx.chat.id] = { step: 'WAITING_WITHDRAW_AMOUNT' };
    await ctx.answerCbQuery();
    await ctx.reply('💸 እባክዎ ማውጣት የሚፈልጉትን የገንዘብ መጠን በቁጥር ብቻ ያስገቡ፦');
});

bot.action(/^WITHDRAW_(APPROVE|REJECT)_(.+)\$/, async (ctx) => {
    const action = ctx.match[1];
    const targetUserChatId = ctx.match[2];
    if (String(ctx.chat.id) !== String(OWNER_ADMIN_CHAT_ID)) return ctx.answerCbQuery('⚠️ የአድሚን ትዕዛዝ!');
    if (action === 'APPROVE') {
        await bot.telegram.sendMessage(targetUserChatId, '✅ የእርስዎ የገንዘብ ማውጫ ጥያቄ ተፈቅዶ ብሩ ተልኳል!');
        await ctx.editMessageText(`✅ የ User ${targetUserChatId} ጥያቄ ፈቅደዋል።`);
    } else {
        await bot.telegram.sendMessage(targetUserChatId, '❌ የእርስዎ የገንዘብ ማውጫ ጥያቄ ውድቅ ተደርጓል።');
        await ctx.editMessageText(`❌ የ User ${targetUserChatId} ጥያቄ ውድቅ አድርገዋል።`);
    }
    await ctx.answerCbQuery();
});

// 🛒 P2P ገበያ
bot.hears('🛒 P2P ገበያ (Market)', async (ctx) => {
    if (activeMarketAds.length === 0) return ctx.reply('🔍 በአሁኑ ሰዓት የወጣ የ P2P ማስታወቂያ የለም።');
    await ctx.reply('📈 የቀጥታ የ P2P ማስታወቂያዎች ዝርዝር፦');
    for (const ad of activeMarketAds) {
        let adText = `📢 *ማስታወቂያ (Ad ID: ${ad.id})*\n👤 *አቅራቢ:* ${ad.creatorName}\n🔄 *ዓይነት:* ${ad.type === 'BUY' ? '🟢 መግዛት ይፈልጋል' : '🔴 መሸጥ ይፈልጋል'}\n🪙 *መጠን:* ${ad.amount} USDT\n💵 *ዋጋ:* ${ad.rate} ETB/USDT\n🏦 *ባንክ:* ${ad.bank}`;
        await ctx.replyWithMarkdown(adText, Markup.inlineKeyboard([[Markup.button.callback('🤝 ንግድ ጀምር (Trade Now)', `TRADE_START_${ad.id}`)]]));
    }
});

bot.hears('📢 ማስታወቂያ ልጠፍ (Post Ad)', async (ctx) => {
    userSessions[ctx.chat.id] = { step: 'WAITING_AD_TYPE' };
    await ctx.reply('🔄 የምርጫ ዓይነት ይምረጡ፦', Markup.inlineKeyboard([
        [Markup.button.callback('🟢 መግዛት እፈልጋለሁ (BUY)', 'SET_AD_BUY'), Markup.button.callback('🔴 መሸጥ እፈልጋለሁ (SELL)', 'SET_AD_SELL')]
    ]));
});

bot.action(/^SET_AD_(BUY|SELL)\$/, async (ctx) => {
    const type = ctx.match[1];
    userSessions[ctx.chat.id] = { step: 'WAITING_AD_AMOUNT', newAd: { type: type, creatorId: ctx.chat.id, creatorName: ctx.from.first_name || 'ተጠቃሚ' } };
    await ctx.answerCbQuery();
    await ctx.reply(`🪙 የ *USDT መጠን* በቁጥር ብቻ ያስገቡ፦`);
});

// 🤝 የቀጥታ ቻት
bot.action(/^TRADE_START_(.+)\$/, async (ctx) => {
    const adId = ctx.match[1];
    const buyerChatId = ctx.chat.id;
    const ad = activeMarketAds.find(a => String(a.id) === String(adId));
    if (!ad) return ctx.answerCbQuery('⚠️ ማስታወቂያው የለም።');
    if (String(ad.creatorId) === String(buyerChatId)) return ctx.answerCbQuery('⚠️ የራስዎ ማስታወቂያ!');
    const sellerChatId = ad.creatorId;
    activeP2pChats[buyerChatId] = { targetId: sellerChatId, adId: adId };
    activeP2pChats[sellerChatId] = { targetId: buyerChatId, adId: adId };
    await ctx.answerCbQuery();
    await ctx.reply(`🤝 የ P2P ቻት ተጀምሯል! መልእክት መጻፍ ይችላሉ። ንግዱ ሲያልቅ '❌ ቻቱን ዝጋ' የሚለውን ይጫኑ።`, Markup.keyboard([['❌ ቻቱን ዝጋ']]).resize());
    await bot.telegram.sendMessage(sellerChatId, `🚨 አዲስ ነጋዴ ንግድ ጀምሯል! መልእክት መጻፍ ይችላሉ።`, Markup.keyboard([['❌ ቻቱን ዝጋ']]).resize());
});

bot.hears('💬 የንግድ ቻቶች (Active Chats)', async (ctx) => {
    if (activeP2pChats[ctx.chat.id]) await ctx.reply('💬 በአሁኑ ሰዓት ከነጋዴ ጋር ቀጥታ ቻት ላይ ነዎት።');
    else await ctx.reply('🔍 ምንም ንቁ የንግድ ቻት የለም።');
});

bot.hears('ℹ️ እርዳታና መረጃ (Help)', async (ctx) => {
    await ctx.reply('ℹ️ *ALLP2P የንግድ መርጃ*\n\n1. በ *የኔ ቦርሳ* ብር ያስገቡ።\n2. በ *P2P ገበያ* ይገበያዩ።', mainInterfaceMenu(ctx));
});

// 📥 TEXT HANDLER
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const messageText = ctx.message.text.trim();
    const session = userSessions[chatId] || { step: 'IDLE' };

    if (activeP2pChats[chatId]) {
        if (messageText === '❌ ቻቱን ዝጋ') {
            const targetChatId = activeP2pChats[chatId].targetId;
            delete activeP2pChats[chatId]; delete activeP2pChats[targetChatId];
            await ctx.reply('❌ የ P2P ንግድ ቻቱ ተዘግቷል።', mainInterfaceMenu(ctx));
            await bot.telegram.sendMessage(targetChatId, '❌ ነጋዴው ቻቱን ዘግቶታል።', mainInterfaceMenu(bot));
            return;
        }
        await bot.telegram.sendMessage(activeP2pChats[chatId].targetId, `💬 ነጋዴ፡ ${messageText}`);
        return;
    }

    if (session.step === 'WAITING_DEPOSIT_AMOUNT') {
        const amount = parseFloat(messageText);
        if (isNaN(amount) || amount <= 0) return ctx.reply('⚠️ በቁጥር ብቻ ያስገቡ፦');
        userSessions[chatId] = { step: 'IDLE' };
        await ctx.reply('⏳ የ Chapa የክፍያ ሊንክ እየተፈጠረ ነው...');
        const tx_ref = `allp2p-${chatId}-${Date.now()}`;
        try {
            const response = await axios.post('https://chapa.co', {
                amount: amount, currency: 'ETB', email: 'payment@allp2p.com',
                first_name: ctx.from.first_name || 'User', last_name: 'P2P', tx_ref: tx_ref,
                callback_url: 'https://vercel.app',
                customization: { title: "ALLP2P Deposit", description: `${amount} ETB ክፍያ` }
            }, { headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` } });

            if (response.data.status === 'success') {
                await ctx.reply(`🔗 በቻፓ ለመክፈል ይህንን ሊንክ ይጫኑ፦\n\n${response.data.data.checkout_url}`);
            } else {
                await ctx.reply('⚠️ ሊንክ መፍጠር አልተቻለም።');
            }
        } catch (err) {
            await ctx.reply('❌ ከቻፓ ሰርቨር ጋር መገናኘት አልተቻለም።');
        }
        return;
    }

    if (session.step === 'WAITING_WITHDRAW_AMOUNT') {
        const amount = parseFloat(messageText);
        if (isNaN(amount) || amount <= 0) return ctx.reply('⚠️ በቁጥር ብቻ ያስገቡ፦');
        userSessions[chatId] = { step: 'WAITING_WITHDRAW_BANK', withdrawAmount: amount };
        await ctx.reply('🏦 የባንክ ስም እና የሂሳብ ቁጥር ይጻፉ፦');
        return;
    }

    if (session.step === 'WAITING_WITHDRAW_BANK') {
        userSessions[chatId] = { step: 'IDLE' };
        await ctx.reply('⏳ የገንዘብ ማውጫ ጥያቄዎ ለአድሚን ተልኳል።');
        await bot.telegram.sendMessage(OWNER_ADMIN_CHAT_ID, `🚨 *አዲስ ማውጫ ጥያቄ*\n\n👤 ID: \`\${chatId}\`\n💰 መጠን: *${session.withdrawAmount} ETB*\n🏦 ባንክ: ${messageText}`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback('✅ Approve', `WITHDRAW_APPROVE_${chatId}`), Markup.button.callback('❌ Reject', `WITHDRAW_REJECT_${chatId}`)]])
        });
        return;
    }

    if (session.step === 'WAITING_AD_AMOUNT') {
        const amount = parseFloat(messageText);
        if (isNaN(amount) || amount <= 0) return ctx.reply('⚠️ በቁጥር ብቻ ያስገቡ፦');
        session.newAd.amount = amount; session.step = 'WAITING_AD_RATE';
        await ctx.reply('💵 የ 1 USDT ተመን በብር ያስገቡ (ምሳሌ: 125)፦');
        return;
    }

    if (session.step === 'WAITING_AD_RATE') {
        const rate = parseFloat(messageText);
        if (isNaN(rate) || rate <= 0) return ctx.reply('⚠️ በቁጥር ብቻ ያስገቡ፦');
        session.newAd.rate = rate; session.step = 'WAITING_AD_BANK';
        await ctx.reply('🏦 የሚጠቀሙበትን የባንክ ስም ይጻፉ፦');
        return;
    }

    if (session.step === 'WAITING_AD_BANK') {
        session.newAd.bank = messageText; session.newAd.id = Date.now();
        activeMarketAds.push(session.newAd); userSessions[chatId] = { step: 'IDLE' };
        await ctx.reply('🎉 የእርስዎ ማስታወቂያ ገበያው ላይ ወጥቷል።', mainInterfaceMenu(ctx));
        return;
    }
});

// 🚀 Start Web Server for Render
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('ALLP2P Bot is Running Live 24/7!'));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

bot.launch().then(() => console.log('🚀 Cloud Bot Started!'));
