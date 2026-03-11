import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api, { coursesAPI, enrollmentsAPI, instructorsAPI, authAPI } from '../api'
import { formatDate, formatPrice, courseEmoji, getImgUrl } from '../utils'
import ExamManager from './ExamManager'
import CourseContent from './CourseContent'
import StudentManager from './StudentManager'

const PANELS = [
  { id: 'overview',    icon: '📊', label: 'لوحة التحكم' },
  { id: 'my-courses',  icon: '🎓', label: 'كورساتي' },
  { id: 'add-course',  icon: '➕', label: 'إضافة كورس' },
  { id: 'exams',       icon: '📝', label: 'الامتحانات' },
  { id: 'my-students', icon: '👨‍🎓', label: 'طلابي' },
  { id: 'profile',     icon: '👤', label: 'ملفي الشخصي' },
  { id: 'settings',    icon: '⚙️', label: 'الإعدادات' },
]

export default function InstructorDashboard({ showToast }) {
  const { panel = 'overview' } = useParams()
  const [active, setActive] = useState(panel)
  const [pendingCount, setPendingCount] = useState(0)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { setActive(panel) }, [panel])

  // تحديث عدد الطلاب المنتظرين كل 30 ثانية
  useEffect(() => {
    async function fetchPending() {
      try {
        const r = await enrollmentsAPI.instructorList({ status: 'pending', limit: 1 })
        setPendingCount(r.data.summary?.pending || r.data.count || 0)
      } catch {}
    }
    fetchPending()
    const interval = setInterval(fetchPending, 30000)
    return () => clearInterval(interval)
  }, [])

  function go(p) {
    setActive(p)
    navigate(`/instructor/${p}`)
  }

  if (!user) return <div className="spinner-wrap"><div className="spinner" /></div>

  return (
    <div style={S.layout}>
      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        <div style={S.userChip}>
          <div style={S.av}>
            {user.avatar ? (
              <img src={getImgUrl(user.avatar)}
                alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }}
                onError={e => e.target.style.display='none'} />
            ) : (user.first_name?.[0] || user.email[0]).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{user.first_name || user.username} {user.last_name || ''}</div>
            <div style={{ fontSize: '.72rem', color: 'var(--accent)', fontWeight: 600 }}>🎓 مدرب معتمد</div>
          </div>
        </div>

        <div style={S.sideLabel}>لوحة المدرب</div>
        {PANELS.map(p => (
          <div key={p.id} style={{ ...S.sideItem, ...(active === p.id ? S.sideActive : {}) }} onClick={() => go(p.id)}>
            <span>{p.icon}</span> {p.label}
            {p.id === 'add-course' && <span style={S.newBadge}>جديد</span>}
            {p.id === 'my-students' && pendingCount > 0 && (
              <span style={{
                background: 'linear-gradient(135deg,#ef4444,#dc2626)',
                color: 'white', borderRadius: '50%',
                minWidth: 20, height: 20, fontSize: '.65rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginRight: 'auto', padding: '0 4px',
                boxShadow: '0 0 0 3px rgba(239,68,68,.2)',
                animation: 'pulse-glow 1.5s ease infinite'
              }}>
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </div>
        ))}

        <div style={S.sideLabel}>أخرى</div>
        <div style={S.sideItem} onClick={() => navigate('/')}>
          <span>🌐</span> الموقع الرئيسي
        </div>
        <div style={{ ...S.sideItem, color: 'var(--red)' }} onClick={async () => { await logout(); navigate('/') }}>
          <span>🚪</span> تسجيل الخروج
        </div>
      </aside>

      {/* ── Content ── */}
      <main style={S.content}>
        {active === 'overview'    && <Overview user={user} navigate={navigate} showToast={showToast} pendingStats={pendingCount} />}
        {active === 'my-courses'  && <MyCourses navigate={navigate} go={go} showToast={showToast} />}
        {active === 'add-course'  && <AddCourse showToast={showToast} go={go} />}
        {active === 'exams'       && <ExamManager showToast={showToast} />}
        {active === 'my-students' && <StudentManager showToast={showToast} onPendingUpdate={setPendingCount} />}
        {active === 'profile'     && <InstructorProfile user={user} showToast={showToast} />}
        {active === 'settings'    && <Settings showToast={showToast} logout={logout} navigate={navigate} />}
      </main>
    </div>
  )
}

