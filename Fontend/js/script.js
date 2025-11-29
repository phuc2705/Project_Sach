// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Global variables
let books = [];
let cart = [];
let currentCategory = 'all';
let currentUser = null;
let currentFilters = {
    category: 'all',
    minPrice: null,
    maxPrice: null,
    condition: null,
    sortBy: 'created_at'
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    loadCart();
    checkAuth();
    setupEventListeners();
    loadCategories();
});

// Setup Event Listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Search on Enter key
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchBooks();
            }
        });
    }

    // Advanced search button
    const advancedSearchBtn = document.getElementById('advancedSearchBtn');
    if (advancedSearchBtn) {
        advancedSearchBtn.addEventListener('click', openAdvancedSearch);
    }
}

// ==================== AUTHENTICATION ====================

function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const credentials = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(credentials)
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            showNotification('Đăng nhập thành công!', 'success');
            closeModal('loginModal');
            
            if (currentUser && currentUser.role && currentUser.role.toLowerCase() === 'admin') {
                window.location.href = 'admin/index.html';
                return;
            }
            updateUIForLoggedInUser();
        } else {
            showNotification(data.message || 'Đăng nhập thất bại!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Có lỗi xảy ra. Vui lòng thử lại sau!', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        fullname: formData.get('fullname'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
            closeModal('registerModal');
            openModal('loginModal');
        } else {
            showNotification(data.message || 'Đăng ký thất bại!', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Có lỗi xảy ra. Vui lòng thử lại sau!', 'error');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    cart = [];
    updateCartCount();
    location.reload();
}

function updateUIForLoggedInUser() {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && currentUser) {
        headerActions.innerHTML = `
            <a href="#" class="header-btn">
                👤 ${currentUser.fullname}
            </a>
            <a href="#" class="header-btn" onclick="viewOrders()">
                📦 Đơn hàng
            </a>
            <a href="#" class="header-btn" onclick="logout()">
                🚪 Đăng xuất
            </a>
            <a href="#" class="header-btn" onclick="viewCart()">
                🛒 Giỏ hàng <span class="cart-count" id="cartCount">0</span>
            </a>
        `;
        updateCartCount();
    }
}

// ==================== CATEGORIES ====================

async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories`);
        const data = await response.json();
        
        if (response.ok && data.categories) {
            renderCategoryButtons(data.categories);
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

function renderCategoryButtons(categories) {
    const categoriesContainer = document.querySelector('.categories');
    if (!categoriesContainer) return;
    
    categoriesContainer.innerHTML = `
        <button class="category-btn active" onclick="filterCategory('all')">Tất cả</button>
    `;
    
    categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = cat.name;
        btn.onclick = () => filterCategory(cat.name);
        categoriesContainer.appendChild(btn);
    });
}

// ==================== BOOKS ====================

async function loadBooks() {
    try {
        let url = `${API_BASE_URL}/books?`;
        
        if (currentFilters.category !== 'all') {
            url += `category=${encodeURIComponent(currentFilters.category)}&`;
        }
        if (currentFilters.minPrice) {
            url += `min_price=${currentFilters.minPrice}&`;
        }
        if (currentFilters.maxPrice) {
            url += `max_price=${currentFilters.maxPrice}&`;
        }
        if (currentFilters.condition) {
            url += `condition=${currentFilters.condition}&`;
        }
        url += `sort_by=${currentFilters.sortBy}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (response.ok) {
            if (Array.isArray(data.books) && data.books.length > 0) {
                books = data.books;
                displayBooks(books);
            } else {
                loadSampleBooks();
            }
        } else {
            loadSampleBooks();
        }
    } catch (error) {
        console.error('Error loading books:', error);
        loadSampleBooks();
    }
}

function loadSampleBooks() {
    books = [
        {
            id: 1,
            title: "Đắc Nhân Tâm",
            author: "Dale Carnegie",
            category: "",
            price: 86000,
            old_price: 120000,
            rating: 4.8,
            image_url: "assets/images/book1.jpg",
            isbn: "978-0671027032",
            condition: "new",
            description: "Cuốn sách kinh điển về nghệ thuật giao tiếp và ứng xử"
        },
        {
            id: 2,
            title: "Nhà Giả Kim",
            author: "Paulo Coelho",
            category: "",
            price: 79000,
            old_price: 99000,
            rating: 4.9,
            image_url: "assets/images/book2.jpg",
            isbn: "978-0062315007",
            condition: "new",
            description: "Hành trình tìm kiếm kho báu và ý nghĩa cuộc sống"
        },
        {
            id: 3,
            title: "It - Gã Hề Ma Quái",
            author: "Stephen King",
            category: "",
            price: 195000,
            old_price: 250000,
            rating: 4.9,
            image_url: "https://salt.tikicdn.com/cache/w1200/ts/product/5e/18/24/2a6154ba08df6ce6161c13f4303fa19e.jpg",
            isbn: "978-1501175466",
            condition: "new",
            description: "Câu chuyện kinh dị về chú hề Pennywise đáng sợ"
        }
    ];
    
    displayBooks(books);
}

