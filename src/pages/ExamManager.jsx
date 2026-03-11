import { useState, useEffect, useRef } from 'react'
import api, { examsAPI } from '../api'
import { formatDate, getImgUrl } from '../utils'

// ════════════════════════════════════════
//  LIST
// ════════════════════════════════════════
export default function ExamManager({ showToast }) {
  const [view, setView]         = useState('list')
  const [exams, setExams]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [publishing, setPublishing] = useState(null)

  useEffect(() => { loadExams() }, [])

  async function loadExams() {
    setLoading(true)
    try {
      const r = await examsAPI.instructorList()
      setExams(r.data.results || r.data || [])
    } catch { setExams([]) }
    finally { setLoading(false) }
  }

  function backToList() { setView('list'); setSelected(null); loadExams() }

  async function togglePublish(exam, e) {
    e.stopPropagation()
    if (exam.status !== 'published' && !(exam.total_questions > 0)) {
      showToast('لا يمكن نشر امتحان بدون أسئلة', 'error'); return
    }
    setPublishing(exam.id)
    try {
      const r = await examsAPI.publishExam(exam.id)
      showToast(r.data.message, 'success')
      setExams(prev => prev.map(ex => ex.id === exam.id ? { ...ex, status: r.data.status } : ex))
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ', 'error')
    } finally { setPublishing(null) }
  }

  if (view === 'create' || view === 'edit')
    return <ExamForm exam={selected} showToast={showToast} onBack={backToList} />
  if (view === 'detail' && selected)
    return <ExamDetail exam={selected} showToast={showToast} onBack={backToList} onEdit={() => { loadExams(); setView('edit') }} />

  return (
    <div>
      <div style={S.head}>
        <div>
          <h2 style={S.title}>📝 الامتحانات</h2>
          <p style={S.sub}>أنشئ وأدر امتحانات كورساتك</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelected(null); setView('create') }}>➕ إضافة امتحان</button>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> :
        exams.length ? (
          <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {exams.map(exam => (
              <div key={exam.id} style={S.examCard}>
                <div style={S.examIcon}>📝</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:'1rem', marginBottom:'.3rem' }}>{exam.title}</div>
                  <div style={{ fontSize:'.82rem', color:'var(--text3)', marginBottom:'.5rem' }}>
                    📚 {exam.course_title} &nbsp;•&nbsp; ⏱️ {exam.duration} دقيقة &nbsp;•&nbsp;
                    ❓ {exam.total_questions || 0} سؤال &nbsp;•&nbsp; 🎯 {exam.passing_score}%
                  </div>
                  <div style={{ display:'flex', gap:'.5rem', flexWrap:'wrap', alignItems:'center' }}>
                    <span className={`badge ${exam.status==='published'?'badge-green':exam.status==='archived'?'badge-red':'badge-gold'}`}>
                      {exam.status==='published' ? '✅ منشور' : exam.status==='archived' ? '📦 مؤرشف' : '📝 مسودة'}
                    </span>
                    {exam.status === 'published' && (
                      <span className={`badge ${exam.is_open?'badge-green':'badge-red'}`} style={{ fontSize:'.7rem' }}>
                        {exam.is_open ? '🟢 مفتوح' : '🔴 مغلق'}
                      </span>
                    )}
                    <span className="badge badge-blue">🔄 {exam.max_attempts} محاولات</span>
                    <span style={{ fontSize:'.75rem', color:'var(--text3)' }}>
                      📊 {exam.attempts_count||0} محاولة &nbsp;•&nbsp; {formatDate(exam.created_at)}
                    </span>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'.5rem', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                  {/* زرار النشر */}
                  <button
                    className={`btn btn-sm ${exam.status==='published' ? 'btn-outline' : 'btn-success'}`}
                    style={{ minWidth:100 }}
                    onClick={e => togglePublish(exam, e)}
                    disabled={publishing === exam.id}>
                    {publishing === exam.id ? '⏳...' : exam.status==='published' ? '🔴 إلغاء النشر' : '🚀 نشر'}
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setSelected(exam); setView('detail') }}>📊 النتائج</button>
                  <button className="btn btn-outline btn-sm" onClick={() => { setSelected(exam); setView('edit') }}>✏️ تعديل</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <h3>لا يوجد امتحانات بعد</h3>
            <p>أنشئ امتحانك الأول الآن</p>
            <button className="btn btn-primary" style={{ marginTop:'1rem' }} onClick={() => { setSelected(null); setView('create') }}>➕ إضافة امتحان</button>
          </div>
        )
      }
    </div>
  )
}

