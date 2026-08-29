// 元のアプリ（Claudeアーティファクト環境）で使われていた window.storage の
// get / set / delete / list インターフェースを、Supabase の単純な
// key-value テーブル（kv_store）で再現するモジュール。
//
// これにより App.jsx 側のロジックは一切変更せず、
// main.jsx で `window.storage = storage` としてポリフィルするだけで動く。
//
// 前提: Supabaseに以下のテーブルを作成しておくこと（README.md参照）
//   kv_store (key text primary key, value text, updated_at timestamptz)

import { supabase } from "./supabaseClient.js";

async function get(key /*, shared */) {
  const { data, error } = await supabase
    .from("kv_store")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("[storage.get] error:", error);
    throw error;
  }
  if (!data) return null;
  return { key, value: data.value };
}

async function set(key, value /*, shared */) {
  const { error } = await supabase
    .from("kv_store")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    console.error("[storage.set] error:", error);
    throw error;
  }
  return { key, value };
}

async function del(key /*, shared */) {
  const { error } = await supabase.from("kv_store").delete().eq("key", key);
  if (error) {
    console.error("[storage.delete] error:", error);
    throw error;
  }
  return { key, deleted: true };
}

async function list(prefix = "" /*, shared */) {
  let query = supabase.from("kv_store").select("key");
  if (prefix) query = query.like("key", `${prefix}%`);
  const { data, error } = await query;
  if (error) {
    console.error("[storage.list] error:", error);
    throw error;
  }
  return { keys: (data || []).map((d) => d.key), prefix };
}

export const storage = { get, set, delete: del, list };
