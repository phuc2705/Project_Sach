const API_BASE = 'http://localhost:5000/api'; // Backend API base

// ======================= HÀM TIỆN ÍCH CHUNG =======================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    notification.style.animation = 'slideIn 0.3s';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatPrice(price) {
    return price ? price.toLocaleString('vi-VN') + 'đ' : '0đ';
}

function resolveBookImage(url){
    if (!url || url.startsWith('http://') || url.startsWith('https://')) return url || '../assets/images/book1.jpg';
    return `${API_BASE}/uploads/${url.trim()}`; 
}

function getOrderStatusName(status) {
    const statuses = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'shipping': 'Đang giao',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy',
        'returned': 'Đã hoàn trả' 
    };
    return statuses[status] || status;
}

// ======================= KHỞI TẠO VÀ ĐIỀU HƯỚNG =======================

document.addEventListener('DOMContentLoaded', () => {
    const user = localStorage.getItem('user');
    if (!user || JSON.parse(user).role.toLowerCase() !== 'admin') {
        alert('Bạn không có quyền truy cập trang Admin!');
        window.location.href = '../index.html';
        return;
    }

    setupNav();
    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../index.html';
    });
    
    loadDashboard(); 
    
    // Đăng ký event listener cho form tạo thể loại
    const createCategoryForm = document.getElementById('createCategoryForm');
    if (createCategoryForm) {
        createCategoryForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCreateCategory(false);
        });
        const saveAndAddBtn = document.getElementById('saveAndAddCategoryBtn');
        if (saveAndAddBtn) {
            saveAndAddBtn.onclick = function() {
                handleCreateCategory(true);
            };
        }
    }
});

function setupNav(){
    const links = document.querySelectorAll('.admin-sidebar a');
    links.forEach(a => a.addEventListener('click', (e)=>{
        e.preventDefault();
        links.forEach(x=>x.classList.remove('active'));
        a.classList.add('active');
        const view = a.dataset.view;
        document.querySelectorAll('.view').forEach(v=>v.style.display='none');
        document.getElementById('view-'+view).style.display = 'block';
        
        if(view === 'dashboard') loadDashboard();
        if(view === 'books') loadBooksAdmin();
        if(view === 'users') loadUsersAdmin();
        if(view === 'orders') loadOrdersAdmin();
        if(view === 'categories') loadCategoriesAdmin(); 
    }))
}

// ======================= CHỨC NĂNG TẠO THỂ LOẠI =======================

async function handleCreateCategory(resetAfterSave = false) {
    const token = localStorage.getItem('token');
    
    const categoryNameInput = document.getElementById('categoryName');
    const categoryDescriptionInput = document.getElementById('categoryDescription');
    const categoryResultDiv = document.getElementById('categoryResult');
    const newCategoryIdSpan = document.getElementById('newCategoryId');
    
    const categoryName = categoryNameInput.value.trim();
    const description = categoryDescriptionInput.value;

    if (categoryName.length === 0) {
        showNotification('Tên thể loại không được rỗng!', 'error');
        return;
    }

    const categoryData = {
        category_name: categoryName,
        description: description
    };
    
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify(categoryData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification(`Thêm thành công! ID: #${data.category_id}`, 'success');
            
            newCategoryIdSpan.textContent = data.category_id;
            categoryResultDiv.style.display = 'block';

            if (resetAfterSave) {
                categoryNameInput.value = '';
                categoryDescriptionInput.value = '';
                categoryResultDiv.style.display = 'none'; 
                categoryNameInput.focus();
            }
            
            loadCategoriesAdmin(); 
        } else {
            showNotification(data.message || 'Lỗi hệ thống khi tạo thể loại.', 'error');
        }
    } catch (error) {
        console.error('API Error:', error);
        showNotification('Lỗi kết nối hoặc lỗi hệ thống.', 'error');
    }
}

