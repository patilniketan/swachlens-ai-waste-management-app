import nodemailer from "nodemailer";

const emailUser = process.env.EMAIL_USER;
const emailPassword = process.env.EMAIL_PASSWORD;
const isProduction = process.env.NODE_ENV === "production";

if (!emailUser || !emailPassword) {
  if (isProduction) {
    throw new Error(
      "EMAIL_USER and EMAIL_PASSWORD must be configured in the environment.",
    );
  }

  console.warn(
    "EMAIL_USER/EMAIL_PASSWORD not configured. OTP codes will be printed to the server console.",
  );
}

const transporter =
  emailUser && emailPassword
    ? nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      })
    : null;

const logOtpToConsole = (email: string, otp: string) => {
  console.log(`[DEV] OTP for ${email}: ${otp}`);
};

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  if (!transporter) {
    logOtpToConsole(email, otp);
    return;
  }

  try {
    await sendWithTransporter(transporter, email, otp);
  } catch (error) {
    if (isProduction) {
      throw error;
    }

    console.warn("Failed to send OTP email, falling back to console:", error);
    logOtpToConsole(email, otp);
  }
}

async function sendWithTransporter(
  transporter: nodemailer.Transporter,
  email: string,
  otp: string,
): Promise<void> {
  await transporter.sendMail({
    from: `"SwachhLens AI" <${emailUser}>`,
    to: email,
    subject: "Your SwachhLens AI verification code",
    text: `Your SwachhLens AI verification code is ${otp}. This code will expire in 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>SwachhLens AI Email Verification</h2>
        <p>Your verification code is:</p>
        <h1 style="letter-spacing: 6px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you did not request this code, you can safely ignore this email.</p>
      </div>
    `,
  });
}
