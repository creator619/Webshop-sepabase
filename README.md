# Ruházati Webshop (Serverless)

Ez egy egyszerű ruházati webshop, amely **tisztán GitHub Pages-en** fut.

## Hogyan használd?

1. Regisztrálj egy ingyenes profil után (az adatokat a böngésződ menti).
2. Böngéssz a kategóriák között.
3. Tedd a kosárba, amit szeretnél.
4. Add le a rendelést.

## GitHub feltöltés lépései

1. Hozz létre egy új publikus repository-t a GitHub-on.
2. A projekted mappájában futtasd a következő parancsokat:
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Serverless version"
   git branch -M main
   git remote add origin https://github.com/FELHASZNÁLÓNEVED/REPOSITORY_NEVE.git
   git push -u origin main
   ```
3. A GitHub-on menj a **Settings > Pages** menüponthoz.
4. A **Build and deployment** résznél válaszd ki a `main` ágat (root mappa).
5. Mentés után pár percen belül elindul a weboldalad!

## Megjegyzés
Mivel ez a verzió szerver nélkül (`localStorage` használatával) működik:
- A rendeléseket és regisztrált felhasználókat csak az látja, aki leadta őket (saját böngészőben).
- Nincs szükség a `backend` mappában lévő kódfuttatásra.

---
Készítette: Simone (Antigravity AI segítségével)
