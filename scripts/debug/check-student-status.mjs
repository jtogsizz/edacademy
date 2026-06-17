import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data: students } = await supabase.from('profiles').select('id, full_name').eq('role', 'student').limit(5)
  console.log("Students:", students)

  if (students && students.length > 0) {
    for (const s of students) {
      const { data: subs } = await supabase.from('subscriptions').select('*').eq('student_id', s.id)
      console.log(`Student ${s.full_name} (${s.id}) subscriptions:`, subs)
    }
  }
}
run()
