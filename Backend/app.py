from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pyodbc
import hashlib
import jwt
import datetime
from functools import wraps
import os
from config import Config 

app = Flask(__name__)
# Đã tải cấu hình từ config.py
app.config.from_object(Config) 
CORS(app)

# Thiết lập thư mục chứa file ảnh được upload
UPLOAD_DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

# ==================== DATABASE CONNECTION ====================

def get_db_connection():
    """Kết nối đến SQL Server (Sử dụng tên Server cứng để đảm bảo hoạt động)"""
    try:
        conn = pyodbc.connect(
            'DRIVER={SQL Server};'
            'SERVER=PHUCDEPTRAI\\PHUCNGUYENTRONG;' 
            'DATABASE=BookStoreDBO;'
            'Trusted_Connection=yes;'
        )
        conn.autocommit = False # Tắt autocommit để quản lý transaction bằng commit/rollback
        return conn
    except Exception as e:
        print(f"Database connection error: {e}") 
        return None

# ==================== AUTHENTICATION DECORATOR ====================

def token_required(f):
    """Decorator: Kiểm tra JWT token hợp lệ"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split(' ')
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
        
        return f(current_user_id, *args, **kwargs)
    return decorated

def admin_required(f):
    """Decorator: Kiểm tra JWT token và quyền ADMIN"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split(' ')
            if len(parts) == 2 and parts[0].lower() == 'bearer':
                token = parts[1]

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401

        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500

        cursor = conn.cursor()
        try:
            cursor.execute("SELECT role, status FROM Users WHERE user_id = ?", (current_user_id,))
            row = cursor.fetchone()
            if not row or row[1] != 'active' or row[0].lower() != 'admin':
                return jsonify({'message': 'Yêu cầu quyền admin!'}), 403
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

        return f(current_user_id, *args, **kwargs)
    return decorated

