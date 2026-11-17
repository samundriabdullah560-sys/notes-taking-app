import { mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

// ACTION: Sends email to user's real inbox via Resend or Brevo REST API
export const sendOtpAction = action({
  args: {
    email: v.string(),
    code: v.string(),
    password: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    const brevoApiKey = process.env.BREVO_API_KEY;

    const emailSubject = "Your Account Password - Note App";
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
        <h2 style="color: #6C5CE7; margin-top: 0; font-size: 24px;">Note-Taking App</h2>
        <h3 style="color: #1e293b; font-size: 18px; margin-bottom: 8px;">Account Password Recovery</h3>
        
        <p style="color: #64748b; font-size: 15px; line-height: 1.5;">
          Here are your account credentials:
        </p>

        ${
          args.password
            ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #6C5CE7; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
          <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Account Email</p>
          <p style="margin: 2px 0 10px 0; font-size: 15px; font-weight: 600; color: #1e293b;">${args.email}</p>
          <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Your Current Password</p>
          <p style="margin: 2px 0 0 0; font-size: 22px; font-weight: 800; color: #6C5CE7; letter-spacing: 1px;">${args.password}</p>
        </div>`
            : ""
        }

        <p style="color: #64748b; font-size: 15px; line-height: 1.5;">
          If you want to reset and choose a new password, use this 6-digit verification code in the app:
        </p>
        <div style="background: #f8fafc; border: 2px dashed #6C5CE7; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #6C5CE7;">${args.code}</span>
        </div>
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 4px;">
          This code is valid for 10 minutes. If you did not request this, please ignore this email.
        </p>
      </div>
    `;

    // 1. If RESEND_API_KEY is configured
    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Note App <onboarding@resend.dev>",
            to: [args.email],
            subject: emailSubject,
            html: emailHtml,
          }),
        });

        if (res.ok) {
          console.log(`[Email] OTP sent via Resend to ${args.email}`);
          return { success: true, provider: "resend" };
        } else {
          const errBody = await res.text();
          console.error(`[Email] Resend API error: ${errBody}`);
        }
      } catch (err) {
        console.error("[Email] Failed to send via Resend:", err);
      }
    }

    // 2. If BREVO_API_KEY is configured
    if (brevoApiKey) {
      try {
        const res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sender: { name: "Note App", email: "support@noteapp.com" },
            to: [{ email: args.email }],
            subject: emailSubject,
            htmlContent: emailHtml,
          }),
        });

        if (res.ok) {
          console.log(`[Email] OTP sent via Brevo to ${args.email}`);
          return { success: true, provider: "brevo" };
        }
      } catch (err) {
        console.error("[Email] Failed to send via Brevo:", err);
      }
    }

    // 3. Fallback / Dev notification
    console.log(
      `[Email Simulation] Real email provider not configured. OTP for ${args.email} is: ${args.code}. Set RESEND_API_KEY with 'npx convex env set RESEND_API_KEY re_...' to enable live email delivery.`
    );
    return { success: true, provider: "dev_simulation" };
  },
});

// MUTATION: Generate and schedule sending OTP
export const requestOtp = mutation({
  args: {
    email: v.string(),
    allowAnyUser: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const emailNorm = args.email.trim().toLowerCase();

    // Verify user exists unless allowAnyUser is true
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .first();

    if (!user && !args.allowAnyUser) {
      return {
        success: false,
        error: "No account found with this email address.",
      };
    }

    // Delete existing OTPs for this email
    const existingOtps = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .collect();

    for (const item of existingOtps) {
      await ctx.db.delete(item._id);
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await ctx.db.insert("otpCodes", {
      email: emailNorm,
      code,
      expiresAt,
    });

    // Schedule email action to send to user's real email inbox
    await ctx.scheduler.runAfter(0, api.otp.sendOtpAction, {
      email: emailNorm,
      code,
      password: user?.password,
    });

    // Code is sent to email and NEVER returned to the client!
    return { success: true };
  },
});

// MUTATION: Verify OTP
export const verifyOtp = mutation({
  args: {
    email: v.string(),
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const emailNorm = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim().replace(/\s+/g, "");

    const record = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .first();

    if (!record) {
      return {
        success: false,
        error: "No OTP request found. Please request a new code.",
      };
    }

    if (Date.now() > record.expiresAt) {
      await ctx.db.delete(record._id);
      return {
        success: false,
        error: "Verification code has expired. Please request a new code.",
      };
    }

    if (record.code !== cleanCode) {
      return {
        success: false,
        error: "Incorrect verification code. Please check your email.",
      };
    }

    return { success: true };
  },
});

// MUTATION: Reset Password with OTP
export const resetPasswordWithOtp = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const emailNorm = args.email.trim().toLowerCase();
    const cleanCode = args.code.trim().replace(/\s+/g, "");

    // Verify OTP
    const record = await ctx.db
      .query("otpCodes")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .first();

    if (!record || record.code !== cleanCode || Date.now() > record.expiresAt) {
      return {
        success: false,
        error: "Session expired or invalid code. Please start over.",
      };
    }

    // Find and update user password
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", emailNorm))
      .first();

    if (!user) {
      return {
        success: false,
        error: "User not found.",
      };
    }

    await ctx.db.patch(user._id, {
      password: args.newPassword.trim(),
    });

    // Delete the used OTP
    await ctx.db.delete(record._id);

    return { success: true };
  },
});
