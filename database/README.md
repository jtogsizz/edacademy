# Database — Guia de SQLs

Este diretório contém todos os scripts SQL utilizados para montar, evoluir e proteger o banco de dados do EdAcademy no Supabase.

---

## ✅ SQLs Finais (estado de produção atual)

Estes são os arquivos que definem o **estado atual** do banco. Se você precisar recriar o ambiente do zero, aplique-os **nesta ordem**:

| Ordem | Arquivo | Descrição |
|-------|---------|-----------|
| 1 | `schema.sql` | Schema principal: tabelas, tipos, FKs e triggers base |
| 2 | `storage_setup.sql` | Buckets e políticas de Storage (avatares) |
| 3 | `security_hardening_v3.sql` | RLS e policies de segurança (versão final) |
| 4 | `secure_chat_users.sql` | Políticas de acesso para mensagens/chat |
| 5 | `secure_recurring_view.sql` | View segura para aulas recorrentes (anonimiza dados) |
| 6 | `atomic_schedule_and_profiles.sql` | RPCs atômicas de agenda + proteção de campos de perfil |
| 7 | `credits_fix_v2.sql` | Sistema de créditos de reposição (versão final com RPCs atômicas) |
| 8 | `renewal_system.sql` | Sistema de renovação de assinaturas via WhatsApp |
| 9 | `events.sql` | Tabela de eventos e participações |
| 10 | `events_update.sql` | Adições ao sistema de eventos (meet_url, is_public) |
| 11 | `public_events.sql` | Acesso público a eventos (sem autenticação) |
| 12 | `likes_comments.sql` | Curtidas e comentários em posts do feed |
| 13 | `indexes_schedule.sql` | Índices de performance para agenda (UNIQUE constraints) |
| 14 | `teacher_absences.sql` | Tabela de ausências do professor |
| 15 | `add_roles_suporte_dev.sql` | Roles: suporte e dev + RPC promote_user_role |
| 16 | `add_language_support.sql` | Coluna student_language e language no profiles |
| 17 | `add_whatsapp_to_profiles.sql` | Coluna whatsapp_number no profiles |
| 18 | `meet_urls_migration.sql` | Coluna meet_url no profiles e appointments |
| 19 | `enhancements_final.sql` | Ajustes finais de convenções e campos extras |

---

## 📋 SQLs Históricos (migrações intermediárias)

Estes arquivos documentam **evoluções específicas** aplicadas ao longo do desenvolvimento. **Não precisam ser reaplicados** se você já aplicou os SQLs finais acima, mas são mantidos como auditoria e referência histórica.

| Arquivo | O que mudou |
|---------|-------------|
| `atomic_credits_add.sql` | Primeira versão das RPCs atômicas de crédito (supersedida por `credits_fix_v2.sql`) |
| `atomic_credits_fix.sql` | Correção intermediária das RPCs de crédito |
| `replacement_credits_system.sql` | Rascunho inicial do sistema de créditos |
| `auth_and_timezone.sql` | Adição de coluna timezone + trigger de auth |
| `security_hardening.sql` | Primeira versão do hardening de segurança (v1, supersedida pela v3) |
| `fix_admin_master_roles.sql` | Hotfix de permissão de roles admin_master |
| `fix_appointments_rls.sql` | Hotfix de RLS para agendamentos |
| `fix_recurring_rls.sql` | Hotfix de RLS para aulas recorrentes |
| `update_posts_rls.sql` | Atualização de policy de posts do feed |
| `update_profiles_policy_for_chat.sql` | Atualização de policy de perfis para chat |

---

## 🔒 Arquivos de Referência (apenas leitura)

Os arquivos abaixo **não devem ser reaplicados**. São mantidos como documentação de estado de segurança:

- `security_hardening.sql` — versão v1 (substituída pela v3)
- `security_hardening_v3.sql` — versão final de RLS (aplicada em produção)
- `fix_appointments_rls.sql` — patch de RLS (já consolidado em `security_hardening_v3.sql`)
- `fix_recurring_rls.sql` — patch de RLS (já consolidado em `security_hardening_v3.sql`)

---

## ⚠️ Notas Importantes

- **Nunca aplicar** os históricos sobre um banco que já possui o schema final — causará conflitos de `ALTER TABLE` ou duplicação de colunas.
- Os arquivos de **security/RLS** (`fix_*_rls.sql`, `secure_*.sql`, `security_hardening*.sql`) **não devem ser removidos** — são referência viva de auditoria de segurança.
- Em caso de dúvida sobre qual versão está ativa em produção, consulte o Supabase Dashboard → **Table Editor → Políticas RLS**.
