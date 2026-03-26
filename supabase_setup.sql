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
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL, -- Kapcsolat a termékkel, ha törlik, NULL lesz
  product_name TEXT NOT NULL,            -- Termék neve (mentve, ha később törölnék a terméket)
  size TEXT,                             -- A választott méret
  price INTEGER NOT NULL,                -- Eladási ár a vásárlás pillanatában
  quantity INTEGER DEFAULT 1             -- Mennyiség
);

-- ==========================================
-- BIZTONSÁGI BEÁLLÍTÁSOK (RLS - Row Level Security)
-- ==========================================

-- 0. Segédfüggvény a végtelen rekurzió elkerülésére (SECURITY DEFINER szükséges az RLS megkerüléséhez az ellenőrzéskor)
CREATE OR REPLACE FUNCTION public.is_admin_user() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kategóriák: Bárki láthatja őket, adminok módosíthatják
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mindenki olvashatja a kategóriákat" ON categories FOR SELECT USING (true);
CREATE POLICY "Adminok módosíthatják a kategóriákat" ON categories FOR ALL USING (public.is_admin_user());

-- Termékek: Bárki láthatja őket, adminok módosíthatják
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mindenki olvashatja a termékeket" ON products FOR SELECT USING (true);
CREATE POLICY "Adminok módosíthatják a termékeket" ON products FOR ALL USING (public.is_admin_user());

-- Profilok: Saját adatok elérése + Adminok
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Felhasználók láthatják a saját profiljukat" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Felhasználók frissíthetik a saját profiljukat" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Adminok láthatják az összes profilt" ON profiles FOR SELECT USING (public.is_admin_user());
CREATE POLICY "Adminok frissíthetik az összes profilt" ON profiles FOR UPDATE USING (public.is_admin_user());

-- Rendelések:
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- A felhasználók csak a saját rendeléseiket láthatják
CREATE POLICY "Felhasználók láthatják a saját profiljukat" ON orders FOR SELECT USING (auth.uid() = user_id);
-- Leadhatnak új rendelést: ELTÁVOLÍTVA (A biztonság érdekében csak a place_order RPC-n keresztül engedélyezett)
-- Az adminok viszont láthatják az összes beérkező rendelést
CREATE POLICY "Adminok láthatják az összes rendelést" ON orders FOR SELECT USING (public.is_admin_user());
-- Adminok frissíthetik a rendelések állapotát
CREATE POLICY "Adminok frissíthetik a rendeléseket" ON orders FOR UPDATE USING (public.is_admin_user());

-- Rendelt tételek:
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
-- Csak azok láthatják a tételeket, akiké a hozzájuk tartozó rendelés, vagy akik adminok
CREATE POLICY "Felhasználók és adminok láthatják a tételeket" ON order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.user_id = auth.uid() OR public.is_admin_user())
  )
);
-- Tételek hozzáadása rendeléshez: ELTÁVOLÍTVA (A biztonság érdekében csak a place_order RPC-n keresztül engedélyezett)

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

-- Függvény: Jogosultság ellenőrzése (is_admin védelme)
-- Megakadályozza, hogy a sima felhasználók saját magukat adminná tegyék.
CREATE OR REPLACE FUNCTION public.preserve_is_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- Csak akkor engedjük az is_admin módosítását, ha a műveletet végző felhasználó admin
  -- (A NEW.is_admin IS DISTINCT FROM OLD.is_admin ellenőrzi, hogy ténylegesen változott-e az érték)
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF NOT public.is_admin_user() THEN
      -- Ha nem admin végzi a módosítást, visszaállítjuk az eredeti (OLD) értékre
      NEW.is_admin := OLD.is_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Minden profil frissítése előtt lefut
CREATE TRIGGER tr_preserve_is_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.preserve_is_admin();

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
$$ LANGUAGE plpgsql;

-- 6. Biztonságos rendelés leadás (Szerveroldali árkalkulációval)
-- Ez a függvény garantálja, hogy a vásárló nem tudja módosítani az árakat.
CREATE OR REPLACE FUNCTION public.place_order(
  p_items JSONB, 
  p_shipping_method TEXT, 
  p_payment_method TEXT,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_address TEXT,
  p_user_email TEXT
)
RETURNS iNT AS $$
DECLARE
  v_order_id INT;
  v_total_price INT := 0;
  v_item RECORD;
  v_product_price INT;
  v_product_name TEXT;
  v_shipping_fee INT := 0;
BEGIN
  -- 1. Számoljuk ki a tételek árát a szerver oldalon (az adatbázisban tárolt árak alapján)
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id INT, quantity INT, size TEXT)
  LOOP
    SELECT price, name INTO v_product_price, v_product_name FROM public.products WHERE id = v_item.id;
    
    IF v_product_price IS NULL THEN
      RAISE EXCEPTION 'Termék nem található: %', v_item.id;
    END IF;
    
    v_total_price := v_total_price + (v_product_price * v_item.quantity);
  END LOOP;

  -- 2. Számoljuk ki a szállítási díjat (Szerveroldali szabályok alapján)
  IF v_total_price < 10000 THEN
    v_shipping_fee := CASE WHEN p_shipping_method = 'home' THEN 1500 ELSE 990 END;
  END IF;
  
  v_total_price := v_total_price + v_shipping_fee;

  -- 3. Rendelés beszúrása az orders táblába
  INSERT INTO public.orders (
    user_id, user_email, total_price, status, 
    shipping_method, payment_method, customer_name, customer_phone, customer_address
  ) VALUES (
    auth.uid(), p_user_email, v_total_price, 'pending',
    p_shipping_method, p_payment_method, p_customer_name, p_customer_phone, p_customer_address
  ) RETURNING id INTO v_order_id;

  -- 4. Tételek beszúrása az order_items táblába és készlet levonása
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id INT, quantity INT, size TEXT)
  LOOP
    INSERT INTO public.order_items (order_id, product_id, product_name, size, price, quantity)
    SELECT v_order_id, p.id, p.name, v_item.size, p.price, v_item.quantity
    FROM public.products p WHERE p.id = v_item.id;

    -- Készlet levonása (a meglévő increment_stock függvény meghívásával)
    PERFORM public.increment_stock(v_item.id, -v_item.quantity, v_item.size);
  END LOOP;

  RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
