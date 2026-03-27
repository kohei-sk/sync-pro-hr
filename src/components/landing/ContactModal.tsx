"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

// ─── Form ────────────────────────────────────────────────────
function ContactForm({ onClose }: { onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    company: "",
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = "お名前を入力してください";
    if (!form.email.trim()) e.email = "メールアドレスを入力してください";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "正しいメールアドレスを入力してください";
    if (!form.message.trim()) e.message = "お問い合わせ内容を入力してください";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-brandSecondary-500" />
        <h3 className="text-lg font-bold text-brandNavy">
          お問い合わせを受け付けました
        </h3>
        <p className="text-sm leading-relaxed text-brandGray">
          内容を確認のうえ、担当者よりご連絡いたします。
          <br />
          しばらくお待ちください。
        </p>
        <button onClick={onClose} className="mt-2 btn btn-primary">
          閉じる
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* 会社名（任意） */}
      <div>
        <label className="label mb-1.5">
          会社名
          <span className="ml-1.5 text-[11px] font-normal text-gray-400">
            任意
          </span>
        </label>
        <input
          type="text"
          className="input"
          placeholder="株式会社Pitasuke"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
      </div>

      {/* お名前（必須） */}
      <div>
        <label className="label mb-1.5">
          お名前
          <span className="ml-1.5 text-[11px] font-normal text-red-400">
            必須
          </span>
        </label>
        <input
          type="text"
          className={`input ${errors.name ? "ring-red-400 focus:ring-red-400" : ""}`}
          placeholder="山田 太郎"
          value={form.name}
          onChange={(e) => {
            setForm({ ...form, name: e.target.value });
            setErrors({ ...errors, name: undefined });
          }}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      {/* メールアドレス（必須） */}
      <div>
        <label className="label mb-1.5">
          メールアドレス
          <span className="ml-1.5 text-[11px] font-normal text-red-400">
            必須
          </span>
        </label>
        <input
          type="email"
          className={`input ${errors.email ? "ring-red-400 focus:ring-red-400" : ""}`}
          placeholder="taro@example.com"
          value={form.email}
          onChange={(e) => {
            setForm({ ...form, email: e.target.value });
            setErrors({ ...errors, email: undefined });
          }}
        />
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email}</p>
        )}
      </div>

      {/* お問い合わせ内容（必須） */}
      <div>
        <label className="label mb-1.5">
          お問い合わせ内容
          <span className="ml-1.5 text-[11px] font-normal text-red-400">
            必須
          </span>
        </label>
        <textarea
          className={`input min-h-[120px] resize-y ${errors.message ? "ring-red-400 focus:ring-red-400" : ""}`}
          placeholder="ご質問・ご要望をご記入ください"
          value={form.message}
          onChange={(e) => {
            setForm({ ...form, message: e.target.value });
            setErrors({ ...errors, message: undefined });
          }}
        />
        {errors.message && (
          <p className="mt-1 text-xs text-red-500">{errors.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button type="button" onClick={onClose} className="btn btn-secondary">
          キャンセル
        </button>
        <button type="submit" className="btn btn-primary">
          送信する
        </button>
      </div>
    </form>
  );
}

// ─── ContactButton ────────────────────────────────────────────
interface ContactButtonProps {
  className?: string;
  children: React.ReactNode;
}

export function ContactButton({ className, children }: ContactButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="お問い合わせ"
        description="ご質問・ご要望はこちらからお気軽にどうぞ。"
        size="md"
      >
        <ContactForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
