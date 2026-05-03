import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testCancelAndCredit() {
  const { data: students } = await supabase
    .from('profiles')
    .select('id, replacement_credits')
    .eq('role', 'student')
    .limit(1);

  const student = students[0];
  console.log(`Initial Credits: ${student.replacement_credits}`);

  const startT = new Date();
  const endT = new Date(startT.getTime() + 3600000);

  const { data, error } = await supabase.rpc('cancel_and_credit_recurring', {
    p_student_id: student.id,
    p_teacher_id: student.id, // pretend student is teacher for FK constraint
    p_start_time: startT.toISOString(),
    p_end_time: endT.toISOString(),
    p_reason: 'teste forçado',
    p_cancelled_by: student.id
  });

  console.log('cancel_and_credit_recurring return:', { data, error });

  const { data: verify } = await supabase
    .from('profiles')
    .select('replacement_credits')
    .eq('id', student.id)
    .single();

  console.log(`Verified Credits: ${verify.replacement_credits}`);
}

testCancelAndCredit();
