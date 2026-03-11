import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import ProtectedVideoPlayer from '../components/ProtectedVideoPlayer'
import { courseEmoji, getImgUrl } from '../utils'

export default function WatchCourse({ showToast }) {
  const { courseId, videoId } = useParams()
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [course,       setCourse]       = useState(null)
  const [currentVideo, setCurrentVideo] = useState(null)
  const [sections,     setSections]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [sideOpen,     setSideOpen]     = useState(true)

  useEffect(() => {
    if (!user) { navigate('/login'); return }

    api.get(`/courses/courses/${courseId}/`)
      .then(r => {
        const c = r.data
        const isInstructor = user.role === 'instructor'
        // instructor بيرجع {id, username, full_name} - الـ id ده user id مش instructor profile id
        const isOwner      = isInstructor && (
          String(c.instructor?.id) === String(user.id) ||
          c.instructor?.username === user.username
        )
        const isEnrolled   = c.is_enrolled

        if (!isInstructor && !isEnrolled) {
          showToast?.('يجب التسجيل في الكورس أولاً', 'error')
          navigate(`/courses/${courseId}`)
          return
        }
        if (isInstructor && !isOwner) {
          showToast?.('ليس لديك صلاحية لعرض هذا الكورس', 'error')
          navigate('/instructor/my-courses')
          return
        }

        setCourse(c)
        const secs = c.sections || []

        // ✅ نجمع الفيديوهات اللي مش في أي section في قسم افتراضي
        const allSectionVideoIds = new Set(secs.flatMap(s => (s.videos || []).map(v => v.id)))
        const looseVideos = (c.videos || []).filter(v => !allSectionVideoIds.has(v.id))

        // لو في فيديوهات بدون section، نضيفهم في قسم افتراضي
        const allSections = [...secs]
        if (looseVideos.length > 0) {
          allSections.push({ id: 'loose', title: 'فيديوهات الكورس', order: -1, videos: looseVideos })
        }

        setSections(allSections)

        // ✅ نستخدم allSections (مش secs) عشان نشمل الـ loose videos
        const allVids = allSections.flatMap(s => s.videos || [])
        const target = videoId
          ? allVids.find(v => String(v.id) === String(videoId))
          : allVids[0]
        setCurrentVideo(target || null)
      })
      .catch(() => {
        showToast?.('لم يتم العثور على الكورس', 'error')
        navigate('/dashboard/my-courses')
      })
      .finally(() => setLoading(false))
  }, [courseId])

  // لما يتغير الـ videoId من الـ URL
  useEffect(() => {
    if (!videoId || !sections.length) return
    const allVideos = sections.flatMap(s => s.videos || [])
    const target = allVideos.find(v => String(v.id) === String(videoId))
    if (target) setCurrentVideo(target)
  }, [videoId, sections])

  function selectVideo(video) {
    setCurrentVideo(video)
    navigate(`/watch/${courseId}/${video.id}`, { replace: true })
  }

  function fmtDur(sec) {
    if (!sec) return ''
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2, '0')}`
  }

  if (loading) return (
    <div className="spinner-wrap" style={{ paddingTop: 120 }}>
      <div className="spinner" />
    </div>
  )

  const allVideos = sections.flatMap(s => s.videos || [])
  const currentIdx = allVideos.findIndex(v => v.id === currentVideo?.id)
  const prevVideo  = currentIdx > 0 ? allVideos[currentIdx - 1] : null
  const nextVideo  = currentIdx < allVideos.length - 1 ? allVideos[currentIdx + 1] : null

  return (
    <div style={S.root}>

      {/* ── Topbar ── */}
      <div style={S.topbar}>
        <button style={S.backBtn} onClick={() => navigate(`/courses/${courseId}`)}>
          ← الكورس
        </button>

        {/* صورة + عنوان الكورس */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem', flex: 1, overflow: 'hidden', justifyContent: 'center' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
            {getImgUrl(course?.thumbnail)
              ? <img src={getImgUrl(course.thumbnail)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
              : courseEmoji(course?.category?.name || course?.title)}
          </div>
          <span style={S.courseTitle}>{course?.title}</span>
        </div>

        <button style={S.menuBtn} onClick={() => setSideOpen(o => !o)}>
          {sideOpen ? '✕ أغلق' : '☰ المحتوى'}
        </button>
      </div>

      <div style={S.body}>

        {/* ── Player Area ── */}
        <div style={{ ...S.main, width: sideOpen ? 'calc(100% - 320px)' : '100%' }}>

          {currentVideo ? (
            <>
              <ProtectedVideoPlayer
                videoId={currentVideo.id}
                videoUrl={currentVideo.video_url}
                title={currentVideo.title}
                isEnrolled={course?.is_enrolled || user?.role === 'instructor'}
              />

              {/* عنوان + تنقل */}
              <div style={S.videoMeta}>
                <h2 style={S.videoTitle}>{currentVideo.title}</h2>
                {currentVideo.description && (
                  <p style={S.videoDesc}>{currentVideo.description}</p>
                )}
                <div style={S.navBtns}>
                  {prevVideo ? (
                    <button style={S.navBtn} onClick={() => selectVideo(prevVideo)}>
                      ← السابق: {prevVideo.title}
                    </button>
                  ) : <div />}
                  {nextVideo && (
                    <button style={{ ...S.navBtn, ...S.navBtnNext }} onClick={() => selectVideo(nextVideo)}>
                      التالي: {nextVideo.title} →
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={S.empty}>
              <div style={{ fontSize: '3rem' }}>🎬</div>
              <p style={{ color: 'var(--text2)' }}>اختر فيديو من القائمة</p>
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        {sideOpen && (
          <div style={S.sidebar}>
            <div style={S.sideHeader}>محتوى الكورس</div>

            {sections.map((sec, si) => (
              <div key={sec.id} style={S.section}>
                <div style={S.sectionTitle}>
                  <span>{si + 1}. {sec.title}</span>
                  <span style={{ fontSize: '.75rem', color: 'var(--text3)' }}>
                    {sec.videos?.length || 0} فيديو
                  </span>
                </div>

                {(sec.videos || []).map((v, vi) => {
                  const isActive = currentVideo?.id === v.id
                  return (
                    <div
                      key={v.id}
                      style={{ ...S.videoItem, ...(isActive ? S.videoItemActive : {}) }}
                      onClick={() => selectVideo(v)}
                    >
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>
                        {isActive ? '▶️' : '🎬'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '.83rem',
                          fontWeight: isActive ? 700 : 400,
                          color: isActive ? 'var(--accent)' : 'var(--text)',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {v.title}
                        </div>
                        {v.duration > 0 && (
                          <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>
                            {fmtDur(v.duration)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const S = {
  root:           { display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg)', overflow:'hidden' },
  topbar:         { height:52, background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', padding:'0 1rem', gap:'1rem', flexShrink:0, zIndex:10 },
  backBtn:        { background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'.85rem', fontWeight:600, padding:'.25rem .5rem' },
  courseTitle:    { flex:1, fontWeight:700, fontSize:'.9rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', color:'var(--text)' },
  menuBtn:        { background:'none', border:'1px solid var(--border)', color:'var(--text2)', cursor:'pointer', fontSize:'.78rem', padding:'.25rem .6rem', borderRadius:6 },
  body:           { display:'flex', flex:1, overflow:'hidden' },
  main:           { flex:1, overflowY:'auto', padding:'1.25rem', transition:'width .2s' },
  videoMeta:      { marginTop:'1rem' },
  videoTitle:     { fontFamily:"'Tajawal',sans-serif", fontSize:'1.2rem', fontWeight:900, marginBottom:'.5rem', color:'var(--text)' },
  videoDesc:      { color:'var(--text2)', fontSize:'.88rem', lineHeight:1.7, marginBottom:'1rem' },
  navBtns:        { display:'flex', justifyContent:'space-between', marginTop:'1rem', gap:'1rem' },
  navBtn:         { background:'var(--surface)', border:'1px solid var(--border)', color:'var(--text2)', borderRadius:8, padding:'.5rem 1rem', cursor:'pointer', fontSize:'.82rem', maxWidth:'48%', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' },
  navBtnNext:     { color:'var(--accent)', fontWeight:600 },
  empty:          { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:'1rem' },
  sidebar:        { width:320, borderRight:'1px solid var(--border)', overflowY:'auto', flexShrink:0, background:'var(--surface)' },
  sideHeader:     { padding:'.75rem 1rem', fontWeight:700, fontSize:'.88rem', borderBottom:'1px solid var(--border)', color:'var(--text)', position:'sticky', top:0, background:'var(--surface)', zIndex:1 },
  section:        { borderBottom:'1px solid var(--border)' },
  sectionTitle:   { padding:'.6rem 1rem', fontSize:'.82rem', fontWeight:700, color:'var(--text2)', background:'var(--bg3)', display:'flex', justifyContent:'space-between', alignItems:'center' },
  videoItem:      { display:'flex', alignItems:'center', gap:'.6rem', padding:'.55rem 1rem', cursor:'pointer', borderBottom:'1px solid var(--border)', transition:'background .15s' },
  videoItemActive:{ background:'var(--accent-bg, rgba(79,140,255,.1))' },
}
