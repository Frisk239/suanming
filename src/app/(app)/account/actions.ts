// src/app/(app)/account/actions.ts
// 退出登录 Server Action（spec M5 用户系统）。
// 服务端 client signOut 清除 session cookie，比客户端 signOut 更彻底。

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export async function signOut() {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
