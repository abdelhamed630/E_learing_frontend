import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { enrollmentsAPI, paymentsAPI, notificationsAPI, examsAPI, authAPI } from '../api'
import { formatDate, formatPrice, payStatus, courseEmoji, getImgUrl } from '../utils'
import StudentExams from './StudentExams'

// ═══════════════════════════════════════
//  DASHBOARD HOME — 3 cards
// ═══════════════════════════════════════
function DashboardHome({ user, navigate }) {
  const [stats, setStats] = useState({ enrolled: 0, exams: 0, notifications: 0 })

  useEffect(() => {
    Promise.all([
      enrollmentsAPI.list({ limit: 1 }).catch(() => ({ data: { count: 0 } })),
      api.get('/exams/').catch(() => ({ data: [] })),
      notificationsAPI.list({ is_read: false, limit: 1 }).catch(() => ({ data: { count: 0 } })),
    ]).then(([er, xr, nr]) => {
      setStats({
        enrolled: er.data.count || (er.data.results || []).length || 0,
        exams: (xr.data.results || xr.data || []).length || 0,
        notifications: nr.data.count || (nr.data.results || []).length || 0,
      })
    })
  }, [])

  const cards = [
    {
      id: 'my-courses',
      icon: '📚',
      label: 'كورساتي',
      desc: 'كورساتك المسجل فيها ومتابعة التقدم',
      val: stats.enrolled,
      valLabel: 'كورس مسجل',
      color: 'var(--accent)',
      grad: 'linear-gradient(135deg,rgba(79,140,255,.15),rgba(79,140,255,.03))',
    },
    {
      id: 'exams',
      icon: '📝',
      label: 'الامتحانات',
      desc: 'امتحانات كورساتك ونتائجك',
      val: stats.exams,
      valLabel: 'محاولة سابقة',
      color: 'var(--accent3)',
      grad: 'linear-gradient(135deg,rgba(0,212,170,.15),rgba(0,212,170,.03))',
    },
    {
      id: 'notifications',
      icon: '🔔',
      label: 'الإشعارات',
      desc: 'إشعاراتك وآخر الأخبار',
      val: stats.notifications,
      valLabel: 'إشعار غير مقروء',
      color: 'var(--gold)',
      grad: 'linear-gradient(135deg,rgba(255,190,0,.15),rgba(255,190,0,.03))',
    },
  ]

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily:"'Tajawal',sans-serif", fontSize:'1.8rem', fontWeight:900, marginBottom:'.5rem' }}>
          أهلاً، {user.first_name || user.username} 👋
        </h2>
        <p style={{ color:'var(--text2)' }}>ماذا تريد أن تفعل اليوم؟</p>
      </div>

      {/* 3 Big Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:'1.5rem', marginBottom:'3rem' }}>
        {cards.map(c => (
          <div key={c.id}
            style={{ background:c.grad, border:`1px solid`, borderColor: c.color+'44', borderRadius:20, padding:'2rem', cursor:'pointer', transition:'all .2s' }}
            onClick={() => navigate(`/dashboard/${c.id}`)}
            onMouseEnter={e => e.currentTarget.style.transform='translateY(-4px)'}
            onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
          >
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>{c.icon}</div>
            <div style={{ fontSize:'1.2rem', fontWeight:900, color:c.color, marginBottom:'.5rem' }}>{c.label}</div>
            <div style={{ fontSize:'.85rem', color:'var(--text2)', marginBottom:'1.5rem', lineHeight:1.5 }}>{c.desc}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:'2rem', fontWeight:900, color:c.color }}>{c.val}</div>
                <div style={{ fontSize:'.72rem', color:'var(--text3)' }}>{c.valLabel}</div>
              </div>
              <div style={{ width:44, height:44, borderRadius:12, background:c.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', color:c.color }}>←</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'1.5rem' }}>
        <div style={{ fontSize:'.8rem', color:'var(--text3)', fontWeight:700, letterSpacing:1, textTransform:'uppercase', marginBottom:'1rem' }}>روابط سريعة</div>
        <div style={{ display:'flex', gap:'.75rem', flexWrap:'wrap' }}>
          {[
            { to:'/courses', label:'🔍 تصفح الكورسات' },
            { to:'/dashboard/profile', label:'👤 ملفي الشخصي' },
            { to:'/dashboard/payments', label:'💳 مدفوعاتي' },
            { to:'/dashboard/settings', label:'⚙️ الإعدادات' },
          ].map((l,i) => (
            <Link key={i} to={l.to} style={{ padding:'.5rem 1rem', background:'var(--bg3)', borderRadius:10, fontSize:'.85rem', color:'var(--text2)', textDecoration:'none', border:'1px solid var(--border)', transition:'all .2s' }}
              onMouseEnter={e=>{e.target.style.color='var(--accent)';e.target.style.borderColor='var(--accent)'}}
              onMouseLeave={e=>{e.target.style.color='var(--text2)';e.target.style.borderColor='var(--border)'}}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  DASHBOARD WRAPPER
// ═══════════════════════════════════════
export default function Dashboard({ showToast }) {
  const { panel } = useParams()
  const { user, logout, updateUser } = useAuth()
  const navigate = useNavigate()

  if (!user) return <div className="spinner-wrap" style={{ paddingTop:120 }}><div className="spinner" /></div>

  function go(p) { navigate(`/dashboard/${p}`) }

  // لو مفيش panel أو panel = 'overview' → الصفحة الرئيسية بالـ 3 cards
  const showHome = !panel || panel === 'overview'

  return (
    <div style={{ paddingTop: 64, minHeight:'100vh' }}>
      {/* Header breadcrumb */}
      {!showHome && (
        <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', padding:'.75rem 2rem', display:'flex', alignItems:'center', gap:'.5rem', fontSize:'.85rem' }}>
          <span style={{ color:'var(--accent)', cursor:'pointer' }} onClick={() => navigate('/dashboard/overview')}>لوحة التحكم</span>
          <span style={{ color:'var(--text3)' }}>←</span>
          <span style={{ color:'var(--text2)' }}>
            {panel === 'my-courses' ? 'كورساتي' : panel === 'exams' ? 'الامتحانات' : panel === 'notifications' ? 'الإشعارات' : panel === 'payments' ? 'المدفوعات' : panel === 'profile' ? 'ملفي الشخصي' : 'الإعدادات'}
          </span>
        </div>
      )}

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'2rem' }}>
        {showHome           && <DashboardHome user={user} navigate={navigate} />}
        {panel==='my-courses'   && <MyCourses navigate={navigate} />}
        {panel==='exams'        && <StudentExams showToast={showToast} />}
        {panel==='notifications' && <Notifications showToast={showToast} />}
        {panel==='payments'     && <Payments />}
        {panel==='profile'      && <Profile user={user} updateUser={updateUser} showToast={showToast} />}
        {panel==='settings'     && <Settings showToast={showToast} logout={logout} navigate={navigate} />}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  MY COURSES
