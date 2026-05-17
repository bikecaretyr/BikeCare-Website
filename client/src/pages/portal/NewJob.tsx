import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { jobs as jobsApi } from '../../api/client'
import { toast } from '../../components/ui'
import { JobForm } from '../../components/JobForm'
import { useState } from 'react'
import { JobIntakePrint } from '../../components/JobIntakePrint'

export function NewJob() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [intakeJob, setIntakeJob] = useState<any>(null)

  async function submit(formData: any) {
    const d = await jobsApi.create(formData)
    toast(`Job card ${d.job.jobNo} created!`, 'success')
    setIntakeJob(d.job)
  }

  return (
    <div className="space-y-4">
      <div className="page-title">🔧 New Job Card</div>
      <div className="card">
        <div className="card-header"><span className="card-title">Vehicle & Customer</span></div>
        <JobForm initialData={{}} onSubmit={submit} user={user} allowSpares={false} />
      </div>
      {intakeJob && (
        <JobIntakePrint
          job={intakeJob}
          onClose={() => {
            setIntakeJob(null)
            navigate('/portal/jobs')
          }}
        />
      )} 
    </div>
  )
}