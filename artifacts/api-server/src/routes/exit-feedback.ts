import { Router, type IRouter } from "express";
import { db, exitFeedbacksTable, appSettingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const DEFAULT_OPTIONS = [
  "Apenas navegando / curioso",
  "Gostei, mas estou sem tempo no momento",
  "Não entendi bem como o Portal funciona",
  "Achei os planos ou valores altos",
  "Faltou alguma funcionalidade importante",
  "Outros (digite abaixo)",
];

// GET /api/exit-feedback/settings - Public settings for the modal
router.get("/exit-feedback/settings", async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.category, "exit_feedback"));

    const settingsMap: Record<string, string> = {};
    rows.forEach((r) => {
      settingsMap[r.key] = r.value || "";
    });

    const enabled = settingsMap["exit_modal_enabled"] !== "false";
    const title = settingsMap["exit_modal_title"] || "Antes de ir embora... O que você achou do Portal do Artista?";
    const subtitle = settingsMap["exit_modal_subtitle"] || "Sua opinião rápida é fundamental para melhorarmos a plataforma para músicos e compositores!";
    
    let options = DEFAULT_OPTIONS;
    if (settingsMap["exit_modal_options"]) {
      try {
        const parsed = JSON.parse(settingsMap["exit_modal_options"]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          options = parsed;
        }
      } catch (e) {
        // Fallback to defaults
      }
    }

    res.json({ enabled, title, subtitle, options });
  } catch (error) {
    console.error("Error fetching exit-feedback settings:", error);
    res.json({
      enabled: true,
      title: "Antes de ir embora... O que você achou do Portal do Artista?",
      subtitle: "Sua opinião rápida é fundamental para melhorarmos a plataforma!",
      options: DEFAULT_OPTIONS,
    });
  }
});

// POST /api/exit-feedback - Submit user exit feedback
router.post("/exit-feedback", async (req, res): Promise<void> => {
  try {
    const { selectedOption, customComment, pageUrl, userDevice } = req.body;

    if (!selectedOption) {
      res.status(400).json({ error: "Selecione uma opção de resposta" });
      return;
    }

    const [inserted] = await db
      .insert(exitFeedbacksTable)
      .values({
        selectedOption: String(selectedOption).trim(),
        customComment: customComment ? String(customComment).trim() : null,
        pageUrl: pageUrl ? String(pageUrl).trim() : "/",
        userDevice: userDevice ? String(userDevice).trim() : "desktop",
      })
      .returning();

    res.status(201).json({ success: true, feedback: inserted });
  } catch (error) {
    console.error("Error submitting exit feedback:", error);
    res.status(500).json({ error: "Erro interno ao salvar feedback" });
  }
});

// GET /api/admin/exit-feedbacks - Admin view of all feedback submissions
router.get("/admin/exit-feedbacks", async (req, res): Promise<void> => {
  if (!req.session.logado || req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const feedbacks = await db
      .select()
      .from(exitFeedbacksTable)
      .orderBy(desc(exitFeedbacksTable.createdAt));

    res.json(feedbacks);
  } catch (error) {
    console.error("Error fetching exit feedbacks:", error);
    res.status(500).json({ error: "Erro ao buscar feedbacks" });
  }
});

// POST /api/admin/exit-feedback/settings - Save exit feedback modal configuration
router.post("/admin/exit-feedback/settings", async (req, res): Promise<void> => {
  if (!req.session.logado || req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const { enabled, title, subtitle, options } = req.body;

    const itemsToUpsert = [
      { key: "exit_modal_enabled", value: enabled ? "true" : "false" },
      { key: "exit_modal_title", value: title || "" },
      { key: "exit_modal_subtitle", value: subtitle || "" },
      { key: "exit_modal_options", value: JSON.stringify(options || DEFAULT_OPTIONS) },
    ];

    for (const item of itemsToUpsert) {
      await db
        .insert(appSettingsTable)
        .values({
          key: item.key,
          value: item.value,
          category: "exit_feedback",
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: appSettingsTable.key,
          set: {
            value: item.value,
            category: "exit_feedback",
            updatedAt: new Date(),
          },
        });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error saving exit feedback settings:", error);
    res.status(500).json({ error: "Erro ao salvar configurações" });
  }
});

// DELETE /api/admin/exit-feedbacks/:id - Delete single feedback item
router.delete("/admin/exit-feedbacks/:id", async (req, res): Promise<void> => {
  if (!req.session.logado || req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    const id = parseInt(req.params.id);
    await db.delete(exitFeedbacksTable).where(eq(exitFeedbacksTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting exit feedback:", error);
    res.status(500).json({ error: "Erro ao deletar feedback" });
  }
});

// DELETE /api/admin/exit-feedbacks - Delete all feedback items
router.delete("/admin/exit-feedbacks", async (req, res): Promise<void> => {
  if (!req.session.logado || req.session.artistId) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }

  try {
    await db.delete(exitFeedbacksTable);
    res.json({ success: true });
  } catch (error) {
    console.error("Error clearing exit feedbacks:", error);
    res.status(500).json({ error: "Erro ao limpar feedbacks" });
  }
});

export default router;
