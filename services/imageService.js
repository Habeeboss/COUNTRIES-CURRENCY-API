const { createCanvas, registerFont } = require("canvas");
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
  gradient.addColorStop(0, "#89f7fe");
  gradient.addColorStop(1, "#66a6ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Register and set font
  registerFont(path.join(__dirname, "../fonts/Roboto-Bold.ttf"), { family: "Roboto" });
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px Roboto";

  // Header
  ctx.fillText(`Total Countries: ${stats.total_countries}`, 50, 50);
  ctx.fillText(
    `Last Refreshed: ${stats.last_refreshed_at ? new Date(stats.last_refreshed_at).toISOString() : "N/A"}`,
    50,
    100
  );

  // Section title
  ctx.font = "bold 28px Roboto";
  ctx.fillText("Top 5 Countries by GDP", 50, 150);

  // Draw bars and text
  const barStartY = 180;
  const barHeight = 30;
  const barSpacing = 50;
  topCountries.forEach((c, i) => {
    const gdp = Number(c.estimated_gdp) || 0;
    ctx.fillStyle = i === 0 ? "#ffd700" : "#ffffff";
    ctx.font = i === 0 ? "bold 26px Roboto" : "24px Roboto";

    ctx.fillText(
      `${i + 1}. ${c.name} - ${gdp.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      50,
      barStartY + i * barSpacing
    );

    const maxBarWidth = 500;
    const barWidth = topCountries[0].estimated_gdp
      ? Math.min(maxBarWidth, (gdp / topCountries[0].estimated_gdp) * maxBarWidth)
      : 0;
    ctx.fillStyle = i === 0 ? "rgba(255, 215, 0, 0.6)" : "rgba(255, 255, 255, 0.6)";
    ctx.fillRect(400, barStartY + i * barSpacing - 20, barWidth, barHeight);
  });

  // Save image
  const dir = path.join(__dirname, "../cache");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const imagePath = path.join(dir, "summary.png");

  const buffer = canvas.toBuffer("image/png");
  console.log("Generated summary image, buffer size:", buffer.length);
  fs.writeFileSync(imagePath, buffer);

  return imagePath; // return full path
};
