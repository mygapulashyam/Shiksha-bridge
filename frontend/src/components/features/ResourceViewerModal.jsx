import React from 'react';
import { Modal } from '../common/UI';
import Icon from '../common/Icon';

/**
 * Converts standard YouTube / Vimeo / Drive URLs to embeddable player URLs
 */
export function getEmbedUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // YouTube youtu.be/<id>
  const shortYt = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
  if (shortYt && shortYt[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortYt[1]}?autoplay=1&rel=0`;
  }

  // YouTube youtube.com/watch?v=<id>
  const standardYt = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/i);
  if (standardYt && standardYt[1]) {
    return `https://www.youtube-nocookie.com/embed/${standardYt[1]}?autoplay=1&rel=0`;
  }

  // YouTube /embed/<id>
  const embedYt = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i);
  if (embedYt && embedYt[1]) {
    return `https://www.youtube-nocookie.com/embed/${embedYt[1]}?autoplay=1&rel=0`;
  }

  // Vimeo vimeo.com/<id>
  const vimeo = trimmed.match(/vimeo\.com\/([0-9]+)/i);
  if (vimeo && vimeo[1]) {
    return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  }

  // Google Drive preview / view
  if (trimmed.includes('drive.google.com')) {
    return trimmed.replace(/\/view(\?.*)?$/i, '/preview').replace(/\/edit(\?.*)?$/i, '/preview');
  }

  return trimmed;
}

export function isDirectMedia(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
}

export function isPdf(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.pdf(\?.*)?$/i.test(url) || url.includes('/pdf');
}

/**
 * In-App Resource Viewer Modal
 * Supports: Embedded Videos (YouTube/Vimeo/mp4), Embedded PDFs, Markdown/Rich Notes, Step Solutions
 */
export default function ResourceViewerModal({ open, onClose, resource }) {
  if (!open || !resource) return null;

  const isVideo = resource.type === 'video' || !!resource.videoUrl;
  const embedUrl = resource.videoUrl ? getEmbedUrl(resource.videoUrl) : null;
  const isDirectVideo = resource.videoUrl ? isDirectMedia(resource.videoUrl) : false;
  const isFilePdf = resource.fileUrl ? isPdf(resource.fileUrl) : false;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={resource.title || 'Resource Viewer'}
      size="xl"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Resource Meta Subheader */}
        <div className="flex gap-2 flex-wrap items-center" style={{ fontSize: '0.8rem', color: 'var(--gray-600)', borderBottom: '1px solid var(--gray-150)', paddingBottom: 12 }}>
          {resource.type && (
            <span className="badge badge-primary" style={{ textTransform: 'uppercase' }}>
              {resource.type.replace('_', ' ')}
            </span>
          )}
          {resource.subject?.name && (
            <span style={{ background: 'var(--gray-100)', padding: '3px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon name="book" size={13} color="var(--primary)" />
              {resource.subject.name}
            </span>
          )}
          {resource.grade && (
            <span style={{ background: 'var(--gray-100)', padding: '3px 10px', borderRadius: 6 }}>
              Class {resource.grade}
            </span>
          )}
          {resource.difficulty && (
            <span style={{ background: 'var(--gray-100)', padding: '3px 10px', borderRadius: 6, textTransform: 'capitalize' }}>
              {resource.difficulty}
            </span>
          )}
          {resource.duration && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--gray-500)' }}>
              <Icon name="clock" size={13} color="var(--gray-400)" />
              {resource.duration} mins
            </span>
          )}
        </div>

        {/* Video Player In-App */}
        {isVideo && resource.videoUrl && (
          <div style={{
            position: 'relative',
            width: '100%',
            paddingTop: '56.25%', // 16:9 Aspect Ratio
            background: '#0a0a0c',
            borderRadius: 12,
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          }}>
            {isDirectVideo ? (
              <video
                src={resource.videoUrl}
                controls
                autoPlay
                playsInline
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <iframe
                src={embedUrl}
                title={resource.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 0,
                }}
              />
            )}
          </div>
        )}

        {/* PDF Viewer In-App */}
        {resource.fileUrl && (
          <div style={{
            width: '100%',
            height: '600px',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1.5px solid var(--gray-200)',
            background: 'var(--gray-50)',
          }}>
            <iframe
              src={resource.fileUrl}
              title={resource.title}
              width="100%"
              height="100%"
              style={{ border: 0 }}
            />
          </div>
        )}

        {/* Hindi Title Translation */}
        {resource.titleHindi && (
          <div style={{ background: 'var(--primary-light)', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-dark)', display: 'block', textTransform: 'uppercase' }}>Hindi Title</span>
            <p style={{ fontSize: '0.95rem', color: 'var(--gray-900)', fontFamily: 'var(--font-devanagari)', marginTop: 2 }}>
              {resource.titleHindi}
            </p>
          </div>
        )}

        {/* Written Notes / Markdown Content / Step Solution */}
        {resource.content && (
          <div style={{
            background: 'var(--gray-50)',
            padding: '16px 20px',
            borderRadius: 12,
            border: '1px solid var(--gray-200)',
            fontSize: '0.92rem',
            lineHeight: 1.7,
            color: 'var(--gray-800)',
            whiteSpace: 'pre-wrap',
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {resource.content}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--gray-150)' }}>
          <button className="btn btn-primary" onClick={onClose}>
            Close Viewer
          </button>
        </div>
      </div>
    </Modal>
  );
}
