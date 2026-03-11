import { useState, useEffect } from 'react'
import { enrollmentsAPI } from '../api'
import { formatDate } from '../utils'

// ═══════════════════════════════════════════════════
//  STUDENT MANAGER — إدارة طلاب المدرب
// ═══════════════════════════════════════════════════
export default function StudentManager({ showToast, courses = [], onPendingUpdate }) {
  const [enrollments, setEnrollments] = useState([])
  const [summary, setSummary]         = useState({ pending: 0, active: 0, rejected: 0, blocked: 0, total: 0 })
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState({ status: 'pending', course_id: '', search: '' })
  const [selected, setSelected]       = useState(null)   // enrollment مفتوح
  const [noteModal, setNoteModal]     = useState(null)   // { id, note }
  const [progModal, setProgModal]     = useState(null)   // { id, progress }
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => { load() }, [filter])

  async function load() {
    setLoading(true)
    try {
      const params = {}
      if (filter.status)    params.status    = filter.status
      if (filter.course_id) params.course_id = filter.course_id
      if (filter.search)    params.search    = filter.search
      const r = await enrollmentsAPI.instructorList(params)
      setEnrollments(r.data.results || [])
      const s = r.data.summary || { pending: 0, active: 0, rejected: 0, blocked: 0, total: 0 }
      setSummary(s)
      if (onPendingUpdate) onPendingUpdate(s.pending || 0)
    } catch { setEnrollments([]) }
    finally { setLoading(false) }
  }

  async function doAction(fn, successMsg, id, extra = {}) {
    setActionLoading(true)
    try {
      await fn(id, extra)
      showToast(successMsg, 'success')
      load()
      if (selected?.id === id) setSelected(null)
    } catch (e) {
      showToast(e.response?.data?.error || 'حدث خطأ', 'error')
    } finally { setActionLoading(false) }
  }

  // ── الحالات وألوانها ──
  const statusInfo = {
    pending:   { label: '⏳ انتظار',    badge: 'badge-gold',  text: 'في انتظار موافقتك' },
    active:    { label: '✅ نشط',       badge: 'badge-green', text: 'مقبول ونشط في الكورس' },
    rejected:  { label: '❌ مرفوض',    badge: 'badge-red',   text: 'طلب مرفوض' },
    blocked:   { label: '🚫 محظور',    badge: 'badge-red',   text: 'محظور من الكورس' },
    completed: { label: '🎓 مكتمل',   badge: 'badge-blue',  text: 'أكمل الكورس' },
    dropped:   { label: '🚪 منسحب',   badge: 'badge-gold',  text: 'انسحب من الكورس' },
  }

  // ── أزرار الإجراءات لكل حالة ──
  function ActionButtons({ e }) {
    const btns = []

    if (e.status === 'pending') {
      btns.push(
        <button key="approve" className="btn btn-success btn-sm"
          onClick={() => doAction(enrollmentsAPI.approve, `✅ تم قبول ${e.student_name}`, e.id)}
          disabled={actionLoading}>✅ قبول</button>,
        <button key="reject" className="btn btn-outline btn-sm" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
          onClick={() => setNoteModal({ id: e.id, action: 'reject', name: e.student_name })}
          disabled={actionLoading}>❌ رفض</button>
      )
    }

    if (e.status === 'active') {
      btns.push(
        <button key="block" className="btn btn-outline btn-sm" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
          onClick={() => setNoteModal({ id: e.id, action: 'block', name: e.student_name })}
          disabled={actionLoading}>🚫 حظر</button>,
        <button key="prog" className="btn btn-outline btn-sm"
          onClick={() => setProgModal({ id: e.id, progress: e.progress, name: e.student_name })}
          disabled={actionLoading}>📊 تقدم</button>
      )
    }

    if (e.status === 'rejected') {
      btns.push(
        <button key="re-approve" className="btn btn-success btn-sm"
          onClick={() => doAction(enrollmentsAPI.approve, `✅ تم قبول ${e.student_name}`, e.id)}
          disabled={actionLoading}>↩️ قبول</button>
      )
    }

    if (e.status === 'blocked') {
      btns.push(
        <button key="unblock" className="btn btn-outline btn-sm" style={{ borderColor: 'var(--accent3)', color: 'var(--accent3)' }}
          onClick={() => doAction(enrollmentsAPI.unblock, `✅ تم رفع الحظر عن ${e.student_name}`, e.id)}
          disabled={actionLoading}>🔓 رفع الحظر</button>
      )
    }

    // زرار ملاحظة دايمًا
    btns.push(
      <button key="note" className="btn btn-ghost btn-sm"
        onClick={() => setNoteModal({ id: e.id, action: 'note', name: e.student_name, current: e.instructor_note })}
        disabled={actionLoading}>📝 ملاحظة</button>
    )

    return <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>{btns}</div>
  }

  return (
    <div>
      {/* Header */}
      <div style={S.head}>
        <div>
          <h2 style={S.title}>👨‍🎓 إدارة الطلاب</h2>
          <p style={S.sub}>تحكم في طلبات التسجيل وتابع تقدم طلابك</p>
        </div>
        {summary.pending > 0 && (
          <div style={{ background: 'linear-gradient(135deg,rgba(239,68,68,.12),rgba(220,38,38,.06))', border: '1.5px solid rgba(239,68,68,.4)', borderRadius: 14, padding: '.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '.75rem', animation: 'pulse-glow 2s ease infinite' }}>
            <div style={{ width:42, height:42, borderRadius:'50%', background:'rgba(239,68,68,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.3rem', flexShrink:0 }}>🔔</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: '1rem', color: '#ef4444' }}>
                {summary.pending} طالب ينتظر موافقتك
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginTop:'.1rem' }}>راجع الطلبات واقبل أو ارفض</div>
            </div>
            <button className="btn btn-sm" style={{ marginRight:'auto', background:'#ef4444', color:'white', border:'none', borderRadius:20 }}
              onClick={() => setFilter(f => ({ ...f, status: 'pending' }))}>
              عرض الطلبات ←
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div style={S.statsRow}>
        {[
          { label: 'إجمالي الطلاب', val: summary.total,    color: 'var(--accent)',  icon: '👥' },
          { label: 'انتظار الموافقة', val: summary.pending,  color: 'var(--gold)',    icon: '⏳' },
          { label: 'طلاب نشطون',    val: summary.active,   color: 'var(--accent3)', icon: '✅' },
          { label: 'مرفوض / محظور', val: (summary.rejected || 0) + (summary.blocked || 0), color: 'var(--red)', icon: '🚫' },
        ].map((s, i) => (
          <div key={i} style={S.statCard}>
            <div style={{ fontSize: '.75rem', color: 'var(--text3)', marginBottom: '.3rem' }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '2.2rem', opacity: .07 }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...S.box, display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1rem' }}>
        {/* فلتر الحالة */}
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
          {[
            { val: 'pending',  label: `⏳ انتظار (${summary.pending})` },
            { val: 'active',   label: `✅ نشط (${summary.active})` },
            { val: 'rejected', label: '❌ مرفوض' },
            { val: 'blocked',  label: '🚫 محظور' },
            { val: '',         label: '📋 الكل' },
          ].map(opt => (
            <button key={opt.val}
              className={`btn btn-sm ${filter.status === opt.val ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setFilter(f => ({ ...f, status: opt.val }))}>
              {opt.label}
            </button>
          ))}
        </div>

        {/* فلتر الكورس */}
        {courses.length > 1 && (
          <select className="form-input" style={{ maxWidth: 200, padding: '.4rem .7rem', fontSize: '.85rem' }}
            value={filter.course_id} onChange={e => setFilter(f => ({ ...f, course_id: e.target.value }))}>
            <option value="">كل الكورسات</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}

        {/* بحث */}
        <input className="form-input" placeholder="🔍 ابحث بالاسم أو الإيميل..."
          style={{ maxWidth: 250, padding: '.4rem .7rem', fontSize: '.85rem' }}
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))} />
      </div>

      {/* Quick approve all pending */}
      {filter.status === 'pending' && enrollments.length > 1 && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button className="btn btn-success btn-sm"
            onClick={async () => {
              if (!window.confirm(`قبول كل ${enrollments.length} طلب؟`)) return
              setActionLoading(true)
              for (const e of enrollments) {
                try { await enrollmentsAPI.approve(e.id) } catch {}
              }
              showToast(`✅ تم قبول ${enrollments.length} طالب`, 'success')
              setActionLoading(false)
              load()
            }}
            disabled={actionLoading}>
            ✅ قبول الكل ({enrollments.length})
          </button>
          <span style={{ fontSize: '.8rem', color: 'var(--text3)' }}>قبول كل طلبات الانتظار دفعة واحدة</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : enrollments.length ? (
        <div style={S.box}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الكورس</th>
                  <th>الحالة</th>
                  <th>التقدم</th>
                  <th>تاريخ الطلب</th>
                  <th>الملاحظة</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((e, i) => {
                  const si = statusInfo[e.status] || { label: e.status, badge: 'badge-gold' }
                  return (
                    <tr key={i} style={e.status === 'pending' ? { background: 'rgba(255,180,0,.04)' } : {}}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'white', fontSize: '.85rem', flexShrink: 0 }}>
                            {(e.student_name || 'ط')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '.9rem' }}>{e.student_name}</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text3)' }}>{e.student_email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '.85rem', color: 'var(--text2)', maxWidth: 150 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.course_title}</div>
                      </td>
                      <td><span className={`badge ${si.badge}`}>{si.label}</span></td>
                      <td>
                        {e.status === 'active' || e.status === 'completed' ? (
                          <div style={{ minWidth: 80 }}>
                            <div style={{ fontSize: '.8rem', fontWeight: 700, marginBottom: '.2rem' }}>{e.progress}%</div>
                            <div style={{ height: 5, background: 'var(--bg3)', borderRadius: 4 }}>
                              <div style={{ width: `${e.progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
                            </div>
                          </div>
                        ) : <span style={{ color: 'var(--text3)', fontSize: '.8rem' }}>—</span>}
                      </td>
                      <td style={{ fontSize: '.78rem', color: 'var(--text3)' }}>{formatDate(e.enrolled_at)}</td>
                      <td style={{ fontSize: '.78rem', color: 'var(--text3)', maxWidth: 120 }}>
                        {e.instructor_note
                          ? <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }} title={e.instructor_note}>📝 {e.instructor_note}</span>
                          : <span style={{ opacity: .4 }}>—</span>
                        }
                      </td>
                      <td><ActionButtons e={e} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty">
          <div className="empty-icon">👨‍🎓</div>
          <h3>لا يوجد طلاب في هذه القائمة</h3>
          <p>{filter.status === 'pending' ? 'لا يوجد طلبات انتظار حالياً 🎉' : 'جرب فلتر مختلف'}</p>
        </div>
      )}

      {/* ── Modal: رفض / حظر / ملاحظة ── */}
      {noteModal && (
        <NoteModal
          modal={noteModal}
          onConfirm={async (note) => {
            if (noteModal.action === 'reject') {
              await doAction(enrollmentsAPI.reject, `❌ تم رفض ${noteModal.name}`, noteModal.id, { note })
            } else if (noteModal.action === 'block') {
              await doAction(enrollmentsAPI.block, `🚫 تم حظر ${noteModal.name}`, noteModal.id, { note })
            } else {
              await doAction(enrollmentsAPI.addNote, '📝 تم حفظ الملاحظة', noteModal.id, note)
            }
            setNoteModal(null)
          }}
          onClose={() => setNoteModal(null)}
        />
      )}

      {/* ── Modal: تعديل تقدم ── */}
      {progModal && (
        <ProgressModal
          modal={progModal}
          onConfirm={async (progress) => {
            await doAction(enrollmentsAPI.setProgress, `📊 تم تحديث تقدم ${progModal.name}`, progModal.id, progress)
            setProgModal(null)
          }}
          onClose={() => setProgModal(null)}
        />
      )}
    </div>
  )
}

// ── Modal ملاحظة / رفض / حظر ──
function NoteModal({ modal, onConfirm, onClose }) {
  const [note, setNote] = useState(modal.current || '')
  const [loading, setLoading] = useState(false)

  const titles = {
    reject: { title: '❌ رفض الطلب',   desc: `سيتم رفض طلب ${modal.name}`, btn: 'تأكيد الرفض',   btnClass: 'btn-outline' },
    block:  { title: '🚫 حظر الطالب',  desc: `سيتم حظر ${modal.name} من الكورس`, btn: 'تأكيد الحظر', btnClass: 'btn-outline' },
    note:   { title: '📝 ملاحظة على الطالب', desc: `ملاحظة خاصة على ${modal.name}`, btn: 'حفظ الملاحظة', btnClass: 'btn-primary' },
  }
  const t = titles[modal.action]

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <h3 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: '1.1rem', fontWeight: 900, marginBottom: '.5rem' }}>{t.title}</h3>
        <p style={{ fontSize: '.85rem', color: 'var(--text3)', marginBottom: '1rem' }}>{t.desc}</p>
        <textarea className="form-input" rows={3}
          placeholder={modal.action === 'note' ? 'اكتب ملاحظتك هنا...' : 'سبب الرفض / الحظر (اختياري)...'}
          value={note} onChange={e => setNote(e.target.value)}
          style={{ marginBottom: '1rem', resize: 'vertical' }} />
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>إلغاء</button>
          <button className={`btn ${t.btnClass} btn-sm`} style={modal.action !== 'note' ? { borderColor: 'var(--red)', color: 'var(--red)' } : {}}
            disabled={loading}
            onClick={async () => { setLoading(true); await onConfirm(note); setLoading(false) }}>
            {loading ? '...' : t.btn}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal تعديل تقدم ──
