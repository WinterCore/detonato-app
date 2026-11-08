import { useCallback, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { TaskId } from '@/core/types'
import { useBack } from '@/navigation/back'
import { useSheetEntry } from '@/navigation/sheet'
import { blankDraft, draftFrom, editorView, stepDraftLength, stepSessions, toggleDay, toTaskDraft, type EditorDraft } from '@/screens/tasks/lib/draft'
import { taskRows } from '@/screens/tasks/lib/tasksView'
import { removeTask, saveTask, useApp } from '@/state'

/** Which task the editor holds: a new one, or one being changed. */
type Editing = { id: TaskId | null; draft: EditorDraft }

/** The Tasks list, and its editor and delete sheets: what they show and what their taps do. */
export function useTasks() {
  const back = useBack('/')
  const location = useLocation()
  const snap = useApp((s) => s.snap)
  const today = useApp((s) => s.today)
  const settings = useApp((s) => s.settings)
  const rows = useMemo(() => taskRows(snap, today, settings), [snap, today, settings])

  // Today's «Add a task» opens the list with a new task's editor already up.
  const [editing, setEditing] = useState<Editing | null>(() =>
    (location.state as { newTask?: boolean } | null)?.newTask ? { id: null, draft: blankDraft(settings.defaultLength) } : null,
  )
  const [deleting, setDeleting] = useState(false)
  const closeEditor = useCallback(() => setEditing(null), [])
  const closeDelete = useCallback(() => setDeleting(false), [])
  useSheetEntry('task', editing !== null, closeEditor)
  useSheetEntry('delete', deleting, closeDelete)

  const change = (fn: (d: EditorDraft) => EditorDraft) => setEditing((e) => e && { ...e, draft: fn(e.draft) })
  const editingName = editing?.id ? snap.tasks.find((t) => t.id === editing.id)?.name : undefined

  return {
    rows,
    back,
    /** The editor, open: new or editing, and its fields. */
    editor: editing && {
      isNew: editing.id === null,
      ...editorView(editing.draft, settings.weekStart, settings.defaultLength),
    },
    /** The delete sheet's task name, while it's up. */
    deleting: deleting ? (editingName ?? null) : null,

    add: () => setEditing({ id: null, draft: blankDraft(settings.defaultLength) }),
    edit: (id: TaskId) => {
      const task = snap.tasks.find((t) => t.id === id)
      if (task) setEditing({ id, draft: draftFrom(task, today, settings.defaultLength) })
    },
    closeEditor,
    setName: (name: string) => change((d) => ({ ...d, name })),
    setEvery: (every: boolean) => change((d) => ({ ...d, every })),
    toggleDay: (day: number) => change((d) => toggleDay(d, day)),
    fewer: () => change((d) => stepSessions(d, -1)),
    more: () => change((d) => stepSessions(d, 1)),
    toggleCustom: () => change((d) => ({ ...d, custom: !d.custom })),
    shorter: () => change((d) => stepDraftLength(d, -1)),
    longer: () => change((d) => stepDraftLength(d, 1)),
    /** Saved, the editor closes; a failed save keeps it up (a toast says so). */
    async save() {
      if (!editing) return
      const draft = toTaskDraft(editing.draft)
      if (draft && (await saveTask(draft, editing.id ?? undefined))) setEditing(null)
    },
    askDelete: () => setDeleting(true),
    closeDelete,
    async confirmDelete() {
      if (!editing?.id) return
      if (await removeTask(editing.id)) {
        setDeleting(false)
        setEditing(null)
      }
    },
  }
}
