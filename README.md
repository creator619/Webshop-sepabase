Ruházati Webshop (Supabase Cloud verzió)
Ez egy modern, szerverless ruházati webshop, amely GitHub Pages-en fut, a hátteret (adatbázis és hitelesítés) pedig a Supabase biztosítja. Így az adatok már nem csak a te böngésződben léteznek, hanem egy valódi felhőalapú adatbázisban.

🚀 Hogyan használd?
Regisztráció: Hozz létre egy fiókot az e-mail címeddel. A hitelesítést a Supabase Auth végzi.

Böngészés: Válogass a kategóriák között (az árucikkek az adatbázisból töltődnek be).

Kosár: Tedd a kosárba a kiszemelt termékeket.

Rendelés: Add le a rendelést, ami azonnal mentésre kerül a központi adatbázisba.

⚙️ Supabase Beállítások (Mielőtt feltöltenéd)
A működéshez szükséged lesz egy ingyenes Supabase projektre:

Regisztrálj a supabase.com oldalon.

Hozz létre egy új projektet.

Az SQL Editor-ban futtasd le a táblákat létrehozó szkriptet (pl. products, orders, profiles).

A Project Settings > API menüpont alatt keresd meg az URL és az anon key értékeket.

Ezeket illeszt be a projekted config.js (vagy hasonló) fájljába.

📦 GitHub Feltöltés Lépései
Hozz létre egy új publikus repository-t a GitHub-on.

A projekted mappájában futtasd a következő parancsokat:

Bash
git init
git add .
git commit -m "Initial commit - Supabase version"
git branch -M main
git remote add origin https://github.com/FELHASZNÁLÓNEVED/REPOSITORY_NEVE.git
git push -u origin main
A GitHub-on menj a Settings > Pages menüponthoz.

A Build and deployment résznél válaszd ki a main ágat.

Mentés után pár percen belül élni fog az oldalad!

💡 Megjegyzés
Valódi adatok: Mivel ez a verzió már a Supabase-t használja, a leadott rendelések és regisztrált felhasználók láthatóak maradnak bármilyen eszközről bejelentkezve.

Biztonság: Ügyelj rá, hogy csak az anon key-t használd a kliens oldalon, a service_role kulcsot soha ne tedd bele a publikus kódba!

Backend: Továbbra sincs szükséged saját szerver futtatására (Node.js/Python), mert a Supabase biztosítja az API-t.

Készitette: Gáspár Benjamin, Szentes Attila Géza, Simon Ernő
