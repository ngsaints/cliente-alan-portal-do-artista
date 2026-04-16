// Seed script to populate database with initial data
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { db, plansTable, settingsTable } from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Insert default plans
  const defaultPlans = [
    {
      nome: "free",
      label: "Gratuito",
      preco: "0",
      limiteMusicas: "2",
      personalizaoPercent: "10",
      descricao: "Para começar",
      fraseEfeito: "Comece sua jornada musical",
      ativo: true,
    },
    {
      nome: "basico",
      label: "Básico",
      preco: "19.90",
      limiteMusicas: "10",
      personalizaoPercent: "30",
      descricao: "Para artistas em crescimento",
      fraseEfeito: "Expanda seu alcance",
      ativo: true,
    },
    {
      nome: "intermediario",
      label: "Intermediário",
      preco: "39.90",
      limiteMusicas: "25",
      personalizaoPercent: "50",
      descricao: "Para profissionais",
      fraseEfeito: "Leve sua carreira ao próximo nível",
      ativo: true,
    },
    {
      nome: "pro",
      label: "Profissional",
      preco: "79.90",
      limiteMusicas: "50",
      personalizaoPercent: "80",
      descricao: "Para artistas estabelecidos",
      fraseEfeito: "Domine sua presença digital",
      ativo: true,
    },
    {
      nome: "premium",
      label: "Premium",
      preco: "149.90",
      limiteMusicas: "100",
      personalizaoPercent: "100",
      descricao: "Tudo liberado",
      fraseEfeito: "Experiência completa",
      ativo: true,
    },
  ];

  for (const plan of defaultPlans) {
    try {
      await db.insert(plansTable).values(plan).onConflictDoNothing();
      console.log(`  ✓ Plan: ${plan.label}`);
    } catch (e) {
      console.log(`  - Plan already exists: ${plan.label}`);
    }
  }

  // Insert default settings
  const defaultSettings = [
    { key: "artist_name", value: "Alan Ribeiro" },
    { key: "vip_password", value: "" },
    { key: "admin_user", value: "admin" },
    { key: "admin_pass", value: "admin1234" },
  ];

  for (const setting of defaultSettings) {
    try {
      await db.insert(settingsTable).values(setting).onConflictDoNothing();
      console.log(`  ✓ Setting: ${setting.key}`);
    } catch (e) {
      console.log(`  - Setting already exists: ${setting.key}`);
    }
  }

  console.log("Seed completed!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
