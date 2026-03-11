import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api'
import CourseCard from '../components/CourseCard'

export default function Courses() {
  const [courses,   setCourses]   = useState([])
  const [cats,      setCats]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [catsLoad,  setCatsLoad]  = useState(true)
  const [search,    setSearch]    = useState('')
  const [level,     setLevel]     = useState('')
  const [lang,      setLang]      = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [searchParams, setSearchParams] = useSearchParams()

  // جلب التصنيفات
  useEffect(() => {
    setCatsLoad(true)
    api.get('/courses/categories/')
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : (r.data.results || [])
        setCats(data)
      })
      .catch(() => {})
      .finally(() => setCatsLoad(false))
  }, [])

  // جلب الكورسات
  useEffect(() => {
    const catParam = searchParams.get('cat') || 'all'
    setActiveCat(catParam)
    loadCourses(catParam)
  }, [searchParams])

  async function loadCourses(catParam) {
    setLoading(true)
    try {
      const params = { limit: 100 }
      if (catParam && catParam !== 'all') params.category = catParam
      const r = await api.get('/courses/courses/', { params })
      setCourses(r.data.results || [])
    } catch { setCourses([]) }
    finally { setLoading(false) }
  }

  function selectCat(catId) {
    setSearch(''); setLevel(''); setLang('')
    if (String(catId) === 'all') setSearchParams({})
    else setSearchParams({ cat: String(catId) })
  }

  const filtered = courses.filter(c => {
    const q = search.toLowerCase()
    const matchQ    = !search || c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
    const matchL    = !level  || c.level === level
    const matchLang = !lang   || c.language === lang
    return matchQ && matchL && matchLang
  })

  const activeCatObj = cats.find(c => String(c.id) === String(activeCat))
  const allCats = [{ id: 'all', name: 'كل الكورسات', icon: '🌐', courses_count: null }, ...cats]

  return (
    <div style={{ paddingTop: 64, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '.8rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '.5rem' }}>📚 الكورسات</div>
          <h1 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: '1.8rem', fontWeight: 900, marginBottom: '.5rem' }}>
            {activeCatObj ? `${activeCatObj.icon || ''} ${activeCatObj.name}` : 'جميع الكورسات'}
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: '.88rem' }}>
            {filtered.length} كورس متاح{activeCatObj ? ' في هذا التصنيف' : ''}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '2rem', alignItems: 'start' }}>

          {/* ── Sidebar التصنيفات ── */}
          <div style={{ position: 'sticky', top: 80 }}>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <span style={{ position: 'absolute', right: '.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', fontSize: '.9rem' }}>🔍</span>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="بحث..." style={{ paddingRight: '2.2rem', fontSize: '.85rem', padding: '.6rem .75rem .6rem 2.2rem' }} />
            </div>

            {/* Level */}
            <select className="form-input" style={{ marginBottom: '.75rem', fontSize: '.85rem' }}
              value={level} onChange={e => setLevel(e.target.value)}>
              <option value="">📶 كل المستويات</option>
              <option value="beginner">🟢 مبتدئ</option>
              <option value="intermediate">🟡 متوسط</option>
              <option value="advanced">🔴 متقدم</option>
            </select>

            {/* Lang */}
            <select className="form-input" style={{ marginBottom: '1.5rem', fontSize: '.85rem' }}
              value={lang} onChange={e => setLang(e.target.value)}>
              <option value="">🌐 كل اللغات</option>
              <option value="ar">🇸🇦 عربي</option>
              <option value="en">🇺🇸 إنجليزي</option>
            </select>

            {/* تصنيفات */}
            <div style={{ fontSize: '.72rem', fontWeight: 800, color: 'var(--text3)', marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: 1 }}>
              التصنيفات
            </div>

            {catsLoad ? (
              <div style={{ padding: '1rem 0' }}><div className="spinner" style={{ width: 20, height: 20 }} /></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem' }}>
                {allCats.map(cat => {
                  const isActive = String(activeCat) === String(cat.id)
                  return (
                    <button key={cat.id} onClick={() => selectCat(cat.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '.6rem',
                        padding: '.55rem .9rem', borderRadius: 10,
                        border: isActive ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                        background: isActive ? 'rgba(79,140,255,.1)' : 'transparent',
                        color: isActive ? 'var(--accent)' : 'var(--text2)',
                        fontSize: '.85rem', fontWeight: isActive ? 700 : 400,
                        cursor: 'pointer', fontFamily: "'Cairo',sans-serif",
                        textAlign: 'right', width: '100%', transition: 'all .15s',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)' }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{cat.icon || '📁'}</span>
                      <span style={{ flex: 1 }}>{cat.name}</span>
                      {cat.courses_count > 0 && (
                        <span style={{
                          fontSize: '.7rem', fontWeight: 800,
                          background: isActive ? 'rgba(79,140,255,.2)' : 'var(--bg3)',
                          color: isActive ? 'var(--accent)' : 'var(--text3)',
                          padding: '.1rem .45rem', borderRadius: 10, flexShrink: 0
                        }}>{cat.courses_count}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {(search || level || lang || activeCat !== 'all') && (
              <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: '1rem' }}
                onClick={() => { setSearch(''); setLevel(''); setLang(''); selectCat('all') }}>
                ✕ مسح الفلاتر
              </button>
            )}
          </div>

          {/* ── Main: الكورسات ── */}
          <div>
            {loading ? (
              <div className="spinner-wrap" style={{ paddingTop: '4rem' }}><div className="spinner" /></div>
            ) : filtered.length ? (
              <div className="courses-grid">
                {filtered.map(c => <CourseCard key={c.id} course={c} />)}
              </div>
            ) : (
              <div className="empty" style={{ paddingTop: '4rem' }}>
                <div className="empty-icon">📭</div>
                <h3>لا يوجد كورسات</h3>
                <p>جرب تصنيف تاني أو غيّر كلمة البحث</p>
                <button className="btn btn-outline" style={{ marginTop: '1rem' }}
                  onClick={() => { setSearch(''); setLevel(''); setLang(''); selectCat('all') }}>
                  عرض كل الكورسات
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
