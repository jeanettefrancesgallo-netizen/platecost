import { useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useToggleAnnouncement,
} from '@/features/admin/useAnnouncements'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AdminAnnouncementsPage() {
  const { data: announcements = [] } = useAdminAnnouncements()
  const createAnnouncement = useCreateAnnouncement()
  const toggleAnnouncement = useToggleAnnouncement()
  const deleteAnnouncement = useDeleteAnnouncement()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const onCreate = async () => {
    if (!title.trim() || !body.trim()) return
    try {
      await createAnnouncement.mutateAsync({ title, body, audience: 'all', is_active: true })
      setTitle('')
      setBody('')
      toast.success('Announcement created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create announcement')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-white">Announcements</h1>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle className="text-base text-white">New announcement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ann-body">Body</Label>
            <Input
              id="ann-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <Button onClick={onCreate} disabled={createAnnouncement.isPending} className="self-start">
            Publish to all tenants
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="border-slate-800 bg-slate-900 text-slate-100">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{announcement.title}</span>
                  <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                    {announcement.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">{announcement.body}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    toggleAnnouncement.mutate({
                      id: announcement.id,
                      isActive: !announcement.is_active,
                    })
                  }
                >
                  {announcement.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteAnnouncement.mutate(announcement.id)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