// ── OVERVIEW ──────────────────────────────────────────────────
function Overview({ user, navigate, showToast, pendingStats=0 }) {
  const [stats, setStats] = useState({ courses: 0, students: 0, rating: 0, revenue: 0 })
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    coursesAPI.myCourses({ limit: 5 })
      .then(r => {
        const list = r.data.results || []
        setCourses(list)
        setStats({
          courses: list.length,
          students: list.reduce((a, c) => a + (c.students_count || 0), 0),
          rating: list.length ? (list.reduce((a, c) => a + parseFloat(c.rating || 0), 0) / list.length).toFixed(1) : 0,
          revenue: list.reduce((a, c) => a + (parseFloat(c.price || 0) * (c.students_count || 0)), 0),
        })
      }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={S.pageHead}>
        <h2 style={S.pageTitle}>أهلاً، {user.first_name} 👋</h2>
        <p style={{ color: 'var(--text2)' }}>هنا ملخص أداء كورساتك</p>
      </div>

      {/* إشعار الطلاب المنتظرين */}
      {pendingStats > 0 && (
        <div style={{ background:'linear-gradient(135deg,rgba(239,68,68,.1),rgba(220,38,38,.05))', border:'1px solid rgba(239,68,68,.3)', borderRadius:14, padding:'1rem 1.25rem', marginBottom:'1.5rem', display:'flex', alignItems:'center', gap:'1rem', animation:'fadeUp .4s ease both', cursor:'pointer' }}
          onClick={() => navigate('/instructor/my-students')}>
          <div style={{ width:44, height:44, borderRadius:'50%', background:'rgba(239,68,68,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0, animation:'pulse-glow 1.5s ease infinite' }}>
            🔔
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:'.95rem', color:'#ef4444' }}>
              {pendingStats} طالب ينتظر موافقتك!
            </div>
            <div style={{ fontSize:'.8rem', color:'var(--text2)', marginTop:'.2rem' }}>
              اضغط هنا لمراجعة طلبات التسجيل والقبول أو الرفض
            </div>
          </div>
          <div style={{ color:'var(--text3)', fontSize:'1.2rem' }}>←</div>
        </div>
      )}

      <div style={S.statsGrid}>
        {[
          { label: 'الكورسات', val: stats.courses,  color: 'var(--accent)',  icon: '🎓' },
          { label: 'الطلاب',   val: stats.students,  color: 'var(--accent3)', icon: '👨‍🎓' },
          { label: 'التقييم',  val: stats.rating + '★', color: 'var(--gold)', icon: '⭐' },
          { label: 'الإيرادات (تقديري)', val: formatPrice(stats.revenue), color: 'var(--text)', icon: '💰' },
        ].map((s, i) => (
          <div key={i} style={S.statCard}>
            <div style={{ fontSize: '.78rem', color: 'var(--text3)', marginBottom: '.5rem' }}>{s.label}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2.5rem', opacity: .05 }}>{s.icon}</div>
          </div>
        ))}
      </div>

      <div style={S.box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1rem' }}>🎓 آخر الكورسات</h3>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/instructor/my-courses')}>عرض الكل</button>
        </div>
        {loading ? <div className="spinner-wrap"><div className="spinner" /></div> :
          courses.length ? courses.map((c, i) => (
            <div key={i} style={S.courseRow}>
              <span style={{ fontSize: '2rem' }}>{courseEmoji(c.category?.name)}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{c.title}</div>
                <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{c.students_count || 0} طالب • ⭐ {c.rating || 0}</div>
              </div>
              <span className={`badge ${c.is_published ? 'badge-green' : 'badge-gold'}`}>
                {c.is_published ? 'منشور' : 'مسودة'}
              </span>
            </div>
          )) : (
            <div className="empty" style={{ padding: '2rem' }}>
              <div className="empty-icon">🎓</div>
              <p>لم تضف أي كورس بعد</p>
              <button className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }} onClick={() => navigate('/instructor/add-course')}>أضف أول كورس</button>
            </div>
          )
        }
      </div>
    </div>
  )
}

