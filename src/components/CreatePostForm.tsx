'use client'

import { useState, useRef, useTransition, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createPost } from '../app/dashboard/actions'
import { getTeacherScheduleGrid } from '../app/dashboard/schedule/actions'
import { formatInTimeZone } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

interface Props {
  teachers?: { id: string; full_name: string }[]
}

export default function CreatePostForm({ teachers = [] }: Props) {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── ESTADOS DO EVENTO ────────────────────────────────────
  const [attachEvent, setAttachEvent] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventTeacherId, setEventTeacherId] = useState('')
  const [eventMaxParticipants, setEventMaxParticipants] = useState('10')
  const [eventMeetUrl, setEventMeetUrl] = useState('')
  const [eventSlot, setEventSlot] = useState<{ startTimeISO: string; endTimeISO: string } | null>(null)
  const [isPublic, setIsPublic] = useState(false)

  // ─── MODAL DE HORÁRIOS ────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [groupedDates, setGroupedDates] = useState<Record<string, any[]>>({})
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [userTimezone, setUserTimezone] = useState('America/Sao_Paulo')

  // Obtém timezone atual do usuário
  useEffect(() => {
    const fetchTz = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('profiles').select('timezone').eq('id', user.id).single()
        if (data?.timezone) setUserTimezone(data.timezone)
      }
    }
    fetchTz()
  }, [])

  // Buscar horários do professor
  const handleOpenScheduleModal = async () => {
    if (!eventTeacherId) {
      setError('Selecione um professor primeiro.')
      return
    }
    setError(null)
    setLoadingSchedule(true)
    setIsModalOpen(true)
    try {
      const res = await getTeacherScheduleGrid(eventTeacherId, userTimezone)
      if (res.groupedDates) {
        setGroupedDates(res.groupedDates)
      } else if (res.error) {
        setError(res.error)
        setIsModalOpen(false)
      }
    } catch (e: any) {
      setError('Erro ao carregar horários.')
      setIsModalOpen(false)
    } finally {
      setLoadingSchedule(false)
    }
  }

  // ─── MANIPULAÇÃO DE IMAGEM ────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem (JPG, PNG, etc).')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('O arquivo é muito grande. O limite é 5MB.')
        return
      }
      setImageFile(file)
      setError(null)
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── SUBMISSÃO ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content) return
    setError(null)

    // Validações do evento
    if (attachEvent) {
      if (!eventTitle || !eventTeacherId || !eventSlot) {
        setError('Preencha os campos obrigatórios do evento e selecione um horário.')
        return
      }
    }

    startTransition(async () => {
      try {
        let finalImageUrl = null

        // Fazer upload se houver imagem
        if (imageFile) {
          const supabase = createClient()
          const fileName = `${Date.now()}-${imageFile.name.replace(/\s+/g, '_')}`
          const { data, error: uploadError } = await supabase.storage
            .from('posts')
            .upload(fileName, imageFile)

          if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)
          
          const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(data.path)
          finalImageUrl = publicUrl
        }

        const eventData = attachEvent ? {
          title: eventTitle,
          teacher_id: eventTeacherId,
          start_time: eventSlot!.startTimeISO,
          end_time: eventSlot!.endTimeISO,
          max_participants: parseInt(eventMaxParticipants, 10),
          meet_url: eventMeetUrl,
          is_public: isPublic
        } : undefined

        const res = await createPost(content, finalImageUrl, eventData)
        if (res.error) {
          setError(res.error)
        } else {
          // Reset
          setContent('')
          handleRemoveImage()
          setAttachEvent(false)
          setEventTitle('')
          setEventTeacherId('')
          setEventSlot(null)
          setEventMeetUrl('')
          setIsPublic(false)
        }
      } catch (e: any) {
        setError(e.message)
      }
    })
  }

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <>
      <div className="card animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: '16px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          
          {/* Caixa de Texto */}
          <textarea 
            placeholder="O que você quer compartilhar ou comunicar no evento?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={attachEvent ? 2 : 3}
            style={{ 
              resize: 'none', width: '100%', padding: '1.25rem', border: 'none', 
              background: 'transparent', fontSize: '1.05rem', outline: 'none' 
            }}
          />

          {imagePreview && (
            <div style={{ position: 'relative', margin: '0 1.25rem 1rem', borderRadius: '12px', overflow: 'hidden' }}>
              <img src={imagePreview} alt="Preview" style={{ width: '100%', height: 'auto', maxHeight: '300px', objectFit: 'cover', display: 'block' }} />
              <button 
                type="button" 
                onClick={handleRemoveImage}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}
              >
                &times;
              </button>
            </div>
          )}

          {/* Área de Anexo de Evento */}
          {attachEvent && (
            <div style={{ 
              margin: '0 1.25rem 1rem', padding: '1rem', borderRadius: '12px', 
              backgroundColor: 'rgba(124,58,237,0.03)', border: '1px solid rgba(124,58,237,0.2)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>🗓</span> Configurar Evento
                </h4>
                <button type="button" onClick={() => setAttachEvent(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                  Remover Anexo
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Professor *
                  </label>
                  <select
                    required
                    value={eventTeacherId}
                    onChange={(e) => {
                      setEventTeacherId(e.target.value)
                      setEventSlot(null) // reseta slot se trocar o prof
                    }}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.9rem' }}
                  >
                    <option value="">Selecione</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    Vagas *
                  </label>
                  <select
                    required
                    value={eventMaxParticipants}
                    onChange={(e) => setEventMaxParticipants(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.9rem' }}
                  >
                    <option value="5">5 participantes</option>
                    <option value="8">8 participantes</option>
                    <option value="10">10 participantes</option>
                    <option value="12">12 participantes</option>
                    <option value="17">17 participantes</option>
                    <option value="20">20 participantes</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Título do Evento *
                </label>
                <input
                  required
                  placeholder="Ex: Masterclass de Conversação"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Link da Reunião (Google Meet) *
                </label>
                <input
                  required
                  type="url"
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  value={eventMeetUrl}
                  onChange={(e) => setEventMeetUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Horário do Evento *
                </label>
                {eventSlot && eventSlot.startTimeISO && eventSlot.endTimeISO && !isNaN(new Date(eventSlot.startTimeISO).getTime()) && !isNaN(new Date(eventSlot.endTimeISO).getTime()) ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#059669', textTransform: 'capitalize' }}>
                      Evento agendado para {formatInTimeZone(new Date(eventSlot.startTimeISO), userTimezone, "EEE '•' dd/MM 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <button type="button" onClick={handleOpenScheduleModal} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', textDecoration: 'underline', fontSize: '0.8rem', cursor: 'pointer' }}>
                      Alterar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenScheduleModal}
                    disabled={!eventTeacherId}
                    style={{ 
                      width: '100%', padding: '0.75rem', borderRadius: '8px', fontWeight: 600,
                      border: '1px dashed var(--primary)', backgroundColor: 'transparent',
                      color: eventTeacherId ? 'var(--primary)' : 'var(--text-muted)', cursor: eventTeacherId ? 'pointer' : 'not-allowed'
                    }}
                  >
                    {eventTeacherId ? '+ Selecionar Horário na Agenda' : 'Selecione o professor primeiro'}
                  </button>
                )}
              </div>

              <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="is_public" 
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <label htmlFor="is_public" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', cursor: 'pointer' }}>
                  Tornar evento público (Acessível para não-alunos)
                </label>
              </div>
            </div>
          )}

          {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem', margin: '0 1.25rem 0.5rem' }}>{error}</div>}

          {/* Barra de Ferramentas / Submit */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {/* Botão de Imagem */}
              <input type="file" accept="image/*" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: 'transparent', color: 'var(--text-main)', cursor: 'pointer' }}
                className="hover:bg-[var(--bg-hover)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><polyline points="16 5 21 5 21 10"/><line x1="12" y1="12" x2="21" y2="3"/></svg>
                {imageFile ? 'Trocar Imagem' : 'Imagem'}
              </button>

              {/* Botão de Evento */}
              {!attachEvent && teachers.length > 0 && (
                <button 
                  type="button" 
                  onClick={() => setAttachEvent(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, border: 'none', background: 'rgba(124,58,237,0.1)', color: 'var(--primary)', cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Criar Evento
                </button>
              )}
            </div>
            
            <button type="submit" disabled={isPending || !content || (attachEvent && !eventSlot)} style={{ 
              minWidth: '120px', padding: '0.65rem 1.5rem', borderRadius: '99px', fontWeight: 700, 
              border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer',
              opacity: (isPending || !content || (attachEvent && !eventSlot)) ? 0.6 : 1
            }}>
              {isPending ? 'Publicando...' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>

      {/* ─── MODAL DE SELEÇÃO DE HORÁRIO ──────────────────── */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-main)', borderRadius: '20px', padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Escolher Horário</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Horários livres do professor</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'var(--bg-hover)', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
                ✕
              </button>
            </div>

            {loadingSchedule ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Carregando agenda...</div>
            ) : Object.keys(groupedDates).length === 0 ? (
              <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum horário disponível encontrado para este professor.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.entries(groupedDates).map(([dateLabel, allSlots]) => {
                  const freeSlots = allSlots.filter((s: any) => s.status === 'free')
                  const displayDateLabel = allSlots.length > 0 
                    ? formatInTimeZone(new Date(allSlots[0].startTimeISO), userTimezone, "EEE '•' dd/MM", { locale: ptBR })
                    : dateLabel

                  return (
                    <div key={dateLabel}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                        {displayDateLabel}
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {freeSlots.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum horário livre</span>}
                        {freeSlots.map((slot: any) => {
                          const isSelected = eventSlot?.startTimeISO === slot.startTimeISO
                          const timeLabel = `${formatInTimeZone(new Date(slot.startTimeISO), userTimezone, 'HH:mm')} - ${formatInTimeZone(new Date(slot.endTimeISO), userTimezone, 'HH:mm')}`
                          
                          return (
                            <button
                              key={slot.startTimeISO}
                              type="button"
                              onClick={() => {
                                setEventSlot({ startTimeISO: slot.startTimeISO, endTimeISO: slot.endTimeISO })
                                setIsModalOpen(false)
                              }}
                              style={{
                                padding: '0.5rem 0.85rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                backgroundColor: isSelected ? 'rgba(124,58,237,0.1)' : 'var(--bg-card)',
                                color: isSelected ? 'var(--primary)' : 'var(--text-main)'
                              }}
                            >
                              {timeLabel}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
