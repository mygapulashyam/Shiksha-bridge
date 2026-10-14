import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import { Alert, SectionHeader } from '../../components/common/UI';
import Icon from '../../components/common/Icon';
import api from '../../api/axios';

const IMPORT_TYPES = [
  { key: 'schools',  label: 'Schools',  icon: 'school', desc: 'name, udiseCode, district, state, type…' },
  { key: 'classes',  label: 'Classes',  icon: 'class', desc: 'name, grade, section, schoolName…' },
  { key: 'subjects', label: 'Subjects', icon: 'book', desc: 'name, code, grade, icon, color…' },
  { key: 'concepts', label: 'Concepts', icon: 'bulb', desc: 'name, nameHindi, subjectName, grade, chapter…' },
  { key: 'teachers', label: 'Teachers', icon: 'academic', desc: 'name, email, password, schoolName…' },
  { key: 'students', label: 'Students', icon: 'users', desc: 'name, email, password, className, rollNumber…' },
];

export default function AdminImport() {
  const [activeType, setActiveType] = useState('schools');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const downloadTemplate = async (type) => {
    try {
      const res = await api.get(`/features/import/${type}/template`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `shiksha_${type}_template.csv`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
    } catch { setError('Failed to download template'); }
  };

  const handleUpload = async () => {
    if (!file) { setError('Please select a CSV file'); return; }
    setUploading(true); setError(''); setResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post(`/features/import/${activeType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const active = IMPORT_TYPES.find(t => t.key === activeType);

  return (
    <Layout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2">
          <Icon name="import" size={26} color="var(--primary)" />
          <span>CSV Bulk Import</span>
        </h1>
        <p className="page-subtitle">Import schools, teachers, students, classes, subjects, and concepts in bulk</p>
      </div>

      {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}

      <div className="grid-2 gap-4">
        {/* Type selector */}
        <div className="card">
          <SectionHeader title="Select Import Type" subtitle="Choose what to import" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {IMPORT_TYPES.map(t => (
              <div key={t.key}
                onClick={() => { setActiveType(t.key); setFile(null); setResult(null); setError(''); }}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  border: `2px solid ${activeType === t.key ? 'var(--primary)' : 'var(--gray-200)'}`,
                  background: activeType === t.key ? 'var(--primary-light)' : 'var(--gray-50)',
                  display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.15s',
                }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: activeType === t.key ? 'var(--white)' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon name={t.icon} size={18} color="var(--primary)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: activeType === t.key ? 'var(--primary-dark)' : 'var(--gray-900)' }}>{t.label}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upload panel */}
        <div className="card">
          <SectionHeader title={`Import ${active?.label}`} subtitle={`Upload a CSV file with ${active?.label.toLowerCase()} data`} />

          {/* Step 1: Download template */}
          <div style={{ padding: '14px 16px', background: 'var(--secondary-light)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--secondary-dark)', marginBottom: 6 }}>
              Step 1: Download Template
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--secondary-dark)', marginBottom: 10 }}>
              Download the CSV template, fill in your data, and upload below.
            </p>
            <button className="btn btn-secondary btn-sm" onClick={() => downloadTemplate(activeType)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="download" size={14} color="white" />
              <span>Download {active?.label} Template</span>
            </button>
          </div>

          {/* Step 2: Upload */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gray-700)', marginBottom: 10 }}>
              Step 2: Upload CSV
            </div>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '28px', border: '2px dashed var(--gray-300)', borderRadius: 12,
              cursor: 'pointer', background: file ? 'var(--secondary-light)' : 'var(--gray-50)',
              transition: 'all 0.15s', gap: 8,
            }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--white)', border: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={file ? 'check' : 'import'} size={22} color={file ? 'var(--secondary)' : 'var(--primary)'} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-700)' }}>
                {file ? file.name : 'Click or drag & drop CSV file'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>CSV files only · Max 5MB</span>
              <input type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
            </label>
          </div>

          <button className="btn btn-primary btn-full" onClick={handleUpload} disabled={uploading || !file}>
            {uploading
              ? <span className="flex items-center gap-2"><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Importing…</span>
              : `Import ${active?.label}`}
          </button>

          {/* Results */}
          {result && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1, padding: '10px 14px', background: 'var(--secondary-light)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--secondary)' }}>{result.created}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--secondary-dark)' }}>Created</div>
                </div>
                <div style={{ flex: 1, padding: '10px 14px', background: 'var(--gray-100)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--gray-600)' }}>{result.skipped}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)' }}>Skipped</div>
                </div>
                {result.errors?.length > 0 && (
                  <div style={{ flex: 1, padding: '10px 14px', background: '#FFEBEB', borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.5rem', color: 'var(--danger)' }}>{result.errors.length}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--danger)' }}>Errors</div>
                  </div>
                )}
              </div>
              {result.errors?.length > 0 && (
                <div style={{ padding: 10, background: '#FFEBEB', borderRadius: 8, maxHeight: 150, overflowY: 'auto' }}>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--danger)', marginBottom: 3 }}>• {e}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSV format guide */}
      <div className="card" style={{ marginTop: 24 }}>
        <SectionHeader title="CSV Format Guide" subtitle="Column requirements for each import type" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {IMPORT_TYPES.map(t => (
            <div key={t.key} style={{ padding: '12px 14px', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--gray-200)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name={t.icon} size={14} color="var(--primary)" />
                <span>{t.label}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', fontFamily: 'monospace' }}>{t.desc}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-500)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="bulb" size={14} color="var(--accent-dark)" />
          <span>Download the template for each type to see the exact column names and example data. Duplicate rows (same name + key field) are automatically skipped.</span>
        </p>
      </div>
    </Layout>
  );
}
