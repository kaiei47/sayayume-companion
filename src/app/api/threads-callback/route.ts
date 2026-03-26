import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorMessage = searchParams.get('error_message')

  console.log('[threads-callback] code:', code)
  console.log('[threads-callback] error:', error, errorMessage)

  if (error) {
    return NextResponse.json({ error, errorMessage }, { status: 400 })
  }

  if (!code) {
    return NextResponse.json({ error: 'no code' }, { status: 400 })
  }

  // codeをそのまま返す（CLIからトークン交換するため）
  return NextResponse.json({
    code,
    message: 'Copy this code and run: python3 sns/tools/threads_get_token.py --code <CODE>'
  })
}
