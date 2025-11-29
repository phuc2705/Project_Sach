from app import get_db_connection, hash_password

# Script để thêm 10 quyển sách kinh dị vào database

HORROR_BOOKS = [
    {
        'title': 'It - Gã Hề Ma Quái',
        'author': 'Stephen King',
        'price': 195000,
        'old_price': 250000,
        'description': 'Trong thị trấn nhỏ Derry, một sinh vật hóa thân thành chú hề Pennywise đã gieo rắc nỗi kinh hoàng cho trẻ em suốt nhiều thế hệ. Bảy đứa trẻ quyết tâm đối đầu với con quỷ này.',
        'stock': 45,
        'rating': 4.9,
        'image_url': 'https://salt.tikicdn.com/cache/w1200/ts/product/5e/18/24/2a6154ba08df6ce6161c13f4303fa19e.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-1501175466',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Văn học',
        'publish_year': 2021
    },
    {
        'title': 'The Shining - Căn Phòng Số 237',
        'author': 'Stephen King',
        'price': 165000,
        'old_price': 210000,
        'description': 'Khách sạn Overlook nằm giữa núi tuyết hoang vu. Jack Torrance và gia đình trở thành những người trông coi duy nhất trong mùa đông. Nhưng khách sạn chứa đựng những bí mật đáng sợ...',
        'stock': 38,
        'rating': 4.8,
        'image_url': 'https://m.media-amazon.com/images/I/81bGUk+bIWL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-0385121675',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Trẻ',
        'publish_year': 2020
    },
    {
        'title': 'Dracula - Bá Tước Ma Cà Rồng',
        'author': 'Bram Stoker',
        'price': 125000,
        'old_price': 160000,
        'description': 'Câu chuyện kinh điển về Bá tước Dracula - ma cà rồng quyền năng nhất Transylvania. Jonathan Harker phải chịu cảnh bị giam giữ trong lâu đài đầy bóng tối và bí ẩn.',
        'stock': 52,
        'rating': 4.7,
        'image_url': 'https://m.media-amazon.com/images/I/71gYI26GbkL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-0141439846',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Hội Nhà văn',
        'publish_year': 2019
    },
    {
        'title': 'Pet Sematary - Nghĩa Địa Thú Cưng',
        'author': 'Stephen King',
        'price': 175000,
        'old_price': 220000,
        'description': 'Khi con mèo của gia đình chết, Louis Creed chôn nó ở nghĩa trang thú cưng bí ẩn. Nhưng điều gì xảy ra khi người chết trở về không còn là chính họ nữa?',
        'stock': 30,
        'rating': 4.6,
        'image_url': 'https://m.media-amazon.com/images/I/81djn7FWk6L._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-1501156731',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Kim Đồng',
        'publish_year': 2022
    },
    {
        'title': 'The Exorcist - Lễ Trừ Tà',
        'author': 'William Peter Blatty',
        'price': 155000,
        'old_price': 195000,
        'description': 'Regan - cô bé 12 tuổi bắt đầu có những hành vi kỳ lạ và đáng sợ. Các bác sĩ bó tay, chỉ còn cách cuối cùng: triệu tập linh mục để trừ tà.',
        'stock': 28,
        'rating': 4.8,
        'image_url': 'https://m.media-amazon.com/images/I/81p+iy7J3JL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-0062094353',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Văn học',
        'publish_year': 2021
    },
    {
        'title': 'Frankenstein - Quái Nhân',
        'author': 'Mary Shelley',
        'price': 115000,
        'old_price': 145000,
        'description': 'Victor Frankenstein tạo ra sinh vật từ xác chết. Nhưng tạo vật của ông lại trở thành cơn ác mộng đeo đuổi, tàn phá cuộc đời và những người thân yêu của ông.',
        'stock': 65,
        'rating': 4.5,
        'image_url': 'https://m.media-amazon.com/images/I/81z7E0uWdvL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-0141439471',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Trẻ',
        'publish_year': 2018
    },
    {
        'title': 'Carrie - Cô Gái Xinh Đẹp',
        'author': 'Stephen King',
        'price': 145000,
        'old_price': 180000,
        'description': 'Carrie White - cô gái nhút nhát bị bắt nạt ở trường. Nhưng cô có sức mạnh tâm linh đặc biệt. Và đêm dạ hội sẽ trở thành thảm họa đẫm máu...',
        'stock': 42,
        'rating': 4.7,
        'image_url': 'https://m.media-amazon.com/images/I/81rU04fBbmL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-0385086523',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Văn học',
        'publish_year': 2020
    },
    {
        'title': 'The Haunting of Hill House',
        'author': 'Shirley Jackson',
        'price': 135000,
        'old_price': 170000,
        'description': 'Ngôi nhà Hill House được mệnh danh là ngôi nhà ma ám kinh dị nhất nước Mỹ. Bốn người đến điều tra những hiện tượng siêu nhiên, nhưng ai cũng mang theo nỗi ám ảnh riêng.',
        'stock': 35,
        'rating': 4.6,
        'image_url': 'https://m.media-amazon.com/images/I/71wqX+QOIUL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-0143039983',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Hội Nhà văn',
        'publish_year': 2019
    },
    {
        'title': 'The Ring - Chiếc Nhẫn Ma',
        'author': 'Koji Suzuki',
        'price': 125000,
        'old_price': 155000,
        'description': 'Một cuốn băng video bí ẩn. Ai xem nó sẽ chết sau 7 ngày. Nhà báo Asakawa phải giải mã lời nguyền trước khi thời gian hết, nếu không anh và con gái sẽ là nạn nhân tiếp theo.',
        'stock': 48,
        'rating': 4.7,
        'image_url': 'https://m.media-amazon.com/images/I/71xXRfJ8MWL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-4041431023',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Kim Đồng',
        'publish_year': 2022
    },
    {
        'title': 'Hell House - Ngôi Nhà Địa Ngục',
        'author': 'Richard Matheson',
        'price': 165000,
        'old_price': 200000,
        'description': 'Belasco House - nơi từng chứng kiến những tội ác tày trời. Một nhóm điều tra viên được thuê để khám phá bí mật của ngôi nhà. Nhưng ngôi nhà không muốn để họ rời đi sống.',
        'stock': 25,
        'rating': 4.8,
        'image_url': 'https://m.media-amazon.com/images/I/81CbWvDMBuL._AC_UF1000,1000_QL80_.jpg',
        'category_name': 'Kinh Dị',
        'isbn': '978-0765357694',
        'condition': 'new',
        'publisher': 'Nhà xuất bản Trẻ',
        'publish_year': 2023
    }
]

