'use client'

import { useState, useTransition } from 'react'
import { toggleLike, addComment } from '@/app/dashboard/actions'
import Link from 'next/link'

type Props = {
  postId: string
  initialLikesCount: number
  isLikedByMe: boolean
  comments: any[]
  userId: string
}

export default function PostInteractions({ postId, initialLikesCount, isLikedByMe, comments, userId }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')

  const handleLike = () => {
    startTransition(async () => {
      await toggleLike(postId)
    })
  }

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return
    startTransition(async () => {
      await addComment(postId, commentText)
      setCommentText('')
    })
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: showComments ? '1rem' : '0' }}>
        {/* Like Button */}
        <button 
          onClick={handleLike}
          disabled={isPending}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'none', border: 'none', cursor: 'pointer',
            color: isLikedByMe ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 500, fontSize: '0.9rem',
            transition: 'all 0.2s ease',
            opacity: isPending ? 0.7 : 1
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={isLikedByMe ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
          </svg>
          {initialLikesCount > 0 && initialLikesCount} {initialLikesCount === 1 ? 'Curtida' : 'Curtidas'}
        </button>

        {/* Comment Button Toggle */}
        <button 
          onClick={() => setShowComments(!showComments)}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', 
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)',
            fontWeight: 500, fontSize: '0.9rem'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          {comments.length > 0 && comments.length} {comments.length === 1 ? 'Comentário' : 'Comentários'}
        </button>
      </div>

      {showComments && (
        <div className="animate-fade-in" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* List existing comments */}
          {comments.map((comment: any) => (
            <div key={comment.id} style={{ display: 'flex', gap: '0.75rem' }}>
              <Link href={`?viewUser=${comment.user_id}`} scroll={false} style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', overflow: 'hidden', flexShrink: 0, textDecoration: 'none' }}>
                <img src={comment.profiles?.avatar_url || "/default-avatar.svg"} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Link>
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '0.6rem 0.9rem', borderRadius: 'var(--radius-md)', flexGrow: 1 }}>
                <Link href={`?viewUser=${comment.user_id}`} scroll={false} style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.15rem', color: 'var(--text-main)', textDecoration: 'none', display: 'block' }}>{comment.profiles?.full_name}</Link>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{comment.content}</div>
              </div>
            </div>
          ))}

          {/* New Comment Input */}
          <form onSubmit={handleCommentSubmit} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Escreva um comentário..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              disabled={isPending}
              style={{ 
                flexGrow: 1, padding: '0.6rem 1rem', borderRadius: '20px', 
                border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)', fontSize: '0.9rem'
              }}
            />
            <button 
              type="submit" 
              disabled={isPending || !commentText.trim()}
              style={{ 
                background: 'var(--primary)', color: 'white', border: 'none', 
                width: '36px', height: '36px', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'opacity 0.2s',
                opacity: (isPending || !commentText.trim()) ? 0.5 : 1
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
