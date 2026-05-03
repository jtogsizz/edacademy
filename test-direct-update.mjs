import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCredits() {
  const { data: students } = await supabase
    .from('profiles')
    .select('id, replacement_credits')
    .eq('role', 'student')
    .limit(1);

  const student = students[0];
  console.log(`Initial Credits: ${student.replacement_credits}`);

  const newCredits = (student.replacement_credits || 0) + 1;

  // Attempt direct update using service_role
  const { data, error } = await supabase
    .from('profiles')
    .update({ replacement_credits: newCredits })
    .eq('id', student.id)
    .select();

  console.log('Update return:', { data, error });

  // Verify
  const { data: verify } = await supabase
    .from('profiles')
    .select('replacement_credits')
    .eq('id', student.id)
    .single();

  console.log(`Verified Credits: ${verify.replacement_credits}`);
}

testCredits();
