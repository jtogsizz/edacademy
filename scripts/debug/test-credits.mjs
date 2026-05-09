import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.rpc('award_replacement_credit', { student_uuid: '00000000-0000-0000-0000-000000000000' });
  console.log('Result for award_replacement_credit:', data, error);
}

main();
