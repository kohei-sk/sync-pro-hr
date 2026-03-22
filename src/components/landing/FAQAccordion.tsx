"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "無料プランでも複数面接官のスケジューリングは使えますか？",
    a: "無料プランは1名ユーザー向けのため、複数面接官の自動照合はチームプラン以上でご利用いただけます。",
  },
  {
    q: "Googleカレンダー以外にも対応していますか？",
    a: "現在はGoogleカレンダーに対応しています。OutlookおよびAppleカレンダーは近日対応予定です。",
  },
  {
    q: "候補者がアカウントを作る必要はありますか？",
    a: "不要です。候補者はURLにアクセスして日時を選ぶだけです。アカウント登録なしでご利用いただけます。",
  },
  {
    q: "セキュリティ面は安全ですか？",
    a: "データは暗号化されたインフラで管理し、カレンダーデータへのアクセスはOAuth認証で制御しています。カレンダーの読み取り権限のみを使用し、データは安全に保護されます。",
  },
  {
    q: "既存のATSと連携できますか？",
    a: "Webhook機能による連携を準備中です。詳細はお問い合わせください。",
  },
];

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="divide-y divide-gray-200">
      {faqs.map((faq, i) => (
        <div key={i}>
          <button
            className="flex w-full items-center justify-between py-5 text-left"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <span className="text-base font-medium text-[#1A2744]">
              {faq.q}
            </span>
            <ChevronDown
              className={`ml-4 h-5 w-5 shrink-0 text-[#435460] transition-transform duration-200 ${
                openIndex === i ? "rotate-180" : ""
              }`}
            />
          </button>
          {openIndex === i && (
            <div className="pb-5 text-sm leading-relaxed text-[#435460]">
              {faq.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
