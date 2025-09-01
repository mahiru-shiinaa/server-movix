import nodemailer from "nodemailer";

export const sendMail = async (
  email: string,
  subject: string,
  otpCode: string
): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: subject,
      html: `
    <div style="max-width: 600px; margin: auto; border: 1px solid #eee; padding: 30px; font-family: Arial, sans-serif; background-color: #0d0d0d; color: #fff;">
  <!-- Header -->
  <div style="text-align: center; padding-bottom: 20px;">
    <h1 style="color: #e50914; margin-bottom: 5px; font-size: 28px;">MOVIX</h1>
    <p style="margin: 0; color: #bbb; font-size: 14px;">Đặt vé thông minh, sống trọn cảm xúc</p>
  </div>

  <!-- Content box -->
  <div style="background-color: #1a1a1a; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.6);">
    <h2 style="color: #fff; margin-top: 0;">Mã xác thực OTP của bạn</h2>
    <p style="font-size: 16px; color: #ddd;">Xin chào,</p>
    <p style="font-size: 16px; color: #ddd;">
      Bạn đang thực hiện hành động cần xác minh trên <strong>Movix</strong>. 
      Vui lòng sử dụng mã dưới đây để hoàn tất:
    </p>

    <!-- OTP code -->
    <div style="text-align: center; margin: 25px 0;">
      <span style="display: inline-block; padding: 14px 28px; font-size: 26px; font-weight: bold; background-color: #e50914; color: #fff; border-radius: 8px; letter-spacing: 4px;">
        ${otpCode}
      </span>
    </div>

    <p style="color: #aaa; font-size: 14px;">
      Mã OTP này sẽ hết hạn sau <strong>5 phút</strong>. 
      Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
    </p>

    <p style="margin-top: 30px; color: #999; font-size: 14px;">
      Trân trọng,<br/>
      Đội ngũ <strong style="color: #e50914;">Movix</strong>
    </p>
  </div>

  <!-- Footer -->
  <div style="text-align: center; font-size: 12px; color: #666; margin-top: 30px;">
    © ${new Date().getFullYear()} Movix. All rights reserved.
  </div>
</div>
`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
