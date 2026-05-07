import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://dhgfevlwiwcblobpxjca.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZ2Zldmx3aXdjYmxvYnB4amNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNzg1MTcsImV4cCI6MjA5Mzc1NDUxN30.0Y_bS2LZGKLq9dECly6DZPAE7cixbC_kR2-p64hn0z8"
);