function ProgressModal({ modal, onConfirm, onClose }) {
  const [progress, setProgress] = useState(modal.progress || 0)
  const [loading, setLoading] = useState(false)

  return (
    <div style={S.overlay}>
      <div style={S.modal}>
        <h3 style={{ fontFamily: "'Tajawal',sans-serif", fontSize: '1.1rem', fontWeight: 900, marginBottom: '.5rem' }}>📊 تعديل تقدم الطالب</h3>
        <p style={{ fontSize: '.85rem', color: 'var(--text3)', marginBottom: '1rem' }}>{modal.name}</p>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
            <label className="form-label" style={{ margin: 0 }}>نسبة الإنجاز</label>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>{progress}%</span>
          </div>
          <input type="range" min={0} max={100} value={progress}
            onChange={e => setProgress(parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text3)' }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </div>
        {progress === 100 && (
          <div style={{ fontSize: '.82rem', color: 'var(--accent3)', background: 'rgba(0,212,170,.1)', padding: '.5rem .75rem', borderRadius: 8, marginBottom: '1rem' }}>
            🎓 الوصول لـ 100% سيُكمل الكورس تلقائياً
          </div>
        )}
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>إلغاء</button>
          <button className="btn btn-primary btn-sm" disabled={loading}
            onClick={async () => { setLoading(true); await onConfirm(progress); setLoading(false) }}>
            {loading ? '...' : '💾 حفظ'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Styles ──
const S = {
  head:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' },
  title:    { fontFamily: "'Tajawal',sans-serif", fontSize: '1.5rem', fontWeight: 900, marginBottom: '.25rem' },
  sub:      { color: 'var(--text2)', fontSize: '.88rem' },
  box:      { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem', marginBottom: '1rem' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.1rem 1.25rem', position: 'relative', overflow: 'hidden' },
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' },
  modal:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1.75rem', width: '100%', maxWidth: 420 },
}
