import { Badge } from '@/components/ui/badge'
import type { WorkspaceRole } from '../types'

export function RoleBadge({ role }: { role: WorkspaceRole }) {
  return (
    <Badge variant={role === 'OWNER' ? 'default' : 'secondary'}>
      {role === 'OWNER' ? 'Owner' : 'Member'}
    </Badge>
  )
}
