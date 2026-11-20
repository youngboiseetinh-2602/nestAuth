import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString({ message: 'Tên người dùng phải là chuỗi' })
  @Matches(/\S/, { message: 'Tên người dùng không được để trống' })
  username!: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @Matches(/\S/, { message: 'Mật khẩu không được để trống' })
  password!: string;
}
