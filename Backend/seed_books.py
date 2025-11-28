from app import get_db_connection, hash_password

# Script để chèn dữ liệu mẫu vào database. Chạy thủ công từ thư mục Backend.
# LƯU Ý: Kiểm tra schema bảng trước khi chạy. Script này giả định các bảng: Users, Categories, Books, Orders, OrderDetails.

SAMPLE_CATEGORIES = ['kynang','vanhoc','kinhte','thieunhi']
SAMPLE_BOOKS = [
    dict(title='Đắc Nhân Tâm', author='Dale Carnegie', price=86000, old_price=120000, description='Kinh điển về giao tiếp', stock=50, rating=4.8, image_url='assets/images/book1.jpg', category_name='kynang'),
    dict(title='Nhà Giả Kim', author='Paulo Coelho', price=79000, old_price=99000, description='Tiểu thuyết triết lý', stock=40, rating=4.9, image_url='assets/images/book2.svg', category_name='vanhoc'),
    dict(title='Sapiens: Lược Sử Loài Người', author='Yuval Noah Harari', price=189000, old_price=230000, description='Lược sử nhân loại', stock=30, rating=4.7, image_url='assets/images/book3.svg', category_name='kinhte'),
]

DEFAULT_USERS = [
    dict(fullname='Admin User', email='admin@local', phone='0000000000', password='adminpass', role='admin'),
    dict(fullname='Seller User', email='seller@local', phone='0000000001', password='sellerpass', role='seller'),
    dict(fullname='Buyer User', email='buyer@local', phone='0000000002', password='buyerpass', role='buyer'),
]


def ensure_category(cursor, name):
    cursor.execute("SELECT category_id FROM Categories WHERE category_name = ?", (name,))
    row = cursor.fetchone()
    if row:
        return row[0]
    cursor.execute("INSERT INTO Categories (category_name) VALUES (?)", (name,))
    cursor.commit()
    cursor.execute("SELECT category_id FROM Categories WHERE category_name = ?", (name,))
    return cursor.fetchone()[0]


def main():
    conn = get_db_connection()
    if not conn:
        print('Không thể kết nối database.')
        return
    cursor = conn.cursor()

    # Create default users
    for u in DEFAULT_USERS:
        cursor.execute("SELECT user_id FROM Users WHERE email = ?", (u['email'],))
        if cursor.fetchone():
            print('User exists:', u['email'])
            continue
        hashed = hash_password(u['password']) if u.get('password') else ''
        cursor.execute("INSERT INTO Users (fullname, email, phone, password, role, status, created_at) VALUES (?, ?, ?, ?, ?, 'active', GETDATE())",
                       (u['fullname'], u['email'], u['phone'], hashed, u['role']))
        conn.commit()
        print('Created user', u['email'])

    # Ensure categories
    cat_map = {}
    for c in SAMPLE_CATEGORIES:
        cursor.execute("SELECT category_id FROM Categories WHERE category_name = ?", (c,))
        r = cursor.fetchone()
        if r:
            cat_map[c] = r[0]
        else:
            cursor.execute("INSERT INTO Categories (category_name) VALUES (?)", (c,))
            conn.commit()
            cursor.execute("SELECT category_id FROM Categories WHERE category_name = ?", (c,))
            cat_map[c] = cursor.fetchone()[0]

    # Find seller id
    cursor.execute("SELECT user_id FROM Users WHERE email = ?", ('seller@local',))
    seller_row = cursor.fetchone()
    seller_id = seller_row[0] if seller_row else None

    # Insert sample books
    for b in SAMPLE_BOOKS:
        cursor.execute("SELECT book_id FROM Books WHERE title = ?", (b['title'],))
        if cursor.fetchone():
            print('Book exists:', b['title'])
            continue
        category_id = cat_map.get(b['category_name'])
        cursor.execute("INSERT INTO Books (title, author, price, old_price, description, stock, rating, image_url, category_id, seller_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', GETDATE())",
                       (b['title'], b['author'], b['price'], b['old_price'], b['description'], b['stock'], b['rating'], b['image_url'], category_id, seller_id))
        conn.commit()
        print('Inserted book', b['title'])

    cursor.close()
    conn.close()
    print('Seed completed.')


if __name__ == '__main__':
    main()
