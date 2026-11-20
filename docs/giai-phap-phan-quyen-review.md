# Giải pháp xác thực và phân quyền đánh giá

## 1. Bài toán và phạm vi

Ứng dụng cho phép người dùng xem và tạo đánh giá cho dịch vụ. Việc sửa hoặc xóa đánh giá cần giới hạn theo người thực hiện:

- Khách chưa đăng nhập được xem đánh giá.
- Người dùng đã đăng nhập được tạo đánh giá và sửa, xóa đánh giá của mình.
- Quản trị viên (`ADMIN`) được sửa, xóa mọi đánh giá.
- Client không được tự chọn chủ sở hữu đánh giá thông qua dữ liệu gửi lên.

Tài liệu mô tả cách triển khai hiện có trong mã nguồn, tập trung vào `ReviewPolicy` và các thành phần xác thực, phân quyền liên quan.

## 2. Giải pháp được sử dụng

Ứng dụng kết hợp **xác thực bằng JWT** với **phân quyền bằng policy theo vai trò và quyền sở hữu tài nguyên**.

Xác thực trả lời câu hỏi người gửi yêu cầu là ai. Phân quyền sử dụng danh tính đó cùng đánh giá cụ thể để quyết định có cho phép thao tác hay không.

Quy tắc sửa, xóa được tập trung trong `ReviewPolicy`:

```ts
@Policy()
export class ReviewPolicy {
  update(user: AuthenticatedUser, review: Review): boolean {
    return user.role === UserRole.ADMIN || review.authorId === user.id;
  }

  delete(user: AuthenticatedUser, review: Review): boolean {
    return this.update(user, review);
  }
}
```

Đây là sự kết hợp giữa kiểm tra vai trò (`user.role`) và thuộc tính của người dùng, tài nguyên (`user.id`, `review.authorId`). `delete()` dùng lại `update()` vì hiện tại hai thao tác có cùng điều kiện cấp quyền.

### Các thành phần chính

| Thành phần | Trách nhiệm |
| --- | --- |
| `src/app.module.ts` | Cấu hình xác thực toàn cục, khóa JWT và thời hạn access token |
| `src/auth/auth.service.ts` | Kiểm tra tài khoản, mật khẩu khi đăng nhập |
| `src/auth/provider/auth-token.provider.ts` | Phát hành access token với subject là ID người dùng |
| `src/auth/provider/jwt-auth.provider.ts` | Chuyển subject trong JWT thành người dùng hiện có |
| `src/authorization/authorization.module.ts` | Khởi tạo thư viện phân quyền và đăng ký `ReviewPolicy` |
| `src/authorization/policies/review.policy.ts` | Định nghĩa điều kiện cho phép sửa, xóa đánh giá |
| `src/reviews/reviews.controller.ts` | Khai báo API và lấy danh tính bằng `@CurrentUser()` |
| `src/reviews/reviews.service.ts` | Tải đánh giá, yêu cầu kiểm tra quyền rồi mới thay đổi dữ liệu |

## 3. Cơ chế hoạt động

### 3.1. Đăng nhập và xác thực yêu cầu

1. Client gửi thông tin đăng nhập đến `POST /auth/login`. Endpoint này có `@Public()`.
2. `AuthService` tìm tài khoản và kiểm tra mật khẩu bằng `PasswordHasher.verify()`.
3. Nếu thông tin không hợp lệ, service ném `UnauthorizedException`.
4. Nếu hợp lệ, `AuthTokenProvider` gọi `TokenService.issue()` với `String(user.id)` và trả về `accessToken`, `expiresIn`.
5. Client gửi access token trong header `Authorization: Bearer <accessToken>` khi gọi API cần đăng nhập.
6. Provider JWT xác thực token; `JwtAuthProvider.validate()` kiểm tra `claims.sub` là số nguyên an toàn, dương và tìm người dùng bằng `UsersService.findById()`.
7. Danh tính được cung cấp cho controller qua `@CurrentUser()`, gồm `id`, `username`, `role`.

`AuthenticationModule` được cấu hình `globalGuard: true`, nên các endpoint mặc định yêu cầu xác thực; `@Public()` đánh dấu các endpoint cho phép truy cập công khai. Access token có thời hạn cấu hình `15m`, khóa lấy từ `JWT_SECRET`, và refresh token đang tắt.

