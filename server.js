import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());

// Store live data
let liveStats = {
  players: 0,
  visits: 0,
  likes: "—",
  updated: "—",
  lastPing: null
};

// Cache last response (so iframe always gets something instantly)
let cachedResponse = { ...liveStats };

// Roblox stats update function
async function updateRobloxStats() {
  try {
    const gameId = 3315889719; // Boston Bus Simulator
    const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${gameId}`);
    const data = await res.json();
    const info = data.data[0];
    const visits = info.visits;
    const updated = new Date(info.updated).toLocaleDateString();

    const votesRes = await fetch(`https://games.roblox.com/v1/games/votes?universeIds=${gameId}`);
    const votesData = await votesRes.json();
    const v = votesData.data[0];
    const ratio = Math.round((v.upVotes / (v.upVotes + v.downVotes)) * 100) + "%";

    liveStats.visits = visits;
    liveStats.likes = ratio;
    liveStats.updated = updated;
    cachedResponse = { ...liveStats, players: liveStats.players }; // update cache
    console.log("✅ Roblox stats refreshed");
  } catch (err) {
    console.error("❌ Failed to get Roblox stats:", err);
  }
}

// Run once at start and then every 24h
updateRobloxStats();
setInterval(updateRobloxStats, 24 * 60 * 60 * 1000);

// Roblox game POSTs player count
app.post("/update", (req, res) => {
  const { players } = req.body;
  if (typeof players === "number") {
    liveStats.players = players;
    liveStats.lastPing = new Date().toISOString();
    cachedResponse.players = players; // update cache
    return res.json({ ok: true });
  }
  res.status(400).json({ ok: false });
});

// Iframe GETs cached stats instantly
app.get("/stats", (req, res) => res.json(cachedResponse));

// Start server
app.listen(8080, () => console.log("✅ BBS Stats Server running on port 8080"));
