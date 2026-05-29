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

  // 1. Initialize state without cache; cache lookup happens in effect
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);

  useEffect(() => {
    // Always check cache first when cacheKey changes
    const cached = typeof window !== 'undefined' ? window.localStorage.getItem(cacheKey) : null;
    if (cached) {
      setThumbnailUrl(cached);
      return;
    }

    if (!captureRef.current) return;
    
    let canceled = false;
    
    const capture = () => {
      if (canceled) return;
      const element = captureRef.current;
      if (!element) return;
      
      const canvases = element.querySelectorAll('canvas');
      let targetCanvas: HTMLCanvasElement | null = null;
      
      // Use a standard loop so we can 'break' after finding the FIRST page
      for (const c of Array.from(canvases)) {
         if (c.width > 100 && c.height > 100) {
           targetCanvas = c;
           break; 
         }
      }

      if (targetCanvas) {
        clearInterval(checkInterval);
        
        setTimeout(() => {
          if (canceled) return;
          try {
            // Lowered quality to 0.7 for significant memory savings on thumbnails
            const dataUrl = targetCanvas.toDataURL('image/jpeg', 0.7);
            
            if (dataUrl.length > 500) { 
              
              // --- 1. CACHE EVICTION: Delete old thumbnails for this specific application ---
              const prefix = `applyr:thumb:${props.jobApplication.JobApplicationId}:`;
              try {
                for (let i = 0; i < window.localStorage.length; i++) {
                  const key = window.localStorage.key(i);
                  if (key && key.startsWith(prefix) && key !== cacheKey) {
                    window.localStorage.removeItem(key);
                  }
                }
                // Save the new thumbnail
                window.localStorage.setItem(cacheKey, dataUrl);
              } catch (storageError) {
                
                console.warn("Storage quota hit. Running emergency purge...");
                
                // --- 2. EMERGENCY PURGE: If still full, nuke ALL thumbnail caches ---
                const keysToRemove = [];
                for (let i = 0; i < window.localStorage.length; i++) {
                  const key = window.localStorage.key(i);
                  if (key && key.startsWith('applyr:thumb:')) {
                    keysToRemove.push(key);
                  }
                }
                keysToRemove.forEach(k => window.localStorage.removeItem(k));
                
                try {
                  // Try one last time after complete purge
                  window.localStorage.setItem(cacheKey, dataUrl);
                } catch (e) {
                  console.error("Local storage completely full. Falling back to memory-only.");
                  // It's okay if it fails here, `setThumbnailUrl` will still show it to the user in memory!
                }
              }

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
  }, [cacheKey]);

  return (
    <div className="thumbnail-preview">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="Resume preview" className="thumbnail-image" />
      ) : (
        <>
          <div className="thumbnail-skeleton">Updating...</div>
          <div className="thumbnail-capture" ref={captureRef}>
            <ResumePreview key={`thumb-${props.jobApplication.JobApplicationId}`} {...props} />
          </div>
        </>
      )}
    </div>
  );
};

export default ApplicationThumbnail;