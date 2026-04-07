import { createClient } from '@/utils/supabase/server'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import CreatePostForm from './CreatePostForm'

export default async function Feed({ isAdmin }: { isAdmin: boolean }) {
  const supabase = await createClient()

  // Buscar posts com dados do autor (profile)
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      id, content, image_url, created_at,
      profiles ( full_name, avatar_url, role )
    `)
    .order('created_at', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '6rem' }}>
      
      {isAdmin && <CreatePostForm />}

      {posts && posts.length > 0 ? (
        posts.map((post: any) => {
          const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

          return (
            <div key={post.id} className="card animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--border)', transition: 'transform 0.2s ease', cursor: 'default' }}>
              
              {/* Header do Post */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ 
                  width: '45px', height: '45px', borderRadius: '50%', 
                  backgroundColor: 'var(--primary-light)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0,
                  border: '2px solid var(--border)'
                }}>
                  <img src={author?.avatar_url || "/default-avatar.svg"} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {author?.full_name || 'Admin'}
                    <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', backgroundColor: 'var(--primary-light)', color: 'var(--primary-hover)', borderRadius: '12px', fontWeight: 600 }}>Professor</span>
                  </h4>
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.15rem' }}>
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                  </small>
                </div>
              </div>

              {/* Conteúdo */}
              <p style={{ marginBottom: '1rem', whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-main)', fontSize: '1rem' }}>{post.content}</p>

              {/* Imagem, se tiver */}
              {post.image_url && (
                <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', marginTop: '1rem', border: '1px solid var(--border)' }}>
                  <img src={post.image_url} alt="Post image" style={{ width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                </div>
              )}
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