def main():
    conn = get_db_connection()
    if not conn:
        print('Không thể kết nối database.')
        return
    
    cursor = conn.cursor()
    
    # Tạo category "Kinh dị" nếu chưa có
    cursor.execute("SELECT category_id FROM Categories WHERE category_name = ?", ('Kinh Dị',))
    category = cursor.fetchone()
    
    if not category:
        cursor.execute("INSERT INTO Categories (category_name) VALUES (?)", ('Kinh Dị',))
        conn.commit()
        cursor.execute("SELECT category_id FROM Categories WHERE category_name = ?", ('Kinh Dị',))
        category = cursor.fetchone()
    
    category_id = category[0]
    
    # Tìm seller_id (có thể dùng admin hoặc seller mặc định)
    cursor.execute("SELECT user_id FROM Users WHERE role = 'seller' OR role = 'admin' ORDER BY user_id")
    seller = cursor.fetchone()
    seller_id = seller[0] if seller else 1
    
    # Thêm sách kinh dị
    for book in HORROR_BOOKS:
        # Kiểm tra ISBN đã tồn tại chưa
        cursor.execute("SELECT book_id FROM Books WHERE isbn = ?", (book['isbn'],))
        if cursor.fetchone():
            print(f"Sách '{book['title']}' đã tồn tại (ISBN: {book['isbn']})")
            continue
        
        try:
            cursor.execute("""
                INSERT INTO Books 
                (title, author, price, old_price, description, stock, rating, image_url, 
                 category_id, seller_id, isbn, condition, publisher, publish_year, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', GETDATE())
            """, (
                book['title'],
                book['author'],
                book['price'],
                book['old_price'],
                book['description'],
                book['stock'],
                book['rating'],
                book['image_url'],
                category_id,
                seller_id,
                book['isbn'],
                book['condition'],
                book['publisher'],
                book['publish_year']
            ))
            conn.commit()
            print(f"✅ Đã thêm: {book['title']}")
        except Exception as e:
            print(f"❌ Lỗi khi thêm {book['title']}: {e}")
    
    cursor.close()
    conn.close()
    print('\n🎉 Hoàn tất thêm sách kinh dị!')

if __name__ == '__main__':
    main()