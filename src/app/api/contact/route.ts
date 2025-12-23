import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== 문의 이메일 전송 요청 시작 ===');

    const body: ContactRequest = await request.json();
    const { name, email, subject, message } = body;

    // 입력 검증
    if (!name || !email || !subject || !message) {
      console.error('필수 필드가 누락되었습니다.');
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('문의 정보:', { name, email, subject, messageLength: message.length });

    // 환경 변수 확인
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const contactEmail = process.env.CONTACT_EMAIL || smtpUser;

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      console.error('SMTP 설정이 완료되지 않았습니다.');
      return NextResponse.json(
        { error: '이메일 서버 설정이 완료되지 않았습니다.' },
        { status: 500 }
      );
    }

    // Nodemailer 전송자 설정
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: false, // 587 포트는 false
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // 이메일 내용 구성
    const mailOptions = {
      from: `"${name}" <${smtpUser}>`,
      to: contactEmail,
      replyTo: email,
      subject: `[문의] ${subject}`,
      text: `
문의자: ${name}
이메일: ${email}

제목: ${subject}

문의 내용:
${message}
      `.trim(),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">
            새로운 문의가 접수되었습니다
          </h2>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>문의자:</strong> ${name}</p>
            <p><strong>이메일:</strong> <a href="mailto:${email}">${email}</a></p>
            <p><strong>제목:</strong> ${subject}</p>
          </div>
          <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">문의 내용:</h3>
            <p style="white-space: pre-wrap; line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
          </div>
        </div>
      `,
    };

    console.log('이메일 전송 시작...');
    const info = await transporter.sendMail(mailOptions);
    console.log('이메일 전송 성공:', info.messageId);

    return NextResponse.json({
      success: true,
      message: '문의가 성공적으로 전송되었습니다.',
    });
  } catch (error) {
    console.error('이메일 전송 오류:', error);
    return NextResponse.json(
      { error: '이메일 전송 중 오류가 발생했습니다. 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}