// ═══════════════════════════════════════
function MyCourses({ navigate }) {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    enrollmentsAPI.list({ limit: 50 })
      .then(r => setEnrollments(r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statusInfo = {
    pending:   { badge: 'badge-gold',  icon: '⏳', label: 'في انتظار موافقة المدرب',  canWatch: false },
    active:    { badge: 'badge-blue',  icon: '📖', label: 'جاري',                      canWatch: true  },
    completed: { badge: 'badge-green', icon: '✅', label: 'مكتمل',                    canWatch: true  },
    rejected:  { badge: 'badge-red',   icon: '❌', label: 'تم رفض طلبك',              canWatch: false },
    blocked:   { badge: 'badge-red',   icon: '🚫', label: 'تم حظرك من الكورس',        canWatch: false },
    dropped:   { badge: 'badge-gold',  icon: '🚪', label: 'انسحبت',                   canWatch: false },
  }

  return (
    <div>
      <h2 style={S.title}>📚 كورساتي</h2>
      {loading ? <div className="spinner-wrap"><div className="spinner"/></div> :
        enrollments.length ? enrollments.map((e, i) => {
          const si          = statusInfo[e.status] || statusInfo.active
          const thumbUrl    = e.course_thumbnail
          const instrName   = e.course_instructor || '—'
          const instrAvUrl  = e.course_instructor_avatar
          const instrInit   = instrName.trim().charAt(0).toUpperCase()

          return (
            <div key={i} style={{ ...S.card, padding: 0, overflow: 'hidden', alignItems: 'stretch', marginBottom: '.75rem' }}>

              {/* Thumbnail */}
              <div style={{ width: 110, flexShrink: 0, background: 'linear-gradient(135deg,var(--bg3),var(--surface2))', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.8rem' }}>
                {thumbUrl
                  ? <img src={thumbUrl} alt={e.course_title} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                      onError={e2 => e2.target.style.display = 'none'} />
                  : courseEmoji(e.course_title)}
              </div>

              {/* Body */}
              <div style={{ flex: 1, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '.4rem', minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '.95rem', lineHeight: 1.35 }}>{e.course_title || 'كورس'}</div>

                {/* Instructor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.55rem', fontWeight: 800, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                    {instrAvUrl
                      ? <img src={instrAvUrl} alt={instrName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e2 => e2.target.style.display = 'none'} />
                      : instrInit}
                  </div>
                  <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{instrName}</span>
                </div>

                {/* Status / Progress */}
                {(e.status === 'pending' || e.status === 'rejected' || e.status === 'blocked') ? (
                  <div style={{
                    fontSize: '.8rem', padding: '.35rem .7rem', borderRadius: 8,
                    background: e.status === 'pending' ? 'rgba(255,180,0,.1)' : 'rgba(255,79,106,.1)',
                    color: e.status === 'pending' ? 'var(--gold)' : 'var(--red)',
                    border: `1px solid ${e.status === 'pending' ? 'rgba(255,180,0,.3)' : 'rgba(255,79,106,.3)'}`,
                    alignSelf: 'flex-start',
                  }}>
                    {si.icon} {si.label}
                    {e.instructor_note && (
                      <div style={{ marginTop: '.25rem', fontSize: '.75rem', opacity: .8 }}>
                        ملاحظة المدرب: {e.instructor_note}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="progress-bar" style={{ margin: '.1rem 0' }}>
                      <div className="progress-fill" style={{ width: `${e.progress || 0}%` }}/>
                    </div>
                    <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{e.progress || 0}% مكتمل</div>
                  </>
                )}

                {si.canWatch && (
                  <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', marginTop: '.25rem' }}
                    onClick={() => navigate(`/watch/${e.course_id || e.course}`)}>
                    ▶️ متابعة التعلم
                  </button>
                )}
                {e.course_group_link && e.status === 'active' && (
                  <a href={e.course_group_link} target="_blank" rel="noopener noreferrer"
                    style={{ alignSelf: 'flex-start', marginTop: '.25rem', background: 'linear-gradient(135deg,#25d366,#128c7e)', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.38rem .9rem', borderRadius: 8, fontSize: '.78rem', fontWeight: 700 }}>
                    💬 جروب الكورس
                  </a>
                )}
              </div>

              {/* Status badge */}
              <div style={{ padding: '1rem .75rem', display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                <span className={`badge ${si.badge}`} style={{ fontSize: '.7rem' }}>{si.icon} {si.label}</span>
              </div>
            </div>
          )
        }) : (
          <div className="empty">
            <div className="empty-icon">📚</div>
            <h3>لم تسجل في أي كورس بعد</h3>
            <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={() => navigate('/courses')}>تصفح الكورسات</button>
          </div>
        )
      }
    </div>
  )
}

// ═══════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════
function Notifications({ showToast }) {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    notificationsAPI.list({ limit: 30 })
      .then(r => setNotifs(r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function markAll() {
    try {
      await notificationsAPI.markAllRead()
      setNotifs(n => n.map(x => ({ ...x, is_read: true })))
      showToast('تم تعيين الكل كمقروء ✅', 'success')
    } catch {}
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h2 style={S.title}>🔔 الإشعارات</h2>
        {notifs.some(n => !n.is_read) && (
          <button className="btn btn-outline btn-sm" onClick={markAll}>تعيين الكل كمقروء</button>
        )}
      </div>
      {loading ? <div className="spinner-wrap"><div className="spinner"/></div> :
        notifs.length ? notifs.map((n, i) => (
          <div key={i} style={{ ...S.card, opacity: n.is_read ? .6 : 1, borderColor: !n.is_read ? 'var(--accent)' : 'var(--border)' }}>
            <div style={{ fontSize:'1.5rem' }}>{n.is_read ? '📭' : '📬'}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight: n.is_read ? 400 : 700, marginBottom:'.2rem' }}>{n.title || n.message}</div>
              <div style={{ fontSize:'.78rem', color:'var(--text3)' }}>{formatDate(n.created_at)}</div>
            </div>
            {!n.is_read && <span className="badge badge-blue">جديد</span>}
          </div>
        )) : (
          <div className="empty"><div className="empty-icon">🔔</div><h3>لا يوجد إشعارات</h3></div>
        )
      }
    </div>
  )
}

// ═══════════════════════════════════════
//  PAYMENTS
// ═══════════════════════════════════════
function Payments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    paymentsAPI.list({ limit: 30 })
      .then(r => setPayments(r.data.results || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 style={S.title}>💳 مدفوعاتي</h2>
      {loading ? <div className="spinner-wrap"><div className="spinner"/></div> :
        payments.length ? (
          <div style={S.box}>
            <table className="data-table">
              <thead><tr><th>#</th><th>الكورس</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{p.course_title || p.course}</td>
                    <td>{formatPrice(p.amount)}</td>
                    <td><span className={`badge ${payStatus(p.status).cls}`}>{payStatus(p.status).label}</span></td>
                    <td style={{ color:'var(--text3)', fontSize:'.82rem' }}>{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><div className="empty-icon">💳</div><h3>لا يوجد مدفوعات بعد</h3></div>
        )
      }
    </div>
  )
}

// ═══════════════════════════════════════
//  PROFILE
// ═══════════════════════════════════════
function Profile({ user, updateUser, showToast }) {
  const { refetch } = useAuth()
  const [form, setForm]                   = useState({ first_name: user.first_name||'', last_name: user.last_name||'', phone: user.phone||'', bio: user.bio||'' })
  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(getImgUrl(user.avatar))
  const [saving, setSaving]               = useState(false)
  const avatarRef                         = useRef(null)

  function handleAvatarPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('الصورة أكبر من 5 ميجا', 'error'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function save() {
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('first_name', form.first_name)
      fd.append('last_name',  form.last_name)
      fd.append('phone',      form.phone || '')
      fd.append('bio',        form.bio   || '')
      if (avatarFile) fd.append('avatar', avatarFile)
      const r = await authAPI.updateProfile(fd)
      updateUser(r.data.user || r.data)
      await refetch()
      showToast('تم حفظ الملف الشخصي ✅', 'success')
    } catch (e) {
      const msg = e.response?.data ? Object.values(e.response.data).flat().join(' | ') : 'حدث خطأ'
      showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const initials = (user.first_name?.[0] || user.username?.[0] || '?').toUpperCase()

  return (
    <div>
      <h2 style={S.title}>👤 ملفي الشخصي</h2>
      <div style={S.box}>
        <div style={{ display:'flex', alignItems:'center', gap:'1.25rem', marginBottom:'1.5rem', paddingBottom:'1.5rem', borderBottom:'1px solid var(--border)' }}>
          <div style={{ position:'relative', flexShrink:0 }}>
            <div style={{ width:88, height:88, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'white', fontSize:'1.8rem', overflow:'hidden', border:'3px solid var(--accent)', boxShadow:'0 0 0 4px rgba(79,140,255,.15), 0 8px 24px rgba(0,0,0,.3)' }}>
              {avatarPreview ? <img src={avatarPreview} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} /> : initials}
            </div>
            <button type="button" onClick={() => avatarRef.current?.click()}
              style={{ position:'absolute', bottom:0, left:0, width:28, height:28, borderRadius:'50%', background:'var(--grad)', border:'2px solid var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'.7rem', boxShadow:'0 2px 8px rgba(0,0,0,.3)', transition:'transform .2s' }}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>📷</button>
            <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarPick} />
          </div>
          <div>
            <div style={{ fontWeight:800 }}>{user.first_name || user.username}</div>
            <div style={{ fontSize:'.8rem', color:'var(--text3)' }}>{user.email}</div>
            {avatarFile && <div style={{ fontSize:'.75rem', color:'var(--accent3)', marginTop:'.3rem' }}>✓ صورة جديدة — ستُرفع عند الحفظ</div>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group"><label className="form-label">الاسم الأول</label><input className="form-input" value={form.first_name} onChange={e=>setForm(f=>({...f,first_name:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">الاسم الأخير</label><input className="form-input" value={form.last_name} onChange={e=>setForm(f=>({...f,last_name:e.target.value}))}/></div>
        </div>
        <div className="form-group"><label className="form-label">رقم الهاتف</label><input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></div>
        <div className="form-group"><label className="form-label">نبذة شخصية</label><textarea className="form-input" rows={3} value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))}/></div>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? '⏳ جاري الحفظ...' : '💾 حفظ التغييرات'}</button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════
function Settings({ showToast, logout, navigate }) {
  const [oldPass, setOldPass]             = useState('')
  const [newPass, setNewPass]             = useState('')
  const [confirm, setConfirm]             = useState('')
  const [loginHistory, setLoginHistory]   = useState([])
  const [loadHist, setLoadHist]           = useState(true)
  const [deletingId, setDeletingId]       = useState(null)
  const [confirmClear, setConfirmClear]   = useState(false)

  useEffect(() => { loadHistory() }, [])

  function loadHistory() {
    setLoadHist(true)
    authAPI.loginHistory()
      .then(r => setLoginHistory(r.data.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoadHist(false))
  }

  async function changePass() {
    if (newPass !== confirm) { showToast('كلمتا المرور غير متطابقتين', 'error'); return }
    if (newPass.length < 8) { showToast('كلمة المرور 8 أحرف على الأقل', 'error'); return }
    try {
      await authAPI.changePassword({ old_password: oldPass, new_password: newPass, new_password2: confirm })
      showToast('تم تغيير كلمة المرور ✅', 'success')
      setOldPass(''); setNewPass(''); setConfirm('')
    } catch (e) { showToast(e.response?.data?.detail || 'كلمة المرور الحالية غير صحيحة', 'error') }
  }

  async function deleteEntry(id) {
    if (!id) { showToast('لا يمكن حذف هذا السجل', 'error'); return }
    setDeletingId(id)
    try {
      await authAPI.deleteLoginEntry(id)
      setLoginHistory(h => h.filter(x => x.id !== id))
      showToast('تم حذف السجل ✅', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ في الحذف', 'error')
    } finally { setDeletingId(null) }
  }

  async function clearAll() {
    try {
      await authAPI.clearLoginHistory()
      setLoginHistory([])
      setConfirmClear(false)
      showToast('تم مسح سجل التسجيل بالكامل ✅', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ', 'error')
    }
  }

  return (
    <div style={{ animation: 'fadeUp .4s ease' }}>
      <h2 style={S.title}>⚙️ الإعدادات</h2>

      {/* Change Password */}
      <div style={S.box}>
        <h3 style={{ fontWeight:700, marginBottom:'1.25rem', paddingBottom:'.75rem', borderBottom:'1px solid var(--border)' }}>🔐 تغيير كلمة المرور</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">كلمة المرور الحالية</label><input className="form-input" type="password" value={oldPass} onChange={e=>setOldPass(e.target.value)} placeholder="••••••••" /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">كلمة المرور الجديدة</label><input className="form-input" type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="8 أحرف على الأقل" /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">تأكيد كلمة المرور</label><input className="form-input" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="أعد كتابة كلمة المرور" /></div>
        </div>
        <button className="btn btn-primary" onClick={changePass} style={{ marginTop: '1.25rem' }}>تغيير كلمة المرور</button>
      </div>

      {/* Login History */}
      <div style={S.box}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', paddingBottom:'.75rem', borderBottom:'1px solid var(--border)' }}>
          <h3 style={{ fontWeight:700, fontSize:'1rem' }}>📱 الأجهزة المتصلة</h3>
          {loginHistory.length > 0 && (
            confirmClear ? (
              <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
                <span style={{ fontSize:'.8rem', color:'var(--text2)' }}>هل أنت متأكد؟</span>
                <button className="btn btn-danger btn-sm" onClick={clearAll}>امسح الكل</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>إلغاء</button>
              </div>
            ) : (
              <button className="btn btn-outline btn-sm" style={{ color:'var(--red)', borderColor:'rgba(255,79,106,.3)', fontSize:'.78rem' }}
                onClick={() => setConfirmClear(true)}>
                🗑️ مسح السجل
              </button>
            )
          )}
        </div>
        <div style={{ marginBottom: '1rem', padding: '.75rem 1rem', background: 'rgba(79,140,255,.06)', borderRadius: 10, border: '1px solid rgba(79,140,255,.15)' }}>
          <p style={{ fontSize: '.82rem', color: 'var(--text2)' }}>💡 إذا رأيت جهازاً غريباً، قم بتغيير كلمة مرورك فوراً ولا تشارك بياناتك مع أحد.</p>
        </div>

        {loadHist
          ? <div className="spinner-wrap" style={{ padding: '2rem' }}><div className="spinner" /></div>
          : loginHistory.length === 0
            ? <div className="empty" style={{ padding:'1.5rem' }}><span className="empty-icon">📋</span><p>لا يوجد سجل تسجيلات</p></div>
            : loginHistory.slice(0, 10).map((h, i) => (
              <div key={h.id || i} style={{ display:'flex', alignItems:'center', gap:'1rem', padding:'.85rem 0', borderBottom: i < Math.min(loginHistory.length,10)-1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width:40, height:40, borderRadius:10, background: h.is_successful ? 'rgba(0,212,170,.1)' : 'rgba(255,79,106,.1)', border:`1px solid ${h.is_successful ? 'rgba(0,212,170,.2)' : 'rgba(255,79,106,.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
                  {h.device_name?.includes('موبايل') ? '📱' : '💻'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'.85rem' }}>{h.device_name || 'جهاز غير معروف'}</div>
                  <div style={{ fontSize:'.73rem', color:'var(--text3)', marginTop:'.15rem' }}>
                    🌐 {h.ip_address} · 🕐 {new Date(h.created_at).toLocaleString('ar-EG')}
                  </div>
                </div>
                <div style={{ display:'flex', gap:'.5rem', alignItems:'center', flexShrink:0 }}>
                  <span className={`badge ${h.is_successful ? 'badge-green' : 'badge-red'}`} style={{ fontSize:'.68rem' }}>
                    {h.is_successful ? '✓ ناجح' : '✗ فاشل'}
                  </span>
                  {h.id && (
                    <button onClick={() => deleteEntry(h.id)} disabled={deletingId === h.id}
                      title="حذف هذا السجل"
                      style={{ width:26, height:26, borderRadius:7, background:'rgba(255,79,106,.1)', border:'1px solid rgba(255,79,106,.2)', color:'var(--red)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.75rem', flexShrink:0 }}>
                      {deletingId === h.id ? '…' : '🗑️'}
                    </button>
                  )}
                </div>
              </div>
            ))
        }
      </div>

      {/* Danger Zone */}
      <div style={{ ...S.box, border:'1px solid rgba(255,79,106,.3)', background:'rgba(255,79,106,.03)' }}>
        <h3 style={{ fontWeight:700, marginBottom:'.75rem', color:'var(--red)' }}>⚠️ تسجيل الخروج</h3>
        <button className="btn btn-danger btn-sm" onClick={async () => { await logout(); navigate('/') }}>🚪 تسجيل الخروج</button>
      </div>
    </div>
  )
}



const S = {
  title: { fontFamily:"'Tajawal',sans-serif", fontSize:'1.5rem', fontWeight:900, marginBottom:'1.5rem' },
  card:  { display:'flex', alignItems:'center', gap:'1rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1rem 1.25rem', marginBottom:'.75rem' },
  box:   { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.5rem', marginBottom:'1.5rem' },
}
