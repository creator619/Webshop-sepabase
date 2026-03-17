-- 1. Kategóriák tábla
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- alap kategóriák
INSERT INTO categories (name) VALUES ('Ing'), ('Zakó'), ('Nadrág'), ('Cipő');

-- 2. Termékek tábla
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  image TEXT,
  category_id INTEGER REFERENCES categories(id),
  description TEXT,
  stock INTEGER DEFAULT 10
);

-- alap termékek betöltése
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

-- 3. Profilok tábla (Az auth.users-hez kapcsolódik)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  phone TEXT,
  address TEXT,
  is_admin BOOLEAN DEFAULT FALSE
);

-- 4. Rendelések tábla
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  user_email TEXT,
  total_price INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Rendelt tételek tábla
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1
);

-- Row Level Security (RLS) beállítása (egyszerűség kedvéért most engedélyezzük az olvasást mindenkinek)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mindenki olvashatja a kategóriákat" ON categories FOR SELECT USING (true);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mindenki olvashatja a termékeket" ON products FOR SELECT USING (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Felhasználók láthatják a saját rendeléseiket" ON orders FOR SELECT USING (auth.uid() = user_id);

-- 6. Automatikus profil létrehozás trigger
-- Ez a függvény fut le minden alkalommal, amikor egy új felhasználó regisztrál
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, is_admin)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', false);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Beállítjuk a triggert az auth.users táblára (ez a belső Supabase tábla)
-- Fontos: Ezt a Supabase SQL Editorában kell lefuttatni!
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
