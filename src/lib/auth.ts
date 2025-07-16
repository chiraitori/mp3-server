import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function isAdmin(req: NextRequest): Promise<boolean> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) return false
  
  try {
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) return false
    
    // Check if user is admin (you can implement your own logic here)
    return user.email === process.env.ADMIN_EMAIL
  } catch {
    return false
  }
}

export function withAuth(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const isAuthenticated = await isAdmin(req)
    
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return handler(req)
  }
}