function displayBooks(booksToShow) {
    const bookGrid = document.getElementById('bookGrid');
    if (!bookGrid) return;
    
    bookGrid.innerHTML = '';

    if (booksToShow.length === 0) {
        bookGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px; color: #7f8c8d;">Không tìm thấy sách nào!</p>';
        return;
    }

    booksToShow.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'book-card';
        bookCard.onclick = () => viewBookDetail(book.id);
        
        const imgSrc = book.image_url && book.image_url.trim() !== '' ? book.image_url : 'assets/images/book1.jpg';
        const conditionBadge = book.condition === 'used' ? '<span class="condition-badge">Cũ</span>' : '<span class="condition-badge new">Mới</span>';
        
        bookCard.innerHTML = `
            <div class="book-image">
                <img src="${imgSrc}" alt="${book.title}" onerror="this.onerror=null;this.src='assets/images/book1.jpg'" />
                ${conditionBadge}
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
                <div class="book-rating">⭐ ${book.rating} / 5.0</div>
                <div class="book-price">
                    ${formatPrice(book.price)}
                    ${book.old_price ? `<span class="book-old-price">${formatPrice(book.old_price)}</span>` : ''}
                </div>
                <button class="add-to-cart-btn" onclick="event.stopPropagation(); addToCart(${book.id})">
                    Thêm vào giỏ hàng
                </button>
            </div>
        `;
        bookGrid.appendChild(bookCard);
    });
}

// ==================== BOOK DETAIL ====================

async function viewBookDetail(bookId) {
    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
        const book = await response.json();
        
        if (!response.ok) {
            showNotification('Không thể tải thông tin sách!', 'error');
            return;
        }
        
        showBookDetailModal(book);
    } catch (error) {
        console.error('Error loading book detail:', error);
        showNotification('Có lỗi xảy ra khi tải thông tin sách!', 'error');
    }
}

function showBookDetailModal(book) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const reviewsHTML = book.reviews && book.reviews.length > 0 
        ? book.reviews.map(review => `
            <div class="review-item">
                <div class="review-header">
                    <strong>${review.user_name}</strong>
                    <span class="review-rating">⭐ ${review.rating}/5</span>
                </div>
                <p class="review-comment">${review.comment || 'Không có nhận xét'}</p>
                <small class="review-date">${new Date(review.created_at).toLocaleDateString('vi-VN')}</small>
            </div>
        `).join('')
        : '<p style="text-align: center; color: #7f8c8d;">Chưa có đánh giá nào</p>';
    
    modal.innerHTML = `
        <div class="modal-content book-detail-modal">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div class="book-detail-container">
                <div class="book-detail-left">
                    <img src="${book.image_url || 'assets/images/book1.jpg'}" alt="${book.title}" 
                         onerror="this.src='assets/images/book1.jpg'" class="book-detail-image">
                    <div class="book-meta">
                        <p><strong>ISBN:</strong> ${book.isbn || 'N/A'}</p>
                        <p><strong>Nhà xuất bản:</strong> ${book.publisher || 'N/A'}</p>
                        <p><strong>Năm xuất bản:</strong> ${book.publish_year || 'N/A'}</p>
                        <p><strong>Tình trạng:</strong> ${book.condition === 'new' ? 'Mới' : 'Cũ'}</p>
                        <p><strong>Còn lại:</strong> ${book.stock} cuốn</p>
                    </div>
                </div>
                <div class="book-detail-right">
                    <h2>${book.title}</h2>
                    <p class="book-detail-author">Tác giả: ${book.author}</p>
                    <div class="book-detail-rating">
                        <span class="rating-stars">⭐⭐⭐⭐⭐</span>
                        <span>${book.rating}/5.0 (${book.reviews ? book.reviews.length : 0} đánh giá)</span>
                    </div>
                    <div class="book-detail-price">
                        <span class="current-price">${formatPrice(book.price)}</span>
                        ${book.old_price ? `<span class="old-price">${formatPrice(book.old_price)}</span>` : ''}
                    </div>
                    <div class="book-detail-description">
                        <h3>Mô tả sản phẩm</h3>
                        <p>${book.description || 'Chưa có mô tả'}</p>
                    </div>
                    <div class="book-detail-actions">
                        <button class="btn-add-cart" onclick="addToCart(${book.id}); this.parentElement.parentElement.parentElement.parentElement.remove();">
                            🛒 Thêm vào giỏ hàng
                        </button>
                        <button class="btn-buy-now" onclick="buyNow(${book.id})">
                            ⚡ Mua ngay
                        </button>
                    </div>
                    <div class="reviews-section">
                        <h3>Đánh giá từ khách hàng</h3>
                        ${currentUser ? `
                            <div class="add-review">
                                <h4>Viết đánh giá của bạn</h4>
                                <select id="reviewRating" class="review-rating-select">
                                    <option value="5">⭐⭐⭐⭐⭐ Xuất sắc</option>
                                    <option value="4">⭐⭐⭐⭐ Tốt</option>
                                    <option value="3">⭐⭐⭐ Trung bình</option>
                                    <option value="2">⭐⭐ Kém</option>
                                    <option value="1">⭐ Rất kém</option>
                                </select>
                                <textarea id="reviewComment" placeholder="Nhập nhận xét của bạn..." rows="3"></textarea>
                                <button onclick="submitReview(${book.id})">Gửi đánh giá</button>
                            </div>
                        ` : '<p style="text-align: center; margin: 20px 0;">Vui lòng đăng nhập để đánh giá</p>'}
                        <div class="reviews-list">
                            ${reviewsHTML}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

async function submitReview(bookId) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để đánh giá!', 'error');
        return;
    }
    
    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}/review`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ rating: parseFloat(rating), comment })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Cảm ơn bạn đã đánh giá!', 'success');
            document.querySelector('.modal').remove();
            viewBookDetail(bookId);
        } else {
            showNotification(data.message || 'Không thể gửi đánh giá!', 'error');
        }
    } catch (error) {
        console.error('Submit review error:', error);
        showNotification('Có lỗi xảy ra!', 'error');
    }
}