// ── MY COURSES ────────────────────────────────────────────────
function MyCourses({ navigate, go, showToast }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editCourse, setEditCourse] = useState(null)
  const [showEdit, setShowEdit] = useState(false)
  const [contentCourse, setContentCourse] = useState(null)  // ← إدارة المحتوى
  const { user } = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const r = await coursesAPI.myCourses({ limit: 100 })
      setCourses(r.data.results || [])
    } catch {} finally { setLoading(false) }
  }

  async function deleteCourse(id) {
    if (!confirm('هل أنت متأكد من حذف الكورس؟')) return
    try {
      await coursesAPI.delete(id)
      showToast('تم حذف الكورس ✅', 'success')
      load()
    } catch { showToast('حدث خطأ في الحذف', 'error') }
  }

  if (loading) return <div className="spinner-wrap"><div className="spinner" /></div>

  // ── صفحة إدارة المحتوى ──
  if (contentCourse) return (
    <CourseContent
      course={contentCourse}
      showToast={showToast}
      onBack={() => setContentCourse(null)}
    />
  )

  // ── فورم التعديل ──
  if (showEdit && editCourse) return (
    <AddCourse
      showToast={showToast}
      go={() => { setShowEdit(false); setEditCourse(null); load() }}
      editData={editCourse}
    />
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={S.pageTitle}>🎓 كورساتي</h2>
        <button className="btn btn-primary" onClick={() => go('add-course')}>➕ إضافة كورس</button>
      </div>

      {courses.length ? courses.map((c, i) => (
        <div key={i} style={S.courseCard}>
          <div style={{ fontSize: '2.5rem', width: 60, height: 60, background: 'var(--bg3)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {courseEmoji(c.category_detail?.name || c.category?.name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: '.3rem' }}>{c.title}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--text3)', marginBottom: '.5rem' }}>
              {c.category_detail?.name || ''} • {c.students_count || 0} طالب • ⭐ {c.rating || 0} • {formatPrice(c.price)}
            </div>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <span className={`badge ${c.is_published ? 'badge-green' : 'badge-gold'}`}>{c.is_published ? '✅ منشور' : '📝 مسودة'}</span>
              <span className="badge badge-blue">{c.level === 'beginner' ? 'مبتدئ' : c.level === 'intermediate' ? 'متوسط' : 'متقدم'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setContentCourse(c)}>🎬 المحتوى</button>
            <button
              className={`btn btn-sm ${c.is_published ? 'btn-ghost' : 'btn-success'}`}
              onClick={async () => {
                try {
                  const r = await coursesAPI.publish(c.id)
                  load()
                  showToast(r.data.message, 'success')
                } catch { showToast('حدث خطأ', 'error') }
              }}>
              {c.is_published ? '🔒 إلغاء النشر' : '🚀 نشر'}
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/courses/${c.slug || c.id}`)}>👁️ عرض</button>
            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/watch/${c.id}`)}>▶️ مشاهدة</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { setEditCourse(c); setShowEdit(true) }}>✏️ تعديل</button>
            <button className="btn btn-sm" style={{ background: 'rgba(255,79,106,.1)', color: 'var(--red)' }} onClick={() => deleteCourse(c.id)}>🗑️</button>
          </div>
        </div>
      )) : (
        <div className="empty">
          <div className="empty-icon">🎓</div>
          <h3>لم تضف أي كورس بعد</h3>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => go('add-course')}>➕ أضف أول كورس</button>
        </div>
      )}
    </div>
  )
}

