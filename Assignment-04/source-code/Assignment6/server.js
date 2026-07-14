import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import * as xlsx from "xlsx";
import cors from "cors";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API to handle Excel upload
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }


      const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      // Helper to find metadata values by label
      const findValue = (label) => {
        for (let r = 0; r < 12; r++) {
          if (!data[r]) continue;
          for (let c = 0; c < 20; c++) {
            const val = String(data[r][c] || "");
            if (val.toLowerCase().includes(label.toLowerCase())) {
              if (val.includes(":")) {
                const parts = val.split(":");
                if (parts[1] && parts[1].trim()) return parts[1].trim();
              }
              const nextVal = String(data[r][c + 1] || "").trim();
              if (nextVal) return nextVal;
              const nextNextVal = String(data[r][c + 2] || "").trim();
              if (nextNextVal) return nextNextVal;
            }
          }
        }
        return "";
      };

      // history endpoints removed (no database)
      const metadata = {
        department: findValue("Department") || "Computer Engineering",
        academicYear: findValue("Academic Year") || "2025-26",
        semester: findValue("Semes") || "1",
        year: findValue("Year") || "BTech",
        division: findValue("Division") || "A",
        date: findValue("Date") || new Date().toLocaleDateString(),
      };

      // Find the header row (usually contains "Sr.No" or "PRN")
      let headerRowIdx = -1;
      for (let i = 0; i < 15; i++) {
        if (data[i] && (data[i].includes("Sr.No") || data[i].includes("PRN"))) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        return res.status(400).json({ error: "Could not find header row in Excel" });
      }

      const headers = data[headerRowIdx];
      const subHeaders = data[headerRowIdx + 1] || [];
      const totalLectures = data[headerRowIdx + 2] || []; // Total lectures row is 2 rows below headers
      const studentsRaw = data.slice(headerRowIdx + 3); // Student data starts 3 rows below headers

      const overallThIdx = headers.findIndex(h => String(h || "").includes("Overall TH"));
      const overallPrIdx = headers.findIndex(h => String(h || "").includes("Overall PR"));
      const overallAttIdx = headers.findIndex(h => String(h || "").includes("Overall Att"));

      const students = studentsRaw
        .filter((row) => row[1] && row[2] && !isNaN(row[0]))
        .map((row) => {
          const student = {
            srNo: row[0],
            prn: row[1],
            name: row[2],
            subjects: [],
            overallTh: row[overallThIdx] || 0,
            overallPr: row[overallPrIdx] || 0,
            overallAtt: row[overallAttIdx] || 0,
          };

          // Find subjects by looking for "Per" or "%" in sub-header rows
          const endIdx = overallThIdx !== -1 ? overallThIdx : headers.length;
          const subHeaderRows = data.slice(headerRowIdx, headerRowIdx + 3);

          for (let i = 3; i < endIdx; i++) {
            let isPercentageCol = false;
            for (const sRow of subHeaderRows) {
              const val = String(sRow[i] || "").toLowerCase();
              if (val.includes("per") || val.includes("%")) {
                isPercentageCol = true;
                break;
              }
            }

            if (isPercentageCol) {
              // This is a percentage column. 
              // Find the subject name by looking backwards from this column in the header rows
              let subjectName = "";
              for (let j = i; j >= 3; j--) {
                const h = headers[j];
                if (h && !String(h).toLowerCase().includes("pre") && !String(h).toLowerCase().includes("per") && !String(h).toLowerCase().includes("abs")) {
                  subjectName = h;
                  break;
                }
              }

              if (subjectName && !String(subjectName).includes("Overall")) {
                const percentage = row[i];
                // Only add subject if attendance is mentioned (not a dash or empty)
                if (percentage !== '-' && percentage !== null && percentage !== undefined && String(percentage).trim() !== '') {
                  student.subjects.push({
                    name: String(subjectName).trim(),
                    present: row[i - 1] || 0,
                    percentage: percentage,
                    total: totalLectures[i - 1] || 0,
                    type: String(subjectName).toLowerCase().includes("pr") ? "Practical" : "Theory",
                  });
                }
              }
            }
          }
          return student;
        });

      res.json({ metadata, students });
    } catch (error) {
      console.error("Error processing Excel:", error);
      res.status(500).json({ error: "Failed to process Excel file" });
    }
  });

  // ✅ EMAIL API
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, text } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    res.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Email failed" });
  }
});
  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
