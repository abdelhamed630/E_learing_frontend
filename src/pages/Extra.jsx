import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI, instructorsAPI } from '../api'
import { MOCK_CATS } from '../utils'

export function Categories() {
  const [cats, setCats] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    coursesAPI.categories()
      .then(r => setCats(r.data.results || []))
      .catch(() => setCats(MOCK_CATS))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ paddingTop: 64 }}>
      <div className="section">
        <div className="section-tag">📂 التصنيفات</div>
        <div className="section-title">جميع التصنيفات</div>
        {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
          <div className="cats-grid" style={{ marginTop: '2rem' }}>
            {cats.map(cat => (
              <div key={cat.id} style={catStyle} onClick={() => navigate(`/courses?cat=${cat.id}`)}>
                <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>{cat.icon || '📂'}</div>
                <div style={{ fontWeight: 700, marginBottom: '.25rem' }}>{cat.name}</div>
                {cat.description && <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '.5rem', lineHeight: 1.5 }}>{cat.description}</div>}
                <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{cat.courses_count || ''} كورس</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function Instructors() {
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading]         = useState(true)
  const navigate                      = useNavigate()

  useEffect(() => {
    instructorsAPI.list()
      .then(r => {
        const list = r.data.results || r.data || []
        setInstructors(list.length ? list : MOCK_INSTRUCTORS)
      })
      .catch(() => setInstructors(MOCK_INSTRUCTORS))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ paddingTop: 64 }}>
      <div className="section">
        <div className="section-tag">👨‍🏫 المدربون</div>
        <div className="section-title">نخبة من المدربين</div>
        <p style={{ color: 'var(--text2)', marginBottom: '2rem', textAlign: 'center' }}>
          تعلّم من أفضل المدربين العرب في مجالاتهم
        </p>

        {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
            {instructors.map((inst, i) => {
              const name     = inst.full_name || inst.username || `${inst.user?.first_name || ''} ${inst.user?.last_name || ''}`.trim() || 'مدرب'
              const avatarUrl = inst.avatar_url || inst.avatar || null
              const initials  = name.trim().charAt(0).toUpperCase()
              const spec      = inst.specialization || 'مدرب معتمد'
              const courses   = inst.total_courses   || inst.courses_count   || 0
              const students  = inst.total_students  || inst.students_count  || 0
              const rating    = inst.average_rating  || inst.rating          || 0

              return (
                <div key={inst.id || i}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', transition: 'all .3s', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,.25)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                  onClick={() => navigate(`/courses?instructor=${inst.id}`)}>

                  {/* Header gradient */}
                  <div style={{ height: 90, background: 'linear-gradient(135deg, rgba(79,140,255,.2), rgba(124,92,252,.2))', position: 'relative' }} />

                  {/* Avatar */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: -44 }}>
                    <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: '1.9rem', overflow: 'hidden', border: '4px solid var(--surface)', boxShadow: '0 4px 16px rgba(0,0,0,.3)' }}>
                      {avatarUrl
                        ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
                        : null}
                      <span style={{ display: avatarUrl ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>{initials}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '1rem 1.5rem 1.5rem', textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Tajawal',sans-serif", fontWeight: 800, fontSize: '1.05rem', marginBottom: '.25rem' }}>{name}</div>
                    <div style={{ fontSize: '.8rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '.1rem' }}>{spec}</div>
                    {inst.bio && (
                      <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: '.75rem', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{inst.bio}</div>
                    )}

                    {/* Stats */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginTop: '.85rem', paddingTop: '.85rem', borderTop: '1px solid var(--border)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--accent)' }}>{courses}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>كورس</div>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--accent2)' }}>{students.toLocaleString()}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>طالب</div>
                      </div>
                      <div style={{ width: 1, background: 'var(--border)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '.95rem', color: 'var(--gold)' }}>⭐ {parseFloat(rating).toFixed(1)}</div>
                        <div style={{ fontSize: '.68rem', color: 'var(--text3)' }}>تقييم</div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const catStyle = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
  padding: '1.75rem', textAlign: 'center', cursor: 'pointer',
  transition: 'all 0.3s',
}

const MOCK_INSTRUCTORS = [
  { user: { first_name: 'أحمد', last_name: 'محمد' }, specialization: 'مطور ويب', courses_count: 8, students_count: 3200, rating: 4.9 },
  { user: { first_name: 'سارة', last_name: 'أحمد' }, specialization: 'مصممة UI/UX', courses_count: 5, students_count: 1800, rating: 4.8 },
  { user: { first_name: 'محمد', last_name: 'علي' }, specialization: 'خبير Python', courses_count: 12, students_count: 5000, rating: 4.7 },
  { user: { first_name: 'نور', last_name: 'حسن' }, specialization: 'تسويق رقمي', courses_count: 6, students_count: 2200, rating: 4.6 },
]
