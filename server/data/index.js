require("dotenv").config();

const mysqlService = require("./mysqlService");
const memoryService = require("./memoryService");

const isDemoMode = String(process.env.DEMO_MODE || "false").toLowerCase() === "true";

module.exports = isDemoMode ? memoryService : mysqlService;
