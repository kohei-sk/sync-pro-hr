import Link from "next/link";
import {
  Calendar,
  Users,
  Clock,
  Shield,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">
              SyncPro HR
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/events"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ログイン
            </Link>
            <Link href="/events" className="btn btn-primary">
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          面接日程調整を
          <br />
          <span className="text-primary-600">スマートに自動化</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          複数の面接官の空き時間を自動合成し、役割ベースのアサインで最適なスケジュールを瞬時に提案。
          採用チームの生産性を飛躍的に向上させます。
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/events" className="btn btn-primary text-base">
            ダッシュボードへ
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/j/demo" className="btn btn-secondary text-base">
            デモを見る
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Users,
              title: "チーム全体の空き時間を合成",
              description:
                "面接官全員のカレンダーをAND条件で分析し、全員が参加可能な枠を自動抽出します。",
            },
            {
              icon: Shield,
              title: "役割ベースの自動アサイン",
              description:
                "責任者・面接官・同席者など役割ごとに必要人数を設定。プールモードで柔軟にアサインします。",
            },
            {
              icon: Clock,
              title: "バッファ & 除外ルール",
              description:
                "面接前後の準備時間や、定例会議のブロックなど柔軟なルール設定が可能です。",
            },
            {
              icon: Calendar,
              title: "カスタム予約フォーム",
              description:
                "イベントごとに候補者への質問項目をカスタマイズ。必要な情報を事前に収集できます。",
            },
          ].map((feature, i) => (
            <div key={i} className="card">
              <feature.icon className="h-10 w-10 text-primary-600" />
              <h3 className="mt-4 text-lg font-bold text-gray-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold text-gray-900">
            3ステップで日程調整完了
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "イベントを作成",
                description:
                  "面接タイプ、時間、チームメンバー、除外ルールを設定します。",
              },
              {
                step: "02",
                title: "リンクを共有",
                description:
                  "生成された予約リンクを候補者にメールやメッセージで送信します。",
              },
              {
                step: "03",
                title: "自動で日程確定",
                description:
                  "候補者が空き枠から選択するだけ。確認メールが自動送信されます。",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-600">
                  {item.step}
                </div>
                <h3 className="mt-6 text-lg font-bold text-gray-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-gray-900">
          今すぐ始めましょう
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-gray-600">
          面倒な日程調整メールのやり取りから解放されます。
        </p>
        <div className="mt-8">
          <Link href="/events" className="btn btn-primary text-base">
            無料で始める
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-gray-500">
          &copy; 2026 SyncPro HR. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
