import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import Layout from '../../components/common/Layout';
import { Alert, EmptyState, Modal, PageLoader, Pagination, SectionHeader, StatCard } from '../../components/common/UI';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const today = new Date();
const daysAgo = new Date(today);
daysAgo.setDate(daysAgo.getDate() - 29);
const toInputDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const DEFAULT_FROM = toInputDate(daysAgo);
const DEFAULT_TO = toInputDate(today);

const PageHeading = ({ title, subtitle, action }) => (
  <div className="page-header">
    <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: 'wrap' }}>
      <div><h1 className="page-title">{title}</h1><p className="page-subtitle">{subtitle}</p></div>
      {action}
    </div>
  </div>
);

const ErrorMessage = ({ message }) => message ? <Alert type="error">{message}</Alert> : null;

const downloadCsv = (filename, rows) => {
  const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function PrincipalDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const { classId, studentId } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [interventions, setInterventions] = useState(null);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [grade, setGrade] = useState('');
  const [from, setFrom] = useState(DEFAULT_FROM);
  const [to, setTo] = useState(DEFAULT_TO);
  const [reportLoading, setReportLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', class: '', rollNumber: '', classes: [] });
  const [classForm, setClassForm] = useState({ name: '', grade: '6', section: 'A', classTeacher: '' });

  const pageKind = useMemo(() => {
    if (studentId) return 'student-detail';
    if (classId) return 'class-detail';
    const path = location.pathname.replace(/\/$/, '');
    if (path.endsWith('/classes')) return 'classes';
    if (path.endsWith('/students')) return 'students';
    if (path.endsWith('/teachers')) return 'teachers';
    if (path.endsWith('/interventions')) return 'interventions';
    if (path.endsWith('/reports')) return 'reports';
    return 'dashboard';
  }, [classId, location.pathname, studentId]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (pageKind === 'dashboard') {
          const params = new URLSearchParams({ from, to });
          const [summary, classResult] = await Promise.all([
            api.get(`/principal/dashboard?${params}`),
            api.get(`/principal/classes?${params}`),
          ]);
          if (active) {
            setDashboard(summary.data.data);
            setClasses(classResult.data.data || []);
          }
        } else if (pageKind === 'classes') {
          const [result, teacherResult] = await Promise.all([
            api.get('/principal/classes'),
            api.get('/principal/teachers?limit=100'),
          ]);
          if (active) {
            setClasses(result.data.data || []);
            setTeachers(teacherResult.data.data || []);
          }
        } else if (pageKind === 'class-detail') {
          const result = await api.get(`/principal/classes/${classId}/performance`);
          if (active) setStudentDetail(result.data.data);
        } else if (pageKind === 'students') {
          const params = new URLSearchParams({ page, limit: 20 });
          params.set('active', 'all');
          if (search) params.set('search', search);
          if (grade) params.set('grade', grade);
          const [result, classResult] = await Promise.all([
            api.get(`/principal/students?${params}`),
            api.get('/principal/classes'),
          ]);
          if (active) {
            setRows(result.data.data || []);
            setPagination(result.data.pagination);
            setClassOptions(classResult.data.data || []);
          }
        } else if (pageKind === 'student-detail') {
          const result = await api.get(`/principal/students/${studentId}`);
          if (active) setStudentDetail(result.data.data);
        } else if (pageKind === 'teachers') {
          const result = await api.get('/principal/teachers?limit=100&active=all');
          if (active) setTeachers(result.data.data || []);
        } else if (pageKind === 'interventions') {
          const result = await api.get('/principal/interventions?limit=25');
          if (active) setInterventions(result.data.data);
        } else if (pageKind === 'reports') {
          const [summary, classResult] = await Promise.all([
            api.get(`/principal/dashboard?from=${DEFAULT_FROM}&to=${DEFAULT_TO}`),
            api.get(`/principal/classes?from=${DEFAULT_FROM}&to=${DEFAULT_TO}`),
          ]);
          if (active) {
            setDashboard(summary.data.data);
            setClasses(classResult.data.data || []);
          }
        }
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Could not load this school data.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [classId, from, grade, page, pageKind, search, studentId]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const downloadStudentPdf = async (id) => {
    setReportLoading(true);
    setError('');
    try {
      const response = await api.get(`/features/report/student/${id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `student-report-${id}.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not download the student report.');
    } finally {
      setReportLoading(false);
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      const isStudent = pageKind === 'students';
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: isStudent ? 'student' : 'teacher',
      };
      if (isStudent) {
        if (form.class) payload.class = form.class;
        if (form.rollNumber) payload.rollNumber = form.rollNumber;
      } else {
        payload.classes = form.classes;
      }
      await api.post('/principal/users', payload);
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', class: '', rollNumber: '', classes: [] });
      if (isStudent) {
        const params = new URLSearchParams({ page, limit: 20 });
        params.set('active', 'all');
        if (search) params.set('search', search);
        if (grade) params.set('grade', grade);
        const result = await api.get(`/principal/students?${params}`);
        setRows(result.data.data || []);
        setPagination(result.data.pagination);
      } else {
        const result = await api.get('/principal/teachers?limit=100&active=all');
        setTeachers(result.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create this account.');
    } finally {
      setCreating(false);
    }
  };

  const createClass = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError('');
    try {
      await api.post('/principal/classes', classForm);
      const [classResult, teacherResult] = await Promise.all([
        api.get('/principal/classes'),
        api.get('/principal/teachers?limit=100'),
      ]);
      setClasses(classResult.data.data || []);
      setTeachers(teacherResult.data.data || []);
      setClassForm({ name: '', grade: '6', section: 'A', classTeacher: '' });
      setCreateOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create this class.');
    } finally {
      setCreating(false);
    }
  };

  const updateUserStatus = async (record) => {
    setError('');
    try {
      await api.patch(`/principal/users/${record._id}`, { isActive: !record.isActive });
      if (pageKind === 'students') {
        setRows(current => current.map(item => item._id === record._id ? { ...item, isActive: !record.isActive } : item));
      } else {
        setTeachers(current => current.map(item => item._id === record._id ? { ...item, isActive: !record.isActive } : item));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the account status.');
    }
  };

  const updateClassTeacher = async (classRecord, teacherId) => {
    setError('');
    try {
      const response = await api.patch(`/principal/classes/${classRecord._id}`, { classTeacher: teacherId });
      setClasses(current => current.map(item => item._id === classRecord._id ? { ...item, classTeacher: response.data.data.classTeacher } : item));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the class teacher.');
    }
  };

  const reassignStudent = async (student, nextClassId) => {
    setError('');
    try {
      await api.patch(`/principal/users/${student._id}`, { class: nextClassId || null });
      const classInfo = classOptions.find(item => item._id === nextClassId);
      setRows(current => current.map(item => item._id === student._id ? { ...item, class: classInfo || null } : item));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update the student class.');
    }
  };

  if (loading) return <Layout><PageLoader /></Layout>;

  const metricCards = dashboard?.summary ? [
    { label: 'Active students', value: dashboard.summary.activeStudents, icon: '🎒', color: '#2563EB' },
    { label: 'Active teachers', value: dashboard.summary.activeTeachers, icon: '👩‍🏫', color: 'var(--secondary)' },
    { label: 'Classes', value: dashboard.summary.activeClasses, icon: '🏫', color: 'var(--primary)' },
    { label: 'Participating students', value: dashboard.summary.participatingStudents, icon: '✅', color: '#7C3AED', sublabel: `${dashboard.summary.unassessedStudents} not assessed in this period` },
    { label: 'Completed attempts', value: dashboard.summary.completedAttempts, icon: '📝', color: 'var(--accent-dark)' },
    { label: 'Average attempt score', value: dashboard.summary.averageAttemptScore === null ? '—' : `${dashboard.summary.averageAttemptScore}%`, icon: '🎯', color: dashboard.summary.averageAttemptScore >= 70 ? 'var(--secondary)' : 'var(--primary)', sublabel: dashboard.summary.averageAttemptScore === null ? 'No completed attempts in this period' : 'Completed attempts only' },
  ] : [];

  return (
    <Layout>
      {pageKind === 'dashboard' && (
        <>
          <PageHeading title="Principal Dashboard" subtitle={`${dashboard?.school?.name || user?.school?.name || 'Your school'} · School learning overview`} />
          <ErrorMessage message={error} />
          <div className="card mb-6">
            <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: 'wrap' }}>
              <div><strong>{dashboard?.school?.district}, {dashboard?.school?.state}</strong><div className="text-muted">Learning activity period (India Standard Time)</div></div>
              <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); setFrom(event.currentTarget.elements.from.value); setTo(event.currentTarget.elements.to.value); }}>
                <label>From <input className="form-input" name="from" type="date" value={from} max={to} onChange={event => setFrom(event.target.value)} /></label>
                <label>To <input className="form-input" name="to" type="date" value={to} min={from} onChange={event => setTo(event.target.value)} /></label>
              </form>
            </div>
          </div>
          <div className="stats-grid mb-6">
            {metricCards.map(card => <StatCard key={card.label} {...card} />)}
          </div>
          <div className="grid-2 gap-4 mb-6">
            <div className="card">
              <SectionHeader title="Learning trend" subtitle="Average score and completed attempts per day" />
              {dashboard?.scoreTrend?.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={dashboard.scoreTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="score" domain={[0, 100]} />
                    <YAxis yAxisId="attempts" orientation="right" allowDecimals={false} />
                    <Tooltip />
                    <Line yAxisId="score" type="monotone" dataKey="averageScore" name="Average score (%)" stroke="var(--primary)" strokeWidth={2} />
                    <Line yAxisId="attempts" type="monotone" dataKey="attempts" name="Attempts" stroke="var(--secondary)" />
                  </LineChart>
                </ResponsiveContainer>
              ) : <EmptyState title="No learning activity yet" message="Completed quiz attempts will appear here for the selected period." />}
            </div>
            <div className="card">
              <SectionHeader title="Concepts needing support" subtitle="Lowest average concept scores in this period" />
              {dashboard?.weakConcepts?.length ? dashboard.weakConcepts.map(item => (
                <div key={item.conceptId} className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--gray-100)', padding: '12px 0', gap: 12 }}>
                  <div><strong>{item.name}</strong><div className="text-muted">{item.weakStudents} low scores · {item.assessedStudents} assessed</div></div>
                  <strong style={{ color: item.averageScore < 40 ? 'var(--danger)' : 'var(--accent-dark)' }}>{item.averageScore}%</strong>
                </div>
              )) : <EmptyState title="No concept results" message="Concept-level results appear after students complete quizzes." />}
            </div>
          </div>
          <div className="card">
            <SectionHeader title="Class overview" subtitle="Recent learning activity by class" action={<Link className="btn btn-outline btn-sm" to="/principal/classes">View all classes</Link>} />
            <ClassTable classes={classes.slice(0, 8)} />
          </div>
        </>
      )}

      {pageKind === 'classes' && (
        <>
          <PageHeading title="School Classes" subtitle="Compare student participation and learning outcomes by class" action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Add class</button>} />
          <ErrorMessage message={error} />
          <div className="card"><ClassTable classes={classes} teachers={teachers.filter(item => item.isActive)} onAssignTeacher={updateClassTeacher} /></div>
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add class" size="md">
            <form onSubmit={createClass}>
              <div className="form-group"><label className="form-label">Class name *</label><input className="form-input" required value={classForm.name} onChange={event => setClassForm(current => ({ ...current, name: event.target.value }))} placeholder="Class 6 - A" /></div>
              <div className="grid-2 gap-4">
                <div className="form-group"><label className="form-label">Grade *</label><select className="form-input form-select" value={classForm.grade} onChange={event => setClassForm(current => ({ ...current, grade: event.target.value }))}>{[6, 7, 8, 9, 10].map(value => <option key={value}>{value}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Section</label><input className="form-input" value={classForm.section} onChange={event => setClassForm(current => ({ ...current, section: event.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Class teacher</label><select className="form-input form-select" value={classForm.classTeacher} onChange={event => setClassForm(current => ({ ...current, classTeacher: event.target.value }))}><option value="">Unassigned</option>{teachers.filter(item => item.isActive).map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></div>
              <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}><button className="btn btn-ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create class'}</button></div>
            </form>
          </Modal>
        </>
      )}

      {pageKind === 'class-detail' && (
        <>
          <PageHeading title={studentDetail?.class?.name || 'Class performance'} subtitle={`${studentDetail?.class?.grade ? `Grade ${studentDetail.class.grade} · ` : ''}${studentDetail?.students?.length || 0} students`} action={<Link className="btn btn-outline btn-sm" to="/principal/classes">All classes</Link>} />
          <ErrorMessage message={error} />
          <div className="grid-2 gap-4 mb-6">
            <div className="card"><SectionHeader title="Class teacher" /><div>{studentDetail?.class?.classTeacher?.name || 'Not assigned'}</div></div>
            <div className="card"><SectionHeader title="Concepts needing support" />
              {studentDetail?.weakConcepts?.length ? studentDetail.weakConcepts.map(item => <div key={item.conceptId} className="flex justify-between" style={{ padding: '8px 0' }}><span>{item.name} · {item.weakStudents} low scores</span><strong>{item.averageScore}%</strong></div>) : <p>No assessed concept results yet.</p>}
            </div>
          </div>
          <div className="card"><SectionHeader title="Students" subtitle="Select a student to view their progress and reports" /><StudentTable students={studentDetail?.students || []} onDownload={downloadStudentPdf} reportLoading={reportLoading} /></div>
        </>
      )}

      {pageKind === 'students' && (
        <>
          <PageHeading title="School Students" subtitle="Search and filter student learning records" action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Add student</button>} />
          <ErrorMessage message={error} />
          <div className="card">
            <form className="flex items-center gap-3 mb-4" onSubmit={handleSearch} style={{ flexWrap: 'wrap' }}>
              <input className="form-input" aria-label="Search students" placeholder="Search by student name" value={searchInput} onChange={event => setSearchInput(event.target.value)} />
              <select className="form-input form-select" aria-label="Filter by grade" value={grade} onChange={event => { setGrade(event.target.value); setPage(1); }}>
                <option value="">All grades</option>{[6, 7, 8, 9, 10].map(value => <option key={value} value={value}>Grade {value}</option>)}
              </select>
              <button className="btn btn-primary" type="submit">Search</button>
            </form>
            <StudentTable students={rows} onDownload={downloadStudentPdf} reportLoading={reportLoading} onToggleStatus={updateUserStatus} classOptions={classOptions} onReassign={reassignStudent} />
            <Pagination pagination={pagination} onPageChange={setPage} />
          </div>
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add student" size="md">
            <form onSubmit={createUser}>
              <div className="form-group"><label className="form-label">Full name *</label><input className="form-input" required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Initial password *</label><input className="form-input" type="password" minLength={8} required value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></div>
              <div className="grid-2 gap-4">
                <div className="form-group"><label className="form-label">Class</label><select className="form-input form-select" value={form.class} onChange={event => setForm(current => ({ ...current, class: event.target.value }))}><option value="">Unassigned</option>{classOptions.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Roll number</label><input className="form-input" value={form.rollNumber} onChange={event => setForm(current => ({ ...current, rollNumber: event.target.value }))} /></div>
              </div>
              <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}><button className="btn btn-ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create student'}</button></div>
            </form>
          </Modal>
        </>
      )}

      {pageKind === 'student-detail' && (
        <>
          <PageHeading title={studentDetail?.student?.name || 'Student progress'} subtitle={`${studentDetail?.student?.class?.name || 'No class assigned'} · ${studentDetail?.student?.email || ''}`} action={<Link className="btn btn-outline btn-sm" to="/principal/students">All students</Link>} />
          <ErrorMessage message={error} />
          {studentDetail?.student && <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            <StatCard label="Streak" value={`${studentDetail.student.streak || 0} days`} icon="🔥" />
            <StatCard label="Points" value={studentDetail.student.totalPoints || 0} icon="⭐" />
            <button className="btn btn-primary" disabled={reportLoading} onClick={() => downloadStudentPdf(studentDetail.student._id)}>{reportLoading ? 'Preparing report…' : 'Download student PDF report'}</button>
          </div>}
          <div className="grid-2 gap-4 mb-6">
            <div className="card"><SectionHeader title="Recent completed attempts" />
              {studentDetail?.attempts?.length ? studentDetail.attempts.map(attempt => <div key={attempt._id} className="flex justify-between" style={{ borderBottom: '1px solid var(--gray-100)', padding: '10px 0', gap: 8 }}><span>{attempt.quiz?.title || 'Quiz'} · {attempt.subject?.name || 'Subject'}</span><strong>{attempt.percentage}%</strong></div>) : <EmptyState title="No completed attempts" />}
            </div>
            <div className="card"><SectionHeader title="Open recommendations" />
              {studentDetail?.recommendations?.length ? studentDetail.recommendations.map(item => <div key={item._id} style={{ borderBottom: '1px solid var(--gray-100)', padding: '10px 0' }}><strong>{item.task?.title || item.concept?.name || 'Learning task'}</strong><div className="text-muted">{item.message}</div></div>) : <EmptyState title="No open recommendations" />}
            </div>
          </div>
        </>
      )}

      {pageKind === 'teachers' && (
        <>
          <PageHeading title="School Teachers" subtitle="Review active teacher assignments and school coverage" action={<button className="btn btn-primary" onClick={() => setCreateOpen(true)}>Add teacher</button>} />
          <ErrorMessage message={error} />
          <div className="card"><div className="table-wrapper"><table className="table"><thead><tr><th>Teacher</th><th>Email</th><th>Classes</th><th>Subjects</th><th>Last login</th><th>Status</th><th>Actions</th></tr></thead><tbody>
            {teachers.map(teacher => <tr key={teacher._id}><td>{teacher.name}</td><td>{teacher.email}</td><td>{teacher.classes?.map(item => item.name).join(', ') || 'Unassigned'}</td><td>{teacher.subjects?.map(item => item.name).join(', ') || '—'}</td><td>{teacher.lastLogin ? new Date(teacher.lastLogin).toLocaleDateString() : 'Never'}</td><td>{teacher.isActive ? 'Active' : 'Inactive'}</td><td><button className="btn btn-outline btn-xs" onClick={() => updateUserStatus(teacher)}>{teacher.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>)}
            {!teachers.length && <tr><td colSpan="7"><EmptyState title="No teachers found" message="No teachers are registered for this school." /></td></tr>}
          </tbody></table></div></div>
          <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add teacher" size="md">
            <form onSubmit={createUser}>
              <div className="form-group"><label className="form-label">Full name *</label><input className="form-input" required value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Initial password *</label><input className="form-input" type="password" minLength={8} required value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Assigned classes</label><div style={{ display: 'grid', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                {classes.map(item => <label key={item._id} className="flex items-center gap-2"><input type="checkbox" checked={form.classes.includes(item._id)} onChange={() => setForm(current => ({ ...current, classes: current.classes.includes(item._id) ? current.classes.filter(id => id !== item._id) : [...current.classes, item._id] }))} />{item.name}</label>)}
              </div></div>
              <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}><button className="btn btn-ghost" type="button" onClick={() => setCreateOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create teacher'}</button></div>
            </form>
          </Modal>
        </>
      )}

      {pageKind === 'interventions' && (
        <>
          <PageHeading title="School Interventions" subtitle="Learning alerts and student doubts requiring follow-up" />
          <ErrorMessage message={error} />
          <div className="stats-grid mb-6"><StatCard label="Open alerts" value={interventions?.counts?.alerts ?? '—'} icon="🔔" color="var(--primary)" /><StatCard label="Unanswered doubts" value={interventions?.counts?.openDoubts ?? '—'} icon="💬" color="var(--accent-dark)" /></div>
          <div className="grid-2 gap-4">
            <div className="card"><SectionHeader title="Learning alerts" />
              {interventions?.alerts?.length ? interventions.alerts.map(item => <div key={item._id} style={{ borderBottom: '1px solid var(--gray-100)', padding: '12px 0' }}><div className="flex justify-between" style={{ gap: 8 }}><strong>{item.title}</strong><span className={`badge ${item.priority === 'high' ? 'badge-danger' : 'badge-warning'}`}>{item.priority}</span></div><p>{item.message}</p><div className="text-muted">{item.student?.name || 'Student'} · {item.class?.name || 'Class'} · teacher: {item.teacher?.name || '—'}</div>{item.student?._id && <Link to={`/principal/students/${item.student._id}`}>View student</Link>}</div>) : <EmptyState title="No active alerts" />}
            </div>
            <div className="card"><SectionHeader title="Unanswered student doubts" />
              {interventions?.openDoubts?.length ? interventions.openDoubts.map(item => <div key={item._id} style={{ borderBottom: '1px solid var(--gray-100)', padding: '12px 0' }}><strong>{item.text}</strong><div className="text-muted">{item.student?.name || 'Student'} · {item.class?.name || 'Class'} · assigned teacher: {item.teacher?.name || 'Unassigned'}</div>{item.student?._id && <Link to={`/principal/students/${item.student._id}`}>View student progress</Link>}</div>) : <EmptyState title="No unanswered doubts" />}
            </div>
          </div>
        </>
      )}

      {pageKind === 'reports' && (
        <>
          <PageHeading title="School Reports" subtitle={`Learning summary for the last 30 days · ${dashboard?.school?.name || user?.school?.name || ''}`} />
          <ErrorMessage message={error} />
          <div className="card mb-6">
            <SectionHeader title="School learning snapshot" subtitle="Completed quiz activity; average score is per attempt" />
            <div className="stats-grid">
              {metricCards.map(card => <StatCard key={card.label} {...card} />)}
            </div>
            <button className="btn btn-primary mt-4" onClick={() => downloadCsv('school-learning-summary.csv', [
              ['School', 'District', 'State', 'Active students', 'Active teachers', 'Active classes', 'Participating students (30d)', 'Completed attempts (30d)', 'Average attempt score (30d)'],
              [dashboard?.school?.name, dashboard?.school?.district, dashboard?.school?.state, dashboard?.summary?.activeStudents, dashboard?.summary?.activeTeachers, dashboard?.summary?.activeClasses, dashboard?.summary?.participatingStudents, dashboard?.summary?.completedAttempts, dashboard?.summary?.averageAttemptScore],
            ])}>Download school summary CSV</button>
          </div>
          <div className="card">
            <SectionHeader title="Class report" subtitle="Download the school-scoped class performance summary" />
            <button className="btn btn-outline mb-4" onClick={() => downloadCsv('class-learning-summary.csv', [
              ['Class', 'Grade', 'Section', 'Class teacher', 'Students', 'Participating students', 'Completed attempts', 'Average score'],
              ...classes.map(item => [item.name, item.grade, item.section, item.classTeacher?.name, item.studentCount, item.participatingStudents, item.completedAttempts, item.averageScore]),
            ])}>Download class summary CSV</button>
            <ClassTable classes={classes} />
          </div>
        </>
      )}
    </Layout>
  );
}

function ClassTable({ classes, teachers, onAssignTeacher }) {
  return (
    <div className="table-wrapper"><table className="table"><thead><tr><th>Class</th><th>Teacher</th><th>Students</th><th>Participating</th><th>Attempts</th><th>Average score</th></tr></thead><tbody>
      {classes.map(item => <tr key={item._id}><td><Link to={`/principal/classes/${item._id}`}>{item.name}</Link></td><td>{onAssignTeacher ? <select aria-label={`Class teacher for ${item.name}`} className="form-input form-select" value={item.classTeacher?._id || ''} onChange={event => onAssignTeacher(item, event.target.value)}><option value="">Unassigned</option>{teachers.map(teacher => <option key={teacher._id} value={teacher._id}>{teacher.name}</option>)}</select> : item.classTeacher?.name || 'Not assigned'}</td><td>{item.studentCount ?? '—'}</td><td>{item.participatingStudents ?? '—'}</td><td>{item.completedAttempts ?? '—'}</td><td>{item.averageScore === null || item.averageScore === undefined ? 'No data' : `${item.averageScore}%`}</td></tr>)}
      {!classes.length && <tr><td colSpan="6"><EmptyState title="No active classes" message="Classes for your school will appear here." /></td></tr>}
    </tbody></table></div>
  );
}

function StudentTable({ students, onDownload, reportLoading, onToggleStatus, classOptions, onReassign }) {
  return (
    <div className="table-wrapper"><table className="table"><thead><tr><th>Student</th><th>Roll number</th><th>Class</th><th>Status</th><th>Streak</th><th>Points</th><th>Actions</th></tr></thead><tbody>
      {students.map(student => <tr key={student._id}><td><Link to={`/principal/students/${student._id}`}>{student.name}</Link><div className="text-muted">{student.email}</div></td><td>{student.rollNumber || '—'}</td><td>{onReassign ? <select aria-label={`Class for ${student.name}`} className="form-input form-select" value={student.class?._id || ''} onChange={event => onReassign(student, event.target.value)}><option value="">Unassigned</option>{classOptions.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select> : student.class?.name || 'Unassigned'}</td><td>{student.isActive ? 'Active' : 'Inactive'}</td><td>{student.streak || 0}</td><td>{student.totalPoints || 0}</td><td><button className="btn btn-outline btn-xs" disabled={reportLoading} onClick={() => onDownload(student._id)}>PDF report</button>{onToggleStatus && <button className="btn btn-ghost btn-xs" onClick={() => onToggleStatus(student)}>{student.isActive ? 'Deactivate' : 'Activate'}</button>}</td></tr>)}
      {!students.length && <tr><td colSpan="7"><EmptyState title="No students found" message="Try changing your search or grade filter." /></td></tr>}
    </tbody></table></div>
  );
}
