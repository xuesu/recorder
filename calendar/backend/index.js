const MyUtils = require("./data/utils");

// Apply the configured timezone before loading modules that use Date.
process.env.TZ = MyUtils.serverTimeZone;

const backend = require("./server");

const host = process.env.HOST || "127.0.0.1";
const port = process.env.PORT || "9200";

backend(host, port);
