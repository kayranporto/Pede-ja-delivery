"use strict";

const { createClient } = require("@supabase/supabase-js");
const createApp = require("./src/Infrastructure/http/createApp");
const loadConfig = require("./src/Infrastructure/config/loadConfig");
const SupabaseRestaurantRepository = require("./src/Infrastructure/supabase/SupabaseRestaurantRepository");

function createApplication({ vercelRoute = false } = {}) {
    const config = loadConfig();
    const supabase = createClient(config.supabaseUrl, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    return createApp({
        restaurantRepository: new SupabaseRestaurantRepository(supabase),
        allowedOrigins: config.allowedOrigins,
        vercelRoute,
    });
}

module.exports = createApplication;