async function loadCategoriesAdmin() {
    const el = document.getElementById('categories-list-table');
    el.innerHTML = 'Đang tải danh mục...';
    try {
        const res = await fetch(`${API_BASE}/categories`);
        if (!res.ok) { el.innerHTML = '<div class="notice">Không thể tải danh mục từ API.</div>'; return; }
        const data = await res.json();
        const categories = data.categories || [];
        
        let html = '<div class="table-head"><div>ID</div><div>Tên Thể loại</div><div style="width:150px">Hành động</div></div>';
        
        categories.forEach(cat => {
            html += `<div class="category-row">
                <div>#${cat.id}</div>
                <div>${cat.name}</div>
                <div><button class="btn secondary">Sửa</button></div>
            </div>`;
        });
        
        el.innerHTML = html;
    } catch(e) {
        el.innerHTML = `<div class="notice">Lỗi kết nối: ${e.message}</div>`;
    }
}

// ======================= CÁC HÀM ADMIN KHÁC (ĐÃ SỬA: BỎ TRẢ HÀNG) =======================

async function loadDashboard(){
    const token = localStorage.getItem('token');
    
    // Tải số liệu chung
    try {
        const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers: { 'Authorization': 'Bearer ' + token } });
        const statsData = await statsRes.json();
        
        if(statsRes.ok){
            document.getElementById('stat-users').textContent = statsData.users || 0;
            document.getElementById('stat-orders').textContent = statsData.orders || 0;
            document.getElementById('stat-revenue').textContent = formatPrice(statsData.revenue);
        } else {
            document.getElementById('stat-users').textContent = 'N/A';
            document.getElementById('stat-orders').textContent = 'N/A';
            document.getElementById('stat-revenue').textContent = 'N/A';
        }
    } catch (err) {
        document.getElementById('stat-users').textContent = 'N/A';
        document.getElementById('stat-orders').textContent = 'N/A';
        document.getElementById('stat-revenue').textContent = 'N/A';
    }
    
    // Tải sách chờ duyệt
    try {
        const booksRes = await fetch(`${API_BASE}/books`);
        if (booksRes.ok){
            const booksData = await booksRes.json();
            const count = Array.isArray(booksData.books) ? booksData.books.length : 0;
            document.getElementById('stat-books').textContent = count;
            
            const pending = (booksData.books || []).filter(b => b.status === 'pending' || b.status === 'waiting' || b.status === 'chờ duyệt');
            renderPendingBooks(pending.length ? pending : (booksData.books || []).slice(0,4));
        } else {
            document.getElementById('stat-books').textContent = 'N/A';
            renderPendingBooks([]);
        }
    } catch(err){
        renderPendingBooks([]);
    }
}

function renderPendingBooks(list){
    const el = document.getElementById('pending-books');
    if(!list || list.length === 0){
        el.innerHTML = '<div class="notice">Không có sách chờ duyệt.</div>';
        return;
    }
    el.innerHTML = '';
    list.forEach(b => {
        const row = document.createElement('div');
        row.className = 'book-row';
        const img = document.createElement('img');
        img.src = resolveBookImage(b.image_url);
        img.onerror = function(){ this.src=resolveBookImage('') };
        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerHTML = `<strong>${b.title}</strong><div>${b.author || ''}</div>`;
        const actions = document.createElement('div');
        const btnApprove = document.createElement('button');
        btnApprove.className='btn'; btnApprove.textContent='Duyệt';
        btnApprove.onclick = ()=>approveBook(b.book_id || b.id);
        const btnReject = document.createElement('button');
        btnReject.className='btn secondary'; btnReject.textContent='Từ chối';
        btnReject.onclick = ()=>hideBook(b.book_id || b.id); 
        actions.appendChild(btnApprove); actions.appendChild(btnReject);
        row.appendChild(img); row.appendChild(meta); row.appendChild(actions);
        el.appendChild(row);
    })
}

