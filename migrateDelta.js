import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { plainToDelta } from "./src/utils/deltaPlain.js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

async function migrateToDeltas() {
  try {
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, text_content")
      .is("delta_content", null);

    if (error) throw error;

    console.log(`Found ${messages.length} messages to migrate`);

    for (let i = 0; i < messages.length; i++) {
      const { error: updateError } = await supabase
        .from("messages")
        .update({ delta_content: plainToDelta(messages[i].text_content) })
        .eq("id", messages[i].id);

      if (updateError) throw updateError;
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
}

migrateToDeltas();
