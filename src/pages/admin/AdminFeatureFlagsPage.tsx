import { useState } from 'react'
import { toast } from 'sonner'
import {
  useAdminFeatureFlags,
  useCreateFeatureFlag,
  useDeleteFeatureFlag,
  useToggleFeatureFlagDefault,
} from '@/features/admin/useFeatureFlags'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function AdminFeatureFlagsPage() {
  const { data: flags = [] } = useAdminFeatureFlags()
  const createFlag = useCreateFeatureFlag()
  const toggleDefault = useToggleFeatureFlagDefault()
  const deleteFlag = useDeleteFeatureFlag()
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')

  const onCreate = async () => {
    if (!key.trim()) return
    try {
      await createFlag.mutateAsync({ key: key.trim(), description, isEnabledDefault: false })
      setKey('')
      setDescription('')
      toast.success('Feature flag created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create feature flag')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-white">Feature flags</h1>

      <Card className="border-slate-800 bg-slate-900 text-slate-100">
        <CardHeader>
          <CardTitle className="text-base text-white">New flag</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flag-key">Key</Label>
            <Input
              id="flag-key"
              placeholder="e.g. beverage_pour_costing"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="flag-description">Description</Label>
            <Input
              id="flag-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border-slate-800 bg-slate-950 text-slate-100"
            />
          </div>
          <Button onClick={onCreate} disabled={createFlag.isPending} className="self-start">
            Create flag
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2">
        {flags.map((flag) => (
          <Card key={flag.id} className="border-slate-800 bg-slate-900 text-slate-100">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-white">{flag.key}</span>
                  <Badge variant={flag.is_enabled_default ? 'default' : 'secondary'}>
                    {flag.is_enabled_default ? 'On by default' : 'Off by default'}
                  </Badge>
                </div>
                <p className="text-sm text-slate-400">{flag.description}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    toggleDefault.mutate({
                      id: flag.id,
                      isEnabledDefault: !flag.is_enabled_default,
                    })
                  }
                >
                  Toggle default
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteFlag.mutate(flag.id)}>
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
