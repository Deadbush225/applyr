import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import ResumePreview from './ResumePreview'
import type {
  Applicant,
  ApplicantReference,
  Education,
  EmploymentHistory,
  JobApplication,
  Training,
  Certificate,
} from '../types'

type ApplicationThumbnailProps = {
  applicant: Applicant
  jobApplication: JobApplication
  education: Education[]
  employmentHistory: EmploymentHistory[]
  references: ApplicantReference[]
  trainings: Training[]
  certificates: Certificate[]
  previewFont: string
  resumeTemplate: 'classic' | 'compact' | 'modern'
}

const ApplicationThumbnail = ({
  applicant,
  jobApplication,
  education,
  employmentHistory,
  references,
  trainings,
  certificates,
  previewFont,
  resumeTemplate,
}: ApplicationThumbnailProps) => {
  const captureRef = useRef<HTMLDivElement | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const cacheKey = useMemo(
    () =>
      `applyr:thumbnail:${jobApplication.JobApplicationId}:${jobApplication.lastUpdated}:${previewFont}:${resumeTemplate}`,
    [jobApplication.JobApplicationId, jobApplication.lastUpdated, previewFont, resumeTemplate],
  )

  useEffect(() => {
    const cached = window.localStorage.getItem(cacheKey)
    if (cached) {
      setThumbnailUrl(cached)
    } else {
      setThumbnailUrl(null)
    }
  }, [cacheKey])

  useEffect(() => {
    if (thumbnailUrl || !captureRef.current) {
      return
    }

    let canceled = false

    const capture = async () => {
      const element = captureRef.current as HTMLElement
      // Save original styles
      const originalStyle = element.getAttribute('style')
      
      // Temporarily set the element to be absolute and full size for capture
      element.style.position = 'absolute'
      element.style.top = '-9999px'
      element.style.left = '-9999px'
      element.style.width = '210mm'
      element.style.height = '297mm'
      element.style.transform = 'none'

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 0.6,
        windowWidth: 794,
        windowHeight: 1123,
      })
      
      // Restore styles just in case it's still visible
      if (originalStyle) {
        element.setAttribute('style', originalStyle)
      } else {
        element.removeAttribute('style')
      }

      if (canceled) {
        return
      }
      const dataUrl = canvas.toDataURL('image/png')
      window.localStorage.setItem(cacheKey, dataUrl)
      setThumbnailUrl(dataUrl)
    }

    const timeout = window.setTimeout(capture, 200)
    return () => {
      canceled = true
      window.clearTimeout(timeout)
    }
  }, [thumbnailUrl, cacheKey])

  return (
    <div className="thumbnail-preview">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="Resume preview" className="thumbnail-image" />
      ) : (
        <div className="thumbnail-capture" ref={captureRef}>
          <ResumePreview
            applicant={applicant}
            jobApplication={jobApplication}
            education={education}
            employmentHistory={employmentHistory}
            references={references}
            trainings={trainings}
            certificates={certificates}
            previewFont={previewFont}
            resumeTemplate={resumeTemplate}
          />
        </div>
      )}
    </div>
  )
}

export default ApplicationThumbnail
