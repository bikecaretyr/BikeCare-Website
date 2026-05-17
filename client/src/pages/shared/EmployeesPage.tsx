import { useState } from 'react'
import { branches as branchesApi, users as usersApi } from '../../api/client'
import { Spinner, StatusBadge, Table, Tr, Td, Modal, FormGrid, Field, FormActions, toast } from '../../components/ui'
import { useConfirm } from '../../hooks/useConfirm'
import { useData } from '../../hooks/useData'
import { useForm } from '../../hooks/useForm'
import type { Branch, Employee } from '../../types'

type RoleOption = { value: string; label: string }

type EmployeeForm = {
  name: string
  email: string
  phone: string
  role: string
  branch?: string
  password: string
}

interface EmployeesPageProps {
  title: string
  basePath: string
  showBranch: boolean
  roleOptions: RoleOption[]
}

export function EmployeesPage({ title, basePath, showBranch, roleOptions }: EmployeesPageProps) {
  const [roleFilter, setRoleFilter] = useState('')
  const [modal, setModal] = useState<Employee | 'new' | null>(null)
  const [resetId, setResetId] = useState<string | null>(null)
  const [newPass, setNewPass] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  const { data: users, loading: usersLoading, reload: reloadUsers } = useData(async () => {
    const params: Record<string, string> = {}
    if (roleFilter) params.role = roleFilter
    const d = await usersApi.list(params)
    return d.users
  }, [roleFilter])

  const { data: branches, loading: branchesLoading } = useData(async () => {
    if (!showBranch) return [] as Branch[]
    const d = await branchesApi.list()
    return d.branches
  }, [showBranch])

  const { form, setForm, set, reset, saving, setSaving } = useForm<EmployeeForm>({
    name: '',
    email: '',
    phone: '',
    role: 'employee',
    branch: '',
    password: '',
  })

  const { confirm, ConfirmDialog } = useConfirm()

  const branchList = branches ?? []
  const userList = users ?? []

  const openEdit = (user: Employee) => {
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      branch: typeof user.branch === 'object' && user.branch ? (user.branch as Branch)._id : typeof user.branch === 'string' ? user.branch : '',
      password: '',
    })
    setModal(user)
  }

  const clearForm = () => {
    reset()
    setModal(null)
  }

  const save = async () => {
    if (!form.name || !form.email) {
      toast('Name and email required', 'error')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
      }
      if (showBranch) body.branch = form.branch || null
      if (modal === 'new') {
        if (!form.password || form.password.length < 8) {
          toast('Password min 8 chars', 'error')
          setSaving(false)
          return
        }
        body.password = form.password
        await usersApi.create(body)
        toast('Employee created', 'success')
      } else {
        await usersApi.update((modal as Employee)._id, body)
        toast('Updated', 'success')
      }
      clearForm()
      await reloadUsers()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const confirmRemove = async (user: Employee) => {
    const confirmed = await confirm({
      title: `Remove ${user.name}?`,
      message: `This will permanently remove ${user.name} from the system. This action cannot be undone.`,
      danger: true,
    })
    if (!confirmed) return
    setSaving(true)
    try {
      await usersApi.remove(user._id)
      toast('User removed', 'success')
      await reloadUsers()
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const resetPassword = async () => {
    if (!resetId) return
    if (newPass.length < 8) {
      toast('Password must be at least 8 characters', 'error')
      return
    }
    setSaving(true)
    try {
      await usersApi.resetPassword(resetId, newPass)
      toast('Password reset', 'success')
      setResetId(null)
      setNewPass('')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">{title}</h1>
        <button
          className="btn-primary"
          onClick={() => {
            setForm({ name: '', email: '', phone: '', role: 'employee', branch: '', password: '' })
            setModal('new')
          }}
        >
          + Add Employee
        </button>
      </div>

      {roleOptions.length > 1 && (
        <select className="input w-auto text-xs" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {roleOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      )}

      <div className="card">
        {usersLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <Table headers={['Name', 'Email', 'Role', ...(showBranch ? ['Branch'] : []), 'Status', 'Actions']} empty={userList.length === 0}>
            {userList.map(user => (
              <Tr key={user._id}>
                <Td className="font-semibold text-sm">{user.name}</Td>
                <Td className="text-sm text-gray-400">{user.email}</Td>
                <Td><StatusBadge status={user.role} /></Td>
                {showBranch && <Td className="text-xs text-gray-400">{typeof user.branch === 'object' && user.branch ? (user.branch as Branch).name : 'All Branches'}</Td>}
                <Td><StatusBadge status={user.isActive ? 'Active' : 'Inactive'} /></Td>
                <Td>
                  <div className="flex gap-1.5 flex-wrap">
                    <button className="btn-outline px-2 py-1 text-xs" onClick={() => openEdit(user)}>Edit</button>
                    <button className="btn-outline px-2 py-1 text-xs" onClick={() => { setResetId(user._id); setNewPass('') }}>Reset PW</button>
                    {user.isActive ? (
                      <button className="btn-danger px-2 py-1 text-xs" onClick={async () => {
                        setSaving(true)
                        try {
                          await usersApi.deactivate(user._id)
                          toast('User deactivated', 'success')
                          await reloadUsers()
                        } catch (err: unknown) {
                          toast(err instanceof Error ? err.message : 'Failed', 'error')
                        } finally {
                          setSaving(false)
                        }
                      }}>
                        Deactivate
                      </button>
                    ) : (
                      <button className="btn-success px-2 py-1 text-xs" onClick={async () => {
                        setSaving(true)
                        try {
                          await usersApi.activate(user._id)
                          toast('User activated', 'success')
                          await reloadUsers()
                        } catch (err: unknown) {
                          toast(err instanceof Error ? err.message : 'Failed', 'error')
                        } finally {
                          setSaving(false)
                        }
                      }}>
                        Activate
                      </button>
                    )}
                    <button className="btn-danger px-2 py-1 text-xs" onClick={() => confirmRemove(user)}>Remove</button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'new' ? 'Add Employee' : 'Edit Employee'}>
        <FormGrid>
          <Field label="Full Name" required>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Email" required>
            <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="input" maxLength={10} value={form.phone} onChange={e => set('phone', e.target.value)} />
          </Field>
          <Field label="Role">
            <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          {showBranch && (
            <Field label="Branch">
              <select className="input" value={form.branch ?? ''} onChange={e => set('branch', e.target.value)}>
                <option value="">{form.role === 'manager' ? 'Select Branch *' : 'None (All Branches)'}</option>
                {branchList.map(branch => (
                  <option key={branch._id} value={branch._id}>{branch.name}</option>
                ))}
              </select>
            </Field>
          )}
          {modal === 'new' && (
            <Field label="Password" required>
              <input className="input" type="password" placeholder="Min 8 chars" value={form.password} onChange={e => set('password', e.target.value)} />
            </Field>
          )}
        </FormGrid>
        <FormActions>
          <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner size="sm" /> : '💾 Save'}</button>
        </FormActions>
      </Modal>

      <Modal open={!!resetId} onClose={() => setResetId(null)} title="Reset Password">
        <Field label="New Password">
          <div className="relative">
            <input className="input pr-16" type={showResetPassword ? 'text' : 'password'} placeholder="Min 8 chars" value={newPass} onChange={e => setNewPass(e.target.value)} />
            <button type="button" className="absolute inset-y-0 right-2 flex items-center px-2 text-xs font-semibold text-gray-400 hover:text-gray-100"
              onClick={() => setShowResetPassword(prev => !prev)}>
              {showResetPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </Field>
        <FormActions>
          <button className="btn-outline" onClick={() => setResetId(null)}>Cancel</button>
          <button className="btn-danger" onClick={resetPassword} disabled={saving}>{saving ? <Spinner size="sm" /> : 'Reset'}</button>
        </FormActions>
      </Modal>

      {ConfirmDialog}
    </div>
  )
}
