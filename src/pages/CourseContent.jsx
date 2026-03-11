import { useState, useEffect } from 'react'
import { coursesAPI } from '../api'

export default function CourseContent({ course, onBack, showToast }) {
  const [sections, setSections]       = useState([])
  const [looseVideos, setLooseVideos] = useState([])
  const [loading, setLoading]         = useState(true)
  const [addingSection, setAddingSection] = useState(false)
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [saving, setSaving]           = useState(false)

  useEffect(() => { loadContent() }, [course.id])

  async function loadContent() {
    setLoading(true)
    try {
      const r = await coursesAPI.getContent(course.id)
      // الباك بيرجع {sections:[...], loose_videos:[...]}
      // نعالج الحالتين للأمان
      const sortOldFirst = (arr) => [...arr].sort((a, b) => a.id - b.id)
      if (Array.isArray(r.data)) {
        // قديم: array مباشرة
        setSections(sortOldFirst(r.data))
        setLooseVideos([])
      } else {
        setSections(sortOldFirst(r.data.sections || []))
        setLooseVideos(r.data.loose_videos || [])
      }
    } catch { setSections([]); setLooseVideos([]) }
    finally { setLoading(false) }
  }

  async function addSection() {
    if (!newSectionTitle.trim()) { showToast('اكتب عنوان القسم', 'error'); return }
    setSaving(true)
    try {
      const r = await coursesAPI.addSection(course.id, { title: newSectionTitle })
      setSections(s => [...s, { ...r.data, videos: [] }].sort((a, b) => a.id - b.id))
      setNewSectionTitle(''); setAddingSection(false)
      showToast('تم إضافة القسم ✅', 'success')
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ', 'error')
    } finally { setSaving(false) }
  }

  async function deleteSection(sectionId) {
    if (!confirm('حذف القسم وكل فيديوهاته؟')) return
    try {
      await coursesAPI.deleteSection(course.id, sectionId)
      setSections(s => s.filter(x => x.id !== sectionId))
      showToast('تم حذف القسم', 'success')
    } catch { showToast('حدث خطأ', 'error') }
  }

  async function addVideo(sectionId, videoData, onProgress) {
    try {
      let payload = videoData
      if (videoData instanceof FormData) {
        // FormData — نضيف section_id بـ append
        if (sectionId) videoData.set('section_id', sectionId)
      } else {
        payload = { ...videoData }
        if (sectionId) payload.section_id = sectionId
      }
      const r = await coursesAPI.addVideo(course.id, payload, onProgress)
      if (sectionId) {
        setSections(s => s.map(sec =>
          sec.id === sectionId ? { ...sec, videos: [...(sec.videos || []), r.data] } : sec
        ))
      } else {
        setLooseVideos(v => [...v, r.data])
      }
      showToast('تم إضافة الفيديو ✅', 'success')
      return true
    } catch (e) {
      const err = Object.values(e.response?.data || {}).flat().join('. ')
      showToast(err || 'حدث خطأ في إضافة الفيديو', 'error')
      return false
    }
  }

  async function deleteVideo(videoId, sectionId) {
    try {
      await coursesAPI.deleteVideo(course.id, videoId)
      if (sectionId) {
        setSections(s => s.map(sec =>
          sec.id === sectionId ? { ...sec, videos: sec.videos.filter(v => v.id !== videoId) } : sec
        ))
      } else {
        setLooseVideos(v => v.filter(x => x.id !== videoId))
      }
      showToast('تم حذف الفيديو', 'success')
    } catch { showToast('حدث خطأ', 'error') }
  }

  const totalVideos = sections.reduce((a, s) => a + (s.videos?.length || 0), 0) + looseVideos.length

  return (
    <div>
      <div style={S.head}>
        <div>
          <button style={S.back} onClick={onBack}>← رجوع للكورسات</button>
          <h2 style={S.title}>🎬 محتوى الكورس</h2>
          <p style={S.sub}>{course.title} • {sections.length} قسم • {totalVideos} فيديو</p>
        </div>
        <button className="btn btn-outline" onClick={() => setAddingSection(true)}>➕ إضافة قسم</button>
      </div>

      {addingSection && (
        <div style={{ ...S.box, border: '2px solid var(--accent)', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '.75rem', color: 'var(--accent)' }}>➕ قسم جديد</div>
          <div style={{ display: 'flex', gap: '.75rem' }}>
            <input className="form-input" style={{ flex: 1 }} value={newSectionTitle}
              onChange={e => setNewSectionTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSection()}
              placeholder="مثال: مقدمة الكورس، الوحدة الأولى..." autoFocus />
            <button className="btn btn-primary" onClick={addSection} disabled={saving}>{saving ? '...' : 'إضافة'}</button>
            <button className="btn btn-outline" onClick={() => setAddingSection(false)}>إلغاء</button>
          </div>
        </div>
      )}

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
        <div>
          {sections.map((sec, i) => (
            <SectionBlock key={sec.id} section={sec} index={i} courseId={course.id}
              onAddVideo={(data, onProgress) => addVideo(sec.id, data, onProgress)}
              onDeleteVideo={(vid) => deleteVideo(vid, sec.id)}
              onDeleteSection={() => deleteSection(sec.id)}
              showToast={showToast} />
          ))}

          <div style={S.box}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700 }}>📹 فيديوهات بدون قسم</div>
              <span style={{ fontSize: '.78rem', color: 'var(--text3)' }}>{looseVideos.length} فيديو</span>
            </div>
            {looseVideos.map((v, i) => (
              <VideoRow key={v.id} video={v} index={i} onDelete={() => deleteVideo(v.id, null)} />
            ))}
            <AddVideoForm onAdd={(data, onProgress) => addVideo(null, data, onProgress)} showToast={showToast} />
          </div>

          {!sections.length && !looseVideos.length && (
            <div className="empty">
              <div className="empty-icon">🎬</div>
              <h3>لم تضف أي محتوى بعد</h3>
              <p>ابدأ بإضافة قسم ثم أضف الفيديوهات</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setAddingSection(true)}>
                ➕ أضف أول قسم
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SectionBlock({ section, index, courseId, onAddVideo, onDeleteVideo, onDeleteSection, showToast }) {
  const [collapsed, setCollapsed] = useState(false)
  const [editing, setEditing]     = useState(false)
  const [title, setTitle]         = useState(section.title)

  async function saveTitle() {
    try {
      await coursesAPI.editSection(courseId, section.id, { title })
      setEditing(false)
      showToast('تم حفظ عنوان القسم ✅', 'success')
    } catch { showToast('حدث خطأ', 'error') }
  }

  return (
    <div style={S.sectionBlock}>
      <div style={S.sectionHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flex: 1 }}>
          <div style={S.sectionNum}>{index + 1}</div>
          {editing ? (
            <div style={{ display: 'flex', gap: '.5rem', flex: 1 }}>
              <input className="form-input" style={{ flex: 1, padding: '.4rem .75rem' }}
                value={title} onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveTitle()} autoFocus />
              <button className="btn btn-primary btn-sm" onClick={saveTitle}>حفظ</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setTitle(section.title) }}>إلغاء</button>
            </div>
          ) : (
            <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
              <div style={{ fontWeight: 700 }}>{section.title}</div>
              <div style={{ fontSize: '.75rem', color: 'var(--text3)' }}>{section.videos?.length || 0} فيديو</div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '.4rem' }}>
          <button style={S.iconBtn} onClick={() => setCollapsed(c => !c)}>{collapsed ? '▼' : '▲'}</button>
          <button style={S.iconBtn} onClick={() => setEditing(true)}>✏️</button>
          <button style={{ ...S.iconBtn, color: 'var(--red)' }} onClick={onDeleteSection}>🗑️</button>
        </div>
      </div>
      {!collapsed && (
        <div style={{ padding: '0 1rem 1rem' }}>
          {(section.videos || []).map((v, i) => (
            <VideoRow key={v.id} video={v} index={i} onDelete={() => onDeleteVideo(v.id)} />
          ))}
          <AddVideoForm onAdd={(data, onProg) => onAddVideo(data, onProg)} showToast={showToast} />
        </div>
      )}
    </div>
  )
}

