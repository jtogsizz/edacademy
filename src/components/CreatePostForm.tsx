"use client"

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { createPost } from '../app/dashboard/actions'

export default function CreatePostForm() {
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content) return
    setLoading(true)
    setError(null)

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
        
        // Obter URL pública
        const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(data.path)
        finalImageUrl = publicUrl
      }

      const res = await createPost(content, finalImageUrl)
      if (res.error) {
        setError(res.error)
      } else {
        // Sucesso
        setContent('')
        handleRemoveImage()
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card animate-fade-in" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--primary-light)' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <textarea 
          placeholder="O que você quer compartilhar com os alunos?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={3}
          style={{ resize: 'none', width: '100%', padding: '1rem', border: 'none', background: 'transparent', fontSize: '1rem' }}
        />

        {imagePreview && (
          <div style={{ position: 'relative', marginTop: '0.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              ref={fileInputRef}
              style={{ display: 'none' }} 
            />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7"/><polyline points="16 5 21 5 21 10"/><line x1="12" y1="12" x2="21" y2="3"/></svg>
              {imageFile ? 'Trocar Imagem' : 'Anexar Imagem'}
            </button>
          </div>
          
          <button type="submit" className="btn-primary" disabled={loading || !content} style={{ minWidth: '120px' }}>
            {loading ? 'Publicando...' : 'Publicar'}
          </button>
        </div>

        {error && <div style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '0.5rem' }}>{error}</div>}
      </form>
    </div>
  )
}
