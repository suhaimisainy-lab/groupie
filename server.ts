import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiInstance: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured yet. Server will use local smart algorithms.");
      return null;
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Visual Quiz Questions Database
const QUIZ_QUESTIONS = [
  {
    id: "q1",
    imageSrc: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80",
    question: "Waking up to mountain mists or ocean waves?",
    optionYes: "Ocean waves at sunrise",
    optionNo: "Chilly alpine mountain peak",
    yesCategory: "Beach",
    noCategory: "Mountain"
  },
  {
    id: "q2",
    imageSrc: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=600&q=80",
    question: "Exploring underground subway systems and grand museums or hiking backcountry trails?",
    optionYes: "Vibrant city sidewalks and subway grids",
    optionNo: "Dense redwood forests and hiking trails",
    yesCategory: "Urban",
    noCategory: "Nature"
  },
  {
    id: "q3",
    imageSrc: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    question: "Splurging on a Michelin-star multi-course tasting menu or discovering hidden street food alleyways?",
    optionYes: "Elegant fine dining & table service",
    optionNo: "Aromatic street snacks on plastic stools",
    yesCategory: "Luxury",
    noCategory: "Budget"
  },
  {
    id: "q4",
    imageSrc: "https://images.unsplash.com/photo-1533240332313-0db49b439ad3?auto=format&fit=crop&w=600&q=80",
    question: "Adrenaline-filled bungee jumping and off-road driving or peaceful spa visits and vineyard strolls?",
    optionYes: "High-adrenaline canyon swing",
    optionNo: "Mineral thermal spa and massage",
    yesCategory: "Adventure",
    noCategory: "Relaxation"
  },
  {
    id: "q5",
    imageSrc: "https://images.unsplash.com/photo-1518638150341-db706ac4024c?auto=format&fit=crop&w=600&q=80",
    question: "Uncovering ancient ruins with a private historian or attending a high-energy live concert and nightlife?",
    optionYes: "UNESCO heritage temples and guides",
    optionNo: "Underground bar crawling and live bands",
    yesCategory: "Culture",
    noCategory: "Entertainment"
  },
  {
    id: "q6",
    imageSrc: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80",
    question: "A meticulously planned scheduled tour bus or hiring a Vespa to wander aimlessly?",
    optionYes: "An hour-by-hour booked itinerary",
    optionNo: "Following whatever dirt road looks fun",
    yesCategory: "Structured",
    noCategory: "Spontaneous"
  },
  {
    id: "q7",
    imageSrc: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
    question: "Sleek, futuristic design hotels or rustic eco-lodges with outdoor showers?",
    optionYes: "Modern architecture with room service",
    optionNo: "Bamboo frame lodge in the canopy",
    yesCategory: "Luxury",
    noCategory: "Relaxation"
  },
  {
    id: "q8",
    imageSrc: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80",
    question: "Shopping at high-end designer boutiques or hunting for vintage treasures at a flea market?",
    optionYes: "Polished air-conditioned luxury shops",
    optionNo: "Dusty maps and vintage leather jackets",
    yesCategory: "Luxury",
    noCategory: "Budget"
  }
];

import os from "os";

// Find a writable database path. Let's start with the standard path.
let DB_FILE = path.join(process.cwd(), "groupie_db.json");

// Determine if the standard path is writable or if we should use /tmp
try {
  if (fs.existsSync(DB_FILE)) {
    fs.accessSync(DB_FILE, fs.constants.W_OK);
  } else {
    const testPath = path.join(process.cwd(), ".g_write_test_" + Math.random().toString(36).substring(7));
    fs.writeFileSync(testPath, "test_write");
    fs.unlinkSync(testPath);
  }
  console.log("Database path is writable: " + DB_FILE);
} catch (e) {
  const tempDb = path.join(os.tmpdir(), "groupie_db.json");
  console.warn(`Standard database path is not writable. Redirecting DB writes to writable fallback: ${tempDb}. Error:`, e);
  
  // If we had a pre-seeded DB in the read-only working directory, copy it to the writable path so data is preserved!
  try {
    const originalDbPath = path.join(process.cwd(), "groupie_db.json");
    if (fs.existsSync(originalDbPath)) {
      fs.copyFileSync(originalDbPath, tempDb);
      console.log("Successfully copied pre-seeded database to writable tmp location:", tempDb);
    }
  } catch (copyErr) {
    console.warn("Failed to copy pre-seeded database to tmp location:", copyErr);
  }
  
  DB_FILE = tempDb;
}

// Global in-memory DB cache to ensure stability and consistent cross-request state
let inMemoryDB: any = null;

