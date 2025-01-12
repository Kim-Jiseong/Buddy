import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabase = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 데이터 가져오는 함수
export async function getValueById(table: string, id: number): Promise<any> {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching data from table "${table}":`, error);
      throw new Error(`Failed to fetch data from ${table}`);
    }

    return data;
  } catch (error: any) {
    console.error('Error in getValueById:', error.message);
    throw error;
  }
}
