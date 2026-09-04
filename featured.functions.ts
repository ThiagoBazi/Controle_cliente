import { createServerFn } from "@tanstack/react-start";

/**
 * Vídeos em destaque escolhidos manualmente.
 * A leitura é pública; a gravação exige a senha guardada no secret PAINEL_SENHA.
 */

export const listFeatured = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ids: string[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("featured_media")
      .select("media_id, position")
      .order("position", { ascending: true });
    if (error) return { ids: [] };
    return { ids: (data ?? []).map((r) => r.media_id) };
  },
);

export const saveFeatured = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string; ids: string[] }) => {
    if (typeof input?.password !== "string" || !Array.isArray(input?.ids)) {
      throw new Error("Dados inválidos.");
    }
    return { password: input.password, ids: input.ids.slice(0, 24).map(String) };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const expected = process.env["PAINEL_SENHA"];
    if (!expected) {
      return { ok: false, message: "A senha da curadoria ainda não foi configurada." };
    }
    if (data.password !== expected) {
      return { ok: false, message: "Senha incorreta." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const del = await supabaseAdmin.from("featured_media").delete().neq("media_id", "");
    if (del.error) return { ok: false, message: "Não consegui limpar a seleção anterior." };

    if (data.ids.length) {
      const rows = data.ids.map((id, i) => ({ media_id: id, position: i }));
      const ins = await supabaseAdmin.from("featured_media").insert(rows);
      if (ins.error) return { ok: false, message: "Não consegui salvar a nova seleção." };
    }
    return { ok: true, message: "Seleção salva!" };
  });

export const checkPainelPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => ({ password: String(input?.password ?? "") }))
  .handler(async ({ data }): Promise<{ ok: boolean; configured: boolean }> => {
    const expected = process.env["PAINEL_SENHA"];
    if (!expected) return { ok: false, configured: false };
    return { ok: data.password === expected, configured: true };
  });
