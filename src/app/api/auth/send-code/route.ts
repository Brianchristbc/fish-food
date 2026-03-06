import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isTinyfishEmail, generateCode } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || !isTinyfishEmail(email)) {
    return NextResponse.json({ error: "Must use a @tinyfish.io email" }, { status: 400 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

  await prisma.authCode.create({
    data: { email: email.toLowerCase(), code, expiresAt },
  });

  // Send email
  try {
    await resend.emails.send({
      from: "Fish Food <onboarding@resend.dev>",
      to: email.toLowerCase(),
      subject: "Your Fish Food login code",
      html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code expires in 10 minutes.</p>`,
    });
  } catch {
    // In dev, log the code to console
    console.log(`[DEV] Auth code for ${email}: ${code}`);
  }

  return NextResponse.json({ success: true });
}