function readDB() {
  if (inMemoryDB) {
    if (!Array.isArray(inMemoryDB.users)) inMemoryDB.users = [];
    if (!Array.isArray(inMemoryDB.trips)) inMemoryDB.trips = [];
    return inMemoryDB;
  }

  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (!Array.isArray(parsed.trips)) parsed.trips = [];
        inMemoryDB = parsed;
        return inMemoryDB;
      }
    }
  } catch (err) {
    console.error("DB reading error from DB_FILE", err);
  }

  // Fallback read: check the original path if DB_FILE was redirected but copy/read failed
  try {
    const originalDbPath = path.join(process.cwd(), "groupie_db.json");
    if (fs.existsSync(originalDbPath)) {
      const raw = fs.readFileSync(originalDbPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (!Array.isArray(parsed.users)) parsed.users = [];
        if (!Array.isArray(parsed.trips)) parsed.trips = [];
        inMemoryDB = parsed;
        return inMemoryDB;
      }
    }
  } catch (err) {
    console.error("DB reading error from original path fallback", err);
  }

  // Fallback / Initial Database Seeds
  const defaultDB = {
    users: [
      {
        uid: "user-suhaimi",
        email: "SuhaimiSainy@gmail.com",
        name: "Suhaimi",
        provider: "google",
        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=suhaimi"
      },
      {
        uid: "user-anna",
        email: "anna.jones@example.com",
        name: "Anna Jones",
        provider: "google",
        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=anna"
      },
      {
        uid: "user-marcus",
        email: "marcus.k@example.com",
        name: "Marcus King",
        provider: "apple",
        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=marcus"
      },
      {
        uid: "user-sarah",
        email: "sarah.m@example.com",
        name: "Sarah Miller",
        provider: "google",
        avatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=sarah"
      }
    ],
    trips: [
      {
        id: "trip-amalfi",
        name: "Amalfi Summer Escape",
        destination: "Amalfi Coast, Italy",
        description: "Celebrating our squad trip with pizza, Vespa rides, beaches, and stunning cliffside sunset dinners.",
        organiserId: "user-suhaimi",
        organiserName: "Suhaimi",
        deadline: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 16), // 3 days layout
        status: "gathering",
        invites: ["SuhaimiSainy@gmail.com", "anna.jones@example.com", "marcus.k@example.com", "sarah.m@example.com", "chelsea.visitor@example.com"],
        preferences: [
          {
            userId: "user-suhaimi",
            email: "SuhaimiSainy@gmail.com",
            name: "Suhaimi",
            responses: { q1: "yes", q2: "yes", q3: "no", q4: "no", q5: "yes", q6: "no", q7: "yes", q8: "no" },
            profile: { Beach: 100, Urban: 100, Budget: 100, Relaxation: 100, Culture: 100, Spontaneous: 100, Luxury: 50 },
            submittedAt: new Date(Date.now() - 3600000 * 5).toISOString()
          },
          {
            userId: "user-anna",
            email: "anna.jones@example.com",
            name: "Anna Jones",
            responses: { q1: "yes", q2: "no", q3: "no", q4: "no", q5: "yes", q6: "no", q7: "no", q8: "no" },
            profile: { Beach: 100, Nature: 100, Budget: 100, Relaxation: 100, Culture: 100, Spontaneous: 100 },
            submittedAt: new Date(Date.now() - 3600000 * 2).toISOString()
          },
          {
            userId: "user-marcus",
            email: "marcus.k@example.com",
            name: "Marcus King",
            responses: { q1: "yes", q2: "yes", q3: "yes", q4: "no", q5: "yes", q6: "no", q7: "yes", q8: "yes" },
            profile: { Beach: 100, Urban: 100, Luxury: 100, Relaxation: 100, Culture: 100, Spontaneous: 100 },
            submittedAt: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        consensusThreshold: 75,
        consensusReached: false,
        consensusScore: 0,
        categoryScores: {},
        generatedItinerary: null,
        comments: [],
        votes: {},
        chatMessages: [
          { id: "msg-1", userId: "user-suhaimi", userName: "Suhaimi", text: "Hey everyone! Please answer the visual quiz ASAP so we can see what kind of traveler archetype rules our group! Currently, we're heavy on coastal chill.", createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
          { id: "msg-2", userId: "user-anna", userName: "Anna Jones", text: "Done! Definitely voting for coastal and slow strolls.", createdAt: new Date(Date.now() - 3600000 * 2).toISOString() }
        ],
        flaggedForLater: []
      },
      {
        id: "trip-tokyo",
        name: "Tokyo Cyber Culinary Quest",
        destination: "Tokyo, Japan",
        description: "Salty ramen bowls, teamLab digital art grids, themed bar arcades, and historic Shinto shrine walks.",
        organiserId: "user-anna",
        organiserName: "Anna Jones",
        deadline: new Date(Date.now() - 86400000).toISOString().slice(0, 16), // Already passed/ready
        status: "review",
        invites: ["SuhaimiSainy@gmail.com", "anna.jones@example.com", "marcus.k@example.com", "sarah.m@example.com"],
        preferences: [
          {
            userId: "user-suhaimi",
            email: "SuhaimiSainy@gmail.com",
            name: "Suhaimi",
            responses: { q1: "no", q2: "yes", q3: "no", q4: "yes", q5: "no", q6: "no", q7: "yes", q8: "no" },
            profile: { Mountain: 100, Urban: 100, Budget: 100, Adventure: 100, Entertainment: 100, Spontaneous: 100, Luxury: 50 },
            submittedAt: new Date(Date.now() - 3600000 * 24).toISOString()
          },
          {
            userId: "user-anna",
            email: "anna.jones@example.com",
            name: "Anna Jones",
            responses: { q1: "no", q2: "yes", q3: "no", q4: "yes", q5: "yes", q6: "no", q7: "yes", q8: "no" },
            profile: { Mountain: 100, Urban: 100, Budget: 100, Adventure: 100, Culture: 100, Spontaneous: 100, Luxury: 50 },
            submittedAt: new Date(Date.now() - 3600000 * 23).toISOString()
          },
          {
            userId: "user-marcus",
            email: "marcus.k@example.com",
            name: "Marcus King",
            responses: { q1: "no", q2: "yes", q3: "yes", q4: "yes", q5: "yes", q6: "no", q7: "yes", q8: "no" },
            profile: { Mountain: 100, Urban: 100, Luxury: 100, Adventure: 100, Culture: 100, Spontaneous: 100, Budget: 50 },
            submittedAt: new Date(Date.now() - 3600000 * 22).toISOString()
          },
          {
            userId: "user-sarah",
            email: "sarah.m@example.com",
            name: "Sarah Miller",
            responses: { q1: "no", q2: "yes", q3: "no", q4: "yes", q5: "yes", q6: "no", q7: "yes", q8: "no" },
            profile: { Mountain: 100, Urban: 100, Budget: 100, Adventure: 100, Culture: 100, Spontaneous: 100, Luxury: 50 },
            submittedAt: new Date(Date.now() - 3600000 * 21).toISOString()
          }
        ],
        consensusThreshold: 75,
        consensusReached: true,
        consensusScore: 88,
        categoryScores: { Urban: 100, Adventure: 100, Culture: 75, Spontaneous: 100, Luxury: 75, Mountain: 100 },
        comments: [
          { id: "com-1", userId: "user-suhaimi", userName: "Suhaimi", userAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=suhaimi", text: "Can we swap out the upscale Ginza shopping for Akihabara vintage gaming? I'd really prefer to look at retro GameBoy accessories!", createdAt: new Date(Date.now() - 3600000 * 12).toISOString() },
          { id: "com-2", userId: "user-marcus", userName: "Marcus King", userAvatar: "https://api.dicebear.com/7.x/pixel-art/svg?seed=marcus", text: "Agreed, let's substitute that Ginza bit. There's a retro arcade in Akihabara with a solid rating delta!", createdAt: new Date(Date.now() - 3600000 * 10).toISOString() }
        ],
        votes: {
          "user-suhaimi": "edit",
          "user-anna": "approve",
          "user-marcus": "edit",
          "user-sarah": "approve"
        },
        chatMessages: [],
        generatedItinerary: [
          {
            day: 1,
            date: "Day 1: Neon Highs",
            activities: [
              {
                id: "act-tokyo-1",
                time: "09:30 AM",
                title: "Senso-ji Ancient Temple Stroll",
                description: "Walk under the massive red lantern of Kaminarimon Gate and sample fresh melon pan pastry.",
                location: "Asakusa, Tokyo",
                rating: 4.8,
                reviewsCount: 1540,
                category: "Culture",
                recentRatingTrend: "up",
                ratingDelta: 0.2,
                reviews: [
                  { id: "rev-tok-1", author: "Kenji S.", comment: "Crowded but spiritually immense. Best early in the morning.", date: "2026-05-10", rating: 5, recentWeight: 1.2 },
                  { id: "rev-tok-2", author: "Airi T.", comment: "Beautiful architecture and great vibes near the market stalls.", date: "2026-05-18", rating: 4, recentWeight: 1.1 }
                ],
                fallbackOptions: [
                  {
                    id: "act-tokyo-1-fall",
                    time: "09:30 AM",
                    title: "Meiji Jingu Shrine and Forest Walk",
                    description: "Quiet stroll under giant cypress torii gates in the center of Yoyogi Park.",
                    location: "Harajuku, Tokyo",
                    rating: 4.7,
                    reviewsCount: 1200,
                    category: "Culture",
                    recentRatingTrend: "stable",
                    ratingDelta: 0.0,
                    reviews: []
                  }
                ]
              },
              {
                id: "act-tokyo-2",
                time: "02:00 PM",
                title: "Shibuya Sky Observatory Deck",
                description: "Breathtaking open-air rooftop views looking over the iconic Shibuya Crossing.",
                location: "Shibuya, Tokyo",
                rating: 4.9,
                reviewsCount: 920,
                category: "Urban",
                recentRatingTrend: "up",
                ratingDelta: 0.3,
                reviews: [
                  { id: "rev-tok-3", author: "John D.", comment: "Absolutely spectacular at sunset. Must book tickets in advance!", date: "2026-05-15", rating: 5, recentWeight: 1.4 }
                ],
                fallbackOptions: [
                  {
                    id: "act-tokyo-2-fall",
                    time: "02:00 PM",
                    title: "Tokyo Tower Main Observatory",
                    description: "Vintage retro observatory looking over the Tokyo skyline with classic orange framework.",
                    location: "Minato, Tokyo",
                    rating: 4.6,
                    category: "Urban",
                    reviewsCount: 810,
                    recentRatingTrend: "stable",
                    ratingDelta: 0.0,
                    reviews: []
                  }
                ]
              },
              {
                id: "act-tokyo-3",
                time: "07:00 PM",
                title: "Ginza Luxury Shopping Stroll",
                description: "Peruse stunning modern showrooms and sleek glass fashion houses with futuristic art curation.",
                location: "Ginza, Tokyo",
                rating: 4.4,
                reviewsCount: 650,
                category: "Luxury",
                recentRatingTrend: "down",
                ratingDelta: -0.4,
                reviews: [
                  { id: "rev-tok-4", author: "Yuki M.", comment: "Too high-end and sterile for a cozy wander. Mostly overpriced brands.", date: "2026-05-20", rating: 3, recentWeight: 1.0 }
                ],
                fallbackOptions: [
                  {
                    id: "act-tokyo-3-fall",
                    time: "07:00 PM",
                    title: "Akihabara Electric Town and Retro Arcade Tour",
                    description: "Dig into multi-story retro game stores and vintage electronics basements loaded with classic games.",
                    location: "Akihabara, Tokyo",
                    rating: 4.8,
                    reviewsCount: 2100,
                    category: "Spontaneous",
                    recentRatingTrend: "up",
                    ratingDelta: 0.5,
                    reviews: [
                      { id: "rev-tok-5", author: "GamerDude", comment: "The holy grail of golden era gaming. Found rare Super Famicom cartridges!", date: "2026-05-19", rating: 5, recentWeight: 1.5 }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        flaggedForLater: []
      },
      {
        id: "trip-bali",
        name: "Bali Wellness & Eco Canopy Retret",
        destination: "Ubud, Bali",
        description: "Mornings overlooking lush rice terrace canopies with healthy smoothies, yoga, and quiet spa treatments.",
        organiserId: "user-marcus",
        organiserName: "Marcus King",
        deadline: new Date(Date.now() - 86450000 * 5).toISOString().slice(0, 16),
        status: "finalized",
        invites: ["SuhaimiSainy@gmail.com", "anna.jones@example.com", "marcus.k@example.com", "sarah.m@example.com"],
        preferences: [
          {
            userId: "user-suhaimi",
            email: "SuhaimiSainy@gmail.com",
            name: "Suhaimi",
            responses: { q1: "no", q2: "no", q3: "no", q4: "no", q5: "yes", q6: "no", q7: "no", q8: "no" },
            profile: { Mountain: 100, Nature: 100, Budget: 100, Relaxation: 100, Culture: 100, Spontaneous: 100 },
            submittedAt: new Date(Date.now() - 3600000 * 30).toISOString()
          },
          {
            userId: "user-marcus",
            email: "marcus.k@example.com",
            name: "Marcus King",
            responses: { q1: "no", q2: "no", q3: "no", q4: "no", q5: "yes", q6: "no", q7: "no", q8: "no" },
            profile: { Mountain: 100, Nature: 100, Budget: 100, Relaxation: 100, Culture: 100, Spontaneous: 100 },
            submittedAt: new Date(Date.now() - 3600000 * 31).toISOString()
          }
        ],
        consensusThreshold: 75,
        consensusReached: true,
        consensusScore: 92,
        categoryScores: { Nature: 100, Relaxation: 100, Culture: 100, Spontaneous: 100, Budget: 100 },
        comments: [],
        votes: {},
        chatMessages: [],
        generatedItinerary: [
          {
            day: 1,
            date: "Day 1: Green Harmony",
            activities: [
              {
                id: "act-bali-1",
                time: "08:00 AM",
                title: "Tegalalang Rice Terrace Trek",
                description: "Wander through deep green terrace fields, capture the morning rays breaking through coconut trees.",
                location: "Ubud, Bali",
                rating: 4.8,
                reviewsCount: 3450,
                category: "Nature",
                recentRatingTrend: "stable",
                ratingDelta: 0.1,
                reviews: []
              },
              {
                id: "act-bali-2",
                time: "11:30 AM",
                title: "Sacred Monkey Forest Sanctuary Walk",
                description: "Observe friendly grey macaques amidst ancient stone temples and moss-covered banyan trees.",
                location: "Ubud, Bali",
                rating: 4.5,
                reviewsCount: 1800,
                category: "Culture",
                recentRatingTrend: "stable",
                ratingDelta: 0.0,
                reviews: []
              }
            ]
          }
        ],
        flaggedForLater: []
      }
    ]
  };

  inMemoryDB = defaultDB;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDB, null, 2), "utf-8");
  } catch (err) {
    console.error("DB seeding write error", err);
  }
  return defaultDB;
}

function writeDB(data: any) {
  inMemoryDB = data;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("DB writing error to disk, cached in-memory", err);
  }
}

// ---------------- API ENDPOINTS ----------------

// Fetch Visual Quiz parameters
app.get("/api/quiz-questions", (req, res) => {
  res.json(QUIZ_QUESTIONS);
});

// Authentication endpoint (secure Apple / Google simulation)
app.post("/api/auth/signin", (req, res) => {
  const { email, name, provider, avatar } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required for authentication." });
  }

  const db = readDB();
  let existingUser = db.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());

  if (!existingUser) {
    existingUser = {
      uid: "user-" + Math.random().toString(36).substring(2, 11),
      email,
      name: name || email.split("@")[0],
      provider: provider || "google",
      avatar: avatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${email.split("@")[0]}`
    };
    db.users.push(existingUser);
    writeDB(db);
  }

  res.json(existingUser);
});

// Fetch all trips for a signed-in user
app.get("/api/trips", (req, res) => {
  const email = (req.query.email as string || "").toLowerCase();
  const db = readDB();

  if (!email) {
    return res.json([]);
  }

  // A traveller is allowed to see the trip if they are in the invited list, the preferred list, or if they are the organiser
  const matchedTrips = db.trips.filter((t: any) => {
    if (!t) return false;
    const isOrganiser = t.organiserId && t.organiserId === req.query.uid;
    const isInvited = Array.isArray(t.invites) && t.invites.some((inv: any) => typeof inv === 'string' && inv.toLowerCase() === email);
    const hasPreference = Array.isArray(t.preferences) && t.preferences.some((p: any) => p && typeof p.email === 'string' && p.email.toLowerCase() === email);
    return isOrganiser || isInvited || hasPreference;
  });

  res.json(matchedTrips);
});

// Sync local client-side trips with server-side database (serverless resiliency)
app.post("/api/trips/sync", (req, res) => {
  try {
    const { trips: clientTrips } = req.body;
    if (!Array.isArray(clientTrips)) {
      return res.status(400).json({ error: "Invalid sync format" });
    }

    const db = readDB();
    let modified = false;

    for (const ct of clientTrips) {
      if (!ct || !ct.id) continue;
      const index = db.trips.findIndex((t: any) => t.id === ct.id);
      if (index === -1) {
        db.trips.push(ct);
        modified = true;
      } else {
        // If the client trip is newer, or has more preferences / comments / chat messages, update it!
        const serverTrip = db.trips[index];
        const clientPrefCount = Array.isArray(ct.preferences) ? ct.preferences.length : 0;
        const serverPrefCount = Array.isArray(serverTrip.preferences) ? serverTrip.preferences.length : 0;
        
        const clientChatCount = Array.isArray(ct.chatMessages) ? ct.chatMessages.length : 0;
        const serverChatCount = Array.isArray(serverTrip.chatMessages) ? serverTrip.chatMessages.length : 0;

        if (clientPrefCount > serverPrefCount || clientChatCount > serverChatCount || (ct.consensusReached && !serverTrip.consensusReached)) {
          db.trips[index] = { ...serverTrip, ...ct };
          modified = true;
        }
      }
    }

    if (modified) {
      writeDB(db);
    }

    res.json({ success: true, count: db.trips.length });
  } catch (err: any) {
    console.error("Sync error in POST /api/trips/sync:", err);
    res.status(500).json({ error: err.message || err });
  }
});

// Create new trip
app.post("/api/trips", (req, res) => {
  try {
    const { name, destination, description, organiserId, organiserName, invites, deadline } = req.body;
    console.log("POST /api/trips payload received:", { name, destination, description, organiserId, organiserName, invites, deadline });
    
    if (!name || !destination) {
      console.warn("POST /api/trips validation failed: Missing fields", { name, destination });
      return res.status(400).json({ error: `Missing required fields (name, destination). Received name: "${name}", destination: "${destination}".` });
    }

    // Auto-heal empty or undefined organiserId/organiserName
    let resolvedOrganiserId = organiserId;
    if (!resolvedOrganiserId || resolvedOrganiserId === "undefined" || resolvedOrganiserId === "null") {
      const alias = (organiserName || "guest").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      resolvedOrganiserId = "user-" + (alias || "suhaimi");
    }
    const safeOrganiserName = organiserName || "Organiser";

    const db = readDB();
    const safeInvites = Array.isArray(invites) ? invites : [];
    
    const newTrip = {
      id: "trip-" + Math.random().toString(36).substring(2, 11),
      name,
      destination,
      description: description || "",
      organiserId: resolvedOrganiserId,
      organiserName: safeOrganiserName,
      deadline: deadline || new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16),
      status: "gathering",
      invites: Array.from(new Set([safeOrganiserName + "@example.com", ...safeInvites])),
      preferences: [],
      consensusThreshold: 75,
      consensusReached: false,
      consensusScore: 0,
      categoryScores: {},
      generatedItinerary: null,
      comments: [],
      votes: {},
      chatMessages: [],
      flaggedForLater: []
    };

    if (!Array.isArray(db.trips)) {
      db.trips = [];
    }

    db.trips.push(newTrip);
    writeDB(db);

    console.log("POST /api/trips created trip successfully:", newTrip.id);
    return res.json(newTrip);
  } catch (err: any) {
    console.error("POST /api/trips internal error:", err);
    return res.status(500).json({ error: `Server failed to insert new trip: ${err.message || err}` });
  }
});

// Add traveler invite
app.post("/api/trips/:id/invite", (req, res) => {
  const { id } = req.params;
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  const emailsList = db.trips[tripIndex].invites || [];
  if (!emailsList.includes(email)) {
    emailsList.push(email);
    db.trips[tripIndex].invites = emailsList;
    writeDB(db);
  }

  res.json(db.trips[tripIndex]);
});

// Submit visual quiz preferences
app.post("/api/trips/:id/preferences", (req, res) => {
  const { id } = req.params;
  const { userId, email, name, responses } = req.body;

  if (!userId || !responses) {
    return res.status(400).json({ error: "Missing userId or quiz responses." });
  }

  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  // Calculate percentages based on responses
  const profile: { [category: string]: number } = {};
  const incrementCategory = (cat: string) => {
    profile[cat] = (profile[cat] || 0) + 1;
  };

  for (const q of QUIZ_QUESTIONS) {
    const answeredYes = responses[q.id] === "yes";
    if (answeredYes) {
      incrementCategory(q.yesCategory);
    } else {
      incrementCategory(q.noCategory);
    }
  }

  // Scale scores out of 100 (assuming categories can appear multiple times)
  // Max questions answered is 8. Let's make it normalized.
  const categoriesList = ["Beach", "Mountain", "Urban", "Nature", "Luxury", "Budget", "Adventure", "Relaxation", "Culture", "Entertainment", "Structured", "Spontaneous"];
  const finalProfile: { [category: string]: number } = {};
  categoriesList.forEach(cat => {
    const rawValue = profile[cat] || 0;
    if (rawValue > 0) {
      finalProfile[cat] = Math.round((rawValue / 2) * 100); // normalized
    }
  });

  const preference = {
    userId,
    email,
    name,
    responses,
    profile: finalProfile,
    submittedAt: new Date().toISOString()
  };

  const existingPrefIndex = db.trips[tripIndex].preferences.findIndex((p: any) => p.userId === userId);
  if (existingPrefIndex !== -1) {
    db.trips[tripIndex].preferences[existingPrefIndex] = preference;
  } else {
    db.trips[tripIndex].preferences.push(preference);
  }

  writeDB(db);
  res.json(db.trips[tripIndex]);
});

// Generate consensus analysis and suggested itinerary using Gemini (with smart fallback if key lacks)
app.post("/api/trips/:id/generate", async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  const trip = db.trips[tripIndex];
  const totalTravelers = trip.preferences.length;
  if (totalTravelers === 0) {
    return res.status(400).json({ error: "Cannot generate consensus without traveler preferences." });
  }

  // 1. Analyze category percentages across travelers
  const totals: { [category: string]: number } = {};
  trip.preferences.forEach((pref: any) => {
    Object.keys(pref.profile).forEach((cat) => {
      totals[cat] = (totals[cat] || 0) + pref.profile[cat];
    });
  });

  const categoryScores: { [category: string]: number } = {};
  Object.keys(totals).forEach((cat) => {
    categoryScores[cat] = Math.round(totals[cat] / totalTravelers);
  });

  // Calculate consensus percentage (highest overlaps of core categories)
  // If we have several high scoring categories, consensus is strong
  const highScores = Object.values(categoryScores).filter(s => s >= 60);
  const consensusScore = highScores.length > 0 
    ? Math.round(highScores.reduce((a, b) => a + b, 0) / highScores.length) 
    : 50;

  const threshold = trip.consensusThreshold || 75;
  const consensusReached = consensusScore >= threshold;

  trip.consensusScore = consensusScore;
  trip.consensusReached = consensusReached;
  trip.categoryScores = categoryScores;

  // 2. Generate custom itinerary items
  const sortedCategories = Object.keys(categoryScores).sort((a, b) => categoryScores[b] - categoryScores[a]);
  const primaryCategory = sortedCategories[0] || "Relaxation";
  const secondaryCategory = sortedCategories[1] || "Culture";

  const ai = getGeminiClient();
  let generatedItinerary = null;

  if (ai) {
    try {
      const prompt = `
Generate a structured, elegant 1-day travel itinerary with 3 distinct chronological activities in JSON format for a group traveling to "${trip.destination}" centered on these travel preferences: 
Core Categories: ${sortedCategories.slice(0, 3).join(", ")}.
Destination Context: ${trip.description}.
Is group in strong consensus? ${consensusReached ? "YES" : "NO"} (${consensusScore}% consensus on ${primaryCategory}).

If consensusReached is false, provide options where 1 or more activities have fallbacks reflecting split views (e.g. split between ${primaryCategory} and ${secondaryCategory}).

CRITICAL: Return strictly JSON matching the ItineraryDay[] schema.
Schema description:
ItineraryDay is an array:
[
  {
    "day": 1,
    "date": "Day 1: Title describing the vibe",
    "activities": [
      {
        "id": "act-unid-1",
        "time": "09:00 AM",
        "title": "Stretching/Morning activity name",
        "description": "Engaging description mentioning how this fits the categories",
        "location": "Address or specific spot",
        "rating": 4.8,
        "reviewsCount": 380,
        "recentRatingTrend": "up",
        "ratingDelta": 0.2,
        "category": "Culture",
        "reviews": [
          {
            "id": "rev-1",
            "author": "Local Guide",
            "comment": "Authentic and wonderful.",
            "date": "2026-05-18",
            "rating": 5,
            "recentWeight": 1.2
          }
        ],
        "fallbackOptions": [
          {
            "id": "act-unid-1-fall",
            "time": "09:00 AM",
            "title": "Alternative option for other half of group",
            "description": "Engaging fallback description",
            "location": "Fallback spot",
            "rating": 4.6,
            "reviewsCount": 210,
            "recentRatingTrend": "stable",
            "ratingDelta": 0.0,
            "category": "Nature"
          }
        ]
      }
    ]
  }
]
`;

      const geminiRes = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsed = JSON.parse(geminiRes.text.trim());
      if (Array.isArray(parsed)) {
        generatedItinerary = parsed;
      }
    } catch (err) {
      console.error("Gemini itinerary generation failed, falling back to local creator.", err);
    }
  }

  // Fallback programmatic generation if no API key or AI call failed
  if (!generatedItinerary) {
    // Curated local items for Amalfi, Tokyo and generalized destinations
    const destLower = trip.destination.toLowerCase();
    let sampleActivities = [];

    if (destLower.includes("amalfi")) {
      sampleActivities = [
        {
          id: "act-lh-1",
          time: "09:00 AM",
          title: "Scent of Amalfi: Morning Lemon Grove Walk",
          description: "Stroll through rich, terraced lemon orchards, taste freshly squeezed lemonade, and see traditional cultivation.",
          location: "Sentiero dei Limoni, Minori",
          rating: 4.8,
          reviewsCount: 420,
          category: "Nature",
          recentRatingTrend: "up",
          ratingDelta: 0.1,
          reviews: [
            { id: "rev-am-1", author: "Clara S.", comment: "Gorgeous yellow lemons against deep blue seas. Pure bliss!", date: "2026-05-14", rating: 5, recentWeight: 1.3 }
          ],
          fallbackOptions: [
            {
              id: "act-lh-1-fall",
              time: "09:00 AM",
              title: "Positano Cliff Lookout Ride by Vespa",
              description: "For the adventure seekers: rent private Vespas and cruise along the stunning coastal ring road.",
              location: "Amalfi Drive SS163",
              rating: 4.7,
              reviewsCount: 680,
              category: "Adventure",
              recentRatingTrend: "stable",
              ratingDelta: 0.0,
              reviews: []
            }
          ]
        },
        {
          id: "act-lh-2",
          time: "01:00 PM",
          title: "Fiordo di Furore Coastal Swimming Cove",
          description: "Float in emerald crystal water tucked between towering granite stone cliffs under the famous arched bridge.",
          location: "Furore Fiord, Amalfi",
          rating: 4.9,
          reviewsCount: 890,
          category: "Beach",
          recentRatingTrend: "up",
          ratingDelta: 0.3,
          reviews: [
            { id: "rev-am-2", author: "Mateo R.", comment: "Crowded post noon, but the bridge view while floating is breathtaking.", date: "2026-05-20", rating: 5, recentWeight: 1.2 }
          ],
          fallbackOptions: [
            {
              id: "act-lh-2-fall",
              time: "01:00 PM",
              title: "Michelin-Rated Beachfront Terrace Dining",
              description: "Splurge option: dynamic local seafood lunch with sea bass baked in salt under luxury umbrellas.",
              location: "Chez Black, Positano Beach",
              rating: 4.3,
              category: "Luxury",
              reviewsCount: 512,
              recentRatingTrend: "down",
              ratingDelta: -0.3,
              reviews: []
            }
          ]
        },
        {
          id: "act-lh-3",
          time: "06:00 PM",
          title: "Sunset Aperitivo at Franco's Bar",
          description: "Immaculate high-end ceramic tiles overlooking Positano's dramatic stack of pastel houses during golden sunset hours.",
          location: "Le Sirenuse, Positano",
          rating: 4.6,
          reviewsCount: 310,
          category: "Luxury",
          recentRatingTrend: "stable",
          ratingDelta: 0.0,
          reviews: [],
          fallbackOptions: [
            {
              id: "act-lh-3-fall",
              time: "06:00 PM",
              title: "Chill Limoncello Tasting & Local Pottery Crafting",
              description: "Budget/Culture option: learn how limoncello is hand-crafted and paint your own traditional ceramic plate.",
              location: "Ceramiche D'Andrea, Amalfi Town",
              rating: 4.7,
              reviewsCount: 190,
              category: "Culture",
              recentRatingTrend: "up",
              ratingDelta: 0.2,
              reviews: []
            }
          ]
        }
      ];
    } else {
      // General Destination fallback
      sampleActivities = [
        {
          id: "act-lh-gen1",
          time: "10:00 AM",
          title: "Historic Neighborhood Discovery Quest",
          description: `Immerse in local sights and neighborhood backalleys reflecting local ${primaryCategory} values.`,
          location: `${trip.destination} Center`,
          rating: 4.7,
          reviewsCount: 220,
          category: primaryCategory,
          recentRatingTrend: "stable",
          ratingDelta: 0.0,
          reviews: [
            { id: "rev-gen-1", author: "Jessica F.", comment: "Fascinating local walk!", date: "2026-05-11", rating: 5, recentWeight: 1.1 }
          ],
          fallbackOptions: [
            {
              id: "act-lh-gen1-fall",
              time: "10:00 AM",
              title: "Serene Nature Trek",
              description: `A fallback quiet experience tailored to group desires for ${secondaryCategory}.`,
              location: `Green Fields, ${trip.destination}`,
              rating: 4.5,
              reviewsCount: 140,
              category: secondaryCategory,
              recentRatingTrend: "stable",
              ratingDelta: 0.0,
              reviews: []
            }
          ]
        },
        {
          id: "act-lh-gen2",
          time: "02:30 PM",
          title: "Panoramic Highlights Scenic Overlook",
          description: "Catch absolute panoramic vistas of the destination and capture gorgeous memories.",
          location: `${trip.destination} Heights`,
          rating: 4.8,
          reviewsCount: 450,
          category: primaryCategory,
          recentRatingTrend: "up",
          ratingDelta: 0.2,
          reviews: []
        }
      ];
    }

    generatedItinerary = [
      {
        day: 1,
        date: `Day 1: Perfect ${consensusReached ? "Consensus" : "Compromise"} Vibe`,
        activities: sampleActivities
      }
    ];
  }

  trip.generatedItinerary = generatedItinerary;
  trip.status = "review"; // Shift to group review, comments, and vote

  db.trips[tripIndex] = trip;
  writeDB(db);

  res.json(trip);
});

// Applet comments additions
app.post("/api/trips/:id/comments", (req, res) => {
  const { id } = req.params;
  const { userId, userName, userAvatar, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: "Missing required comment data." });

  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  const newComment = {
    id: "com-" + Math.random().toString(36).substring(2, 11),
    userId,
    userName,
    userAvatar: userAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${userName}`,
    text,
    createdAt: new Date().toISOString()
  };

  db.trips[tripIndex].comments.push(newComment);
  writeDB(db);

  res.json(db.trips[tripIndex]);
});

// Vote response for review phase (approve or request edit)
app.post("/api/trips/:id/vote", (req, res) => {
  const { id } = req.params;
  const { userId, vote } = req.body; // vote can be: "approve" or "edit"
  if (!userId || !vote) return res.status(400).json({ error: "Missing vote data." });

  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  db.trips[tripIndex].votes = db.trips[tripIndex].votes || {};
  db.trips[tripIndex].votes[userId] = vote;

  // Let's check if all participants approved. If so, Organizer or system can finalize
  // Let's count approvals.
  const preferences = db.trips[tripIndex].preferences || [];
  const votersCount = Object.keys(db.trips[tripIndex].votes).length;

  // Auto transition to finalized if more than half approve and organizer finalizes
  // (We can trigger transition on finalize action API instead)

  writeDB(db);
  res.json(db.trips[tripIndex]);
});

// Finalize trip itinerary
app.post("/api/trips/:id/finalize", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  db.trips[tripIndex].status = "finalized";
  writeDB(db);

  res.json(db.trips[tripIndex]);
});

// Re-run Algorithm or Manual Solve
app.post("/api/trips/:id/rerun", (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  // Reset status to gathering preferences to allow people to update things, or just trigger regenerate
  db.trips[tripIndex].status = "gathering";
  writeDB(db);

  res.json(db.trips[tripIndex]);
});

// Flip decision pivot: Keep, Replace or Later
// Performs replacement of active itinerary item with its fallback
app.post("/api/trips/:id/pivot", (req, res) => {
  const { id } = req.params;
  const { activityId, decision, replacementId } = req.body; // decision: "keep", "replace", "later"

  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  const trip = db.trips[tripIndex];
  if (!trip.generatedItinerary) return res.status(400).json({ error: "No itinerary generated yet." });

  let foundItem: any = null;
  let dayIndex = -1;
  let activityIndex = -1;

  trip.generatedItinerary.forEach((day: any, dIdx: number) => {
    day.activities.forEach((act: any, aIdx: number) => {
      if (act.id === activityId) {
        foundItem = act;
        dayIndex = dIdx;
        activityIndex = aIdx;
      }
    });
  });

  if (!foundItem) return res.status(404).json({ error: "Activity not found." });

  if (decision === "replace") {
    // Replace with its fallback option
    const fallbacks = foundItem.fallbackOptions || [];
    const chosenFallback = replacementId 
      ? fallbacks.find((f: any) => f.id === replacementId)
      : fallbacks[0];

    if (chosenFallback) {
      // Swapping values
      const currentMain = { ...foundItem, fallbackOptions: undefined };
      const newMain = { 
        ...chosenFallback, 
        time: foundItem.time, // keep original scheduled slot time
        fallbackOptions: [currentMain, ...fallbacks.filter((f: any) => f.id !== chosenFallback.id)]
      };
      trip.generatedItinerary[dayIndex].activities[activityIndex] = newMain;
    }
  } else if (decision === "later") {
    // Flag for later: add to flagged list, remove or flag in main itinerary
    foundItem.isFlaggedLater = true;
    if (!trip.flaggedForLater.some((f: any) => f.id === foundItem.id)) {
      trip.flaggedForLater.push(foundItem);
    }
  } else if (decision === "keep") {
    foundItem.isFlaggedLater = false;
    trip.flaggedForLater = trip.flaggedForLater.filter((f: any) => f.id !== foundItem.id);
  }

  db.trips[tripIndex] = trip;
  writeDB(db);

  res.json(trip);
});

// Post chat message is an helpful feature
app.post("/api/trips/:id/chat", (req, res) => {
  const { id } = req.params;
  const { userId, userName, text } = req.body;
  if (!userId || !text) return res.status(400).json({ error: "Missing required chat data." });

  const db = readDB();
  const tripIndex = db.trips.findIndex((t: any) => t.id === id);
  if (tripIndex === -1) return res.status(404).json({ error: "Trip not found." });

  const newMessage = {
    id: "msg-" + Math.random().toString(36).substring(2, 11),
    userId,
    userName,
    text,
    createdAt: new Date().toISOString()
  };

  db.trips[tripIndex].chatMessages.push(newMessage);
  writeDB(db);

  res.json(db.trips[tripIndex]);
});

// Setup development or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Groupie full-stack server listening on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