// ==================== SEARCH & FILTER ====================

function searchBooks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        loadBooks();
        return;
    }
    
    const filtered = books.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm) ||
        (book.isbn && book.isbn.toLowerCase().includes(searchTerm))
    );
    
    displayBooks(filtered);
}

function openAdvancedSearch() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2 style="margin-bottom: 20px;">Tìm kiếm nâng cao</h2>
            <div class="advanced-search-form">
                <div class="form-group">
                    <label>Khoảng giá</label>
                    <div style="display: flex; gap: 10px;">
                        <input type="number" id="minPrice" placeholder="Từ" style="width: 48%;">
                        <input type="number" id="maxPrice" placeholder="Đến" style="width: 48%;">
                    </div>
                </div>
                <div class="form-group">
                    <label>Tình trạng</label>
                    <select id="conditionFilter">
                        <option value="">Tất cả</option>
                        <option value="new">Mới</option>
                        <option value="used">Cũ</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Sắp xếp theo</label>
                    <select id="sortBy">
                        <option value="created_at">Mới nhất</option>
                        <option value="price_asc">Giá tăng dần</option>
                        <option value="price_desc">Giá giảm dần</option>
                        <option value="rating">Đánh giá cao nhất</option>
                        <option value="name">Tên A-Z</option>
                    </select>
                </div>
                <button class="form-btn" onclick="applyAdvancedFilter()">Áp dụng</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function applyAdvancedFilter() {
    currentFilters.minPrice = document.getElementById('minPrice').value || null;
    currentFilters.maxPrice = document.getElementById('maxPrice').value || null;
    currentFilters.condition = document.getElementById('conditionFilter').value || null;
    currentFilters.sortBy = document.getElementById('sortBy').value;
    
    document.querySelector('.modal').remove();
    loadBooks();
}

function filterCategory(category) {
    currentFilters.category = category;
    currentCategory = category;
    
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadBooks();
}

// ==================== CART ====================

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

async function addToCart(bookId) {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để thêm sách vào giỏ hàng!', 'error');
        openModal('loginModal');
        return;
    }

    const book = books.find(b => b.id === bookId);
    if (!book) return;

    const existingItem = cart.find(item => item.id === bookId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ ...book, quantity: 1 });
    }

    updateCartCount();
    saveCart();
    
    showNotification(`Đã thêm "${book.title}" vào giỏ hàng!`, 'success');
}

function removeFromCart(bookId) {
    cart = cart.filter(item => item.id !== bookId);
    updateCartCount();
    saveCart();
    viewCart();
}

