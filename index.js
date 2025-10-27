import express from "express";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json());

// 🩵 Izinkan request dari situs GitHub Pages kamu
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "https://trishaland.github.io");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// 🔒 Firebase credentials
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

const auth = new GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/firebase.messaging"],
});

// 🧠 Simpan token user sementara
let userTokens = [];

// 🌐 Base URL gambar di repo kamu
const BASE_URL = "https://raw.githubusercontent.com/trishaland/trishaland-notifier/main/";

// ✨ Pesan acak per kategori
const messages = {
  sarapan: [
    "Selamat pagi! Yuk sarapan bareng Trisha 💙",
    "Trisha udah makan belum ya? 🍳",
    "Mulai pagi dengan senyum dari Trisha ☀️",
    "Sarapan bareng Trisha biar semangat seharian 😍",
    "Trisha ngucapin selamat pagi buat kamu 💫",
    "Hari baru, semangat baru bareng Trisha 🌞",
    "Trisha siap nemenin pagimu yang indah 💕",
    "Bangun yuk! Trisha udah siap senyum pagi ini 😄",
    "Senyum Trisha bisa jadi sarapan paling manis 💋",
    "Pagi gak lengkap tanpa Trisha, setuju? ☕"
  ],
  sabtu: [
    "Selamat #Trishaturday! Waktunya healing bareng Trisha 🌸",
    "Weekend vibes with Trisha 💖",
    "Hari Sabtu = Hari Trisha 😎",
    "Trishaturday lagi, yuk lihat senyum Trisha ☀️",
    "Sambut Sabtu ceria bareng Trisha 💕",
    "Sabtu ini Trisha cerah banget, kayak mood kamu ✨",
    "Weekend ditemani Trisha, siapa yang nolak? 💫",
    "Hari libur = waktu buat Trisha 😍",
    "Trisha ngucapin selamat menikmati Sabtu 🎶",
    "Sabtu ini vibes-nya Trisha banget 💙"
  ],
  sore: [
    "Sore santai bareng Trisha? 🍵",
    "Golden hour-nya Trisha 💛",
    "Waktunya #TrishAfternoon! 🌇",
    "Trisha nyapa kamu sore ini 🌼",
    "Sore yang tenang bareng Trisha 🌷",
    "Langit jingga + Trisha = combo sempurna 🌅",
    "Trisha bilang: jangan lupa istirahat ya 💖",
    "Waktunya teh hangat dan senyum Trisha ☕",
    "Trisha siap nemenin kamu nunggu senja 💫",
    "Sore ini Trisha manis banget, kayak kamu 😌"
  ]
};

// 🔄 Ambil gambar acak dari repo
function getRandomImage(type) {
  const num = Math.floor(Math.random() * 15) + 1;
  return `${BASE_URL}${type}${num}.jpg`;
}

// 🔄 Ambil pesan acak
function getRandomMessage(type) {
  const pool = messages[type] || ["Hai dari Trisha! 💙"];
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// ✅ Simpan token pengguna
app.post("/save-token", (req, res) => {
  const { token } = req.body;
  if (token && !userTokens.includes(token)) {
    userTokens.push(token);
  }
  res.json({ success: true, total: userTokens.length });
});

// 🔔 Kirim notifikasi FCM (versi fix)
async function sendNotification(title, body, imageUrl) {
  try {
    const accessToken = await auth.getAccessToken();
    const url = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;

    for (const token of userTokens) {
      const message = {
        message: {
          token,
          notification: {
            title,
            body,
            image: imageUrl
          },
          webpush: {
            notification: {
              title,
              body,
              icon: imageUrl || "https://trishaland.github.io/home/TrishaLand.webp",
              click_action: "https://trishaland.github.io/home/"
            },
            fcm_options: {
              link: "https://trishaland.github.io/home/"
            }
          }
        }
      };

      console.log("🧩 Message dikirim ke Firebase:", JSON.stringify(message, null, 2));

      await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(message)
      });
    }

    console.log(`📢 Notif terkirim: ${title} | ${imageUrl}`);
  } catch (error) {
    console.error("❌ Gagal kirim notifikasi:", error);
  }
}

// 🚀 Endpoint manual untuk tes notifikasi
app.get("/test-notif", async (req, res) => {
  const img = getRandomImage("sarapan"); // bisa diganti "sore" atau "sabtu"
  const msg = getRandomMessage("sarapan");
  await sendNotification("Tes Notifikasi 💙", msg, img);
  res.send("✅ Notifikasi test berhasil dikirim (cek browser kamu!)");
});

// 🕒 Endpoint otomatis dipanggil Cron
app.get("/", async (req, res) => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const day = now.getDay(); // 0 = Minggu, 6 = Sabtu

  console.log(`⏰ Dipanggil oleh Vercel Cron: ${hour}:${minute} | Hari ke-${day}`);

  // 06:00 setiap hari
  if (hour === 6 && minute === 0) {
    if (day === 6) {
      const img = getRandomImage("sabtu");
      const msg = getRandomMessage("sabtu");
      await sendNotification("#Trishaturday ☀️", msg, img);
    } else {
      const img = getRandomImage("sarapan");
      const msg = getRandomMessage("sarapan");
      await sendNotification("#SarapanFotoOshi 🍳", msg, img);
    }
  }

  // 15:30 setiap hari
  if (hour === 15 && minute === 30) {
    const img = getRandomImage("sore");
    const msg = getRandomMessage("sore");
    await sendNotification("#TrishAfternoon 🍵", msg, img);
  }

  res.send("🚀 TrishaLand Notifier aktif dan otomatis sesuai jadwal!");
});

export default app;
