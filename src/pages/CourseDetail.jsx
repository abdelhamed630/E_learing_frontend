import { useState, useEffect, useRef, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { formatPrice, levelLabel, courseEmoji, getImgUrl } from '../utils'
import ProtectedVideoPlayer from '../components/ProtectedVideoPlayer'

// ═══════════════════════════════════════════════════
//  COURSE DETAIL  — فيديو مجاني + تعليقات فيس بوك ستايل
// ═══════════════════════════════════════════════════
export default function CourseDetail({ showToast }) {
  const { id }       = useParams()
  const { user }     = useAuth()
  const navigate     = useNavigate()

  const [course,       setCourse]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [enrolling,    setEnrolling]    = useState(false)
  const [enrolled,     setEnrolled]     = useState(false)
  const [enrollStatus, setEnrollStatus] = useState(null)
  const [previewVideo, setPreviewVideo] = useState(null) // الفيديو المجاني الظاهر

  useEffect(() => {
    setLoading(true); setError(null)
    api.get(`/courses/courses/${id}/`)
      .then(r => {
        setCourse(r.data)
        setEnrolled(r.data.is_enrolled || false)
        setEnrollStatus(r.data.enrollment_status || null)
        // أول فيديو مجاني
        const allVids = [
          ...(r.data.sections || []).flatMap(s => s.videos || []),
          ...(r.data.videos   || []),
        ]
        setPreviewVideo(allVids.find(v => v.is_free) || null)
      })
      .catch(e => {
        const s = e.response?.status
        if (s === 404) setError('الكورس غير موجود')
        else if (!e.response) setError('لا يوجد اتصال بالسيرفر')
        else setError('حدث خطأ في تحميل الكورس')
      })
      .finally(() => setLoading(false))
  }, [id])

  async function handleEnroll() {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'student') { showToast('فقط الطلاب يمكنهم التسجيل', 'error'); return }
    setEnrolling(true)
    try {
      const r = await api.post('/enrollments/enrollments/enroll/', { course_id: course.id })
      if (r.data.already_enrolled) {
        showToast(`حالة طلبك: ${r.data.status === 'pending' ? 'في انتظار موافقة المدرب ⏳' : 'مسجل بالفعل ✅'}`, 'info')
        setEnrollStatus(r.data.status)
      } else {
        showToast('تم إرسال طلب التسجيل — في انتظار موافقة المدرب ⏳', 'success')
        setEnrollStatus('pending')
      }
    } catch (e) {
      showToast(e.response?.data?.error || e.response?.data?.detail || 'حدث خطأ', 'error')
    } finally { setEnrolling(false) }
  }

  if (loading) return <div className="spinner-wrap" style={{ paddingTop:120 }}><div className="spinner" /></div>
  if (error || !course) return (
    <div style={{ paddingTop:120, textAlign:'center' }}>
      <div style={{ fontSize:'4rem', marginBottom:'1rem' }}>😕</div>
      <h2>{error || 'الكورس غير موجود'}</h2>
      <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={() => navigate('/courses')}>← الكورسات</button>
    </div>
  )

  const price      = course.discount_price || course.price
  const isFree     = !price || parseFloat(price) === 0
  const sections   = course.sections  || []
  const looseVids  = course.videos    || []
  const totalVids  = sections.reduce((a,s) => a+(s.videos?.length||0), 0) + looseVids.length
  const instr      = course.instructor
  const instrName  = instr?.full_name || instr?.username || '—'
  const instrAvUrl = getImgUrl(instr?.avatar_url || instr?.avatar)
  const instrInit  = instrName.trim().charAt(0).toUpperCase()
  const isInstructor = user?.role === 'instructor'

  // فيديوهات مجانية
  const allVids   = [...sections.flatMap(s=>s.videos||[]), ...looseVids]
  const freeVids  = allVids.filter(v=>v.is_free)

  const isActive = enrolled || enrollStatus==='active' || enrollStatus==='completed'

  return (
    <div style={{ paddingTop:80, minHeight:'100vh' }}>

      {/* ── HERO — صورة/فيديو فوق على كامل العرض ── */}
      <div style={{ background:'var(--bg2)', borderBottom:'1px solid var(--border)', marginBottom:'2rem' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 2rem' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:'2.5rem', alignItems:'center', padding:'2rem 0' }}>

            {/* Right: info */}
            <div>
              <div style={{ fontSize:'.8rem', color:'var(--text3)', marginBottom:'.75rem', display:'flex', gap:'.4rem', alignItems:'center' }}>
                <span style={{ cursor:'pointer', color:'var(--accent)' }} onClick={()=>navigate('/courses')}>الكورسات</span>
                <span>←</span>
                <span>{course.category?.name||'عام'}</span>
              </div>
              <h1 style={{ fontFamily:"'Tajawal',sans-serif", fontSize:'1.9rem', fontWeight:900, marginBottom:'1rem', lineHeight:1.4 }}>
                {course.title}
              </h1>
              <div style={{ display:'flex', gap:'.75rem', flexWrap:'wrap', fontSize:'.83rem', color:'var(--text2)', marginBottom:'1.25rem' }}>
                <span>⭐ {parseFloat(course.rating||0).toFixed(1)}</span>
                <span>👨‍🎓 {course.students_count||0} طالب</span>
                <span>⏱️ {course.duration_hours||0} ساعة</span>
                <span>🎬 {totalVids} فيديو</span>
                <span>🌐 {course.language==='ar'?'عربي':'إنجليزي'}</span>
                <span className="badge badge-blue">{levelLabel(course.level)}</span>
              </div>
              <p style={{ color:'var(--text2)', lineHeight:1.8, fontSize:'.93rem', marginBottom:'1.5rem', display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                {course.description}
              </p>
              <div style={{ display:'flex', alignItems:'center', gap:'.75rem' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize:'.8rem', overflow:'hidden', flexShrink:0 }}>
                  {instrAvUrl ? <img src={instrAvUrl} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} onError={e=>e.target.style.display='none'} /> : instrInit}
                </div>
                <span style={{ fontSize:'.85rem', color:'var(--text2)' }}>👨‍🏫 <strong>{instrName}</strong></span>
              </div>
            </div>

            {/* Left: صورة أو فيديو مجاني */}
            <div style={{ borderRadius:14, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,.25)', background:'var(--bg3)' }}>
              {previewVideo ? (
                <PreviewPlayer video={previewVideo} />
              ) : (
                <div style={{ aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'5rem', position:'relative', background:'linear-gradient(135deg,var(--bg3),var(--surface2))' }}>
                  {getImgUrl(course.thumbnail) ? (
                    <img src={getImgUrl(course.thumbnail)} alt={course.title}
                      style={{ width:'100%', height:'100%', objectFit:'cover', position:'absolute', inset:0 }}
                      onError={e=>e.target.style.display='none'} />
                  ) : null}
                  <span style={{ position:'relative', zIndex:1 }}>{courseEmoji(course.category?.name||course.title)}</span>
                </div>
              )}
              {previewVideo && (
                <div style={{ background:'linear-gradient(135deg,rgba(0,212,170,.12),rgba(79,140,255,.08))', padding:'.5rem .85rem', fontSize:'.75rem', color:'var(--accent3)', fontWeight:700, textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem' }}>
                  🔓 معاينة مجانية — {previewVideo.title}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── BODY — عمودين: محتوى يسار + كارت شراء يمين ── */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 2rem 4rem' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:'2rem', alignItems:'start' }}>

          {/* ── اليسار: تفاصيل ── */}
          <div>
            <p style={{ color:'var(--text2)', lineHeight:1.9, marginBottom:'2rem', fontSize:'.95rem' }}>{course.description}</p>

            {/* Instructor */}
            <div style={S.box}>
              <h3 style={S.boxTitle}>👨‍🏫 عن المدرب</h3>
              <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
                <div style={{ width:64, height:64, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, color:'white', fontSize:'1.4rem', flexShrink:0, overflow:'hidden', border:'3px solid var(--border2)' }}>
                  {instrAvUrl ? <img src={instrAvUrl} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} onError={e=>e.target.style.display='none'} /> : instrInit}
                </div>
                <div>
                  <div style={{ fontWeight:800, fontSize:'1.05rem' }}>{instrName}</div>
                  <div style={{ fontSize:'.8rem', color:'var(--accent)', fontWeight:600 }}>🎓 مدرب معتمد</div>
                </div>
              </div>
            </div>

            {course.what_will_learn && (
              <div style={S.box}>
                <h3 style={S.boxTitle}>📌 ماذا ستتعلم</h3>
                <p style={{ color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line' }}>{course.what_will_learn}</p>
              </div>
            )}

            {course.requirements && (
              <div style={S.box}>
                <h3 style={S.boxTitle}>✅ المتطلبات</h3>
                <p style={{ color:'var(--text2)', lineHeight:1.9, whiteSpace:'pre-line' }}>{course.requirements}</p>
              </div>
            )}

            {(sections.length > 0 || looseVids.length > 0) && (
              <div style={S.box}>
                <h3 style={S.boxTitle}>🎬 محتوى الكورس</h3>
                <p style={{ fontSize:'.8rem', color:'var(--text3)', marginBottom:'1rem' }}>
                  {sections.length > 0 ? `${sections.length} قسم • ` : ''}{totalVids} فيديو
                  {freeVids.length > 0 && <span style={{ color:'var(--accent3)', marginRight:'.5rem' }}>• {freeVids.length} مجاني 🔓</span>}
                </p>
                {sections.map((sec, i) => (
                  <div key={i} style={{ marginBottom:'.75rem' }}>
                    <div style={{ fontWeight:700, marginBottom:'.4rem', fontSize:'.9rem', padding:'.4rem .75rem', background:'var(--bg3)', borderRadius:8 }}>
                      {i+1}. {sec.title}
                      <span style={{ float:'left', fontSize:'.75rem', color:'var(--text3)', fontWeight:400 }}>{sec.videos?.length||0} فيديو</span>
                    </div>
                    {(sec.videos||[]).map((v, j) => (
                      <VideoRow key={j} v={v} enrolled={isActive} courseId={id} navigate={navigate} />
                    ))}
                  </div>
                ))}
                {looseVids.length > 0 && (
                  <div>
                    {sections.length > 0 && (
                      <div style={{ fontWeight:700, marginBottom:'.4rem', fontSize:'.9rem', padding:'.4rem .75rem', background:'var(--bg3)', borderRadius:8 }}>
                        فيديوهات إضافية <span style={{ float:'left', fontSize:'.75rem', color:'var(--text3)', fontWeight:400 }}>{looseVids.length} فيديو</span>
                      </div>
                    )}
                    {looseVids.map((v, j) => (
                      <VideoRow key={j} v={v} enrolled={isActive} courseId={id} navigate={navigate} />
                    ))}
                  </div>
                )}
              </div>
            )}

            <CommentsSection courseId={id} user={user} navigate={navigate} showToast={showToast} isInstructor={isInstructor && instr?.id === user?.id} />
          </div>

          {/* ── اليمين: كارت السعر والتسجيل — sticky ── */}
          <div style={{ position:'sticky', top:90 }}>
            <div style={S.card}>
              <div style={{ marginBottom:'1rem' }}>
                {isFree ? (
                  <div style={{ fontSize:'1.8rem', fontWeight:900, color:'var(--accent3)' }}>مجاني 🎁</div>
                ) : (
                  <div style={{ display:'flex', alignItems:'baseline', gap:'.5rem' }}>
                    {course.discount_price && <span style={{ textDecoration:'line-through', color:'var(--text3)', fontSize:'1rem' }}>{formatPrice(course.price)}</span>}
                    <span style={{ fontSize:'1.8rem', fontWeight:900, color:'var(--accent)' }}>{formatPrice(price)}</span>
                  </div>
                )}
              </div>

              {enrollStatus==='pending' ? (
                <div style={S.statusBox('#fbbf24','rgba(251,191,36,.1)')}>
                  <div style={{ fontWeight:700 }}>⏳ طلبك قيد المراجعة</div>
                  <div style={{ fontSize:'.8rem', opacity:.8 }}>في انتظار موافقة المدرب</div>
                </div>
              ) : enrollStatus==='rejected' ? (
                <div style={S.statusBox('#ef4444','rgba(239,68,68,.1)')}>
                  <div style={{ fontWeight:700 }}>❌ تم رفض طلبك</div>
                  <div style={{ fontSize:'.8rem', opacity:.8 }}>تواصل مع المدرب</div>
                </div>
              ) : enrollStatus==='blocked' ? (
                <div style={S.statusBox('#ef4444','rgba(239,68,68,.1)')}>
                  <div style={{ fontWeight:700 }}>🚫 تم حظرك من هذا الكورس</div>
                </div>
              ) : isActive ? (
                <>
                  <button className="btn btn-success btn-glow" style={{ width:'100%', marginBottom:'.75rem' }} onClick={()=>navigate(`/watch/${course.id}`)}>
                    ▶️ ابدأ المشاهدة
                  </button>
                  {course.group_link && (
                    <a href={course.group_link} target="_blank" rel="noopener noreferrer"
                      className="group-link-btn" style={{ width:'100%', justifyContent:'center', marginBottom:'.75rem', display:'flex' }}>
                      💬 انضم لجروب الكورس
                    </a>
                  )}
                </>
              ) : (
                <button className="btn btn-primary" style={{ width:'100%', marginBottom:'.75rem' }} onClick={handleEnroll} disabled={enrolling}>
                  {enrolling ? '⏳ جاري الإرسال...' : '🚀 أرسل طلب التسجيل'}
                </button>
              )}

              {!user && (
                <p style={{ fontSize:'.78rem', color:'var(--text3)', textAlign:'center', marginBottom:'.75rem' }}>
                  <span style={{ cursor:'pointer', color:'var(--accent)' }} onClick={()=>navigate('/login')}>سجل دخول</span> للتسجيل
                </p>
              )}

              <div style={{ fontSize:'.82rem', color:'var(--text3)', lineHeight:2.1, borderTop:'1px solid var(--border)', paddingTop:'.75rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'.55rem', marginBottom:'.6rem', paddingBottom:'.6rem', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize:'.8rem', flexShrink:0, overflow:'hidden' }}>
                    {instrAvUrl ? <img src={instrAvUrl} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} onError={e=>e.target.style.display='none'} /> : instrInit}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'.85rem', color:'var(--text)' }}>{instrName}</div>
                    <div style={{ fontSize:'.72rem' }}>👨‍🏫 المدرب</div>
                  </div>
                </div>
                <div>📁 {course.category?.name||'عام'}</div>
                <div>📶 {levelLabel(course.level)}</div>
                <div>🎬 {totalVids} فيديو • ⏱️ {course.duration_hours||0} س</div>
                {freeVids.length > 0 && <div style={{ color:'var(--accent3)', fontWeight:600 }}>🔓 {freeVids.length} فيديو مجاني</div>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

// ─── PreviewPlayer — memo يمنع الـ re-render عند الكتابة في التعليق ─
const PreviewPlayer = memo(({ video }) => {
  return (
    <div style={{ aspectRatio:'16/9' }}>
      <ProtectedVideoPlayer
        videoId={video.id}
        videoUrl={video.video_url}
        title={video.title}
        isEnrolled={false}
      />
    </div>
  )
})

// ─── VideoRow ────────────────────────────────────────────────
function VideoRow({ v, enrolled, courseId, navigate }) {
  const fmtDur = s => s ? `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` : ''
  const clickable = v.is_free || enrolled

  return (
    <div
      style={{ display:'flex', alignItems:'center', gap:'.5rem', padding:'.35rem 1rem', fontSize:'.82rem', color: clickable ? 'var(--text)' : 'var(--text3)', borderBottom:'1px solid var(--border)', cursor: clickable ? 'pointer' : 'default', transition:'background .12s' }}
      onClick={() => clickable && navigate(`/watch/${courseId}/${v.id}`)}
      onMouseEnter={e => { if(clickable) e.currentTarget.style.background='var(--surface2)' }}
      onMouseLeave={e => { e.currentTarget.style.background='transparent' }}
    >
      <span>{v.is_free ? '🔓' : '🔒'}</span>
      <span style={{ flex:1 }}>{v.title}</span>
      {v.is_free && <span className="badge badge-green" style={{ fontSize:'.62rem', padding:'.1rem .4rem' }}>مجاني</span>}
      {v.is_free && enrolled && <span style={{ fontSize:'.72rem', color:'var(--accent)' }}>← مشاهدة</span>}
      <span style={{ color:'var(--text3)', fontSize:'.72rem' }}>{fmtDur(v.duration)}</span>
    </div>
  )
}

// ─── CommentsSection ────────────────────────────────────────
function CommentsSection({ courseId, user, navigate, showToast, isInstructor }) {
  const [comments,  setComments]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [newText,   setNewText]   = useState('')
  const [sending,   setSending]   = useState(false)
  const [replyTo,   setReplyTo]   = useState(null)
  const [replyText, setReplyText] = useState('')
  const [expanded,  setExpanded]  = useState({})
  const textRef  = useRef(null)
  const replyRef = useRef(null)

  useEffect(() => {
    api.get(`/courses/courses/${courseId}/comments/`)
      .then(r => setComments(r.data.results || r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [courseId])

  async function submitComment() {
    if (!user) { navigate('/login'); return }
    const text = newText.trim()
    if (!text) return
    setSending(true)
    try {
      const r = await api.post(`/courses/courses/${courseId}/comments/add/`, { content: text })
      setComments(prev => [r.data, ...prev])
      setNewText('')
      showToast('تم نشر تعليقك ✅', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ', 'error')
    } finally { setSending(false) }
  }

  async function submitReply() {
    if (!user || !replyTo) return
    const text = replyText.trim()
    if (!text) return
    setSending(true)
    try {
      const r = await api.post(`/courses/courses/${courseId}/comments/add/`, { content: text, parent_id: replyTo.id })
      setComments(prev => prev.map(c => c.id === replyTo.id
        ? { ...c, replies: [...(c.replies||[]), r.data] }
        : c
      ))
      setExpanded(prev => ({ ...prev, [replyTo.id]: true }))
      setReplyTo(null)
      setReplyText('')
      showToast('تم الرد ✅', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ', 'error')
    } finally { setSending(false) }
  }

  async function toggleLike(commentId) {
    if (!user) { navigate('/login'); return }
    try {
      const r = await api.post(`/courses/courses/${courseId}/comments/${commentId}/like/`)
      setComments(prev => prev.map(c => {
        if (c.id === commentId) return { ...c, liked_by_me: r.data.liked, likes_count: r.data.likes_count }
        return { ...c, replies: (c.replies||[]).map(rep =>
          rep.id === commentId ? { ...rep, liked_by_me: r.data.liked, likes_count: r.data.likes_count } : rep
        )}
      }))
    } catch {}
  }

  async function deleteComment(commentId) {
    if (!window.confirm('حذف التعليق؟')) return
    try {
      await api.delete(`/courses/courses/${courseId}/comments/${commentId}/delete/`)
      setComments(prev => prev
        .filter(c => c.id !== commentId)
        .map(c => ({ ...c, replies: (c.replies||[]).filter(r => r.id !== commentId) }))
      )
      showToast('تم الحذف', 'success')
    } catch { showToast('حدث خطأ في الحذف', 'error') }
  }

  async function pinComment(commentId) {
    try {
      const r = await api.post(`/courses/courses/${courseId}/comments/${commentId}/pin/`)
      setComments(prev => prev.map(c => c.id===commentId ? { ...c, is_pinned: r.data.is_pinned } : c))
    } catch {}
  }

  async function hideComment(commentId) {
    try {
      const r = await api.post(`/courses/courses/${courseId}/comments/${commentId}/hide/`)
      setComments(prev => prev.map(c => c.id===commentId ? { ...c, is_hidden: r.data.is_hidden } : c))
      showToast(r.data.is_hidden ? 'تم إخفاء التعليق' : 'تم إظهار التعليق', 'success')
    } catch {}
  }

  const timeAgo = d => {
    const diff = (Date.now() - new Date(d)) / 1000
    if (diff < 60)    return 'الآن'
    if (diff < 3600)  return `منذ ${Math.floor(diff/60)} د`
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} س`
    return `منذ ${Math.floor(diff/86400)} ي`
  }

  const pinned  = comments.filter(c => c.is_pinned)
  const regular = comments.filter(c => !c.is_pinned)
  const totalReplies = comments.reduce((a,c) => a + (c.replies?.length||0), 0)

  return (
    <div style={S.box}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.25rem' }}>
        <h3 style={S.boxTitle}>
          💬 التعليقات
          <span style={{ fontSize:'.82rem', color:'var(--text3)', fontWeight:400, marginRight:'.4rem' }}>
            {comments.length} تعليق {totalReplies > 0 && `• ${totalReplies} رد`}
          </span>
        </h3>
      </div>

      {user ? (
        <div style={{ display:'flex', gap:'.75rem', marginBottom:'1.5rem', alignItems:'flex-start' }}>
          <Avatar user={user} size={40} />
          <div style={{ flex:1 }}>
            <div style={{ background:'var(--bg2)', borderRadius:22, border:'1.5px solid var(--border)', overflow:'hidden' }}>
              <textarea
                ref={textRef}
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => { e.stopPropagation(); if(e.key==='Enter' && e.ctrlKey) submitComment() }}
                onKeyUp={e => e.stopPropagation()}
                placeholder="اكتب تعليقاً... (Ctrl+Enter للنشر)"
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', padding:'.75rem 1rem', color:'var(--text)', fontSize:'.9rem', resize:'none', fontFamily:"'Cairo',sans-serif", lineHeight:1.7, minHeight:44, boxSizing:'border-box' }}
                rows={3}
              />
              {newText.trim() && (
                <div style={{ display:'flex', gap:'.5rem', padding:'.5rem .75rem', justifyContent:'flex-end', borderTop:'1px solid var(--border)' }}>
                  <button onClick={() => setNewText('')} style={CS.cancelBtn}>إلغاء</button>
                  <button onClick={submitComment} disabled={sending} style={CS.sendBtn}>
                    {sending ? '⏳' : 'نشر'}
                  </button>
                </div>
              )}
            </div>
            <div style={{ fontSize:'.72rem', color:'var(--text3)', marginTop:'.35rem', paddingRight:'.5rem' }}>Ctrl+Enter للنشر السريع</div>
          </div>
        </div>
      ) : (
        <div style={{ background:'rgba(79,140,255,.07)', border:'1px solid rgba(79,140,255,.2)', borderRadius:12, padding:'1rem', textAlign:'center', marginBottom:'1.5rem', fontSize:'.88rem' }}>
          <span style={{ cursor:'pointer', color:'var(--accent)', fontWeight:700 }} onClick={()=>navigate('/login')}>سجّل دخولك</span> لتشارك في النقاش
        </div>
      )}

      {loading && <div style={{ textAlign:'center', padding:'2rem' }}><div className="spinner" /></div>}

      {pinned.map((c, i) => (
        <FBCommentCard key={c.id} c={c} user={user} isInstructor={isInstructor}
          onLike={toggleLike} onDelete={deleteComment} onPin={pinComment} onHide={hideComment}
          onReply={() => { setReplyTo({id:c.id, name:c.user.name}); setTimeout(()=>replyRef.current?.focus(),50) }}
          replyTo={replyTo} replyText={replyText} setReplyText={setReplyText}
          submitReply={submitReply} cancelReply={()=>{setReplyTo(null);setReplyText('')}}
          replyRef={replyRef} sending={sending} timeAgo={timeAgo}
          expanded={expanded[c.id]} setExpanded={v => setExpanded(prev=>({...prev,[c.id]:v}))}
          pinned animDelay={i * 0.05} />
      ))}

      {regular.length === 0 && !loading && (
        <div style={{ textAlign:'center', color:'var(--text3)', padding:'3rem 0' }}>
          <div style={{ fontSize:'3rem', marginBottom:'.75rem' }}>💭</div>
          <div style={{ fontWeight:600, fontSize:'.9rem' }}>كن أول من يعلق!</div>
          <div style={{ fontSize:'.8rem', marginTop:'.3rem' }}>شارك رأيك أو سؤالك</div>
        </div>
      )}

      {regular.map((c, i) => (
        <FBCommentCard key={c.id} c={c} user={user} isInstructor={isInstructor}
          onLike={toggleLike} onDelete={deleteComment} onPin={pinComment} onHide={hideComment}
          onReply={() => { setReplyTo({id:c.id, name:c.user.name}); setTimeout(()=>replyRef.current?.focus(),50) }}
          replyTo={replyTo} replyText={replyText} setReplyText={setReplyText}
          submitReply={submitReply} cancelReply={()=>{setReplyTo(null);setReplyText('')}}
          replyRef={replyRef} sending={sending} timeAgo={timeAgo}
          expanded={expanded[c.id]} setExpanded={v => setExpanded(prev=>({...prev,[c.id]:v}))}
          animDelay={i * 0.05} />
      ))}
    </div>
  )
}

// ─── FBCommentCard ─────────────────────────────────────────────
function FBCommentCard({ c, user, isInstructor, onLike, onDelete, onPin, onHide, onReply,
  replyTo, replyText, setReplyText, submitReply, cancelReply,
  replyRef, sending, timeAgo, pinned, expanded, setExpanded, animDelay=0 }) {

  const canDelete = user && (user.id === c.user.id || isInstructor)
  const isActive  = replyTo?.id === c.id
  const repliesCount = c.replies?.length || 0

  return (
    <div style={{ marginBottom:'1.25rem', animation:`fadeUp .4s ease ${animDelay}s both`,
      borderRight: pinned ? '3px solid var(--gold)' : 'none',
      paddingRight: pinned ? '.75rem' : 0 }}>

      {pinned && (
        <div style={{ fontSize:'.72rem', color:'var(--gold)', fontWeight:700, marginBottom:'.4rem' }}>
          📌 تعليق مثبت
        </div>
      )}

      {c.is_hidden && isInstructor && (
        <div style={{ fontSize:'.72rem', color:'var(--text3)', fontWeight:600, marginBottom:'.4rem', background:'rgba(255,255,255,.05)', padding:'.25rem .6rem', borderRadius:6, display:'inline-block' }}>
          🚫 مخفي عن الطلاب
        </div>
      )}

      <div style={{ display:'flex', gap:'.65rem', alignItems:'flex-start', opacity: c.is_hidden && !isInstructor ? 0 : 1, height: c.is_hidden && !isInstructor ? 0 : 'auto', overflow: c.is_hidden && !isInstructor ? 'hidden' : 'visible' }}>
        <Avatar user={c.user} size={38} />
        <div style={{ flex:1 }}>
          <div style={{ background:'var(--bg2)', borderRadius:'4px 18px 18px 18px', padding:'.6rem .95rem .7rem', display:'inline-block', maxWidth:'100%', wordBreak:'break-word' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'.4rem', flexWrap:'wrap', marginBottom:'.15rem' }}>
              <span style={{ fontWeight:800, fontSize:'.88rem' }}>{c.user.name}</span>
              {c.user.role==='instructor' && (
                <span style={{ background:'rgba(124,92,252,.15)', color:'var(--accent2)', fontSize:'.6rem', fontWeight:800, padding:'.1rem .45rem', borderRadius:20, border:'1px solid rgba(124,92,252,.25)' }}>
                  👨‍🏫 مدرب
                </span>
              )}
            </div>
            <p style={{ margin:0, fontSize:'.88rem', color:'var(--text)', lineHeight:1.75, whiteSpace:'pre-wrap' }}>{c.content}</p>
          </div>

          <div style={{ display:'flex', gap:'.05rem', marginTop:'.3rem', alignItems:'center', flexWrap:'wrap' }}>
            <button onClick={() => onLike(c.id)}
              style={{ ...CS.fbBtn, color: c.liked_by_me ? '#ef4444' : 'var(--text3)', fontWeight: c.liked_by_me ? 800 : 400 }}>
              {c.liked_by_me ? '❤️' : '🤍'} إعجاب {c.likes_count > 0 && `(${c.likes_count})`}
            </button>
            <span style={{ color:'var(--border)', margin:'0 .1rem' }}>·</span>
            {user && <button onClick={onReply} style={CS.fbBtn}>💬 رد</button>}
            {repliesCount > 0 && (
              <>
                <span style={{ color:'var(--border)', margin:'0 .1rem' }}>·</span>
                <button onClick={() => setExpanded(!expanded)} style={{ ...CS.fbBtn, color:'var(--accent)' }}>
                  {expanded ? '▲ إخفاء' : `▼ ${repliesCount} رد`}
                </button>
              </>
            )}
            <span style={{ flex:1 }} />
            <span style={{ fontSize:'.7rem', color:'var(--text3)' }}>{timeAgo(c.created_at)}</span>
            {isInstructor && (
              <>
                <button onClick={() => onPin(c.id)}
                  title={c.is_pinned ? 'إلغاء التثبيت' : 'تثبيت التعليق'}
                  style={{ ...CS.fbBtn, color:'var(--gold)', fontSize:'.78rem' }}>
                  {c.is_pinned ? '📌' : '📍'}
                </button>
                <button onClick={() => onHide(c.id)}
                  title={c.is_hidden ? 'إظهار التعليق' : 'إخفاء التعليق'}
                  style={{ ...CS.fbBtn, color: c.is_hidden ? 'var(--accent3)' : 'var(--text3)', fontSize:'.78rem' }}>
                  {c.is_hidden ? '👁️' : '🚫'}
                </button>
              </>
            )}
            {canDelete && (
              <button onClick={() => onDelete(c.id)} style={{ ...CS.fbBtn, color:'var(--red)', fontSize:'.78rem' }}>🗑️</button>
            )}
          </div>

          {repliesCount > 0 && expanded && (
            <div style={{ marginTop:'.65rem', paddingRight:'.9rem', borderRight:'2px solid var(--border2)' }}>
              {(c.replies||[]).map((rep, ri) => (
                <div key={rep.id} style={{ display:'flex', gap:'.5rem', marginBottom:'.6rem', alignItems:'flex-start', animation:`fadeUp .3s ease ${ri*0.04}s both` }}>
                  <Avatar user={rep.user} size={30} />
                  <div style={{ flex:1 }}>
                    <div style={{ background:'var(--surface2)', borderRadius:'4px 14px 14px 14px', padding:'.5rem .8rem', display:'inline-block', maxWidth:'100%', wordBreak:'break-word' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'.35rem', flexWrap:'wrap', marginBottom:'.1rem' }}>
                        <span style={{ fontWeight:800, fontSize:'.82rem' }}>{rep.user.name}</span>
                        {rep.user.role==='instructor' && (
                          <span style={{ background:'rgba(124,92,252,.15)', color:'var(--accent2)', fontSize:'.58rem', fontWeight:800, padding:'.08rem .4rem', borderRadius:20 }}>مدرب</span>
                        )}
                      </div>
                      <p style={{ margin:0, fontSize:'.85rem', color:'var(--text)', lineHeight:1.65, whiteSpace:'pre-wrap' }}>{rep.content}</p>
                    </div>
                    <div style={{ display:'flex', gap:'.05rem', marginTop:'.25rem', alignItems:'center' }}>
                      <button onClick={() => onLike(rep.id)}
                        style={{ ...CS.fbBtn, fontSize:'.75rem', color: rep.liked_by_me ? '#ef4444' : 'var(--text3)', fontWeight: rep.liked_by_me ? 800 : 400 }}>
                        {rep.liked_by_me ? '❤️' : '🤍'} {rep.likes_count > 0 && `(${rep.likes_count})`}
                      </button>
                      <span style={{ color:'var(--border)', margin:'0 .1rem' }}>·</span>
                      <span style={{ fontSize:'.7rem', color:'var(--text3)' }}>{timeAgo(rep.created_at)}</span>
                      {user && (user.id===rep.user.id||isInstructor) && (
                        <>
                          <span style={{ flex:1 }} />
                          <button onClick={() => onDelete(rep.id)} style={{ ...CS.fbBtn, color:'var(--red)', fontSize:'.72rem' }}>🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {isActive && (
            <div style={{ display:'flex', gap:'.55rem', marginTop:'.6rem', alignItems:'flex-start' }}>
              <Avatar user={user} size={30} />
              <div style={{ flex:1 }}>
                <div style={{ background:'var(--bg2)', borderRadius:18, border:'1.5px solid var(--accent)', overflow:'hidden' }}>
                  <textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { e.stopPropagation(); if(e.key==='Enter' && e.ctrlKey) submitReply() }}
                    onKeyUp={e => e.stopPropagation()}
                    placeholder={`ردّ على ${replyTo.name}...`}
                    style={{ width:'100%', background:'transparent', border:'none', outline:'none', padding:'.55rem .9rem', color:'var(--text)', fontSize:'.84rem', resize:'none', fontFamily:"'Cairo',sans-serif", lineHeight:1.6, boxSizing:'border-box' }}
                    rows={2}
                  />
                  {replyText.trim() && (
                    <div style={{ display:'flex', gap:'.4rem', padding:'.4rem .7rem', justifyContent:'flex-end', borderTop:'1px solid var(--border)' }}>
                      <button onClick={cancelReply} style={CS.cancelBtn}>إلغاء</button>
                      <button onClick={submitReply} disabled={sending||!replyText.trim()} style={CS.sendBtn}>
                        {sending ? '⏳' : 'رد'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Avatar ──────────────────────────────────────────────────
function Avatar({ user, size=38 }) {
  const av  = getImgUrl(user?.avatar_url || user?.avatar)
  const ini = (user?.name||user?.username||'U').charAt(0).toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, color:'white', fontSize: size > 34 ? '.9rem' : '.75rem', flexShrink:0, overflow:'hidden', border:'2px solid var(--border)' }}>
      {av ? <img src={av} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} onError={e=>e.target.style.display='none'} /> : ini}
    </div>
  )
}

// ─── Comment Styles ───────────────────────────────────────────
const CS = {
  fbBtn:     { background:'none', border:'none', cursor:'pointer', fontSize:'.8rem', padding:'.15rem .35rem', fontFamily:"'Cairo',sans-serif", color:'var(--text3)', borderRadius:6, transition:'all .15s' },
  sendBtn:   { background:'var(--accent)', color:'white', border:'none', borderRadius:20, padding:'.4rem 1.1rem', cursor:'pointer', fontSize:'.82rem', fontWeight:800, fontFamily:"'Cairo',sans-serif" },
  cancelBtn: { background:'var(--surface2)', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:20, padding:'.4rem .9rem', cursor:'pointer', fontSize:'.82rem', fontFamily:"'Cairo',sans-serif" },
}


// ─── Helpers ─────────────────────────────────────────────────
const S = {
  box:       { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem', marginBottom:'1.25rem' },
  boxTitle:  { fontFamily:"'Tajawal',sans-serif", fontSize:'1.05rem', fontWeight:900, marginBottom:'.75rem' },
  card:      { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:'1.5rem' },
  statusBox: (color, bg) => ({ background:bg, border:`1px solid ${color}`, borderRadius:10, padding:'.85rem', textAlign:'center', marginBottom:'.75rem', color }),
  textarea:  { width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:10, padding:'.65rem .85rem', color:'var(--text)', fontSize:'.88rem', resize:'vertical', fontFamily:"'Cairo',sans-serif", lineHeight:1.7, outline:'none', boxSizing:'border-box' },
  sendBtn:   { background:'var(--accent)', color:'white', border:'none', borderRadius:8, padding:'.45rem 1rem', cursor:'pointer', fontSize:'.82rem', fontWeight:700, fontFamily:"'Cairo',sans-serif" },
  cancelBtn: { background:'var(--surface2)', color:'var(--text2)', border:'1px solid var(--border)', borderRadius:8, padding:'.45rem .85rem', cursor:'pointer', fontSize:'.82rem', fontFamily:"'Cairo',sans-serif" },
  actionBtn: { background:'none', border:'none', cursor:'pointer', fontSize:'.78rem', padding:'0 .1rem', fontFamily:"'Cairo',sans-serif", color:'var(--text3)' },
}
