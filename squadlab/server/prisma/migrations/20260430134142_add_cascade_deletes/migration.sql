-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DischargeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dischargeSheetId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantiteDemandee" INTEGER NOT NULL,
    "quantiteAccordee" INTEGER NOT NULL,
    "statutRetour" TEXT NOT NULL DEFAULT 'DANS_PROJET',
    CONSTRAINT "DischargeItem_dischargeSheetId_fkey" FOREIGN KEY ("dischargeSheetId") REFERENCES "DischargeSheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DischargeItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DischargeItem" ("componentId", "dischargeSheetId", "id", "quantiteAccordee", "quantiteDemandee", "statutRetour") SELECT "componentId", "dischargeSheetId", "id", "quantiteAccordee", "quantiteDemandee", "statutRetour" FROM "DischargeItem";
DROP TABLE "DischargeItem";
ALTER TABLE "new_DischargeItem" RENAME TO "DischargeItem";
CREATE TABLE "new_StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "projectId" TEXT,
    "dischargeSheetId" TEXT,
    "typeMouvement" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "dateMouvement" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectuePar" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "StockMovement_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_effectuePar_fkey" FOREIGN KEY ("effectuePar") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockMovement" ("componentId", "dateMouvement", "dischargeSheetId", "effectuePar", "id", "notes", "projectId", "quantite", "typeMouvement") SELECT "componentId", "dateMouvement", "dischargeSheetId", "effectuePar", "id", "notes", "projectId", "quantite", "typeMouvement" FROM "StockMovement";
DROP TABLE "StockMovement";
ALTER TABLE "new_StockMovement" RENAME TO "StockMovement";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