async function loadBooksAdmin(){
    const el = document.getElementById('books-table');
    el.innerHTML = 'Đang tải...';
    try{
        const res = await fetch(`${API_BASE}/books`);
        if(!res.ok) { el.innerHTML = '<div class="notice">Không thể lấy danh sách sách từ API.</div>'; return; }
        const data = await res.json();
        const books = data.books || [];
        if(books.length === 0) { el.innerHTML = '<div class="notice">Không có sách.</div>'; return; }
        const head = document.createElement('div'); head.className='table-head'; head.innerHTML = '<div style="width:140px">Ảnh</div><div>Thông tin</div><div style="width:220px">Hành động</div>';
        el.innerHTML=''; el.appendChild(head);
        books.forEach(b=>{
            const row = document.createElement('div'); row.className='book-row';
            const img = document.createElement('img'); img.src = resolveBookImage(b.image_url); img.onerror = function(){ this.src=resolveBookImage('') };
            const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML=`<strong>${b.title}</strong><div>${b.author||''}</div><div style="color:#9aa6b2">${b.category||''} - ${b.stock||0} sp</div>`;
            const actions = document.createElement('div'); actions.style.textAlign='right';
            const approve = document.createElement('button'); approve.className='btn'; approve.textContent='Duyệt'; approve.onclick = ()=>approveBook(b.book_id||b.id);
            const hide = document.createElement('button'); hide.className='btn secondary'; hide.textContent='Ẩn'; hide.onclick = ()=>hideBook(b.book_id||b.id);
            actions.appendChild(approve); actions.appendChild(hide);
            row.appendChild(img); row.appendChild(meta); row.appendChild(actions);
            el.appendChild(row);
        })
    }catch(e){ el.innerHTML = '<div class="notice">Lỗi khi gọi API sách: '+e.message+'</div>' }
}

