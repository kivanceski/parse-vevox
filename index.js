import * as cheerio from "cheerio";
import puppeteer from "puppeteer";
import { writeFileSync } from "fs";

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
      id: messages.length + 1,
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
  try {
    // Get URL from command line arguments
    const url = process.argv[2];

    if (!url) {
      console.error("Error: URL is required");
      console.log("Usage: npm start <URL>");
      process.exit(1);
    }

    console.log(`Fetching HTML from URL: ${url}\n`);
    const htmlContent = await fetchHTML(url);

    // Parse the Q&A messages
    const result = parseQAMessages(htmlContent);

    // Display results
    console.log("=".repeat(60));
    console.log("Q&A MESSAGE PARSER RESULTS");
    console.log("=".repeat(60));
    console.log(`\nTotal Messages: ${result.totalMessages}`);
    console.log(`Total Likes: ${result.totalLikes}`);
    console.log("\n" + "-".repeat(60));
    console.log("MESSAGES:");
    console.log("-".repeat(60));

    result.messages.forEach((msg, index) => {
      console.log(`\n[${msg.id}] Likes: ${msg.likes} 👍`);
      console.log(`    Time: ${msg.timestamp}`);
      console.log(`    Message: "${msg.message}"`);
    });

    console.log("\n" + "=".repeat(60));

    // Also output as JSON for potential further processing
    console.log("\nJSON Output:");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error parsing HTML:", error.message);
    process.exit(1);
  }
}

// Run the parser
main();
