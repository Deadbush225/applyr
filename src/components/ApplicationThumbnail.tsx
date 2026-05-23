import { useEffect, useMemo, useRef, useState } from 'react';
import ResumePreview from './ResumePreview';
import type {
  Applicant,
  ApplicantReference,
  Education,
  EmploymentHistory,
  JobApplication,
  Training,
  Certificate,
} from '../types';

type ApplicationThumbnailProps = {
  applicant: Applicant;
  jobApplication: JobApplication;
  education: Education[];
  employmentHistory: EmploymentHistory[];
  references: ApplicantReference[];
  trainings: Training[];
  certificates: Certificate[];
  previewFont: string;
  resumeTemplate: 'classic' | 'compact' | 'modern';
};

const ApplicationThumbnail = (props: ApplicationThumbnailProps) => {
  const captureRef = useRef<HTMLDivElement | null>(null);
  // 1. Initialize lazily so it grabs the cache on the very first render instantly

  
  // Create a strict hash of the content. If ANY text changes, the thumbnail updates instantly.
  const cacheKey = useMemo(() => {
    const contentStr = JSON.stringify(props);
    let hash = 0;
    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `applyr:thumb:${props.jobApplication.JobApplicationId}:${hash}`;
  }, [props]);

  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
  });

  // 2. Track the previous cache key to detect when the application data changes
  const [prevCacheKey, setPrevCacheKey] = useState(cacheKey);

  // 3. "Render-Phase Update" (The exact method recommended by the React Docs)
  // If the key changed, update the state immediately before the browser even tries to paint
  if (cacheKey !== prevCacheKey) {
    setPrevCacheKey(cacheKey);
    setThumbnailUrl(window.localStorage.getItem(cacheKey));
  }

  useEffect(() => {
    if (thumbnailUrl || !captureRef.current) return;
    
    let canceled = false;
    
    const capture = () => {
      if (canceled) return;
      const element = captureRef.current;
      if (!element) return;
      
      const canvases = element.querySelectorAll('canvas');
      let targetCanvas: HTMLCanvasElement | null = null;
      
      // FIX 1: Use a standard loop so we can 'break' after finding the FIRST page
      for (const c of Array.from(canvases)) {
         if (c.width > 100 && c.height > 100) {
           targetCanvas = c;
           break; // <-- CRUCIAL: Stops immediately at Page 1!
         }
      }

      if (targetCanvas) {
        clearInterval(checkInterval);
        
        setTimeout(() => {
          if (canceled) return;
          try {
            const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.85);
            if (dataUrl.length > 500) { 
              window.localStorage.setItem(cacheKey, dataUrl);
              setThumbnailUrl(dataUrl);
            }
          } catch (e) {
            console.warn("Canvas capture failed", e);
          }
        }, 350);
      }
    };

    // Check every 250ms if the background PDF has finished rendering
    const checkInterval = window.setInterval(capture, 250);

    return () => {
      canceled = true;
      window.clearInterval(checkInterval);
    };
  }, [thumbnailUrl, cacheKey]);

  return (
    <div className="thumbnail-preview">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="Resume preview" className="thumbnail-image" />
      ) : (
        <>
          <div className="thumbnail-skeleton">Updating...</div>
          <div className="thumbnail-capture" ref={captureRef}>
            <ResumePreview {...props} />
          </div>
        </>
      )}
    </div>
  );
};

export default ApplicationThumbnail;