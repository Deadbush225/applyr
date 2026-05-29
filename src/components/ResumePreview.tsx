import { useEffect, useState, useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import { Document, Page, pdfjs } from "react-pdf";
import { ResumePDF } from "./ResumePDF";
import type {
  Applicant,
  JobApplication,
  Education,
  EmploymentHistory,
  ApplicantReference,
  Training,
  Certificate,
} from "../types";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type ResumeTemplateId = "classic" | "compact" | "modern";

type ResumePreviewProps = {
  applicant: Applicant;
  jobApplication: JobApplication;
  education: Education[];
  employmentHistory: EmploymentHistory[];
  references: ApplicantReference[];
  trainings: Training[];
  certificates: Certificate[];
  previewFont: string;
  resumeTemplate: ResumeTemplateId;
};

const ResumePreview = (props: ResumePreviewProps) => {
  // Ping-Pong Buffers
  const [urlA, setUrlA] = useState<string | null>(null);
  const [urlB, setUrlB] = useState<string | null>(null);
  
  const [pagesA, setPagesA] = useState<number>(1);
  const [pagesB, setPagesB] = useState<number>(1);

  // State to control CSS, Ref to control internal logic without closure traps
  const [activeBuffer, setActiveBuffer] = useState<'A' | 'B'>('A');
  const activeBufferRef = useRef<'A' | 'B'>('A');

  const [isCompiling, setIsCompiling] = useState(false);
  const generationIdRef = useRef(0);
  const lastSerializedRef = useRef<string | null>(null);

  useEffect(() => {
    // Avoid recompiling when props haven't changed (prevents transient "Syncing..." flashes)
    let snapshot: string | null = null
    try {
      snapshot = JSON.stringify({
        applicant: props.applicant,
        jobApplication: props.jobApplication,
        education: props.education,
        employmentHistory: props.employmentHistory,
        references: props.references,
        trainings: props.trainings,
        certificates: props.certificates,
        previewFont: props.previewFont,
        resumeTemplate: props.resumeTemplate,
      })
    } catch (err) {
      // Fallback: if serialization fails, force compile
      snapshot = null
    }

    if (snapshot !== null && lastSerializedRef.current === snapshot) {
      return
    }

    if (snapshot !== null) lastSerializedRef.current = snapshot

    const currentGenerationId = ++generationIdRef.current;
    setIsCompiling(true);

    const compileTimeout = setTimeout(async () => {
      try {
        const docInstance = <ResumePDF {...props} />;
        const blobBlob = await pdf(docInstance).toBlob();
        const newBlobUrl = URL.createObjectURL(blobBlob);

        if (currentGenerationId !== generationIdRef.current) {
          URL.revokeObjectURL(newBlobUrl);
          return;
        }

        // The Ping-Pong Logic: Render the update in whichever buffer is currently hidden
        if (!urlA && !urlB) {
          // First load
          setUrlA(newBlobUrl);
          activeBufferRef.current = 'A';
          setActiveBuffer('A');
        } else if (activeBufferRef.current === 'A') {
          // A is visible, render update into B
          setUrlB(newBlobUrl);
        } else {
          // B is visible, render update into A
          setUrlA(newBlobUrl);
        }
      } catch (err) {
        console.error("PDF Compilation failure:", err);
        if (currentGenerationId === generationIdRef.current) setIsCompiling(false);
      }
    }, 300);

    // Fallback: reset isCompiling if document doesn't load within 10 seconds (prevents stuck state)
    const fallbackTimeout = setTimeout(() => {
      if (currentGenerationId === generationIdRef.current) {
        console.warn('PDF compilation fallback: Document did not load, resetting isCompiling flag');
        setIsCompiling(false);
      }
    }, 10000);

    return () => {
      clearTimeout(compileTimeout);
      clearTimeout(fallbackTimeout);
    };
  }, [
    props.applicant, props.jobApplication, props.education,
    props.employmentHistory, props.references, props.trainings,
    props.certificates, props.previewFont, props.resumeTemplate
  ]);

  // When Buffer A successfully finishes drawing
  const handleLoadSuccessA = ({ numPages }: { numPages: number }) => {
    setPagesA(numPages);
    setIsCompiling(false);

    if (activeBufferRef.current === 'B') {
      // Buffer A just updated in the background. Make it the active visible layer.
      activeBufferRef.current = 'A';
      setActiveBuffer('A');
      
      // Wait for the CSS cross-fade to finish (300ms) before destroying Buffer B
      setTimeout(() => {
        setUrlB((old) => {
          if (old) URL.revokeObjectURL(old);
          return null;
        });
      }, 300);
    }
  };

  // When Buffer B successfully finishes drawing
  const handleLoadSuccessB = ({ numPages }: { numPages: number }) => {
    setPagesB(numPages);
    setIsCompiling(false);

    if (activeBufferRef.current === 'A') {
      // Buffer B just updated in the background. Make it the active visible layer.
      activeBufferRef.current = 'B';
      setActiveBuffer('B');
      
      // Wait for the CSS cross-fade to finish (300ms) before destroying Buffer A
      setTimeout(() => {
        setUrlA((old) => {
          if (old) URL.revokeObjectURL(old);
          return null;
        });
      }, 300);
    }
  };

  return (
    <div className="preview-scroll" aria-label="Resume preview document">
      <div className="canvas-pdf-container">
        
        {isCompiling && (
          <div className="pdf-sync-indicator">Syncing...</div>
        )}

        {!urlA && !urlB && (
          <div className="pdf-status-message">Generating Document...</div>
        )}

        {/* --- BUFFER A --- */}
        {urlA && (
          <div className={`pdf-layer ${activeBuffer === 'A' ? "is-active" : ""}`}>
            <Document file={urlA} onLoadSuccess={handleLoadSuccessA} loading={null}>
              {Array.from(new Array(pagesA), (_, index) => (
                <div key={`a_page_${index + 1}`} className="pdf-page-wrapper">
                  <Page pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} width={800} loading={null} />
                </div>
              ))}
            </Document>
          </div>
        )}

        {/* --- BUFFER B --- */}
        {urlB && (
          <div className={`pdf-layer ${activeBuffer === 'B' ? "is-active" : ""}`}>
            <Document file={urlB} onLoadSuccess={handleLoadSuccessB} loading={null}>
              {Array.from(new Array(pagesB), (_, index) => (
                <div key={`b_page_${index + 1}`} className="pdf-page-wrapper">
                  <Page pageNumber={index + 1} renderTextLayer={false} renderAnnotationLayer={false} width={800} loading={null} />
                </div>
              ))}
            </Document>
          </div>
        )}

      </div>
    </div>
  );
};

export default ResumePreview;