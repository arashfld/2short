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

    if (!client) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', creatorId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ profile: data ?? null }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}