// ── ADD / EDIT COURSE ─────────────────────────────────────────
function AddCourse({ showToast, go, editData = null }) {
  const [cats, setCats]         = useState([])
  const [saving, setSaving]     = useState(false)
  const [thumbFile, setThumbFile] = useState(null)
  const [thumbPreview, setThumbPreview] = useState(editData?.thumbnail ? getImgUrl(editData.thumbnail) : null)
  const thumbRef = useRef(null)
  const [form, setForm] = useState({
    title: editData?.title || '',
    description: editData?.description || '',
    category: editData?.category_detail?.id || editData?.category || '',
    level: editData?.level || 'beginner',
    language: editData?.language || 'ar',
    price: editData?.price || '',
    discount_price: editData?.discount_price || '',
    duration_hours: editData?.duration_hours || '',
    requirements: editData?.requirements || '',
    what_will_learn: editData?.what_will_learn || '',
    trailer_url: editData?.trailer_url || '',
    group_link: editData?.group_link || '',
    is_published: editData?.is_published || false,
  })

  useEffect(() => {
    coursesAPI.categories().then(r => {
      const list = r.data.results || []
      setCats(list)
    }).catch((e) => { console.error('Categories error:', e) })
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleThumbPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { showToast('الصورة أكبر من 5 ميجا', 'error'); return }
    setThumbFile(file)
    setThumbPreview(URL.createObjectURL(file))
  }

  async function save() {
    if (!form.title || !form.description || !form.category) {
      showToast('يرجى ملء العنوان والوصف والتصنيف', 'error'); return
    }
    setSaving(true)
    try {
      let savedCourse
      const payload = { ...form, price: form.price || 0, category: parseInt(form.category) }

      if (editData) {
        const r = await coursesAPI.update(editData.id, payload)
        savedCourse = r.data
        showToast('تم تحديث الكورس ✅', 'success')
      } else {
        const r = await coursesAPI.create(payload)
        savedCourse = r.data
        showToast('تم إنشاء الكورس ✅', 'success')
      }

      // رفع الصورة إن وُجدت
      if (thumbFile && savedCourse?.id) {
        const fd = new FormData()
        fd.append('thumbnail', thumbFile)
        await coursesAPI.update(savedCourse.id, fd)
      }

      go('my-courses')
    } catch (e) {
      const errs = Object.values(e.response?.data || {}).flat().join('. ')
      showToast(errs || 'حدث خطأ', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <h2 style={S.pageTitle}>{editData ? '✏️ تعديل الكورس' : '➕ إضافة كورس جديد'}</h2>

      <div style={S.box}>
        <h3 style={S.sectionHead}>المعلومات الأساسية</h3>

        {/* ── صورة الغلاف ── */}
        <div className="form-group">
          <label className="form-label">🖼️ صورة غلاف الكورس</label>
          <input ref={thumbRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleThumbPick} />
          {thumbPreview ? (
            <div style={{ position:'relative', width:'100%', maxWidth:400, marginBottom:'.5rem' }}>
              <img src={thumbPreview} alt="thumbnail" style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', borderRadius:12, border:'1px solid var(--border)' }} />
              <button type="button" onClick={() => { setThumbFile(null); setThumbPreview(null) }}
                style={{ position:'absolute', top:8, left:8, width:28, height:28, borderRadius:'50%', background:'rgba(255,79,106,.9)', border:'none', color:'white', fontWeight:700, cursor:'pointer', fontSize:'.75rem', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              <button type="button" onClick={() => thumbRef.current?.click()}
                style={{ position:'absolute', bottom:8, left:8, padding:'.3rem .7rem', borderRadius:8, background:'rgba(0,0,0,.6)', border:'none', color:'white', fontSize:'.75rem', cursor:'pointer', fontFamily:"'Cairo',sans-serif" }}>تغيير</button>
            </div>
          ) : (
            <div onClick={() => thumbRef.current?.click()}
              style={{ border:'2px dashed var(--border2)', borderRadius:12, padding:'2rem', textAlign:'center', cursor:'pointer', transition:'all .2s', maxWidth:400, aspectRatio:'16/9', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border2)'}>
              <div style={{ fontSize:'2.5rem', marginBottom:'.5rem' }}>🖼️</div>
              <div style={{ fontWeight:600, marginBottom:'.25rem' }}>انقر لرفع صورة الغلاف</div>
              <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>PNG, JPG • 16:9 • حد أقصى 5 ميجا</div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">عنوان الكورس *</label>
          <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="مثال: تعلم Python من الصفر" />
        </div>
        <div className="form-group">
          <label className="form-label">وصف الكورس *</label>
          <textarea className="form-input" rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="اشرح ما يتضمنه الكورس..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">التصنيف *</label>
            <select className="form-input" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">اختر التصنيف</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المستوى</label>
            <select className="form-input" value={form.level} onChange={e => set('level', e.target.value)}>
              <option value="beginner">مبتدئ</option>
              <option value="intermediate">متوسط</option>
              <option value="advanced">متقدم</option>
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">اللغة</label>
            <select className="form-input" value={form.language} onChange={e => set('language', e.target.value)}>
              <option value="ar">عربي</option>
              <option value="en">إنجليزي</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">المدة (بالساعات)</label>
            <input className="form-input" type="number" value={form.duration_hours} onChange={e => set('duration_hours', e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      <div style={S.box}>
        <h3 style={S.sectionHead}>السعر والنشر</h3>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">السعر (ج.م) — اتركه 0 للمجاني</label>
            <input className="form-input" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">سعر الخصم (اختياري)</label>
            <input className="form-input" type="number" value={form.discount_price} onChange={e => set('discount_price', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">رابط الفيديو التعريفي (اختياري)</label>
          <input className="form-input" value={form.trailer_url} onChange={e => set('trailer_url', e.target.value)} placeholder="https://youtube.com/..." />
        </div>
        <div className="form-group">
          <label className="form-label">💬 رابط جروب الكورس (واتساب / تيليجرام)</label>
          <input className="form-input" value={form.group_link} onChange={e => set('group_link', e.target.value)} placeholder="https://chat.whatsapp.com/... أو https://t.me/..." />
          <div className="form-hint">سيظهر هذا الرابط للطلاب المقبولين فقط</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg3)', borderRadius: 10 }}>
          <input type="checkbox" id="published" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
          <label htmlFor="published" style={{ cursor: 'pointer', fontWeight: 600 }}>نشر الكورس الآن</label>
          <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>(إذا لم تختر، سيُحفظ كمسودة)</span>
        </div>
      </div>

      <div style={S.box}>
        <h3 style={S.sectionHead}>محتوى الكورس</h3>
        <div className="form-group">
          <label className="form-label">ماذا سيتعلم الطالب؟</label>
          <textarea className="form-input" rows={3} value={form.what_will_learn} onChange={e => set('what_will_learn', e.target.value)} placeholder="اكتب النقاط الرئيسية التي سيتعلمها الطالب..." />
        </div>
        <div className="form-group">
          <label className="form-label">المتطلبات المسبقة</label>
          <textarea className="form-input" rows={3} value={form.requirements} onChange={e => set('requirements', e.target.value)} placeholder="ما الذي يجب أن يعرفه الطالب قبل الكورس؟" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
          {saving ? <><span className="spinner spinner-sm" /> جاري الحفظ...</> : editData ? '💾 حفظ التعديلات' : '🚀 إنشاء الكورس'}
        </button>
        <button className="btn btn-outline btn-lg" onClick={() => go('my-courses')}>إلغاء</button>
      </div>
    </div>
  )
}



// ── INSTRUCTOR PROFILE ────────────────────────────────────────
function InstructorProfile({ user, showToast }) {
  const { refetch } = useAuth()
  const [profile, setProfile] = useState(null)
  const [saving, setSaving]   = useState(false)
  const [avatarFile, setAvatarFile]       = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(getImgUrl(user.avatar))
  const avatarRef = useRef(null)
  const [form, setForm] = useState({
    bio: '', specialization: '', years_of_experience: 0,
    website: '', linkedin: '', github: '',
  })

  useEffect(() => {
    instructorsAPI.me().then(r => {
      setProfile(r.data)
      setForm({
        bio: r.data.bio || '',
        specialization: r.data.specialization || '',
        years_of_experience: r.data.years_of_experience || 0,
        website: r.data.website || '',
        linkedin: r.data.linkedin || '',
        github: r.data.github || '',
      })
    }).catch(() => {
      setForm(f => ({ ...f, bio: user.bio || '' }))
    })
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

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
      // ── 1. حفظ بيانات المدرب (specialization, experience...)
      try { await instructorsAPI.update(form) } catch (_) {}

      // ── 2. حفظ البيو + الصورة في طلب واحد
      const fd = new FormData()
      fd.append('bio', form.bio)
      fd.append('first_name', user.first_name || '')
      fd.append('last_name',  user.last_name  || '')
      if (avatarFile) fd.append('avatar', avatarFile)
      await authAPI.updateProfile(fd)

      // ── 3. تحديث بيانات المستخدم في الـ context
      await refetch()

      showToast('تم حفظ الملف الشخصي ✅', 'success')
    } catch (e) {
      const msg = e.response?.data
        ? Object.values(e.response.data).flat().join(' | ')
        : 'حدث خطأ في الحفظ'
      showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  const initials = (user.first_name?.[0] || user.email[0]).toUpperCase()

  return (
    <div>
      <h2 style={S.pageTitle}>👤 ملفي الشخصي</h2>

      {/* Profile Header — مع رفع الصورة */}
      <div style={{ ...S.box, display:'flex', gap:'1.5rem', alignItems:'center', marginBottom:'1.5rem' }}>
        <div style={{ position:'relative', flexShrink:0 }}>
          <div style={{ width:100, height:100, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.4rem', fontWeight:900, color:'white', overflow:'hidden', border:'3px solid var(--accent)', boxShadow:'0 0 0 4px rgba(79,140,255,.15), 0 8px 32px rgba(0,0,0,.35)' }}>
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'} />
              : initials}
          </div>
          <button type="button" title="تغيير الصورة"
            onClick={() => avatarRef.current?.click()}
            style={{ position:'absolute', bottom:2, left:2, width:30, height:30, borderRadius:'50%', background:'var(--grad)', border:'2px solid var(--surface)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontSize:'.75rem', boxShadow:'0 2px 8px rgba(0,0,0,.3)', transition:'transform .2s' }}
            onMouseEnter={e=>e.currentTarget.style.transform='scale(1.15)'}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}>
            📷
          </button>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarPick} />
        </div>
        <div>
          <div style={{ fontFamily:"'Tajawal',sans-serif", fontSize:'1.3rem', fontWeight:900 }}>{user.first_name} {user.last_name}</div>
          <div style={{ color:'var(--accent)', fontSize:'.85rem', fontWeight:600, marginBottom:'.25rem' }}>🎓 مدرب معتمد</div>
          <div style={{ color:'var(--text2)', fontSize:'.85rem' }}>📧 {user.email}</div>
          {avatarFile && <div style={{ fontSize:'.75rem', color:'var(--accent3)', marginTop:'.3rem' }}>✓ صورة جديدة — ستُرفع عند الحفظ</div>}
        </div>
      </div>

      {/* Professional Info */}
      <div style={S.box}>
        <h3 style={S.sectionHead}>المعلومات المهنية</h3>
        <div className="form-group">
          <label className="form-label">نبذة تعريفية</label>
          <textarea className="form-input" rows={4} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="اكتب نبذة عن خبرتك ومجال تخصصك..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">التخصص</label>
            <input className="form-input" value={form.specialization} onChange={e => set('specialization', e.target.value)} placeholder="مطور ويب، مصمم UI، خبير بيانات..." />
          </div>
          <div className="form-group">
            <label className="form-label">سنوات الخبرة</label>
            <input className="form-input" type="number" value={form.years_of_experience} onChange={e => set('years_of_experience', e.target.value)} min={0} />
          </div>
        </div>
      </div>

      {/* Social Links */}
      <div style={S.box}>
        <h3 style={S.sectionHead}>روابط التواصل</h3>
        <div className="form-group">
          <label className="form-label">🌐 الموقع الشخصي</label>
          <input className="form-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://mywebsite.com" />
        </div>
        <div className="form-group">
          <label className="form-label">💼 LinkedIn</label>
          <input className="form-input" value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/username" />
        </div>
        <div className="form-group">
          <label className="form-label">🐙 GitHub</label>
          <input className="form-input" value={form.github} onChange={e => set('github', e.target.value)} placeholder="https://github.com/username" />
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={save} disabled={saving}>
        {saving ? <><span className="spinner spinner-sm" /> جاري الحفظ...</> : '💾 حفظ التغييرات'}
      </button>
    </div>
  )
}



// ── SETTINGS ──────────────────────────────────────────────────
function Settings({ showToast, logout, navigate }) {
  const [oldPass, setOldPass]             = useState('')
  const [newPass, setNewPass]             = useState('')
  const [confirm, setConfirm]             = useState('')
  const [loginHistory, setLoginHistory]   = useState([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [deletingId, setDeletingId]       = useState(null)
  const [confirmClear, setConfirmClear]   = useState(false)

  useEffect(() => { loadHistory() }, [])

  function loadHistory() {
    setLoadingHistory(true)
    authAPI.loginHistory()
      .then(r => setLoginHistory(r.data.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false))
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
      showToast(e.response?.data?.error || 'حدث خطأ في المسح', 'error')
    }
  }

  function getDeviceIcon(deviceName) {
    if (!deviceName) return '💻'
    const d = deviceName.toLowerCase()
    if (d.includes('موبايل') || d.includes('mobile')) return '📱'
    if (d.includes('تابلت') || d.includes('tablet')) return '📟'
    return '💻'
  }

  return (
    <div style={{ animation: 'fadeUp .4s ease' }}>
      <h2 style={S.pageTitle}>⚙️ الإعدادات</h2>

      {/* Change Password */}
      <div style={S.box}>
        <h3 style={S.sectionHead}>🔐 تغيير كلمة المرور</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">كلمة المرور الحالية</label>
            <input className="form-input" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">كلمة المرور الجديدة</label>
            <input className="form-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="8 أحرف على الأقل" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">تأكيد كلمة المرور</label>
            <input className="form-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="أعد كتابة كلمة المرور" />
          </div>
        </div>
        <button className="btn btn-primary" onClick={changePass} style={{ marginTop: '1.25rem' }}>
          حفظ كلمة المرور الجديدة
        </button>
      </div>

      {/* Login Devices History */}
      <div style={S.box}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', paddingBottom:'.75rem', borderBottom:'1px solid var(--border)' }}>
          <h3 style={{ fontWeight:700, fontSize:'1rem' }}>📱 الأجهزة والتسجيلات</h3>
          {loginHistory.length > 0 && (
            confirmClear ? (
              <div style={{ display:'flex', gap:'.5rem', alignItems:'center' }}>
                <span style={{ fontSize:'.8rem', color:'var(--text2)' }}>هل أنت متأكد؟</span>
                <button className="btn btn-danger btn-sm" onClick={clearAll}>نعم، امسح الكل</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>إلغاء</button>
              </div>
            ) : (
              <button className="btn btn-outline btn-sm" style={{ color:'var(--red)', borderColor:'rgba(255,79,106,.3)' }}
                onClick={() => setConfirmClear(true)}>
                🗑️ مسح السجل كله
              </button>
            )
          )}
        </div>
        <div style={{ marginBottom: '1rem', padding: '.75rem 1rem', background: 'rgba(79,140,255,.06)', borderRadius: 10, border: '1px solid rgba(79,140,255,.15)' }}>
          <p style={{ fontSize: '.82rem', color: 'var(--text2)' }}>
            💡 يمكنك مراقبة الأجهزة التي سجلت دخولاً بحسابك. في حال وجود نشاط مشبوه، قم بتغيير كلمة المرور فوراً.
          </p>
        </div>
        {loadingHistory ? (
          <div className="spinner-wrap" style={{ padding: '2rem' }}><div className="spinner" /></div>
        ) : loginHistory.length === 0 ? (
          <div className="empty" style={{ padding: '2rem' }}>
            <span className="empty-icon">📋</span>
            <p>لا يوجد سجل تسجيلات</p>
          </div>
        ) : (
          <div>
            {loginHistory.slice(0, 10).map((h, i) => (
              <div key={h.id || i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '.85rem 0', borderBottom: i < Math.min(loginHistory.length, 10) - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: h.is_successful ? 'rgba(0,212,170,.1)' : 'rgba(255,79,106,.1)', border: `1px solid ${h.is_successful ? 'rgba(0,212,170,.2)' : 'rgba(255,79,106,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                  {getDeviceIcon(h.device_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: '.15rem' }}>
                    {h.device_name || 'جهاز غير معروف'}
                    {!h.is_successful && <span className="badge badge-red" style={{ marginRight: '.5rem', fontSize: '.65rem' }}>محاولة فاشلة</span>}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text3)', display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
                    <span>🌐 {h.ip_address}</span>
                    <span>🕐 {new Date(h.created_at).toLocaleString('ar-EG')}</span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'.5rem', alignItems:'center', flexShrink:0 }}>
                  <span className={`badge ${h.is_successful ? 'badge-green' : 'badge-red'}`}>
                    {h.is_successful ? '✓ ناجح' : '✗ فاشل'}
                  </span>
                  <button
                    onClick={() => deleteEntry(h.id)}
                    disabled={deletingId === h.id}
                    title="حذف هذا السجل"
                    style={{ width:28, height:28, borderRadius:8, background:'rgba(255,79,106,.1)', border:'1px solid rgba(255,79,106,.2)', color:'var(--red)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem', flexShrink:0 }}>
                    {deletingId === h.id ? '…' : '🗑️'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div style={{ ...S.box, border: '1px solid rgba(255,79,106,.3)', background: 'rgba(255,79,106,.03)' }}>
        <h3 style={{ ...S.sectionHead, color: 'var(--red)', borderColor: 'rgba(255,79,106,.2)' }}>⚠️ منطقة الخطر</h3>
        <p style={{ color: 'var(--text2)', fontSize: '.88rem', marginBottom: '1rem' }}>
          تسجيل الخروج من جميع الأجهزة سيُلغي جميع الجلسات النشطة
        </p>
        <button className="btn btn-danger btn-sm" onClick={async () => { await logout(); navigate('/') }}>
          🚪 تسجيل الخروج
        </button>
      </div>
    </div>
  )
}



// ── STYLES ────────────────────────────────────────────────────
const S = {
  layout:     { display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: '100vh', paddingTop: 64 },
  sidebar:    { background: 'var(--bg2)', borderLeft: '1px solid var(--border)', padding: '1.25rem 1rem', position: 'sticky', top: 64, height: 'calc(100vh - 64px)', overflowY: 'auto' },
  userChip:   { display: 'flex', alignItems: 'center', gap: '.75rem', padding: '1rem', background: 'var(--surface)', borderRadius: 12, marginBottom: '1rem' },
  av:         { width: 44, height: 44, borderRadius: '50%', background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'white', fontSize: '1.1rem', flexShrink: 0, overflow: 'hidden', border: '2px solid var(--accent)', boxShadow: '0 0 0 3px rgba(79,140,255,.15)' },
  sideLabel:  { fontSize: '.68rem', color: 'var(--text3)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '0 .75rem', margin: '.75rem 0 .4rem' },
  sideItem:   { display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.65rem .75rem', borderRadius: 10, cursor: 'pointer', color: 'var(--text2)', fontSize: '.88rem', fontWeight: 500, transition: 'all .2s', marginBottom: '.1rem' },
  sideActive: { background: 'rgba(79,140,255,0.12)', color: 'var(--accent)' },
  newBadge:   { marginRight: 'auto', background: 'var(--accent3)', color: '#0a0e1a', borderRadius: 4, padding: '.1rem .4rem', fontSize: '.65rem', fontWeight: 700 },
  content:    { padding: '2rem', overflowY: 'auto' },
  pageHead:   { marginBottom: '2rem' },
  pageTitle:  { fontFamily: "'Tajawal',sans-serif", fontSize: '1.5rem', fontWeight: 900, marginBottom: '.25rem' },
  statsGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard:   { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', position: 'relative', overflow: 'hidden' },
  box:        { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' },
  sectionHead:{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', paddingBottom: '.75rem', borderBottom: '1px solid var(--border)' },
  courseRow:  { display: 'flex', alignItems: 'center', gap: '1rem', padding: '.75rem 0', borderBottom: '1px solid var(--border)' },
  courseCard: { display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1rem' },
}