function updateQuantity(bookId, change) {
    const item = cart.find(item => item.id === bookId);
    if (!item) return;

    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(bookId);
    } else {
        updateCartCount();
        saveCart();
        viewCart();
    }
}

function updateCartCount() {
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        cartCountElement.textContent = count;
    }
}

function viewCart() {
    if (cart.length === 0) {
        showNotification('Giỏ hàng của bạn đang trống!', 'info');
        return;
    }

    let cartHTML = '<div style="max-width: 800px; margin: 0 auto; padding: 20px;">';
    cartHTML += '<h2 style="color: #2c3e50; margin-bottom: 20px;">🛒 Giỏ hàng của bạn</h2>';
    
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        cartHTML += `
            <div style="background: white; padding: 15px; margin-bottom: 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div>
                    <h3 style="color: #2c3e50; margin-bottom: 5px;">${item.title}</h3>
                    <p style="color: #7f8c8d; font-size: 14px;">Tác giả: ${item.author}</p>
                    <div style="margin-top: 10px;">
                        <button onclick="updateQuantity(${item.id}, -1)" style="padding: 5px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">-</button>
                        <span style="margin: 0 15px; font-weight: bold;">${item.quantity}</span>
                        <button onclick="updateQuantity(${item.id}, 1)" style="padding: 5px 12px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer;">+</button>
                    </div>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 18px; font-weight: bold; color: #e74c3c;">${formatPrice(itemTotal)}</p>
                    <p style="font-size: 14px; color: #7f8c8d;">${formatPrice(item.price)} x ${item.quantity}</p>
                    <button onclick="removeFromCart(${item.id})" style="margin-top: 10px; padding: 5px 15px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">Xóa</button>
                </div>
            </div>
        `;
    });

    cartHTML += `
        <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <h3 style="margin-bottom: 10px;">Tổng cộng: ${formatPrice(total)}</h3>
            <button onclick="checkout()" style="width: 100%; padding: 12px; background: #e74c3c; color: white; border: none; border-radius: 5px; font-size: 16px; font-weight: bold; cursor: pointer; margin-top: 10px;">Thanh toán</button>
        </div>
    `;
    cartHTML += '</div>';

    const cartModal = document.createElement('div');
    cartModal.className = 'modal';
    cartModal.style.display = 'flex';
    cartModal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 80vh; overflow-y: auto;">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            ${cartHTML}
        </div>
    `;
    document.body.appendChild(cartModal);
}

function buyNow(bookId) {
    addToCart(bookId);
    setTimeout(() => {
        checkout();
    }, 500);
}

// ==================== CHECKOUT ====================

function checkout() {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập để thanh toán!', 'error');
        return;
    }

    if (cart.length === 0) {
        showNotification('Giỏ hàng trống!', 'error');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Close cart modal if open
    const existingModal = document.querySelector('.modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content checkout-modal">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2 style="margin-bottom: 20px; color: #2c3e50;">Thông tin đặt hàng</h2>
            <form id="checkoutForm">
                <div class="form-group">
                    <label>Họ và tên</label>
                    <input type="text" name="fullname" value="${currentUser.fullname}" required>
                </div>
                <div class="form-group">
                    <label>Số điện thoại</label>
                    <input type="tel" name="phone" value="${currentUser.phone || ''}" required>
                </div>
                <div class="form-group">
                    <label>Địa chỉ giao hàng</label>
                    <textarea name="shipping_address" rows="3" required placeholder="Số nhà, đường, phường, quận/huyện, tỉnh/thành phố"></textarea>
                </div>
                <div class="form-group">
                    <label>Phương thức thanh toán</label>
                    <select name="payment_method" required>
                        <option value="COD">💵 Thanh toán khi nhận hàng (COD)</option>
                        <option value="BANK">🏦 Chuyển khoản ngân hàng</option>
                        <option value="MOMO">📱 Ví MoMo</option>
                        <option value="VNPAY">💳 VNPay</option>
                        <option value="ZALOPAY">💰 ZaloPay</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Ghi chú (Tùy chọn)</label>
                    <textarea name="notes" rows="2" placeholder="Ghi chú cho người bán..."></textarea>
                </div>
                <div class="order-summary">
                    <h3>Đơn hàng của bạn</h3>
                    ${cart.map(item => `
                        <div class="order-item">
                            <span>${item.title} x ${item.quantity}</span>
                            <span>${formatPrice(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                    <div class="order-total">
                        <strong>Tổng cộng:</strong>
                        <strong style="color: #e74c3c; font-size: 20px;">${formatPrice(total)}</strong>
                    </div>
                </div>
                <button type="submit" class="form-btn" style="background: #27ae60;">Xác nhận đặt hàng</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);
}

