'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const CATS = ['Cozinha', 'Banheiro', 'Sala', 'Quarto', 'Escritório Dele', 'Escritório Dela', 'Área de Serviço', 'Geral']
const CAT_ICONS = { 'Cozinha': '🍳', 'Banheiro': '🚿', 'Sala': '🛋️', 'Quarto': '🛏️', 'Escritório Dele': '💻', 'Escritório Dela': '👩‍💻', 'Área de Serviço': '🧹', 'Geral': '🏠' }
const PR = {
  essencial: { label: 'Essencial', color: '#E74C3C', bg: '#FDEDEC' },
  importante: { label: 'Importante', color: '#E67E22', bg: '#FEF5E7' },
  desejavel: { label: 'Desejável', color: '#27AE60', bg: '#EAFAF1' }
}

export default function Home() {
  const [items, setItems] = useState([])
  const [view, setView] = useState('sectors')
  const [sector, setSector] = useState(null)
  const [showOwned, setShowOwned] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fd, setFd] = useState({ name: '', model: '', price_range: '', priority: 'importante', category: 'Cozinha', link: '', notes: '' })

  // Load items
  const loadItems = useCallback(async () => {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: true })
    if (!error && data) setItems(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadItems()

    // Realtime subscription
    const channel = supabase
      .channel('items-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadItems])

  const togglePurchased = async (id) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    setSaving(true)
    const { error } = await supabase
      .from('items')
      .update({ purchased: !item.purchased })
      .eq('id', id)
    if (!error) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, purchased: !i.purchased } : i))
    }
    setSaving(false)
  }

  const deleteItem = async (id) => {
    if (confirmDel !== id) { setConfirmDel(id); return }
    setSaving(true)
    const { error } = await supabase.from('items').delete().eq('id', id)
    if (!error) setItems(prev => prev.filter(i => i.id !== id))
    setConfirmDel(null)
    setSaving(false)
  }

  const startEdit = (item) => {
    setFd({ name: item.name, model: item.model || '', price_range: item.price_range || '', priority: item.priority, category: item.category, link: item.link || '', notes: item.notes || '' })
    setEditId(item.id)
    setShowForm(true)
  }

  const submitForm = async () => {
    if (!fd.name.trim()) return
    setSaving(true)
    if (editId) {
      const { error } = await supabase.from('items').update(fd).eq('id', editId)
      if (!error) setItems(prev => prev.map(i => i.id === editId ? { ...i, ...fd } : i))
    } else {
      const { data, error } = await supabase.from('items').insert({ ...fd, purchased: false }).select().single()
      if (!error && data) setItems(prev => [...prev, data])
    }
    setFd({ name: '', model: '', price_range: '', priority: 'importante', category: sector || 'Cozinha', link: '', notes: '' })
    setEditId(null)
    setShowForm(false)
    setSaving(false)
  }

  const cancelForm = () => { setShowForm(false); setEditId(null) }

  const isOwned = (i) => i.price_range === '—' && i.purchased
  const filtered = (sector ? items.filter(i => i.category === sector) : items).filter(i => showOwned || !isOwned(i))
  const total = items.length
  const bought = items.filter(i => i.purchased).length
  const prog = total > 0 ? Math.round((bought / total) * 100) : 0

  const openSector = (c) => { setSector(c); setView('list') }
  const openAll = () => { setSector(null); setView('list') }
  const goHome = () => { setView('sectors'); setSector(null); setShowForm(false); setEditId(null); setConfirmDel(null) }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <p style={{ fontSize: '1.1rem', color: '#8B949E' }}>Carregando lista...</p>
    </div>
  )

  const inputStyle = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #30363D', background: '#0D1117', color: '#C9D1D9', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none' }

  const Header = () => (
    <div style={{ background: 'linear-gradient(135deg, #161B22 0%, #1A2332 50%, #0D1117 100%)', borderBottom: '1px solid #21262D', padding: '1.5rem 1.5rem 1.2rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ cursor: view !== 'sectors' ? 'pointer' : 'default' }} onClick={view !== 'sectors' ? goHome : undefined}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 800, color: '#F0F6FC', margin: 0 }}>🏠 Nossa Casa Nova</h1>
            {view !== 'sectors' && <p style={{ color: '#58A6FF', margin: '0.2rem 0 0', fontSize: '0.8rem' }}>← Voltar aos setores</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {saving && <span style={{ fontSize: '0.7rem', color: '#E67E22' }}>Salvando...</span>}
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2EA043', display: 'inline-block' }} title="Realtime ativo" />
          </div>
        </div>
        <div style={{ background: '#21262D', borderRadius: 10, padding: '0.8rem 1rem', marginTop: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.8rem' }}>
            <span style={{ color: '#8B949E' }}><strong style={{ color: '#2EA043' }}>{bought}</strong> comprados · <strong style={{ color: '#58A6FF' }}>{total - bought}</strong> pendentes</span>
            <span style={{ color: '#58A6FF', fontWeight: 700 }}>{prog}%</span>
          </div>
          <div style={{ background: '#30363D', borderRadius: 6, height: 6, overflow: 'hidden' }}>
            <div style={{ width: `${prog}%`, height: '100%', background: 'linear-gradient(90deg, #238636, #2EA043)', borderRadius: 6, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>
    </div>
  )

  // ===== SECTORS VIEW =====
  if (view === 'sectors') {
    return (
      <>
        <Header />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '1rem 1.5rem' }}>
          {CATS.map(cat => {
            const ci = items.filter(i => i.category === cat)
            const cb = ci.filter(i => i.purchased).length
            const ct = ci.length
            const cp = ct > 0 ? Math.round((cb / ct) * 100) : 0
            if (ct === 0) return null
            return (
              <button key={cat} onClick={() => openSector(cat)} style={{ width: '100%', background: '#161B22', border: '1px solid #21262D', borderRadius: 12, padding: '1rem 1.2rem', marginBottom: 8, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s', fontFamily: 'inherit', color: '#C9D1D9' }}>
                <span style={{ fontSize: '1.8rem' }}>{CAT_ICONS[cat] || '📦'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#F0F6FC' }}>{cat}</span>
                    <span style={{ fontSize: '0.75rem', color: '#8B949E' }}>{cb}/{ct}</span>
                  </div>
                  <div style={{ background: '#30363D', borderRadius: 4, height: 4, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${cp}%`, height: '100%', background: cp === 100 ? '#238636' : '#58A6FF', borderRadius: 4, transition: 'width 0.3s' }} />
                  </div>
                </div>
              </button>
            )
          })}
          <button onClick={openAll} style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #30363D', background: 'transparent', color: '#58A6FF', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', marginTop: 8 }}>
            📋 Ver todos os itens ({total})
          </button>
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem 2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#30363D' }}>Realtime ativo · mudanças aparecem instantaneamente</p>
        </div>
      </>
    )
  }

  // ===== LIST VIEW =====
  return (
    <>
      <Header />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0.8rem 1.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#F0F6FC', margin: 0 }}>
            {sector ? `${CAT_ICONS[sector] || ''} ${sector}` : '📋 Todos os itens'}
          </h2>
          <button onClick={() => setShowOwned(!showOwned)} style={{ padding: '4px 10px', borderRadius: 14, border: 'none', background: showOwned ? '#0D2818' : '#21262D', color: showOwned ? '#2EA043' : '#8B949E', fontSize: '0.7rem', cursor: 'pointer' }}>
            {showOwned ? 'Ocultar ✓ já temos' : 'Mostrar ✓ já temos'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0.5rem 1.5rem 1rem' }}>
        {filtered.map(item => {
          const p = PR[item.priority] || PR.importante
          const owned = isOwned(item)
          return (
            <div key={item.id} style={{ background: item.purchased ? '#0D1117' : '#161B22', border: `1px solid ${item.purchased ? '#1A2332' : '#21262D'}`, borderRadius: 10, padding: '0.8rem 1rem', marginBottom: 8, opacity: item.purchased ? 0.5 : 1, transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <button onClick={() => togglePurchased(item.id)} style={{ width: 24, height: 24, minWidth: 24, borderRadius: 6, border: `2px solid ${item.purchased ? '#238636' : '#30363D'}`, background: item.purchased ? '#238636' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1, transition: 'all 0.2s' }}>
                  {item.purchased && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: item.purchased ? '#8B949E' : '#F0F6FC', textDecoration: item.purchased ? 'line-through' : 'none' }}>{item.name}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '1px 6px', borderRadius: 8, background: p.bg, color: p.color, textTransform: 'uppercase' }}>{p.label}</span>
                    {!sector && <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 8, background: '#21262D', color: '#8B949E' }}>{item.category}</span>}
                  </div>
                  {item.model && item.model !== 'Já possuem' && (
                    <p style={{ fontSize: '0.8rem', color: '#8B949E', margin: '2px 0 0', lineHeight: 1.3 }}>{item.model}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                    {item.price_range && item.price_range !== '—' && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: item.purchased ? '#238636' : '#58A6FF' }}>{item.price_range}</span>
                    )}
                    {item.purchased && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 600, padding: '1px 8px', borderRadius: 8, background: '#0D2818', color: '#2EA043' }}>
                        {owned ? 'JÁ TEMOS' : 'COMPRADO'}
                      </span>
                    )}
                  </div>
                  {item.notes && <p style={{ fontSize: '0.72rem', color: '#6E7681', margin: '4px 0 0', lineHeight: 1.3, fontStyle: 'italic' }}>{item.notes}</p>}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {item.link && (
                      <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: '#58A6FF', textDecoration: 'none', padding: '3px 8px', borderRadius: 6, background: '#0D2137', fontWeight: 500 }}>
                        Ver produto →
                      </a>
                    )}
                    <button onClick={() => startEdit(item)} style={{ fontSize: '0.7rem', color: '#8B949E', background: '#21262D', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer' }}>Editar</button>
                    <button onClick={() => deleteItem(item.id)} style={{ fontSize: '0.7rem', color: confirmDel === item.id ? '#fff' : '#F85149', background: confirmDel === item.id ? '#DA3633' : 'transparent', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', transition: 'all 0.2s' }}>
                      {confirmDel === item.id ? 'Confirmar?' : 'Remover'}
                    </button>
                    {confirmDel === item.id && <button onClick={() => setConfirmDel(null)} style={{ fontSize: '0.7rem', color: '#8B949E', background: 'transparent', border: 'none', padding: '3px 8px', cursor: 'pointer' }}>Cancelar</button>}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!showForm && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem 1rem' }}>
          <button onClick={() => { setFd(f => ({ ...f, category: sector || 'Cozinha' })); setShowForm(true) }} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '2px dashed #30363D', background: 'transparent', color: '#58A6FF', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
            + Adicionar item
          </button>
        </div>
      )}

      {showForm && (
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 1.5rem 1rem' }}>
          <div style={{ background: '#161B22', border: '1px solid #30363D', borderRadius: 10, padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.8rem', color: '#F0F6FC', fontSize: '0.95rem' }}>{editId ? 'Editar' : 'Novo item'}</h3>
            {[
              { k: 'name', l: 'Nome *', p: 'Ex: Ferro de passar' },
              { k: 'model', l: 'Modelo', p: 'Ex: Philips Azur' },
              { k: 'price_range', l: 'Faixa de preço', p: 'Ex: R$ 200 – 350' },
              { k: 'link', l: 'Link', p: 'https://...' },
              { k: 'notes', l: 'Obs', p: 'Detalhes' }
            ].map(f => (
              <div key={f.k} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: '0.72rem', color: '#8B949E', display: 'block', marginBottom: 3 }}>{f.l}</label>
                <input value={fd[f.k]} onChange={e => setFd(prev => ({ ...prev, [f.k]: e.target.value }))} placeholder={f.p} style={inputStyle} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: '#8B949E', display: 'block', marginBottom: 3 }}>Prioridade</label>
                <select value={fd.priority} onChange={e => setFd(prev => ({ ...prev, priority: e.target.value }))} style={inputStyle}>
                  <option value="essencial">Essencial</option>
                  <option value="importante">Importante</option>
                  <option value="desejavel">Desejável</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.72rem', color: '#8B949E', display: 'block', marginBottom: 3 }}>Setor</label>
                <select value={fd.category} onChange={e => setFd(prev => ({ ...prev, category: e.target.value }))} style={inputStyle}>
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={submitForm} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: '#238636', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Salvando...' : editId ? 'Salvar' : 'Adicionar'}
              </button>
              <button onClick={cancelForm} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #30363D', background: 'transparent', color: '#8B949E', fontSize: '0.85rem', cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0.5rem 1.5rem 2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.7rem', color: '#30363D' }}>Realtime ativo · mudanças aparecem instantaneamente pra todos</p>
      </div>
    </>
  )
}
