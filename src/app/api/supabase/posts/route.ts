import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

async function isPublicImage(url: string): Promise<boolean> {
  try {
    // Try HEAD first
    const headRes = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    if (headRes.ok) {
      const ct = headRes.headers.get('content-type') || '';
      return ct.startsWith('image/');
    }
    // Fallback to GET without reading body
    const getRes = await fetch(url, { method: 'GET', redirect: 'follow' });
    if (!getRes.ok) return false;
    const ct = getRes.headers.get('content-type') || '';
    return ct.startsWith('image/');
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      creatorEmail,
      slug,
      title,
      content,
      imageUrl,
      requiredTierLevel,
    } = body || {}

    if (!creatorEmail || !slug || !title || typeof requiredTierLevel !== 'number') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Find creator profile by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,role')
      .eq('email', creatorEmail)
      .eq('role', 'creator')
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
    if (!profile) {
      return NextResponse.json({ error: 'Creator profile not found in Supabase' }, { status: 404 })
    }

    // Validate external image URL if provided
    if (imageUrl) {
      const looksLikeUrl = /^https?:\/\//.test(imageUrl);
      if (!looksLikeUrl) {
        return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 })
      }
      const ok = await isPublicImage(imageUrl);
      if (!ok) {
        return NextResponse.json({ error: 'Image URL is not publicly accessible or not an image' }, { status: 400 })
      }
    }

    const insertPayload = {
      creator_id: profile.id,
      slug,
      title,
      content: typeof content === 'string' ? content : content ? JSON.stringify(content) : null,
      image_url: imageUrl ?? null,
      required_tier_level: requiredTierLevel,
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(insertPayload)
      .select('*')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post: data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { creatorEmail, postId } = body || {};

    if (!creatorEmail || !postId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify creator profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,email,role')
      .eq('email', creatorEmail)
      .eq('role', 'creator')
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    if (!profile) {
      return NextResponse.json({ error: 'Creator profile not found in Supabase' }, { status: 404 });
    }

    // Delete only if the post belongs to this creator
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('creator_id', profile.id)
      .select('id')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Post not found or not owned by creator' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 });
  }
}