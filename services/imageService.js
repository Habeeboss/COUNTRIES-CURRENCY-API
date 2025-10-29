const { createCanvas } = require("canvas");
const path = require("path");
const fs = require("fs");
const { getPool } = require("../config/db");

exports.generateSummaryImage = async () => {
  const pool = getPool();
  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS total_countries, MAX(updated_at) AS last_refreshed_at FROM countries`
  );

  const [topCountries] = await pool.query(
    `SELECT name, estimated_gdp FROM countries ORDER BY estimated_gdp DESC LIMIT 5`
  );

  const width = 900;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#89f7fe"); // light cyan
  gradient.addColorStop(1, "#66a6ff"); // soft blue
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText(`Total Countries: ${stats.total_countries}`, 50, 50);
  ctx.fillText(
    `Last Refreshed: ${stats.last_refreshed_at ? new Date(stats.last_refreshed_at).toISOString() : "N/A"}`,
    50,
    100
  );

  // Section title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.fillText("Top 5 Countries by GDP", 50, 150);

  // Draw bars and text for each country
  const barStartY = 180;
  const barHeight = 30;
  const barSpacing = 50;
  topCountries.forEach((c, i) => {
    const gdp = Number(c.estimated_gdp) || 0;
    
    // Highlight top country
    ctx.fillStyle = i === 0 ? "#ffd700" : "#ffffff"; // gold for top, white for others
    ctx.font = i === 0 ? "bold 26px sans-serif" : "24px sans-serif";
    
    ctx.fillText(`${i + 1}. ${c.name} - ${gdp.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 50, barStartY + i * barSpacing);
    
    // Draw a horizontal bar proportional to GDP (scaled)
    const maxBarWidth = 500;
    const barWidth = Math.min(maxBarWidth, (gdp / topCountries[0].estimated_gdp) * maxBarWidth);
    ctx.fillStyle = i === 0 ? "rgba(255, 215, 0, 0.6)" : "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(400, barStartY + i * barSpacing - 20, barWidth, barHeight);
  });

  // Save image
  const dir = path.join(__dirname, "../public");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const imagePath = path.join(dir, "summary.png");
  fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));

  return "summary.png";
};
