import { Router, type IRouter } from "express";
import { db, plansTable, artistsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// Get all active plans
router.get("/plans", async (_req, res): Promise<void> => {
  try {
    const plans = await db.select().from(plansTable).where(eq(plansTable.ativo, true));
    res.json(plans);
  } catch (error) {
    console.error("Error getting plans:", error);
    res.status(500).json({ error: "Erro ao obter planos" });
  }
});

// Update artist plan (after payment)
router.put("/artists/:id/plan", async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const { plano } = req.body;

    if (!plano) {
      res.status(400).json({ error: "Plano é obrigatório" });
      return;
    }

    // Get plan details
    const plans = await db.select().from(plansTable).where(eq(plansTable.nome, plano));
    if (plans.length === 0) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }

    const plan = plans[0];

    // Update artist
    const [updatedArtist] = await db
      .update(artistsTable)
      .set({
        plano: plan.nome,
        limiteMusicas: plan.limiteMusicas,
        personalizaoPercent: plan.personalizaoPercent,
        planoAtivo: true,
      })
      .where(eq(artistsTable.id, parseInt(id)))
      .returning();

    if (!updatedArtist) {
      res.status(404).json({ error: "Artista não encontrado" });
      return;
    }

    res.json({
      message: "Plano atualizado com sucesso",
      artist: {
        id: updatedArtist.id,
        name: updatedArtist.name,
        plano: updatedArtist.plano,
        limiteMusicas: updatedArtist.limiteMusicas,
      },
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    res.status(500).json({ error: "Erro ao atualizar plano" });
  }
});

// Seed default plans (run once)
router.post("/plans/seed", async (req, res): Promise<void> => {
  try {
    const defaultPlans = [
      {
        nome: "free",
        label: "Free Experimental",
        preco: "0",
        limiteMusicas: "2",
        personalizaoPercent: "10",
        descricao: "2 músicas para testar a plataforma",
        fraseEfeito: "Experimente e veja seu trabalho ganhar destaque!",
        ativo: true,
      },
      {
        nome: "basico",
        label: "Básico",
        preco: "20",
        limiteMusicas: "20",
        personalizaoPercent: "20",
        descricao: "20 músicas, 20% de personalização",
        fraseEfeito: "Comece a profissionalizar seu trabalho agora!",
        ativo: true,
      },
      {
        nome: "intermediario",
        label: "Intermediário",
        preco: "50",
        limiteMusicas: "70",
        personalizaoPercent: "50",
        descricao: "70 músicas, 50% de personalização",
        fraseEfeito: "Impulsione sua carreira com visibilidade profissional!",
        ativo: true,
      },
      {
        nome: "pro",
        label: "Pro",
        preco: "70",
        limiteMusicas: "100",
        personalizaoPercent: "70",
        descricao: "100 músicas, 70% de personalização",
        fraseEfeito: "Seu perfil profissional com máxima qualidade!",
        ativo: true,
      },
      {
        nome: "premium",
        label: "Premium",
        preco: "100",
        limiteMusicas: "200",
        personalizaoPercent: "100",
        descricao: "200 músicas, 100% de personalização",
        fraseEfeito: "Transforme seu perfil em portfólio profissional completo!",
        ativo: true,
      },
    ];

    // Check if plans already exist
    const existingPlans = await db.select().from(plansTable);
    if (existingPlans.length > 0) {
      res.json({ message: "Planos já existem no banco", count: existingPlans.length });
      return;
    }

    // Insert all plans
    const inserted = await db.insert(plansTable).values(defaultPlans).returning();
    res.status(201).json({ message: "Planos criados com sucesso", plans: inserted });
  } catch (error) {
    console.error("Error seeding plans:", error);
    res.status(500).json({ error: "Erro ao criar planos" });
  }
});

export default router;
