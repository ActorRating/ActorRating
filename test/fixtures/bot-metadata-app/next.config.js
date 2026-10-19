const path = require("path");

// Use the same top-level pattern the app ships. If it is missing, Next falls
// back to a default that does not include Googlebot and this fixture fails.
const parent = require(path.join(__dirname, "../../../next.config.js"));

/** @type {import('next').NextConfig} */
module.exports = {
  htmlLimitedBots: parent.htmlLimitedBots,
};
