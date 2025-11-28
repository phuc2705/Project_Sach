// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Global variables
let books = [];
let cart = [];
let currentCategory = 'all';
let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadBooks();
    loadCart();
    checkAuth();
    setupEventListeners();
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
}

// ==================== AUTHENTICATION ====================

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        updateUIForLoggedInUser();
    }
}

// Handle Login
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
            // Save token and user info
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            currentUser = data.user;
            
            alert('Đăng nhập thành công!');
            closeModal('loginModal');
            // If admin, redirect to admin interface
            if (currentUser && currentUser.role && currentUser.role.toLowerCase() === 'admin') {
                // preserve token/user in localStorage and go to admin dashboard
                window.location.href = 'admin/index.html';
                return;
            }
            updateUIForLoggedInUser();
        } else {
            alert(data.message || 'Đăng nhập thất bại!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Có lỗi xảy ra. Vui lòng thử lại sau!');
    }
}

// Handle Register
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
            alert('Đăng ký thành công! Vui lòng đăng nhập.');
            closeModal('registerModal');
            openModal('loginModal');
        } else {
            alert(data.message || 'Đăng ký thất bại!');
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Có lỗi xảy ra. Vui lòng thử lại sau!');
    }
}

// Logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    cart = [];
    updateCartCount();
    location.reload();
}

// Update UI for logged in user
function updateUIForLoggedInUser() {
    const headerActions = document.querySelector('.header-actions');
    if (headerActions && currentUser) {
        headerActions.innerHTML = `
            <a href="#" class="header-btn">
                👤 ${currentUser.fullname}
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

// ==================== BOOKS ====================

// Load books from API
async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/books`);
        const data = await response.json();
        
        if (response.ok) {
            // If API returned an empty array (DB has no products), use sample data fallback
            if (Array.isArray(data.books) && data.books.length > 0) {
                books = data.books;
                displayBooks(books);
            } else {
                // empty result — fall back to sample data so UI still shows products
                loadSampleBooks();
            }
        } else {
            // If API fails, use sample data
            loadSampleBooks();
        }
    } catch (error) {
        console.error('Error loading books:', error);
        // If API fails, use sample data
        loadSampleBooks();
    }
}

// Load sample books (fallback)
function loadSampleBooks() {
    books = [
        {
            id: 1,
            title: "Đắc Nhân Tâm",
            author: "Dale Carnegie",
            category: "kynang",
            price: 86000,
            old_price: 120000,
            rating: 4.8,
            image_url: "assets/images/book1.jpg"
        },
        {
            id: 2,
            title: "Nhà Giả Kim",
            author: "Paulo Coelho",
            category: "vanhoc",
            price: 79000,
            old_price: 99000,
            rating: 4.9,
            image_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdfHb1uiNoV-jEjkXYn7L9g3HNUbk4YwqdQA&s"
        },
        {
            id: 3,
            title: "Sapiens: Lược Sử Loài Người",
            author: "Yuval Noah Harari",
            category: "kinhte",
            price: 189000,
            old_price: 230000,
            rating: 4.7,
            image_url: "https://pos.nvncdn.com/fd5775-40602/ps/content/20240108_GXuwBhSP.jpg"
        },
        {
            id: 4,
            title: "Tư Duy Nhanh Và Chậm",
            author: "Daniel Kahneman",
            category: "kynang",
            price: 179000,
            old_price: 220000,
            rating: 4.6,
            image_url: "https://upload2.mybota.vn/uploadv2/web/17/17409/media/2024/07/01/09/06/1719799238_12665.jpg"
        },
        {
            id: 5,
            title: "Trường Ca Achilles",
            author: "Madeline Miller",
            category: "vanhoc",
            price: 135000,
            old_price: 160000,
            rating: 4.8,
            image_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSP-E2HBSM7eZq2EUxFg-4u4R-XTsCBbsLZRw&s"
        },
        {
            id: 6,
            title: "Tuổi Trẻ Đáng Giá Bao Nhiêu",
            author: "Rosie Nguyễn",
            category: "kynang",
            price: 80000,
            old_price: 95000,
            rating: 4.5,
            image_url: "https://tiki.vn/blog/wp-content/uploads/2025/08/tuoi-tre-dang-gia-bao-nhieu-1.jpg"
        },
        {
            id: 7,
            title: "Doraemon Tập 1",
            author: "Fujiko F. Fujio",
            category: "thieunhi",
            price: 25000,
            old_price: 30000,
            rating: 5.0,
            image_url: "https://upload.wikimedia.org/wikipedia/vi/thumb/b/b7/Doraemon1.jpg/250px-Doraemon1.jpg"
        },
        {
            id: 8,
            title: "Muôn Kiếp Nhân Sinh",
            author: "Nguyên Phong",
            category: "vanhoc",
            price: 189000,
            old_price: 250000,
            rating: 4.9,
            image_url: "https://pos.nvncdn.com/fd5775-40602/ps/20240508_aPnKpELWEt.png"
        }
    ];
    
    displayBooks(books);
}

