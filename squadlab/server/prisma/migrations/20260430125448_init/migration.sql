-- CreateTable
CREATE TABLE "Lab" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "annee" TEXT,
    "specialite" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "dateApprobation" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Component" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" INTEGER NOT NULL,
    "codeFournisseur" TEXT,
    "prix" DECIMAL,
    "nom" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "armoire" TEXT,
    "casier" INTEGER,
    "type" TEXT,
    "qtyStock" INTEGER NOT NULL DEFAULT 0,
    "qtyReservee" INTEGER NOT NULL DEFAULT 0,
    "qtyDisponible" INTEGER NOT NULL DEFAULT 0,
    "qtyProjets" INTEGER NOT NULL DEFAULT 0,
    "qtyEndommage" INTEGER NOT NULL DEFAULT 0,
    "qtyPerdu" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Component_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "labId" TEXT NOT NULL,
    "encadrantId" TEXT NOT NULL,
    "chefGroupeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Project_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_encadrantId_fkey" FOREIGN KEY ("encadrantId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Project_chefGroupeId_fkey" FOREIGN KEY ("chefGroupeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "isLeader" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProjectMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DischargeSheet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "numeroFiche" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateApprobation" DATETIME,
    "approuvePar" TEXT,
    "validePar" TEXT,
    "isRefresh" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DischargeSheet_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DischargeSheet_approuvePar_fkey" FOREIGN KEY ("approuvePar") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DischargeSheet_validePar_fkey" FOREIGN KEY ("validePar") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DischargeItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dischargeSheetId" TEXT NOT NULL,
    "componentId" TEXT NOT NULL,
    "quantiteDemandee" INTEGER NOT NULL,
    "quantiteAccordee" INTEGER NOT NULL,
    "statutRetour" TEXT NOT NULL DEFAULT 'DANS_PROJET',
    CONSTRAINT "DischargeItem_dischargeSheetId_fkey" FOREIGN KEY ("dischargeSheetId") REFERENCES "DischargeSheet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DischargeItem_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "componentId" TEXT NOT NULL,
    "projectId" TEXT,
    "dischargeSheetId" TEXT,
    "typeMouvement" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "dateMouvement" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectuePar" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "StockMovement_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_effectuePar_fkey" FOREIGN KEY ("effectuePar") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Lab_nom_key" ON "Lab"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Component_numero_labId_key" ON "Component"("numero", "labId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMember_projectId_studentId_key" ON "ProjectMember"("projectId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "DischargeSheet_numeroFiche_key" ON "DischargeSheet"("numeroFiche");
