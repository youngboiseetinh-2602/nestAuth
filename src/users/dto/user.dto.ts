import { IsString, Matches } from "class-validator";

export class CreateUserDto {
  @IsString({ message: "Tên người dùng phải là chuỗi" })
  @Matches(/\S/, { message: "Tên người dùng không được để trống" })
  username!: string;

  @IsString({ message: "Mật khẩu phải là chuỗi" })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt",
    },
  )
  password!: string;
}
