-- ==========================================
-- SUPABASE ADATBÁZIS STRUKTÚRA ÉS BEÁLLÍTÁSOK
-- ==========================================

-- 1. Kategóriák tábla: Itt tároljuk a termékcsoportokat (pl. Ing, Cipő)
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Alapértelmezett kategóriák feltöltése
INSERT INTO categories (name) VALUES ('Ing'), ('Zakó'), ('Nadrág'), ('Cipő');

-- 2. Termékek tábla: A webshopban elérhető összes termék adatai
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,                   -- Termék neve
  price INTEGER NOT NULL,                -- Ár (egész számként, Ft-ban)
  image TEXT,                            -- Kép elérési útja vagy URL-je
  category_id INTEGER REFERENCES categories(id), -- Kapcsolat a kategóriákkal
  description TEXT,                      -- Részletes leírás
  stock INTEGER DEFAULT 10,              -- Raktárkészlet mennyisége
  size_stocks JSONB DEFAULT '{}'::jsonb  -- Méretspecifikus készlet (JSON bontás)
);

-- Mintatermékek betöltése a kezdéshez
INSERT INTO products (name, price, image, category_id, description, stock) VALUES
('Fehér elegáns ing', 8990, 'shirt1.jpg', 1, 'Prémium minőségű pamut ing, alkalmi és hétköznapi viseletre is.', 10),
('Kék lezser ing', 7990, 'shirt2.jpg', 1, 'Kényelmes viselet, ideális hétvégi programokhoz.', 10),
('Kockás flanel ing', 9990, 'shirt3.jpg', 1, 'Meleg és stílusos, tökéletes választás hűvösebb napokra.', 10),
('Fekete zakó', 24990, 'jacket1.jpg', 2, 'Modern szabású, karcsúsított zakó elegáns eseményekre.', 10),
('Szürke sportzakó', 21990, 'jacket2.jpg', 2, 'Elegáns, mégis könnyed megjelenést biztosít.', 10),
('Sötétkék blézer', 26990, 'jacket3.jpg', 2, 'Klasszikus darab, amely minden ruhatár alapja.', 10),
('Kék farmer nadrág', 12990, 'pants1.jpg', 3, 'Kényelmes, strapabíró farmer nadrág mindennapi használatra.', 10),
('Bézs chino nadrág', 11990, 'pants2.jpg', 3, 'Elegáns és kényelmes, tökéletes irodai viselet.', 10),
('Fekete szövetnadrág', 14990, 'pants3.jpg', 3, 'Hivatalos eseményekre ajánlott, prémium anyagból.', 10),
('Férfi bőr cipő', 19990, 'shoes1.jpg', 4, 'Valódi bőrből készült, kényelmes talpbetéttel rendelkező cipő.', 10),
('Fehér sportcipő', 15990, 'shoes2.jpg', 4, 'Trendi és kényelmes, mindennapi rohangáláshoz.', 10),
('Futócipő', 18990, 'shoes3.jpg', 4, 'Könnyű szerkezet, kiváló ütéscsillapítás sportoláshoz.', 10);

-- 3. Profilok tábla: Felhasználói adatok bővítése (név, cím, telefon, admin jogosultság)
-- Ez a tábla szoros kapcsolatban áll a Supabase beépített auth.users táblájával
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT FALSE -- Meghatározza, hogy admin-e a felhasználó
);

-- 4. Rendelések tábla: A leadott vásárlások főbb adatai
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,    -- Ki rendelte
  user_email TEXT,                       -- Rendelő e-mail címe
  total_price INTEGER NOT NULL,          -- Fizetendő végösszeg
  status TEXT DEFAULT 'pending',         -- Rendelés állapota (pl. függőben, teljesítve)
  shipping_method TEXT,                  -- Választott szállítási mód
  payment_method TEXT,                   -- Választott fizetési mód
  customer_name TEXT,                    -- Vásárló neve (mentve a rendeléssel)
  customer_phone TEXT,                   -- Vásárló telefonszáma
  customer_address TEXT,                 -- Szállítási cím
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) -- Időpont
);

-- 5. Rendelt tételek tábla: A rendelésben szereplő konkrét termékek (Order Items)
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE, -- Melyik rendeléshez tartozik
  product_name TEXT NOT NULL,            -- Termék neve (mentve, ha később törölnék a terméket)
  size TEXT,                             -- A választott méret
  price INTEGER NOT NULL,                -- Eladási ár a vásárlás pillanatában
  quantity INTEGER DEFAULT 1             -- Mennyiség
);

-- ==========================================
-- BIZTONSÁGI BEÁLLÍTÁSOK (RLS - Row Level Security)
-- ==========================================

-- Kategóriák: Bárki láthatja őket (akár bejelentkezés nélkül is)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mindenki olvashatja a kategóriákat" ON categories FOR SELECT USING (true);

-- Termékek: Bárki láthatja őket a webshopban
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mindenki olvashatja a termékeket" ON products FOR SELECT USING (true);

-- Rendelések:
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- A felhasználók csak a saját rendeléseiket láthatják
CREATE POLICY "Felhasználók láthatják a saját rendeléseiket" ON orders FOR SELECT USING (auth.uid() = user_id);
-- Az adminok viszont láthatják az összes beérkező rendelést
CREATE POLICY "Adminok láthatják az összes rendelést" ON orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Rendelt tételek:
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- Csak azok láthatják a tételeket, akiké a hozzájuk tartozó rendelés, vagy akik adminok
CREATE POLICY "Felhasználók és adminok láthatják a tételeket" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_admin = true
    ))
  )
);

-- ==========================================
-- AUTOMATIZÁCIÓK (TRIGGEREK ÉS FÜGGVÉNYEK)
-- ==========================================

-- Függvény: Új profil létrehozása automatikusan regisztrációkor
-- Amikor egy felhasználó regisztrál az Auth modulban, ez a függvény 
-- beírja az adatait a mi 'profiles' táblánkba is.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Azonnali futtatás regisztráció (INSERT a auth.users táblába) után
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Függvény: Készletkezelés (Méretspecifikus)
-- Ez a függvény kezeli a készlet levonást és hozzáadást.
CREATE OR REPLACE FUNCTION public.increment_stock(product_id INT, amount INT, size_val TEXT DEFAULT NULL)
RETURNS void AS $$
BEGIN
  IF size_val IS NOT NULL THEN
    UPDATE public.products
    SET 
      stock = stock + amount,
      size_stocks = jsonb_set(
        size_stocks, 
        ARRAY[size_val], 
        ((COALESCE(size_stocks->>size_val, '0')::int) + amount)::text::jsonb
      )
    WHERE id = product_id;
  ELSE
    UPDATE public.products
    SET stock = stock + amount
    WHERE id = product_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