async function handleCheckout(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderData = {
        items: cart.map(item => ({
            book_id: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        total: total,
        shipping_address: formData.get('shipping_address'),
        phone: formData.get('phone'),
        payment_method: formData.get('payment_method'),
        notes: formData.get('notes')
    };

    try {
        const response = await fetch(`${API_BASE_URL}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Đặt hàng thành công! Mã đơn hàng: #' + data.order_id, 'success');
            cart = [];
            saveCart();
            updateCartCount();
            document.querySelector('.modal').remove();
            
            // Show order confirmation
            setTimeout(() => {
                showOrderConfirmation(data.order_id, orderData);
            }, 500);
        } else {
            showNotification(data.message || 'Đặt hàng thất bại!', 'error');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Có lỗi xảy ra khi đặt hàng!', 'error');
    }
}

function showOrderConfirmation(orderId, orderData) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    modal.innerHTML = `
        <div class="modal-content">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 60px; color: #27ae60; margin-bottom: 20px;">✓</div>
                <h2 style="color: #27ae60; margin-bottom: 10px;">Đặt hàng thành công!</h2>
                <p style="font-size: 18px; color: #2c3e50; margin-bottom: 20px;">Mã đơn hàng: <strong>#${orderId}</strong></p>
                <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; text-align: left; margin-bottom: 20px;">
                    <p><strong>Phương thức thanh toán:</strong> ${getPaymentMethodName(orderData.payment_method)}</p>
                    <p><strong>Địa chỉ giao hàng:</strong> ${orderData.shipping_address}</p>
                    <p><strong>Số điện thoại:</strong> ${orderData.phone}</p>
                </div>
                <p style="color: #7f8c8d; margin-bottom: 20px;">
                    Chúng tôi sẽ liên hệ với bạn sớm nhất để xác nhận đơn hàng.
                </p>
                <button class="form-btn" onclick="this.parentElement.parentElement.parentElement.remove()">Đóng</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function getPaymentMethodName(method) {
    const methods = {
        'COD': 'Thanh toán khi nhận hàng',
        'BANK': 'Chuyển khoản ngân hàng',
        'MOMO': 'Ví MoMo',
        'VNPAY': 'VNPay',
        'ZALOPAY': 'ZaloPay'
    };
    return methods[method] || method;
}

// ==================== VIEW ORDERS ====================

async function viewOrders() {
    if (!currentUser) {
        showNotification('Vui lòng đăng nhập!', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/orders/user`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showOrdersModal(data.orders);
        } else {
            showNotification(data.message || 'Không thể tải đơn hàng!', 'error');
        }
    } catch (error) {
        console.error('View orders error:', error);
        showNotification('Có lỗi xảy ra!', 'error');
    }
}

function showOrdersModal(orders) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';
    
    const ordersHTML = orders.length > 0 
        ? orders.map(order => `
            <div class="order-card">
                <div class="order-header">
                    <h3>Đơn hàng #${order.order_id}</h3>
                    <span class="order-status status-${order.status}">${getOrderStatusName(order.status)}</span>
                </div>
                <div class="order-info">
                    <p><strong>Tổng tiền:</strong> ${formatPrice(order.total_amount)}</p>
                    <p><strong>Phương thức:</strong> ${getPaymentMethodName(order.payment_method)}</p>
                    <p><strong>Ngày đặt:</strong> ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
                    <p><strong>Địa chỉ:</strong> ${order.shipping_address}</p>
                </div>
            </div>
        `).join('')
        : '<p style="text-align: center; color: #7f8c8d; padding: 40px;">Bạn chưa có đơn hàng nào</p>';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 80vh; overflow-y: auto;">
            <span class="modal-close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            <h2 style="margin-bottom: 20px; color: #2c3e50;">📦 Đơn hàng của bạn</h2>
            <div class="orders-list">
                ${ordersHTML}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function getOrderStatusName(status) {
    const statuses = {
        'pending': 'Chờ xác nhận',
        'confirmed': 'Đã xác nhận',
        'shipping': 'Đang giao',
        'delivered': 'Đã giao',
        'cancelled': 'Đã hủy'
    };
    return statuses[status] || status;
}

// ==================== UTILITY FUNCTIONS ====================

function formatPrice(price) {
    return price.toLocaleString('vi-VN') + 'đ';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '80px';
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

// ==================== MODAL FUNCTIONS ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}