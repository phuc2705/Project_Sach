from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc
import hashlib
import jwt
import datetime
from functools import wraps

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here-change-in-production'
CORS(app)

# ==================== DATABASE CONNECTION ====================

def get_db_connection():
    """Kết nối đến SQL Server"""
    try:
        conn = pyodbc.connect(
            'DRIVER={SQL Server};'
            'SERVER=PHUCDEPTRAI\\PHUCNGUYENTRONG;'
            'DATABASE=BookStoreDBO;'
            'Trusted_Connection=yes;'  # DÙNG WINDOWS LOGIN
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

# ==================== AUTHENTICATION DECORATOR ====================

def token_required(f):
    """Decorator để kiểm tra JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(' ')[1]
        
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
    """Decorator để kiểm tra JWT token và quyền admin"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            parts = request.headers['Authorization'].split(' ')
            if len(parts) == 2:
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
            if not row:
                return jsonify({'message': 'Người dùng không tồn tại!'}), 404
            role, status = row[0], row[1]
            if status != 'active':
                return jsonify({'message': 'Tài khoản không hoạt động!'}), 403
            if not role or role.lower() != 'admin':
                return jsonify({'message': 'Yêu cầu quyền admin!'}), 403
        finally:
            cursor.close()
            conn.close()

        return f(current_user_id, *args, **kwargs)

    return decorated

# ==================== UTILITY FUNCTIONS ====================

def hash_password(password):
    """Hash password bằng SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token(user_id):
    """Tạo JWT token"""
    token = jwt.encode({
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")
    return token

# ==================== AUTHENTICATION ROUTES ====================

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Đăng ký tài khoản mới"""
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
        
        # Kiểm tra email đã tồn tại
        cursor.execute("SELECT user_id FROM Users WHERE email = ?", (email,))
        if cursor.fetchone():
            return jsonify({'message': 'Email đã được đăng ký!'}), 400
        
        # Thêm user mới
        hashed_password = hash_password(password)
        cursor.execute("""
            INSERT INTO Users (fullname, email, phone, password, role, status, created_at)
            VALUES (?, ?, ?, ?, 'buyer', 'active', GETDATE())
        """, (fullname, email, phone, hashed_password))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'message': 'Đăng ký thành công!'}), 201
        
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Đăng nhập"""
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
        cursor.close()
        conn.close()
        
        if not user:
            return jsonify({'message': 'Email hoặc mật khẩu không đúng!'}), 401
        
        if user[5] != 'active':  # status
            return jsonify({'message': 'Tài khoản đã bị khóa!'}), 403
        
        # Tạo token
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

# ==================== BOOK ROUTES ====================

@app.route('/api/books', methods=['GET'])
def get_books():
    """Lấy danh sách sách"""
    try:
        category = request.args.get('category')
        search = request.args.get('search')
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        query = """
            SELECT b.book_id, b.title, b.author, b.price, b.old_price, 
                   b.description, b.stock, b.rating, b.image_url, c.category_name
            FROM Books b
            LEFT JOIN Categories c ON b.category_id = c.category_id
            WHERE b.status = 'approved'
        """
        
        params = []
        
        if category:
            query += " AND c.category_name = ?"
            params.append(category)
        
        if search:
            query += " AND (b.title LIKE ? OR b.author LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        query += " ORDER BY b.created_at DESC"
        
        cursor.execute(query, params)
        books = cursor.fetchall()
        
        books_list = []
        for book in books:
            books_list.append({
                'id': book[0],
                'title': book[1],
                'author': book[2],
                'price': book[3],
                'old_price': book[4],
                'description': book[5],
                'stock': book[6],
                'rating': float(book[7]) if book[7] else 0.0,
                'image_url': book[8],
                'category': book[9]
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({'books': books_list}), 200
        
    except Exception as e:
        print(f"Get books error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book_detail(book_id):
    """Lấy chi tiết sách"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT b.book_id, b.title, b.author, b.price, b.old_price,
                   b.description, b.stock, b.rating, b.image_url, 
                   c.category_name, u.fullname as seller_name
            FROM Books b
            LEFT JOIN Categories c ON b.category_id = c.category_id
            LEFT JOIN Users u ON b.seller_id = u.user_id
            WHERE b.book_id = ? AND b.status = 'approved'
        """, (book_id,))
        
        book = cursor.fetchone()
        
        if not book:
            return jsonify({'message': 'Không tìm thấy sách!'}), 404
        
        book_detail = {
            'id': book[0],
            'title': book[1],
            'author': book[2],
            'price': book[3],
            'old_price': book[4],
            'description': book[5],
            'stock': book[6],
            'rating': float(book[7]) if book[7] else 0.0,
            'image_url': book[8],
            'category': book[9],
            'seller_name': book[10]
        }
        
        cursor.close()
        conn.close()
        
        return jsonify(book_detail), 200
        
    except Exception as e:
        print(f"Get book detail error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500

# ==================== ORDER ROUTES ====================

@app.route('/api/orders', methods=['POST'])
@token_required
def create_order(current_user_id):
    """Tạo đơn hàng mới"""
    try:
        data = request.get_json()
        items = data.get('items')
        total = data.get('total')
        
        if not items or not total:
            return jsonify({'message': 'Thông tin đơn hàng không hợp lệ!'}), 400
        
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        # Tạo order
        cursor.execute("""
            INSERT INTO Orders (buyer_id, total_amount, status, created_at)
            OUTPUT INSERTED.order_id
            VALUES (?, ?, 'pending', GETDATE())
        """, (current_user_id, total))
        
        order_id = cursor.fetchone()[0]
        
        # Thêm order details
        for item in items:
            cursor.execute("""
                INSERT INTO OrderDetails (order_id, book_id, quantity, price)
                VALUES (?, ?, ?, ?)
            """, (order_id, item['book_id'], item['quantity'], item['price']))
            
            # Cập nhật stock
            cursor.execute("""
                UPDATE Books
                SET stock = stock - ?
                WHERE book_id = ?
            """, (item['quantity'], item['book_id']))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({
            'message': 'Đặt hàng thành công!',
            'order_id': order_id
        }), 201
        
    except Exception as e:
        print(f"Create order error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500

@app.route('/api/orders/user', methods=['GET'])
@token_required
def get_user_orders(current_user_id):
    """Lấy danh sách đơn hàng của user"""
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT order_id, total_amount, status, created_at
            FROM Orders
            WHERE buyer_id = ?
            ORDER BY created_at DESC
        """, (current_user_id,))
        
        orders = cursor.fetchall()
        
        orders_list = []
        for order in orders:
            orders_list.append({
                'order_id': order[0],
                'total_amount': order[1],
                'status': order[2],
                'created_at': order[3].strftime('%Y-%m-%d %H:%M:%S')
            })
        
        cursor.close()
        conn.close()
        
        return jsonify({'orders': orders_list}), 200
        
    except Exception as e:
        print(f"Get user orders error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500

# ==================== CATEGORY ROUTES ====================

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Lấy danh sách danh mục"""
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
        
        cursor.close()
        conn.close()
        
        return jsonify({'categories': categories_list}), 200
        
    except Exception as e:
        print(f"Get categories error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500

# ==================== ADMIN ENDPOINTS ====================


@app.route('/api/admin/stats', methods=['GET'])
@admin_required
def admin_stats(current_user_id):
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

        cursor.close()
        conn.close()

        return jsonify({
            'users': users_count,
            'books': books_count,
            'orders': orders_count,
            'revenue': float(revenue) if revenue is not None else 0
        }), 200

    except Exception as e:
        print(f"Admin stats error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500


@app.route('/api/admin/users', methods=['GET'])
@admin_required
def admin_list_users(current_user_id):
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
        cursor.close()
        conn.close()
        return jsonify({'users': users}), 200
    except Exception as e:
        print(f"Admin list users error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500


@app.route('/api/admin/users/lock/<int:user_id>', methods=['POST'])
@admin_required
def admin_lock_user(current_user_id, user_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Users SET status = 'locked' WHERE user_id = ?", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'User locked'}), 200
    except Exception as e:
        print(f"Lock user error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500


@app.route('/api/admin/users/unlock/<int:user_id>', methods=['POST'])
@admin_required
def admin_unlock_user(current_user_id, user_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Users SET status = 'active' WHERE user_id = ?", (user_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'User unlocked'}), 200
    except Exception as e:
        print(f"Unlock user error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500


@app.route('/api/admin/orders', methods=['GET'])
@admin_required
def admin_list_orders(current_user_id):
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
        cursor.close()
        conn.close()
        return jsonify({'orders': orders}), 200
    except Exception as e:
        print(f"Admin list orders error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500


@app.route('/api/admin/books/approve/<int:book_id>', methods=['POST'])
@admin_required
def admin_approve_book(current_user_id, book_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Books SET status = 'approved' WHERE book_id = ?", (book_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Book approved'}), 200
    except Exception as e:
        print(f"Approve book error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500


@app.route('/api/admin/books/hide/<int:book_id>', methods=['POST'])
@admin_required
def admin_hide_book(current_user_id, book_id):
    try:
        conn = get_db_connection()
        if not conn:
            return jsonify({'message': 'Không thể kết nối database!'}), 500
        cursor = conn.cursor()
        cursor.execute("UPDATE Books SET status = 'hidden' WHERE book_id = ?", (book_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Book hidden'}), 200
    except Exception as e:
        print(f"Hide book error: {e}")
        return jsonify({'message': 'Có lỗi xảy ra!'}), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)