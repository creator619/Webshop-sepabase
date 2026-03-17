// --- SUPABASE INICIALIZÁLÁS ---
var SUPABASE_URL = "https://vktmrcvvujnwnogmqktk.supabase.co";
var SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrdG1yY3Z2dWpud25vZ21xa3RrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MzA1NTQsImV4cCI6MjA4OTMwNjU1NH0.fFgyD-GfcFGiUwtAti_rUE2U21cwIebQXRczVlYP1-I";
var supabaseClient = window.supabaseClient || (window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null);
window.supabaseClient = supabaseClient;

// Maradék admin logika
const ADMIN_API = "http://localhost:3000"; // Tartalék, hátha kell valamihez, de Supabase-t használunk

document.addEventListener('DOMContentLoaded', () => {
    // Jogosultság ellenőrzés (a Supabase profiles tábla alapján)
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || !user.is_admin) {
        alert('Nincs jogosultságod ehhez az oldalhoz! Kérlek lépj be egy olyan fiókkal, ami admin jogosultsággal rendelkezik.');
        window.location.href = 'index.html';
        return;
    }

    loadOrders();
    loadStats();
    loadCategoriesAdmin();
    setupTabs();
});

function setupTabs() {
    document.querySelectorAll('.admin-nav .tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-nav .tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');

            tab.classList.add('active');
            const target = tab.getAttribute('data-tab');
            document.getElementById(`${target}-tab`).style.display = 'block';

            if (target === 'dashboard') loadStats();
            if (target === 'orders') loadOrders();
            if (target === 'products') {
                loadProducts();
            }
        });
    });
}

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

// --- DASHBOARD ---
async function loadStats() {
    try {
        if (!supabaseClient) return;
        
        const { data: statsData, error } = await supabaseClient
            .from('orders')
            .select('total_price, user_email');

        if (error) throw error;
        
        const totalRevenue = statsData.reduce((sum, o) => sum + (o.total_price || 0), 0);
        const totalOrders = statsData.length;
        const totalCustomers = new Set(statsData.map(o => o.user_email)).size;
        
        document.getElementById('stat-revenue').textContent = totalRevenue.toLocaleString() + ' Ft';
        document.getElementById('stat-orders').textContent = totalOrders + ' db';
        document.getElementById('stat-customers').textContent = totalCustomers + ' fő';
    } catch (err) {
        console.error("Hiba a statisztikák betöltésekor:", err);
    }
}

// --- RENDELÉSEK ---
async function loadOrders() {
    try {
        if (!supabaseClient) return;

        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select(`
                id, user_email, total_price, status, created_at,
                order_items (product_name, price, quantity)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        const tbody = document.querySelector('#admin-orders-table tbody');
        tbody.innerHTML = '';

        orders.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString('hu-HU');
            const itemsHtml = o.order_items ? o.order_items.map(item => `
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 2px;">
                    • ${item.product_name} <b>x ${item.quantity}</b> (${item.price.toLocaleString()} Ft)
                </div>
            `).join('') : 'Nincs adat';

            tbody.innerHTML += `
                <tr>
                    <td>#${o.id}</td>
                    <td>
                        <b>${o.user_email}</b><br>
                        <div class="order-items-detail" style="margin-top: 5px;">
                            ${itemsHtml}
                        </div>
                    </td>
                    <td>${o.total_price.toLocaleString()} Ft</td>
                    <td>${date}</td>
                    <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                    <td>
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

async function updateOrderStatus(id, newStatus) {
    try {
        if (!supabaseClient) return;
        const { error } = await supabaseClient
            .from('orders')
            .update({ status: newStatus })
            .eq('id', id);

        if (error) throw error;
        
        showToast('Státusz frissítve!');
        loadOrders();
    } catch (err) {
        console.error(err);
        showToast('Hiba a státusz frissítésekor!');
    }
}

// Duplicate eltávolítva

// --- TERMÉKEK ---
async function uploadImage(input) {
    if (!input.files || !input.files[0] || !supabaseClient) return;

    const file = input.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `products/${fileName}`;

    try {
        const { data, error } = await supabaseClient.storage
            .from('product-images')
            .upload(filePath, file);

        if (error) throw error;

        // Publikus URL lekérése
        const { data: { publicUrl } } = supabaseClient.storage
            .from('product-images')
            .getPublicUrl(filePath);

        document.getElementById('p-image').value = publicUrl;
        showToast('Kép sikeresen feltöltve!');
    } catch (err) {
        console.error(err);
        showToast('Hiba a feltöltéskor! (Ellenőrizd a Storage bucket-et)');
    }
}

async function loadProducts() {
    try {
        if (!supabaseClient) return;
        
        const { data: products, error } = await supabaseClient
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;

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

function showProductForm() {
    document.getElementById('product-form').style.display = 'block';
    document.getElementById('form-title').textContent = 'Új termék hozzáadása';
    clearForm();
}

function hideProductForm() {
    document.getElementById('product-form').style.display = 'none';
}

function clearForm() {
    document.getElementById('p-id').value = '';
    document.getElementById('p-name').value = '';
    document.getElementById('p-price').value = '';
    document.getElementById('p-image').value = '';
    document.getElementById('p-stock').value = '';
    document.getElementById('p-desc').value = '';
}

function editProduct(p) {
    document.getElementById('product-form').style.display = 'block';
    document.getElementById('form-title').textContent = 'Termék szerkesztése';

    document.getElementById('p-id').value = p.id;
    document.getElementById('p-name').value = p.name;
    document.getElementById('p-price').value = p.price;
    document.getElementById('p-image').value = p.image;
    document.getElementById('p-stock').value = p.stock;
    document.getElementById('p-category').value = p.category_id;
    document.getElementById('p-desc').value = p.description;
}

async function saveProduct() {
    if (!supabaseClient) return;
    
    const id = document.getElementById('p-id').value;
    const product = {
        name: document.getElementById('p-name').value,
        price: parseInt(document.getElementById('p-price').value),
        image: document.getElementById('p-image').value,
        stock: parseInt(document.getElementById('p-stock').value) || 0,
        category_id: parseInt(document.getElementById('p-category').value),
        description: document.getElementById('p-desc').value
    };

    try {
        let result;
        if (id) {
            result = await supabaseClient.from('products').update(product).eq('id', id);
        } else {
            result = await supabaseClient.from('products').insert(product);
        }

        if (result.error) throw result.error;

        showToast(id ? 'Termék frissítve!' : 'Termék hozzáadva!');
        hideProductForm();
        loadProducts();
    } catch (err) {
        console.error(err);
        showToast('Hiba a mentés során!');
    }
}

async function deleteProduct(id) {
    if (!confirm('Biztosan törlöd a terméket?') || !supabaseClient) return;

    try {
        const { error } = await supabaseClient.from('products').delete().eq('id', id);
        if (error) throw error;
        
        showToast('Termék törölve!');
        loadProducts();
    } catch (err) {
        console.error(err);
        showToast('Hiba a törlés során!');
    }
}
