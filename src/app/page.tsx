import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Users,
  Clock,
  Bell,
  FileText,
  CalendarDays,
  Check,
  X,
  Minus,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Form,
  Star,
} from "lucide-react";
import FAQAccordion from "@/components/landing/FAQAccordion";

// ─────────────────────────────────────────────
// Nav
// ─────────────────────────────────────────────
function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-10 py-4">
        <Image
          src="/common/logo.svg"
          alt="Pitasuke"
          width={140}
          height={40}
        />
        <nav className="hidden items-center gap-8 md:flex">
          {["機能", "料金", "よくある質問"].map((label) => (
            <a
              key={label}
              href={`#${label}`}
              className="text-sm font-bold text-brandGray hover:text-brandNavy"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-5">
          <Link
            href="/login"
            className="text-sm font-bold text-brandGray hover:text-brandNavy"
          >
            ログイン
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-brandPrimary-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-brandPrimary-600 transition-colors"
          >
            無料で始める
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────
function Hero() {
  const points = [
    {
      icon: Users,
      text: "複数面接官の予定に対応",
    },
    {
      icon: Calendar,
      text: "Google カレンダー連携",
    },
    {
      icon: Bell,
      text: "チーム・候補者にリマインド",
    },
  ];
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="flex items-center justify-center mx-auto max-w-6xl px-10">
        <div className="relative flex flex-1 flex-col py-16 md:py-24">
          <h1 className="max-w-3xl text-5xl font-black !leading-tight tracking-tight text-brandNavy sm:text-7xl">
            複数面接官<span className="text-5xl">の</span>予定<span className="text-5xl">を</span>
            <br />
            <span className="text-brandPrimary-500">ピッタリ合わせる</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-brandNavy !leading-relaxed">
            Pitasuke（ピタスケ）は、採用チーム特化型の面接フォローアップツールです。
            <br className="hidden sm:block" />
            スケジューリングから候補者対応まで、すべてがスムーズになります。
          </p>

          <div className="mt-10 flex flex-col items-center gap-8 sm:flex-row">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-lg bg-brandPrimary-500 px-8 py-4 text-base font-bold text-white shadow-sm hover:bg-brandPrimary-600 transition-colors"
            >
              無料で14日間試す
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#機能"
              className="flex items-center gap-1 text-base font-bold text-brandGray hover:text-brandNavy"
            >
              機能を見る →
            </a>
          </div>
        </div>
        <div>
          <Image
            src="/lp/kv.svg"
            alt="Pitasuke"
            width={400}
            height={160}
          />
        </div>
      </div>
      {/* social proof */}
      <div className="pb-24 flex flex-wrap items-center justify-center gap-[50px]">
        {points.map((p) => (
          <div key={p.text} className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brandSecondary-50">
              <p.icon className="h-5 w-5 text-brandSecondary-500" />
            </div>
            <span className="text-lg text-brandGray tracking-[0.5px]">{p.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Problem
// ─────────────────────────────────────────────
function ProblemSection() {
  const pains = [
    {
      image: "/lp/img_problem_1.svg",
      title: "日程調整に何往復もかかる",
      body: "面接官が複数いると、全員の空き時間を探してメールで送って…だけで1日が終わる。",
    },
    {
      image: "/lp/img_problem_2.svg",
      title: "予定が変わるたびにやり直し",
      body: "面接官の都合が変わったり、追加になるたびに候補日を作り直す手間が発生。",
    },
    {
      image: "/lp/img_problem_3.svg",
      title: "ダブルブッキングのリスク",
      body: "口頭やスプレッドシートで管理しているので、ミスが起きやすい。",
    },
  ];

  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="!leading-tight mt-3 text-center text-3xl font-black text-brandNavy sm:text-4xl">
          こんなお悩み、ありませんか？
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {pains.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col items-center"
            >
              <div>
                <Image
                  src={p.image}
                  alt={p.title}
                  width={160}
                  height={160}
                />
              </div>
              <h3 className="mt-5 text-lg font-bold text-brandNavy">
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-brandGray">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// How it works
// ─────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      image: "/lp/img_step_1.svg",
      title: "予約可能な日時を自動抽出",
      body: "複数面接官のスケジュールから、予約可能な日時を自動抽出。役割・人数などの様々な設定も可能。",
    },
    {
      num: "02",
      image: "/lp/img_step_2.svg",
      title: "URLを候補者に送るだけ",
      body: "専用の予約ページURLを候補者に送信。候補者は空き枠から選択するだけ。",
    },
    {
      num: "03",
      image: "/lp/img_step_3.svg",
      title: "自動で確定・通知",
      body: "候補者が予約すると、面接官のカレンダーに自動で予定が入る。リマインドメールで通知。",
    },
  ];

  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-sm font-black uppercase tracking-widest text-brandPrimary-500">
          How to
        </p>
        <h2 className="!leading-tight mt-3 text-center text-3xl font-black text-brandNavy sm:text-4xl">
          <span className="tracking-tight">Pitasuke</span>なら、解決できます
        </h2>
        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.num} className="relative text-center flex flex-col items-center">
              <div className="relative mb-6 pb-2 text-xl font-black leading-tight tracking-tight text-brandPrimary-500 after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-brandPrimary-500 after:content-['']">
                {"Point " + s.num}
              </div>
              <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <Image
                  className="w-full"
                  src={s.image}
                  alt={s.title}
                  width={160}
                  height={160}
                />
              </div>
              <h3 className="mt-5 text-lg font-bold text-brandNavy">
                {s.title}
              </h3>
              <p className="text-left mt-3 text-sm leading-relaxed text-brandGray">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Differentiator (comparison table)
// ─────────────────────────────────────────────
function DifferentiatorSection() {
  const rows = [
    {
      label: "複数面接官の空き自動照合",
      pitasuke: true,
      general: false,
      spreadsheet: false,
    },
    {
      label: "ロール別人数設定",
      desc: "人事2名+現場1名など",
      pitasuke: true,
      general: false,
      spreadsheet: false,
    },
    {
      label: "曜日ごとの担当者設定",
      pitasuke: true,
      general: false,
      spreadsheet: false,
    },
    {
      label: "カレンダー自動連携",
      desc: "Google, Outlook, Apple",
      pitasuke: true,
      general: true,
      spreadsheet: false,
    },
    {
      label: "チームへメンバーへの通知",
      desc: "メール、Slack、ChatWork",
      pitasuke: true,
      general: null,
      spreadsheet: false,
    },
    {
      label: "候補者へのリマインド通知",
      desc: "メール、SMS",
      pitasuke: true,
      general: true,
      spreadsheet: false,
    },
  ];

  const Icon = ({ val }: { val: boolean | null }) => {
    if (val === true)
      return <Check className="mx-auto h-5 w-5 text-brandSecondary-500" />;
    if (val === false) return <X className="mx-auto h-5 w-5 text-red-400" />;
    return <Minus className="mx-auto h-5 w-5 text-gray-400" />;
  };

  return (
    <section className="bg-brandNavy-light py-24">
      <div className="mx-auto max-w-5xl px-6">
        <p className="text-center text-sm font-black uppercase tracking-widest text-brandPrimary-400">
          Compare
        </p>
        <h2 className="!leading-tight mt-3 text-center text-3xl font-black text-white sm:text-4xl">
          他のツールと、何が違うの？
        </h2>

        <div className="mt-12 overflow-hidden rounded-2xl bg-white shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-150">
                <th className="py-4 pl-6 text-left text-sm font-semibold text-brandGray">

                </th>
                <th className="py-4 text-center text-lg font-bold text-brandPrimary-600 tracking-tight bg-brandPrimary-50/50">
                  Pitasuke
                </th>
                <th className="py-4 text-center text-sm font-semibold text-brandGray">
                  一般的な
                  <br />
                  日程調整ツール
                </th>
                <th className="py-4 pr-6 text-center text-sm font-semibold text-brandGray">
                  スプレッド
                  <br />
                  シート管理
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr key={row.label} className="hover:bg-gray-50">
                  <td className="py-4 pl-6 text-sm text-brandNavy flex flex-col">
                    {row.label}
                    {row.desc ? <span className="text-xs text-brandGray mt-1">{row.desc}</span> : ""}
                  </td>
                  <td className="py-4 text-center bg-brandPrimary-50/50">
                    <Icon val={row.pitasuke} />
                  </td>
                  <td className="py-4 text-center">
                    <Icon val={row.general} />
                  </td>
                  <td className="py-4 pr-6 text-center">
                    <Icon val={row.spreadsheet} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 text-center text-md font-semibold text-white">
          複数面接官の自動調整は、Pitasukeにしかできません。
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Features
// ─────────────────────────────────────────────
function FeaturesSection() {
  const features = [
    {
      icon: Users,
      title: "複数面接官の自動スケジューリング",
      body: "全員が空いているスロットだけを候補として提示。AND条件で厳密に照合し、ダブルブッキングを防止。",
    },
    {
      icon: FileText,
      title: "役割ごとの担当者設定",
      body: "「人事2名＋技術面接官1名」のような条件を登録。毎回最適なメンバーを自動選択。",
    },
    {
      icon: CalendarDays,
      title: "曜日ごとの担当者設定",
      body: "月曜日は田中さん、火曜日は鈴木さん、のような柔軟なシフト管理に対応。",
    },
    {
      icon: Calendar,
      title: "Googleカレンダー同期",
      body: "リアルタイムで全面接官の空き状況を確認。予約確定時、カレンダーに自動で予定をセット。各種カレンダーに対応。",
    },
    {
      icon: Bell,
      title: "チーム通知",
      body: "予約・変更・キャンセルが入ったらメール、Slack、ChatWorkで即時通知。面接官に自動でリマインドも送信。",
    },
    {
      icon: Clock,
      title: "候補者リマインド",
      body: "メール、SMS候補者にリマインド。面接の1時間前・1日前など細かい設定可能。",
    },
    {
      icon: Form,
      title: "カスタムフォーム",
      body: "候補者から必要な情報を事前収集。項目を自由に編集できるから様々な採用フローにも柔軟に対応。",
    },
    {
      icon: RefreshCw,
      title: "予約の変更・キャンセル",
      body: "候補者による、予約の変更・キャンセルが可能。予期せぬノーショーを防止。",
    },
  ];

  return (
    <section id="機能" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-sm font-black uppercase tracking-widest text-brandPrimary-500">
          Feature
        </p>
        <h2 className="!leading-tight mt-3 text-center text-3xl font-black text-brandNavy sm:text-4xl">
          採用チームに必要な機能が
          <br />
          すべて揃っています
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brandPrimary-50">
                <f.icon className="h-5.5 w-5.5 text-brandPrimary-500" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-brandNavy">
                {f.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-brandGray">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Testimonials
// ─────────────────────────────────────────────
function TestimonialsSection() {
  const cards = [
    {
      rate: 4,
      quote:
        "面接官3人の日程調整が、URLを送るだけになりました。週に5時間は削減できています。もっと多くの人事担当者に使ってもらいたいです！",
      name: "TN 様",
      role: "人事部長 / IT企業（従業員300名）",
    },
    {
      rate: 3,
      quote:
        "最終面接で役員4名の予定を合わせるのが一番大変でしたが、Pitasukeで一発解決しました。今後も使い続けたいです！",
      name: "YD 様",
      role: "採用リーダー / スタートアップ",
    },
    {
      rate: 5,
      quote:
        "候補者からの「日程が選びやすい」という声が増えました。候補者とのコミュニケーションがスムーズになった体感があります！",
      name: "ST 様",
      role: "HRマネージャー / 製造業",
    },
  ];

  return (
    <section className="bg-[#EEF6FC] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-sm font-black uppercase tracking-widest text-brandPrimary-500">
          Voice
        </p>
        <h2 className="!leading-tight mt-3 text-center text-3xl font-black text-brandNavy sm:text-4xl">
          採用チームに選ばれています
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.name}
              className="rounded-2xl bg-white p-6 shadow-sm flex flex-col"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: c.rate }).map((_, i) => (
                  <span key={i}><Star className="w-5 h-5 text-brandSecondary-500 fill-brandSecondary-500" /></span>
                ))}
                {Array.from({ length: 5 - c.rate }).map((_, i) => (
                  <span key={i}><Star className="w-5 h-5 text-brandSecondary-500 fill-white" /></span>
                ))}
              </div>
              <p className="mt-4 text-base leading-relaxed text-brandNavy flex-1">
                {c.quote}
              </p>
              <div>
                <div className="mt-6 text-base font-semibold text-brandNavy">
                  {c.name}
                </div>
                <div className="text-sm text-brandGray">{c.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* stats */}
        <div className="mt-12 grid grid-cols-3 divide-x divide-gray-150 rounded-2xl border-2 border-brandPrimary-100 bg-white py-8">
          {[
            { label: "導入企業数", value: "500社", sub: " 以上" },
            { label: "平均削減時間", value: "月40時間", sub: " / チーム" },
            { label: "顧客満足度", value: "4.8", sub: " / 5.0" },
          ].map((s) => (
            <div key={s.label} className="px-8 text-center">
              <div className="text-base text-brandGray">{s.label}</div>
              <div className="mt-1 text-2xl font-bold text-brandPrimary-500 sm:text-3xl">
                {s.value}
                <span className="font-semibold text-xl">{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Pricing
// ─────────────────────────────────────────────
function PricingSection() {
  const plans = [
    {
      name: "スターター",
      price: "無料",
      period: "",
      description: "個人での利用に最適",
      features: [
        "ユーザー：1名",
        "イベントタイプ：3つまで",
        "Googleカレンダー連携",
        "公開予約ページ",
      ],
      unavailable: ["チームメンバー追加", "Slack通知", "ロールアサイン"],
      cta: "無料で始める",
      highlight: false,
    },
    {
      name: "チーム",
      price: "¥5,000",
      period: "/ 月〜",
      description: "採用チームにおすすめ",
      features: [
        "ユーザー：10名まで",
        "イベントタイプ：無制限",
        "Googleカレンダー連携",
        "Slack通知",
        "ロールベースアサイン",
        "曜日別担当者設定",
        "リマインドメール",
      ],
      unavailable: [],
      cta: "14日間無料で試す",
      highlight: true,
    },
    {
      name: "エンタープライズ",
      price: "要相談",
      period: "",
      description: "大規模な採用チーム向け",
      features: [
        "ユーザー：無制限",
        "チームプランの全機能",
        "専任サポート",
        "SLA保証",
        "ATS連携（準備中）",
      ],
      unavailable: [],
      cta: "お問い合わせ",
      highlight: false,
    },
  ];

  return (
    <section id="料金" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-sm font-black uppercase tracking-widest text-brandPrimary-500">
          Price
        </p>
        <h2 className="!leading-tight mt-3 text-center text-3xl font-black text-brandNavy sm:text-4xl">
          シンプルな料金プラン
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 ${plan.highlight
                ? "border-2 border-brandPrimary-500 bg-white shadow-xl"
                : "border border-gray-200 bg-white shadow-sm"
                }`}
            >
              {plan.highlight && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-brandPrimary-500 px-4 py-1 text-xs font-bold text-white">
                    おすすめ
                  </span>
                </div>
              )}
              <div className="mb-1 text-lg font-bold text-brandNavy">
                {plan.name}
              </div>
              <div className="mb-2 flex items-end gap-1">
                <span className="text-4xl font-bold text-brandNavy">
                  {plan.price}
                </span>
                <span className="mb-1 text-sm text-brandGray">{plan.period}</span>
              </div>
              <div className="mb-6 text-sm text-brandGray">
                {plan.description}
              </div>
              <Link
                href="/login"
                className={`mb-8 block w-full rounded-lg py-3 text-center text-sm font-semibold transition-colors ${plan.highlight
                  ? "bg-brandPrimary-500 text-white hover:bg-brandPrimary-600"
                  : "border border-gray-300 text-brandNavy hover:bg-gray-50"
                  }`}
              >
                {plan.cta}
              </Link>
              <ul className="space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-brandNavy">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brandSecondary-500" />
                    {f}
                  </li>
                ))}
                {plan.unavailable.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-400">
                    <X className="mt-0.5 h-4 w-4 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-brandGray">
          すべてのプランでクレジットカード不要・いつでも解約可能
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────
function FAQSection() {
  return (
    <section id="よくある質問" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-3xl px-6">
        <p className="text-center text-sm font-black uppercase tracking-widest text-brandPrimary-500">
          FAQ
        </p>
        <h2 className="!leading-tight mt-3 text-center text-3xl font-black text-brandNavy sm:text-4xl">
          よくある質問
        </h2>
        <div className="mt-12 rounded-2xl border border-gray-200 bg-white px-6 shadow-sm">
          <FAQAccordion />
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Final CTA
// ─────────────────────────────────────────────
function FinalCTA() {
  return (
    <section
      className="py-24"
      style={{ background: "linear-gradient(135deg, #1e8cd6 0%, #31b5a2 100%)" }}
    >
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-4xl font-black !leading-tight tracking-tight text-white sm:text-6xl">
          採用面接の日程調整
          <br />
          自動でセッティング
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-lg text-white">
          今すぐ無料で始めて、チームの時間を取り戻してください。
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-bold text-brandPrimary-600 shadow hover:shadow-md transition-shadow"
          >
            無料で14日間試す
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-white px-6 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors"
          >
            デモを予約する
          </Link>
        </div>
        <p className="mt-6 text-sm text-white/70">
          クレジットカード不要 · 設定5分 · いつでも解約可能
        </p>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────
// Footer
// ─────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10 pb-5">
      <div className="mx-auto max-w-7xl px-10">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Image
              src="/common/logo.svg"
              alt="Pitasuke"
              width={120}
              height={40}
            />
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            {[
              "機能",
              "料金",
              "プライバシーポリシー",
              "利用規約",
              "お問い合わせ",
            ].map((label) => (
              <a
                key={label}
                href="#"
                className="text-sm font-bold text-brandGray hover:text-brandNavy"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
        <div className="mt-10 text-center text-xs text-brandGray/50">
          &copy; 2026 Pitasuke. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <ProblemSection />
      <HowItWorks />
      <DifferentiatorSection />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingSection />
      <FAQSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
