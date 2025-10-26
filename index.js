import express from "express";
import cron from "node-cron";
import fetch from "node-fetch";
import { GoogleAuth } from "google-auth-library";

const app = express();
app.use(express.json());

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

// 🌐 Base URL repo kamu (ganti <username> jadi username GitHub kamu)
const BASE_URL = "https://raw.githubusercontent.com/trishaland/trishaland-notifier/main/";

// ✨ Random message pool (10 variasi tiap kategori)
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

// 🎴 Ambil gambar random sesuai kategori
function getRandomImage(type) {
  const num = Math.floor(Math.random() * 15) + 1; // dari 1–15
  if (type === "sarapan") return `${BASE_URL}sarapan${num}.jpg`;
  if (type === "sabtu") return `${BASE_URL}sabtu${num}.jpg`;
  if (type === "sore") return `${BASE_URL}sore${num}.jpg`;
  return `${BASE_URL}sarapan1.jpg`;
}

// 🗨️ Ambil pesan random sesuai kategori
function getRandomMessage(type) {
  const pool = messages[type] || ["Hai dari Trisha! 💙"];
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

// ✅ Endpoint simpan token
app.post("/save-token", (req, res) => {
  const { token } = req.body;
  if (token && !userTokens.includes(token)) {
    userTokens.push(token);
  }
  res.json({ success: true, total: userTokens.length });
});

// 🔔 Kirim notifikasi
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
            fcm_options: {
              link: "https://trishaland.github.io/home/"
            }
          }
        }
      };

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

// 🕒 Jadwal otomatis
// Sarapan → tiap hari 06:00
cron.schedule("0 6 * * *", () => {
  const img = getRandomImage("sarapan");
  const msg = getRandomMessage("sarapan");
  sendNotification("#SarapanFotoOshi 🍳", msg, img);
});

// Trishaturday → tiap Sabtu 06:00
cron.schedule("0 6 * * 6", () => {
  const img = getRandomImage("sabtu");
  const msg = getRandomMessage("sabtu");
  sendNotification("#Trishaturday ☀️", msg, img);
});

// TrishAfternoon → tiap hari 15:30
cron.schedule("30 15 * * *", () => {
  const img = getRandomImage("sore");
  const msg = getRandomMessage("sore");
  sendNotification("#TrishAfternoon 🍵", msg, img);
});

app.get("/", (req, res) => {
  res.send("🚀 TrishaLand Notifier aktif dan jalan normal!");
});

app.listen(3000, () => console.log("🚀 TrishaLand Notifier aktif di port 3000"));
