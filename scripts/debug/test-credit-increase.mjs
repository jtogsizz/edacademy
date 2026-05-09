import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCredits() {
  // 1. Get a test student
  const { data: students, error: studentErr } = await supabase
    .from('profiles')
    .select('id, replacement_credits')
    .eq('role', 'student')
    .limit(1);

  if (studentErr || !students || students.length === 0) {
    console.error('No students found:', studentErr);
    return;
  }
  
  const student = students[0];
  console.log('--- BEFORE TEST ---');
  console.log(`Student ID: ${student.id}`);
  console.log(`Initial Credits: ${student.replacement_credits}`);

  // 2. Call award_replacement_credit
  console.log('Calling award_replacement_credit...');
  const { data: rpcData, error: rpcErr } = await supabase.rpc('award_replacement_credit', { student_uuid: student.id });
  
  console.log('RPC RPC RETURN:', { rpcData, rpcErr });

  // 3. Re-read student
  const { data: updatedStudent } = await supabase
    .from('profiles')
    .select('replacement_credits')
    .eq('id', student.id)
    .single();

  console.log('--- AFTER TEST ---');
  console.log(`New Credits: ${updatedStudent.replacement_credits}`);
  console.log(`Credit Increased? ${updatedStudent.replacement_credits > student.replacement_credits}`);
}

testCredits();
