import { supabase } from './supabaseClient'

const NOTE_ID = 'single'

export async function saveNote(content: string) {
  const { error } = await supabase
    .from('notes')
    .upsert(
      { id: NOTE_ID, content },
      { onConflict: 'id' }
    )

  if (error) throw error
}

export async function loadNote() {
  const { data, error } = await supabase
    .from('notes')
    .select('content')
    .eq('id', NOTE_ID)
    .single()

  if (error) return ''
  return data?.content ?? ''
}
