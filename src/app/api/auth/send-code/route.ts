import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTinyfishEmail, generateCode } from "@/lib/auth";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !isTinyfishEmail(email)) {
    return NextResponse.json({ error: "Must use a @tinyfish.io email" }, { status: 400 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.authCode.create({
    data: { email: email.toLowerCase(), code, expiresAt },
  });

  try {
    await transporter.sendMail({
      from: `"Fish Food" <${process.env.GMAIL_USER}>`,
      to: email.toLowerCase(),
      subject: "Your Fish Food login code",
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    });
  } catch (err) {
    console.error("Email send failed:", err);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
