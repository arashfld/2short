import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, supabase as anonClient } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ creatorId: string }> }) {
  try {
    const { creatorId } = await params
    if (!creatorId) {
      return NextResponse.json({ error: 'Missing creatorId' }, { status: 400 })
    }

    let client
    try {
      client = createServiceClient()
    } catch {
      client = anonClient
    }

    // Fetch all posts for the creator. Prefer service role to bypass RLS,
    // but fall back to anon client when service key is missing.
    const { data, error } = await (client ?? anonClient)
      .from('posts')
      .select('*')
      .eq('creator_id', creatorId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ posts: data ?? [] }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}