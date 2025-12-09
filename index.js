import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { writeFileSync, readFileSync } from "fs";
import express from "express";
import cors from "cors";

// ===========================================
// MOCK MODE CONFIGURATION
// Set to true to return mock data from data.json
// Set to false to scrape from actual URL
// ===========================================
const MOCK_MODE = false;

/**
 * Fetch HTML content from a URL using Puppeteer (supports JavaScript-rendered content)
 * @param {string} url - The URL to fetch
 * @returns {Promise<string>} - The HTML content
 */
async function fetchHTML(url) {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    console.log("Navigating to URL...");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    // Wait for the message cards to load
    console.log("Waiting for content to load...");
    await page
      .waitForSelector('[data-testid="discussion-message-item-card"]', {
        timeout: 30000,
      })
      .catch(() =>
        console.log("Warning: Message cards not found, proceeding anyway...")
      );

    // Scroll down to trigger lazy loading of messages
    console.log("Scrolling to load lazy content...");
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    // Wait a bit more for content to render after scrolling
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the full HTML after JavaScript has executed
    const htmlContent = await page.content();
    return htmlContent;
  } finally {
    await browser.close();
  }
}

/**
 * Parse HTML and extract Q&A messages with like counts
 * @param {string} htmlContent - The HTML content to parse
 * @returns {Object} - Parsed data including total messages and message details
 */
function parseQAMessages(htmlContent) {
  const $ = cheerio.load(htmlContent);

  // Find all Q&A message cards
  const messageCards = $('[data-testid="discussion-message-item-card"]');

  const messages = [];

  messageCards.each((index, element) => {
    const $card = $(element);

    // Extract timestamp
    const timestamp = $card
      .find('[data-testid="discussion-message-item-sentTime"]')
      .text()
      .trim();

    // Extract likes count
    const likesText = $card
      .find('[data-testid="discussion-message-item-likes"]')
      .text()
      .trim();

    // Extract just the number from likes text (remove the icon text)
    const likesMatch = likesText.match(/\d+/);
    const likes = likesMatch ? parseInt(likesMatch[0], 10) : 0;

    // Extract message content
    const messageContent = $card
      .find('[data-testid="discussion-message-item-wrappingtext"]')
      .text()
      .trim();

    messages.push({
      id: messages.length + 1, // Will be re-assigned
      timestamp: timestamp,
      message: messageContent,
      likes: likes,
    });
  });

  // Filter out empty messages (no content AND no timestamp)
  const filteredMessages = messages.filter(
    (msg) => msg.message || msg.timestamp
  );

  // Sort by likes (highest to lowest)
  filteredMessages.sort((a, b) => b.likes - a.likes);

  // Re-assign sequential IDs after filtering and sorting
  filteredMessages.forEach((msg, idx) => (msg.id = idx + 1));

  // Calculate total likes
  const totalLikes = filteredMessages.reduce((sum, msg) => sum + msg.likes, 0);

  return {
    totalMessages: filteredMessages.length,
    totalLikes: totalLikes,
    messages: filteredMessages,
  };
}

// Main execution
async function main() {
  const urlArg = process.argv[2];

  if (urlArg) {
    // CLI Mode
    try {
      console.log(`Fetching HTML from URL: ${urlArg}\n`);
      const htmlContent = await fetchHTML(urlArg);
      const result = parseQAMessages(htmlContent);

      // Display results
      console.log("=".repeat(60));
      console.log("Q&A MESSAGE PARSER RESULTS");
      console.log("=".repeat(60));
      console.log(`\nTotal Messages: ${result.totalMessages}`);
      console.log(`Total Likes: ${result.totalLikes}`);

      const outputPath = "./frontend/public/data.json";
      try {
        writeFileSync(outputPath, JSON.stringify(result, null, 2));
        console.log(`\nData saved to ${outputPath}`);
      } catch (err) {
        console.error(`Error saving data to ${outputPath}:`, err.message);
      }
    } catch (error) {
      console.error("Error parsing HTML:", error.message);
      process.exit(1);
    }
  } else {
    // Server Mode
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

    app.post("/api/scrape", async (req, res) => {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      // Mock mode: return data from data.json instead of scraping
      if (MOCK_MODE) {
        console.log(`[MOCK MODE] Returning mock data for: ${url}`);
        try {
          const mockData = JSON.parse(
            readFileSync("./mock-data.json", "utf-8")
          );
          console.log(
            `[MOCK MODE] Returning ${mockData.totalMessages} messages`
          );
          return res.json(mockData);
        } catch (error) {
          console.error("[MOCK MODE] Error reading mock data:", error);
          return res
            .status(500)
            .json({ error: "Failed to read mock data: " + error.message });
        }
      }

      console.log(`Received scrape request for: ${url}`);
      try {
        const htmlContent = await fetchHTML(url);
        const result = parseQAMessages(htmlContent);
        console.log(`Successfully scraped ${result.totalMessages} messages`);
        res.json(result);
      } catch (error) {
        console.error("Scraping error:", error);
        res
          .status(500)
          .json({ error: "Failed to scrape URL: " + error.message });
      }
    });

    app.listen(PORT, () => {
      console.log(`\nServer running on http://localhost:${PORT}`);
      console.log("Waiting for requests from Frontend...");
    });
  }
}

// Run the parser
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
