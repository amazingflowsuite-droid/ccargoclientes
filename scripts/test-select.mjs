// scripts/test-select.mjs
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://tjjkukygkdtjkkoirffh.supabase.co";
const supabaseAnonKey = "sb_publishable_-CBhMxQ6rduzIvlUsG7gFA__yAU1c4A";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error, status, statusText } = await supabase.from("accounts").select("*");
  console.log("SELECT status:", status, statusText);
  console.log("SELECT error:", error);
  console.log("SELECT data count:", data?.length);
}

check();

