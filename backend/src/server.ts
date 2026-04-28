import express from "express";
import cors from "cors";
import { loadConfig } from "./configEngine";
import archiver from "archiver";
import path from "path";
import authRoutes from "./auth";
import { authMiddleware } from "./middleware/authMiddleware";
import multer from "multer";
import csv from "csv-parser";
import { sendNotification } from "./utils/notification";
import fs from "fs";
import { db } from "./db";

const app = express();
const upload = multer({ dest: "uploads/" });

// ✅ CORS (allow all for now, restrict later)
app.use(cors({
  origin: "*"
}));

app.use(express.json());

// 🔐 Auth routes
app.use("/auth", authRoutes);

// 🔧 Load config safely
const config = loadConfig();

if (!config || !config.models) {
  throw new Error("Invalid config: models missing");
}

// ✅ CONFIG ROUTE
app.get("/config", (req, res) => {
  res.json({
    ui: {
      pages: [
        { type: "form" },
        { type: "table" }
      ]
    },
    models: config.models
  });
});


// 🔌 EXPORT PROJECT (ZIP)
app.get("/export-project", authMiddleware, async (req, res) => {
  try {
    const folderPath = path.join(__dirname, "..");

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=project.zip");

    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("error", (err) => {
      throw err;
    });

    archive.pipe(res);

    archive.glob("**/*", {
      cwd: folderPath,
      ignore: ["node_modules/**", "uploads/**"]
    });

    await archive.finalize();

    sendNotification("Project exported as ZIP");

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});


// 📊 CSV UPLOAD ROUTE
app.post(
  "/upload-csv/:model",
  authMiddleware,
  upload.single("file"),
  (req, res) => {
    const model = req.params.model;
    const table = model.toLowerCase();

    if (!config.models[model]) {
      return res.status(400).json({ error: "Invalid model" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.file;
    const results: any[] = [];

    fs.createReadStream(file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          for (const row of results) {
            await db.query(
              `INSERT INTO ${table} (data) VALUES ($1)`,
              [row]
            );
          }

          fs.unlinkSync(file.path);

          sendNotification(
            `CSV uploaded for ${model} with ${results.length} records`
          );

          res.json({
            message: "CSV uploaded successfully",
            rowsInserted: results.length
          });

        } catch (err) {
          console.error(err);
          res.status(500).json({ error: "DB insert failed" });
        }
      })
      .on("error", (err) => {
        console.error(err);
        res.status(500).json({ error: "CSV processing failed" });
      });
  }
);


// 🔁 Dynamic CRUD routes
Object.keys(config.models).forEach((model) => {
  const table = model.toLowerCase();

  app.post(`/api/${model}`, authMiddleware, async (req, res) => {
    try {
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "Empty request body" });
      }

      await db.query(
        `INSERT INTO ${table} (data) VALUES ($1)`,
        [req.body]
      );

      sendNotification(`${model} created successfully`);

      res.json({
        message: `${model} created`,
        data: req.body
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "DB error" });
    }
  });

  app.get(`/api/${model}`, authMiddleware, async (req, res) => {
    try {
      const result = await db.query(`SELECT * FROM ${table}`);
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "DB error" });
    }
  });
});


// ❌ 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});


// 🔥 Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error("🔥 Global Error:", err);
  res.status(500).json({ error: "Something went wrong" });
});


// 🚀 DEPLOY FIX (VERY IMPORTANT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  sendNotification("Server started");
});