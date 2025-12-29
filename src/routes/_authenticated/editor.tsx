import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/editor')({
  component: () => <div>Editor Placeholder</div>,
})