// Display books
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
        // determine image src (allow empty, relative or absolute)
        const imgSrc = book.image_url && book.image_url.trim() !== '' ? book.image_url : 'assets/images/book1.jpg';
        // create card with <img>; fallback to local placeholder onerror
        bookCard.innerHTML = `
            <div class="book-image">
                <img src="${imgSrc}" alt="${book.title}" onerror="this.onerror=null;this.src='assets/images/book1.jpg'" />
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
                <div class="book-rating">⭐ ${book.rating} / 5.0</div>
                <div class="book-price">
                    ${formatPrice(book.price)}
                    <span class="book-old-price">${formatPrice(book.old_price)}</span>
                </div>
                <button class="add-to-cart-btn" onclick="addToCart(${book.id})">
                    Thêm vào giỏ hàng
                </button>
            </div>
        `;
        bookGrid.appendChild(bookCard);
    });
}

// Filter by category
function filterCategory(category) {
    currentCategory = category;
    
    // Update active button
    const buttons = document.querySelectorAll('.category-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Filter books
    const filtered = category === 'all' 
        ? books 
        : books.filter(book => book.category === category);
    
    displayBooks(filtered);
}

// Search books
function searchBooks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        displayBooks(books);
        return;
    }
    
    const filtered = books.filter(book => 
        book.title.toLowerCase().includes(searchTerm) ||
        book.author.toLowerCase().includes(searchTerm)
    );
    
    displayBooks(filtered);
}

// ==================== CART ====================

// Load cart from localStorage
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Add to cart
async function addToCart(bookId) {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để thêm sách vào giỏ hàng!');
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
    
    // Show success message
    showNotification(`Đã thêm "${book.title}" vào giỏ hàng!`, 'success');
}

// Remove from cart
function removeFromCart(bookId) {
    cart = cart.filter(item => item.id !== bookId);
    updateCartCount();
    saveCart();
    viewCart(); // Refresh cart view
}

// Update quantity
function updateQuantity(bookId, change) {
    const item = cart.find(item => item.id === bookId);
    if (!item) return;

    item.quantity += change;
    
    if (item.quantity <= 0) {
        removeFromCart(bookId);
    } else {
        updateCartCount();
        saveCart();
        viewCart(); // Refresh cart view
    }
}

// Update cart count
function updateCartCount() {
    const cartCountElement = document.getElementById('cartCount');
    if (cartCountElement) {
        const count = cart.reduce((total, item) => total + item.quantity, 0);
        cartCountElement.textContent = count;
    }
}

// View cart
function viewCart() {
    if (cart.length === 0) {
        alert('Giỏ hàng của bạn đang trống!');
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

    // Create modal for cart
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

// Checkout
async function checkout() {
    if (!currentUser) {
        alert('Vui lòng đăng nhập để thanh toán!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const orderData = {
        user_id: currentUser.id,
        items: cart.map(item => ({
            book_id: item.id,
            quantity: item.quantity,
            price: item.price
        })),
        total: total
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
            alert('Đặt hàng thành công! Mã đơn hàng: ' + data.order_id);
            cart = [];
            saveCart();
            updateCartCount();
            location.reload();
        } else {
            alert(data.message || 'Đặt hàng thất bại!');
        }
    } catch (error) {
        console.error('Checkout error:', error);
        alert('Có lỗi xảy ra khi đặt hàng!');
    }
}

// ==================== UTILITY FUNCTIONS ====================

// Format price
function formatPrice(price) {
    return price.toLocaleString('vi-VN') + 'đ';
}

// Show notification
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

// Open modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}