function VideoRow({ video, onDelete }) {
  const fmtDur = (s) => { if (!s) return '—'; const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}` }
  return (
    <div style={S.videoRow}>
      <div style={{ fontSize: '1.2rem' }}>▶️</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{video.title}</div>
        <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginTop: '.1rem' }}>
          ⏱️ {fmtDur(video.duration)}
          {video.is_free && <span className="badge badge-green" style={{ marginRight: '.5rem', padding: '.1rem .4rem', fontSize: '.65rem' }}>مجاني</span>}
        </div>
      </div>
      <a href={video.video_url} target="_blank" rel="noreferrer" style={S.iconBtn}>👁️</a>
      <button style={{ ...S.iconBtn, color: 'var(--red)' }} onClick={onDelete}>🗑️</button>
    </div>
  )
}

function AddVideoForm({ onAdd, showToast }) {
  const [open,     setOpen]     = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [progress, setProgress] = useState(0)    // % رفع الفيديو
  const [mode,     setMode]     = useState('file') // 'file' | 'url'
  const [form, setForm] = useState({ title: '', video_url: '', duration_minutes: '', is_free: false, description: '' })
  const [videoFile, setVideoFile] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function submit() {
    if (!form.title.trim()) { showToast('اكتب عنوان الفيديو', 'error'); return }
    if (mode === 'file' && !videoFile)      { showToast('اختر ملف فيديو', 'error'); return }
    if (mode === 'url'  && !form.video_url.trim()) { showToast('ضع رابط الفيديو', 'error'); return }

    console.log('submit called, mode:', mode, 'file:', videoFile?.name)
    setSaving(true)
    setProgress(0)

    if (mode === 'file') {
      // رفع بـ FormData مع progress
      const fd = new FormData()
      fd.append('title',            form.title)
      fd.append('description',      form.description)
      fd.append('is_free', form.is_free ? '1' : '0')
      fd.append('duration_minutes', form.duration_minutes || 0)
      fd.append('video_file',       videoFile)

      const ok = await onAdd(fd, (pct) => setProgress(pct))
      if (ok) {
        setForm({ title: '', video_url: '', duration_minutes: '', is_free: false, description: '' })
        setVideoFile(null)
        setProgress(0)
        setOpen(false)
      }
    } else {
      const ok = await onAdd({
        title: form.title, video_url: form.video_url,
        description: form.description, is_free: form.is_free,
        duration_minutes: form.duration_minutes || 0,
      })
      if (ok) { setForm({ title: '', video_url: '', duration_minutes: '', is_free: false, description: '' }); setOpen(false) }
    }
    setSaving(false)
  }

  function fmtFileSize(bytes) {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(0)} KB`
    return `${(bytes/1024/1024).toFixed(1)} MB`
  }

  if (!open) return (
    <button style={S.addVideoBtn} onClick={() => setOpen(true)}>＋ إضافة فيديو</button>
  )

  return (
    <div style={S.addVideoForm}>
      <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: '.75rem', fontSize: '.9rem' }}>➕ فيديو جديد</div>

      {/* اختار طريقة الإضافة */}
      <div style={{ display:'flex', gap:'.5rem', marginBottom:'.85rem' }}>
        <button
          style={{ ...S.modeBtn, ...(mode==='file' ? S.modeBtnActive : {}) }}
          onClick={() => setMode('file')}>
          📁 رفع ملف
        </button>
        <button
          style={{ ...S.modeBtn, ...(mode==='url' ? S.modeBtnActive : {}) }}
          onClick={() => setMode('url')}>
          🔗 رابط خارجي
        </button>
      </div>

      <div className="form-row" style={{ marginBottom: '.75rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">عنوان الفيديو *</label>
          <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="مثال: مقدمة الدرس الأول" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">المدة (بالدقائق)</label>
          <input className="form-input" type="number" min={0} value={form.duration_minutes} onChange={e => set('duration_minutes', e.target.value)} placeholder="0" />
        </div>
      </div>

      {mode === 'file' ? (
        <div className="form-group" style={{ marginBottom: '.75rem' }}>
          <label className="form-label">ملف الفيديو * (MP4, MOV, AVI)</label>
          <div
            style={S.dropZone}
            onClick={() => document.getElementById('vid-upload').click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if(f) setVideoFile(f) }}
          >
            {videoFile ? (
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:'1.5rem', marginBottom:'.3rem' }}>🎬</div>
                <div style={{ fontWeight:600, fontSize:'.88rem' }}>{videoFile.name}</div>
                <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>{fmtFileSize(videoFile.size)}</div>
                <button style={{ marginTop:'.4rem', background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'.78rem' }}
                  onClick={e => { e.stopPropagation(); setVideoFile(null) }}>✕ إزالة</button>
              </div>
            ) : (
              <div style={{ textAlign:'center', color:'var(--text3)' }}>
                <div style={{ fontSize:'2rem', marginBottom:'.4rem' }}>📤</div>
                <div style={{ fontSize:'.85rem' }}>اسحب الملف هنا أو اضغط للاختيار</div>
                <div style={{ fontSize:'.75rem', marginTop:'.25rem' }}>MP4 · MOV · AVI · MKV</div>
              </div>
            )}
          </div>
          <input id="vid-upload" type="file" accept="video/*" style={{ display:'none' }}
            onChange={e => { if(e.target.files[0]) setVideoFile(e.target.files[0]) }} />

          {/* Progress Bar */}
          {saving && mode === 'file' && (
            <div style={{ marginTop:'.75rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.78rem', color:'var(--text3)', marginBottom:'.3rem' }}>
                <span>جاري الرفع...</span>
                <span>{progress}%</span>
              </div>
              <div style={{ height:6, background:'var(--bg3)', borderRadius:3, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${progress}%`, background:'var(--accent)', borderRadius:3, transition:'width .2s' }} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="form-group" style={{ marginBottom: '.75rem' }}>
          <label className="form-label">رابط الفيديو * (YouTube / Vimeo / أي رابط)</label>
          <input className="form-input" value={form.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '.75rem' }}>
        <label className="form-label">وصف مختصر (اختياري)</label>
        <textarea className="form-input" rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="ما الذي سيتعلمه الطالب..." />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem' }}>
        <input type="checkbox" checked={form.is_free} onChange={e => set('is_free', e.target.checked)} style={{ width: 16, height: 16 }} />
        <label style={{ cursor: 'pointer', fontSize: '.85rem' }}>فيديو مجاني (يظهر بدون تسجيل)</label>
      </div>
      <div style={{ display: 'flex', gap: '.75rem' }}>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? (mode==='file' ? `⏳ جاري الرفع ${progress}%` : 'جاري الحفظ...') : '💾 حفظ الفيديو'}
        </button>
        <button className="btn btn-outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</button>
      </div>
    </div>
  )
}

const S = {
  head:        { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' },
  title:       { fontFamily:"'Tajawal',sans-serif", fontSize:'1.5rem', fontWeight:900, marginBottom:'.25rem' },
  sub:         { color:'var(--text2)', fontSize:'.88rem' },
  back:        { background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'.88rem', marginBottom:'.5rem', padding:0, fontFamily:"'Cairo',sans-serif", display:'block' },
  box:         { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem', marginBottom:'1rem' },
  sectionBlock:{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, marginBottom:'1rem', overflow:'hidden' },
  sectionHead: { display:'flex', alignItems:'center', gap:'.75rem', padding:'1rem 1.25rem', background:'var(--bg3)', borderBottom:'1px solid var(--border)' },
  sectionNum:  { width:28, height:28, borderRadius:8, background:'var(--grad)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.78rem', fontWeight:900, color:'white', flexShrink:0 },
  iconBtn:     { background:'none', border:'none', cursor:'pointer', fontSize:'.95rem', padding:'.3rem .4rem', borderRadius:6, color:'var(--text2)', display:'flex', alignItems:'center', textDecoration:'none' },
  videoRow:    { display:'flex', alignItems:'center', gap:'.75rem', padding:'.65rem .75rem', borderRadius:10, marginBottom:'.4rem', background:'var(--bg3)', border:'1px solid var(--border)' },
  modeBtn:       { padding:'.35rem .9rem', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text2)', cursor:'pointer', fontSize:'.82rem', fontWeight:500 },
  modeBtnActive: { background:'var(--accent)', color:'#fff', borderColor:'var(--accent)' },
  dropZone:      { border:'2px dashed var(--border)', borderRadius:10, padding:'1.5rem', cursor:'pointer', textAlign:'center', background:'var(--bg3)', transition:'border-color .2s' },
  addVideoBtn: { width:'100%', padding:'.6rem', borderRadius:10, border:'2px dashed var(--border)', background:'none', color:'var(--text3)', cursor:'pointer', fontSize:'.85rem', marginTop:'.5rem', fontFamily:"'Cairo',sans-serif" },
  addVideoForm:{ background:'var(--bg3)', border:'1px solid var(--accent)', borderRadius:12, padding:'1.25rem', marginTop:'.75rem' },
}