// ════════════════════════════════════════
//  EXAM FORM  (3 steps)
// ════════════════════════════════════════
function ExamForm({ exam, showToast, onBack }) {
  const isEdit = !!exam
  const [courses, setCourses]         = useState([])
  const [saving, setSaving]           = useState(false)
  const [step, setStep]               = useState(1)
  const [savedExamId, setSavedExamId] = useState(exam?.id || null)
  const [questions, setQuestions]     = useState([])

  // الـ form يُبنى من exam مرة واحدة فقط
  const [form, setForm] = useState({
    course:                  exam?.course_id        || exam?.course || '',
    title:                   exam?.title            || '',
    description:             exam?.description      || '',
    instructions:            exam?.instructions     || '',
    duration:                exam?.duration         || 30,
    passing_score:           exam?.passing_score    || 50,
    max_attempts:            exam?.max_attempts     || 3,
    shuffle_questions:       exam?.shuffle_questions       ?? false,
    shuffle_answers:         exam?.shuffle_answers         ?? false,
    show_result_immediately: exam?.show_result_immediately ?? true,
    show_correct_answers:    exam?.show_correct_answers    ?? false,
    allow_review:            exam?.allow_review            ?? true,
    is_open:                 exam?.is_open                 ?? true,
  })

  useEffect(() => {
    api.get('/courses/instructor-courses/').then(r => setCourses(r.data.results || r.data || [])).catch(() => {})
    // لو تعديل، جيب الأسئلة
    if (exam?.id) {
      examsAPI.instructorDetail(exam.id).then(r => {
        setQuestions(r.data.questions || [])
        // sync الإعدادات الحالية من الـ DB
        const d = r.data
        setForm(f => ({
          ...f,
          shuffle_questions:       d.shuffle_questions       ?? f.shuffle_questions,
          shuffle_answers:         d.shuffle_answers         ?? f.shuffle_answers,
          show_result_immediately: d.show_result_immediately ?? f.show_result_immediately,
          show_correct_answers:    d.show_correct_answers    ?? f.show_correct_answers,
          allow_review:            d.allow_review            ?? f.allow_review,
          is_open:                 d.is_open                 ?? f.is_open,
        }))
      }).catch(() => {})
    }
  }, [])

  function f(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function saveStep1() {
    if (!form.course || !form.title || !form.duration) { showToast('يرجى ملء الحقول المطلوبة', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        course: form.course, title: form.title, description: form.description,
        instructions: form.instructions, duration: Number(form.duration),
        passing_score: Number(form.passing_score), max_attempts: Number(form.max_attempts),
      }
      const res = savedExamId
        ? await examsAPI.instructorUpdate(savedExamId, payload)
        : await examsAPI.instructorCreate(payload)
      setSavedExamId(res.data.id)
      setStep(2)
      showToast('تم حفظ بيانات الامتحان ✅', 'success')
    } catch (err) {
      const errs = Object.values(err.response?.data || {}).flat().join('. ')
      showToast(errs || 'حدث خطأ', 'error')
    } finally { setSaving(false) }
  }

  async function saveSettings() {
    if (!savedExamId) { showToast('احفظ بيانات الامتحان أولاً', 'error'); return }
    setSaving(true)
    try {
      await examsAPI.instructorUpdate(savedExamId, {
        shuffle_questions:       form.shuffle_questions,
        shuffle_answers:         form.shuffle_answers,
        show_result_immediately: form.show_result_immediately,
        show_correct_answers:    form.show_correct_answers,
        allow_review:            form.allow_review,
        is_open:                 form.is_open,
      })
      showToast('تم حفظ الإعدادات ✅', 'success')
      onBack()
    } catch { showToast('حدث خطأ في الحفظ', 'error') }
    finally { setSaving(false) }
  }

  const toggleBools = [
    { key:'shuffle_questions',       label:'🔀 خلط الأسئلة عشوائياً',      desc:'كل طالب يشوف ترتيب مختلف' },
    { key:'shuffle_answers',         label:'🔀 خلط الإجابات عشوائياً',     desc:'ترتيب الإجابات مختلف لكل طالب' },
    { key:'show_result_immediately', label:'✅ إظهار النتيجة فوراً',        desc:'الطالب يشوف درجته بعد الإنهاء' },
    { key:'show_correct_answers',    label:'📋 إظهار الإجابات الصحيحة',    desc:'يظهر للطالب الإجابات بعد الانتهاء' },
    { key:'allow_review',            label:'🔍 السماح بمراجعة الإجابات',   desc:'الطالب يقدر يراجع إجاباته' },
    { key:'is_open',                 label:'🟢 الامتحان مفتوح',             desc:'افتح أو أغلق الامتحان يدوياً' },
  ]

  return (
    <div>
      <div style={S.head}>
        <div>
          <button style={S.back} onClick={onBack}>← رجوع</button>
          <h2 style={S.title}>{isEdit ? '✏️ تعديل الامتحان' : '➕ امتحان جديد'}</h2>
        </div>
      </div>

      {/* Steps */}
      <div style={S.steps}>
        {[{n:1,label:'البيانات'},{n:2,label:'الأسئلة'},{n:3,label:'الإعدادات'}].map(s => (
          <div key={s.n} style={{ ...S.step, ...(step===s.n?S.stepActive:step>s.n?S.stepDone:{}) }}
            onClick={() => savedExamId && setStep(s.n)}>
            <span style={{ ...S.stepNum, background:step>=s.n?'var(--accent)':'var(--bg3)', color:step>=s.n?'white':'var(--text3)' }}>
              {step>s.n?'✓':s.n}
            </span>
            {s.label}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div style={S.box}>
          <h3 style={S.sectionHead}>📋 بيانات الامتحان الأساسية</h3>
          <div className="form-group">
            <label className="form-label">الكورس *</label>
            <select className="form-input" value={form.course} onChange={e => f('course', e.target.value)}>
              <option value="">اختر الكورس</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">عنوان الامتحان *</label>
            <input className="form-input" value={form.title} onChange={e => f('title', e.target.value)} placeholder="مثال: امتحان الفصل الأول" />
          </div>
          <div className="form-group">
            <label className="form-label">الوصف</label>
            <textarea className="form-input" rows={2} value={form.description} onChange={e => f('description', e.target.value)} placeholder="وصف مختصر للامتحان..." />
          </div>
          <div className="form-group">
            <label className="form-label">التعليمات (تظهر للطالب قبل البدء)</label>
            <textarea className="form-input" rows={3} value={form.instructions} onChange={e => f('instructions', e.target.value)} placeholder="مثال: اقرأ الأسئلة بعناية..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">المدة (دقائق) *</label>
              <input className="form-input" type="number" min={1} value={form.duration} onChange={e => f('duration', parseInt(e.target.value)||30)} />
            </div>
            <div className="form-group">
              <label className="form-label">درجة النجاح %</label>
              <input className="form-input" type="number" min={0} max={100} value={form.passing_score} onChange={e => f('passing_score', parseInt(e.target.value)||50)} />
            </div>
            <div className="form-group">
              <label className="form-label">عدد المحاولات المسموحة</label>
              <input className="form-input" type="number" min={1} value={form.max_attempts} onChange={e => f('max_attempts', parseInt(e.target.value)||3)} />
            </div>
          </div>
          <button className="btn btn-primary btn-lg" onClick={saveStep1} disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> جاري الحفظ...</> : 'حفظ والمتابعة →'}
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && savedExamId && (
        <QuestionsEditor
          examId={savedExamId}
          questions={questions}
          setQuestions={setQuestions}
          showToast={showToast}
          onNext={() => setStep(3)}
        />
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div style={S.box}>
          <h3 style={S.sectionHead}>⚙️ إعدادات الامتحان</h3>
          {toggleBools.map(({ key, label, desc }) => (
            <div key={key} style={S.toggle}>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:'.9rem' }}>{label}</div>
                <div style={{ fontSize:'.78rem', color:'var(--text3)' }}>{desc}</div>
              </div>
              <div
                style={{ ...S.switch, background: form[key] ? 'var(--accent3)' : 'var(--bg3)' }}
                onClick={() => f(key, !form[key])}>
                <div style={{ ...S.switchThumb, transform: form[key] ? 'translateX(-22px)' : 'none' }} />
              </div>
            </div>
          ))}
          <div style={{ display:'flex', gap:'1rem', marginTop:'1.5rem' }}>
            <button className="btn btn-primary btn-lg" onClick={saveSettings} disabled={saving}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ وإنهاء'}
            </button>
            <button className="btn btn-outline" onClick={onBack}>إلغاء</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════
//  QUESTIONS EDITOR
// ════════════════════════════════════════
function QuestionsEditor({ examId, questions, setQuestions, showToast, onNext }) {
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const imgRef              = useRef(null)

  const emptyQ = {
    question_text:'', question_type:'multiple_choice', points:1, explanation:'',
    image:null, imagePreview:null,
    answers:[
      {answer_text:'', is_correct:false},{answer_text:'', is_correct:false},
      {answer_text:'', is_correct:false},{answer_text:'', is_correct:false},
    ]
  }
  const [newQ, setNewQ] = useState(emptyQ)

  function setAns(i, k, v) {
    setNewQ(q => {
      const answers = [...q.answers]
      if (k==='is_correct' && v && q.question_type==='multiple_choice')
        answers.forEach((_,idx) => answers[idx] = { ...answers[idx], is_correct:false })
      answers[i] = { ...answers[i], [k]:v }
      return { ...q, answers }
    })
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5*1024*1024) { showToast('الصورة أكبر من 5 ميجا', 'error'); return }
    setNewQ(q => ({ ...q, image:file, imagePreview:URL.createObjectURL(file) }))
  }

  async function saveQuestion() {
    if (!newQ.question_text.trim()) { showToast('اكتب نص السؤال', 'error'); return }
    const valid = newQ.answers.filter(a => a.answer_text.trim())
    if (valid.length < 2) { showToast('أضف إجابتين على الأقل', 'error'); return }
    if (!valid.some(a => a.is_correct)) { showToast('حدد إجابة صحيحة', 'error'); return }
    setSaving(true)
    try {
      let res
      if (newQ.image instanceof File) {
        const fd = new FormData()
        fd.append('question_text', newQ.question_text)
        fd.append('question_type', newQ.question_type)
        fd.append('points',        newQ.points)
        fd.append('explanation',   newQ.explanation || '')
        fd.append('order',         questions.length)
        fd.append('image',         newQ.image)
        fd.append('answers_json',  JSON.stringify(valid))
        res = await examsAPI.addQuestion(examId, fd)
      } else {
        res = await examsAPI.addQuestion(examId, {
          question_text: newQ.question_text, question_type: newQ.question_type,
          points: newQ.points, explanation: newQ.explanation,
          order: questions.length, answers: valid,
        })
      }
      setQuestions(q => [...q, res.data])
      setAdding(false)
      setNewQ(emptyQ)
      showToast('تم إضافة السؤال ✅', 'success')
    } catch (e) {
      const msg = e.response?.data ? JSON.stringify(e.response.data) : 'حدث خطأ'
      showToast(msg, 'error')
    } finally { setSaving(false) }
  }

  async function deleteQuestion(qId, idx) {
    if (qId) { try { await examsAPI.deleteQuestion(examId, qId) } catch {} }
    setQuestions(q => q.filter((_,i) => i !== idx))
    showToast('تم حذف السؤال', 'success')
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
        <h3 style={{ fontFamily:"'Tajawal',sans-serif", fontSize:'1.1rem', fontWeight:900 }}>
          ❓ الأسئلة ({questions.length})
        </h3>
        {!adding && <button className="btn btn-outline" onClick={() => setAdding(true)}>➕ إضافة سؤال</button>}
      </div>

      {/* existing questions */}
      {questions.map((q, i) => (
        <div key={q.id || i} style={S.qCard}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.75rem' }}>
            <span style={{ fontSize:'.78rem', color:'var(--accent)', fontWeight:700 }}>سؤال {i+1} • {q.points} درجة</span>
            <button onClick={() => deleteQuestion(q.id, i)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer' }}>🗑️ حذف</button>
          </div>
          {/* صورة السؤال */}
          {(q.image_url || q.image) && (
            <div style={{ marginBottom:'.75rem', borderRadius:10, overflow:'hidden', maxHeight:200 }}>
              <img src={getImgUrl(q.image_url || q.image)} alt="صورة" style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:10 }} onError={e => e.target.style.display='none'} />
            </div>
          )}
          <div style={{ fontWeight:600, marginBottom:'.75rem', lineHeight:1.5 }}>{q.question_text}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:'.4rem' }}>
            {(q.answers||[]).map((a,j) => (
              <div key={j} style={{ display:'flex', gap:'.5rem', fontSize:'.85rem', color:a.is_correct?'var(--accent3)':'var(--text2)' }}>
                <span>{a.is_correct?'✅':'○'}</span> {a.answer_text}
              </div>
            ))}
          </div>
        </div>
      ))}

      {!questions.length && !adding && (
        <div className="empty" style={{ padding:'2rem' }}>
          <div className="empty-icon">❓</div>
          <p>لا يوجد أسئلة بعد، اضغط "إضافة سؤال"</p>
        </div>
      )}

      {/* New question form */}
      {adding && (
        <div style={{ ...S.box, border:'2px solid var(--accent)' }}>
          <h4 style={{ marginBottom:'1rem', color:'var(--accent)' }}>➕ سؤال جديد</h4>

          {/* Image */}
          <div className="form-group">
            <label className="form-label">📷 صورة للسؤال (اختياري)</label>
            <input ref={imgRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImagePick} />
            {newQ.imagePreview ? (
              <div style={{ position:'relative', marginBottom:'.75rem' }}>
                <img src={newQ.imagePreview} alt="preview" style={{ width:'100%', maxHeight:200, objectFit:'cover', borderRadius:10 }} />
                <button type="button"
                  onClick={() => setNewQ(q => ({ ...q, image:null, imagePreview:null }))}
                  style={{ position:'absolute', top:8, left:8, background:'rgba(255,79,106,.9)', border:'none', borderRadius:'50%', width:28, height:28, cursor:'pointer', color:'white', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
            ) : (
              <div onClick={() => imgRef.current?.click()}
                style={{ border:'2px dashed var(--border2)', borderRadius:10, padding:'1.5rem', textAlign:'center', cursor:'pointer', color:'var(--text2)' }}>
                <div style={{ fontSize:'2rem', marginBottom:'.5rem' }}>🖼️</div>
                <div style={{ fontSize:'.85rem' }}>انقر لرفع صورة السؤال</div>
                <div style={{ fontSize:'.72rem', color:'var(--text3)', marginTop:'.25rem' }}>PNG, JPG • حد أقصى 5 ميجا</div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">نص السؤال *</label>
            <textarea className="form-input" rows={2} value={newQ.question_text}
              onChange={e => setNewQ(q => ({ ...q, question_text:e.target.value }))} placeholder="اكتب السؤال هنا..." />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">نوع السؤال</label>
              <select className="form-input" value={newQ.question_type}
                onChange={e => setNewQ(q => ({ ...q, question_type:e.target.value }))}>
                <option value="multiple_choice">اختيار من متعدد (إجابة واحدة)</option>
                <option value="true_false">صح أو خطأ</option>
                <option value="multiple_select">اختيار متعدد (أكثر من إجابة)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">الدرجة</label>
              <input className="form-input" type="number" min={1} value={newQ.points}
                onChange={e => setNewQ(q => ({ ...q, points:parseInt(e.target.value)||1 }))} />
            </div>
          </div>

          {newQ.question_type === 'true_false' ? (
            <div className="form-group">
              <label className="form-label">الإجابة الصحيحة</label>
              <div style={{ display:'flex', gap:'1rem' }}>
                {['صح','خطأ'].map((label, i) => {
                  const isActive = newQ.answers[i]?.is_correct
                  return (
                    <button key={label} type="button"
                      onClick={() => setNewQ(q => ({ ...q, answers:[{answer_text:'صح',is_correct:i===0},{answer_text:'خطأ',is_correct:i===1}] }))}
                      style={{ flex:1, padding:'.65rem', borderRadius:10, border:`2px solid ${isActive?'var(--accent)':'var(--border)'}`, background:isActive?'rgba(79,140,255,.1)':'transparent', color:isActive?'var(--accent)':'var(--text2)', fontFamily:"'Cairo',sans-serif", fontWeight:700, cursor:'pointer' }}>
                      {i===0?'✅ صح':'❌ خطأ'}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <>
              <label className="form-label">الإجابات (✅ للإجابة الصحيحة)</label>
              {newQ.answers.map((a,i) => (
                <div key={i} style={{ display:'flex', gap:'.5rem', marginBottom:'.5rem', alignItems:'center' }}>
                  <div style={{ ...S.correct, background:a.is_correct?'var(--accent3)':'var(--bg3)', border:a.is_correct?'none':'1px solid var(--border)' }}
                    onClick={() => setAns(i, 'is_correct', !a.is_correct)}>
                    {a.is_correct ? '✓' : ''}
                  </div>
                  <input className="form-input" style={{ flex:1 }} value={a.answer_text}
                    onChange={e => setAns(i, 'answer_text', e.target.value)} placeholder={`الإجابة ${i+1}`} />
                  {newQ.answers.length > 2 && (
                    <button type="button" onClick={() => setNewQ(q => ({ ...q, answers:q.answers.filter((_,j)=>j!==i) }))}
                      style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer' }}>✕</button>
                  )}
                </div>
              ))}
              <button className="btn btn-ghost btn-sm" type="button"
                onClick={() => setNewQ(q => ({ ...q, answers:[...q.answers,{answer_text:'',is_correct:false}] }))}
                style={{ marginBottom:'1rem' }}>+ إضافة إجابة</button>
            </>
          )}

          <div className="form-group">
            <label className="form-label">شرح الإجابة (اختياري)</label>
            <textarea className="form-input" rows={2} value={newQ.explanation}
              onChange={e => setNewQ(q => ({ ...q, explanation:e.target.value }))} placeholder="اشرح الإجابة الصحيحة..." />
          </div>
          <div style={{ display:'flex', gap:'.75rem' }}>
            <button className="btn btn-primary" onClick={saveQuestion} disabled={saving}>
              {saving ? <><span className="spinner spinner-sm" /> جاري الحفظ...</> : '💾 حفظ السؤال'}
            </button>
            <button className="btn btn-outline" onClick={() => { setAdding(false); setNewQ(emptyQ) }}>إلغاء</button>
          </div>
        </div>
      )}

      <div style={{ marginTop:'1.5rem', display:'flex', gap:'1rem', alignItems:'center' }}>
        <button className="btn btn-primary btn-lg" onClick={onNext}>
          الانتقال للإعدادات →
        </button>
        <span style={{ color:'var(--text3)', fontSize:'.85rem' }}>
          {questions.length} سؤال • {questions.reduce((a,q) => a+(q.points||1), 0)} درجة إجمالية
        </span>
      </div>
    </div>
  )
}

// ════════════════════════════════════════
//  EXAM DETAIL  — النتائج + نشر
// ════════════════════════════════════════
function ExamDetail({ exam: examProp, showToast, onBack, onEdit }) {
  const [exam, setExam]                               = useState(examProp)
  const [attempts, setAttempts]                       = useState([])
  const [loading, setLoading]                         = useState(true)
  const [publishing, setPublishing]                   = useState(false)
  const [selectedStudent, setSelectedStudent]         = useState(null)

  useEffect(() => {
    // اجلب بيانات الامتحان المحدثة
    examsAPI.instructorDetail(exam.id).then(r => setExam(r.data)).catch(() => {})
    loadAttempts()
  }, [])

  async function loadAttempts() {
    setLoading(true)
    try {
      const r = await examsAPI.examResults(exam.id)
      const list = r.data.results || r.data || []
      list.sort((a,b) => (parseFloat(b.score)||0) - (parseFloat(a.score)||0))
      setAttempts(list)
    } catch { setAttempts([]) }
    finally { setLoading(false) }
  }

  async function togglePublish() {
    if (exam.status !== 'published' && !(exam.total_questions > 0)) {
      showToast('لا يمكن نشر امتحان بدون أسئلة', 'error'); return
    }
    setPublishing(true)
    try {
      const r = await examsAPI.publishExam(exam.id)
      setExam(ex => ({ ...ex, status: r.data.status }))
      showToast(r.data.message, 'success')
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ', 'error')
    } finally { setPublishing(false) }
  }

  if (selectedStudent) return <StudentAnswerView attempt={selectedStudent} exam={exam} onBack={() => setSelectedStudent(null)} />

  const graded   = attempts.filter(a => a.status==='graded' || a.score!=null)
  const passed   = graded.filter(a => a.passed)
  const avgScore = graded.length ? (graded.reduce((s,a) => s+parseFloat(a.score||0), 0) / graded.length).toFixed(1) : 0

  return (
    <div>
      <div style={S.head}>
        <div>
          <button style={S.back} onClick={onBack}>← رجوع</button>
          <h2 style={S.title}>📊 {exam.title}</h2>
          <p style={S.sub}>{exam.course_title} • {exam.duration} دقيقة • {exam.total_questions||0} سؤال</p>
        </div>
        <div style={{ display:'flex', gap:'.75rem', flexWrap:'wrap', alignItems:'center' }}>
          <span className={`badge ${exam.status==='published'?'badge-green':'badge-gold'}`} style={{ display:'flex', alignItems:'center', padding:'.4rem .8rem' }}>
            {exam.status==='published' ? '✅ منشور' : '📝 مسودة'}
          </span>
          <button
            className={`btn btn-sm ${exam.status==='published'?'btn-outline':'btn-success'}`}
            style={{ minWidth:120 }}
            onClick={togglePublish} disabled={publishing}>
            {publishing ? '⏳...' : exam.status==='published' ? '🔴 إلغاء النشر' : '🚀 نشر الامتحان'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={onEdit}>✏️ تعديل</button>
        </div>
      </div>

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label:'إجمالي المحاولات', val:attempts.length,  color:'var(--accent)',  icon:'📝' },
          { label:'الطلاب الناجحون',  val:passed.length,    color:'var(--accent3)', icon:'✅' },
          { label:'متوسط الدرجات',    val:avgScore+'%',     color:'var(--gold)',    icon:'📊' },
          { label:'نسبة النجاح',      val:graded.length?Math.round(passed.length/graded.length*100)+'%':'0%', icon:'🎯' },
        ].map((s,i) => (
          <div key={i} style={S.statCard}>
            <div style={{ fontSize:'.75rem', color:'var(--text3)', marginBottom:'.4rem' }}>{s.label}</div>
            <div style={{ fontSize:'1.8rem', fontWeight:900, color:s.color||'var(--text)' }}>{s.val}</div>
            <div style={{ position:'absolute', left:'1rem', top:'50%', transform:'translateY(-50%)', fontSize:'2.2rem', opacity:.05 }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Students table */}
      <div style={S.box}>
        <h3 style={S.sectionHead}>🏆 ترتيب الطلاب</h3>
        {loading ? <div className="spinner-wrap"><div className="spinner" /></div> :
          attempts.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>الترتيب</th><th>الطالب</th><th>الدرجة</th><th>النقاط</th><th>الحالة</th><th>الوقت</th><th>التفاصيل</th></tr></thead>
                <tbody>
                  {attempts.map((a,i) => (
                    <tr key={i} style={a.passed?{background:'rgba(0,212,170,0.03)'}:{}}>
                      <td><span style={{ fontWeight:900, fontSize:'1.1rem', color:i===0?'var(--gold)':i===1?'var(--text2)':i===2?'#cd7f32':'var(--text3)' }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</span></td>
                      <td>
                        <div style={{ fontWeight:600, fontSize:'.88rem' }}>{a.student_name||`طالب #${a.student}`}</div>
                        <div style={{ fontSize:'.72rem', color:'var(--text3)' }}>{a.student_email||''}</div>
                      </td>
                      <td><div style={{ fontWeight:900, fontSize:'1.1rem', color:parseFloat(a.score)>=exam.passing_score?'var(--accent3)':'var(--red)' }}>{a.score?parseFloat(a.score).toFixed(1)+'%':'—'}</div></td>
                      <td style={{ color:'var(--text2)', fontSize:'.85rem' }}>{a.points_earned||0} / {exam.total_points||'?'}</td>
                      <td><span className={`badge ${a.passed?'badge-green':a.status==='graded'?'badge-red':'badge-gold'}`}>{a.passed?'✅ ناجح':a.status==='graded'?'❌ راسب':'⏳ جاري'}</span></td>
                      <td style={{ color:'var(--text3)', fontSize:'.82rem' }}>{a.duration_taken?`${a.duration_taken} د`:'—'}<br/><span style={{ fontSize:'.7rem' }}>{formatDate(a.submitted_at)}</span></td>
                      <td><button className="btn btn-outline btn-sm" onClick={() => setSelectedStudent(a)}>👁️ الإجابات</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty" style={{ padding:'2rem' }}><div className="empty-icon">👨‍🎓</div><h3>لا يوجد طلاب أجروا الامتحان بعد</h3></div>
          )
        }
      </div>
    </div>
  )
}

// ════════════════════════════════════════
//  STUDENT ANSWERS VIEW
// ════════════════════════════════════════
function StudentAnswerView({ attempt, exam, onBack }) {
  const answers = attempt.student_answers || []
  return (
    <div>
      <div style={S.head}>
        <div>
          <button style={S.back} onClick={onBack}>← رجوع للنتائج</button>
          <h2 style={S.title}>👤 {attempt.student_name||`طالب #${attempt.student}`}</h2>
          <p style={S.sub}>{exam.title}</p>
        </div>
        <div style={S.scoreBox}>
          <div style={{ fontSize:'2rem', fontWeight:900, color:attempt.passed?'var(--accent3)':'var(--red)' }}>{attempt.score?parseFloat(attempt.score).toFixed(1):'?'}%</div>
          <div style={{ fontSize:'.78rem', color:'var(--text3)' }}>{attempt.passed?'✅ ناجح':'❌ راسب'}</div>
        </div>
      </div>
      <div style={{ ...S.box, display:'flex', gap:'2rem', flexWrap:'wrap', marginBottom:'1.5rem' }}>
        {[
          { label:'الدرجة', val:`${attempt.points_earned||0} / ${attempt.total_points||'?'}` },
          { label:'صح',     val:attempt.correct_count||answers.filter(a=>a.is_correct).length,  color:'var(--accent3)' },
          { label:'خطأ',    val:attempt.wrong_count||answers.filter(a=>!a.is_correct).length,   color:'var(--red)' },
          { label:'الوقت',  val:attempt.duration_taken?`${attempt.duration_taken} دقيقة`:'—' },
        ].map((s,i) => (
          <div key={i} style={{ textAlign:'center' }}>
            <div style={{ fontSize:'1.5rem', fontWeight:900, color:s.color||'var(--text)' }}>{s.val}</div>
            <div style={{ fontSize:'.75rem', color:'var(--text3)' }}>{s.label}</div>
          </div>
        ))}
      </div>
      {answers.map((a,i) => (
        <div key={i} style={{ ...S.qCard, borderColor:a.is_correct?'rgba(0,212,170,0.3)':'rgba(255,79,106,0.3)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'.75rem' }}>
            <span style={{ fontSize:'.78rem', color:'var(--text3)' }}>سؤال {i+1} • {a.question_points||1} درجة</span>
            <span className={`badge ${a.is_correct?'badge-green':'badge-red'}`}>{a.is_correct?'✅ صح':'❌ خطأ'}</span>
          </div>
          {/* صورة السؤال */}
          {a.question_image && (
            <div style={{ marginBottom:'.75rem' }}>
              <img src={getImgUrl(a.question_image)} alt="صورة السؤال" style={{ maxWidth:'100%', maxHeight:200, objectFit:'contain', borderRadius:8 }} onError={e => e.target.style.display='none'} />
            </div>
          )}
          <div style={{ fontWeight:600, marginBottom:'.75rem', lineHeight:1.5 }}>{a.question_text}</div>
          <div style={{ marginBottom:'.5rem' }}>
            <div style={{ fontSize:'.78rem', color:'var(--text3)', marginBottom:'.3rem' }}>إجابة الطالب:</div>
            {(a.selected_answers||[]).map((ans,j) => (
              <div key={j} style={{ display:'flex', gap:'.5rem', fontSize:'.88rem', color:a.is_correct?'var(--accent3)':'var(--red)', padding:'.3rem .5rem', background:a.is_correct?'rgba(0,212,170,.06)':'rgba(255,79,106,.06)', borderRadius:8, marginBottom:'.25rem' }}>
                {a.is_correct?'✅':'❌'} {ans.answer_text}
              </div>
            ))}
          </div>
          {!a.is_correct && a.correct_answers?.length>0 && (
            <div>
              <div style={{ fontSize:'.78rem', color:'var(--accent3)', marginBottom:'.3rem' }}>الإجابة الصحيحة:</div>
              {a.correct_answers.map((ans,j) => (
                <div key={j} style={{ fontSize:'.88rem', color:'var(--accent3)', padding:'.3rem .5rem', background:'rgba(0,212,170,.08)', borderRadius:8 }}>✅ {ans.answer_text}</div>
              ))}
            </div>
          )}
          {a.explanation && (
            <div style={{ marginTop:'.75rem', padding:'.75rem', background:'var(--bg3)', borderRadius:8, fontSize:'.85rem', color:'var(--text2)', borderRight:'3px solid var(--accent)' }}>
              💡 <strong>الشرح:</strong> {a.explanation}
            </div>
          )}
        </div>
      ))}
      {!answers.length && <div className="empty"><div className="empty-icon">📝</div><p>لا تتوفر تفاصيل الإجابات</p></div>}
    </div>
  )
}

// ════════════════════════════════════════
//  STYLES
// ════════════════════════════════════════
const S = {
  head:        { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'2rem', flexWrap:'wrap', gap:'1rem' },
  title:       { fontFamily:"'Tajawal',sans-serif", fontSize:'1.5rem', fontWeight:900, marginBottom:'.25rem' },
  sub:         { color:'var(--text2)', fontSize:'.88rem' },
  back:        { background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'.88rem', marginBottom:'.5rem', padding:0, fontFamily:"'Cairo',sans-serif" },
  box:         { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.5rem', marginBottom:'1.5rem' },
  sectionHead: { fontSize:'1rem', fontWeight:700, marginBottom:'1.25rem', paddingBottom:'.75rem', borderBottom:'1px solid var(--border)' },
  examCard:    { display:'flex', alignItems:'center', gap:'1.25rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem 1.5rem' },
  examIcon:    { fontSize:'2.5rem', width:56, height:56, background:'var(--bg3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  steps:       { display:'flex', marginBottom:'2rem', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' },
  step:        { flex:1, display:'flex', alignItems:'center', gap:'.5rem', padding:'.85rem 1rem', cursor:'pointer', color:'var(--text3)', fontSize:'.85rem', fontWeight:500, borderLeft:'1px solid var(--border)' },
  stepActive:  { background:'rgba(79,140,255,0.1)', color:'var(--accent)' },
  stepDone:    { color:'var(--accent3)' },
  stepNum:     { width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.72rem', fontWeight:700, flexShrink:0 },
  qCard:       { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'1.25rem', marginBottom:'1rem' },
  toggle:      { display:'flex', alignItems:'center', gap:'1rem', padding:'.85rem 1rem', background:'var(--bg3)', borderRadius:10, marginBottom:'.5rem' },
  switch:      { width:44, height:22, borderRadius:11, cursor:'pointer', position:'relative', transition:'background .2s', flexShrink:0 },
  switchThumb: { position:'absolute', top:2, right:2, width:18, height:18, borderRadius:'50%', background:'white', transition:'transform .2s' },
  correct:     { width:28, height:28, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', fontWeight:700, fontSize:'.85rem', color:'#0a0e1a', flexShrink:0 },
  statsRow:    { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:'1rem', marginBottom:'2rem' },
  statCard:    { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1.25rem', position:'relative', overflow:'hidden' },
  scoreBox:    { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, padding:'1rem 1.5rem', textAlign:'center' },
}
