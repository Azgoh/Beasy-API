import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export class emailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST,
      port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587),
      secure: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
      },
    });
  }

  async sendEmail(to, subject, text) {
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER;
    try {
      await this.transporter.sendMail({
        from,
        to,
        subject,
        text,
      });
    } catch (err) {
      console.error("Failed to send email:", err);
      throw err;
    }
  }
}

export default new emailService();

