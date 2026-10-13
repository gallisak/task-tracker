import { useState } from 'react'
import { toast } from 'sonner'
import { ErrorState, LoadingState } from '@/components/page-states'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/user-avatar'
import { useSession } from '@/features/auth/session-store'
import { getErrorMessage } from '@/lib/api-client'
import { formatDateTime } from '../format'
import type { Comment } from '../types'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '../use-task-details'
import { CommentForm } from './comment-form'

interface CommentItemProps {
  comment: Comment
  isOwn: boolean
}

function CommentItem({ comment, isOwn }: CommentItemProps) {
  const [mode, setMode] = useState<'view' | 'edit' | 'delete'>('view')
  const updateComment = useUpdateComment(comment.taskId)
  const deleteComment = useDeleteComment(comment.taskId)
  const isEdited = comment.updatedAt !== comment.createdAt

  const onDelete = () => {
    deleteComment.mutate(comment.id, {
      onSuccess: () => toast.success('Comment deleted'),
      onError: (error) => toast.error(getErrorMessage(error)),
    })
  }

  return (
    <li className="flex gap-3">
      <UserAvatar name={comment.author.name} className="size-7 text-xs" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm">
          <span className="font-medium">{comment.author.name}</span>{' '}
          <span className="text-xs text-muted-foreground">
            {formatDateTime(comment.createdAt)}
            {isEdited && ' (edited)'}
          </span>
        </p>
        {mode === 'edit' ? (
          <CommentForm
            label="Edit comment"
            defaultBody={comment.body}
            submitLabel={updateComment.isPending ? 'Saving…' : 'Save'}
            isPending={updateComment.isPending}
            error={updateComment.error}
            onCancel={() => {
              updateComment.reset()
              setMode('view')
            }}
            onSubmit={(body) =>
              updateComment.mutate(
                { commentId: comment.id, body },
                { onSuccess: () => setMode('view') },
              )
            }
          />
        ) : (
          <p className="text-sm break-words whitespace-pre-wrap">
            {comment.body}
          </p>
        )}
        {isOwn && mode === 'view' && (
          <div className="flex gap-1">
            <Button variant="ghost" size="xs" onClick={() => setMode('edit')}>
              Edit
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setMode('delete')}>
              Delete
            </Button>
          </div>
        )}
        {mode === 'delete' && (
          <div className="flex gap-1">
            <Button
              variant="destructive"
              size="xs"
              disabled={deleteComment.isPending}
              onClick={onDelete}
            >
              {deleteComment.isPending ? 'Deleting…' : 'Confirm delete'}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              disabled={deleteComment.isPending}
              onClick={() => setMode('view')}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </li>
  )
}

function CommentList({ taskId }: { taskId: string }) {
  const { user } = useSession()
  const comments = useComments(taskId)

  if (comments.isPending) {
    return <LoadingState label="Loading comments…" />
  }

  if (comments.isError) {
    return (
      <ErrorState
        title="Could not load comments"
        message={getErrorMessage(comments.error)}
        onAction={() => void comments.refetch()}
      />
    )
  }

  if (comments.data.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No comments yet
      </p>
    )
  }

  return (
    <ul className="space-y-4">
      {comments.data.map((comment) => (
        <CommentItem
          key={comment.id}
          comment={comment}
          isOwn={comment.author.id === user?.id}
        />
      ))}
    </ul>
  )
}

export function TaskComments({ taskId }: { taskId: string }) {
  const createComment = useCreateComment(taskId)

  return (
    <div className="space-y-4">
      <CommentList taskId={taskId} />
      <CommentForm
        label="Add a comment"
        submitLabel={createComment.isPending ? 'Posting…' : 'Add comment'}
        isPending={createComment.isPending}
        error={createComment.error}
        onSubmit={(body, reset) =>
          createComment.mutate(body, { onSuccess: () => reset() })
        }
      />
    </div>
  )
}
