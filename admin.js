// --- SUPABASE INICIALIZÁLÁS ---
// A Supabase adatbázis eléréséhez szükséges URL és anonim kulcs
var SUPABASE_URL = "https://vktmrcvvujnwnogmqktk.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdG1yY3Z2dWpud25vZ21xa3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzA1NTQsImV4cCI6MjA4OTMwNjU1NH0.fFgyD-GfcFGiUwtAti_rUE2U21cwIebQXRczVlYP1-I";

// Supabase kliens létrehozása (ha még nincs inicializálva)
var supabaseClient = window.supabaseClient || (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);
window.supabaseClient = supabaseClient;

// Tartalék API URL (ha nem csak Supabase-t használnánk)
const ADMIN_API = "http://localhost:3000"; 

// Az oldal betöltésekor lefutó fő inicializáló rész
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Alapszintű ellenőrzés a localStorage-ból (gyors visszajelzés)
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // 2. KRITIKUS JAVÍTÁS: Szerveroldali ellenőrzés a Supabase-ből
    // Nem bízunk a localStorage-ban, mert az könnyen manipulálható a konzolból.
    try {
        if (!supabaseClient) throw new Error("Supabase nincs inicializálva");

        // Lekérjük az aktuális munkamenetet és a felhasználó profilját az adatbázisból
        const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
        
        if (authError || !authUser) {
            throw new Error("Nincs érvényes bejelentkezés");
        }

        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', authUser.id)
            .single();

        // Ellenőrizzük az adatbázisból jövő valódi admin státuszt
        if (profileError || !profile || !profile.is_admin) {
            throw new Error("Nincs admin jogosultság az adatbázisban");
        }

        // Ha a szerver is megerősítette a jogosultságot, betölthetjük az adatokat
        loadOrders();       // Rendelések
        loadStats();        // Statisztikák (bevétel, stb.)
        loadCategoriesAdmin(); // Kategóriák a termékfelvételhez
        setupTabs();        // Fülek közötti navigáció beállítása
        
    } catch (err) {
        console.warn("Hozzáférés megtagadva:", err.message);
        alert('Nincs jogosultságod ehhez az oldalhoz! Kérlek lépj be egy admin fiókkal.');
        
        // Biztonsági okokból töröljük a gyanús localStorage adatot is, ha az admint hazudott
        if (user.is_admin) {
            user.is_admin = false;
            localStorage.setItem('user', JSON.stringify(user));
        }
        
        window.location.href = 'index.html';
    }
});

// A fülek (Irányítópult, Rendelések, Termékek) közötti váltás kezelése
function setupTabs() {
    document.querySelectorAll('.admin-nav .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            // Aktív osztály eltávolítása minden fülről és tartalom elrejtése
            document.querySelectorAll('.admin-nav .tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

            // Aktuális fül aktiválása
            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`${target}-tab`).style.display = 'block';

            // Adatok frissítése a fülre kattintáskor
            if (target === 'dashboard') loadStats();
            if (target === 'orders') loadOrders();
            if (target === 'products') {
                loadProducts();
            }
        });
    });
}

// Kategóriák betöltése a Supabase-ből a termék felvételi legördülő menübe
async function loadCategoriesAdmin() {
    try {
        if (!supabaseClient) return;
        const { data: categories, error } = await supabaseClient
            .from('categories')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        const select = document.getElementById('p-category');
        if (select) {
            select.innerHTML = '<option value="">Válassz kategóriát...</option>';
            categories.forEach(cat => {
                select.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
            });
        }
    } catch (err) {
        console.error("Hiba a kategóriák betöltésekor:", err);
    }
}

// --- DASHBOARD: Statisztikai adatok számítása ---
async function loadStats() {
    try {
        if (!supabaseClient) return;
        
        // Rendelések lekérése a bevétel és vevőszám számításához
        const { data: statsData, error } = await supabaseClient
            .from('orders')
            .select('total_price, user_email');

        if (error) throw error;
        
        // Összesítés
        const totalRevenue = statsData.reduce((sum, o) => sum + (o.total_price || 0), 0);
        const totalOrders = statsData.length;
        const totalCustomers = new Set(statsData.map(o => o.user_email)).size; // Egyedi email címek alapján
        
        // Megjelenítés az oldalon
        document.getElementById('stat-revenue').textContent = totalRevenue.toLocaleString() + ' Ft';
        document.getElementById('stat-orders').textContent = totalOrders + ' db';
        document.getElementById('stat-customers').textContent = totalCustomers + ' fő';
    } catch (err) {
        console.error("Hiba a statisztikák betöltésekor:", err);
    }
}

