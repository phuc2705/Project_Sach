const API_BASE = 'http://localhost:5000/api'; // backend API base

document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  document.getElementById('btnLogout').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '../index.html';
  });
  loadDashboard();
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
  }))
}

async function loadDashboard(){
  // Attempt to fetch available stats from backend. If endpoints missing, show fallback messages.
  try {
    const booksRes = await fetch(`${API_BASE}/books`);
    if (booksRes.ok){
      const booksData = await booksRes.json();
      const count = Array.isArray(booksData.books) ? booksData.books.length : (booksData.books && booksData.books.length) || '-';
      document.getElementById('stat-books').textContent = count;
      const pending = (booksData.books || []).filter(b => b.status === 'pending' || b.status === 'waiting' || b.status === 'chờ duyệt');
      renderPendingBooks(pending.length ? pending : (booksData.books || []).slice(0,4));
    } else {
      document.getElementById('stat-books').textContent = 'N/A';
      renderPendingBooks([]);
    }
  } catch(err){
    console.warn('Books stat not available', err);
    document.getElementById('stat-books').textContent = 'N/A';
    renderPendingBooks([]);
  }

  // Users, orders, revenue - backend endpoints may not exist. Use placeholders.
  document.getElementById('stat-users').textContent = 'N/A';
  document.getElementById('stat-orders').textContent = 'N/A';
  document.getElementById('stat-revenue').textContent = 'N/A';
}

function renderPendingBooks(list){
  const el = document.getElementById('pending-books');
  if(!list || list.length === 0){
    el.innerHTML = '<div class="notice">Không có sách chờ duyệt hoặc backend chưa cung cấp trạng thái. Vui lòng kiểm tra API.</div>';
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
    btnReject.onclick = ()=>rejectBook(b.book_id || b.id);
    actions.appendChild(btnApprove); actions.appendChild(btnReject);
    row.appendChild(img); row.appendChild(meta); row.appendChild(actions);
    el.appendChild(row);
  })
}

function resolveBookImage(url){
  // Normalize image url so admin page resolves relative paths correctly
  if(!url) return '../assets/images/book1.jpg';
  const trimmed = url.trim();
  if(trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) return trimmed;
  if(trimmed.startsWith('/')) return '..' + trimmed; // root-relative
  // relative path from admin folder -> prefix ../
  return '../' + trimmed;
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
    const head = document.createElement('div'); head.className='table-head'; head.innerHTML = '<div>Order ID</div><div>Thông tin</div><div style="width:220px">Trạng thái</div>';
    el.innerHTML = ''; el.appendChild(head);
    orders.forEach(o=>{
      const row = document.createElement('div'); row.className='order-row';
      const info = document.createElement('div'); info.className='meta'; info.innerHTML = `<strong>Order #${o.order_id}</strong><div>Buyer: ${o.buyer_id}</div><div style="color:#9aa6b2">${o.created_at||''}</div>`;
      const status = document.createElement('div'); status.style.textAlign='right'; status.innerHTML = `<div>${o.status}</div><div style="font-weight:bold">${o.total_amount||0}</div>`;
      row.appendChild(info); row.appendChild(status); el.appendChild(row);
    })
  }catch(e){ el.innerHTML = '<div class="notice">Lỗi khi gọi API đơn hàng: '+e.message+'</div>' }
}

// Placeholder admin actions - will call endpoints when implemented
async function approveBook(bookId){
  if(!confirm('Bạn có chắc muốn duyệt sách này?')) return;
  // try to call admin API
  try{
  const res = await fetch(`${API_BASE}/admin/books/approve/${bookId}`, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer '+localStorage.getItem('token') } });
    if(res.ok) { alert('Duyệt thành công'); loadBooksAdmin(); } else { alert('API chưa hỗ trợ hoặc lỗi: '+res.status); }
  }catch(e){ alert('Không thể gọi endpoint duyệt sách: '+e.message); }
}
async function rejectBook(bookId){ alert('Chức năng từ chối sách cần endpoint backend.'); }
async function hideBook(bookId){ alert('Chức năng Ẩn sách cần endpoint backend.'); }
