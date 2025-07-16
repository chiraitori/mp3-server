import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    
    // Check if user is admin
    console.log('Login attempt:', {
      userEmail: data.user?.email,
      adminEmail: process.env.ADMIN_EMAIL,
      match: data.user?.email === process.env.ADMIN_EMAIL
    })
    
    if (data.user?.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ 
        error: 'Unauthorized - This account is not configured as admin',
        userEmail: data.user?.email,
        expectedEmail: process.env.ADMIN_EMAIL
      }, { status: 403 })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
      session: data.session,
    })
    
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
}
