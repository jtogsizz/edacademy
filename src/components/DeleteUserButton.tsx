"use client"

import { useState } from 'react'
import { deleteUserAccount } from '@/app/admin/actions'

export default function DeleteUserButton({ userId, userName }: { userId: string, userName: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm(`TEM CERTEZA ABSOLUTA? Esta ação é IRREVERSÍVEL e apagará o perfil, agenda e credenciais do usuário ${userName}.`)) return
    if (!confirm(`CONFIRMAÇÃO FINAL: O usuário ${userName} Será deletado. Deseja realmente prosseguir?`)) return

    setLoading(true)
    const result = await deleteUserAccount(userId)
    if (result?.error) {
      alert("Erro ao excluir: " + result.error)
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      style={{
        fontSize: '0.75rem',
        padding: '0.4rem 0.8rem',
        backgroundColor: 'var(--bg-main)',
        color: '#dc2626',
        border: '1px solid #fca5a5',
        borderRadius: 'var(--radius-sm)',
        opacity: loading ? 0.5 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        fontWeight: 500,
        width: '100%'
      }}
      title="Excluir aluno do banco de dados (Irreversível)"
    >
      {loading ? 'Excluindo...' : 'Excluir Conta'}
    </button>
  )
}
