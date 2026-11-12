"use strict";

const path = require("node:path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const createApp = require("./src/Infrastructure/http/createApp");
const loadConfig = require("./src/Infrastructure/config/loadConfig");
const SupabaseRestaurantRepository = require("./src/Infrastructure/supabase/SupabaseRestaurantRepository");

dotenv.config({ path: path.join(__dirname, "..", "api", ".env") });

const config = loadConfig();
const supabase = createClient(config.supabaseUrl, config.publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const app = createApp({
    restaurantRepository: new SupabaseRestaurantRepository(supabase),
    allowedOrigins: config.allowedOrigins,
});

if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`PedeJá API disponível na porta ${config.port}.`);
    });
}

module.exports = app;
