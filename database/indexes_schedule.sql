-- ==============================================================================
-- EdAcademy: Índices de Otimização (Schedule Engine)
-- ==============================================================================
-- Objetivo: Prevenir lentidão e timeouts no Vercel causados por "Seq Scans" 
-- em tabelas crescentes de agenda.
-- Execução: Pode ser rodado em produção com zero downtime.
-- ==============================================================================

-- 1. APPOINTMENTS (Agendamentos Pontuais e Histórico)
-- Acelera o ScheduleEngine e minhal-aulas do professor (pesquisa por range e status)
CREATE INDEX IF NOT EXISTS idx_appointments_teacher_time_status 
ON public.appointments(teacher_id, start_time, status);

-- Acelera o dashboard do aluno (pesquisa por suas próprias aulas futuras)
CREATE INDEX IF NOT EXISTS idx_appointments_student_time_status 
ON public.appointments(student_id, start_time, status);

-- 2. RECURRING CLASSES (Aulas Fixas)
-- Acelera a geração da matriz de agenda do professor (busca por dia da semana)
CREATE INDEX IF NOT EXISTS idx_recurring_teacher_day_time 
ON public.recurring_classes(teacher_id, day_of_week, start_time);

-- Acelera verificações de conflito e dashboard do próprio aluno
CREATE INDEX IF NOT EXISTS idx_recurring_student_day_time 
ON public.recurring_classes(student_id, day_of_week, start_time);

-- 3. TEACHER AVAILABILITY (Expediente)
-- Acelera a geração do grid base semanal do professor
CREATE INDEX IF NOT EXISTS idx_availability_teacher_day_time 
ON public.teacher_availability(teacher_id, day_of_week, start_time);

-- Opcional, mas útil para manutenção futura (Reindexar)
-- REINDEX INDEX CONCURRENTLY idx_appointments_teacher_time_status;
