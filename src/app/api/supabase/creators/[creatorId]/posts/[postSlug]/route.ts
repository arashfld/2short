import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, supabase as anonClient } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: Promise<{ creatorId: string; postSlug: string }> }) {
  try {
    const { creatorId, postSlug } = await params
    if (!creatorId || !postSlug) {
      return NextResponse.json({ error: 'Missing creatorId or postSlug' }, { status: 400 })
    }

    let client
    try {
      client = createServiceClient()
    } catch {
      client = anonClient
    }

    const { data, error } = await (client ?? anonClient)
      .from('posts')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('slug', postSlug)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post: data ?? null }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}