// --- RENDELÉSEK: Rendelések listázása és kezelése ---
async function loadOrders() {
    try {
        if (!supabaseClient) return;

        // Rendelések és a hozzájuk tartozó tételek lekérése
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select(`
                id, user_email, total_price, status, created_at, shipping_method, payment_method,
                customer_name, customer_phone, customer_address,
                order_items (product_name, size, price, quantity)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const tbody = document.querySelector('#admin-orders-table tbody');
        tbody.innerHTML = '';

        orders.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString('hu-HU');
            // Rendelési tételek HTML listája
            const itemsHtml = o.order_items ? o.order_items.map(item => `
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 2px;">
                    • ${item.product_name} ${item.size ? `<b>(${item.size})</b>` : ''} <span style="color: #444; font-weight: 500;">(${item.quantity} db)</span> — <b>${(item.price * item.quantity).toLocaleString()} Ft</b>
                </div>
            `).join('') : 'Nincs adat';

            // Sor hozzáadása a táblázathoz
            const shippingText = o.shipping_method === 'home' ? 'Házhoz' : (o.shipping_method === 'locker' ? 'Automata' : o.shipping_method || '-');
            const paymentText = o.payment_method === 'cod' ? 'Utánvét' : (o.payment_method === 'transfer' ? 'Átutalás' : o.payment_method || '-');

            tbody.innerHTML += `
                <tr>
                    <td>#${o.id}</td>
                    <td>
                        <b>${o.customer_name || 'Ismeretlen'}</b><br>
                        <span style="font-size: 0.85rem; color: #555;">${o.user_email}</span><br>
                        <div style="font-size: 0.85rem; color: #777; margin-top: 3px;">
                            📞 ${o.customer_phone || '-'}<br>
                            🏠 ${o.customer_address || '-'}
                        </div>
                        <div class="order-items-detail" style="margin-top: 5px; border-top: 1px solid #eee; pt-2;">
                            ${itemsHtml}
                        </div>
                    </td>
                    <td>${o.total_price.toLocaleString()} Ft</td>
                    <td>
                        <div style="font-size: 0.85rem;">${shippingText}</div>
                        <div style="font-size: 0.75rem; color: #777;">${paymentText}</div>
                    </td>
                    <td>${date}</td>
                    <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                    <td>
                        <!-- Státusz módosító legördülő menü -->
                        <select onchange="updateOrderStatus(${o.id}, this.value)">
                            <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Függőben</option>
                            <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Szállítva</option>
                            <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Kézbesítve</option>
                        </select>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

// Rendelés státuszának frissítése (pl. függőben -> szállítva)
async function updateOrderStatus(id, newStatus) {
    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        
        showToast('Státusz frissítve!');
        loadOrders(); // Táblázat frissítése
    } catch (err) {
        console.error(err);
        showToast('Hiba a státusz frissítésekor!');
    }
}

// --- TERMÉKEK: Termékek kezelése ---

// Kép feltöltése a Supabase Storage-ba
async function uploadImage(input) {
    if (!input.files || !input.files[0] || !supabaseClient) return;

    const file = input.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    try {
        // Feltöltés a 'product-images' bucket-be
        const { data, error } = await supabaseClient.storage
            .from('product-images')
            .upload(filePath, file);

        if (error) throw error;

        // A feltöltött kép publikus URL-jének lekérése
        const { data: { publicUrl } } = supabaseClient.storage
            .from('product-images')
            .getPublicUrl(filePath);

        // Az URL beírása az űrlap megfelelő mezőjébe
        document.getElementById('p-image').value = publicUrl;
        showToast('Kép sikeresen feltöltve!');
    } catch (err) {
        console.error(err);
        showToast('Hiba a feltöltéskor! (Ellenőrizd a Storage bucket-et)');
    }
}

// Termékek listájának betöltése az admin táblázatba
async function loadProducts() {
    try {
        if (!supabaseClient) return;
        
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        window.allProducts = products;

        const tbody = document.querySelector('#admin-products-table tbody');
        tbody.innerHTML = '';

        products.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td><img src="${p.image}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;" onerror="this.src='hatter.jpg'"></td>
                    <td>${p.name}</td>
                    <td>${p.price.toLocaleString()} Ft</td>
                    <td>${p.stock} db</td>
                    <td>${p.category_id}</td>
                    <td>
                        <!-- Szerkesztés és Törlés gombok -->
                        <button class="action-btn" onclick='editProduct(${JSON.stringify(p)})'>✏️</button>
                        <button class="action-btn" onclick="deleteProduct(${p.id})">🗑️</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
    }
}

// Termékfelvételi űrlap megjelenítése
function showProductForm() {
    document.getElementById('product-form').style.display = 'block';
    document.getElementById('form-title').textContent = 'Új termék hozzáadása';
    clearForm();
}

// Űrlap elrejtése
function hideProductForm() {
    document.getElementById('product-form').style.display = 'none';
}

// Űrlap mezőinek kiürítése
function clearForm() {
    document.getElementById('p-id').value = '';
    document.getElementById('p-name').value = '';
    document.getElementById('p-price').value = '';
    document.getElementById('p-image').value = '';
    document.getElementById('p-category').value = '';
    document.getElementById('admin-size-inputs').innerHTML = '<span style="color: #666; font-size: 0.9rem;">Kérlek válassz először kategóriát!</span>';
    document.getElementById('p-desc').value = '';
}

// Dinamikus méretmező generátor a kategória alapján
function generateAdminSizeInputs(productId = null) {
    const category = document.getElementById('p-category').value;
    const container = document.getElementById('admin-size-inputs');
    
    if (!category) {
        container.innerHTML = '<span style="color: #666; font-size: 0.9rem;">Kérlek válassz először kategóriát!</span>';
        return;
    }
    
    // Kategóriától függő méretlista
    let sizes = category == '4' ? ["40", "41", "42", "43", "44", "45"] : ["S", "M", "L", "XL", "XXL"];
    
    // Meglévő adatok kinyerése a termékből (size_stocks oszlop a DB-ben)
    let customStocks = {};
    const product = window.allProducts?.find(p => p.id == productId);
    if (product && product.size_stocks) {
        customStocks = product.size_stocks;
    } else {
        // Fallback a régi localStorage-ra, ha még nincs fent az új DB oszlopban
        const stockMap = JSON.parse(localStorage.getItem('customStockMap') || '{}');
        if (stockMap[productId]) customStocks = stockMap[productId];
    }
    
    container.innerHTML = '';
    sizes.forEach(size => {
        // Alapértelmezett érték: ha új termék, 10-et teszünk bele osztva, hogy legyen benne valami (demo miatt), ha meglévő, akkor 0, de ha customStocks létezik, azt használjuk
        let defaultVal = customStocks[size] !== undefined ? customStocks[size] : (productId ? 0 : 2);
        container.innerHTML += `
            <div style="display: flex; flex-direction: column; width: 60px;">
                <label style="font-size: 0.85rem; text-align: center; margin-bottom: 3px;">${size}</label>
                <input type="number" class="size-stock-input" data-size="${size}" value="${defaultVal}" min="0" style="padding: 5px; text-align: center; margin-bottom: 0;">
            </div>
        `;
    });
}

// Meglévő termék adatainak beöltése az űrlapba szerkesztéshez
function editProduct(p) {
    document.getElementById('product-form').style.display = 'block';
    document.getElementById('form-title').textContent = 'Termék szerkesztése';

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-image').value = p.image;
    document.getElementById('p-category').value = p.category_id;
    
    // Generáljuk a kategóriának megfelelő inputokat a meglévő termékhez
    generateAdminSizeInputs(p.id);

    document.getElementById('p-desc').value = p.description;
}

// Termék mentése (ha van ID, frissít, ha nincs, újat szúr be)
async function saveProduct() {
    if (!supabaseClient) return;
    
    const id = document.getElementById('p-id').value;
    
    // Összeszeljük a méretenkénti készletet
    const sizeInputs = document.querySelectorAll('.size-stock-input');
    let totalStock = 0;
    let sizeBreakdown = {};
    sizeInputs.forEach(inp => {
        const val = parseInt(inp.value) || 0;
        totalStock += val;
        sizeBreakdown[inp.dataset.size] = val;
    });

    const product = {
        name: document.getElementById('p-name').value,
        price: parseInt(document.getElementById('p-price').value),
        image: document.getElementById('p-image').value,
        stock: totalStock,
        size_stocks: sizeBreakdown, // Méretenkénti bontás mentése a DB-be
        category_id: parseInt(document.getElementById('p-category').value),
        description: document.getElementById('p-desc').value
    };

    try {
        let result;
        
        if (id) {
            result = await supabaseClient.from('products').update(product).eq('id', id).select().single();
        } else {
            result = await supabaseClient.from('products').insert(product).select().single();
        }

        if (result.error) throw result.error;

        // Kinyerjük az azonosítót a sikeres mentés után
        const savedId = result.data?.id;

        // Eltároljuk a méretenkénti bontást a local storage-ban, hogy a vásárlói oldal (script.js) megtalálja
        if (savedId) {
            const stockMap = JSON.parse(localStorage.getItem('customStockMap') || '{}');
            stockMap[savedId] = sizeBreakdown;
            localStorage.setItem('customStockMap', JSON.stringify(stockMap));
            // Frissítsük a memóriában lévő listát is, hogy ne kelljen újra tölteni mindent
            if(window.allProducts) {
                const prodInArray = window.allProducts.find(x=>x.id == savedId);
                if(prodInArray) prodInArray.stock = totalStock;
            }
        }

        showToast(id ? 'Termék frissítve!' : 'Termék hozzáadva!');
        hideProductForm();
        loadProducts(); // Lista frissítése
    } catch (err) {
        console.error(err);
        showToast('Hiba a mentés során!');
    }
}

// Termék törlése
async function deleteProduct(id) {
    if (!confirm('Biztosan törlöd a terméket?') || !supabaseClient) return;

    try {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) throw error;
        
        showToast('Termék törölve!');
        loadProducts(); // Lista frissítése
    } catch (err) {
        console.error(err);
        showToast('Hiba a törlés során!');
    }
}
