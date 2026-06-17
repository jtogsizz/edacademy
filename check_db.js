const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('subscriptions').select('*');
  if (error) {
    console.error('Error fetching subscriptions:', error);
    return;
  }
  console.log('Subscriptions:', JSON.stringify(data, null, 2));

  const { data: profiles, error: pError } = await supabase.from('profiles').select('*').eq('role', 'student');
  console.log('Student Profiles:', JSON.stringify(profiles, null, 2));
}

main();
