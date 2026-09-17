import nodemailer from "nodemailer";

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;

if (!emailUser || !emailPassword) {
  throw new Error(
    "EMAIL_USER and EMAIL_PASSWORD must be configured in the environment.",
  );
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPassword,
  },
});

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  await transporter.sendMail({
    from: `"CivicClean" <${emailUser}>`,
    to: email,
    subject: "Your CivicClean verification code",
    text: `Your CivicClean verification code is ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>CivicClean Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 6px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
}