Vai trò được lấy từ dữ liệu người dùng phía server khi xác thực yêu cầu. `AuthTokenProvider` hiện không tự đưa vai trò vào payload khi phát hành token.

### 3.2. Tạo đánh giá và xác lập chủ sở hữu

Controller lấy ID từ người dùng đã xác thực:

```ts
return this.reviewsService.createReview(serviceId, body, user.id);
```

Service kiểm tra dịch vụ tồn tại, sau đó lưu ID này vào `review.authorId`. `authorName` là tên hiển thị do client gửi, không phải căn cứ xác định quyền sở hữu.

`CreateReviewDto` không khai báo `authorId`. `ValidationPipe` toàn cục bật `whitelist` và `forbidNonWhitelisted`, nên trường ngoài DTO như `authorId` trong body sẽ bị từ chối. Service cũng chỉ lấy các trường nội dung được phép thay vì sao chép toàn bộ body vào đánh giá.

### 3.3. Sửa hoặc xóa đánh giá

Luồng xử lý trong service:

```text
Yêu cầu đã xác thực
        |
        v
Tải đánh giá theo ID ---- không tồn tại ----> 404
        |
        v
Gọi AuthorizationService.authorize()
        |
        v
ADMIN hoặc authorId === user.id?
        |
        +---- không ----> Từ chối thao tác (403)
        |
        +---- có ------> Thay đổi dữ liệu và trả kết quả
```

Ví dụ trong `updateReview()`:

```ts
const review = this.getReview(id);
await this.authorization.authorize(ReviewPolicy, 'update', user, review);
```

Lệnh `await` bảo đảm việc kiểm tra quyền hoàn tất trước khi thay đổi dữ liệu. Policy chỉ trả về quyết định boolean; `AuthorizationService.authorize()` chịu trách nhiệm từ chối khi điều kiện không đạt.

- `PATCH` gọi action `update`, chỉ cập nhật trường có giá trị khác `undefined`.
- `PUT` cũng gọi action `update`, yêu cầu đủ `authorName`, `rating`, `comment`. DTO kiểm tra hai trường đầu; service kiểm tra bổ sung trường `comment`.
- `DELETE` gọi action `delete`, sau đó mới xóa đánh giá khỏi mảng.
- Các thao tác sửa không thay đổi `authorId`, `serviceId` hay `id` của đánh giá.

Module phân quyền đặt `globalGuard: false`. Vì vậy, đối với các API đánh giá này, quyền được thực thi qua lời gọi `authorize()` trong service. Chỉ đăng ký `ReviewPolicy` không tự bảo vệ mọi thao tác; phương thức thay đổi dữ liệu mới cũng cần thực hiện kiểm tra tương ứng.

### 3.4. Ma trận quyền của API đánh giá

| API | Chưa đăng nhập | USER là tác giả | USER khác tác giả | ADMIN |
| --- | --- | --- | --- | --- |
| `GET /api/v1/services/:serviceId/reviews` | Cho phép | Cho phép | Cho phép | Cho phép |
| `GET /api/v1/reviews/:id` | Cho phép | Cho phép | Cho phép | Cho phép |
| `POST /api/v1/services/:serviceId/reviews` | Yêu cầu đăng nhập | Cho phép | Cho phép | Cho phép |
| `PATCH /api/v1/reviews/:id` | Yêu cầu đăng nhập | Cho phép | Từ chối | Cho phép |
| `PUT /api/v1/reviews/:id` | Yêu cầu đăng nhập | Cho phép | Từ chối | Cho phép |
| `DELETE /api/v1/reviews/:id` | Yêu cầu đăng nhập | Cho phép | Từ chối | Cho phép |

Các quyền trên giả định dữ liệu đầu vào hợp lệ và tài nguyên tồn tại. Quyền tạo đánh giá không phụ thuộc tác giả của các đánh giá đã có.

## 4. Lý do lựa chọn giải pháp

### Kiểm tra đúng từng đánh giá

Chỉ kiểm tra vai trò `USER` không đủ để phân biệt tác giả với người dùng khác. Kết hợp vai trò và `authorId` đáp ứng trực tiếp yêu cầu: quản trị viên quản lý mọi đánh giá, người dùng quản lý đánh giá của mình.