# ==================== UTILITY FUNCTIONS ====================
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id):
    token = jwt.encode({
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    return token

# ==================== STATIC FILE ROUTE ====================

@app.route('/api/uploads/<path:filename>')
def uploaded_file(filename):
    if not os.path.isdir(UPLOAD_DIRECTORY):
        os.makedirs(UPLOAD_DIRECTORY)
        
    return send_from_directory(UPLOAD_DIRECTORY, filename)

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Đăng ký tài khoản mới"""
    conn = None
    cursor = None
    try:
        data = request.get_json()
        fullname = data.get('fullname')
        email = data.get('email')
        phone = data.get('phone')
        password = data.get('password')
        
        if not all([fullname, email, phone, password]):
            return jsonify({'message': 'Vui lòng điền đầy đủ thông tin!'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("SELECT user_id FROM Users WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({'message': 'Email đã được đăng ký!'}), 400
        
        hashed_password = hash_password(password)
        cursor.execute("""
            INSERT INTO Users (fullname, email, phone, password, role, status, created_at)
            VALUES (?, ?, ?, ?, 'buyer', 'active', GETDATE())
        """, (fullname, email, phone, hashed_password))
        
        conn.commit()
        
        return jsonify({'message': 'Đăng ký thành công!'}), 201
        
    except Exception as e:
        print(f"Register error: {e}")
        if conn and not conn.autocommit:
            conn.rollback()
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Đăng nhập"""
    conn = None
    cursor = None
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not all([email, password]):
            return jsonify({'message': 'Vui lòng điền đầy đủ thông tin!'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        hashed_password = hash_password(password)
        
        cursor.execute("""
            SELECT user_id, fullname, email, phone, role, status
            FROM Users
            WHERE email = ? AND password = ?
        """, (email, hashed_password))
        
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'message': 'Email hoặc mật khẩu không đúng!'}), 401
        
        if user[5] != 'active':
            return jsonify({'message': 'Tài khoản đã bị khóa!'}), 403
        
        token = generate_token(user[0])
        
        return jsonify({
            'message': 'Đăng nhập thành công!',
            'token': token,
            'user': {
                'id': user[0],
                'fullname': user[1],
                'email': user[2],
                'phone': user[3],
                'role': user[4]
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==================== BOOK ROUTES (KHÔNG ĐỔI) ====================

@app.route('/api/books', methods=['GET'])
def get_books():
    """Lấy danh sách sách với tìm kiếm và lọc nâng cao"""
    conn = None
    cursor = None
    try:
        # Lấy parameters
        category = request.args.get('category')
        search = request.args.get('search')
        isbn = request.args.get('isbn')
        author = request.args.get('author')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        condition = request.args.get('condition')
        sort_by = request.args.get('sort_by', 'created_at')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        query = """
            SELECT b.book_id, b.title, b.author, b.price, b.old_price, 
                   b.description, b.stock, b.rating, b.image_url, c.category_name,
                   b.isbn, b.condition, b.publisher, b.publish_year
            FROM Books b
            LEFT JOIN Categories c ON b.category_id = c.category_id
            WHERE b.status = 'approved'
        """
        
        params = []
        
        if search:
            query += " AND (b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        
        if isbn:
            query += " AND b.isbn = ?"
            params.append(isbn)
            
        if author:
            query += " AND b.author LIKE ?"
            params.append(f'%{author}%')
        
        if category:
            query += " AND c.category_name = ?"
            params.append(category)
        
        if min_price:
            query += " AND b.price >= ?"
            params.append(float(min_price))
        
        if max_price:
            query += " AND b.price <= ?"
            params.append(float(max_price))
        
        if condition:
            query += " AND b.condition = ?"
            params.append(condition)
        
        if sort_by == 'price_asc':
            query += " ORDER BY b.price ASC"
        elif sort_by == 'price_desc':
            query += " ORDER BY b.price DESC"
        elif sort_by == 'rating':
            query += " ORDER BY b.rating DESC"
        elif sort_by == 'name':
            query += " ORDER BY b.title ASC"
        else:
            query += " ORDER BY b.created_at DESC"
        
        cursor.execute(query, params)
        books = cursor.fetchall()
        
        books_list = []
        for book in books:
            books_list.append({
                'id': book[0],
                'title': book[1],
                'author': book[2],
                'price': float(book[3]) if book[3] else 0,
                'old_price': float(book[4]) if book[4] else 0,
                'description': book[5],
                'stock': book[6],
                'rating': float(book[7]) if book[7] else 0.0,
                'image_url': book[8],
                'category': book[9],
                'isbn': book[10] if len(book) > 10 else None,
                'condition': book[11] if len(book) > 11 else 'new',
                'publisher': book[12] if len(book) > 12 else None,
                'publish_year': book[13] if len(book) > 13 else None
            })
        
        return jsonify({'books': books_list}), 200
        
    except Exception as e:
        print(f"Get books error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book_detail(book_id):
    """Lấy chi tiết sách với reviews"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT b.book_id, b.title, b.author, b.price, b.old_price,
                   b.description, b.stock, b.rating, b.image_url, 
                   c.category_name, u.fullname as seller_name,
                   b.isbn, b.condition, b.publisher, b.publish_year
            FROM Books b
            LEFT JOIN Categories c ON b.category_id = c.category_id
            LEFT JOIN Users u ON b.seller_id = u.user_id
            WHERE b.book_id = ? AND b.status = 'approved'
        """, (book_id,))
        
        book = cursor.fetchone()
        
        if not book:
            return jsonify({'message': 'Không tìm thấy sách!'}), 404
        
        # Lấy reviews
        cursor.execute("""
            SELECT r.rating, r.comment, r.created_at, u.fullname
            FROM Reviews r
            LEFT JOIN Users u ON r.user_id = u.user_id
            WHERE r.book_id = ?
            ORDER BY r.created_at DESC
        """, (book_id,))
        
        reviews = cursor.fetchall()
        reviews_list = []
        for review in reviews:
            reviews_list.append({
                'rating': float(review[0]) if review[0] else 0,
                'comment': review[1],
                'created_at': review[2].strftime('%Y-%m-%d %H:%M:%S') if review[2] else None,
                'user_name': review[3]
            })
        
        book_detail = {
            'id': book[0],
            'title': book[1],
            'author': book[2],
            'price': float(book[3]) if book[3] else 0,
            'old_price': float(book[4]) if book[4] else 0,
            'description': book[5],
            'stock': book[6],
            'rating': float(book[7]) if book[7] else 0.0,
            'image_url': book[8],
            'category': book[9],
            'seller_name': book[10],
            'isbn': book[11] if len(book) > 11 else None,
            'condition': book[12] if len(book) > 12 else 'new',
            'publisher': book[13] if len(book) > 13 else None,
            'publish_year': book[14] if len(book) > 14 else None,
            'reviews': reviews_list
        }
        
        return jsonify(book_detail), 200
        
    except Exception as e:
        print(f"Get book detail error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/books/<int:book_id>/review', methods=['POST'])
@token_required
def add_review(current_user_id, book_id):
    """Thêm đánh giá sách"""
    conn = None
    cursor = None
    try:
        data = request.get_json()
        rating = data.get('rating')
        comment = data.get('comment')
        
        if not rating:
            return jsonify({'message': 'Vui lòng đánh giá!'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO Reviews (book_id, user_id, rating, comment, created_at)
            VALUES (?, ?, ?, ?, GETDATE())
        """, (book_id, current_user_id, rating, comment))
        
        # Cập nhật rating trung bình của sách
        cursor.execute("""
            UPDATE Books
            SET rating = (SELECT AVG(CAST(rating AS FLOAT)) FROM Reviews WHERE book_id = ?)
            WHERE book_id = ?
        """, (book_id, book_id))
        
        conn.commit()
        
        return jsonify({'message': 'Đánh giá thành công!'}), 201
        
    except Exception as e:
        print(f"Add review error: {e}")
        if conn and not conn.autocommit:
            conn.rollback()
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==================== ORDER ROUTES (KHÔNG ĐỔI) ====================

@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user_id):
    """Tạo đơn hàng mới với thông tin chi tiết"""
    conn = None
    cursor = None
    try:
        data = request.get_json()
        items = data.get('items')
        total = data.get('total')
        shipping_address = data.get('shipping_address')
        phone = data.get('phone')
        payment_method = data.get('payment_method', 'COD')
        notes = data.get('notes', '')
        
        if not items or not total or not shipping_address or not phone:
            return jsonify({'message': 'Thông tin đơn hàng không hợp lệ!'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        # Tạo order
        cursor.execute("""
            INSERT INTO Orders (buyer_id, total_amount, status, shipping_address, phone, payment_method, notes, created_at)
            OUTPUT INSERTED.order_id
            VALUES (?, ?, 'pending', ?, ?, ?, ?, GETDATE())
        """, (current_user_id, total, shipping_address, phone, payment_method, notes))
        
        order_id = cursor.fetchone()[0]
        
        # Thêm order details
        for item in items:
            cursor.execute("""
                UPDATE Books
                SET stock = stock - ?
                WHERE book_id = ?
            """, (item['quantity'], item['book_id']))
            
            cursor.execute("""
                INSERT INTO OrderDetails (order_id, book_id, quantity, price)
                VALUES (?, ?, ?, ?)
            """, (order_id, item['book_id'], item['quantity'], item['price']))
            
        
        conn.commit()
        
        return jsonify({
            'message': 'Đặt hàng thành công!',
            'order_id': order_id
        }), 201
        
    except Exception as e:
        if conn and not conn.autocommit:
            conn.rollback()
        print(f"Create order error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/orders/user', methods=['GET'])
@token_required
def get_user_orders(current_user_id):
    """Lấy danh sách đơn hàng của user"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT order_id, total_amount, status, shipping_address, phone, payment_method, created_at
            FROM Orders
            WHERE buyer_id = ?
            ORDER BY created_at DESC
        """, (current_user_id,))
        
        orders = cursor.fetchall()
        
        orders_list = []
        for order in orders:
            orders_list.append({
                'order_id': order[0],
                'total_amount': float(order[1]) if order[1] else 0,
                'status': order[2],
                'shipping_address': order[3],
                'phone': order[4],
                'payment_method': order[5],
                'created_at': order[6].strftime('%Y-%m-%d %H:%M:%S') if order[6] else None
            })
        
        return jsonify({'orders': orders_list}), 200
        
    except Exception as e:
        print(f"Get user orders error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==================== CATEGORY ROUTES (KHÔI PHỤC VÀ HOÀN THIỆN TẠO THỂ LOẠI) ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Lấy danh sách danh mục"""
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        cursor.execute("SELECT category_id, category_name FROM Categories")
        categories = cursor.fetchall()
        
        categories_list = []
        for cat in categories:
            categories_list.append({
                'id': cat[0],
                'name': cat[1]
            })
        
        return jsonify({'categories': categories_list}), 200
        
    except Exception as e:
        print(f"Get categories error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/categories', methods=['POST'])
@admin_required
def create_category(current_user_id):
    """CHỨC NĂNG TẠO THỂ LOẠI MỚI: Chỉ Admin có thể thêm vào CSDL với Mô tả"""
    conn = None
    cursor = None
    try:
        data = request.get_json()
        category_name = data.get('category_name')
        description = data.get('description', '')

        # Tiền điều kiện: Kiểm tra Category_Name (ràng buộc bắt buộc và giới hạn ký tự)
        if not category_name or len(category_name.strip()) == 0 or len(category_name) > 100:
            return jsonify({'message': 'Tên thể loại không hợp lệ (không được rỗng, tối đa 100 ký tự).'}), 400
        
        # Tiền điều kiện: Kiểm tra Description
        if len(description) > 1000:
            return jsonify({'message': 'Mô tả quá dài (tối đa 1000 ký tự).'}), 400

        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500

        cursor = conn.cursor()

        # Kiểm tra trùng lặp (Category_Name)
        cursor.execute("SELECT category_id FROM Categories WHERE category_name = ?", (category_name.strip(),))
        if cursor.fetchone():
            return jsonify({'message': 'Thể loại đã tồn tại. Vui lòng chọn tên khác!'}), 400

        # INSERT vào bảng Categories và lấy ID mới tạo (OUTPUT INSERTED)
        # Giả định bảng Categories có cột description
        cursor.execute("""
            INSERT INTO Categories (category_name, description, created_at)
            OUTPUT INSERTED.category_id
            VALUES (?, ?, GETDATE())
        """, (category_name.strip(), description))

        new_id = cursor.fetchone()[0]
        
        conn.commit()

        # Hậu điều kiện: Trả về ID mới tạo và thông báo thành công
        return jsonify({
            'message': f'Thêm thể loại "{category_name}" thành công!',
            'category_id': new_id
        }), 201

    except Exception as e:
        print(f"Create category error: {e}")
        if conn and not conn.autocommit:
            conn.rollback() # Hoàn tác giao dịch nếu có lỗi
        return jsonify({'message': 'Có lỗi xảy ra khi tạo thể loại (Lỗi hệ thống).'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==================== ADMIN ENDPOINTS (KHÔNG ĐỔI) ====================
# ... (Các route Admin khác giữ nguyên)

@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats(current_user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500

        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM Users")
        users_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Books")
        books_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM Orders")
        orders_count = cursor.fetchone()[0]
        cursor.execute("SELECT ISNULL(SUM(total_amount),0) FROM Orders")
        revenue = cursor.fetchone()[0]

        return jsonify({
            'users': users_count,
            'books': books_count,
            'orders': orders_count,
            'revenue': float(revenue) if revenue is not None else 0
        }), 200

    except Exception as e:
        print(f"Admin stats error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_list_users(current_user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("SELECT user_id, fullname, email, phone, role, status, created_at FROM Users ORDER BY created_at DESC")
        rows = cursor.fetchall()
        users = []
        for r in rows:
            users.append({
                'id': r[0], 'fullname': r[1], 'email': r[2], 'phone': r[3], 'role': r[4], 'status': r[5], 'created_at': r[6].strftime('%Y-%m-%d %H:%M:%S') if r[6] else None
            })
        return jsonify({'users': users}), 200
    except Exception as e:
        print(f"Admin list users error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/admin/users/lock/<int:user_id>', methods=['POST'])
@admin_required
def admin_lock_user(current_user_id, user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Users SET status = 'locked' WHERE user_id = ?", (user_id,))
        conn.commit()
        return jsonify({'message': 'User locked'}), 200
    except Exception as e:
        print(f"Lock user error: {e}")
        if conn and not conn.autocommit:
            conn.rollback()
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/admin/users/unlock/<int:user_id>', methods=['POST'])
@admin_required
def admin_unlock_user(current_user_id, user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Users SET status = 'active' WHERE user_id = ?", (user_id,))
        conn.commit()
        return jsonify({'message': 'User unlocked'}), 200
    except Exception as e:
        print(f"Unlock user error: {e}")
        if conn and not conn.autocommit:
            conn.rollback()
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/admin/orders', methods=['GET'])
@admin_required
def admin_list_orders(current_user_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("SELECT order_id, buyer_id, total_amount, status, created_at FROM Orders ORDER BY created_at DESC")
        rows = cursor.fetchall()
        orders = []
        for r in rows:
            orders.append({'order_id': r[0], 'buyer_id': r[1], 'total_amount': r[2], 'status': r[3], 'created_at': r[4].strftime('%Y-%m-%d %H:%M:%S') if r[4] else None})
        return jsonify({'orders': orders}), 200
    except Exception as e:
        print(f"Admin list orders error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/admin/books/approve/<int:book_id>', methods=['POST'])
@admin_required
def admin_approve_book(current_user_id, book_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Books SET status = 'approved' WHERE book_id = ?", (book_id,))
        conn.commit()
        return jsonify({'message': 'Book approved'}), 200
    except Exception as e:
        print(f"Approve book error: {e}")
        if conn and not conn.autocommit:
            conn.rollback()
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route('/api/admin/books/hide/<int:book_id>', methods=['POST'])
@admin_required
def admin_hide_book(current_user_id, book_id):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Books SET status = 'hidden' WHERE book_id = ?", (book_id,))
        conn.commit()
        return jsonify({'message': 'Book hidden'}), 200
    except Exception as e:
        print(f"Hide book error: {e}")
        if conn and not conn.autocommit:
            conn.rollback()
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==================== MAIN ====================

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_DIRECTORY):
        os.makedirs(UPLOAD_DIRECTORY)
    app.run(debug=True, host='0.0.0.0', port=5000)