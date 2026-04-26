import { useEffect, useMemo, useState } from 'react'
import { api } from '@lib/api'

type MemberRole = 'admin' | 'editor' | 'viewer'

interface GroupSummary {
  id: string
  name: string
  description?: string | null
  owner_id: string
  invite_code: string
  invite_link: string
  max_members: number
  created_at: string
}

interface GroupListItem {
  role: MemberRole
  status: string
  joined_at?: string
  groups: GroupSummary
}

interface GroupProfile {
  id: string
  full_name: string
  avatar_url?: string | null
  email: string
}

interface GroupMemberItem {
  id: string
  group_id: string
  user_id: string
  role: MemberRole
  status: string
  joined_at?: string
  profiles?: GroupProfile
}

interface GroupDetail extends GroupSummary {
  members: GroupMemberItem[]
  my_role: MemberRole
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupListItem[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<GroupDetail | null>(null)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDescription, setNewGroupDescription] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadGroups()
  }, [])

  useEffect(() => {
    if (selectedGroupId) {
      void loadGroupDetail(selectedGroupId)
    }
  }, [selectedGroupId])

  const activeMembers = useMemo(() => selectedGroup?.members || [], [selectedGroup])

  const loadGroups = async () => {
    setIsLoadingList(true)
    setError(null)
    try {
      const { data } = await api.get<{ data: GroupListItem[] }>('/groups')
      setGroups(data.data || [])

      if (!selectedGroupId && data.data?.[0]?.groups?.id) {
        setSelectedGroupId(data.data[0].groups.id)
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar grup.')
    } finally {
      setIsLoadingList(false)
    }
  }

  const loadGroupDetail = async (groupId: string) => {
    setIsLoadingDetail(true)
    setError(null)
    try {
      const { data } = await api.get<{ data: GroupDetail }>(`/groups/${groupId}`)
      setSelectedGroup(data.data)
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail grup.')
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleCreateGroup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newGroupName.trim()) return

    setIsCreating(true)
    setError(null)
    setMessage(null)

    try {
      const { data } = await api.post<{ data: GroupSummary }>('/groups', {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      })

      setNewGroupName('')
      setNewGroupDescription('')
      setMessage(`Grup "${data.data.name}" berhasil dibuat.`)
      await loadGroups()
      setSelectedGroupId(data.data.id)
    } catch (err: any) {
      setError(err.message || 'Gagal membuat grup.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinGroup = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!joinCode.trim()) return

    setIsJoining(true)
    setError(null)
    setMessage(null)

    try {
      const { data } = await api.post<{ group: GroupSummary; message: string }>('/groups/join', {
        invite_code: joinCode.trim().toUpperCase(),
      })
      setJoinCode('')
      setMessage(data.message)
      await loadGroups()
      setSelectedGroupId(data.group.id)
    } catch (err: any) {
      setError(err.message || 'Gagal bergabung ke grup.')
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return
    if (!window.confirm(`Keluar dari grup "${selectedGroup.name}"?`)) return

    setError(null)
    setMessage(null)

    try {
      const { data } = await api.delete<{ message: string }>(`/groups/${selectedGroup.id}/leave`)
      setMessage(data.message)
      setSelectedGroup(null)
      setSelectedGroupId('')
      await loadGroups()
    } catch (err: any) {
      setError(err.message || 'Gagal keluar dari grup.')
    }
  }

  const handleRoleChange = async (memberUserId: string, role: MemberRole) => {
    if (!selectedGroup) return

    setError(null)
    setMessage(null)

    try {
      await api.patch(`/groups/${selectedGroup.id}/members/${memberUserId}`, { role })
      setMessage('Peran anggota berhasil diperbarui.')
      await loadGroupDetail(selectedGroup.id)
    } catch (err: any) {
      setError(err.message || 'Gagal mengubah peran anggota.')
    }
  }

  const handleRemoveMember = async (memberUserId: string, fullName: string) => {
    if (!selectedGroup) return
    if (!window.confirm(`Keluarkan ${fullName} dari grup?`)) return

    setError(null)
    setMessage(null)

    try {
      const { data } = await api.delete<{ message: string }>(
        `/groups/${selectedGroup.id}/members/${memberUserId}`
      )
      setMessage(data.message)
      await loadGroupDetail(selectedGroup.id)
    } catch (err: any) {
      setError(err.message || 'Gagal mengeluarkan anggota.')
    }
  }

  const isAdmin = selectedGroup?.my_role === 'admin'

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          background: 'linear-gradient(135deg, #1E40AF, #2563EB 50%, #3B82F6)',
          borderRadius: '16px',
          padding: '20px',
          color: '#fff',
        }}
      >
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
          Fitur premium
        </p>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
          Grup Keuangan Bersama
        </h2>
        <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(255,255,255,0.86)', maxWidth: '760px' }}>
          Sekarang halaman grup sudah tersambung ke backend: kamu bisa membuat grup, join pakai kode undangan, melihat anggota aktif, dan melakukan manajemen role dasar sesuai wireframe dan PRD.
        </p>
      </div>

      {error ? <StatusBox tone="danger" message={error} /> : null}
      {message ? <StatusBox tone="success" message={message} /> : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 0.9fr) minmax(0, 1.3fr)',
          gap: '16px',
        }}
      >
        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Grup Saya
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Daftar grup aktif yang kamu ikuti.
            </p>
          </div>

          {isLoadingList ? (
            <EmptyBox message="Memuat daftar grup..." />
          ) : groups.length === 0 ? (
            <EmptyBox message="Kamu belum punya grup aktif. Buat grup baru atau gabung pakai kode undangan." />
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {groups.map((item) => {
                const active = item.groups.id === selectedGroupId

                return (
                  <button
                    key={item.groups.id}
                    type="button"
                    onClick={() => setSelectedGroupId(item.groups.id)}
                    className="card"
                    style={{
                      padding: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      border: active ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: active ? 'var(--accent-light)' : 'var(--bg-card)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '6px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {item.groups.name}
                      </div>
                      <span className={`badge ${roleBadgeClass(item.role)}`}>
                        {item.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      {item.groups.description || 'Belum ada deskripsi grup.'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <section className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Buat Grup Baru
            </h4>
            <form onSubmit={handleCreateGroup} style={{ display: 'grid', gap: '10px' }}>
              <input
                className="form-input"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="Contoh: Keluarga Budiarto"
              />
              <textarea
                className="form-input"
                rows={3}
                value={newGroupDescription}
                onChange={(event) => setNewGroupDescription(event.target.value)}
                placeholder="Deskripsi singkat grup"
                style={{ resize: 'vertical' }}
              />
              <button className="btn btn-primary" disabled={isCreating || !newGroupName.trim()}>
                {isCreating ? 'Membuat...' : 'Buat grup'}
              </button>
            </form>
          </section>

          <section className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Gabung via Kode
            </h4>
            <form onSubmit={handleJoinGroup} style={{ display: 'grid', gap: '10px' }}>
              <input
                className="form-input"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Contoh: GRP8X2K"
              />
              <button className="btn btn-secondary" disabled={isJoining || !joinCode.trim()}>
                {isJoining ? 'Bergabung...' : 'Gabung grup'}
              </button>
            </form>
          </section>
        </section>

        <section className="card" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!selectedGroupId ? (
            <EmptyBox message="Pilih salah satu grup di panel kiri untuk melihat detail." />
          ) : isLoadingDetail ? (
            <EmptyBox message="Memuat detail grup..." />
          ) : !selectedGroup ? (
            <EmptyBox message="Detail grup belum tersedia." />
          ) : (
            <>
              <div
                style={{
                  background: 'linear-gradient(135deg, #1E40AF, #2563EB)',
                  borderRadius: '14px',
                  padding: '18px',
                  color: '#fff',
                }}
              >
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.72)', marginBottom: '4px' }}>
                  Pengeluaran grup aktif
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>
                  {selectedGroup.name}
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.86)', lineHeight: 1.7, marginBottom: '14px' }}>
                  {selectedGroup.description || 'Belum ada deskripsi grup.'}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '10px',
                  }}
                >
                  <HeroStat label="Anggota aktif" value={String(activeMembers.length)} />
                  <HeroStat label="Kapasitas" value={`${activeMembers.length}/${selectedGroup.max_members}`} />
                  <HeroStat label="Peran saya" value={selectedGroup.my_role} />
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 0.9fr)',
                  gap: '16px',
                }}
              >
                <section className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Anggota
                    </h4>
                    <span className="badge badge-info">{activeMembers.length} aktif</span>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    {activeMembers.map((member) => {
                      const fullName = member.profiles?.full_name || member.profiles?.email || 'Anggota'
                      const initials = getInitials(fullName)

                      return (
                        <div
                          key={member.id}
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            background: 'var(--bg-card)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <div
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '50%',
                                  background: 'var(--g-income)',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {fullName}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {member.profiles?.email || 'Tidak ada email'}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              {isAdmin && member.user_id !== selectedGroup.owner_id ? (
                                <select
                                  className="form-input"
                                  value={member.role}
                                  onChange={(event) =>
                                    handleRoleChange(member.user_id, event.target.value as MemberRole)
                                  }
                                  style={{ minWidth: '120px' }}
                                >
                                  <option value="admin">admin</option>
                                  <option value="editor">editor</option>
                                  <option value="viewer">viewer</option>
                                </select>
                              ) : (
                                <span className={`badge ${roleBadgeClass(member.role)}`}>{member.role}</span>
                              )}

                              {isAdmin && member.user_id !== selectedGroup.owner_id ? (
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '6px 10px', fontSize: '12px' }}
                                  onClick={() => handleRemoveMember(member.user_id, fullName)}
                                >
                                  Keluarkan
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section style={{ display: 'grid', gap: '14px' }}>
                  <div className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                      Undangan Grup
                    </h4>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <InviteBox label="Kode undangan" value={selectedGroup.invite_code} mono />
                      <InviteBox label="Link undangan" value={selectedGroup.invite_link} />
                    </div>
                  </div>

                  <div className="card" style={{ padding: '14px', background: 'var(--bg-card2)' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
                      Aksi Grup
                    </h4>
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <ActionRow
                        title="Status peran"
                        description={
                          isAdmin
                            ? 'Kamu admin. Bisa mengubah role anggota dan mengeluarkan member.'
                            : 'Kamu bukan admin. Role management dibatasi.'
                        }
                      />
                      <ActionRow
                        title="Join via kode"
                        description="Sudah aktif. Kamu juga bisa bagikan kode atau link ke anggota lain."
                      />
                      <button
                        className="btn btn-danger"
                        style={{ justifySelf: 'flex-start' }}
                        onClick={handleLeaveGroup}
                        disabled={selectedGroup.my_role === 'admin'}
                        title={
                          selectedGroup.my_role === 'admin'
                            ? 'Admin harus transfer peran dulu sebelum keluar'
                            : 'Keluar dari grup'
                        }
                      >
                        Keluar dari grup
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.12)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '10px',
        padding: '10px 12px',
      }}
    >
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 700 }}>{value}</div>
    </div>
  )
}

function InviteBox({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 14px',
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</div>
      <div
        style={{
          fontSize: mono ? '18px' : '12px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: mono ? 'ui-monospace, SFMono-Regular, Consolas, monospace' : 'inherit',
          wordBreak: 'break-all',
        }}
      >
        {value}
      </div>
    </div>
  )
}

function ActionRow({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '12px 14px',
        background: 'var(--bg-card)',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
        {title}
      </div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
        {description}
      </div>
    </div>
  )
}

function StatusBox({ tone, message }: { tone: 'danger' | 'success'; message: string }) {
  const tones = {
    danger: {
      color: 'var(--red)',
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.16)',
    },
    success: {
      color: 'var(--green)',
      background: 'rgba(16,185,129,0.08)',
      border: '1px solid rgba(16,185,129,0.16)',
    },
  } as const

  return (
    <div
      style={{
        ...tones[tone],
        borderRadius: '12px',
        padding: '10px 12px',
        fontSize: '12px',
        lineHeight: 1.7,
      }}
    >
      {message}
    </div>
  )
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border-strong)',
        borderRadius: '14px',
        padding: '28px 18px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
        lineHeight: 1.7,
      }}
    >
      {message}
    </div>
  )
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function roleBadgeClass(role: MemberRole): 'badge-info' | 'badge-ok' | 'badge-warn' {
  if (role === 'admin') return 'badge-info'
  if (role === 'editor') return 'badge-ok'
  return 'badge-warn'
}