async function loadUsersAdmin(){
    const el = document.getElementById('users-table');
    el.innerHTML = 'Đang tải...';
    try{
        const res = await fetch(`${API_BASE}/admin/users`, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
        if(!res.ok) {
            el.innerHTML = `<div class="notice">Không thể lấy danh sách người dùng từ API. Mã: ${res.status}</div>`;
            return;
        }
        const data = await res.json();
        const users = data.users || [];
        if(users.length === 0){ el.innerHTML = '<div class="notice">Không có người dùng.</div>'; return; }
        const head = document.createElement('div'); head.className='table-head'; head.innerHTML = '<div style="width:140px">Tên</div><div>Thông tin</div><div style="width:220px">Hành động</div>';
        el.innerHTML=''; el.appendChild(head);
        users.forEach(u=>{
            const row = document.createElement('div'); row.className='user-row';
            const meta = document.createElement('div'); meta.className='meta'; meta.innerHTML=`<strong>${u.fullname}</strong><div>${u.email||''}</div><div style="color:#9aa6b2">${u.role||''} - ${u.status||''}</div>`;
            const actions = document.createElement('div'); actions.style.textAlign='right';
            const lock = document.createElement('button'); lock.className='btn'; lock.textContent='Khóa'; lock.onclick = async ()=>{
                if(!confirm('Khóa tài khoản này?')) return; const r = await fetch(`${API_BASE}/admin/users/lock/${u.id}`, { method: 'POST', headers: { 'Authorization':'Bearer '+localStorage.getItem('token') } }); if(r.ok){ alert('Đã khóa'); loadUsersAdmin(); } else alert('Lỗi: '+r.status);
            };
            const unlock = document.createElement('button'); unlock.className='btn secondary'; unlock.textContent='Mở khóa'; unlock.onclick = async ()=>{
                if(!confirm('Mở khóa tài khoản này?')) return; const r = await fetch(`${API_BASE}/admin/users/unlock/${u.id}`, { method: 'POST', headers: { 'Authorization':'Bearer '+localStorage.getItem('token') } }); if(r.ok){ alert('Đã mở khóa'); loadUsersAdmin(); } else alert('Lỗi: '+r.status);
            };
            actions.appendChild(lock); actions.appendChild(unlock);
            row.appendChild(meta); row.appendChild(actions);
            el.appendChild(row);
        })
    }catch(e){ el.innerHTML = '<div class="notice">Lỗi khi gọi API người dùng: '+e.message+'</div>' }
}

async function loadOrdersAdmin(){
    const el = document.getElementById('orders-table');
    el.innerHTML = 'Đang tải...';
    try{
        const res = await fetch(`${API_BASE}/admin/orders`, { headers: { 'Authorization':'Bearer '+localStorage.getItem('token') } });
        if(!res.ok){ el.innerHTML = `<div class="notice">Không thể lấy danh sách đơn hàng từ API. Mã: ${res.status}</div>`; return; }
        const data = await res.json();
        const orders = data.orders || [];
        if(orders.length === 0){ el.innerHTML = '<div class="notice">Không có đơn hàng.</div>'; return; }
        const head = document.createElement('div'); head.className='table-head'; head.innerHTML = '<div>Order ID</div><div>Thông tin</div><div style="width:100px">Trạng thái</div><div style="width:150px">Hành động</div>'; 
        el.innerHTML = ''; el.appendChild(head);
        
        orders.forEach(o=>{
            const row = document.createElement('div'); row.className='order-row';
            
            const info = document.createElement('div'); info.className='meta'; 
            info.innerHTML = `<strong>Order #${o.order_id}</strong>
                              <div>Buyer: ${o.buyer_id}</div>
                              <div style="color:#9aa6b2">${o.created_at||''}</div>`;
            
            const statusDiv = document.createElement('div'); 
            statusDiv.innerHTML = `<div class="status-${o.status}">${getOrderStatusName(o.status)}</div>
                                   <div style="font-weight:bold">${formatPrice(o.total_amount)}</div>`;
            
            // Khu vực Hành động (ĐÃ XÓA NÚT TRẢ HÀNG VÀ XÁC NHẬN)
            const actions = document.createElement('div'); actions.style.textAlign='right';
            const detailBtn = document.createElement('button');
            detailBtn.className = 'btn secondary'; 
            detailBtn.textContent = 'Chi tiết';
            detailBtn.style.marginRight = '5px';
            // actions.appendChild(detailBtn); // Hiện tại chưa có logic chi tiết đơn hàng
            
            row.appendChild(info); 
            row.appendChild(statusDiv); 
            row.appendChild(actions); 
            el.appendChild(row);
        })
    }catch(e){ el.innerHTML = '<div class="notice">Lỗi khi gọi API đơn hàng: '+e.message+'</div>' }
}

async function approveBook(bookId){
    const token = localStorage.getItem('token');
    if(!confirm('Bạn có chắc muốn duyệt sách này?')) return;
    
    try{
        const res = await fetch(`${API_BASE}/admin/books/approve/${bookId}`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token } });
        
        if(res.ok) { 
            showNotification('Duyệt thành công', 'success'); 
            loadBooksAdmin();  
            loadDashboard();   
        } else { 
            const data = await res.json();
            showNotification(data.message || `Lỗi: ${res.status}`, 'error'); 
        }
    }catch(e){ 
        showNotification('Không thể gọi endpoint duyệt sách.', 'error'); 
    }
}

async function hideBook(bookId){ 
    const token = localStorage.getItem('token');
    if(!confirm('Bạn có chắc muốn ẩn/từ chối sách này?')) return;
    
    try{
        const res = await fetch(`${API_BASE}/admin/books/hide/${bookId}`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+token } });
        
        if(res.ok) { 
            showNotification('Đã ẩn sách', 'success'); 
            loadBooksAdmin(); 
            loadDashboard(); 
        } else { 
            const data = await res.json();
            showNotification(data.message || `Lỗi: ${res.status}`, 'error'); 
        }
    }catch(e){ 
        showNotification('Không thể gọi endpoint ẩn sách.', 'error'); 
    }
}