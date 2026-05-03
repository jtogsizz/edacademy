import { createClient } from '@/utils/supabase/server'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'
import CreatePostForm from './CreatePostForm'
import PostInteractions from './PostInteractions'
import PostAuthorMenu from './PostAuthorMenu'
import EventCard from './EventCard'

const STAFF_ROLES = ['admin', 'admin_master', 'suporte', 'dev']

export default async function Feed({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, timezone')
    .eq('id', user!.id)
    .single()

  const userTimezone = currentProfile?.timezone || 'America/Sao_Paulo'
  const isStaff = STAFF_ROLES.includes(currentProfile?.role || '')
  const isStudent = currentProfile?.role === 'student'

  const { data: rawPosts } = await supabase.rpc('get_feed_posts')
  const posts: any[] = typeof rawPosts === 'string' ? JSON.parse(rawPosts) : (rawPosts || [])

  const { data: settings } = await supabase.from('settings').select('fixed_meet_link').single()
  const meetLink = settings?.fixed_meet_link || 'https://meet.google.com/'

  let teachers: { id: string; full_name: string }[] = []
  if (isStaff) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['admin', 'admin_master'])
      .order('full_name')
    teachers = data || []
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '6rem' }}>
      {isAdmin && <CreatePostForm teachers={teachers} />}

      {posts.length > 0 ? (
        posts.map((post: any) => {
          const author = post.profiles
          const isLikedByMe = post.post_likes?.some((l: any) => l.user_id === user?.id) || false
          const likesCount = post.post_likes?.length || 0
          const sortedComments = (post.post_comments || []).sort(
            (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )

          // Renderização de Post Normal
          return (
            <div
              key={`post-${post.id}`}
              className="card animate-fade-in"
              style={{ position: 'relative', padding: '1.5rem', border: '1px solid var(--border)', cursor: 'default' }}
            >
              <Link
                href={`?viewUser=${post.user_id}`}
                scroll={false}
                style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', textDecoration: 'none' }}
              >
                <div style={{
                  width: '45px', height: '45px', borderRadius: '50%',
                  backgroundColor: 'var(--primary-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0, border: '2px solid var(--border)'
                }}>
                  <img src={author?.avatar_url || '/default-avatar.svg'} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{author?.full_name || 'Usuário Excluído'}</span>
                    {(author?.role === 'admin' || author?.role === 'admin_master') ? (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)', borderRadius: '12px', fontWeight: 600 }}>Professor</span>
                    ) : author?.role === 'student' ? (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)', borderRadius: '12px', fontWeight: 600, border: '1px solid var(--border)' }}>Aluno</span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: 'rgba(16,185,129,0.1)', color: '#059669', borderRadius: '12px', fontWeight: 600 }}>Staff</span>
                    )}
                  </h4>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                  </small>
                </div>
              </Link>

              <PostAuthorMenu postId={post.id} initialContent={post.content} isAuthor={user?.id === post.user_id} />

              {post.image_url && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '1rem', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                  <img src={post.image_url} alt="Post image" style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                </div>
              )}

              {/* Card de Evento (se houver) */}
              {post.event && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <EventCard
                    event={post.event}
                    userTimezone={userTimezone}
                    isStudent={isStudent}
                    isStaff={isStaff}
                    meetLink={post.event.meet_url}
                  />
                </div>
              )}

              <PostInteractions
                postId={post.id}
                initialLikesCount={likesCount}
                isLikedByMe={isLikedByMe}
                comments={sortedComments}
                userId={user?.id || ''}
              />
            </div>
          )
        })
      ) : (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <p>Nenhuma publicação ainda.</p>
        </div>
      )}
    </div>
  )
}