### Tập trung quy tắc để dễ bảo trì

Điều kiện cấp quyền nằm trong một policy, tránh lặp cùng biểu thức ở các nhánh `PATCH`, `PUT`, `DELETE`. Khi quy tắc thay đổi, có một nơi rõ ràng để cập nhật. Nếu quyền sửa và xóa khác nhau trong tương lai, có thể tách logic của hai action.

### Kiểm tra tại nơi có đủ dữ liệu

Service đã tải được đánh giá thật từ phía server nên có thể kiểm tra `authorId` chính xác. Đặt lời gọi phân quyền trước khi ghi dữ liệu giúp các luồng gọi service dùng cùng kiểm tra này, với điều kiện bên gọi cung cấp danh tính đáng tin cậy.

### Phù hợp cấu trúc ứng dụng hiện tại

Ứng dụng đã sử dụng `@nestjs/authentication` và `@nestjs/authorization`. Việc dùng provider, dependency injection và policy tận dụng các thành phần đang có, đồng thời giữ controller tập trung vào nhận yêu cầu và chuyển dữ liệu.

### Tách biệt danh tính và quyền thao tác

JWT cung cấp danh tính cho các yêu cầu sau đăng nhập; policy quyết định quyền trên từng tài nguyên. Token còn hiệu lực không đồng nghĩa người dùng được sửa mọi đánh giá.

## 5. Giới hạn hiện tại và hướng mở rộng

- Người dùng và đánh giá được lưu bằng mảng trong bộ nhớ. Khởi động lại sẽ mất dữ liệu; nhiều instance không tự chia sẻ dữ liệu. Khi bổ sung database, cần tiếp tục kiểm tra quyền trên tài nguyên tải từ database trước khi ghi.
- Đăng ký luôn gán vai trò `USER`. Mã nguồn hiện chưa có API cấp quyền `ADMIN`, nên khả năng quản trị trong policy chỉ phát huy khi dữ liệu phía server có người dùng mang vai trò này.
- `AuthenticatedUser` là kiểu TypeScript, không tự xác thực danh tính ở runtime. Luồng gọi service ngoài HTTP cần cung cấp danh tính đã được xác minh.
- Service tải đánh giá trước khi kiểm tra quyền, nên yêu cầu đã xác thực có thể nhận `404` cho ID không tồn tại và `403` cho đánh giá tồn tại nhưng không được phép sửa, xóa.
- Những bài kiểm thử hiện có trong `reviews.service.spec.ts` mới kiểm tra khởi tạo service và chưa cung cấp mock cho `AuthorizationService`. Chúng chưa chứng minh các quy tắc phân quyền hoạt động đúng.

## 6. Các tình huống cần kiểm chứng

Đây là danh sách kiểm chứng đề xuất, không phải kết quả chạy kiểm thử:

| Tình huống | Kết quả mong đợi |
| --- | --- |
| Khách xem danh sách đánh giá của dịch vụ tồn tại | Truy cập được |
| Không gửi token khi tạo, sửa hoặc xóa | Bị từ chối xác thực (`401`) |
| USER tạo đánh giá | `authorId` bằng ID của người dùng đang đăng nhập |
| Client gửi thêm `authorId` trong body tạo đánh giá | Bị từ chối dữ liệu đầu vào (`400`) |
| Tác giả sửa hoặc xóa đánh giá của mình | Được phép |
| USER sửa hoặc xóa đánh giá của người khác | Bị từ chối (`403`), dữ liệu không đổi |
| ADMIN sửa hoặc xóa đánh giá của người khác | Được phép |
| Người dùng đã xác thực thao tác với ID đánh giá không tồn tại | Trả về `404` |
| Tác giả hoặc ADMIN gửi PUT thiếu `comment` | Trả về `400`, dữ liệu không đổi |
| Token chứa subject không hợp lệ hoặc người dùng không còn tồn tại | Bị từ chối xác thực |

Khi triển khai kiểm thử, nên kiểm tra trực tiếp các nhánh của `ReviewPolicy`, xác nhận service không thay đổi dữ liệu khi bị từ chối quyền, và kiểm tra API với các danh tính khác nhau để bao phủ toàn bộ luồng xác thực đến phân quyền.
